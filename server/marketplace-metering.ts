/**
 * Microsoft SaaS Accelerator - Metering API Integration
 * 
 * This module handles usage-based billing by reporting metered usage to Microsoft.
 * Microsoft bills customers based on the usage we report through this API.
 * 
 * Metered Dimensions (from greenchainz-pricing-strategy.md):
 * - rfq_submissions: RFQ submissions (5/mo Standard, unlimited Premium)
 * - ai_queries: ChainBot AI queries (25/mo Standard, unlimited Premium)
 * - swap_analyses: Material swap analyses (20/mo Standard, unlimited Premium)
 * - ccps_exports: CCPS report exports (10/mo Standard, unlimited Premium)
 * - material_comparisons: Material comparisons (50/mo Standard, unlimited Premium)
 * 
 * Reference: https://learn.microsoft.com/en-us/partner-center/marketplace-offers/marketplace-metering-service-apis
 */

import { getMarketplaceAccessToken } from "./marketplace-auth";

export type MeteringDimension = 
  | "rfq_submissions"
  | "ai_queries"
  | "swap_analyses"
  | "ccps_exports"
  | "material_comparisons";

export interface UsageEvent {
  resourceId: string; // Microsoft subscription ID
  quantity: number; // Usage quantity (must be integer)
  dimension: MeteringDimension; // Custom dimension ID
  effectiveStartTime: string; // ISO 8601 timestamp
  planId: string; // Microsoft plan ID
}

export interface UsageEventResult {
  usageEventId: string;
  status: "Accepted" | "Expired" | "Duplicate" | "Error" | "ResourceNotFound" | "ResourceNotAuthorized" | "InvalidDimension" | "InvalidQuantity" | "BadArgument";
  messageTime: string;
  resourceId: string;
  quantity: number;
  dimension: string;
  effectiveStartTime: string;
  planId: string;
}

/**
 * Report usage event to Microsoft Marketplace Metering API
 * 
 * This function sends a single usage event to Microsoft for billing.
 * Microsoft will charge the customer based on the reported usage.
 * 
 * Important notes:
 * - Usage events must be reported within 24 hours of occurrence
 * - Duplicate events (same resourceId, dimension, effectiveStartTime) are rejected
 * - Quantity must be a positive integer
 * - effectiveStartTime must be within the current billing period
 */
export async function reportUsageEvent(event: UsageEvent): Promise<UsageEventResult | null> {
  try {
    const accessToken = await getMarketplaceAccessToken();
    const url = "https://marketplaceapi.microsoft.com/api/usageEvent?api-version=2018-08-31";

    console.log("[Metering API] Reporting usage event:", {
      resourceId: event.resourceId,
      dimension: event.dimension,
      quantity: event.quantity,
    });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
        "x-ms-requestid": generateRequestId(),
        "x-ms-correlationid": generateCorrelationId(),
      },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Metering API] Failed to report usage:", response.status, errorText);
      return null;
    }

    const result: UsageEventResult = await response.json();
    
    console.log("[Metering API] Usage event reported successfully:", {
      usageEventId: result.usageEventId,
      status: result.status,
    });

    return result;
  } catch (error) {
    console.error("[Metering API] Error reporting usage:", error);
    return null;
  }
}

/**
 * Report batch usage events to Microsoft Marketplace Metering API
 * 
 * This function sends multiple usage events in a single API call.
 * Useful for reporting accumulated usage at the end of a billing period.
 * 
 * Maximum 25 events per batch.
 */
export async function reportBatchUsageEvents(events: UsageEvent[]): Promise<UsageEventResult[]> {
  try {
    if (events.length === 0) {
      return [];
    }

    if (events.length > 25) {
      throw new Error("Maximum 25 events per batch");
    }

    const accessToken = await getMarketplaceAccessToken();
    const url = "https://marketplaceapi.microsoft.com/api/batchUsageEvent?api-version=2018-08-31";

    console.log("[Metering API] Reporting batch usage events:", {
      count: events.length,
    });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
        "x-ms-requestid": generateRequestId(),
        "x-ms-correlationid": generateCorrelationId(),
      },
      body: JSON.stringify({
        request: events,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Metering API] Failed to report batch usage:", response.status, errorText);
      return [];
    }

    const result = await response.json();
    const results: UsageEventResult[] = result.result || [];

    console.log("[Metering API] Batch usage events reported:", {
      total: results.length,
      accepted: results.filter(r => r.status === "Accepted").length,
      rejected: results.filter(r => r.status !== "Accepted").length,
    });

    return results;
  } catch (error) {
    console.error("[Metering API] Error reporting batch usage:", error);
    return [];
  }
}

/**
 * Report usage for a buyer subscription
 * 
 * This is a convenience wrapper that integrates with our usage tracking service.
 * It reports usage to Microsoft only if the subscription is paid (not free tier).
 */
export async function reportBuyerUsage(
  msSubscriptionId: string,
  msPlanId: string,
  dimension: MeteringDimension,
  quantity: number
): Promise<boolean> {
  try {
    // Don't report usage for free tier or beta users
    if (!msSubscriptionId || !msPlanId) {
      console.log("[Metering API] Skipping usage report (free tier or beta user)");
      return true;
    }

    // Create usage event
    const event: UsageEvent = {
      resourceId: msSubscriptionId,
      quantity: Math.floor(quantity), // Must be integer
      dimension,
      effectiveStartTime: new Date().toISOString(),
      planId: msPlanId,
    };

    // Report to Microsoft
    const result = await reportUsageEvent(event);

    if (!result) {
      console.error("[Metering API] Failed to report usage");
      return false;
    }

    if (result.status !== "Accepted") {
      console.error("[Metering API] Usage event rejected:", result.status);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[Metering API] Error reporting buyer usage:", error);
    return false;
  }
}

/**
 * Generate unique request ID for API calls
 */
function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Generate correlation ID for tracking related API calls
 */
function generateCorrelationId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Get overage rates for metered dimensions
 * 
 * These rates are charged when customers exceed their plan's included usage.
 * Rates are defined in Partner Center and must match exactly.
 */
export const OVERAGE_RATES: Record<MeteringDimension, number> = {
  rfq_submissions: 15.00, // $15 per RFQ over limit
  ai_queries: 0.50, // $0.50 per query over limit
  swap_analyses: 2.00, // $2 per analysis over limit
  ccps_exports: 3.00, // $3 per export over limit
  material_comparisons: 0.00, // No overage (Premium = unlimited)
};

/**
 * Calculate overage cost for a dimension
 */
export function calculateOverageCost(
  dimension: MeteringDimension,
  quantity: number
): number {
  const rate = OVERAGE_RATES[dimension];
  return rate * quantity;
}
