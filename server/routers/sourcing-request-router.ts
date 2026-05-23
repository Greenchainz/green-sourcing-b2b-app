/**
 * Sourcing Request Router
 *
 * Powers the Smart RFx Builder — the workflow layer between material discovery
 * and real supplier action.
 *
 * Procedures:
 *   recommend        — Pure classifier, no DB. Returns request type + fields.
 *   create           — Saves to rfqs with requestType + responseFieldSchema.
 *   getById          — Full request + aggregated response summary.
 *   listMine         — Buyer's own requests.
 *   updateFields     — Mutate responseFieldSchema / scoringWeights.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { rfqs, rfqItems, rfqBids, suppliers } from "../../drizzle/schema";
import { eq, desc, and, sql } from "drizzle-orm";
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
});

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
          responseFieldSchema: input.responseFieldSchema as object,
          scoringWeights:      input.scoringWeights as object ?? null,
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
          ...(input.responseFieldSchema && { responseFieldSchema: input.responseFieldSchema as object }),
          ...(input.scoringWeights && { scoringWeights: input.scoringWeights as object }),
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
});
