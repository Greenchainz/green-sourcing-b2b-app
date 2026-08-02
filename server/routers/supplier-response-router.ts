/**
 * Supplier Response Router
 *
 * Handles structured supplier responses to Smart RFx requests.
 * Suppliers submit field values keyed to the buyer's responseFieldSchema.
 * After submission, responses are auto-scored via rfx-response-scorer.
 *
 * Procedures:
 *   submitStructured — Supplier submits a structured response to an RFQ
 *   listForRequest   — Buyer retrieves all responses for a request (with scores)
 *   scoreResponses   — (Re)compute rfxTotalScore for all bids on a request
 *   getMyResponse    — Supplier retrieves their own response for a request
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { rfqs, rfqBids, suppliers, rfqSupplierInvites } from "../../drizzle/schema";
import { eq, and, sql, isNull } from "drizzle-orm";
import {
  scoreRfxResponse,
  computeMedianBidPrice,
  DEFAULT_SCORING_WEIGHTS,
  type RfxScoringWeights,
} from "../lib/rfx-response-scorer";
import {
  inferBidDataQualityLevel,
  type DataQualityLevel,
} from "../lib/sustainability-data-quality";
import type { SupplierResponseField } from "../lib/smart-rfx-classifier";

// ─── Zod schemas ─────────────────────────────────────────────────────────────

const fieldValuesSchema = z.record(z.string(), z.unknown());

const scoringWeightsSchema = z.object({
  price:          z.number().min(0).max(1),
  carbon:         z.number().min(0).max(1),
  leadTime:       z.number().min(0).max(1),
  documentation:  z.number().min(0).max(1),
  certifications: z.number().min(0).max(1),
}).refine(
  (w) => Math.abs(Object.values(w).reduce((s, v) => s + v, 0) - 1) < 0.01,
  { message: "Scoring weights must sum to 1" }
);

// ─── Helper: derive scored totals from a bid ─────────────────────────────────

function extractScoreInputs(
  bid: {
    bidPrice:      string | null;
    gwpValue:      string | null;
    leadDays:      number | null;
    epdReference:  string | null;
    fieldValues:   unknown;
  },
  rfq: {
    responseFieldSchema: unknown;
  },
  medianBidPrice: number | null,
) {
  const fieldSchema = (rfq.responseFieldSchema ?? []) as SupplierResponseField[];
  const fieldValues = (bid.fieldValues ?? {}) as Record<string, unknown>;

  const requiredFields = fieldSchema.filter((f) => f.required);
  const filledRequired = requiredFields.filter(
    (f) => fieldValues[f.key] !== undefined && fieldValues[f.key] !== null && fieldValues[f.key] !== "",
  ).length;

  const hasEpd =
    !!bid.epdReference ||
    fieldValues["epd_available"] === true ||
    fieldValues["epd_available"] === "true";

  const certifications =
    typeof fieldValues["certifications"] === "string"
      ? (fieldValues["certifications"] as string)
      : null;

  return {
    bidPrice:             bid.bidPrice != null ? parseFloat(bid.bidPrice) : null,
    medianBidPrice,
    gwpValue:             bid.gwpValue != null ? parseFloat(bid.gwpValue) : null,
    maxGwp:               null,   // could be extended to read from rfq if added later
    leadDays:             bid.leadDays,
    maxLeadDays:          null,   // could derive from rfq.dueDate
    hasEpd,
    filledRequiredFields: filledRequired,
    totalRequiredFields:  requiredFields.length,
    certifications,
  };
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const supplierResponseRouter = router({

  /**
   * Supplier submits a structured response to a sourcing request.
   * Supplier identity comes from ctx.user — never from client input.
   * Auto-scores the response after insertion.
   */
  submitStructured: protectedProcedure
    .input(
      z.object({
        rfqId:        z.number().int().positive(),
        canFulfill:   z.boolean(),
        bidPrice:     z.number().positive().optional(),
        leadDays:     z.number().int().positive().optional(),
        notes:        z.string().max(2000).optional(),
        expiresAt:    z.date().optional(),
        epdReference: z.string().max(500).optional(),
        gwpValue:     z.number().positive().optional(),
        fieldValues:  fieldValuesSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Resolve supplierId from ctx — never from client input.
      // Also enforces that only approved (verified) suppliers can submit.
      const [supplierRow] = await db
        .select({ id: suppliers.id })
        .from(suppliers)
        .where(
          and(
            eq(suppliers.userId, ctx.user.id),
            eq(suppliers.verificationStatus, "approved"),
            isNull(suppliers.deletedAt),
          )
        )
        .limit(1);

      if (!supplierRow) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Supplier account is not active",
        });
      }

      // Confirm the RFQ exists and is open
      const [rfq] = await db
        .select()
        .from(rfqs)
        .where(eq(rfqs.id, input.rfqId))
        .limit(1);

      if (!rfq) throw new TRPCError({ code: "NOT_FOUND", message: "Request not found" });

      if (rfq.status === "closed" || rfq.status === "awarded") {
        throw new TRPCError({ code: "FORBIDDEN", message: "This request is no longer accepting responses" });
      }

      // Infer data quality level server-side from submitted evidence.
      // Never trust a level from client input.
      const hasEpdEvidence =
        !!input.epdReference ||
        input.fieldValues?.["epd_available"] === true ||
        input.fieldValues?.["epd_available"] === "true";
      const hasGwpEvidence = input.gwpValue != null;
      const inferredQualityLevel: DataQualityLevel = inferBidDataQualityLevel(
        null,            // no persisted level yet
        hasEpdEvidence,
        hasGwpEvidence,
      );

      const bidData = {
        rfqId:            input.rfqId,
        supplierId:       supplierRow.id,
        status:           "submitted" as const,
        canFulfill:       input.canFulfill,
        bidPrice:         input.bidPrice?.toString() ?? null,
        leadDays:         input.leadDays ?? null,
        notes:            input.notes ?? null,
        expiresAt:        input.expiresAt ?? null,
        epdReference:     input.epdReference ?? null,
        gwpValue:         input.gwpValue?.toString() ?? null,
        fieldValues:      input.fieldValues as object,
        dataQualityLevel: inferredQualityLevel,
      };

      const [upsertedBid] = await db
        .insert(rfqBids)
        .values(bidData)
        .onConflictDoUpdate({
          target: [rfqBids.rfqId, rfqBids.supplierId],
          targetWhere: sql`deleted_at IS NULL`,
          set: {
            ...bidData,
            updatedAt: new Date(),
            deletedAt: null,
          },
        })
        .returning({ id: rfqBids.id });

      const bidId = upsertedBid.id;

      // Auto-score this response
      // Need median — fetch all bid prices for this RFQ
      const allBids = await db
        .select({ bidPrice: rfqBids.bidPrice })
        .from(rfqBids)
        .where(and(eq(rfqBids.rfqId, input.rfqId), isNull(rfqBids.deletedAt)));

      const median = computeMedianBidPrice(
        allBids.map((b) => (b.bidPrice != null ? parseFloat(b.bidPrice) : null))
      );

      const weights = (rfq.scoringWeights as RfxScoringWeights | null) ?? DEFAULT_SCORING_WEIGHTS;

      const scoreInput = extractScoreInputs(
        {
          bidPrice:     input.bidPrice?.toString() ?? null,
          gwpValue:     input.gwpValue?.toString() ?? null,
          leadDays:     input.leadDays ?? null,
          epdReference: input.epdReference ?? null,
          fieldValues:  input.fieldValues,
        },
        rfq,
        median,
      );

      const { total } = scoreRfxResponse(
        { ...scoreInput, dataQualityLevel: inferredQualityLevel },
        weights,
      );

      await db
        .update(rfqBids)
        .set({ rfxTotalScore: total.toString() })
        .where(eq(rfqBids.id, bidId));

      // Stamp respondedAt on the invite row so the buyer can see who responded
      void db
        .update(rfqSupplierInvites)
        .set({ respondedAt: new Date() })
        .where(
          and(
            eq(rfqSupplierInvites.rfqId,     input.rfqId),
            eq(rfqSupplierInvites.supplierId, supplierRow.id),
          )
        )
        .catch((err) => console.error("[supplier-response] respondedAt stamp failed:", err));

      return { bidId, score: total };
    }),

  /**
   * Buyer retrieves all structured responses for their sourcing request.
   * Includes score breakdown and supplier name.
   * Scoped to ctx.user.id (buyer-owner only).
   */
  listForRequest: protectedProcedure
    .input(z.object({ rfqId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Verify the buyer owns this RFQ
      const [rfq] = await db
        .select()
        .from(rfqs)
        .where(and(eq(rfqs.id, input.rfqId), eq(rfqs.userId, ctx.user.id)))
        .limit(1);

      if (!rfq) throw new TRPCError({ code: "NOT_FOUND", message: "Request not found" });

      // Fetch all bids with supplier names
      const bids = await db
        .select({
          id:            rfqBids.id,
          supplierId:    rfqBids.supplierId,
          supplierName:  suppliers.companyName,
          status:        rfqBids.status,
          canFulfill:    rfqBids.canFulfill,
          bidPrice:      rfqBids.bidPrice,
          leadDays:      rfqBids.leadDays,
          notes:         rfqBids.notes,
          expiresAt:     rfqBids.expiresAt,
          epdReference:  rfqBids.epdReference,
          gwpValue:      rfqBids.gwpValue,
          fieldValues:      rfqBids.fieldValues,
          rfxTotalScore:    rfqBids.rfxTotalScore,
          dataQualityLevel: rfqBids.dataQualityLevel,
          createdAt:        rfqBids.createdAt,
        })
        .from(rfqBids)
        .innerJoin(suppliers, eq(rfqBids.supplierId, suppliers.id))
        .where(and(eq(rfqBids.rfqId, input.rfqId), isNull(rfqBids.deletedAt)))
        .orderBy(
          // Sort by score desc (nulls last), then by submitted date
          sql`${rfqBids.rfxTotalScore}::numeric desc nulls last`,
          rfqBids.createdAt,
        );

      // Compute score breakdowns for each bid using the full scorer
      const prices = bids.map((b) => (b.bidPrice ? parseFloat(b.bidPrice) : null));
      const median = computeMedianBidPrice(prices);
      const weights = (rfq.scoringWeights as RfxScoringWeights | null) ?? DEFAULT_SCORING_WEIGHTS;

      const bidsWithBreakdown = bids.map((bid) => {
        const scoreInput = extractScoreInputs(bid, rfq, median);
        const qualityLevel = inferBidDataQualityLevel(
          bid.dataQualityLevel as DataQualityLevel | null,
          scoreInput.hasEpd,
          scoreInput.gwpValue != null,
        );
        const breakdown = scoreRfxResponse(
          { ...scoreInput, dataQualityLevel: qualityLevel },
          weights,
        );
        return {
          ...bid,
          scoreBreakdown: breakdown,
        };
      });

      return {
        rfq,
        bids: bidsWithBreakdown,
        weights,
        responseCount: bids.length,
      };
    }),

  /**
   * Re-compute and persist rfxTotalScore for all bids on a request.
   * Useful if the buyer changes scoringWeights after responses come in.
   * Buyer-scoped.
   */
  scoreResponses: protectedProcedure
    .input(
      z.object({
        rfqId:          z.number().int().positive(),
        scoringWeights: scoringWeightsSchema.optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [rfq] = await db
        .select()
        .from(rfqs)
        .where(and(eq(rfqs.id, input.rfqId), eq(rfqs.userId, ctx.user.id)))
        .limit(1);

      if (!rfq) throw new TRPCError({ code: "NOT_FOUND", message: "Request not found" });

      // Optionally persist new weights
      if (input.scoringWeights) {
        await db
          .update(rfqs)
          .set({ scoringWeights: input.scoringWeights })
          .where(eq(rfqs.id, input.rfqId));
      }

      const weights = input.scoringWeights ?? (rfq.scoringWeights as RfxScoringWeights | null) ?? DEFAULT_SCORING_WEIGHTS;

      const bids = await db
        .select()
        .from(rfqBids)
        .where(and(eq(rfqBids.rfqId, input.rfqId), isNull(rfqBids.deletedAt)));

      if (bids.length === 0) return { updated: 0 };

      const median = computeMedianBidPrice(
        bids.map((b) => (b.bidPrice ? parseFloat(b.bidPrice) : null))
      );

      // Update all scores in parallel
      await Promise.all(
        bids.map(async (bid) => {
          const scoreInput = extractScoreInputs(bid, rfq, median);
          const qualityLevel = inferBidDataQualityLevel(
            bid.dataQualityLevel as DataQualityLevel | null,
            scoreInput.hasEpd,
            scoreInput.gwpValue != null,
          );
          const { total } = scoreRfxResponse(
            { ...scoreInput, dataQualityLevel: qualityLevel },
            weights,
          );
          await db
            .update(rfqBids)
            .set({ rfxTotalScore: total.toString() })
            .where(eq(rfqBids.id, bid.id));
        })
      );

      return { updated: bids.length };
    }),

  /**
   * Supplier retrieves their own response for a given RFQ.
   * Scoped to ctx.user.id → supplierId.
   */
  getMyResponse: protectedProcedure
    .input(z.object({ rfqId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [supplierRow] = await db
        .select({ id: suppliers.id })
        .from(suppliers)
        .where(and(eq(suppliers.userId, ctx.user.id), isNull(suppliers.deletedAt)))
        .limit(1);

      if (!supplierRow) return null;

      const [bid] = await db
        .select()
        .from(rfqBids)
        .where(
          and(
            eq(rfqBids.rfqId, input.rfqId),
            eq(rfqBids.supplierId, supplierRow.id),
            isNull(rfqBids.deletedAt),
          )
        )
        .limit(1);

      return bid ?? null;
    }),
});
