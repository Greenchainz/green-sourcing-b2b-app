/**
 * Rate Limiting Middleware using Redis
 * 
 * This middleware implements rate limiting to prevent API abuse and ensure fair usage.
 * Uses Redis for distributed rate limiting across multiple server instances.
 * 
 * Features:
 * - Sliding window rate limiting
 * - Per-user and per-IP rate limits
 * - Custom limits for different endpoints
 * - Graceful degradation if Redis is unavailable
 * 
 * Usage:
 * ```typescript
 * import { rateLimit, RateLimitTier } from '@/lib/middleware/rate-limit';
 * 
 * export async function GET(request: Request) {
 *   const rateLimitResult = await rateLimit(request, RateLimitTier.Standard);
 *   
 *   if (!rateLimitResult.allowed) {
 *     return Response.json(
 *       { error: 'Rate limit exceeded' },
 *       { 
 *         status: 429,
 *         headers: rateLimitResult.headers 
 *       }
 *     );
 *   }
 *   
 *   // Your API logic here
 * }
 * ```
 */

import { NextRequest } from 'next/server';
import { incrementCounter, getTTL } from '../redis-managed-identity';

export interface RateLimitConfig {
  /**
   * Maximum number of requests allowed in the window
   */
  maxRequests: number;
  
  /**
   * Time window in seconds
   */
  windowSeconds: number;
  
  /**
   * Identifier for the rate limit (e.g., 'api', 'rfq', 'search')
   */
  identifier: string;
}

export interface RateLimitResult {
  /**
   * Whether the request is allowed
   */
  allowed: boolean;
  
  /**
   * Number of requests remaining in the current window
   */
  remaining: number;
  
  /**
   * Total request limit
   */
  limit: number;
  
  /**
   * Time until the rate limit resets (in seconds)
   */
  resetIn: number;
  
  /**
   * HTTP headers to include in the response
   */
  headers: Record<string, string>;
}

/**
 * Rate limit tiers based on subscription level
 */
export const RateLimitTier = {
  /**
   * Free tier: 100 requests per hour
   */
  Free: {
    maxRequests: 100,
    windowSeconds: 3600,
    identifier: 'free',
  } as RateLimitConfig,
  
  /**
   * Standard tier: 1000 requests per hour
   */
  Standard: {
    maxRequests: 1000,
    windowSeconds: 3600,
    identifier: 'standard',
  } as RateLimitConfig,
  
  /**
   * Premium tier: 10000 requests per hour
   */
  Premium: {
    maxRequests: 10000,
    windowSeconds: 3600,
    identifier: 'premium',
  } as RateLimitConfig,
  
  /**
   * Strict limits for sensitive operations (e.g., RFQ submission)
   */
  Strict: {
    maxRequests: 10,
    windowSeconds: 60,
    identifier: 'strict',
  } as RateLimitConfig,
};

/**
 * Get rate limit identifier from request (user ID or IP address)
 */
function getRateLimitIdentifier(request: NextRequest): string {
  // Try to get user ID from session/auth (implement based on your auth system)
  // For now, use IP address as fallback
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';
  
  return ip;
}

/**
 * Apply rate limiting to a request
 */
export async function rateLimit(
  request: NextRequest,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const identifier = getRateLimitIdentifier(request);
  const cacheKey = `greenchainz:ratelimit:${config.identifier}:${identifier}`;

  try {
    // Increment request counter
    const count = await incrementCounter(cacheKey, config.windowSeconds);
    
    // Get TTL for reset time
    const ttl = await getTTL(cacheKey);
    const resetIn = ttl > 0 ? ttl : config.windowSeconds;

    const allowed = count <= config.maxRequests;
    const remaining = Math.max(0, config.maxRequests - count);

    const headers = {
      'X-RateLimit-Limit': config.maxRequests.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': (Date.now() + resetIn * 1000).toString(),
    };

    if (!allowed) {
      headers['Retry-After'] = resetIn.toString();
    }

    return {
      allowed,
      remaining,
      limit: config.maxRequests,
      resetIn,
      headers,
    };
  } catch (error) {
    console.error('[RateLimit] Error:', error);
    
    // Graceful degradation: allow request if Redis fails
    return {
      allowed: true,
      remaining: config.maxRequests,
      limit: config.maxRequests,
      resetIn: config.windowSeconds,
      headers: {
        'X-RateLimit-Limit': config.maxRequests.toString(),
        'X-RateLimit-Remaining': config.maxRequests.toString(),
      },
    };
  }
}

/**
 * Middleware wrapper for rate limiting
 */
export async function withRateLimit(
  request: NextRequest,
  handler: () => Promise<Response>,
  config: RateLimitConfig
): Promise<Response> {
  const result = await rateLimit(request, config);

  if (!result.allowed) {
    return new Response(
      JSON.stringify({
        error: 'Rate limit exceeded',
        message: `You have exceeded the rate limit of ${result.limit} requests per ${config.windowSeconds} seconds. Please try again in ${result.resetIn} seconds.`,
        retryAfter: result.resetIn,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          ...result.headers,
        },
      }
    );
  }

  // Execute handler and add rate limit headers
  const response = await handler();
  
  // Add rate limit headers to response
  Object.entries(result.headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

/**
 * Get user's rate limit tier based on subscription
 */
export async function getUserRateLimitTier(userId: string): Promise<RateLimitConfig> {
  // TODO: Query user's subscription tier from database
  // For now, return Standard tier as default
  return RateLimitTier.Standard;
}

/**
 * Reset rate limit for a specific user/IP
 */
export async function resetRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<void> {
  const { deleteCache } = await import('../redis-managed-identity');
  const cacheKey = `greenchainz:ratelimit:${config.identifier}:${identifier}`;
  
  await deleteCache(cacheKey);
  console.log(`[RateLimit] Reset for ${identifier}`);
}
