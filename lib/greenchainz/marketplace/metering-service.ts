/**
 * Microsoft SaaS Accelerator - Metering API Integration
 *
 * Reports usage-based billing to Microsoft Marketplace.
 * Microsoft bills customers based on the usage we report through this API.
 *
 * Metered Dimensions (from greenchainz-pricing-strategy):
 * - rfq_submissions: RFQ submissions (5/mo Standard, unlimited Premium)
 * - ai_queries: ChainBot AI queries (25/mo Standard, unlimited Premium)
 * - swap_analyses: Material swap analyses (20/mo Standard, unlimited Premium)
 * - ccps_exports: CCPS report exports (10/mo Standard, unlimited Premium)
 * - material_comparisons: Material comparisons (50/mo Standard, unlimited Premium)
 *
 * Reference: https://learn.microsoft.com/en-us/partner-center/marketplace-offers/marketplace-metering-service-apis
 *
 * Ported from Manus prototype. Uses fetch for HTTP calls.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type MeteringDimension =
  | "rfq_submissions"
  | "ai_queries"
  | "swap_analyses"
  | "ccps_exports"
  | "material_comparisons";

export interface UsageEvent {
  resourceId: string; // Microsoft subscription ID
  quantity: number; // Usage quantity (must be integer)
  dimension: MeteringDimension;
  effectiveStartTime: string; // ISO 8601 timestamp
  planId: string; // Microsoft plan ID
}

export interface UsageEventResult {
  usageEventId: string;
  status:
    | "Accepted"
    | "Expired"
    | "Duplicate"
    | "Error"
    | "ResourceNotFound"
    | "ResourceNotAuthorized"
    | "InvalidDimension"
    | "InvalidQuantity"
    | "BadArgument";
  messageTime: string;
  resourceId: string;
  quantity: number;
  dimension: string;
  effectiveStartTime: string;
  planId: string;
}

// ─── Azure AD Token ──────────────────────────────────────────────────────────

const MARKETPLACE_API_URL =
  "https://marketplaceapi.microsoft.com/api/usageEvents?api-version=2018-08-31";

/**
 * Get an access token for the Microsoft Marketplace API.
 * Uses client credentials flow with Azure AD.
 */
async function getMarketplaceAccessToken(): Promise<string | null> {
  const tenantId = process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) {
    console.error("[Metering] Missing Azure AD credentials");
    return null;
  }

  try {
    const response = await fetch(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: clientId,
          client_secret: clientSecret,
          scope: "20e940b3-4c77-4b0b-9a53-9e16a1b010a7/.default",
        }),
      }
    );

    const data = await response.json();
    return data.access_token || null;
  } catch (error) {
    console.error("[Metering] Failed to get access token:", error);
    return null;
  }
}

// ─── Usage Reporting ─────────────────────────────────────────────────────────

/**
 * Report a single usage event to Microsoft Marketplace Metering API.
 */
export async function reportUsageEvent(
  event: UsageEvent
): Promise<UsageEventResult | null> {
  const token = await getMarketplaceAccessToken();
  if (!token) {
    console.error("[Metering] Cannot report usage — no access token");
    return null;
  }

  try {
    const response = await fetch(MARKETPLACE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[Metering] API error ${response.status}:`, errorBody);
      return null;
    }

    return (await response.json()) as UsageEventResult;
  } catch (error) {
    console.error("[Metering] Failed to report usage:", error);
    return null;
  }
}

/**
 * Report buyer usage for a specific dimension.
 */
export async function reportBuyerUsage(
  msSubscriptionId: string,
  msPlanId: string,
  dimension: MeteringDimension,
  quantity: number
): Promise<boolean> {
  const now = new Date();
  // Round to the start of the current hour (Microsoft requires hourly granularity)
  now.setMinutes(0, 0, 0);

  const result = await reportUsageEvent({
    resourceId: msSubscriptionId,
    quantity,
    dimension,
    effectiveStartTime: now.toISOString(),
    planId: msPlanId,
  });

  if (!result) return false;

  if (result.status === "Accepted") {
    console.log(
      `[Metering] Usage reported: ${dimension} = ${quantity} for ${msSubscriptionId}`
    );
    return true;
  }

  console.warn(`[Metering] Usage report status: ${result.status}`);
  return result.status === "Duplicate"; // Duplicate is OK — already reported
}
