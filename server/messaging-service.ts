import { eq, and, desc, or, isNull, ne } from "drizzle-orm";
import { getDb } from "./db";
import { conversations, messages, users, rfqs } from "../drizzle/schema";
import { broadcastNotification } from "./webpubsub-manager";

/**
 * Get or create a conversation between buyer and supplier
 * rfqId is optional - null for direct company messaging
 */
export async function getOrCreateConversation(params: {
  rfqId?: number | null;
  buyerId: number;
  supplierId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { rfqId, buyerId, supplierId } = params;

  // Check if conversation already exists
  const whereConditions = [
    eq(conversations.buyerId, buyerId),
    eq(conversations.supplierId, supplierId),
  ];
  
  // Add rfqId condition only if provided
  if (rfqId !== undefined && rfqId !== null) {
    whereConditions.push(eq(conversations.rfqId, rfqId));
  } else {
    whereConditions.push(isNull(conversations.rfqId));
  }

  const existing = await db
    .select()
    .from(conversations)
    .where(and(...whereConditions))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  // Create new conversation
  const result = await db.insert(conversations).values({
    rfqId,
    buyerId,
    supplierId,
  });

  const newConversation = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, Number(result[0].insertId)))
    .limit(1);

  return newConversation[0];
}

/**
 * Get all conversations for a user
 */
export async function getUserConversations(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const userConversations = await db
    .select({
      id: conversations.id,
      rfqId: conversations.rfqId,
      buyerId: conversations.buyerId,
      supplierId: conversations.supplierId,
      agentMode: conversations.agentMode,
      handoffStatus: conversations.handoffStatus,
      agentMessageCount: conversations.agentMessageCount,
      lastMessageAt: conversations.lastMessageAt,
      lastMessage: conversations.lastMessage,
      isPinned: conversations.isPinned,
      isArchived: conversations.isArchived,
      label: conversations.label,
      labelColor: conversations.labelColor,
      createdAt: conversations.createdAt,
      // Join RFQ details
      rfqTitle: rfqs.projectName,
      // Join other party's user details
      otherPartyId: users.id,
      otherPartyName: users.name,
      otherPartyEmail: users.email,
    })
    .from(conversations)
    .leftJoin(rfqs, eq(conversations.rfqId, rfqs.id))
    .leftJoin(
      users,
      or(
        eq(users.id, conversations.buyerId),
        eq(users.id, conversations.supplierId)
      )
    )
    .where(
      or(
        eq(conversations.buyerId, userId),
        eq(conversations.supplierId, userId)
      )
    )
    .orderBy(desc(conversations.lastMessageAt));

  // Filter to get only the other party (not the current user)
  return userConversations.filter((conv: any) => conv.otherPartyId !== userId);
}

/**
 * Get messages for a conversation
 */
export async function getConversationMessages(conversationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const conversationMessages = await db
    .select({
      id: messages.id,
      conversationId: messages.conversationId,
      senderId: messages.senderId,
      senderType: messages.senderType,
      agentType: messages.agentType,
      content: messages.content,
      isRead: messages.isRead,
      readAt: messages.readAt,
      attachmentUrl: messages.attachmentUrl,
      attachmentType: messages.attachmentType,
      attachmentName: messages.attachmentName,
      createdAt: messages.createdAt,
      senderName: users.name,
      senderEmail: users.email,
    })
    .from(messages)
    .leftJoin(users, eq(messages.senderId, users.id))
    .where(eq(messages.conversationId, conversationId))
    .orderBy(messages.createdAt);

  return conversationMessages;
}

/**
 * Send a message in a conversation
 */
export async function sendMessage(params: {
  conversationId: number;
  senderId: number;
  content: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { conversationId, senderId, content } = params;

  // Insert message
  const result = await db.insert(messages).values({
    conversationId,
    senderId,
    content,
  });

  // Update conversation lastMessageAt and lastMessage preview
  const messagePreview = content.length > 50 ? content.substring(0, 50) + "..." : content;
  await db
    .update(conversations)
    .set({ 
      lastMessageAt: new Date(),
      lastMessage: messagePreview,
    })
    .where(eq(conversations.id, conversationId));

  // Get the new message with sender details
  const newMessage = await db
    .select({
      id: messages.id,
      conversationId: messages.conversationId,
      senderId: messages.senderId,
      content: messages.content,
      isRead: messages.isRead,
      createdAt: messages.createdAt,
      senderName: users.name,
      senderEmail: users.email,
    })
    .from(messages)
    .leftJoin(users, eq(messages.senderId, users.id))
    .where(eq(messages.id, Number(result[0].insertId)))
    .limit(1);

  // Get conversation details to find recipient
  const conversation = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .limit(1);

  if (conversation.length > 0 && newMessage.length > 0) {
    const conv = conversation[0];
    const recipientId = conv.buyerId === senderId ? conv.supplierId : conv.buyerId;

    // Broadcast message to recipient via WebPubSub
    await broadcastNotification(recipientId, {
      id: newMessage[0].id,
      title: `New message from ${newMessage[0].senderName}`,
      content: newMessage[0].content,
      type: "message",
      createdAt: newMessage[0].createdAt.toISOString(),
    });

    // Send email notification to recipient
    const [recipientInfo] = await db
      .select({ email: users.email, name: users.name })
      .from(users)
      .where(eq(users.id, recipientId))
      .execute();

    if (recipientInfo && recipientInfo.email) {
      const { sendNewMessageEmail } = await import("./email-service");
      await sendNewMessageEmail({
        recipientEmail: recipientInfo.email,
        recipientName: recipientInfo.name || "User",
        senderName: newMessage[0].senderName || "Someone",
        messagePreview: content.length > 100 ? content.substring(0, 100) + "..." : content,
        conversationId,
      });
    }
  }

  return newMessage[0];
}

/**
 * Mark messages as read
 */
export async function markMessagesAsRead(params: {
  conversationId: number;
  userId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { conversationId, userId } = params;

  await db
    .update(messages)
    .set({ 
      isRead: 1,
      readAt: new Date(),
    })
    .where(
      and(
        eq(messages.conversationId, conversationId),
        ne(messages.senderId, userId), // Mark messages NOT sent by current user
        eq(messages.isRead, 0), // Only mark unread messages
      )
    );

  return true;
}

/**
 * Get unread message count for a user
 */
export async function getUnreadMessageCount(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get all conversations for the user
  const userConversations = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(
      or(
        eq(conversations.buyerId, userId),
        eq(conversations.supplierId, userId)
      )
    );

  if (userConversations.length === 0) {
    return 0;
  }

  const conversationIds = userConversations.map((c: any) => c.id);

  // Count unread messages in those conversations (sent by others, not by the user)
  const unreadMessages = await db
    .select()
    .from(messages)
    .where(
      and(
        eq(messages.isRead, 0),
        // Message is in one of the user's conversations
        or(...conversationIds.map((id: number) => eq(messages.conversationId, id)))
      )
    );

  // Filter out messages sent by the user themselves
  const unreadFromOthers = unreadMessages.filter((m: any) => m.senderId !== userId);

  return unreadFromOthers.length;
}
