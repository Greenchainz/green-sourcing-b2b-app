/**
 * Microsoft SaaS Accelerator - Webhook Endpoint
 * 
 * This endpoint handles subscription lifecycle events from Microsoft Marketplace.
 * Microsoft sends webhooks when subscriptions are purchased, suspended, reinstated,
 * renewed, or canceled.
 * 
 * Webhook Events:
 * - Subscribed: New subscription purchased
 * - Unsubscribed: Subscription canceled
 * - Suspended: Subscription suspended (payment failed, etc.)
 * - Reinstated: Suspended subscription reactivated
 * - ChangePlan: Customer changed plan (Standard → Premium)
 * - ChangeQuantity: Seat count changed
 * - Renewed: Subscription renewed
 * 
 * Reference: https://learn.microsoft.com/en-us/azure/marketplace/partner-center-portal/pc-saas-fulfillment-webhook-api
 */

import { Request, Response } from "express";
import { getMarketplaceAccessToken, getSubscriptionDetails } from "./marketplace-auth";
import {
  getBuyerSubscription,
  upgradeBuyerSubscription,
  cancelBuyerSubscription,
} from "./subscription-service";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { buyerSubscriptions } from "../drizzle/schema";

export interface WebhookPayload {
  id: string; // Event ID
  activityId: string;
  subscriptionId: string; // Microsoft subscription ID
  offerId: string;
  publisherId: string;
  planId: string;
  quantity: number;
  timeStamp: string;
  action: "Subscribed" | "Unsubscribed" | "Suspended" | "Reinstated" | "ChangePlan" | "ChangeQuantity" | "Renewed";
  status: string;
  operationRequestSource: string;
}

/**
 * Webhook handler
 * POST /api/marketplace/webhook
 */
export async function handleWebhook(req: Request, res: Response) {
  try {
    const payload: WebhookPayload = req.body;

    console.log("[Marketplace Webhook] Received event:", {
      action: payload.action,
      subscriptionId: payload.subscriptionId,
      planId: payload.planId,
    });

    // Validate webhook authenticity
    // Microsoft signs webhooks with a JWT token in the Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      console.error("[Marketplace Webhook] Missing authorization header");
      return res.status(401).json({ error: "Unauthorized" });
    }

    // TODO: Validate JWT signature with Azure AD public keys
    // For now, we'll accept all webhooks (NOT SECURE - implement validation)

    // Get full subscription details from Microsoft
    const subscription = await getSubscriptionDetails(payload.subscriptionId);
    if (!subscription) {
      console.error("[Marketplace Webhook] Could not retrieve subscription details");
      return res.status(500).json({ error: "Failed to retrieve subscription" });
    }

    // Find user by Microsoft subscription ID
    const userId = await findUserBySubscriptionId(payload.subscriptionId);
    if (!userId) {
      console.error("[Marketplace Webhook] User not found for subscription:", payload.subscriptionId);
      return res.status(404).json({ error: "User not found" });
    }

    // Handle different webhook events
    switch (payload.action) {
      case "Subscribed":
        await handleSubscribed(userId, subscription);
        break;

      case "Unsubscribed":
        await handleUnsubscribed(userId, payload.subscriptionId);
        break;

      case "Suspended":
        await handleSuspended(userId, payload.subscriptionId);
        break;

      case "Reinstated":
        await handleReinstated(userId, subscription);
        break;

      case "ChangePlan":
        await handleChangePlan(userId, subscription);
        break;

      case "ChangeQuantity":
        await handleChangeQuantity(userId, subscription);
        break;

      case "Renewed":
        await handleRenewed(userId, subscription);
        break;

      default:
        console.warn("[Marketplace Webhook] Unknown action:", payload.action);
    }

    // Acknowledge webhook (must respond with 200 OK)
    return res.status(200).json({ status: "success" });

  } catch (error) {
    console.error("[Marketplace Webhook] Error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * Find user by Microsoft subscription ID
 */
async function findUserBySubscriptionId(msSubscriptionId: string): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select({ userId: buyerSubscriptions.userId })
    .from(buyerSubscriptions)
    .where(eq(buyerSubscriptions.msSubscriptionId, msSubscriptionId))
    .limit(1);

  return result.length > 0 ? result[0].userId : null;
}

/**
 * Handle "Subscribed" event
 * New subscription purchased
 */
async function handleSubscribed(userId: number, subscription: any) {
  console.log("[Marketplace Webhook] Handling Subscribed event for user:", userId);

  const tier = mapPlanIdToTier(subscription.planId);
  
  if (tier !== "free") {
    await upgradeBuyerSubscription(
      userId,
      tier as "standard" | "premium",
      subscription.id,
      subscription.planId
    );
  }

  // TODO: Send welcome email to user
}

/**
 * Handle "Unsubscribed" event
 * Subscription canceled
 */
async function handleUnsubscribed(userId: number, msSubscriptionId: string) {
  console.log("[Marketplace Webhook] Handling Unsubscribed event for user:", userId);

  await cancelBuyerSubscription(userId);

  // TODO: Send cancellation confirmation email
}

/**
 * Handle "Suspended" event
 * Subscription suspended (payment failed, etc.)
 */
async function handleSuspended(userId: number, msSubscriptionId: string) {
  console.log("[Marketplace Webhook] Handling Suspended event for user:", userId);

  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  await db
    .update(buyerSubscriptions)
    .set({
      status: "suspended",
      updatedAt: new Date(),
    })
    .where(eq(buyerSubscriptions.userId, userId));

  // TODO: Send suspension notification email
}

/**
 * Handle "Reinstated" event
 * Suspended subscription reactivated
 */
async function handleReinstated(userId: number, subscription: any) {
  console.log("[Marketplace Webhook] Handling Reinstated event for user:", userId);

  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  await db
    .update(buyerSubscriptions)
    .set({
      status: "active",
      updatedAt: new Date(),
    })
    .where(eq(buyerSubscriptions.userId, userId));

  // TODO: Send reinstatement confirmation email
}

/**
 * Handle "ChangePlan" event
 * Customer changed plan (e.g., Standard → Premium)
 */
async function handleChangePlan(userId: number, subscription: any) {
  console.log("[Marketplace Webhook] Handling ChangePlan event for user:", userId);

  const newTier = mapPlanIdToTier(subscription.planId);
  
  if (newTier !== "free") {
    await upgradeBuyerSubscription(
      userId,
      newTier as "standard" | "premium",
      subscription.id,
      subscription.planId
    );
  }

  // TODO: Send plan change confirmation email
}

/**
 * Handle "ChangeQuantity" event
 * Seat count changed
 */
async function handleChangeQuantity(userId: number, subscription: any) {
  console.log("[Marketplace Webhook] Handling ChangeQuantity event for user:", userId);

  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  await db
    .update(buyerSubscriptions)
    .set({
      maxSeats: subscription.quantity,
      updatedAt: new Date(),
    })
    .where(eq(buyerSubscriptions.userId, userId));

  // TODO: Send quantity change confirmation email
}

/**
 * Handle "Renewed" event
 * Subscription renewed
 */
async function handleRenewed(userId: number, subscription: any) {
  console.log("[Marketplace Webhook] Handling Renewed event for user:", userId);

  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  // Update renewal date
  const renewalDate = subscription.term?.endDate ? new Date(subscription.term.endDate) : null;

  await db
    .update(buyerSubscriptions)
    .set({
      renewalDate,
      status: "active",
      updatedAt: new Date(),
    })
    .where(eq(buyerSubscriptions.userId, userId));

  // TODO: Send renewal confirmation email
}

/**
 * Map Microsoft plan ID to GreenChainz tier
 */
function mapPlanIdToTier(planId: string): "free" | "standard" | "premium" {
  const planMap: Record<string, "free" | "standard" | "premium"> = {
    "greenchainz-free": "free",
    "greenchainz-standard": "standard",
    "greenchainz-premium": "premium",
    "standard-monthly": "standard",
    "standard-annual": "standard",
    "premium-monthly": "premium",
    "premium-annual": "premium",
  };

  return planMap[planId.toLowerCase()] || "free";
}
