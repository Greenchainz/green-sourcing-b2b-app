/**
 * GreenChainz Subscription & Tier Management Service
 *
 * Manages buyer and supplier subscription tiers (Free / Standard / Premium),
 * feature gating, and integration with Microsoft AppSource billing.
 *
 * Tier limits define monthly usage caps per feature dimension.
 * Beta users automatically get premium access.
 *
 * Ported from Manus prototype. Uses PostgreSQL via lib/db.ts.
 */
import { query, queryOne } from "../../db";

// ─── Tier Limits ─────────────────────────────────────────────────────────────

export const TIER_LIMITS = {
  buyer: {
    free: {
      rfqsPerMonth: 3,
      aiQueriesPerMonth: 10,
      swapAnalysesPerMonth: 5,
      ccpsExportsPerMonth: 3,
      materialComparisonsPerMonth: 20,
      features: {
        rfqSubmission: true,
        materialSearch: true,
        basicComparison: true,
        ccpsScoring: true,
        aiAssistant: true,
        advancedFilters: false,
        exportReports: false,
        supplierMessaging: false,
        prioritySupport: false,
        customWeights: false,
      },
    },
    standard: {
      rfqsPerMonth: 15,
      aiQueriesPerMonth: 100,
      swapAnalysesPerMonth: 50,
      ccpsExportsPerMonth: 25,
      materialComparisonsPerMonth: 200,
      features: {
        rfqSubmission: true,
        materialSearch: true,
        basicComparison: true,
        ccpsScoring: true,
        aiAssistant: true,
        advancedFilters: true,
        exportReports: true,
        supplierMessaging: true,
        prioritySupport: false,
        customWeights: true,
      },
    },
    premium: {
      rfqsPerMonth: -1, // unlimited
      aiQueriesPerMonth: -1,
      swapAnalysesPerMonth: -1,
      ccpsExportsPerMonth: -1,
      materialComparisonsPerMonth: -1,
      features: {
        rfqSubmission: true,
        materialSearch: true,
        basicComparison: true,
        ccpsScoring: true,
        aiAssistant: true,
        advancedFilters: true,
        exportReports: true,
        supplierMessaging: true,
        prioritySupport: true,
        customWeights: true,
      },
    },
  },
  supplier: {
    free: {
      bidsPerMonth: 5,
      messageThreads: 3,
      features: {
        receiverRfqs: true,
        submitBids: true,
        basicProfile: true,
        messaging: false,
        analytics: false,
        priorityMatching: false,
        exclusiveWindow: false,
        verifiedBadge: false,
      },
    },
    premium: {
      bidsPerMonth: -1, // unlimited
      messageThreads: -1,
      features: {
        receiverRfqs: true,
        submitBids: true,
        basicProfile: true,
        messaging: true,
        analytics: true,
        priorityMatching: true,
        exclusiveWindow: true,
        verifiedBadge: true,
      },
    },
  },
};

// ─── Subscription Queries ────────────────────────────────────────────────────

export async function getBuyerSubscription(userId: number) {
  return queryOne<any>(
    "SELECT * FROM buyer_subscriptions WHERE user_id = $1 LIMIT 1",
    [userId]
  );
}

export async function getSupplierSubscription(supplierId: number) {
  return queryOne<any>(
    "SELECT * FROM supplier_subscriptions WHERE supplier_id = $1 LIMIT 1",
    [supplierId]
  );
}

export async function createBuyerSubscription(
  userId: number,
  tier: "free" | "standard" | "premium" = "free",
  isBeta: boolean = false
) {
  const maxSeats = tier === "premium" ? 10 : tier === "standard" ? 3 : 1;
  await query(
    `INSERT INTO buyer_subscriptions (user_id, tier, status, is_beta, max_seats, created_at, updated_at)
     VALUES ($1, $2, 'active', $3, $4, NOW(), NOW())
     ON CONFLICT (user_id) DO UPDATE SET tier = $2, is_beta = $3, max_seats = $4, updated_at = NOW()`,
    [userId, tier, isBeta, maxSeats]
  );
}

export async function upgradeBuyerSubscription(
  userId: number,
  newTier: "standard" | "premium",
  msSubscriptionId?: string,
  msPlanId?: string
) {
  const maxSeats = newTier === "premium" ? 10 : 3;
  await query(
    `UPDATE buyer_subscriptions
     SET tier = $1, ms_subscription_id = $2, ms_plan_id = $3,
         status = 'active', max_seats = $4, updated_at = NOW()
     WHERE user_id = $5`,
    [newTier, msSubscriptionId ?? null, msPlanId ?? null, maxSeats, userId]
  );
}

export async function upgradeSupplierSubscription(
  supplierId: number,
  msSubscriptionId?: string,
  msPlanId?: string
) {
  await query(
    `UPDATE supplier_subscriptions
     SET tier = 'premium', ms_subscription_id = $1, ms_plan_id = $2,
         status = 'active', updated_at = NOW()
     WHERE supplier_id = $3`,
    [msSubscriptionId ?? null, msPlanId ?? null, supplierId]
  );
}

export async function cancelBuyerSubscription(userId: number) {
  await query(
    "UPDATE buyer_subscriptions SET status = 'canceled', updated_at = NOW() WHERE user_id = $1",
    [userId]
  );
}

export async function cancelSupplierSubscription(supplierId: number) {
  await query(
    "UPDATE supplier_subscriptions SET status = 'canceled', updated_at = NOW() WHERE supplier_id = $1",
    [supplierId]
  );
}

// ─── Feature Gating ─────────────────────────────────────────────────────────

export async function checkBuyerFeatureAccess(
  userId: number,
  feature: keyof typeof TIER_LIMITS.buyer.free.features
): Promise<boolean> {
  const subscription = await getBuyerSubscription(userId);

  if (!subscription) {
    return TIER_LIMITS.buyer.free.features[feature];
  }

  // Beta users get premium access
  if (subscription.is_beta) {
    return TIER_LIMITS.buyer.premium.features[feature];
  }

  // Canceled/suspended users get free limits
  if (subscription.status === "canceled" || subscription.status === "suspended") {
    return TIER_LIMITS.buyer.free.features[feature];
  }

  // Check trial expiration
  if (subscription.status === "trial" && subscription.trial_ends_at) {
    if (new Date() > new Date(subscription.trial_ends_at)) {
      return TIER_LIMITS.buyer.free.features[feature];
    }
  }

  const tier = (subscription.tier as "free" | "standard" | "premium") || "free";
  return TIER_LIMITS.buyer[tier].features[feature];
}

export async function checkSupplierFeatureAccess(
  supplierId: number,
  feature: keyof typeof TIER_LIMITS.supplier.free.features
): Promise<boolean> {
  const subscription = await getSupplierSubscription(supplierId);

  if (!subscription) {
    return TIER_LIMITS.supplier.free.features[feature];
  }

  if (subscription.is_beta) {
    return TIER_LIMITS.supplier.premium.features[feature];
  }

  if (subscription.status === "canceled" || subscription.status === "suspended") {
    return TIER_LIMITS.supplier.free.features[feature];
  }

  const tier = (subscription.tier as "free" | "premium") || "free";
  return TIER_LIMITS.supplier[tier].features[feature];
}

export async function getBuyerTierLimits(userId: number) {
  const subscription = await getBuyerSubscription(userId);

  if (!subscription) return TIER_LIMITS.buyer.free;
  if (subscription.is_beta) return TIER_LIMITS.buyer.premium;
  if (subscription.status === "canceled" || subscription.status === "suspended") {
    return TIER_LIMITS.buyer.free;
  }
  if (subscription.status === "trial" && subscription.trial_ends_at) {
    if (new Date() > new Date(subscription.trial_ends_at)) {
      return TIER_LIMITS.buyer.free;
    }
  }

  const tier = (subscription.tier as "free" | "standard" | "premium") || "free";
  return TIER_LIMITS.buyer[tier];
}

export async function getSupplierTierLimits(supplierId: number) {
  const subscription = await getSupplierSubscription(supplierId);

  if (!subscription) return TIER_LIMITS.supplier.free;
  if (subscription.is_beta) return TIER_LIMITS.supplier.premium;
  if (subscription.status === "canceled" || subscription.status === "suspended") {
    return TIER_LIMITS.supplier.free;
  }

  const tier = (subscription.tier as "free" | "premium") || "free";
  return TIER_LIMITS.supplier[tier];
}
