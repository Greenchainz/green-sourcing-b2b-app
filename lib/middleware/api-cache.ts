/**
 * API Response Caching Middleware using Redis
 * 
 * This middleware caches API responses in Redis to reduce database load and improve performance.
 * Ideal for frequently accessed, slowly changing data like material catalogs and supplier lists.
 * 
 * Features:
 * - Automatic cache invalidation based on TTL
 * - Cache key generation based on request path and query params
 * - Conditional caching (skip for POST/PUT/DELETE)
 * - Cache warming support
 * 
 * Usage:
 * ```typescript
 * import { withCache } from '@/lib/middleware/api-cache';
 * 
 * export async function GET(request: Request) {
 *   return withCache(request, async () => {
 *     // Your API logic here
 *     return Response.json({ data });
 *   }, { ttl: 300 }); // Cache for 5 minutes
 * }
 * ```
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCache, setCache, deleteCache } from '../redis-managed-identity';

export interface CacheOptions {
  /**
   * Time to live in seconds (default: 300 = 5 minutes)
   */
  ttl?: number;
  
  /**
   * Cache key prefix (default: 'api')
   */
  prefix?: string;
  
  /**
   * Custom cache key generator
   */
  keyGenerator?: (request: NextRequest) => string;
  
  /**
   * Skip caching condition
   */
  skipCache?: (request: NextRequest) => boolean;
}

/**
 * Generate cache key from request
 */
function generateCacheKey(request: NextRequest, prefix: string = 'api'): string {
  const url = new URL(request.url);
  const path = url.pathname;
  const queryString = url.searchParams.toString();
  
  return `greenchainz:${prefix}:${path}${queryString ? `:${queryString}` : ''}`;
}

/**
 * Wrap API handler with caching logic
 */
export async function withCache<T>(
  request: NextRequest,
  handler: () => Promise<Response>,
  options: CacheOptions = {}
): Promise<Response> {
  const {
    ttl = 300,
    prefix = 'api',
    keyGenerator = (req) => generateCacheKey(req, prefix),
    skipCache = () => false,
  } = options;

  // Skip caching for non-GET requests
  if (request.method !== 'GET') {
    return handler();
  }

  // Skip caching if condition is met
  if (skipCache(request)) {
    return handler();
  }

  const cacheKey = keyGenerator(request);

  try {
    // Try to get from cache
    const cachedResponse = await getCache(cacheKey);
    
    if (cachedResponse) {
      console.log(`[Cache] HIT: ${cacheKey}`);
      const parsed = JSON.parse(cachedResponse);
      
      return new Response(parsed.body, {
        status: parsed.status,
        headers: {
          ...parsed.headers,
          'X-Cache': 'HIT',
          'X-Cache-Key': cacheKey,
        },
      });
    }

    console.log(`[Cache] MISS: ${cacheKey}`);

    // Execute handler
    const response = await handler();
    
    // Cache successful responses only
    if (response.ok) {
      const body = await response.text();
      
      const cacheData = {
        body,
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
      };

      await setCache(cacheKey, JSON.stringify(cacheData), ttl);
      console.log(`[Cache] STORED: ${cacheKey} (TTL: ${ttl}s)`);

      // Return new response with cache headers
      return new Response(body, {
        status: response.status,
        headers: {
          ...Object.fromEntries(response.headers.entries()),
          'X-Cache': 'MISS',
          'X-Cache-Key': cacheKey,
        },
      });
    }

    return response;
  } catch (error) {
    console.error('[Cache] Error:', error);
    // Fallback to handler if cache fails
    return handler();
  }
}

/**
 * Invalidate cache by pattern
 * 
 * Example: invalidateCachePattern('api:/api/materials*')
 */
export async function invalidateCachePattern(pattern: string): Promise<number> {
  const { getRedisClient } = await import('../redis-managed-identity');
  const client = await getRedisClient();
  
  const keys = await client.keys(`greenchainz:${pattern}`);
  
  if (keys.length === 0) {
    return 0;
  }

  await client.del(keys);
  console.log(`[Cache] Invalidated ${keys.length} keys matching pattern: ${pattern}`);
  
  return keys.length;
}

/**
 * Invalidate specific cache key
 */
export async function invalidateCache(cacheKey: string): Promise<void> {
  await deleteCache(`greenchainz:${cacheKey}`);
  console.log(`[Cache] Invalidated: ${cacheKey}`);
}

/**
 * Warm cache with data (pre-populate)
 */
export async function warmCache(
  cacheKey: string,
  data: any,
  ttl: number = 300
): Promise<void> {
  const cacheData = {
    body: JSON.stringify(data),
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  };

  await setCache(`greenchainz:${cacheKey}`, JSON.stringify(cacheData), ttl);
  console.log(`[Cache] Warmed: ${cacheKey} (TTL: ${ttl}s)`);
}

/**
 * Preset cache configurations for common endpoints
 */
export const CachePresets = {
  /**
   * Material catalog - cache for 5 minutes
   */
  materials: {
    ttl: 300,
    prefix: 'api',
  },
  
  /**
   * Supplier list - cache for 10 minutes
   */
  suppliers: {
    ttl: 600,
    prefix: 'api',
  },
  
  /**
   * EPD data - cache for 1 hour (rarely changes)
   */
  epd: {
    ttl: 3600,
    prefix: 'api',
  },
  
  /**
   * User profile - cache for 2 minutes
   */
  profile: {
    ttl: 120,
    prefix: 'api',
  },
  
  /**
   * Static content - cache for 24 hours
   */
  static: {
    ttl: 86400,
    prefix: 'static',
  },
};
