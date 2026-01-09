/**
 * Rate Limiting Middleware
 * Uses Azure Cache for Redis for distributed rate limiting
 */

const redis = require('../services/azure/redis');

/**
 * Rate limit middleware factory
 * @param {object} options - Rate limit options
 */
function rateLimitMiddleware(options = {}) {
    const {
        windowSeconds = 60,
        maxRequests = 100,
        keyGenerator = (req) => req.ip || req.headers['x-forwarded-for'] || 'anonymous',
        message = 'Too many requests, please try again later.',
        skipFailedRequests = false,
        skipSuccessfulRequests = false
    } = options;

    return async (req, res, next) => {
        // Skip if Redis not connected (fail open)
        if (!redis.isConnected()) {
            return next();
        }

        const identifier = typeof keyGenerator === 'function' 
            ? keyGenerator(req) 
            : keyGenerator;

        try {
            const result = await redis.rateLimit(identifier, maxRequests, windowSeconds);
            
            // Set rate limit headers
            res.set('X-RateLimit-Limit', maxRequests);
            res.set('X-RateLimit-Remaining', result.remaining);
            res.set('X-RateLimit-Reset', Math.ceil(Date.now() / 1000) + result.resetIn);

            if (!result.allowed) {
                res.set('Retry-After', result.resetIn);
                return res.status(429).json({
                    error: message,
                    retryAfter: result.resetIn
                });
            }

            next();
        } catch (e) {
            // Fail open on errors
            console.warn('Rate limit middleware error:', e.message);
            next();
        }
    };
}

/**
 * Pre-configured rate limiters
 */
const rateLimiters = {
    // General API rate limit (100 requests per minute)
    general: rateLimitMiddleware({
        windowSeconds: 60,
        maxRequests: 100
    }),
    
    // Strict rate limit for auth endpoints (10 per minute)
    auth: rateLimitMiddleware({
        windowSeconds: 60,
        maxRequests: 10,
        message: 'Too many authentication attempts. Please wait before trying again.'
    }),
    
    // RFQ submission limit (5 per minute)
    rfq: rateLimitMiddleware({
        windowSeconds: 60,
        maxRequests: 5,
        keyGenerator: (req) => `rfq:${req.user?.userId || req.ip}`,
        message: 'You are submitting RFQs too quickly. Please wait a moment.'
    }),
    
    // RFQ simulator endpoint limit (20 per minute) - for internal/worker use
    simulator: rateLimitMiddleware({
        windowSeconds: 60,
        maxRequests: 20,
        keyGenerator: (req) => `sim:${req.ip}`,
        message: 'RFQ simulator rate limit exceeded. Please wait.'
    }),
    
    // Queue claim endpoint limit (50 per minute) - for worker processes
    queueClaim: rateLimitMiddleware({
        windowSeconds: 60,
        maxRequests: 50,
        keyGenerator: (req) => `queue:${req.ip}`,
        message: 'Queue claim rate limit exceeded. Please wait.'
    }),
    
    // Inbox read limit (100 per minute)
    inbox: rateLimitMiddleware({
        windowSeconds: 60,
        maxRequests: 100,
        keyGenerator: (req) => `inbox:${req.params?.supplierId || req.ip}`,
        message: 'Inbox read rate limit exceeded.'
    }),
    
    // File upload limit (10 per 5 minutes)
    upload: rateLimitMiddleware({
        windowSeconds: 300,
        maxRequests: 10,
        keyGenerator: (req) => `upload:${req.user?.userId || req.ip}`,
        message: 'Upload limit reached. Please wait before uploading more files.'
    }),
    
    // Search rate limit (30 per minute)
    search: rateLimitMiddleware({
        windowSeconds: 60,
        maxRequests: 30,
        keyGenerator: (req) => `search:${req.ip}`
    }),
    
    // Admin operations (higher limit)
    admin: rateLimitMiddleware({
        windowSeconds: 60,
        maxRequests: 200,
        keyGenerator: (req) => `admin:${req.user?.userId}`
    }),
    
    // Health check endpoints (200 per minute)
    health: rateLimitMiddleware({
        windowSeconds: 60,
        maxRequests: 200,
        keyGenerator: (req) => `health:${req.ip}`,
        message: 'Health check rate limit exceeded.'
    }),
    
    // AI operations (stricter limit - 20 per 15 minutes)
    ai: rateLimitMiddleware({
        windowSeconds: 900, // 15 minutes
        maxRequests: 20,
        keyGenerator: (req) => `ai:${req.user?.userId || req.ip}`,
        message: 'AI operation rate limit exceeded. Please wait before making more requests.'
    }),
    
    // Webhook endpoints (100 per minute per IP)
    webhook: rateLimitMiddleware({
        windowSeconds: 60,
        maxRequests: 100,
        keyGenerator: (req) => `webhook:${req.ip}`,
        message: 'Webhook rate limit exceeded.'
    }),
    
    // Revit integration (30 per minute)
    revit: rateLimitMiddleware({
        windowSeconds: 60,
        maxRequests: 30,
        keyGenerator: (req) => `revit:${req.user?.userId || req.ip}`,
        message: 'Revit integration rate limit exceeded.'
    })
};

module.exports = {
    rateLimitMiddleware,
    ...rateLimiters
};
