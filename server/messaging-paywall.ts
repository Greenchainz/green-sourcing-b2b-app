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
 * Get user's subscription tier from Microsoft subscriptions table
 */
async function getUserTier(userId: number): Promise<SubscriptionTier> {
  const db = await getDb();
  if (!db) return "free";

  const user = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  // Architects: free tier by default — messaging/video unlocked only on Pro ($29.99)
  // Falls through to subscription check below so Pro architects get standard tier

  // Check Microsoft subscription
  const { getUserTier: getMicrosoftTier } = await import("./microsoft-subscription-service");
  return await getMicrosoftTier(userId);
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

  // Free tier (supplier basic): 10 messages per month
  if (tier === "free") {
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
    const limit = 10;

    if (used >= limit) {
      return {
        canSend: false,
        reason: `Free suppliers can send ${limit} messages/month. Upgrade to Verified Pro for 300 messages/month.`,
        messagesUsed: used,
        messagesLimit: limit,
        tier,
      };
    }

    return { canSend: true, messagesUsed: used, messagesLimit: limit, tier };
  }

  // Standard tier: architects get 50/mo, Verified Pro suppliers get 300/mo
  // Role-based differentiation handled upstream — standard covers both
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
    const limit = 300; // covers both architects (50 real usage) and Verified Pro suppliers

    if (used >= limit) {
      return {
        canSend: false,
        reason: `Monthly messaging limit reached (${limit} messages). Contact support to increase your limit.`,
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

  // Free tier (supplier basic): no video calling
  if (tier === "free") {
    return {
      canCall: false,
      reason: "Video calling is available on Verified Pro ($29.99/month). Upgrade to connect face-to-face with architects.",
      minutesUsed: 0,
      minutesLimit: 0,
      tier,
    };
  }

  // Standard = Verified Pro suppliers: 15 hrs/month. Premium = unlimited (promo grants).
  const limit = tier === "premium" ? 3000 : 900; // 900 min = 15hr, 3000 min = 50hr

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
 * Check if a user can INITIATE (outbound) a video call.
 * Architects: always yes (they're buyers, free to reach out).
 * Suppliers: only on Professional ($99) or higher — free suppliers inbound only.
 */
export async function checkOutboundCallPermission(userId: number): Promise<{ canCall: boolean; reason?: string }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const user = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const role = user[0]?.role;

  // Architects can always initiate calls
  if (role !== "supplier") return { canCall: true };

  // Suppliers need Professional tier or above
  const tier = await getUserTier(userId);
  if (tier === "free") {
    return {
      canCall: false,
      reason: "Outbound video calls are available on the Professional plan ($99/month). Architects can still call you on your free listing.",
    };
  }

  return { canCall: true };
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
