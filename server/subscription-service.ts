import { eq, and, gte } from "drizzle-orm";
import { getDb } from "./db";
import { buyerSubscriptions, supplierSubscriptions, users, suppliers } from "../drizzle/schema";

// ─── Tier Limits ────────────────────────────────────────────────────────────

export const TIER_LIMITS = {
  buyer: {
    free: {
      rfqsPerMonth: 0,
      aiQueriesPerMonth: 10,
      swapAnalysesPerMonth: 5,
      ccpsExportsPerMonth: 3,
      materialComparisonsPerMonth: 10,
      maxSeats: 1,
      features: {
        materialCatalog: true,
        ccpsScoring: true,
        basicSearch: true,
        materialDetail: true,
        assemblies: true,
        aiChat: false,
        rfqSubmission: false,
        bidComparison: false,
        realTimeMessaging: false,
        swapRecommendations: false,
        apiAccess: false,
        exportData: false,
      },
    },
    standard: {
      rfqsPerMonth: 5,
      aiQueriesPerMonth: 25,
      swapAnalysesPerMonth: 20,
      ccpsExportsPerMonth: 10,
      materialComparisonsPerMonth: 50,
      maxSeats: 3,
      features: {
        materialCatalog: true,
        ccpsScoring: true,
        basicSearch: true,
        materialDetail: true,
        assemblies: true,
        aiChat: true,
        rfqSubmission: true,
        bidComparison: true,
        realTimeMessaging: true,
        swapRecommendations: true,
        apiAccess: false,
        exportData: true,
      },
    },
    premium: {
      rfqsPerMonth: -1, // Unlimited
      aiQueriesPerMonth: -1, // Unlimited
      swapAnalysesPerMonth: -1, // Unlimited
      ccpsExportsPerMonth: -1, // Unlimited
      materialComparisonsPerMonth: -1, // Unlimited
      maxSeats: 10,
      features: {
        materialCatalog: true,
        ccpsScoring: true,
        basicSearch: true,
        materialDetail: true,
        assemblies: true,
        aiChat: true,
        rfqSubmission: true,
        bidComparison: true,
        realTimeMessaging: true,
        swapRecommendations: true,
        apiAccess: true,
        exportData: true,
      },
    },
  },
  supplier: {
    free: {
      rfqVisibility: "limited", // Only see RFQs matching their filters
      bidsPerMonth: 3,
      messageThreads: 2,
      features: {
        profileListing: true,
        rfqBrowsing: true,
        bidSubmission: true,
        basicMessaging: true,
        verifiedBadge: false,
        priorityRfqAccess: false,
        bidAnalytics: false,
        apiAccess: false,
      },
    },
    premium: {
      rfqVisibility: "full", // See all RFQs before competitors
      bidsPerMonth: -1, // Unlimited
      messageThreads: -1, // Unlimited
      features: {
        profileListing: true,
        rfqBrowsing: true,
        bidSubmission: true,
        basicMessaging: true,
        verifiedBadge: true,
        priorityRfqAccess: true, // 24h head start on RFQs
        bidAnalytics: true,
        apiAccess: true,
      },
    },
  },
};

// ─── Subscription Service ───────────────────────────────────────────────────

export async function getBuyerSubscription(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const [subscription] = await db
    .select()
    .from(buyerSubscriptions)
    .where(eq(buyerSubscriptions.userId, userId))
    .limit(1);

  return subscription || null;
}

export async function getSupplierSubscription(supplierId: number) {
  const db = await getDb();
  if (!db) return null;
  const [subscription] = await db
    .select()
    .from(supplierSubscriptions)
    .where(eq(supplierSubscriptions.supplierId, supplierId))
    .limit(1);

  return subscription || null;
}

export async function createBuyerSubscription(
  userId: number,
  tier: "free" | "standard" | "premium",
  options?: {
    msSubscriptionId?: string;
    msPlanId?: string;
    isBeta?: boolean;
    trialEndsAt?: Date;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  const maxSeats = tier === "premium" ? 10 : tier === "standard" ? 3 : 1;

  const [result] = await db.insert(buyerSubscriptions).values({
    userId,
    tier,
    msSubscriptionId: options?.msSubscriptionId || null,
    msPlanId: options?.msPlanId || null,
    status: options?.trialEndsAt ? "trial" : "active",
    isBeta: options?.isBeta ? 1 : 0,
    trialEndsAt: options?.trialEndsAt || undefined,
    maxSeats,
  });

  return result.insertId;
}

export async function createSupplierSubscription(
  supplierId: number,
  tier: "free" | "premium",
  options?: {
    msSubscriptionId?: string;
    msPlanId?: string;
    isBeta?: boolean;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const [result] = await db.insert(supplierSubscriptions).values({
    supplierId,
    tier,
    msSubscriptionId: options?.msSubscriptionId || null,
    msPlanId: options?.msPlanId || null,
    status: "active",
    isBeta: options?.isBeta ? 1 : 0,
  });

  return result.insertId;
}

export async function upgradeBuyerSubscription(
  userId: number,
  newTier: "standard" | "premium",
  msSubscriptionId?: string,
  msPlanId?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");
  const maxSeats = newTier === "premium" ? 10 : 3;

  await db
    .update(buyerSubscriptions)
    .set({
      tier: newTier,
      msSubscriptionId: msSubscriptionId || null,
      msPlanId: msPlanId || null,
      status: "active",
      maxSeats,
      updatedAt: new Date(),
    })
    .where(eq(buyerSubscriptions.userId, userId));
}

export async function upgradeSupplierSubscription(
  supplierId: number,
  msSubscriptionId?: string,
  msPlanId?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  await db
    .update(supplierSubscriptions)
    .set({
      tier: "premium",
      msSubscriptionId: msSubscriptionId || null,
      msPlanId: msPlanId || null,
      status: "active",
      updatedAt: new Date(),
    })
    .where(eq(supplierSubscriptions.supplierId, supplierId));
}

export async function cancelBuyerSubscription(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  await db
    .update(buyerSubscriptions)
    .set({
      status: "canceled",
      updatedAt: new Date(),
    })
    .where(eq(buyerSubscriptions.userId, userId));
}

export async function cancelSupplierSubscription(supplierId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  await db
    .update(supplierSubscriptions)
    .set({
      status: "canceled",
      updatedAt: new Date(),
    })
    .where(eq(supplierSubscriptions.supplierId, supplierId));
}

// ─── Feature Gating ─────────────────────────────────────────────────────────

export async function checkBuyerFeatureAccess(
  userId: number,
  feature: keyof typeof TIER_LIMITS.buyer.free.features
): Promise<boolean> {
  const subscription = await getBuyerSubscription(userId);
  
  if (!subscription) {
    // No subscription = free tier
    return TIER_LIMITS.buyer.free.features[feature];
  }

  // Beta users get premium access
  if (subscription.isBeta === 1) {
    return TIER_LIMITS.buyer.premium.features[feature];
  }

  // Check subscription status
  if (subscription.status === "canceled" || subscription.status === "suspended") {
    return TIER_LIMITS.buyer.free.features[feature];
  }

  // Check trial expiration
  if (subscription.status === "trial" && subscription.trialEndsAt) {
    const now = new Date();
    if (now > subscription.trialEndsAt) {
      return TIER_LIMITS.buyer.free.features[feature];
    }
  }

  // Return feature access based on tier
  const tier = subscription.tier as "free" | "standard" | "premium";
  return TIER_LIMITS.buyer[tier].features[feature];
}

export async function checkSupplierFeatureAccess(
  supplierId: number,
  feature: keyof typeof TIER_LIMITS.supplier.free.features
): Promise<boolean> {
  const subscription = await getSupplierSubscription(supplierId);
  
  if (!subscription) {
    // No subscription = free tier
    return TIER_LIMITS.supplier.free.features[feature];
  }

  // Beta users get premium access
  if (subscription.isBeta === 1) {
    return TIER_LIMITS.supplier.premium.features[feature];
  }

  // Check subscription status
  if (subscription.status === "canceled" || subscription.status === "suspended") {
    return TIER_LIMITS.supplier.free.features[feature];
  }

  // Return feature access based on tier
  const tier = subscription.tier as "free" | "premium";
  return TIER_LIMITS.supplier[tier].features[feature];
}

export async function getBuyerTierLimits(userId: number) {
  const subscription = await getBuyerSubscription(userId);
  
  if (!subscription) {
    return TIER_LIMITS.buyer.free;
  }

  // Beta users get premium limits
  if (subscription.isBeta === 1) {
    return TIER_LIMITS.buyer.premium;
  }

  // Canceled/suspended users get free limits
  if (subscription.status === "canceled" || subscription.status === "suspended") {
    return TIER_LIMITS.buyer.free;
  }

  // Check trial expiration
  if (subscription.status === "trial" && subscription.trialEndsAt) {
    const now = new Date();
    if (now > subscription.trialEndsAt) {
      return TIER_LIMITS.buyer.free;
    }
  }

  const tier = subscription.tier as "free" | "standard" | "premium";
  return TIER_LIMITS.buyer[tier];
}

export async function getSupplierTierLimits(supplierId: number) {
  const subscription = await getSupplierSubscription(supplierId);
  
  if (!subscription) {
    return TIER_LIMITS.supplier.free;
  }

  // Beta users get premium limits
  if (subscription.isBeta === 1) {
    return TIER_LIMITS.supplier.premium;
  }

  // Canceled/suspended users get free limits
  if (subscription.status === "canceled" || subscription.status === "suspended") {
    return TIER_LIMITS.supplier.free;
  }

  const tier = subscription.tier as "free" | "premium";
  return TIER_LIMITS.supplier[tier];
}
