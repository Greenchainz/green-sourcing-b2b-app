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
import { validateMarketplaceToken, resolveSubscription } from "./marketplace-auth";
import { getBuyerSubscription, createBuyerSubscription, upgradeBuyerSubscription } from "./subscription-service";

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

/**
 * Landing page handler
 * GET /api/marketplace/landing?token=<marketplace_token>
 */
export async function handleLandingPage(req: Request, res: Response) {
  try {
    const { token } = req.query;

    if (!token || typeof token !== "string") {
      return res.status(400).json({
        error: "Missing marketplace token",
        message: "The 'token' query parameter is required",
      });
    }

    console.log("[Marketplace Landing] Received token:", token.substring(0, 20) + "...");

    // Step 1: Validate the marketplace token with Azure AD
    const isValid = await validateMarketplaceToken(token);
    if (!isValid) {
      return res.status(401).json({
        error: "Invalid marketplace token",
        message: "The provided token could not be validated",
      });
    }

    // Step 2: Resolve the token to get subscription details
    const subscription = await resolveSubscription(token);
    if (!subscription) {
      return res.status(500).json({
        error: "Failed to resolve subscription",
        message: "Could not retrieve subscription details from Microsoft",
      });
    }

    console.log("[Marketplace Landing] Resolved subscription:", {
      id: subscription.id,
      planId: subscription.planId,
      email: subscription.beneficiary.emailId,
    });

    // Step 3: Map Microsoft plan ID to our tier
    const tier = mapPlanIdToTier(subscription.planId);

    // Step 4: Find or create user by email (beneficiary is the end user)
    const userEmail = subscription.beneficiary.emailId;
    // TODO: Look up user by email in database
    // For now, we'll assume the user exists and has userId = 1
    const userId = 1; // PLACEHOLDER - replace with actual user lookup

    // Step 5: Create or update subscription in our database
    // First check if subscription exists
    const existingSubscription = await getBuyerSubscription(userId);
    
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

    console.log("[Marketplace Landing] Subscription activated:", {
      userId,
      tier,
      msSubscriptionId: subscription.id,
    });

    // Step 6: Activate the subscription with Microsoft
    // This tells Microsoft that we've successfully provisioned the subscription
    await activateSubscription(subscription.id, subscription.planId);

    // Step 7: Redirect to user dashboard
    const dashboardUrl = `${process.env.FRONTEND_URL || "https://greenchainz.com"}/dashboard?welcome=true`;
    return res.redirect(dashboardUrl);

  } catch (error) {
    console.error("[Marketplace Landing] Error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
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
  const tokenUrl = `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/oauth2/v2.0/token`;

  const params = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: process.env.AZURE_AD_CLIENT_ID || "",
    client_secret: process.env.AZURE_AD_CLIENT_SECRET || "",
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

  const data = await response.json();
  return data.access_token;
}
