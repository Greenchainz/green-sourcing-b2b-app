import { WebPubSubServiceClient } from "@azure/web-pubsub";
import { getDb } from "./db";
import { rfqMessages, rfqThreads } from "../drizzle/schema";
import { eq } from "drizzle-orm";

const hubName = process.env.WEBPUBSUB_HUB ?? "greenchainz-hub";

// Lazy-initialize so the module doesn't throw at startup before secrets are loaded.
// Returns null when AZURE_WEBPUBSUB_CONNECTION_STRING is not configured — callers
// degrade gracefully (messages still persist to DB; real-time delivery is skipped).
let _client: WebPubSubServiceClient | null = null;
let _clientInitialized = false;

function getClient(): WebPubSubServiceClient | null {
  if (!_clientInitialized) {
    _clientInitialized = true;
    const connectionString = process.env.AZURE_WEBPUBSUB_CONNECTION_STRING;
    if (connectionString) {
      _client = new WebPubSubServiceClient(connectionString, hubName);
    } else {
      console.warn(
        "[WebPubSub] AZURE_WEBPUBSUB_CONNECTION_STRING not set — real-time notifications disabled"
      );
    }
  }
  return _client;
}

/**
 * Broadcast notification to a specific user
 */
export async function broadcastNotification(userId: number, notification: Record<string, unknown>) {
  const c = getClient();
  if (!c) return; // WebPubSub not configured — degrade silently
  try {
    // Send the notification payload directly — no outer wrapper.
    // Clients parse event.data and check notification.type at the top level.
    await c.sendToUser(`user-${userId}`, notification);
    console.log(`✅ Notification broadcast to user-${userId}: ${notification.type}`);
  } catch (error) {
    console.error("❌ Failed to broadcast notification:", error);
  }
}

/**
 * Get access token for WebSocket client connection
 */
export async function getWebSocketAccessToken(userId: number, threadId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const thread = await db
    .select()
    .from(rfqThreads)
    .where(eq(rfqThreads.id, threadId))
    .limit(1);

  if (!thread || thread.length === 0) {
    throw new Error("Thread not found");
  }

  const threadData = thread[0];
  if (threadData.buyerId !== userId && threadData.supplierId !== userId) {
    throw new Error("User does not have access to this thread");
  }

  const c = getClient();
  if (!c) throw new Error("Real-time messaging is not configured on this server.");

  const token = await c.getClientAccessToken({
    userId: `user-${userId}`,
    expirationTimeInMinutes: 60,
    roles: [`thread-${threadId}`],
  });

  return {
    token: token.token,
    url: token.baseUrl,
    userId: `user-${userId}`,
    threadId,
  };
}

/**
 * Send message to a specific RFQ thread
 */
export async function sendMessageToThread(
  threadId: number,
  userId: number,
  message: string,
  isBuyer: boolean
) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const thread = await db
    .select()
    .from(rfqThreads)
    .where(eq(rfqThreads.id, threadId))
    .limit(1);

  if (!thread || thread.length === 0) {
    throw new Error("Thread not found");
  }

  const threadData = thread[0];
  const isAuthorized =
    (isBuyer && threadData.buyerId === userId) ||
    (!isBuyer && threadData.supplierId === userId);

  if (!isAuthorized) {
    throw new Error("User not authorized to send messages to this thread");
  }

  const now = new Date();
  const [insertedMessage] = await db.insert(rfqMessages).values({
    threadId,
    senderId: userId,
    senderType: isBuyer ? "buyer" : "supplier",
    content: message.substring(0, 1000),
    createdAt: now,
    isRead: false,
  }).returning({ id: rfqMessages.id });

  const c = getClient();

  if (c) {
  // Deliver to recipient
  await c.sendToUser(`user-${isBuyer ? threadData.supplierId : threadData.buyerId}`, {
    type: "message",
    threadId,
    senderId: userId,
    senderType: isBuyer ? "buyer" : "supplier",
    content: message,
    timestamp: now.toISOString(),
  });

  // Confirm to sender
  await c.sendToUser(`user-${userId}`, {
    type: "message_sent",
    threadId,
    messageId: insertedMessage?.id,
    timestamp: now.toISOString(),
  });
  } // end if (c)

  return {
    success: true,
    messageId: insertedMessage?.id,
    timestamp: now,
  };
}

/**
 * Broadcast typing indicator to thread
 */
export async function broadcastTypingIndicator(
  threadId: number,
  userId: number,
  isBuyer: boolean
) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const thread = await db
    .select()
    .from(rfqThreads)
    .where(eq(rfqThreads.id, threadId))
    .limit(1);

  if (!thread || thread.length === 0) {
    throw new Error("Thread not found");
  }

  const threadData = thread[0];
  const recipientId = isBuyer ? threadData.supplierId : threadData.buyerId;

  const c = getClient();
  if (c) {
    await c.sendToUser(`user-${recipientId}`, {
      type: "typing",
      threadId,
      userId,
      senderType: isBuyer ? "buyer" : "supplier",
    });
  }

  return { success: true };
}

/**
 * Mark message as read
 */
export async function markMessageAsRead(messageId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  await db
    .update(rfqMessages)
    .set({ isRead: true })
    .where(eq(rfqMessages.id, messageId));

  return { success: true };
}

/**
 * Get message history for a thread
 */
export async function getThreadMessages(
  threadId: number,
  limit: number = 50,
  offset: number = 0
) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const messages = await db
    .select()
    .from(rfqMessages)
    .where(eq(rfqMessages.threadId, threadId))
    .orderBy(rfqMessages.createdAt)
    .limit(limit)
    .offset(offset);

  return messages;
}

/**
 * Close a thread (no more messages allowed)
 */
export async function closeThread(threadId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  await db
    .update(rfqThreads)
    .set({ status: "closed" })
    .where(eq(rfqThreads.id, threadId));

  const thread = await db
    .select()
    .from(rfqThreads)
    .where(eq(rfqThreads.id, threadId))
    .limit(1);

  if (thread && thread.length > 0) {
    const c = getClient();
    if (c) {
      const threadData = thread[0];
      await c.sendToUser(`user-${threadData.buyerId}`, {
        type: "thread_closed",
        threadId,
        reason: "RFQ has been finalized",
      });
      await c.sendToUser(`user-${threadData.supplierId}`, {
        type: "thread_closed",
        threadId,
        reason: "RFQ has been finalized",
      });
    }
  }

  return { success: true };
}
