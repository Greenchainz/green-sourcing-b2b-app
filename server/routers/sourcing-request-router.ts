/**
 * Sourcing Request Router
 *
 * Powers the Smart RFx Builder — the workflow layer between material discovery
 * and real supplier action.
 *
 * Procedures:
 *   recommend             — Pure classifier, no DB. Returns request type + fields.
 *   create                — Saves to rfqs; fires auto-match + notify (background).
 *   getById               — Full request + aggregated response summary.
 *   listMine              — Buyer's own requests.
 *   updateFields          — Mutate responseFieldSchema / scoringWeights.
 *   listInvitedSuppliers  — Suppliers auto-matched and notified for a request.
 *   reinviteSuppliers     — Re-run auto-match for an existing request.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { rfqs, rfqItems, rfqBids, rfqSupplierInvites, suppliers } from "../../drizzle/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { notifyMatchedSuppliers } from "../services/rfx-invite-notifier";
import {
  recommendRequestType,
  REQUEST_TYPES,
  DEFAULT_FIELDS,
  type SupplierResponseField,
} from "../lib/smart-rfx-classifier";
import type { RfxScoringWeights } from "../lib/rfx-response-scorer";

// ─── Zod schemas shared with client via tRPC type inference ──────────────────

const requestTypeSchema = z.enum(REQUEST_TYPES);

const supplierResponseFieldSchema = z.object({
  key:       z.string(),
  label:     z.string(),
  fieldType: z.enum(["text", "number", "currency", "date", "boolean", "file", "url", "select"]),
  required:  z.boolean(),
  category:  z.enum(["commercial", "sustainability", "logistics", "qualification", "documentation", "technical"]),
  helpText:  z.string().optional(),
});

const scoringWeightsSchema = z.object({
  price:         z.number().min(0).max(1),
  carbon:        z.number().min(0).max(1),
  leadTime:      z.number().min(0).max(1),
  documentation: z.number().min(0).max(1),
  certifications:z.number().min(0).max(1),
}).refine(
  (w) => Math.abs(Object.values(w).reduce((s, v) => s + v, 0) - 1) < 0.01,
  { message: "Scoring weights must sum to 1" }
);

// ─── Router ───────────────────────────────────────────────────────────────────

export const sourcingRequestRouter = router({

  /**
   * Pure classifier — no DB write.
   * Returns recommended request type + confidence + reason + suggested fields.
   * Responds in < 5ms (deterministic regex, no LLM on critical path).
   */
  recommend: protectedProcedure
    .input(z.object({ description: z.string().min(3).max(2000) }))
    .query(({ input }) => recommendRequestType(input.description)),

  /**
   * Create a new sourcing request.
   * Extends the existing rfqs table — all existing SWAP Engine matching
   * and composite scoring continues to work unchanged.
   */
  create: protectedProcedure
    .input(
      z.object({
        projectName:         z.string().min(1).max(255),
        projectLocation:     z.string().max(255).optional(),
        projectType:         z.string().max(100).optional(),
        notes:               z.string().max(5000).optional(),
        dueDate:             z.date().optional(),
        requestType:         requestTypeSchema.default("rfq_quote"),
        responseFieldSchema: z.array(supplierResponseFieldSchema).min(1),
        scoringWeights:      scoringWeightsSchema.optional(),
        shadowCarbonPrice:   z.number().nonnegative().max(10000).optional(),
        requiredCertifications: z.array(z.string()).optional(),
        items: z.array(
          z.object({
            materialId:   z.number().int().optional(),
            assemblyId:   z.number().int().optional(),
            quantity:     z.number().optional(),
            quantityUnit: z.string().max(50).optional(),
            notes:        z.string().max(1000).optional(),
          })
        ).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [rfq] = await db
        .insert(rfqs)
        .values({
          userId:              ctx.user.id,
          projectName:         input.projectName,
          projectLocation:     input.projectLocation,
          projectType:         input.projectType,
          notes:               input.notes,
          dueDate:             input.dueDate,
          requestType:         input.requestType,
          responseFieldSchema: input.responseFieldSchema,
          scoringWeights:      input.scoringWeights ?? null,
          shadowCarbonPrice:   input.shadowCarbonPrice?.toString() ?? null,
          requiredCertifications: input.requiredCertifications ?? [],
          status:              "submitted",
        })
        .returning({ id: rfqs.id });

      // Insert line items if provided
      if (input.items && input.items.length > 0) {
        await db.insert(rfqItems).values(
          input.items.map((item) => ({
            rfqId:        rfq.id,
            materialId:   item.materialId,
            assemblyId:   item.assemblyId,
            quantity:     item.quantity?.toString(),
            quantityUnit: item.quantityUnit,
            notes:        item.notes,
          }))
        );
      }

      // Fire-and-forget auto-match + notify suppliers.
      // Never blocks the buyer's response — errors are logged internally.
      void notifyMatchedSuppliers({
        rfqId:                  rfq.id,
        requestType:            input.requestType,
        projectName:            input.projectName,
        projectLocation:        input.projectLocation,
        description:            input.notes,
        requiredCertifications: input.requiredCertifications,
      }).catch((err) => console.error("[sourcing-request] Auto-notify failed:", err));

      return { rfqId: rfq.id };
    }),

  /** Get a single sourcing request by ID (buyer-scoped). */
  getById: protectedProcedure
    .input(z.object({ rfqId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [rfq] = await db
        .select()
        .from(rfqs)
        .where(and(eq(rfqs.id, input.rfqId), eq(rfqs.userId, ctx.user.id)))
        .limit(1);

      if (!rfq) throw new TRPCError({ code: "NOT_FOUND", message: "Request not found" });

      const items = await db.select().from(rfqItems).where(eq(rfqItems.rfqId, input.rfqId));

      // Response summary (count + best score)
      const responseStats = await db
        .select({
          count:    sql<number>`count(*)`,
          bestScore: sql<number>`max(${rfqBids.rfxTotalScore}::numeric)`,
          avgPrice:  sql<number>`avg(${rfqBids.bidPrice}::numeric)`,
        })
        .from(rfqBids)
        .where(eq(rfqBids.rfqId, input.rfqId));

      return {
        rfq,
        items,
        responseCount: Number(responseStats[0]?.count ?? 0),
        bestScore:     responseStats[0]?.bestScore ?? null,
        avgPrice:      responseStats[0]?.avgPrice ?? null,
      };
    }),

  /** List all sourcing requests created by the current buyer. */
  listMine: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(100).default(25) }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      const rows = await db
        .select({
          id:              rfqs.id,
          projectName:     rfqs.projectName,
          projectLocation: rfqs.projectLocation,
          requestType:     rfqs.requestType,
          status:          rfqs.status,
          dueDate:         rfqs.dueDate,
          createdAt:       rfqs.createdAt,
          responseCount: sql<number>`(
            select count(*) from rfq_bids b where b."rfqId" = rfqs.id
          )`,
        })
        .from(rfqs)
        .where(eq(rfqs.userId, ctx.user.id))
        .orderBy(desc(rfqs.createdAt))
        .limit(input.limit);

      return rows;
    }),

  /** Update field schema or scoring weights on an existing request. */
  updateFields: protectedProcedure
    .input(
      z.object({
        rfqId:               z.number().int().positive(),
        responseFieldSchema: z.array(supplierResponseFieldSchema).optional(),
        scoringWeights:      scoringWeightsSchema.optional(),
        shadowCarbonPrice:   z.number().nonnegative().max(10000).nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [existing] = await db
        .select({ id: rfqs.id, userId: rfqs.userId })
        .from(rfqs)
        .where(and(eq(rfqs.id, input.rfqId), eq(rfqs.userId, ctx.user.id)))
        .limit(1);

      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Request not found" });

      await db
        .update(rfqs)
        .set({
          ...(input.responseFieldSchema && { responseFieldSchema: input.responseFieldSchema }),
          ...(input.scoringWeights && { scoringWeights: input.scoringWeights }),
          ...(input.shadowCarbonPrice !== undefined && {
            shadowCarbonPrice: input.shadowCarbonPrice != null ? input.shadowCarbonPrice.toString() : null,
          }),
        })
        .where(eq(rfqs.id, input.rfqId));

      return { ok: true };
    }),

  /** Get default field set for a given request type (for the builder UI). */
  getDefaultFields: protectedProcedure
    .input(z.object({ requestType: requestTypeSchema }))
    .query(({ input }) => DEFAULT_FIELDS[input.requestType]),

  /**
   * Public-safe read for supplier response page.
   * Returns only the fields needed to render the supplier form —
   * no scoring data, no other bids, no buyer identity.
   * Any authenticated user (supplier or buyer) can call this.
   */
  getForResponse: protectedProcedure
    .input(z.object({ rfqId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [rfq] = await db
        .select({
          id:                  rfqs.id,
          projectName:         rfqs.projectName,
          projectLocation:     rfqs.projectLocation,
          requestType:         rfqs.requestType,
          notes:               rfqs.notes,
          dueDate:             rfqs.dueDate,
          status:              rfqs.status,
          responseFieldSchema: rfqs.responseFieldSchema,
        })
        .from(rfqs)
        .where(eq(rfqs.id, input.rfqId))
        .limit(1);

      if (!rfq) throw new TRPCError({ code: "NOT_FOUND", message: "Request not found" });
      if (rfq.status === "closed") {
        throw new TRPCError({ code: "FORBIDDEN", message: "This request is no longer accepting responses" });
      }

      return rfq;
    }),

  /**
   * List suppliers auto-matched and notified for a buyer's sourcing request.
   * Buyer-scoped: validates ownership before returning invite list.
   */
  listInvitedSuppliers: protectedProcedure
    .input(z.object({ rfqId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Ownership check
      const [rfq] = await db
        .select({ id: rfqs.id })
        .from(rfqs)
        .where(and(eq(rfqs.id, input.rfqId), eq(rfqs.userId, ctx.user.id)))
        .limit(1);

      if (!rfq) throw new TRPCError({ code: "NOT_FOUND", message: "Request not found" });

      const invites = await db
        .select({
          inviteId:    rfqSupplierInvites.id,
          supplierId:  rfqSupplierInvites.supplierId,
          matchScore:  rfqSupplierInvites.matchScore,
          emailSent:   rfqSupplierInvites.emailSent,
          inAppSent:   rfqSupplierInvites.inAppSent,
          respondedAt: rfqSupplierInvites.respondedAt,
          notifiedAt:  rfqSupplierInvites.notifiedAt,
          companyName: suppliers.companyName,
          tier:        suppliers.tier,
          state:       suppliers.state,
          email:       suppliers.email,
        })
        .from(rfqSupplierInvites)
        .innerJoin(suppliers, eq(rfqSupplierInvites.supplierId, suppliers.id))
        .where(eq(rfqSupplierInvites.rfqId, input.rfqId))
        .orderBy(desc(rfqSupplierInvites.matchScore));

      return invites;
    }),

  /**
   * Re-run auto-match for an existing request (e.g. after updating the RFQ).
   * Idempotent — suppliers already invited are skipped.
   * Buyer-scoped.
   */
  reinviteSuppliers: protectedProcedure
    .input(z.object({ rfqId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [rfq] = await db
        .select()
        .from(rfqs)
        .where(and(eq(rfqs.id, input.rfqId), eq(rfqs.userId, ctx.user.id)))
        .limit(1);

      if (!rfq) throw new TRPCError({ code: "NOT_FOUND", message: "Request not found" });

      if (rfq.status === "closed" || rfq.status === "awarded") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Cannot reinvite on a closed or awarded request" });
      }

      const result = await notifyMatchedSuppliers({
        rfqId:                  input.rfqId,
        requestType:            rfq.requestType ?? "rfq_quote",
        projectName:            rfq.projectName,
        projectLocation:        rfq.projectLocation ?? undefined,
        description:            rfq.notes ?? undefined,
        requiredCertifications: (rfq.requiredCertifications ?? []) as string[],
      });

      return result;
    }),
});
