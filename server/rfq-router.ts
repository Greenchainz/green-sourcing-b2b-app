import { router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { submitRfq, getRfqWithBids, submitBid, getOrCreateThread, sendMessage, getThreadMessages, acceptBid, enrichRfqWithCcps } from "./rfq-service";
import type { RfqSubmissionInput } from "./rfq-service";
import { getDb } from "./db";
import { rfqs, rfqItems, rfqBids, rfqAnalytics, suppliers } from "../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { enrichRfqWithAiAnalysis } from "./ai-agent-service";

/**
 * RFQ Marketplace Router
 * Handles RFQ submission, bidding, supplier matching, and real-time messaging
 */

export const rfqMarketplaceRouter = router({
  // Submit an RFQ and auto-match to suppliers
  submit: protectedProcedure
    .input(
      z.object({
        projectName: z.string().min(1),
        projectLocation: z.string(),
        projectType: z.string().optional(),
        materials: z.array(
          z.object({
            materialId: z.number(),
            quantity: z.number().positive(),
            quantityUnit: z.string(),
          })
        ),
        notes: z.string().optional(),
        dueDate: z.date().optional(),
        buyerPersona: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return submitRfq(ctx.user.id, input as RfqSubmissionInput);
    }),

  // Get RFQ with all bids and analytics
  getWithBids: protectedProcedure
    .input(z.object({ rfqId: z.number() }))
    .query(async ({ input }) => {
      return getRfqWithBids(input.rfqId);
    }),

  // Submit a bid for an RFQ
  submitBid: protectedProcedure
    .input(
      z.object({
        rfqId: z.number(),
        supplierId: z.number(),
        bidPrice: z.number().positive(),
        leadDays: z.number().positive(),
        notes: z.string().optional(),
        expiresAt: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return submitBid(input.rfqId, input.supplierId, input.bidPrice, input.leadDays, input.notes);
    }),

  // Get or create messaging thread for RFQ
  getOrCreateThread: protectedProcedure
    .input(z.object({ rfqId: z.number(), supplierId: z.number(), buyerId: z.number() }))
    .query(async ({ input }) => {
      return getOrCreateThread(input.rfqId, input.supplierId, input.buyerId);
    }),

  // Send message in RFQ thread
  sendMessage: protectedProcedure
    .input(
      z.object({
        threadId: z.number(),
        message: z.string(),
        senderId: z.number(),
        senderType: z.enum(["buyer", "supplier"]),
      })
    )
    .mutation(async ({ input }) => {
      return sendMessage(input.threadId, input.senderId, input.senderType, input.message);
    }),

  // Get messages from thread
  getMessages: protectedProcedure
    .input(z.object({ threadId: z.number(), limit: z.number().optional() }))
    .query(async ({ input }) => {
      return getThreadMessages(input.threadId, input.limit);
    }),

  // Accept a bid and create order
  acceptBid: protectedProcedure
    .input(z.object({ rfqId: z.number(), bidId: z.number() }))
    .mutation(async ({ input }) => {
      return acceptBid(input.rfqId, input.bidId);
    }),

  // Get RFQs for buyer with CCPS enrichment
  getBuyerRfqs: protectedProcedure
    .input(z.object({ buyerId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const userRfqs = await db
        .select()
        .from(rfqs)
        .where(eq(rfqs.userId, input.buyerId))
        .orderBy(desc(rfqs.createdAt));

      const enriched = await Promise.all(
        userRfqs.map(async (rfq) => {
          const items = await db.select().from(rfqItems).where(eq(rfqItems.rfqId, rfq.id));
          const bids = await db.select().from(rfqBids).where(eq(rfqBids.rfqId, rfq.id));

          return {
            ...rfq,
            itemCount: items.length,
            bidCount: bids.length,
          };
        })
      );

      return enriched;
    }),

  // Get detailed RFQ with items, bids, and analytics
  getRfqDetails: protectedProcedure
    .input(z.object({ rfqId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      // Get RFQ
      const rfq = await db.select().from(rfqs).where(eq(rfqs.id, input.rfqId)).limit(1);
      if (!rfq.length) return null;

      // Get items
      const items = await db.select().from(rfqItems).where(eq(rfqItems.rfqId, input.rfqId));

      // Get bids with supplier info
      const bids = await db
        .select({
          id: rfqBids.id,
          rfqId: rfqBids.rfqId,
          supplierId: rfqBids.supplierId,
          status: rfqBids.status,
          bidPrice: rfqBids.bidPrice,
          leadDays: rfqBids.leadDays,
          notes: rfqBids.notes,
          expiresAt: rfqBids.expiresAt,
          createdAt: rfqBids.createdAt,
          supplierName: suppliers.companyName,
          supplierLocation: suppliers.city,
        })
        .from(rfqBids)
        .leftJoin(suppliers, eq(rfqBids.supplierId, suppliers.id))
        .where(eq(rfqBids.rfqId, input.rfqId))
        .orderBy(desc(rfqBids.createdAt));

      // Get analytics
      const analytics = await db
        .select()
        .from(rfqAnalytics)
        .where(eq(rfqAnalytics.rfqId, input.rfqId))
        .limit(1);

      return {
        ...rfq[0],
        itemCount: items.length,
        items,
        bids,
        analytics: analytics.length > 0 ? analytics[0] : null,
      };
    }),

  // Analyze RFQ with AI agents for material recommendations and compliance
  analyzeWithAi: protectedProcedure
    .input(
      z.object({
        projectLocation: z.string(),
        materials: z.array(z.string()),
      })
    )
    .mutation(async ({ input }) => {
      return enrichRfqWithAiAnalysis(0, input.projectLocation, input.materials);
    }),
});
