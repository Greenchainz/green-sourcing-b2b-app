/**
 * Mobile messages REST API — mirrors the tRPC messaging router for
 * greenchainz-mobile fetch() consumers.
 */
import express from 'express';
import { requireEasyAuthUser } from '../_core/request-auth';

function createErrorResponse(
  message: string,
  requestId: string,
  detail?: string
): Record<string, unknown> {
  return {
    error: message,
    request_id: requestId,
    ...(detail ? { detail } : {}),
  };
}

export function registerMobileMessagesRoutes(app: express.Express): void {
  const MOBILE_ORIGIN = process.env.NEXT_PUBLIC_MOBILE_ORIGIN || '';

  function setMessagingCorsHeaders(res: express.Response) {
    if (MOBILE_ORIGIN) {
      res.setHeader('Access-Control-Allow-Origin', MOBILE_ORIGIN);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }
  }

  app.options('/api/messages/{*path}', (_req, res) => {
    setMessagingCorsHeaders(res);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.sendStatus(204);
  });

  app.get('/api/messages/threads', async (req, res) => {
    setMessagingCorsHeaders(res);
    try {
      const user = await requireEasyAuthUser(req);
      if (!user) return res.status(401).json(createErrorResponse('Unauthorized', (req as any).id));
      const { getThreadsForMobile } = await import('../messaging-service');
      const threads = await getThreadsForMobile(user.id);
      res.json(threads);
    } catch (err) {
      console.error('[messages] GET /threads error:', err);
      res.status(500).json(createErrorResponse('Failed to fetch threads', (req as any).id, err instanceof Error ? err.message : String(err)));
    }
  });

  app.get('/api/messages/unread-count', async (req, res) => {
    setMessagingCorsHeaders(res);
    try {
      const user = await requireEasyAuthUser(req);
      if (!user) return res.status(401).json(createErrorResponse('Unauthorized', (req as any).id));
      const { getUnreadMessageCount } = await import('../messaging-service');
      const count = await getUnreadMessageCount(user.id);
      res.json({ count });
    } catch (err) {
      console.error('[messages] GET /unread-count error:', err);
      res.status(500).json(createErrorResponse('Failed to fetch unread count', (req as any).id, err instanceof Error ? err.message : String(err)));
    }
  });

  app.get('/api/messages/threads/:threadId', async (req, res) => {
    setMessagingCorsHeaders(res);
    try {
      const user = await requireEasyAuthUser(req);
      if (!user) return res.status(401).json(createErrorResponse('Unauthorized', (req as any).id));
      const threadId = parseInt(req.params.threadId);
      if (isNaN(threadId)) return res.status(400).json(createErrorResponse('Invalid thread ID', (req as any).id));
      const { getConversationMessages } = await import('../messaging-service');
      const msgs = await getConversationMessages(threadId);
      const mobileMsgs = msgs.map((m: any) => ({
        id: String(m.id),
        content: m.content as string,
        senderId: (m.senderEmail as string | null) ?? String(m.senderId),
        createdAt:
          m.createdAt instanceof Date
            ? m.createdAt.toISOString()
            : String(m.createdAt),
      }));
      res.json(mobileMsgs);
    } catch (err) {
      console.error('[messages] GET /threads/:id error:', err);
      res.status(500).json(createErrorResponse('Failed to fetch messages', (req as any).id, err instanceof Error ? err.message : String(err)));
    }
  });

  app.post('/api/messages/threads', async (req, res) => {
    setMessagingCorsHeaders(res);
    try {
      const user = await requireEasyAuthUser(req);
      if (!user) return res.status(401).json(createErrorResponse('Unauthorized', (req as any).id));
      const { rfqId, supplierId, buyerId } = req.body;
      if (!supplierId || !buyerId) {
        return res.status(400).json(createErrorResponse('supplierId and buyerId required', (req as any).id));
      }
      const { getOrCreateConversation } = await import('../messaging-service');
      const conv = await getOrCreateConversation({
        rfqId: rfqId ?? null,
        buyerId: Number(buyerId),
        supplierId: Number(supplierId),
      });
      res.json(conv);
    } catch (err) {
      console.error('[messages] POST /threads error:', err);
      res.status(500).json(createErrorResponse('Failed to create thread', (req as any).id, err instanceof Error ? err.message : String(err)));
    }
  });

  app.post('/api/messages/threads/:threadId/send', async (req, res) => {
    setMessagingCorsHeaders(res);
    try {
      const user = await requireEasyAuthUser(req);
      if (!user) return res.status(401).json(createErrorResponse('Unauthorized', (req as any).id));
      const threadId = parseInt(req.params.threadId);
      if (isNaN(threadId)) return res.status(400).json(createErrorResponse('Invalid thread ID', (req as any).id));
      const { content } = req.body;
      if (!content || typeof content !== 'string') {
        return res.status(400).json(createErrorResponse('content (string) required', (req as any).id));
      }
      const { sendMessage } = await import('../messaging-service');
      const msg = await sendMessage({ conversationId: threadId, senderId: user.id, content });
      res.json(msg);
    } catch (err) {
      console.error('[messages] POST /threads/:id/send error:', err);
      res.status(500).json(createErrorResponse('Failed to send message', (req as any).id, err instanceof Error ? err.message : String(err)));
    }
  });

  app.post('/api/messages/threads/:threadId/read', async (req, res) => {
    setMessagingCorsHeaders(res);
    try {
      const user = await requireEasyAuthUser(req);
      if (!user) return res.status(401).json(createErrorResponse('Unauthorized', (req as any).id));
      const threadId = parseInt(req.params.threadId);
      if (isNaN(threadId)) return res.status(400).json(createErrorResponse('Invalid thread ID', (req as any).id));
      const { markMessagesAsRead } = await import('../messaging-service');
      await markMessagesAsRead({ conversationId: threadId, userId: user.id });
      res.json({ ok: true });
    } catch (err) {
      console.error('[messages] POST /threads/:id/read error:', err);
      res.status(500).json(createErrorResponse('Failed to mark as read', (req as any).id, err instanceof Error ? err.message : String(err)));
    }
  });
}
