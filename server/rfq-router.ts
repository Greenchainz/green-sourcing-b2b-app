import { router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { submitRfq, getRfqWithBids, submitBid, getOrCreateThread, sendMessage, acceptBid } from "./rfq-service";
import type { RfqSubmissionInput } from "./rfq-service";
import { getDb } from "./db";
import { rfqs, rfqItems, rfqBids, rfqAnalytics, suppliers, users } from "../drizzle/schema";
import { eq, desc, and, inArray } from "drizzle-orm";
import { enrichRfqWithAiAnalysis } from "./ai-agent-service";
import { getMarketplaceAccessToken } from "./marketplace-auth";

/**
 * Microsoft Commercial Marketplace — SaaS Fulfillment API v2
 * https://learn.microsoft.com/en-us/azure/marketplace/partner-center-portal/pc-saas-fulfillment-api-v2
 *
 * Validates a Microsoft subscription ID against the live Fulfillment API.
 * Requires AZURE_AD_CLIENT_ID + AZURE_AD_CLIENT_SECRET + AZURE_AD_TENANT_ID in env.
 */
async function verifyMicrosoftOrder(microsoftOrderId?: string): Promise<{
  verified: boolean;
  orderId: string;
  amount: number;
}> {
  if (!microsoftOrderId) {
    // No order ID supplied — allow free-tier / dev flows through
    return { verified: true, orderId: "msft_dev_" + Date.now(), amount: 0 };
  }

  const endpoint = `https://marketplaceapi.microsoft.com/api/saas/subscriptions/${microsoftOrderId}?api-version=2018-08-31`;

  let token: string;
  try {
    token = await getMarketplaceAccessToken();
  } catch (err) {
    console.error("[rfq] Failed to obtain Marketplace access token:", err);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Could not reach Microsoft Marketplace — try again shortly",
    });
  }

  const res = await fetch(endpoint, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`[rfq] Marketplace order verification failed (${res.status}):`, body);
    throw new TRPCError({
      code: "PAYMENT_REQUIRED",
      message: "Microsoft Marketplace order verification failed — subscription may be inactive or cancelled",
    });
  }

  const subscription = await res.json() as {
    id: string;
    saasSubscriptionStatus: string;
    planId: string;
    quantity?: number;
  };

  // Only allow orders with an active subscription
  if (subscription.saasSubscriptionStatus !== "Subscribed") {
    throw new TRPCError({
      code: "PAYMENT_REQUIRED",
      message: `Subscription is not active (status: ${subscription.saasSubscriptionStatus})`,
    });
  }

  console.log(`[rfq] Marketplace order verified: ${subscription.id} (${subscription.planId})`);
  return { verified: true, orderId: subscription.id, amount: 25 };
}

/**
 * RFQ Marketplace Router
 * Handles RFQ submission, bidding, supplier matching, and real-time messaging.
 * Payment processing: Microsoft Commercial Marketplace ISV transact (not Stripe).
 */

export const rfqMarketplaceRouter = router({
  // Submit an RFQ and auto-match to suppliers
  submit: protectedProcedure
    .input(
      z.object({
        projectName: z.string().min(1).max(200),
        projectLocation: z.string().max(300),
        projectType: z.string().max(100).optional(),
        materials: z.array(
          z.object({
            materialId: z.number(),
            quantity: z.number().positive(),
            quantityUnit: z.string().max(50),
          })
        ).min(1).max(50),
        notes: z.string().max(2000).optional(),
        dueDate: z.date().optional(),
        buyerPersona: z.string().max(100).optional(),
        // Microsoft Commercial Marketplace order/subscription ID (optional pre-activation)
        microsoftOrderId: z.string().max(200).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });

      // ── 1. LinkedIn verification check ─────────────────────────────────────
      const [user] = await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1);
      if (process.env.NODE_ENV === "production" && !user?.linkedinVerified) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "LinkedIn verification required to create RFQs",
          cause: { errorCode: "LINKEDIN_VERIFICATION_REQUIRED", action: "/settings/verification" },
        });
      }

      // ── 2. Microsoft ISV transact verification ──────────────────────────────
      const { verified: depositVerified, orderId, amount: depositAmount } =
        await verifyMicrosoftOrder(input.microsoftOrderId);

      if (!depositVerified) {
        throw new TRPCError({
          code: "PAYMENT_REQUIRED",
          message: "Microsoft order verification failed",
          cause: { errorCode: "MSFT_ORDER_NOT_VERIFIED" },
        });
      }

      return submitRfq(ctx.user.id, {
        ...(input as RfqSubmissionInput),
        depositPaymentIntentId: orderId, // reuse existing field — stores msft order id
        depositVerified,
        depositAmount,
      });
    }),

  // Get RFQ with all bids and analytics
  // Access: RFQ owner, any supplier with a bid on it, or admin
  getWithBids: protectedProcedure
    .input(z.object({ rfqId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });

      const [rfq] = await db.select().from(rfqs).where(eq(rfqs.id, input.rfqId)).limit(1);
      if (!rfq) throw new TRPCError({ code: "NOT_FOUND", message: "RFQ not found" });

      const isOwner = rfq.userId === ctx.user.id;
      const isAdmin = ctx.auth?.role === "admin";

      if (!isOwner && !isAdmin) {
        // Check if the authenticated user is a supplier with a bid on this RFQ
        const [supplierRecord] = await db
          .select({ id: suppliers.id })
          .from(suppliers)
          .where(eq(suppliers.userId, ctx.user.id))
          .limit(1);

        if (!supplierRecord) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }

        const [existingBid] = await db
          .select({ id: rfqBids.id })
          .from(rfqBids)
          .where(and(eq(rfqBids.rfqId, input.rfqId), eq(rfqBids.supplierId, supplierRecord.id)))
          .limit(1);

        if (!existingBid) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
      }

      return getRfqWithBids(input.rfqId);
    }),

  // Submit a bid for an RFQ — supplierId is always derived from ctx.user, never trusted from input
  submitBid: protectedProcedure
    .input(
      z.object({
        rfqId: z.number(),
        bidPrice: z.number().positive(),
        leadDays: z.number().int().positive(),
        notes: z.string().max(2000).optional(),
        expiresAt: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });

      // Only registered suppliers may bid
      const [supplierRecord] = await db
        .select({ id: suppliers.id })
        .from(suppliers)
        .where(eq(suppliers.userId, ctx.user.id))
        .limit(1);

      if (!supplierRecord) {
        throw new TRPCError({ code: "FORBIDDEN", message: "A supplier account is required to submit a bid" });
      }

      return submitBid(input.rfqId, supplierRecord.id, input.bidPrice, input.leadDays, input.notes);
    }),

  // Get or create messaging thread for RFQ
  getOrCreateThread: protectedProcedure
    .input(z.object({ rfqId: z.number(), supplierId: z.number(), buyerId: z.number() }))
    .query(async ({ input }) => {
      return getOrCreateThread(input.rfqId, input.supplierId, input.buyerId);
    }),

  // Send message in RFQ thread
  // senderId is derived from ctx.user.id — never trust client-supplied sender identity
  sendMessage: protectedProcedure
    .input(
      z.object({
        threadId: z.number(),
        message: z.string().min(1).max(4000),
        senderType: z.enum(["buyer", "supplier"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return sendMessage(input.threadId, ctx.user.id, input.senderType, input.message);
    }),

  // Get paginated thread messages (used by RealTimeChat)
  getThreadMessages: protectedProcedure
    .input(
      z.object({
        threadId: z.number(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input }) => {
      const { getThreadMessages: getMessages } = await import("./webpubsub-manager");
      return getMessages(input.threadId, input.limit, input.offset);
    }),

  // Mark a message as read
  markMessageAsRead: protectedProcedure
    .input(z.object({ messageId: z.number() }))
    .mutation(async ({ input }) => {
      const { markMessageAsRead } = await import("./webpubsub-manager");
      return markMessageAsRead(input.messageId);
    }),

  // Get WebSocket access token for real-time chat (Azure Web PubSub)
  getWebSocketToken: protectedProcedure
    .input(z.object({ threadId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { getWebSocketAccessToken } = await import("./webpubsub-manager");
      return getWebSocketAccessToken(ctx.user.id, input.threadId);
    }),

  // Accept a bid and create order — only the RFQ owner may accept
  acceptBid: protectedProcedure
    .input(z.object({ rfqId: z.number(), bidId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });

      const [rfq] = await db.select({ userId: rfqs.userId }).from(rfqs).where(eq(rfqs.id, input.rfqId)).limit(1);
      if (!rfq) throw new TRPCError({ code: "NOT_FOUND", message: "RFQ not found" });
      if (rfq.userId !== ctx.user.id && ctx.auth?.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only the RFQ owner can accept a bid" });
      }

      return acceptBid(input.rfqId, input.bidId);
    }),

  // Get RFQs for the authenticated user
  // input.userId is intentionally ignored — always scoped to ctx.user.id for multi-tenant safety.
  // getBuyerRfqs was an identical duplicate and has been removed; callers should use this procedure.
  getUserRfqs: protectedProcedure
    .input(z.object({ userId: z.number().optional() }))
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];

      const userRfqs = await db
        .select()
        .from(rfqs)
        .where(eq(rfqs.userId, ctx.user.id))
        .orderBy(desc(rfqs.createdAt));

      if (userRfqs.length === 0) return [];

      // Batch fetch items + bids — 2 queries regardless of RFQ count (was N+1)
      const rfqIds = userRfqs.map((r) => r.id);
      const [allItems, allBids] = await Promise.all([
        db.select({ rfqId: rfqItems.rfqId }).from(rfqItems).where(inArray(rfqItems.rfqId, rfqIds)),
        db.select({ rfqId: rfqBids.rfqId }).from(rfqBids).where(inArray(rfqBids.rfqId, rfqIds)),
      ]);

      const itemCountMap = new Map<number, number>();
      const bidCountMap = new Map<number, number>();
      for (const item of allItems) itemCountMap.set(item.rfqId, (itemCountMap.get(item.rfqId) ?? 0) + 1);
      for (const bid of allBids) bidCountMap.set(bid.rfqId, (bidCountMap.get(bid.rfqId) ?? 0) + 1);

      return userRfqs.map((rfq) => ({
        ...rfq,
        itemCount: itemCountMap.get(rfq.id) ?? 0,
        bidCount: bidCountMap.get(rfq.id) ?? 0,
      }));
    }),

  // Get detailed RFQ with items, bids, and analytics
  // Access: RFQ owner, any supplier with a bid on it, or admin
  getRfqDetails: protectedProcedure
    .input(z.object({ rfqId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return null;

      const rfq = await db.select().from(rfqs).where(eq(rfqs.id, input.rfqId)).limit(1);
      if (!rfq.length) return null;

      const isOwner = rfq[0].userId === ctx.user.id;
      const isAdmin = ctx.auth?.role === "admin";

      if (!isOwner && !isAdmin) {
        const [supplierRecord] = await db
          .select({ id: suppliers.id })
          .from(suppliers)
          .where(eq(suppliers.userId, ctx.user.id))
          .limit(1);

        if (!supplierRecord) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }

        const [existingBid] = await db
          .select({ id: rfqBids.id })
          .from(rfqBids)
          .where(and(eq(rfqBids.rfqId, input.rfqId), eq(rfqBids.supplierId, supplierRecord.id)))
          .limit(1);

        if (!existingBid) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
      }

      const items = await db.select().from(rfqItems).where(eq(rfqItems.rfqId, input.rfqId));

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
        projectLocation: z.string().max(300),
        materials: z.array(z.string().max(100)).min(1).max(20),
      })
    )
    .mutation(async ({ input }) => {
      return enrichRfqWithAiAnalysis(0, input.projectLocation, input.materials);
    }),
});
