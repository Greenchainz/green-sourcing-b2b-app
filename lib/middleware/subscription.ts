import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { getUserTier, canAccessFeature } from "@/lib/greenchainz";
import { getEasyAuthUser } from "@/lib/auth/easy-auth";

const pool = getPool();

export interface SubscriptionContext {
  userId: string;
  tier: "free" | "standard" | "premium";
  features: string[];
}

/**
 * Middleware to check if user has access to a feature based on their subscription tier
 */
export async function requireSubscription(
  request: NextRequest,
  requiredTier: "free" | "standard" | "premium",
  feature?: string
): Promise<{ authorized: boolean; context?: SubscriptionContext; error?: string }> {
  try {
    const user = getEasyAuthUser(request.headers);
    if (!user) {
      return {
        authorized: false,
        error: "Unauthorized",
      };
    }
    const userId = user.id;

    // Get user's subscription tier
    const tier = await getUserTier(userId);

    // Check if user can access the feature
    if (feature && !canAccessFeature(tier, feature)) {
      return {
        authorized: false,
        error: `This feature requires ${requiredTier} tier or higher`,
      };
    }

    // Check tier hierarchy
    const tierHierarchy = { free: 0, standard: 1, premium: 2 };
    if (tierHierarchy[tier] < tierHierarchy[requiredTier]) {
      return {
        authorized: false,
        error: `This endpoint requires ${requiredTier} tier or higher. You are on ${tier} tier.`,
      };
    }

    return {
      authorized: true,
      context: {
        userId,
        tier,
        features: getFeaturesByTier(tier),
      },
    };
  } catch (error) {
    console.error("[Subscription Middleware] Error:", error);
    return {
      authorized: false,
      error: "Failed to verify subscription",
    };
  }
}

/**
 * Get features available for a tier
 */
function getFeaturesByTier(tier: "free" | "standard" | "premium"): string[] {
  const features: Record<string, string[]> = {
    free: ["basic_search", "view_materials", "limited_rfqs"],
    standard: [
      "basic_search",
      "view_materials",
      "limited_rfqs",
      "advanced_search",
      "ccps_scoring",
      "supplier_matching",
      "messaging",
    ],
    premium: [
      "basic_search",
      "view_materials",
      "limited_rfqs",
      "advanced_search",
      "ccps_scoring",
      "supplier_matching",
      "messaging",
      "priority_matching",
      "unlimited_rfqs",
      "ai_assistant",
      "analytics_dashboard",
      "api_access",
    ],
  };

  return features[tier] || features.free;
}

/**
 * Rate limiting based on subscription tier
 */
export async function checkRateLimit(
  userId: string,
  endpoint: string,
  tier: "free" | "standard" | "premium"
): Promise<{ allowed: boolean; remaining?: number; resetAt?: Date }> {
  try {
    // Define rate limits per tier (requests per hour)
    const rateLimits: Record<string, Record<string, number>> = {
      free: { default: 100, rfq_create: 5, material_search: 50 },
      standard: { default: 500, rfq_create: 50, material_search: 200 },
      premium: { default: 10000, rfq_create: 1000, material_search: 5000 },
    };

    const limit = rateLimits[tier][endpoint] || rateLimits[tier].default;

    // Check usage in the last hour
    const result = await pool.query(
      `SELECT COUNT(*) as count 
       FROM usage_tracking 
       WHERE user_id = $1 
         AND endpoint = $2 
         AND created_at > NOW() - INTERVAL '1 hour'`,
      [userId, endpoint]
    );

    const currentUsage = parseInt(result.rows[0]?.count || "0");
    const remaining = Math.max(0, limit - currentUsage);

    if (currentUsage >= limit) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(Date.now() + 3600000), // 1 hour from now
      };
    }

    return {
      allowed: true,
      remaining,
      resetAt: new Date(Date.now() + 3600000),
    };
  } catch (error) {
    console.error("[Rate Limit] Error:", error);
    // Fail open - allow the request if rate limiting check fails
    return { allowed: true };
  }
}

/**
 * Helper to create a 403 Forbidden response for subscription issues
 */
export function createSubscriptionErrorResponse(message: string, tier?: string) {
  return NextResponse.json(
    {
      error: message,
      upgrade_required: true,
      current_tier: tier,
      upgrade_url: "/pricing",
    },
    { status: 403 }
  );
}

/**
 * Helper to create a 429 Too Many Requests response for rate limiting
 */
export function createRateLimitErrorResponse(
  remaining: number,
  resetAt: Date,
  tier: string
) {
  return NextResponse.json(
    {
      error: "Rate limit exceeded",
      rate_limit: {
        remaining,
        reset_at: resetAt.toISOString(),
        current_tier: tier,
      },
      upgrade_url: "/pricing",
    },
    {
      status: 429,
      headers: {
        "X-RateLimit-Remaining": remaining.toString(),
        "X-RateLimit-Reset": resetAt.toISOString(),
      },
    }
  );
}
