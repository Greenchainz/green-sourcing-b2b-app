import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';

export const messagingRouter = router({
  getAccessToken: protectedProcedure
    .input(z.object({ threadId: z.number() }))
    .query(async ({ input, ctx }) => {
      const { getWebSocketAccessToken } = await import('../webpubsub-manager');
      return getWebSocketAccessToken(ctx.user.id, input.threadId);
    }),

  sendMessage: protectedProcedure
    .input(
      z.object({
        threadId: z.number(),
        message: z.string().min(1).max(1000),
        isBuyer: z.boolean(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { sendMessageToThread } = await import('../webpubsub-manager');
      return sendMessageToThread(input.threadId, ctx.user.id, input.message, input.isBuyer);
    }),

  getThreadMessages: protectedProcedure
    .input(
      z.object({
        threadId: z.number(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      const { getThreadMessages } = await import('../webpubsub-manager');
      return getThreadMessages(input.threadId, input.limit, input.offset);
    }),

  markMessageAsRead: protectedProcedure
    .input(z.object({ messageId: z.number() }))
    .mutation(async ({ input }) => {
      const { markMessageAsRead } = await import('../webpubsub-manager');
      return markMessageAsRead(input.messageId);
    }),

  broadcastTyping: protectedProcedure
    .input(
      z.object({
        threadId: z.number(),
        isBuyer: z.boolean(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { broadcastTypingIndicator } = await import('../webpubsub-manager');
      return broadcastTypingIndicator(input.threadId, ctx.user.id, input.isBuyer);
    }),

  closeThread: protectedProcedure
    .input(z.object({ threadId: z.number() }))
    .mutation(async ({ input }) => {
      const { closeThread } = await import('../webpubsub-manager');
      return closeThread(input.threadId);
    }),

  getOrCreateConversation: protectedProcedure
    .input(
      z.object({
        rfqId: z.number().optional().nullable(),
        buyerId: z.number(),
        supplierId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const { getOrCreateConversation } = await import('../messaging-service');
      return await getOrCreateConversation(input);
    }),

  getConversations: protectedProcedure.query(async ({ ctx }) => {
    const { getUserConversations } = await import('../messaging-service');
    return await getUserConversations(ctx.user.id);
  }),

  getMessages: protectedProcedure
    .input(z.object({ conversationId: z.number() }))
    .query(async ({ input }) => {
      const { getConversationMessages } = await import('../messaging-service');
      return await getConversationMessages(input.conversationId);
    }),

  send: protectedProcedure
    .input(
      z.object({
        conversationId: z.number(),
        content: z.string().min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { checkMessageLimit } = await import('../messaging-paywall');
      const limitCheck = await checkMessageLimit(ctx.user.id, input.conversationId);

      if (!limitCheck.canSend) {
        throw new Error(limitCheck.reason || 'Message limit reached');
      }

      const { sendMessage } = await import('../messaging-service');
      return await sendMessage({
        conversationId: input.conversationId,
        senderId: ctx.user.id,
        content: input.content,
      });
    }),

  markAsRead: protectedProcedure
    .input(z.object({ conversationId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const { markMessagesAsRead } = await import('../messaging-service');
      await markMessagesAsRead({ conversationId: input.conversationId, userId: ctx.user.id });
      return { ok: true as const };
    }),

  getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
    const { getUnreadMessageCount } = await import('../messaging-service');
    const count = await getUnreadMessageCount(ctx.user.id);
    return { count };
  }),

  sendWithAgent: protectedProcedure
    .input(
      z.object({
        conversationId: z.number(),
        content: z.string().min(1),
        conversationContext: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { triageMessage, incrementAgentMessageCount, checkHandoffRules, updateHandoffStatus } = await import('../agent-triage-service');
      const { generateAgentResponse } = await import('../agent-response-handler');
      const { sendMessage, getConversationMessages } = await import('../messaging-service');
      const { getDb } = await import('../db');
      const { conversations } = await import('../../drizzle/schema');
      const { eq } = await import('drizzle-orm');

      await sendMessage({
        conversationId: input.conversationId,
        senderId: ctx.user.id,
        content: input.content,
      });

      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const conv = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, input.conversationId))
        .limit(1);

      if (conv.length === 0) throw new Error('Conversation not found');

      const conversation = conv[0];

      const handoffCheck = await checkHandoffRules({
        conversationId: input.conversationId,
        supplierId: conversation.supplierId,
        agentMessageCount: conversation.agentMessageCount,
      });

      if (handoffCheck.shouldHandoff) {
        await updateHandoffStatus({
          conversationId: input.conversationId,
          handoffStatus: 'pending_handoff',
          handoffReason: handoffCheck.reason,
        });

        await sendMessage({
          conversationId: input.conversationId,
          senderId: ctx.user.id,
          content: `I've handled your initial questions, but I think you'd benefit from speaking with a human representative. ${handoffCheck.reason}. A team member will respond shortly.`,
        });

        return { success: true, handedOff: true };
      }

      const triageResult = await triageMessage({
        userId: ctx.user.id,
        conversationId: input.conversationId,
        messageContent: input.content,
        conversationContext: input.conversationContext,
      });

      if (triageResult.shouldHandoff) {
        await updateHandoffStatus({
          conversationId: input.conversationId,
          handoffStatus: 'pending_handoff',
          handoffReason: 'User requested human contact',
        });

        await sendMessage({
          conversationId: input.conversationId,
          senderId: ctx.user.id,
          content: "I'll connect you with a human representative right away. Someone from our team will respond shortly.",
        });

        return { success: true, handedOff: true };
      }

      const messageHistory = await getConversationMessages(input.conversationId);
      const formattedHistory = messageHistory.slice(-10).map((msg) => ({
        role: (msg.senderId === ctx.user.id ? 'user' : 'assistant') as 'user' | 'assistant',
        content: msg.content,
      }));

      let customPrompt: string | undefined;
      if (triageResult.agentType === 'supplier' && conversation.supplierId) {
        const { agentHandoffRules } = await import('../../drizzle/schema');
        const rules = await db
          .select({ customAgentPrompt: agentHandoffRules.customAgentPrompt })
          .from(agentHandoffRules)
          .where(eq(agentHandoffRules.supplierId, conversation.supplierId))
          .limit(1);

        if (rules.length > 0 && rules[0].customAgentPrompt) {
          customPrompt = rules[0].customAgentPrompt;
        }
      }

      const agentResponse = await generateAgentResponse({
        userId: ctx.user.id,
        conversationId: input.conversationId,
        agentType: triageResult.agentType,
        messageHistory: formattedHistory,
        conversationContext: input.conversationContext,
        customPrompt,
      });

      await sendMessage({
        conversationId: input.conversationId,
        senderId: ctx.user.id,
        content: agentResponse,
      });

      await incrementAgentMessageCount(input.conversationId);

      return { success: true, handedOff: false, agentType: triageResult.agentType };
    }),

  sendMessageWithAttachment: protectedProcedure
    .input(z.object({
      conversationId: z.number(),
      content: z.string(),
      attachmentUrl: z.string().optional(),
      attachmentType: z.string().optional(),
      attachmentName: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { getDb } = await import('../db');
      const { messages, conversations } = await import('../../drizzle/schema');
      const { eq } = await import('drizzle-orm');

      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const [insertedMsg] = await db.insert(messages).values({
        conversationId: input.conversationId,
        senderId: ctx.user.id,
        content: input.content,
        attachmentUrl: input.attachmentUrl,
        attachmentType: input.attachmentType,
        attachmentName: input.attachmentName,
      }).returning({ id: messages.id });

      const messagePreview = input.attachmentType
        ? `📎 ${input.attachmentName || 'Attachment'}`
        : (input.content.length > 50 ? input.content.substring(0, 50) + '...' : input.content);

      await db
        .update(conversations)
        .set({
          lastMessageAt: new Date(),
          lastMessage: messagePreview,
        })
        .where(eq(conversations.id, input.conversationId));

      return { success: true, messageId: insertedMsg.id };
    }),

  markConversationAsRead: protectedProcedure
    .input(z.object({ conversationId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const { markMessagesAsRead } = await import('../messaging-service');
      return await markMessagesAsRead({
        conversationId: input.conversationId,
        userId: ctx.user.id,
      });
    }),

  getUnreadMessageCount: protectedProcedure.query(async ({ ctx }) => {
    const { getUnreadMessageCount } = await import('../messaging-service');
    return await getUnreadMessageCount(ctx.user.id);
  }),

  addReaction: protectedProcedure
    .input(z.object({
      messageId: z.number(),
      reactionType: z.enum(['thumbs_up', 'thumbs_down', 'heart', 'party', 'check']),
    }))
    .mutation(async ({ input, ctx }) => {
      const { getDb } = await import('../db');
      const { messageReactions } = await import('../../drizzle/schema');
      const { eq, and } = await import('drizzle-orm');

      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const existing = await db
        .select()
        .from(messageReactions)
        .where(
          and(
            eq(messageReactions.messageId, input.messageId),
            eq(messageReactions.userId, ctx.user.id),
            eq(messageReactions.reactionType, input.reactionType)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        await db
          .delete(messageReactions)
          .where(eq(messageReactions.id, existing[0].id));
        return { added: false };
      }

      await db.insert(messageReactions).values({
        messageId: input.messageId,
        userId: ctx.user.id,
        reactionType: input.reactionType,
      });

      return { added: true };
    }),

  getMessageReactions: protectedProcedure
    .input(z.object({ messageId: z.number() }))
    .query(async ({ input }) => {
      const { getDb } = await import('../db');
      const { messageReactions } = await import('../../drizzle/schema');
      const { eq, sql } = await import('drizzle-orm');

      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const reactions = await db
        .select({
          reactionType: messageReactions.reactionType,
          count: sql<number>`COUNT(*)`
        })
        .from(messageReactions)
        .where(eq(messageReactions.messageId, input.messageId))
        .groupBy(messageReactions.reactionType);

      return reactions;
    }),

  pinConversation: protectedProcedure
    .input(z.object({ conversationId: z.number(), pinned: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const { getDb } = await import('../db');
      const { conversations } = await import('../../drizzle/schema');
      const { eq } = await import('drizzle-orm');

      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const conversation = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, input.conversationId))
        .limit(1);

      if (conversation.length === 0) {
        throw new Error('Conversation not found');
      }

      const conv = conversation[0];
      if (conv.buyerId !== ctx.user.id && conv.supplierId !== ctx.user.id) {
        throw new Error('Unauthorized');
      }

      await db
        .update(conversations)
        .set({ isPinned: input.pinned })
        .where(eq(conversations.id, input.conversationId));

      return { success: true };
    }),

  archiveConversation: protectedProcedure
    .input(z.object({ conversationId: z.number(), archived: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const { getDb } = await import('../db');
      const { conversations } = await import('../../drizzle/schema');
      const { eq } = await import('drizzle-orm');

      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const conversation = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, input.conversationId))
        .limit(1);

      if (conversation.length === 0) {
        throw new Error('Conversation not found');
      }

      const conv = conversation[0];
      if (conv.buyerId !== ctx.user.id && conv.supplierId !== ctx.user.id) {
        throw new Error('Unauthorized');
      }

      await db
        .update(conversations)
        .set({ isArchived: input.archived })
        .where(eq(conversations.id, input.conversationId));

      return { success: true };
    }),

  getUserUsageStats: protectedProcedure.query(async ({ ctx }) => {
    const { getUserUsageStats } = await import('../messaging-paywall');
    return await getUserUsageStats(ctx.user.id);
  }),

  checkMessageLimit: protectedProcedure
    .input(z.object({ conversationId: z.number() }))
    .query(async ({ input, ctx }) => {
      const { checkMessageLimit } = await import('../messaging-paywall');
      return await checkMessageLimit(ctx.user.id, input.conversationId);
    }),

  checkVideoLimit: protectedProcedure.query(async ({ ctx }) => {
    const { checkVideoLimit } = await import('../messaging-paywall');
    return await checkVideoLimit(ctx.user.id);
  }),

  getRecentSuppliers: protectedProcedure.query(async ({ ctx }) => {
    const { getDb } = await import('../db');
    const { conversations, suppliers } = await import('../../drizzle/schema');
    const { eq, desc } = await import('drizzle-orm');

    const db = await getDb();
    if (!db) return [];

    const recentConvs = await db
      .select({
        supplierId: conversations.supplierId,
        companyName: suppliers.companyName,
        city: suppliers.city,
        state: suppliers.state,
        isPremium: suppliers.isPremium,
        verified: suppliers.verified,
        certifications: suppliers.certifications,
      })
      .from(conversations)
      .innerJoin(suppliers, eq(conversations.supplierId, suppliers.id))
      .where(eq(conversations.buyerId, ctx.user.id))
      .orderBy(desc(conversations.createdAt))
      .limit(5);

    const uniqueSuppliers = Array.from(
      new Map(recentConvs.map((s) => [s.supplierId, { id: s.supplierId, ...s }])).values()
    );

    return uniqueSuppliers;
  }),

  createDirectConversation: protectedProcedure
    .input(z.object({ supplierId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const { getOrCreateConversation } = await import('../messaging-service');
      const { sendInAppNotification } = await import('../notification-service');
      const { getDb } = await import('../db');
      const { suppliers } = await import('../../drizzle/schema');
      const { eq } = await import('drizzle-orm');

      const conversation = await getOrCreateConversation({
        rfqId: null,
        buyerId: ctx.user.id,
        supplierId: input.supplierId,
      });

      const db = await getDb();
      if (db) {
        const supplier = await db.select().from(suppliers).where(eq(suppliers.id, input.supplierId)).limit(1);
        if (supplier.length > 0 && supplier[0].userId) {
          await sendInAppNotification({
            userId: supplier[0].userId,
            type: 'new_message',
            title: 'New Direct Conversation',
            content: `${ctx.user.name} started a conversation with you`,
            relatedId: conversation.id,
          });
        }
      }

      return { conversationId: conversation.id };
    }),

  getNotificationToken: protectedProcedure.query(async ({ ctx }) => {
    const connectionString = process.env.AZURE_WEBPUBSUB_CONNECTION_STRING;
    const hub = process.env.WEBPUBSUB_HUB ?? 'greenchainz-hub';
    // Return null URL when WebPubSub is not configured — client degrades gracefully
    if (!connectionString) {
      return { url: null };
    }
    const { WebPubSubServiceClient } = await import('@azure/web-pubsub');
    const client = new WebPubSubServiceClient(connectionString, hub);
    const tokenResponse = await client.getClientAccessToken({
      userId: `user-${ctx.user.id}`,
      expirationTimeInMinutes: 60,
    });
    // tokenResponse.url is the full wss:// URL with access_token already embedded
    return { url: tokenResponse.url };
  }),

  checkCallLimit: protectedProcedure.query(async ({ ctx }) => {
    const { checkCallLimit } = await import('../calling-service');
    return await checkCallLimit(ctx.user.id);
  }),

  initiateCall: protectedProcedure
    .input(
      z.object({
        conversationId: z.number(),
        receiverId: z.number(),
        callType: z.enum(['voice', 'video']),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { initiateCall } = await import('../calling-service');
      return await initiateCall({
        conversationId: input.conversationId,
        callerId: ctx.user.id,
        receiverId: input.receiverId,
        callType: input.callType,
      });
    }),

  acceptCall: protectedProcedure
    .input(z.object({ callId: z.string() }))
    .mutation(async ({ input }) => {
      const { acceptCall } = await import('../calling-service');
      return await acceptCall(input.callId);
    }),

  rejectCall: protectedProcedure
    .input(z.object({ callId: z.string() }))
    .mutation(async ({ input }) => {
      const { rejectCall } = await import('../calling-service');
      await rejectCall(input.callId);
      return { success: true };
    }),

  endCall: protectedProcedure
    .input(z.object({ callId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { endCall } = await import('../calling-service');
      return await endCall(input.callId, ctx.user.id);
    }),

  /**
   * Returns an ACS token + groupCallId so the client can join the real video call.
   * Only the caller and receiver of the given callId may request a token.
   */
  getCallToken: protectedProcedure
    .input(z.object({ callId: z.string() }))
    .query(async ({ input, ctx }) => {
      const { getCallSession } = await import('../calling-service');
      const { getAcsTokenForUser, getAcsEndpoint } = await import('../acs-service');

      const session = getCallSession(input.callId);
      if (!session) throw new Error('Call session not found or already ended');

      const isParticipant =
        ctx.user.id === session.callerId || ctx.user.id === session.receiverId;
      if (!isParticipant) throw new Error('Not a participant of this call');

      const { token, acsUserId, expiresOn } = await getAcsTokenForUser(ctx.user.id);
      const endpointUrl = getAcsEndpoint();

      return {
        token,
        acsUserId,
        expiresOn,
        groupCallId: session.groupCallId,
        endpointUrl,
        callType: session.callType,
      };
    }),
});
