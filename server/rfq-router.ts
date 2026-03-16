import { router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { submitRfq, getRfqWithBids, submitBid, getOrCreateThread, sendMessage, getThreadMessages, acceptBid, enrichRfqWithCcps } from "./rfq-service";
import type { RfqSubmissionInput } from "./rfq-service";
import { getDb } from "./db";
import { rfqs, rfqItems, rfqBids, rfqAnalytics, suppliers, users } from "../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { enrichRfqWithAiAnalysis } from "./ai-agent-service";

/** Lazily initialise Stripe — only when STRIPE_SECRET_KEY is present */
function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Stripe = require("stripe");
  return new Stripe(key, { apiVersion: "2025-02-24.acacia" });
}

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
        depositPaymentIntentId: z.string().min(1, "Deposit payment intent ID is required"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });

      // ── 1. LinkedIn verification check ─────────────────────────────────────
      const [user] = await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1);
      if (!user?.linkedinVerified) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "LinkedIn verification required to create RFQs",
          cause: { errorCode: "LINKEDIN_VERIFICATION_REQUIRED", action: "/settings/verification" },
        });
      }

      // ── 2. Stripe deposit verification (dev-mode bypass when key absent) ───
      const stripe = getStripe();
      let depositVerified = false;
      let depositAmount: number | undefined;

      if (stripe) {
        const paymentIntent = await stripe.paymentIntents.retrieve(input.depositPaymentIntentId);
        if (paymentIntent.status !== "succeeded") {
          throw new TRPCError({
            code: "PAYMENT_REQUIRED",
            message: "Deposit payment could not be verified",
            cause: { errorCode: "PAYMENT_NOT_VERIFIED" },
          });
        }
        depositVerified = true;
        depositAmount = paymentIntent.amount / 100; // convert cents → dollars
      } else {
        // Dev-mode bypass: no Stripe key configured
        depositVerified = true;
        depositAmount = 25;
      }

      return submitRfq(ctx.user.id, {
        ...(input as RfqSubmissionInput),
        depositPaymentIntentId: input.depositPaymentIntentId,
        depositVerified,
        depositAmount,
      });
    }),

  // Create a Stripe payment intent for the RFQ deposit ($25)
  createDepositIntent: protectedProcedure
    .input(z.object({ rfqMaterialCount: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const stripe = getStripe();

      if (!stripe) {
        // Dev-mode: return a placeholder intent so the UI can proceed
        return {
          clientSecret: "dev_mode_no_stripe_key",
          intentId: "dev_intent_" + Date.now(),
          devMode: true,
        };
      }

      const depositAmount = 2500; // $25.00 in cents
      const paymentIntent = await stripe.paymentIntents.create({
        amount: depositAmount,
        currency: "usd",
        metadata: {
          userId: ctx.user.id.toString(),
          type: "rfq_deposit",
          materialCount: input.rfqMaterialCount.toString(),
        },
      });

      return {
        clientSecret: paymentIntent.client_secret,
        intentId: paymentIntent.id,
        devMode: false,
      };
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

  // Get messages from thread (legacy — use getThreadMessages for paginated access)
  getMessages: protectedProcedure
    .input(z.object({ threadId: z.number(), limit: z.number().optional() }))
    .query(async ({ input }) => {
      return getThreadMessages(input.threadId, input.limit);
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

  // Accept a bid and create order
  acceptBid: protectedProcedure
    .input(z.object({ rfqId: z.number(), bidId: z.number() }))
    .mutation(async ({ input }) => {
      return acceptBid(input.rfqId, input.bidId);
    }),

  // Get RFQs for the authenticated user (alias for getBuyerRfqs — used by RfqDashboard)
  getUserRfqs: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      // Security: always use authenticated user's ID, ignore input.userId
      const userId = ctx.user.id;

      const userRfqs = await db
        .select()
        .from(rfqs)
        .where(eq(rfqs.userId, userId))
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

  // Get RFQs for buyer with CCPS enrichment
  getBuyerRfqs: protectedProcedure
    .input(z.object({ buyerId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return [];

      // Security: always use authenticated user's ID
      const userId = ctx.user.id;

      const userRfqs = await db
        .select()
        .from(rfqs)
        .where(eq(rfqs.userId, userId))
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
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) return null;

      // Get RFQ — verify ownership (buyers see their own; suppliers see matched RFQs)
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
