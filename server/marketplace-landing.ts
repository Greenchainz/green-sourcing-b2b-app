/**
 * Microsoft SaaS Accelerator - Landing Page Endpoint
 * 
 * This endpoint handles subscription activation when a customer purchases
 * GreenChainz from the Azure Marketplace. Microsoft redirects the customer
 * here with a marketplace token that must be resolved to get subscription details.
 * 
 * Flow:
 * 1. Customer clicks "Subscribe" in Azure Marketplace
 * 2. Microsoft redirects to this landing page with `token` query parameter
 * 3. We resolve the token to get subscription details (subscriptionId, planId, etc.)
 * 4. We create/update the subscription in our database
 * 5. We redirect the customer to their dashboard
 * 
 * Reference: https://learn.microsoft.com/en-us/azure/marketplace/partner-center-portal/pc-saas-fulfillment-subscription-api
 */

import { Request, Response } from "express";
import { redactSensitiveData } from "../lib/auth/diagnostics";
import { validateMarketplaceToken, resolveSubscription } from "./marketplace-auth";
import { getBuyerSubscription, createBuyerSubscription, upgradeBuyerSubscription } from "./subscription-service";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { getRequiredEnv } from "./_core/oauth-env";

export interface MarketplaceSubscription {
  id: string; // Microsoft subscription ID
  name: string;
  publisherId: string;
  offerId: string;
  planId: string;
  quantity: number;
  subscription: {
    id: string;
    subscriptionName: string;
    offerId: string;
    planId: string;
  };
  purchaser: {
    emailId: string;
    objectId: string;
    tenantId: string;
  };
  beneficiary: {
    emailId: string;
    objectId: string;
    tenantId: string;
  };
  term: {
    startDate: string;
    endDate: string;
    termUnit: string;
  };
  isTest: boolean;
  isFreeTrial: boolean;
  allowedCustomerOperations: string[];
  sessionMode: string;
  sandboxType: string;
  saasSubscriptionStatus: string;
}

const DEFAULT_FRONTEND_URL = "https://greenchainz.com";

function getFrontendBaseUrl(req: Request): string {
  const appBase = process.env.APP_BASE_URL;
  if (appBase && appBase.length > 0) {
    return appBase;
  }

  const frontendUrl = process.env.FRONTEND_URL;
  if (frontendUrl && frontendUrl.length > 0) {
    return frontendUrl;
  }

  const host = req.headers.host;
  if (host) {
    const protocol = req.protocol || "https";
    return `${protocol}://${host}`;
  }

  return DEFAULT_FRONTEND_URL;
}

function respondMarketplaceError(
  req: Request,
  res: Response,
  status: number,
  errorCode:
    | "missing_token"
    | "invalid_token"
    | "resolve_failed"
    | "provision_failed"
    | "activation_failed"
    | "internal_error",
  message: string
) {
  const acceptsJson = req.accepts(["html", "json"]) === "json";
  if (acceptsJson) {
    return res.status(status).json({
      error: "Marketplace activation failed",
      code: errorCode,
      message,
      recovery: {
        signOutUrl: "/api/auth/logout",
        loginUrl: "/login",
      },
    });
  }

  const frontendUrl = getFrontendBaseUrl(req);
  const redirectUrl = new URL("/login", frontendUrl);
  redirectUrl.searchParams.set("error", `marketplace_${errorCode}`);
  redirectUrl.searchParams.set("returnPath", "/dashboard");

  return res.redirect(302, redirectUrl.toString());
}

/**
 * Landing page handler
 * GET /api/marketplace/landing?token=<marketplace_token>
 */
export async function handleLandingPage(req: Request, res: Response) {
  try {
    const { token } = req.query;

    if (!token || typeof token !== "string") {
      return respondMarketplaceError(
        req,
        res,
        400,
        "missing_token",
        "The marketplace token is missing from the activation callback."
      );
    }

    console.log("[Marketplace Landing] Received token:", redactSensitiveData({ token }));

    // Step 1: Validate the marketplace token with Azure AD
    const isValid = await validateMarketplaceToken(token);
    if (!isValid) {
      return respondMarketplaceError(
        req,
        res,
        401,
        "invalid_token",
        "The marketplace token could not be validated."
      );
    }

    // Step 2: Resolve the token to get subscription details
    const subscription = await resolveSubscription(token);
    if (!subscription) {
      return respondMarketplaceError(
        req,
        res,
        502,
        "resolve_failed",
        "We could not resolve your Microsoft Marketplace subscription."
      );
    }

    console.log("[Marketplace Landing] Resolved subscription:", redactSensitiveData({
      id: subscription.id,
      planId: subscription.planId,
      email: subscription.beneficiary.emailId,
    }));

    // Step 3: Map Microsoft plan ID to our tier
    const tier = mapPlanIdToTier(subscription.planId);

    // Step 4: Find or create user by email (beneficiary is the end user)
    const userEmail = subscription.beneficiary.emailId;
    const userObjectId = subscription.beneficiary.objectId;
    const userId = await findOrCreateUserByEmail(userEmail, userObjectId);

    // Step 5: Create or update subscription in our database
    // First check if subscription exists
    const existingSubscription = await getBuyerSubscription(userId);

    try {
      if (!existingSubscription) {
        // Create new subscription
        await createBuyerSubscription(userId, tier as "free" | "standard" | "premium");
      }

      // Update with Microsoft marketplace details
      if (tier !== "free") {
        await upgradeBuyerSubscription(
          userId,
          tier as "standard" | "premium",
          subscription.id,
          subscription.planId
        );
      }
    } catch (provisionError) {
      console.error("[Marketplace Landing] Provisioning error:", provisionError);
      return respondMarketplaceError(
        req,
        res,
        500,
        "provision_failed",
        "We could not finish provisioning your subscription in GreenChainz."
      );
    }

    console.log("[Marketplace Landing] Subscription activated:", redactSensitiveData({
      userId,
      tier,
      msSubscriptionId: subscription.id,
    }));

    // Step 6: Activate the subscription with Microsoft
    // This tells Microsoft that we've successfully provisioned the subscription
    try {
      await activateSubscription(subscription.id, subscription.planId);
    } catch (activationError) {
      console.error("[Marketplace Landing] Activation handshake error:", activationError);
      return respondMarketplaceError(
        req,
        res,
        502,
        "activation_failed",
        "Your subscription was created, but marketplace activation confirmation failed."
      );
    }

    // Step 7: Redirect to user dashboard
    const dashboardUrl = `${getFrontendBaseUrl(req)}/dashboard?welcome=true`;
    return res.redirect(dashboardUrl);

  } catch (error) {
    console.error("[Marketplace Landing] Error:", redactSensitiveData(error));
    return res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
    console.error("[Marketplace Landing] Error:", error);
    return respondMarketplaceError(
      req,
      res,
      500,
      "internal_error",
      error instanceof Error ? error.message : "Unexpected marketplace error."
    );
  }
}

/**
 * Find an existing user by email, or create a minimal account for a new AppSource subscriber.
 * The user can later sign in via Microsoft Entra (Easy Auth) and the account will be recognised
 * by email or openId.
 */
async function findOrCreateUserByEmail(email: string, objectId: string): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  // 1. Try to find by email
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing) {
    return existing.id;
  }

  // 2. Try to find by openId (objectId from Azure AD)
  const [existingByOid] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.openId, objectId))
    .limit(1);

  if (existingByOid) {
    return existingByOid.id;
  }

  // 3. Create a new user record seeded from AppSource subscriber info
  const [inserted] = await db
    .insert(users)
    .values({
      openId: objectId,
      email,
      loginMethod: "marketplace",
    })
    .returning({ id: users.id });

  console.log("[Marketplace Landing] Created new user from AppSource:", redactSensitiveData({ id: inserted.id, email }));
  return inserted.id;
}

/**
 * Map Microsoft plan ID to GreenChainz tier
 */
function mapPlanIdToTier(planId: string): "free" | "standard" | "premium" {
  // These plan IDs must match what you configure in Partner Center
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

/**
 * Activate subscription with Microsoft
 * This API call tells Microsoft that we've successfully provisioned the subscription
 */
async function activateSubscription(subscriptionId: string, planId: string): Promise<void> {
  const activateUrl = `https://marketplaceapi.microsoft.com/api/saas/subscriptions/${subscriptionId}/activate?api-version=2018-08-31`;

  const response = await fetch(activateUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${await getMarketplaceAccessToken()}`,
    },
    body: JSON.stringify({
      planId,
      quantity: 1,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to activate subscription: ${response.status} ${errorText}`);
  }

  console.log("[Marketplace Landing] Subscription activated successfully");
}

/**
 * Get access token for Microsoft Marketplace API
 */
async function getMarketplaceAccessToken(): Promise<string> {
  const tenantId = getRequiredEnv("AZURE_AD_TENANT_ID");
  const clientId = getRequiredEnv("AZURE_AD_CLIENT_ID");
  const clientSecret = getRequiredEnv("AZURE_AD_CLIENT_SECRET");
  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

  const params = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
    scope: "https://marketplaceapi.microsoft.com/.default",
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    throw new Error(`Failed to get access token: ${response.status}`);
  }

  const data = await response.json() as { access_token: string };
  return data.access_token;
}
