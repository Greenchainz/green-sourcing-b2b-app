import { Request, Response } from "express";
import {
  activateSubscription,
  renewSubscription,
  cancelSubscription,
  suspendSubscription,
  reinstateSubscription,
  SubscriptionWebhookPayload,
} from "./microsoft-subscription-service";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Microsoft Marketplace Webhook Handler
 * 
 * Receives subscription lifecycle events from Microsoft AppSource:
 * - Subscription activated (customer purchases)
 * - Subscription renewed (monthly billing)
 * - Subscription cancelled (customer cancels)
 * - Subscription suspended (payment failure)
 * - Subscription reinstated (payment recovered)
 * 
 * Webhook endpoint: POST /api/microsoft/webhook
 * 
 * Microsoft sends webhook events with this structure:
 * {
 *   "action": "activate" | "renew" | "cancel" | "suspend" | "reinstate",
 *   "subscriptionId": "uuid",
 *   "planId": "greenchainz-standard",
 *   "quantity": 1,
 *   "purchaser": {
 *     "emailId": "user@example.com",
 *     "objectId": "azure-ad-object-id",
 *     "tenantId": "azure-tenant-id"
 *   },
 *   "term": {
 *     "startDate": "2026-02-12T00:00:00Z",
 *     "endDate": "2026-03-12T00:00:00Z"
 *   }
 * }
 */

/**
 * Find or create user by email from Microsoft webhook
 */
async function findOrCreateUserByEmail(email: string, microsoftObjectId: string): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Try to find existing user by email
  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existingUser) {
    return existingUser.id;
  }

  // Create new user
  const result = await db
    .insert(users)
    .values({
      openId: microsoftObjectId,
      email,
      name: email.split("@")[0], // Use email prefix as name
      loginMethod: "microsoft",
      role: "user",
    });

  return Number(result[0].insertId);
}

/**
 * Handle Microsoft Marketplace webhook events
 */
export async function handleMicrosoftWebhook(req: Request, res: Response): Promise<void> {
  try {
    const payload = req.body as SubscriptionWebhookPayload;

    console.log(`[Microsoft Webhook] Received ${payload.action} event for subscription ${payload.subscriptionId}`);

    // Find or create user
    const userId = await findOrCreateUserByEmail(
      payload.purchaser.emailId,
      payload.purchaser.objectId
    );

    // Handle different webhook actions
    switch (payload.action) {
      case "activate":
        const activated = await activateSubscription(userId, payload);
        console.log(`[Microsoft Webhook] Activated subscription ${activated.id} for user ${userId}`);
        res.status(200).json({ success: true, subscriptionId: activated.id });
        break;

      case "renew":
        const renewed = await renewSubscription(payload);
        if (renewed) {
          console.log(`[Microsoft Webhook] Renewed subscription ${renewed.id}`);
          res.status(200).json({ success: true, subscriptionId: renewed.id });
        } else {
          console.error(`[Microsoft Webhook] Failed to renew subscription ${payload.subscriptionId}`);
          res.status(404).json({ success: false, error: "Subscription not found" });
        }
        break;

      case "cancel":
        const cancelled = await cancelSubscription(payload.subscriptionId);
        if (cancelled) {
          console.log(`[Microsoft Webhook] Cancelled subscription ${cancelled.id}`);
          res.status(200).json({ success: true, subscriptionId: cancelled.id });
        } else {
          console.error(`[Microsoft Webhook] Failed to cancel subscription ${payload.subscriptionId}`);
          res.status(404).json({ success: false, error: "Subscription not found" });
        }
        break;

      case "suspend":
        const suspended = await suspendSubscription(payload.subscriptionId);
        if (suspended) {
          console.log(`[Microsoft Webhook] Suspended subscription ${suspended.id}`);
          res.status(200).json({ success: true, subscriptionId: suspended.id });
        } else {
          console.error(`[Microsoft Webhook] Failed to suspend subscription ${payload.subscriptionId}`);
          res.status(404).json({ success: false, error: "Subscription not found" });
        }
        break;

      case "reinstate":
        const reinstated = await reinstateSubscription(payload.subscriptionId);
        if (reinstated) {
          console.log(`[Microsoft Webhook] Reinstated subscription ${reinstated.id}`);
          res.status(200).json({ success: true, subscriptionId: reinstated.id });
        } else {
          console.error(`[Microsoft Webhook] Failed to reinstate subscription ${payload.subscriptionId}`);
          res.status(404).json({ success: false, error: "Subscription not found" });
        }
        break;

      default:
        console.error(`[Microsoft Webhook] Unknown action: ${payload.action}`);
        res.status(400).json({ success: false, error: "Unknown action" });
    }
  } catch (error) {
    console.error("[Microsoft Webhook] Error processing webhook:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

/**
 * Verify Microsoft webhook signature (optional, for production)
 * 
 * Microsoft signs webhook requests with a shared secret.
 * You can verify the signature to ensure the request is authentic.
 * 
 * For now, this is a placeholder. Implement when you have credentials.
 */
export function verifyMicrosoftWebhookSignature(req: Request): boolean {
  // TODO: Implement signature verification when Microsoft credentials are available
  // const signature = req.headers['x-ms-signature'];
  // const secret = process.env.MICROSOFT_WEBHOOK_SECRET;
  // Verify signature using HMAC-SHA256
  return true; // For now, accept all requests
}
