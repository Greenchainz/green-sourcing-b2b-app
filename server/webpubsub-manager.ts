import { WebPubSubServiceClient } from "@azure/web-pubsub";
import { getDb } from "./db";
import { rfqMessages, rfqThreads } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

const connectionString = process.env.AZURE_WEBPUBSUB_CONNECTION_STRING;
const hubName = process.env.WEBPUBSUB_HUB || "greenchainz-hub";

if (!connectionString) {
  throw new Error("AZURE_WEBPUBSUB_CONNECTION_STRING is not set");
}

const client = new WebPubSubServiceClient(connectionString, hubName);

/**
 * Get access token for WebSocket client connection
 * @param userId - User ID connecting to the chat
 * @param threadId - RFQ thread ID
 * @returns Access token and connection URL
 */
export async function getWebSocketAccessToken(userId: number, threadId: number) {
  try {
    // Verify user has access to this thread
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

    // Generate access token
    const token = await client.getClientAccessToken({
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
  } catch (error) {
    console.error("Error getting WebSocket access token:", error);
    throw error;
  }
}

/**
 * Send message to a specific RFQ thread
 * @param threadId - RFQ thread ID
 * @param userId - Sender user ID
 * @param message - Message content
 * @param isBuyer - Whether sender is buyer or supplier
 */
export async function sendMessageToThread(
  threadId: number,
  userId: number,
  message: string,
  isBuyer: boolean
) {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");

    // Verify thread exists and user has access
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

    // Store message in database
    const now = new Date();
    const insertedMessage = await db.insert(rfqMessages).values({
      threadId,
      senderId: userId,
      senderType: isBuyer ? "buyer" : "supplier",
      content: message.substring(0, 1000), // Enforce 1000 char limit
      createdAt: now,
      isRead: 0,
    });

    // Broadcast message to thread via Web PubSub
    await client.sendToUser(`user-${isBuyer ? threadData.supplierId : threadData.buyerId}`, {
      type: "message",
      threadId,
      senderId: userId,
      senderType: isBuyer ? "buyer" : "supplier",
      content: message,
      timestamp: now.toISOString(),
    });

    // Broadcast to sender (confirmation)
    await client.sendToUser(`user-${userId}`, {
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
  } catch (error) {
    console.error("Error sending message to thread:", error);
    throw error;
  }
}

/**
 * Broadcast typing indicator to thread
 * @param threadId - RFQ thread ID
 * @param userId - User who is typing
 * @param isBuyer - Whether user is buyer or supplier
 */
export async function broadcastTypingIndicator(
  threadId: number,
  userId: number,
  isBuyer: boolean
) {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");

    // Verify thread exists
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

    // Send typing indicator to recipient
    await client.sendToUser(`user-${recipientId}`, {
      type: "typing",
      threadId,
      userId,
      senderType: isBuyer ? "buyer" : "supplier",
    });

    return { success: true };
  } catch (error) {
    console.error("Error broadcasting typing indicator:", error);
    throw error;
  }
}

/**
 * Mark message as read
 * @param messageId - Message ID
 */
export async function markMessageAsRead(messageId: number) {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");

    await db
      .update(rfqMessages)
      .set({ isRead: 1 })
      .where(eq(rfqMessages.id, messageId));

    return { success: true };
  } catch (error) {
    console.error("Error marking message as read:", error);
    throw error;
  }
}

/**
 * Get message history for a thread
 * @param threadId - RFQ thread ID
 * @param limit - Number of messages to retrieve
 * @param offset - Offset for pagination
 */
export async function getThreadMessages(
  threadId: number,
  limit: number = 50,
  offset: number = 0
) {
  try {
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
  } catch (error) {
    console.error("Error getting thread messages:", error);
    throw error;
  }
}

/**
 * Close a thread (no more messages allowed)
 * @param threadId - RFQ thread ID
 */
export async function closeThread(threadId: number) {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");

    await db
      .update(rfqThreads)
      .set({ status: "closed" })
      .where(eq(rfqThreads.id, threadId));

    // Notify both parties that thread is closed
    const thread = await db
      .select()
      .from(rfqThreads)
      .where(eq(rfqThreads.id, threadId))
      .limit(1);

    if (thread && thread.length > 0) {
      const threadData = thread[0];
      await client.sendToUser(`user-${threadData.buyerId}`, {
        type: "thread_closed",
        threadId,
        reason: "RFQ has been finalized",
      });

      await client.sendToUser(`user-${threadData.supplierId}`, {
        type: "thread_closed",
        threadId,
        reason: "RFQ has been finalized",
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Error closing thread:", error);
    throw error;
  }
}
