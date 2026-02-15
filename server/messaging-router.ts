import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import {
  getOrCreateConversation,
  getUserConversations,
  getConversationMessages,
  sendMessage,
  markMessagesAsRead,
  getUnreadMessageCount,
} from "./messaging-service";

export const messagingRouter = router({
  /**
   * Get or create a conversation for an RFQ
   */
  getOrCreateConversation: protectedProcedure
    .input(
      z.object({
        rfqId: z.number(),
        buyerId: z.number(),
        supplierId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      return await getOrCreateConversation(input);
    }),

  /**
   * Get all conversations for the current user
   */
  getConversations: protectedProcedure.query(async ({ ctx }) => {
    return await getUserConversations(ctx.user.id);
  }),

  /**
   * Get messages for a specific conversation
   */
  getMessages: protectedProcedure
    .input(z.object({ conversationId: z.number() }))
    .query(async ({ input }) => {
      return await getConversationMessages(input.conversationId);
    }),

  /**
   * Send a message in a conversation
   */
  sendMessage: protectedProcedure
    .input(
      z.object({
        conversationId: z.number(),
        content: z.string().min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await sendMessage({
        conversationId: input.conversationId,
        senderId: ctx.user.id,
        content: input.content,
      });
    }),

  /**
   * Mark messages as read
   */
  markAsRead: protectedProcedure
    .input(z.object({ conversationId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      return await markMessagesAsRead({
        conversationId: input.conversationId,
        userId: ctx.user.id,
      });
    }),

  /**
   * Get unread message count
   */
  getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
    return await getUnreadMessageCount(ctx.user.id);
  }),
});
