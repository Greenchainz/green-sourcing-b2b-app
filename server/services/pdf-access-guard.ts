/**
 * PDF Access Guard
 *
 * Enforces server-side entitlement checks before generating PDFs.
 * Prevents authenticated users from bypassing paywall by calling
 * PDF endpoints directly, without going through the tRPC credit layer.
 */

import { checkBuyerFeatureAccess } from "../subscription-service";

export interface PdfAccessResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Check whether a user is entitled to download a Material Credit Score PDF.
 *
 * Free-tier users (no subscription, canceled, or suspended) do NOT have
 * access to `exportData`, which gates PDF downloads.
 * Standard and Premium users do.
 * Beta users always get Premium access via checkBuyerFeatureAccess.
 */
export async function checkMaterialScorePdfAccess(
  userId: number
): Promise<PdfAccessResult> {
  try {
    const hasAccess = await checkBuyerFeatureAccess(userId, "exportData");
    if (!hasAccess) {
      return {
        allowed: false,
        reason:
          "Material Credit Score PDF downloads require a Standard or Premium plan. Upgrade at /subscription.",
      };
    }
    return { allowed: true };
  } catch (err) {
    // If the subscription check itself fails, fail closed (deny access)
    // so a DB outage doesn't open the paywall.
    console.error("[pdf-access-guard] Subscription check failed:", err);
    return {
      allowed: false,
      reason: "Unable to verify subscription status. Please try again.",
    };
  }
}
