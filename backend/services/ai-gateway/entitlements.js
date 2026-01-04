/**
 * AI Gateway - Tier Entitlements & Quota Management
 *
 * Enforces tier-based access control and usage quotas for AI workflows.
 * Supports: free, pro, enterprise, admin tiers
 */

const { pool } = require("../../db");
const monitoring = require("../azure/monitoring");

// Tier hierarchy (higher number = more access)
// Note: "Standard" tier = "pro", "Premium" tier = "enterprise"
const TIER_LEVELS = {
  free: 1,
  standard: 2, // Alias for pro
  pro: 2,
  premium: 3, // Alias for enterprise
  enterprise: 3,
  admin: 4,
};

// Tier name normalization (for display and consistency)
const TIER_DISPLAY_NAMES = {
  free: "Free",
  pro: "Standard",
  standard: "Standard",
  enterprise: "Premium",
  premium: "Premium",
  admin: "Admin",
};

/**
 * Normalize tier name to internal format
 */
function normalizeTier(tier) {
  const normalized = (tier || "free").toLowerCase();
  // Map aliases to internal names
  if (normalized === "standard") return "pro";
  if (normalized === "premium") return "enterprise";
  return normalized;
}

// Default quotas per tier (per billing period - monthly)
const DEFAULT_QUOTAS = {
  free: {
    callsPerMonth: 50,
    tokensPerMonth: 50000,
    maxConcurrentCalls: 1,
  },
  pro: {
    callsPerMonth: 500,
    tokensPerMonth: 500000,
    maxConcurrentCalls: 5,
  },
  enterprise: {
    callsPerMonth: 5000,
    tokensPerMonth: 5000000,
    maxConcurrentCalls: 20,
  },
  admin: {
    callsPerMonth: -1, // unlimited
    tokensPerMonth: -1,
    maxConcurrentCalls: 50,
  },
};

// Feature flags per tier
const TIER_FEATURES = {
  free: {
    canUseAI: true,
    canCacheResults: true,
    canAccessCompliance: true,
    canAccessAlternatives: true,
    canAccessCarbon: true,
    canAccessCertifications: false,
    canAccessDocumentAI: false,
    canAccessRFQAssist: false,
    canSendIntercomDrafts: false,
    canApproveDrafts: false,
  },
  pro: {
    canUseAI: true,
    canCacheResults: true,
    canAccessCompliance: true,
    canAccessAlternatives: true,
    canAccessCarbon: true,
    canAccessCertifications: true,
    canAccessDocumentAI: true,
    canAccessRFQAssist: true,
    canSendIntercomDrafts: false,
    canApproveDrafts: false,
  },
  enterprise: {
    canUseAI: true,
    canCacheResults: true,
    canAccessCompliance: true,
    canAccessAlternatives: true,
    canAccessCarbon: true,
    canAccessCertifications: true,
    canAccessDocumentAI: true,
    canAccessRFQAssist: true,
    canSendIntercomDrafts: true, // Premium only
    canApproveDrafts: false,
  },
  admin: {
    canUseAI: true,
    canCacheResults: true,
    canAccessCompliance: true,
    canAccessAlternatives: true,
    canAccessCarbon: true,
    canAccessCertifications: true,
    canAccessDocumentAI: true,
    canAccessRFQAssist: true,
    canSendIntercomDrafts: true,
    canApproveDrafts: true, // Legal Guardian capability
  },
};

/**
 * Get user's current tier from database
 */
async function getUserTier(userId) {
  try {
    // Check subscription first
    const subResult = await pool.query(
      `
            SELECT sp.PlanType 
            FROM User_Subscriptions us
            JOIN Subscription_Plans sp ON us.PlanID = sp.PlanID
            WHERE us.UserID = $1 AND us.Status = 'active'
            ORDER BY us.CreatedAt DESC LIMIT 1
        `,
      [userId]
    );

    if (subResult.rows.length > 0) {
      return subResult.rows[0].plantype.toLowerCase();
    }

    // Check if user is admin
    const userResult = await pool.query(
      "SELECT Role FROM Users WHERE UserID = $1",
      [userId]
    );

    if (userResult.rows.length > 0 && userResult.rows[0].role === "Admin") {
      return "admin";
    }

    return "free";
  } catch (error) {
    console.error("Error getting user tier:", error.message);
    return "free";
  }
}

/**
 * Check if user tier can access a workflow
 */
function canAccessWorkflow(userTier, workflowMinTier) {
  const userLevel = TIER_LEVELS[userTier] || 1;
  const requiredLevel = TIER_LEVELS[workflowMinTier] || 1;
  return userLevel >= requiredLevel;
}

/**
 * Get workflow rate limit for user's tier
 */
async function getWorkflowRateLimit(workflowId, userTier) {
  try {
    const result = await pool.query(
      `
            SELECT FreeTierLimit, ProTierLimit, EnterpriseTierLimit
            FROM AI_Workflows WHERE WorkflowID = $1
        `,
      [workflowId]
    );

    if (result.rows.length === 0) {
      return 0;
    }

    const workflow = result.rows[0];
    switch (userTier) {
      case "admin":
        return -1; // unlimited
      case "enterprise":
        return workflow.enterprisetierlimit;
      case "pro":
        return workflow.protierlimit;
      default:
        return workflow.freetierlimit;
    }
  } catch (error) {
    console.error("Error getting workflow rate limit:", error.message);
    return 0;
  }
}

/**
 * Get or create user quota record
 */
async function getUserQuota(userId) {
  try {
    // Try to get existing quota
    let result = await pool.query(
      "SELECT * FROM AI_User_Quotas WHERE UserID = $1",
      [userId]
    );

    if (result.rows.length === 0) {
      // Create new quota record
      const tier = await getUserTier(userId);
      const periodStart = new Date();
      const periodEnd = new Date(periodStart);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      result = await pool.query(
        `
                INSERT INTO AI_User_Quotas (UserID, Tier, PeriodStartsAt, PeriodEndsAt)
                VALUES ($1, $2, $3, $4)
                RETURNING *
            `,
        [userId, tier, periodStart, periodEnd]
      );
    }

    return result.rows[0];
  } catch (error) {
    console.error("Error getting user quota:", error.message);
    return null;
  }
}

/**
 * Check and update quota for a call
 * Returns { allowed: boolean, remaining: number, resetAt: Date, reason?: string }
 */
async function checkAndUpdateQuota(userId, tokensUsed = 0) {
  try {
    const quota = await getUserQuota(userId);
    if (!quota) {
      return { allowed: false, remaining: 0, reason: "quota_error" };
    }

    const tier = quota.tier;
    const limits = DEFAULT_QUOTAS[tier] || DEFAULT_QUOTAS.free;

    // Check if period has expired
    if (new Date(quota.periodendsAt) < new Date()) {
      // Reset quota for new period
      const periodStart = new Date();
      const periodEnd = new Date(periodStart);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      await pool.query(
        `
                UPDATE AI_User_Quotas 
                SET PeriodStartsAt = $1, PeriodEndsAt = $2, CallsUsed = 0, TokensUsed = 0, UpdatedAt = NOW()
                WHERE UserID = $3
            `,
        [periodStart, periodEnd, userId]
      );

      quota.callsused = 0;
      quota.tokensused = 0;
      quota.periodendsat = periodEnd;
    }

    // Check limits (admin has unlimited)
    if (tier !== "admin") {
      const callLimit = quota.customcalllimit || limits.callsPerMonth;
      const tokenLimit = quota.customtokenlimit || limits.tokensPerMonth;

      if (quota.callsused >= callLimit) {
        monitoring.trackEvent("AIGateway_QuotaExceeded", {
          userId: String(userId),
          tier,
          type: "calls",
        });
        return {
          allowed: false,
          remaining: 0,
          resetAt: quota.periodendsat,
          reason: "call_limit_exceeded",
        };
      }

      if (tokensUsed > 0 && quota.tokensused + tokensUsed > tokenLimit) {
        monitoring.trackEvent("AIGateway_QuotaExceeded", {
          userId: String(userId),
          tier,
          type: "tokens",
        });
        return {
          allowed: false,
          remaining: 0,
          resetAt: quota.periodendsat,
          reason: "token_limit_exceeded",
        };
      }
    }

    // Update usage
    await pool.query(
      `
            UPDATE AI_User_Quotas 
            SET CallsUsed = CallsUsed + 1, TokensUsed = TokensUsed + $1, UpdatedAt = NOW()
            WHERE UserID = $2
        `,
      [tokensUsed, userId]
    );

    const remaining =
      tier === "admin" ? -1 : limits.callsPerMonth - quota.callsused - 1;

    return {
      allowed: true,
      remaining,
      resetAt: quota.periodendsat,
      tier,
    };
  } catch (error) {
    console.error("Error checking quota:", error.message);
    monitoring.trackException(error, {
      context: "checkAndUpdateQuota",
      userId: String(userId),
    });
    return { allowed: false, remaining: 0, reason: "quota_check_error" };
  }
}

/**
 * Get full entitlements for a user
 */
async function getEntitlements(userId) {
  const tier = await getUserTier(userId);
  const quota = await getUserQuota(userId);
  const features = TIER_FEATURES[tier] || TIER_FEATURES.free;
  const limits = DEFAULT_QUOTAS[tier] || DEFAULT_QUOTAS.free;

  return {
    tier,
    features,
    quota: {
      callsUsed: quota?.callsused || 0,
      callsLimit: limits.callsPerMonth,
      tokensUsed: quota?.tokensused || 0,
      tokensLimit: limits.tokensPerMonth,
      periodEndsAt: quota?.periodendsat,
      remaining:
        tier === "admin"
          ? -1
          : Math.max(0, limits.callsPerMonth - (quota?.callsused || 0)),
    },
  };
}

/**
 * Check if user is a Legal Guardian (can approve AI messages)
 */
async function isLegalGuardian(userId) {
  try {
    const result = await pool.query(
      "SELECT * FROM AI_Legal_Guardians WHERE UserID = $1",
      [userId]
    );
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error("Error checking legal guardian status:", error.message);
    return null;
  }
}

/**
 * Check if user can send Intercom messages (Premium + not opted out)
 */
async function canSendIntercomMessages(userId) {
  try {
    const tier = await getUserTier(userId);
    const features = TIER_FEATURES[tier];

    if (!features.canSendIntercomDrafts) {
      return { allowed: false, reason: "tier_restricted" };
    }

    // Check if user company has opt-out
    // (For sending TO users, we check target user opt-out separately)
    return { allowed: true };
  } catch (error) {
    console.error("Error checking Intercom send permission:", error.message);
    return { allowed: false, reason: "permission_check_error" };
  }
}

/**
 * Set supplier tier explicitly (e.g. from Subscription Service)
 * This updates the user's/supplier's cached or stored tier in entitlements system if needed.
 *
 * In this implementation, entitlements reads from User_Subscriptions or Role.
 * Since we added Supplier_Subscriptions separately, we should make getUserTier check that too.
 * But for now, we'll just allow setting the legacy entitlements if they exist, or just log it.
 *
 * Ideally, getUserTier should be updated to check Supplier_Subscriptions as well.
 */
async function setSupplierTier(supplierId, tier) {
  // This is a placeholder for any entitlement-specific logic
  // For example, if we cache tiers in Redis, invalidate it here.
  // Or if we need to sync to a separate AuthZ service.

  // For MVP, since we updated the Suppliers table directly in the subscription service,
  // and presumably getUserTier will eventually read from there or we will use
  // a getSupplierTier function, we might not need to do much here.

  console.log(
    `[Entitlements] Tier updated for supplier ${supplierId} to ${tier}`
  );
  return true;
}

module.exports = {
  TIER_LEVELS,
  TIER_DISPLAY_NAMES,
  DEFAULT_QUOTAS,
  TIER_FEATURES,
  normalizeTier,
  getUserTier,
  canAccessWorkflow,
  getWorkflowRateLimit,
  getUserQuota,
  checkAndUpdateQuota,
  getEntitlements,
  isLegalGuardian,
  canSendIntercomMessages,
  setSupplierTier,
};
