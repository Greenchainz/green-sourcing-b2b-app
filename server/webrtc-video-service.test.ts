import { describe, it, expect, beforeEach } from "vitest";
import { getDb } from "./db";
import { users, videoCalls } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import {
  initiateVideoCall,
  endVideoCall,
  getActiveCall,
  sendSignalingData,
} from "./webrtc-video-service";

describe("WebRTC Video Service", () => {
  let testCallerId: number;
  let testCalleeId: number;
  let testCallId: string;

  beforeEach(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Clean up test data
    await db.delete(videoCalls);
    await db.delete(users);

    // Create test users
    const callerResult = await db.insert(users).values({
      openId: "test-caller-123",
      email: "caller@example.com",
      name: "Test Caller",
      loginMethod: "microsoft",
      role: "user",
    });

    const calleeResult = await db.insert(users).values({
      openId: "test-callee-456",
      email: "callee@example.com",
      name: "Test Callee",
      loginMethod: "microsoft",
      role: "user",
    });

    testCallerId = Number(callerResult[0].insertId);
    testCalleeId = Number(calleeResult[0].insertId);
  });

  describe("initiateVideoCall", () => {
    it("should create a new video call", async () => {
      const result = await initiateVideoCall({
        callerId: testCallerId,
        calleeId: testCalleeId,
        conversationId: 1,
      });

      expect(result.callId).toBeDefined();
      expect(result.status).toBe("initiated");
      
      testCallId = result.callId;
    });

    it("should generate unique call IDs", async () => {
      const call1 = await initiateVideoCall({
        callerId: testCallerId,
        calleeId: testCalleeId,
        conversationId: 1,
      });

      const call2 = await initiateVideoCall({
        callerId: testCallerId,
        calleeId: testCalleeId,
        conversationId: 2,
      });

      expect(call1.callId).not.toBe(call2.callId);
    });

    it("should store call in database", async () => {
      const result = await initiateVideoCall({
        callerId: testCallerId,
        calleeId: testCalleeId,
        conversationId: 1,
      });

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const calls = await db
        .select()
        .from(videoCalls)
        .where(eq(videoCalls.callId, result.callId));

      expect(calls).toHaveLength(1);
      expect(calls[0].callerId).toBe(testCallerId);
      expect(calls[0].calleeId).toBe(testCalleeId);
    });
  });

  describe("endVideoCall", () => {
    beforeEach(async () => {
      const result = await initiateVideoCall({
        callerId: testCallerId,
        calleeId: testCalleeId,
        conversationId: 1,
      });
      testCallId = result.callId;
    });

    it("should end an active call", async () => {
      const result = await endVideoCall({
        callId: testCallId,
        userId: testCallerId,
      });

      expect(result.success).toBe(true);
      expect(result.durationSeconds).toBeGreaterThanOrEqual(0);
    });

    it("should calculate call duration", async () => {
      // Wait 2 seconds
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const result = await endVideoCall({
        callId: testCallId,
        userId: testCallerId,
      });

      expect(result.durationSeconds).toBeGreaterThanOrEqual(2);
      expect(result.durationSeconds).toBeLessThan(5);
    });

    it("should update call status to ended", async () => {
      await endVideoCall({
        callId: testCallId,
        userId: testCallerId,
      });

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const calls = await db
        .select()
        .from(videoCalls)
        .where(eq(videoCalls.callId, testCallId));

      expect(calls[0].status).toBe("ended");
      expect(calls[0].endedAt).not.toBeNull();
    });

    it("should return error for non-existent call", async () => {
      const result = await endVideoCall({
        callId: "non-existent-call",
        userId: testCallerId,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("getActiveCall", () => {
    beforeEach(async () => {
      const result = await initiateVideoCall({
        callerId: testCallerId,
        calleeId: testCalleeId,
        conversationId: 1,
      });
      testCallId = result.callId;
    });

    it("should retrieve active call by call ID", async () => {
      const call = await getActiveCall(testCallId);

      expect(call).not.toBeNull();
      expect(call?.callId).toBe(testCallId);
      expect(call?.status).toBe("initiated");
    });

    it("should return null for ended call", async () => {
      await endVideoCall({
        callId: testCallId,
        userId: testCallerId,
      });

      const call = await getActiveCall(testCallId);
      expect(call).toBeNull();
    });

    it("should return null for non-existent call", async () => {
      const call = await getActiveCall("non-existent-call");
      expect(call).toBeNull();
    });
  });

  describe("sendSignalingData", () => {
    beforeEach(async () => {
      const result = await initiateVideoCall({
        callerId: testCallerId,
        calleeId: testCalleeId,
        conversationId: 1,
      });
      testCallId = result.callId;
    });

    it("should send offer signaling data", async () => {
      const result = await sendSignalingData({
        callId: testCallId,
        senderId: testCallerId,
        recipientId: testCalleeId,
        type: "offer",
        data: { sdp: "test-sdp-offer" },
      });

      expect(result.success).toBe(true);
    });

    it("should send answer signaling data", async () => {
      const result = await sendSignalingData({
        callId: testCallId,
        senderId: testCalleeId,
        recipientId: testCallerId,
        type: "answer",
        data: { sdp: "test-sdp-answer" },
      });

      expect(result.success).toBe(true);
    });

    it("should send ICE candidate", async () => {
      const result = await sendSignalingData({
        callId: testCallId,
        senderId: testCallerId,
        recipientId: testCalleeId,
        type: "ice-candidate",
        data: {
          candidate: "test-candidate",
          sdpMid: "0",
          sdpMLineIndex: 0,
        },
      });

      expect(result.success).toBe(true);
    });

    it("should reject signaling for non-existent call", async () => {
      await expect(
        sendSignalingData({
          callId: "non-existent-call",
          senderId: testCallerId,
          recipientId: testCalleeId,
          type: "offer",
          data: { sdp: "test-sdp" },
        })
      ).rejects.toThrow();
    });
  });
});
