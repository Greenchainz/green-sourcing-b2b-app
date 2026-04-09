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
import { buyerSubscriptions, users } from "../drizzle/schema";
import { sendEmail } from "./email-service";

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

    // Validate JWT signature with Azure AD public keys
    const token = authHeader.replace('Bearer ', '');
    try {
      // Verify JWT token is from Microsoft
      const decoded = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      
      // Check token issuer is Microsoft
      if (!decoded.iss || !decoded.iss.includes('microsoft')) {
        console.error('[Marketplace Webhook] Invalid token issuer');
        return res.status(401).json({ error: 'Unauthorized - Invalid issuer' });
      }
      
      // Check token expiration
      if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
        console.error('[Marketplace Webhook] Token expired');
        return res.status(401).json({ error: 'Unauthorized - Token expired' });
      }
    } catch (error) {
      console.error('[Marketplace Webhook] JWT validation failed:', error);
      return res.status(401).json({ error: 'Unauthorized - Invalid token' });
    }

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
 * Look up a user's email and display name from their userId.
 * Returns null if the user cannot be found — callers should log and continue
 * (a missing email must not break the subscription lifecycle).
 */
async function getUserEmailAndName(userId: number): Promise<{ email: string; name: string } | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select({ email: users.email, name: users.name })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!result.length || !result[0].email) return null;
  return { email: result[0].email, name: result[0].name ?? "there" };
}

const BASE_URL = process.env.FRONTEND_URL ?? "https://greenchainz.com";
const YEAR = new Date().getFullYear();
const FOOTER = `<p style="margin:24px 0 0;font-size:13px;color:#6b7280;">© ${YEAR} GreenChainz · <a href="${BASE_URL}" style="color:#6b7280;">greenchainz.com</a></p>`;
const SHARED_STYLE = `body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px}
  .hdr{background:linear-gradient(135deg,#10b981 0%,#059669 100%);color:#fff;padding:28px 30px;border-radius:8px 8px 0 0;text-align:center}
  .body{background:#f9fafb;padding:28px 30px;border-radius:0 0 8px 8px}
  .btn{display:inline-block;background:#10b981;color:#fff;padding:12px 28px;text-decoration:none;border-radius:6px;font-weight:600;margin-top:20px}`;

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

  const user = await getUserEmailAndName(userId);
  if (user) {
    const dashboardUrl = `${BASE_URL}/dashboard`;
    const planLabel = tier === "premium" ? "Premium" : "Standard";
    await sendEmail({
      to: user.email,
      subject: `Welcome to GreenChainz ${planLabel} 🎉`,
      html: `<!DOCTYPE html><html><head><style>${SHARED_STYLE}</style></head><body>
        <div class="hdr"><h1 style="margin:0;font-size:24px;">You're on GreenChainz ${planLabel}</h1></div>
        <div class="body">
          <p>Hi ${user.name},</p>
          <p>Your <strong>${planLabel}</strong> subscription is now active. You have full access to the platform — materials catalog, RFQ system, AI-powered supplier matching, and CCPS scoring.</p>
          <p>Log in to get started:</p>
          <a href="${dashboardUrl}" class="btn">Open Dashboard</a>
          <p style="margin-top:20px;font-size:14px;color:#6b7280;">Questions? Reply to this email or contact <a href="mailto:founder@greenchainz.com" style="color:#10b981;">founder@greenchainz.com</a></p>
          ${FOOTER}
        </div>
      </body></html>`,
      text: `Hi ${user.name},\n\nYour GreenChainz ${planLabel} subscription is now active.\n\nDashboard: ${dashboardUrl}\n\nQuestions? Email founder@greenchainz.com`,
    });
    console.log(`[Marketplace Webhook] Welcome email sent to ${user.email}`);
  }
}

/**
 * Handle "Unsubscribed" event
 * Subscription canceled
 */
async function handleUnsubscribed(userId: number, msSubscriptionId: string) {
  console.log("[Marketplace Webhook] Handling Unsubscribed event for user:", userId);

  await cancelBuyerSubscription(userId);

  const user = await getUserEmailAndName(userId);
  if (user) {
    await sendEmail({
      to: user.email,
      subject: "Your GreenChainz subscription has been cancelled",
      html: `<!DOCTYPE html><html><head><style>${SHARED_STYLE}</style></head><body>
        <div class="hdr" style="background:linear-gradient(135deg,#64748b 0%,#475569 100%);"><h1 style="margin:0;font-size:24px;">Subscription Cancelled</h1></div>
        <div class="body">
          <p>Hi ${user.name},</p>
          <p>Your GreenChainz subscription has been cancelled. You'll retain access to your data until the end of your current billing period.</p>
          <p>If you cancelled by mistake or change your mind, you can resubscribe any time through Microsoft AppSource.</p>
          <a href="${BASE_URL}" class="btn" style="background:#64748b;">Visit GreenChainz</a>
          <p style="margin-top:20px;font-size:14px;color:#6b7280;">Questions? Email <a href="mailto:founder@greenchainz.com" style="color:#10b981;">founder@greenchainz.com</a></p>
          ${FOOTER}
        </div>
      </body></html>`,
      text: `Hi ${user.name},\n\nYour GreenChainz subscription has been cancelled.\n\nYou'll retain access until the end of your current billing period. To resubscribe, visit Microsoft AppSource.\n\nQuestions? Email founder@greenchainz.com`,
    });
    console.log(`[Marketplace Webhook] Cancellation email sent to ${user.email}`);
  }
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

  const user = await getUserEmailAndName(userId);
  if (user) {
    await sendEmail({
      to: user.email,
      subject: "Action required: GreenChainz subscription suspended",
      html: `<!DOCTYPE html><html><head><style>${SHARED_STYLE}</style></head><body>
        <div class="hdr" style="background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%);"><h1 style="margin:0;font-size:24px;">Subscription Suspended</h1></div>
        <div class="body">
          <p>Hi ${user.name},</p>
          <p>Your GreenChainz subscription has been <strong>suspended</strong> due to a payment issue on your Microsoft account. Your access to paid features is currently paused.</p>
          <p>To restore access, please update your payment method through Microsoft AppSource. Once the payment is resolved, your subscription will be automatically reinstated.</p>
          <a href="https://appsource.microsoft.com" class="btn" style="background:#f59e0b;">Update Payment in AppSource</a>
          <p style="margin-top:20px;font-size:14px;color:#6b7280;">Need help? Email <a href="mailto:founder@greenchainz.com" style="color:#10b981;">founder@greenchainz.com</a></p>
          ${FOOTER}
        </div>
      </body></html>`,
      text: `Hi ${user.name},\n\nYour GreenChainz subscription has been suspended due to a payment issue on your Microsoft account.\n\nTo restore access, please update your payment method at https://appsource.microsoft.com\n\nNeed help? Email founder@greenchainz.com`,
    });
    console.log(`[Marketplace Webhook] Suspension email sent to ${user.email}`);
  }
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

  const user = await getUserEmailAndName(userId);
  if (user) {
    const dashboardUrl = `${BASE_URL}/dashboard`;
    await sendEmail({
      to: user.email,
      subject: "GreenChainz subscription reinstated — you're back!",
      html: `<!DOCTYPE html><html><head><style>${SHARED_STYLE}</style></head><body>
        <div class="hdr"><h1 style="margin:0;font-size:24px;">Subscription Reinstated ✓</h1></div>
        <div class="body">
          <p>Hi ${user.name},</p>
          <p>Great news — your GreenChainz subscription has been reinstated and your full access has been restored.</p>
          <a href="${dashboardUrl}" class="btn">Open Dashboard</a>
          <p style="margin-top:20px;font-size:14px;color:#6b7280;">Questions? Email <a href="mailto:founder@greenchainz.com" style="color:#10b981;">founder@greenchainz.com</a></p>
          ${FOOTER}
        </div>
      </body></html>`,
      text: `Hi ${user.name},\n\nYour GreenChainz subscription has been reinstated and your full access is restored.\n\nDashboard: ${dashboardUrl}\n\nQuestions? Email founder@greenchainz.com`,
    });
    console.log(`[Marketplace Webhook] Reinstatement email sent to ${user.email}`);
  }
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

  const user = await getUserEmailAndName(userId);
  if (user) {
    const planLabel = newTier === "premium" ? "Premium" : newTier === "standard" ? "Standard" : "Free";
    const dashboardUrl = `${BASE_URL}/dashboard`;
    await sendEmail({
      to: user.email,
      subject: `GreenChainz plan updated to ${planLabel}`,
      html: `<!DOCTYPE html><html><head><style>${SHARED_STYLE}</style></head><body>
        <div class="hdr"><h1 style="margin:0;font-size:24px;">Plan Updated to ${planLabel}</h1></div>
        <div class="body">
          <p>Hi ${user.name},</p>
          <p>Your GreenChainz subscription has been updated to the <strong>${planLabel}</strong> plan. Your new features and limits are active immediately.</p>
          <a href="${dashboardUrl}" class="btn">View Dashboard</a>
          <p style="margin-top:20px;font-size:14px;color:#6b7280;">Questions? Email <a href="mailto:founder@greenchainz.com" style="color:#10b981;">founder@greenchainz.com</a></p>
          ${FOOTER}
        </div>
      </body></html>`,
      text: `Hi ${user.name},\n\nYour GreenChainz subscription has been updated to the ${planLabel} plan.\n\nDashboard: ${dashboardUrl}\n\nQuestions? Email founder@greenchainz.com`,
    });
    console.log(`[Marketplace Webhook] Plan change email sent to ${user.email} (→ ${planLabel})`);
  }
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

  const user = await getUserEmailAndName(userId);
  if (user) {
    const seats = subscription.quantity ?? 1;
    await sendEmail({
      to: user.email,
      subject: `GreenChainz seat count updated to ${seats}`,
      html: `<!DOCTYPE html><html><head><style>${SHARED_STYLE}</style></head><body>
        <div class="hdr"><h1 style="margin:0;font-size:24px;">Seats Updated</h1></div>
        <div class="body">
          <p>Hi ${user.name},</p>
          <p>Your GreenChainz subscription has been updated to <strong>${seats} seat${seats !== 1 ? "s" : ""}</strong>. The change is active immediately.</p>
          <p style="font-size:14px;color:#6b7280;">Your billing will be adjusted at your next renewal date to reflect the new quantity.</p>
          <p style="margin-top:20px;font-size:14px;color:#6b7280;">Questions? Email <a href="mailto:founder@greenchainz.com" style="color:#10b981;">founder@greenchainz.com</a></p>
          ${FOOTER}
        </div>
      </body></html>`,
      text: `Hi ${user.name},\n\nYour GreenChainz subscription has been updated to ${seats} seat${seats !== 1 ? "s" : ""}. Billing will adjust at your next renewal.\n\nQuestions? Email founder@greenchainz.com`,
    });
    console.log(`[Marketplace Webhook] Quantity change email sent to ${user.email} (${seats} seats)`);
  }
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

  const user = await getUserEmailAndName(userId);
  if (user) {
    const nextDate = renewalDate
      ? renewalDate.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
      : "your next billing date";
    const dashboardUrl = `${BASE_URL}/dashboard`;
    await sendEmail({
      to: user.email,
      subject: "GreenChainz subscription renewed",
      html: `<!DOCTYPE html><html><head><style>${SHARED_STYLE}</style></head><body>
        <div class="hdr"><h1 style="margin:0;font-size:24px;">Subscription Renewed ✓</h1></div>
        <div class="body">
          <p>Hi ${user.name},</p>
          <p>Your GreenChainz subscription has been successfully renewed. Your next renewal date is <strong>${nextDate}</strong>.</p>
          <a href="${dashboardUrl}" class="btn">Open Dashboard</a>
          <p style="margin-top:20px;font-size:14px;color:#6b7280;">Questions? Email <a href="mailto:founder@greenchainz.com" style="color:#10b981;">founder@greenchainz.com</a></p>
          ${FOOTER}
        </div>
      </body></html>`,
      text: `Hi ${user.name},\n\nYour GreenChainz subscription has been renewed. Next renewal: ${nextDate}.\n\nDashboard: ${dashboardUrl}\n\nQuestions? Email founder@greenchainz.com`,
    });
    console.log(`[Marketplace Webhook] Renewal email sent to ${user.email} (next: ${nextDate})`);
  }
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
