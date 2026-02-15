/**
 * Voice/Video Calling Service with Tier-based Limits
 * 
 * Tier Limits:
 * - Free: 0 minutes (no calling)
 * - Standard: 30 minutes/month
 * - Premium: Unlimited
 */

import { getDb } from "./db";
import { callHistory, monthlyCallUsage, suppliers, supplierSubscriptions } from "../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";
import { broadcastNotification } from "./webpubsub-manager";

export interface CallSession {
  callId: string;
  conversationId: number;
  callerId: number;
  receiverId: number;
  callType: "voice" | "video";
  startedAt: Date;
  status: "ringing" | "active" | "ended" | "rejected" | "missed";
}

// In-memory store for active calls
const activeCalls = new Map<string, CallSession>();

/**
 * Get supplier tier for a user
 */
export async function getSupplierTier(userId: number): Promise<"free" | "standard" | "premium"> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // First get supplier ID
  const supplier = await db
    .select({ id: suppliers.id })
    .from(suppliers)
    .where(eq(suppliers.userId, userId))
    .limit(1);

  if (supplier.length === 0) return "free";

  // Then get subscription tier
  const subscription = await db
    .select({ tier: supplierSubscriptions.tier })
    .from(supplierSubscriptions)
    .where(eq(supplierSubscriptions.supplierId, supplier[0].id))
    .limit(1);

  if (subscription.length === 0) return "free";
  
  // Map supplier tiers (free/premium) to calling tiers
  // For suppliers: free=0 min, premium=unlimited
  // Standard tier doesn't exist for suppliers, only for buyers
  return subscription[0].tier === "premium" ? "premium" : "free";
}

/**
 * Get monthly call usage for a user
 */
export async function getMonthlyCallUsage(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const currentMonth = new Date().toISOString().slice(0, 7); // "2026-02"

  const usage = await db
    .select({ totalMinutes: monthlyCallUsage.totalMinutes })
    .from(monthlyCallUsage)
    .where(
      and(
        eq(monthlyCallUsage.userId, userId),
        eq(monthlyCallUsage.month, currentMonth)
      )
    )
    .limit(1);

  return usage.length > 0 ? usage[0].totalMinutes : 0;
}

/**
 * Check if user can make a call based on tier limits
 */
export async function checkCallLimit(userId: number): Promise<{
  allowed: boolean;
  tier: string;
  usedMinutes: number;
  limitMinutes: number | null;
  remainingMinutes: number | null;
}> {
  const tier = await getSupplierTier(userId);
  const usedMinutes = await getMonthlyCallUsage(userId);

  const limits = {
    free: 0,
    standard: 30,
    premium: null, // unlimited
  };

  const limitMinutes = limits[tier];
  const allowed = limitMinutes === null || usedMinutes < limitMinutes;
  const remainingMinutes = limitMinutes === null ? null : Math.max(0, limitMinutes - usedMinutes);

  return {
    allowed,
    tier,
    usedMinutes,
    limitMinutes,
    remainingMinutes,
  };
}

/**
 * Initiate a call
 */
export async function initiateCall(params: {
  conversationId: number;
  callerId: number;
  receiverId: number;
  callType: "voice" | "video";
}): Promise<{ callId: string; session: CallSession }> {
  const { conversationId, callerId, receiverId, callType } = params;

  // Check caller's tier limits
  const callerLimit = await checkCallLimit(callerId);
  if (!callerLimit.allowed) {
    throw new Error(
      `Call limit exceeded. You have used ${callerLimit.usedMinutes}/${callerLimit.limitMinutes} minutes this month. Upgrade to Premium for unlimited calling.`
    );
  }

  const callId = `call-${Date.now()}-${Math.random().toString(36).substring(7)}`;

  const session: CallSession = {
    callId,
    conversationId,
    callerId,
    receiverId,
    callType,
    startedAt: new Date(),
    status: "ringing",
  };

  activeCalls.set(callId, session);

  // Save to database
  const db = await getDb();
  if (db) {
    await db.insert(callHistory).values({
      conversationId,
      callerId,
      receiverId,
      callType,
      status: "missed", // Default to missed, will update if accepted
      startTime: session.startedAt,
    });
  }

  // Notify receiver via WebPubSub
  await broadcastNotification(receiverId, {
    type: "call_incoming",
    callId,
    callerId,
    callType,
    conversationId,
  });

  return { callId, session };
}

/**
 * Accept a call
 */
export async function acceptCall(callId: string): Promise<CallSession | null> {
  const session = activeCalls.get(callId);
  if (!session) return null;

  session.status = "active";
  activeCalls.set(callId, session);

  // Update database
  const db = await getDb();
  if (db) {
    await db
      .update(callHistory)
      .set({ status: "completed" })
      .where(
        and(
          eq(callHistory.conversationId, session.conversationId),
          eq(callHistory.callerId, session.callerId),
          eq(callHistory.receiverId, session.receiverId)
        )
      );
  }

  // Notify caller
  await broadcastNotification(session.callerId, {
    type: "call_accepted",
    callId,
    receiverId: session.receiverId,
  });

  return session;
}

/**
 * Reject a call
 */
export async function rejectCall(callId: string): Promise<void> {
  const session = activeCalls.get(callId);
  if (!session) return;

  session.status = "rejected";

  // Update database
  const db = await getDb();
  if (db) {
    await db
      .update(callHistory)
      .set({ status: "rejected" })
      .where(
        and(
          eq(callHistory.conversationId, session.conversationId),
          eq(callHistory.callerId, session.callerId),
          eq(callHistory.receiverId, session.receiverId)
        )
      );
  }

  // Notify caller
  await broadcastNotification(session.callerId, {
    type: "call_rejected",
    callId,
  });

  activeCalls.delete(callId);
}

/**
 * End a call and track usage
 */
export async function endCall(callId: string, userId: number): Promise<{ durationMinutes: number } | null> {
  const session = activeCalls.get(callId);
  if (!session) return null;

  session.status = "ended";
  const endedAt = new Date();

  // Calculate duration
  const durationMs = endedAt.getTime() - session.startedAt.getTime();
  const durationSeconds = Math.ceil(durationMs / 1000);
  const durationMinutes = Math.ceil(durationSeconds / 60);

  // Update database
  const db = await getDb();
  if (db) {
    await db
      .update(callHistory)
      .set({
        status: "completed",
        endTime: endedAt,
        durationSeconds,
      })
      .where(
        and(
          eq(callHistory.conversationId, session.conversationId),
          eq(callHistory.callerId, session.callerId),
          eq(callHistory.receiverId, session.receiverId)
        )
      );

    // Update monthly usage (only for caller)
    if (userId === session.callerId) {
      const currentMonth = new Date().toISOString().slice(0, 7);

      // Check if usage record exists
      const existing = await db
        .select()
        .from(monthlyCallUsage)
        .where(
          and(
            eq(monthlyCallUsage.userId, userId),
            eq(monthlyCallUsage.month, currentMonth)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        // Update existing
        await db
          .update(monthlyCallUsage)
          .set({
            totalMinutes: sql`${monthlyCallUsage.totalMinutes} + ${durationMinutes}`,
          })
          .where(
            and(
              eq(monthlyCallUsage.userId, userId),
              eq(monthlyCallUsage.month, currentMonth)
            )
          );
      } else {
        // Insert new
        await db.insert(monthlyCallUsage).values({
          userId,
          month: currentMonth,
          totalMinutes: durationMinutes,
        });
      }
    }
  }

  // Notify other participant
  const otherUserId = userId === session.callerId ? session.receiverId : session.callerId;
  await broadcastNotification(otherUserId, {
    type: "call_ended",
    callId,
    durationMinutes,
  });

  activeCalls.delete(callId);

  return { durationMinutes };
}

/**
 * Get active call session
 */
export function getCallSession(callId: string): CallSession | null {
  return activeCalls.get(callId) || null;
}
