/**
 * Redis Cache Middleware
 * Uses Azure Cache for Redis for API response caching
 */

const redis = require('../services/azure/redis');

/**
 * Cache middleware factory
 * @param {number} ttlSeconds - Time to live in seconds (default: 5 minutes)
 * @param {function} keyGenerator - Function to generate cache key from request
 */
function cacheMiddleware(ttlSeconds = 300, keyGenerator = null) {
    return async (req, res, next) => {
        // Skip caching if Redis not connected or for non-GET requests
        if (!redis.isConnected() || req.method !== 'GET') {
            return next();
        }

        // Generate cache key
        const cacheKey = keyGenerator 
            ? keyGenerator(req)
            : `api:${req.originalUrl}`;

        try {
            // Check cache
            const cached = await redis.get(cacheKey);
            
            if (cached) {
                // Return cached response
                res.set('X-Cache', 'HIT');
                res.set('X-Cache-Key', cacheKey);
                return res.json(cached);
            }

            // Cache miss - capture response
            const originalJson = res.json.bind(res);
            
            res.json = async (data) => {
                // Don't cache error responses
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    await redis.set(cacheKey, data, ttlSeconds);
                }
                
                res.set('X-Cache', 'MISS');
                return originalJson(data);
            };

            next();
        } catch (e) {
            // If caching fails, continue without cache
            console.warn('Cache middleware error:', e.message);
            next();
        }
    };
}

/**
 * Invalidate cache for a specific pattern
 */
async function invalidateCache(pattern) {
    if (!redis.isConnected()) return 0;
    return redis.clearPattern(pattern);
}

/**
 * Cache key generators for common patterns
 */
const keyGenerators = {
    // Cache per supplier
    supplier: (req) => `api:supplier:${req.params.id}`,
    
    // Cache per product
    product: (req) => `api:product:${req.params.id}`,
    
    // Cache per user
    user: (req) => `api:user:${req.user?.userId}:${req.originalUrl}`,
    
    // Cache search results
    search: (req) => `api:search:${JSON.stringify(req.query)}`,
    
    // Cache public endpoints
    public: (req) => `api:public:${req.originalUrl}`
};

/**
 * Pre-configured cache middlewares
 */
const caches = {
    // Short cache for frequently changing data (1 minute)
    short: cacheMiddleware(60),
    
    // Medium cache for semi-static data (5 minutes)
    medium: cacheMiddleware(300),
    
    // Long cache for rarely changing data (1 hour)
    long: cacheMiddleware(3600),
    
    // Supplier profile cache (10 minutes)
    supplierProfile: cacheMiddleware(600, keyGenerators.supplier),
    
    // Product detail cache (10 minutes)
    productDetail: cacheMiddleware(600, keyGenerators.product),
    
    // Search results cache (2 minutes)
    searchResults: cacheMiddleware(120, keyGenerators.search),
    
    // User-specific cache (5 minutes)
    userSpecific: cacheMiddleware(300, keyGenerators.user)
};

module.exports = {
    cacheMiddleware,
    invalidateCache,
    keyGenerators,
    ...caches
};
