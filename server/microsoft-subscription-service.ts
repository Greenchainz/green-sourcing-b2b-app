import { getDb } from "./db";
import { subscriptions } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

/**
 * Microsoft AppSource Subscription Management Service
 * 
 * Handles subscription lifecycle events from Microsoft Marketplace:
 * - Subscription activation (customer purchases)
 * - Subscription renewal (monthly billing)
 * - Subscription cancellation (customer cancels)
 * - Subscription suspension (payment failure)
 * 
 * Integrates with Microsoft Marketplace Fulfillment API
 */

export type SubscriptionTier = "free" | "standard" | "premium";
export type SubscriptionStatus = "active" | "suspended" | "cancelled" | "expired";

export interface MicrosoftSubscription {
  id: number;
  userId: number;
  microsoftSubscriptionId: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  startDate: Date;
  endDate: Date | null;
  lastRenewalDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubscriptionWebhookPayload {
  action: "activate" | "renew" | "cancel" | "suspend" | "reinstate";
  subscriptionId: string;
  planId: string;
  quantity: number;
  purchaser: {
    emailId: string;
    objectId: string;
    tenantId: string;
  };
  term: {
    startDate: string;
    endDate: string;
  };
}

/**
 * Map Microsoft plan IDs to subscription tiers
 */
function mapPlanIdToTier(planId: string): SubscriptionTier {
  const planMap: Record<string, SubscriptionTier> = {
    "greenchainz-free": "free",
    "greenchainz-standard": "standard",
    "greenchainz-premium": "premium",
  };
  return planMap[planId] || "free";
}

/**
 * Get active subscription for a user
 */
export async function getUserSubscription(userId: number): Promise<MicrosoftSubscription | null> {
  const db = await getDb();
  if (!db) return null;
  
  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.status, "active")
      )
    )
    .limit(1);

  return subscription || null;
}

/**
 * Get subscription tier for a user (defaults to free if no active subscription)
 */
export async function getUserTier(userId: number): Promise<SubscriptionTier> {
  const subscription = await getUserSubscription(userId);
  return subscription?.tier || "free";
}

/**
 * Handle subscription activation (customer purchases)
 */
export async function activateSubscription(
  userId: number,
  payload: SubscriptionWebhookPayload
): Promise<MicrosoftSubscription> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const tier = mapPlanIdToTier(payload.planId);
  const startDate = new Date(payload.term.startDate);
  const endDate = new Date(payload.term.endDate);

  // Check if subscription already exists
  const [existing] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.microsoftSubscriptionId, payload.subscriptionId))
    .limit(1);

  if (existing) {
    // Update existing subscription
    await db
      .update(subscriptions)
      .set({
        tier,
        status: "active",
        startDate,
        endDate,
        lastRenewalDate: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, existing.id));

    // Fetch updated record
    const [updated] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.id, existing.id))
      .limit(1);

    return updated;
  }

  // Create new subscription
  const result = await db
    .insert(subscriptions)
    .values({
      userId,
      microsoftSubscriptionId: payload.subscriptionId,
      tier,
      status: "active",
      startDate,
      endDate,
      lastRenewalDate: new Date(),
    });

  // Fetch newly created record
  const insertId = Number(result[0].insertId);
  const [newSubscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.id, insertId))
    .limit(1);

  return newSubscription;
}

/**
 * Handle subscription renewal (monthly billing)
 */
export async function renewSubscription(
  payload: SubscriptionWebhookPayload
): Promise<MicrosoftSubscription | null> {
  const db = await getDb();
  if (!db) return null;
  
  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.microsoftSubscriptionId, payload.subscriptionId))
    .limit(1);

  if (!subscription) {
    console.error(`Subscription not found: ${payload.subscriptionId}`);
    return null;
  }

  const endDate = new Date(payload.term.endDate);

  await db
    .update(subscriptions)
    .set({
      endDate,
      lastRenewalDate: new Date(),
      status: "active",
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.id, subscription.id));

  // Fetch updated record
  const [updated] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.id, subscription.id))
    .limit(1);

  return updated;
}

/**
 * Handle subscription cancellation (customer cancels)
 */
export async function cancelSubscription(
  microsoftSubscriptionId: string
): Promise<MicrosoftSubscription | null> {
  const db = await getDb();
  if (!db) return null;
  
  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.microsoftSubscriptionId, microsoftSubscriptionId))
    .limit(1);

  if (!subscription) {
    console.error(`Subscription not found: ${microsoftSubscriptionId}`);
    return null;
  }

  await db
    .update(subscriptions)
    .set({
      status: "cancelled",
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.id, subscription.id));

  // Fetch updated record
  const [updated] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.id, subscription.id))
    .limit(1);

  return updated;
}

/**
 * Handle subscription suspension (payment failure)
 */
export async function suspendSubscription(
  microsoftSubscriptionId: string
): Promise<MicrosoftSubscription | null> {
  const db = await getDb();
  if (!db) return null;
  
  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.microsoftSubscriptionId, microsoftSubscriptionId))
    .limit(1);

  if (!subscription) {
    console.error(`Subscription not found: ${microsoftSubscriptionId}`);
    return null;
  }

  await db
    .update(subscriptions)
    .set({
      status: "suspended",
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.id, subscription.id));

  // Fetch updated record
  const [updated] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.id, subscription.id))
    .limit(1);

  return updated;
}

/**
 * Handle subscription reinstatement (payment recovered)
 */
export async function reinstateSubscription(
  microsoftSubscriptionId: string
): Promise<MicrosoftSubscription | null> {
  const db = await getDb();
  if (!db) return null;
  
  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.microsoftSubscriptionId, microsoftSubscriptionId))
    .limit(1);

  if (!subscription) {
    console.error(`Subscription not found: ${microsoftSubscriptionId}`);
    return null;
  }

  await db
    .update(subscriptions)
    .set({
      status: "active",
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.id, subscription.id));

  // Fetch updated record
  const [updated] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.id, subscription.id))
    .limit(1);

  return updated;
}

/**
 * Check if user has access to a specific tier
 */
export async function userHasAccess(userId: number, requiredTier: SubscriptionTier): Promise<boolean> {
  const userTier = await getUserTier(userId);
  
  const tierHierarchy: Record<SubscriptionTier, number> = {
    free: 0,
    standard: 1,
    premium: 2,
  };

  return tierHierarchy[userTier] >= tierHierarchy[requiredTier];
}

/**
 * Get all subscriptions (admin use)
 */
export async function getAllSubscriptions(): Promise<MicrosoftSubscription[]> {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(subscriptions);
}

/**
 * Manually update user tier (admin use)
 */
export async function updateUserTier(
  userId: number,
  tier: SubscriptionTier
): Promise<MicrosoftSubscription | null> {
  const db = await getDb();
  if (!db) return null;
  
  const subscription = await getUserSubscription(userId);

  if (!subscription) {
    // Create new subscription for manual tier assignment
    const result = await db
      .insert(subscriptions)
      .values({
        userId,
        microsoftSubscriptionId: `manual-${userId}-${Date.now()}`,
        tier,
        status: "active",
        startDate: new Date(),
        endDate: null, // Manual assignments don't expire
        lastRenewalDate: null,
      });

    const insertId = Number(result[0].insertId);
    const [newSubscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.id, insertId))
      .limit(1);

    return newSubscription;
  }

  await db
    .update(subscriptions)
    .set({
      tier,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.id, subscription.id));

  // Fetch updated record
  const [updated] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.id, subscription.id))
    .limit(1);

  return updated;
}
