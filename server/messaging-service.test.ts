import { describe, it, expect } from "vitest";
import {
  getOrCreateConversation,
  getUserConversations,
  getConversationMessages,
  sendMessage,
  markMessagesAsRead,
  getUnreadMessageCount,
} from "./messaging-service";
import { getDb } from "./db";
import { users, rfqs } from "../drizzle/schema";

describe("Messaging Service", () => {
  it("should create conversation, send messages, and mark as read", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Create test users
    const timestamp = Date.now();
    const buyerResult = await db.insert(users).values({
      openId: `test-buyer-openid-${timestamp}`,
      name: "Test Buyer",
      email: `test-buyer-${timestamp}@test.com`,
      role: "buyer",
    });
    // Drizzle returns [ResultSetHeader, ...] for MySQL
    const testBuyerId = Number(buyerResult[0].insertId);

    const supplierResult = await db.insert(users).values({
      openId: `test-supplier-openid-${timestamp}`,
      name: "Test Supplier",
      email: `test-supplier-${timestamp}@test.com`,
      role: "supplier",
    });
    const testSupplierId = Number(supplierResult[0].insertId);

    // Create test RFQ
    const rfqResult = await db.insert(rfqs).values({
      projectName: "Test RFQ for Messaging",
      userId: testBuyerId,
      status: "submitted",
    });
    const testRfqId = Number(rfqResult[0].insertId);

    // Debug: Log IDs to verify they're valid
    console.log('Test IDs:', { testRfqId, testBuyerId, testSupplierId });
    expect(testRfqId).toBeGreaterThan(0);
    expect(testBuyerId).toBeGreaterThan(0);
    expect(testSupplierId).toBeGreaterThan(0);

    // Test 1: Create a new conversation
    const conversation = await getOrCreateConversation({
      rfqId: testRfqId,
      buyerId: testBuyerId,
      supplierId: testSupplierId,
    });

    expect(conversation).toBeDefined();
    expect(conversation.rfqId).toBe(testRfqId);
    expect(conversation.buyerId).toBe(testBuyerId);
    expect(conversation.supplierId).toBe(testSupplierId);

    const testConversationId = conversation.id;

    // Test 2: Return existing conversation instead of creating duplicate
    const existingConversation = await getOrCreateConversation({
      rfqId: testRfqId,
      buyerId: testBuyerId,
      supplierId: testSupplierId,
    });

    expect(existingConversation.id).toBe(testConversationId);

    // Test 3: Send a message in a conversation
    const message = await sendMessage({
      conversationId: testConversationId,
      senderId: testBuyerId,
      content: "Hello, I have a question about this RFQ",
    });

    expect(message).toBeDefined();
    expect(message.conversationId).toBe(testConversationId);
    expect(message.senderId).toBe(testBuyerId);
    expect(message.content).toBe("Hello, I have a question about this RFQ");
    expect(message.isRead).toBe(0);

    // Test 4: Retrieve messages for a conversation
    const conversationMessages = await getConversationMessages(testConversationId);

    expect(conversationMessages).toBeDefined();
    expect(conversationMessages.length).toBeGreaterThan(0);
    expect(conversationMessages[0].content).toBe("Hello, I have a question about this RFQ");
    expect(conversationMessages[0].senderName).toBe("Test Buyer");

    // Test 5: Get conversations for a user
    const buyerConversations = await getUserConversations(testBuyerId);

    expect(buyerConversations).toBeDefined();
    expect(buyerConversations.length).toBeGreaterThan(0);
    expect(buyerConversations[0].rfqTitle).toBe("Test RFQ for Messaging");
    expect(buyerConversations[0].otherPartyName).toBe("Test Supplier");

    // Test 6: Count unread messages correctly
    await sendMessage({
      conversationId: testConversationId,
      senderId: testSupplierId,
      content: "Sure, what would you like to know?",
    });

    const unreadCount = await getUnreadMessageCount(testBuyerId);
    expect(unreadCount).toBeGreaterThan(0);

    // Test 7: Mark messages as read
    await markMessagesAsRead({
      conversationId: testConversationId,
      userId: testBuyerId,
    });

    const updatedMessages = await getConversationMessages(testConversationId);
    const buyerMessages = updatedMessages.filter((m: any) => m.senderId === testBuyerId);
    
    // Buyer's own messages should be marked as read
    buyerMessages.forEach((m: any) => {
      expect(m.isRead).toBe(1);
    });
  });
});
