import { eq, and, gte, sql } from "drizzle-orm";
import { getDb } from "./db";
import { users, messages, conversations, usageTracking } from "../drizzle/schema";

/**
 * Messaging Paywall Service
 * Enforces tier-based limits on messaging and video calling
 */

export type SubscriptionTier = "free" | "standard" | "premium";

export interface MessageLimitResult {
  canSend: boolean;
  reason?: string;
  messagesUsed?: number;
  messagesLimit?: number;
  tier: SubscriptionTier;
}

export interface VideoLimitResult {
  canCall: boolean;
  reason?: string;
  minutesUsed?: number;
  minutesLimit?: number;
  tier: SubscriptionTier;
}

/**
 * Get user's subscription tier from supplier_subscriptions table
 */
async function getUserTier(userId: number): Promise<SubscriptionTier> {
  const db = await getDb();
  if (!db) return "free";

  const user = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  // Buyers always have unlimited access
  if (user[0]?.role === "buyer") {
    return "premium"; // Treat buyers as premium for unlimited access
  }

  // Check supplier subscription
  const { supplierSubscriptions } = await import("../drizzle/schema");
  const subscription = await db
    .select({ tier: supplierSubscriptions.tier })
    .from(supplierSubscriptions)
    .where(
      and(
        eq(supplierSubscriptions.supplierId, userId),
        eq(supplierSubscriptions.status, "active")
      )
    )
    .limit(1);

  if (subscription.length === 0) return "free";

  return subscription[0].tier as SubscriptionTier;
}

/**
 * Check if user can send a message based on their tier
 * Free: 1 message per conversation
 * Standard: 50 messages per month
 * Premium: Unlimited
 */
export async function checkMessageLimit(
  userId: number,
  conversationId: number
): Promise<MessageLimitResult> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const tier = await getUserTier(userId);

  // Premium tier: unlimited
  if (tier === "premium") {
    return { canSend: true, tier };
  }

  // Free tier: 1 message per conversation
  if (tier === "free") {
    const messageCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(messages)
      .where(
        and(
          eq(messages.conversationId, conversationId),
          eq(messages.senderId, userId)
        )
      );

    const used = Number(messageCount[0]?.count) || 0;

    if (used >= 1) {
      return {
        canSend: false,
        reason: "Free tier allows 1 message per conversation. Upgrade to Standard for 50 messages/month.",
        messagesUsed: used,
        messagesLimit: 1,
        tier,
      };
    }

    return { canSend: true, messagesUsed: used, messagesLimit: 1, tier };
  }

  // Standard tier: 50 messages per month
  if (tier === "standard") {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const messageCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(messages)
      .where(
        and(
          eq(messages.senderId, userId),
          gte(messages.createdAt, startOfMonth)
        )
      );

    const used = Number(messageCount[0]?.count) || 0;
    const limit = 50;

    if (used >= limit) {
      return {
        canSend: false,
        reason: `Standard tier limit reached (${limit} messages/month). Upgrade to Premium for unlimited messaging.`,
        messagesUsed: used,
        messagesLimit: limit,
        tier,
      };
    }

    return { canSend: true, messagesUsed: used, messagesLimit: limit, tier };
  }

  return { canSend: false, reason: "Unknown tier", tier };
}

/**
 * Check if user can initiate a video call based on their tier
 * Free: No video calling
 * Standard: 10 hours (600 minutes) per month
 * Premium: 50 hours (3000 minutes) per month
 */
export async function checkVideoLimit(userId: number): Promise<VideoLimitResult> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const tier = await getUserTier(userId);

  // Free tier: no video calling
  if (tier === "free") {
    return {
      canCall: false,
      reason: "Video calling not available on Free tier. Upgrade to Standard for 10 hours/month.",
      minutesUsed: 0,
      minutesLimit: 0,
      tier,
    };
  }

  // Premium tier: 50 hours per month
  const limit = tier === "premium" ? 3000 : 600; // 3000 min = 50hr, 600 min = 10hr

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const usage = await db
    .select({ totalMinutes: sql<number>`COALESCE(SUM(${usageTracking.videoMinutesUsed}), 0)` })
    .from(usageTracking)
    .where(
      and(
        eq(usageTracking.userId, userId),
        gte(usageTracking.createdAt, startOfMonth)
      )
    );

  const used = Number(usage[0]?.totalMinutes) || 0;

  if (used >= limit) {
    return {
      canCall: false,
      reason: `${tier === "standard" ? "Standard" : "Premium"} tier video limit reached (${limit / 60} hours/month). ${tier === "standard" ? "Upgrade to Premium for 50 hours/month." : "Contact support for additional hours."}`,
      minutesUsed: used,
      minutesLimit: limit,
      tier,
    };
  }

  return { canCall: true, minutesUsed: used, minutesLimit: limit, tier };
}

/**
 * Track video call usage
 */
export async function trackVideoUsage(userId: number, durationMinutes: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(usageTracking).values({
    userId,
    dimension: "video_call",
    quantity: 1,
    videoMinutesUsed: durationMinutes,
  });
}

/**
 * Get user's current usage stats
 */
export async function getUserUsageStats(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const tier = await getUserTier(userId);

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  // Get message count for current month
  const messageCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(messages)
    .where(
      and(
        eq(messages.senderId, userId),
        gte(messages.createdAt, startOfMonth)
      )
    );

  // Get video minutes for current month
  const videoUsage = await db
    .select({ totalMinutes: sql<number>`COALESCE(SUM(${usageTracking.videoMinutesUsed}), 0)` })
    .from(usageTracking)
    .where(
      and(
        eq(usageTracking.userId, userId),
        gte(usageTracking.createdAt, startOfMonth)
      )
    );

  const messagesUsed = Number(messageCount[0]?.count) || 0;
  const videoMinutesUsed = Number(videoUsage[0]?.totalMinutes) || 0;

  return {
    tier,
    messages: {
      used: messagesUsed,
      limit: tier === "free" ? null : tier === "standard" ? 50 : null, // null = unlimited
    },
    video: {
      minutesUsed: videoMinutesUsed,
      minutesLimit: tier === "free" ? 0 : tier === "standard" ? 600 : 3000,
      hoursUsed: Math.round((videoMinutesUsed / 60) * 10) / 10,
      hoursLimit: tier === "free" ? 0 : tier === "standard" ? 10 : 50,
    },
  };
}
