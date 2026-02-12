import { protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { submitRfq, getRfqWithBids, submitBid, getOrCreateThread, sendMessage, getThreadMessages, acceptBid, enrichRfqWithCcps } from "./rfq-service";
import type { RfqSubmissionInput } from "./rfq-service";

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
      })
    )
    .mutation(async ({ input }) => {
      return submitBid(input.rfqId, input.supplierId, input.bidPrice, input.leadDays, input.notes);
    }),

  // Accept a bid and close RFQ
  acceptBid: protectedProcedure
    .input(z.object({ rfqId: z.number(), bidId: z.number() }))
    .mutation(async ({ input }) => {
      return acceptBid(input.rfqId, input.bidId);
    }),

  // Get or create a message thread between buyer and supplier
  getOrCreateThread: protectedProcedure
    .input(z.object({ rfqId: z.number(), supplierId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return getOrCreateThread(input.rfqId, input.supplierId, ctx.user.id);
    }),

  // Enrich RFQ with CCPS data (for agent)
  enrichWithCcps: protectedProcedure
    .input(z.object({ rfqId: z.number(), buyerPersona: z.string().optional() }))
    .query(async ({ input }) => {
      return enrichRfqWithCcps(input.rfqId, input.buyerPersona);
    }),

  // Get WebSocket access token for real-time messaging
  getWebSocketToken: protectedProcedure
    .input(z.object({ threadId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const { getWebSocketAccessToken } = await import("./webpubsub-manager");
      return getWebSocketAccessToken(ctx.user.id, input.threadId);
    }),

  // Send message via Web PubSub
  sendMessage: protectedProcedure
    .input(
      z.object({
        threadId: z.number(),
        message: z.string().max(1000),
        isBuyer: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { sendMessageToThread } = await import("./webpubsub-manager");
      return sendMessageToThread(input.threadId, ctx.user.id, input.message, input.isBuyer);
    }),

  // Mark message as read
  markMessageAsRead: protectedProcedure
    .input(z.object({ messageId: z.number() }))
    .mutation(async ({ input }) => {
      const { markMessageAsRead } = await import("./webpubsub-manager");
      return markMessageAsRead(input.messageId);
    }),

  // Get message history
  getThreadMessages: protectedProcedure
    .input(
      z.object({
        threadId: z.number(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input }) => {
      const { getThreadMessages } = await import("./webpubsub-manager");
      return getThreadMessages(input.threadId, input.limit, input.offset);
    }),
});
