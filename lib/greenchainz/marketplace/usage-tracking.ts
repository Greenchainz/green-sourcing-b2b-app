/**
 * GreenChainz Usage Tracking Service
 *
 * Tracks per-user/per-supplier usage of metered features for
 * subscription tier enforcement and Microsoft Marketplace billing.
 *
 * Ported from Manus prototype. Uses PostgreSQL via lib/db.ts.
 */
import { query, queryOne, queryMany } from "../../db";
import { getBuyerTierLimits, getSupplierTierLimits } from "./subscription-service";

// ─── Track Usage ─────────────────────────────────────────────────────────────

/**
 * Track buyer usage for a specific dimension.
 * Upserts into the usage_tracking table for the current billing period.
 */
export async function trackBuyerUsage(
  userId: number,
  dimension: string,
  quantity: number = 1
): Promise<void> {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // Upsert: increment if exists, insert if not
  await query(
    `INSERT INTO usage_tracking (user_id, dimension, quantity, period_start, period_end, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (user_id, dimension, period_start)
     DO UPDATE SET quantity = usage_tracking.quantity + $3, updated_at = NOW()`,
    [userId, dimension, quantity, periodStart, periodEnd]
  );
}

/**
 * Track supplier usage for a specific dimension.
 */
export async function trackSupplierUsage(
  supplierId: number,
  dimension: string,
  quantity: number = 1
): Promise<void> {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  await query(
    `INSERT INTO usage_tracking (supplier_id, dimension, quantity, period_start, period_end, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (supplier_id, dimension, period_start)
     DO UPDATE SET quantity = usage_tracking.quantity + $3, updated_at = NOW()`,
    [supplierId, dimension, quantity, periodStart, periodEnd]
  );
}

// ─── Get Usage ───────────────────────────────────────────────────────────────

/**
 * Get buyer usage for current month.
 */
export async function getBuyerUsage(userId: number) {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const usage = await queryMany<any>(
    "SELECT dimension, quantity FROM usage_tracking WHERE user_id = $1 AND period_start >= $2",
    [userId, periodStart]
  );

  const usageMap: Record<string, number> = {};
  usage.forEach((record) => {
    if (record.dimension) {
      usageMap[record.dimension] = record.quantity;
    }
  });

  return {
    rfqSubmissions: usageMap["rfq_submission"] || 0,
    aiQueries: usageMap["ai_query"] || 0,
    swapAnalyses: usageMap["swap_analysis"] || 0,
    ccpsExports: usageMap["ccps_export"] || 0,
    materialComparisons: usageMap["material_comparison"] || 0,
  };
}

/**
 * Get supplier usage for current month.
 */
export async function getSupplierUsage(supplierId: number) {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const usage = await queryMany<any>(
    "SELECT dimension, quantity FROM usage_tracking WHERE supplier_id = $1 AND period_start >= $2",
    [supplierId, periodStart]
  );

  const usageMap: Record<string, number> = {};
  usage.forEach((record) => {
    if (record.dimension) {
      usageMap[record.dimension] = record.quantity;
    }
  });

  return {
    bidSubmissions: usageMap["bid_submission"] || 0,
    messageThreads: usageMap["message_thread"] || 0,
  };
}

// ─── Usage Limit Checks ─────────────────────────────────────────────────────

/**
 * Check if buyer has exceeded usage limits for a dimension.
 * Returns { allowed, current, limit }.
 */
export async function checkBuyerUsageLimit(
  userId: number,
  dimension: "rfq_submission" | "ai_query" | "swap_analysis" | "ccps_export" | "material_comparison"
): Promise<{ allowed: boolean; current: number; limit: number }> {
  const usage = await getBuyerUsage(userId);
  const limits = await getBuyerTierLimits(userId);

  let current = 0;
  let limit = -1;

  switch (dimension) {
    case "rfq_submission":
      current = usage.rfqSubmissions;
      limit = limits.rfqsPerMonth;
      break;
    case "ai_query":
      current = usage.aiQueries;
      limit = limits.aiQueriesPerMonth;
      break;
    case "swap_analysis":
      current = usage.swapAnalyses;
      limit = limits.swapAnalysesPerMonth;
      break;
    case "ccps_export":
      current = usage.ccpsExports;
      limit = limits.ccpsExportsPerMonth;
      break;
    case "material_comparison":
      current = usage.materialComparisons;
      limit = limits.materialComparisonsPerMonth;
      break;
  }

  // -1 means unlimited
  const allowed = limit === -1 || current < limit;
  return { allowed, current, limit };
}

/**
 * Check if supplier has exceeded usage limits for a dimension.
 */
export async function checkSupplierUsageLimit(
  supplierId: number,
  dimension: "bid_submission" | "message_thread"
): Promise<{ allowed: boolean; current: number; limit: number }> {
  const usage = await getSupplierUsage(supplierId);
  const limits = await getSupplierTierLimits(supplierId);

  let current = 0;
  let limit = -1;

  switch (dimension) {
    case "bid_submission":
      current = usage.bidSubmissions;
      limit = limits.bidsPerMonth;
      break;
    case "message_thread":
      current = usage.messageThreads;
      limit = limits.messageThreads;
      break;
  }

  const allowed = limit === -1 || current < limit;
  return { allowed, current, limit };
}
