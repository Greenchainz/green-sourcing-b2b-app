import { eq, and, gte, sql } from "drizzle-orm";
import { getDb } from "./db";
import { usageTracking } from "../drizzle/schema";
import { getBuyerTierLimits, getSupplierTierLimits } from "./subscription-service";

// ─── Usage Tracking Service ─────────────────────────────────────────────────

/**
 * Track usage for a buyer (RFQs, AI queries, swap analyses, etc.)
 */
export async function trackBuyerUsage(
  userId: number,
  dimension: "rfq_submission" | "ai_query" | "swap_analysis" | "ccps_export" | "material_comparison",
  quantity: number = 1
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1); // First day of current month
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59); // Last day of current month

  // Check if usage record exists for this period
  const [existing] = await db
    .select()
    .from(usageTracking)
    .where(
      and(
        eq(usageTracking.userId, userId),
        eq(usageTracking.dimension, dimension),
        gte(usageTracking.periodStart, periodStart)
      )
    )
    .limit(1);

  if (existing) {
    // Update existing record
    await db
      .update(usageTracking)
      .set({
        quantity: existing.quantity + quantity,
        updatedAt: now,
      })
      .where(eq(usageTracking.id, existing.id));
  } else {
    // Create new record
    await db.insert(usageTracking).values({
      userId,
      dimension,
      quantity,
      periodStart,
      periodEnd,
    });
  }
}

/**
 * Track usage for a supplier (bids, message threads)
 */
export async function trackSupplierUsage(
  supplierId: number,
  dimension: "bid_submission" | "message_thread",
  quantity: number = 1
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  // Check if usage record exists for this period
  const [existing] = await db
    .select()
    .from(usageTracking)
    .where(
      and(
        eq(usageTracking.supplierId, supplierId),
        eq(usageTracking.dimension, dimension),
        gte(usageTracking.periodStart, periodStart)
      )
    )
    .limit(1);

  if (existing) {
    // Update existing record
    await db
      .update(usageTracking)
      .set({
        quantity: existing.quantity + quantity,
        updatedAt: now,
      })
      .where(eq(usageTracking.id, existing.id));
  } else {
    // Create new record
    await db.insert(usageTracking).values({
      supplierId,
      dimension,
      quantity,
      periodStart,
      periodEnd,
    });
  }
}

/**
 * Get buyer usage for current month
 */
export async function getBuyerUsage(userId: number) {
  const db = await getDb();
  if (!db) return null;

  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const usage = await db
    .select()
    .from(usageTracking)
    .where(
      and(
        eq(usageTracking.userId, userId),
        gte(usageTracking.periodStart, periodStart)
      )
    );

  // Convert to object for easy access
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
 * Get supplier usage for current month
 */
export async function getSupplierUsage(supplierId: number) {
  const db = await getDb();
  if (!db) return null;

  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const usage = await db
    .select()
    .from(usageTracking)
    .where(
      and(
        eq(usageTracking.supplierId, supplierId),
        gte(usageTracking.periodStart, periodStart)
      )
    );

  // Convert to object for easy access
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

/**
 * Check if buyer has exceeded usage limits for a dimension
 */
export async function checkBuyerUsageLimit(
  userId: number,
  dimension: "rfq_submission" | "ai_query" | "swap_analysis" | "ccps_export" | "material_comparison"
): Promise<{ allowed: boolean; current: number; limit: number }> {
  const usage = await getBuyerUsage(userId);
  const limits = await getBuyerTierLimits(userId);

  if (!usage) {
    return { allowed: true, current: 0, limit: -1 };
  }

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
 * Check if supplier has exceeded usage limits for a dimension
 */
export async function checkSupplierUsageLimit(
  supplierId: number,
  dimension: "bid_submission" | "message_thread"
): Promise<{ allowed: boolean; current: number; limit: number }> {
  const usage = await getSupplierUsage(supplierId);
  const limits = await getSupplierTierLimits(supplierId);

  if (!usage) {
    return { allowed: true, current: 0, limit: -1 };
  }

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

  // -1 means unlimited
  const allowed = limit === -1 || current < limit;

  return { allowed, current, limit };
}

/**
 * Report usage to Microsoft Marketplace Metering API
 * This should be called periodically (e.g., daily) to report usage-based billing
 */
export async function reportUsageToMicrosoft(
  msSubscriptionId: string,
  msPlanId: string,
  dimension: string,
  quantity: number,
  effectiveStartTime: Date
): Promise<void> {
  // Import metering API at runtime to avoid circular dependencies
  const { reportBuyerUsage } = await import("./marketplace-metering");
  
  // Report usage to Microsoft Marketplace
  const success = await reportBuyerUsage(
    msSubscriptionId,
    msPlanId,
    dimension as any, // Type assertion since dimension is validated elsewhere
    quantity
  );
  
  if (!success) {
    console.error(`[Metering API] Failed to report usage: ${dimension} = ${quantity} for subscription ${msSubscriptionId}`);
  }
}
