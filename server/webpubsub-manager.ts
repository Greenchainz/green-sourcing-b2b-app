import { WebPubSubServiceClient } from "@azure/web-pubsub";
import { getDb } from "./db";
import { rfqMessages, rfqThreads } from "../drizzle/schema";
import { eq } from "drizzle-orm";

const hubName = process.env.WEBPUBSUB_HUB || "greenchainzhub";

// Lazy-initialize so the module doesn't throw at startup before secrets are loaded
let _client: WebPubSubServiceClient | null = null;

function getClient(): WebPubSubServiceClient {
  if (!_client) {
    const connectionString = process.env.AZURE_WEBPUBSUB_CONNECTION_STRING;
    if (!connectionString) {
      throw new Error(
        "AZURE_WEBPUBSUB_CONNECTION_STRING is not set — add WEBPUBSUB-CONNECTION-STRING to Key Vault"
      );
    }
    _client = new WebPubSubServiceClient(connectionString, hubName);
  }
  return _client;
}

/**
 * Broadcast notification to a specific user
 */
export async function broadcastNotification(userId: number, notification: any) {
  try {
    await getClient().sendToUser(`user-${userId}`, {
      type: "notification",
      data: notification,
    });
    console.log(`✅ Notification broadcast to user-${userId}`);
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

  const token = await getClient().getClientAccessToken({
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
  const insertedMessage = await db.insert(rfqMessages).values({
    threadId,
    senderId: userId,
    senderType: isBuyer ? "buyer" : "supplier",
    content: message.substring(0, 1000),
    createdAt: now,
    isRead: 0,
  });

  const c = getClient();

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
    messageId: insertedMessage[0].insertId,
    timestamp: now.toISOString(),
  });

  return {
    success: true,
    messageId: insertedMessage[0].insertId,
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

  await getClient().sendToUser(`user-${recipientId}`, {
    type: "typing",
    threadId,
    userId,
    senderType: isBuyer ? "buyer" : "supplier",
  });

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
    .set({ isRead: 1 })
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

  return { success: true };
}
