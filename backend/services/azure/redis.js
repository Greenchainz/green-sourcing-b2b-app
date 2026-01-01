/**
 * Azure Cache for Redis Integration
 * Connection: greenchainz.redis.cache.windows.net
 * 
 * Used for:
 * - Session caching
 * - API response caching
 * - Rate limiting
 * - Real-time data
 */

const redis = require('redis');

let client = null;
let isConnected = false;

const config = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6380,
    password: process.env.REDIS_PASSWORD,
    tls: process.env.REDIS_SSL === 'true' ? {} : undefined
};

/**
 * Connect to Azure Redis Cache
 */
async function connect() {
    if (isConnected && client) {
        return client;
    }

    const url = config.password 
        ? `rediss://:${config.password}@${config.host}:${config.port}`
        : `redis://${config.host}:${config.port}`;

    client = redis.createClient({
        url,
        socket: {
            tls: config.tls ? true : false,
            rejectUnauthorized: false
        }
    });

    client.on('error', (err) => {
        console.error('Redis Client Error:', err.message);
        isConnected = false;
    });

    client.on('connect', () => {
        console.log('Redis connected');
        isConnected = true;
    });

    client.on('reconnecting', () => {
        console.log('Redis reconnecting...');
    });

    await client.connect();
    isConnected = true;
    return client;
}

/**
 * Disconnect from Redis
 */
async function disconnect() {
    if (client) {
        await client.quit();
        isConnected = false;
        client = null;
    }
}

/**
 * Get a cached value
 */
async function get(key) {
    if (!isConnected || !client) return null;
    try {
        const value = await client.get(key);
        return value ? JSON.parse(value) : null;
    } catch (e) {
        console.warn('Redis get error:', e.message);
        return null;
    }
}

/**
 * Set a cached value with optional TTL (in seconds)
 */
async function set(key, value, ttlSeconds = 3600) {
    if (!isConnected || !client) return false;
    try {
        await client.setEx(key, ttlSeconds, JSON.stringify(value));
        return true;
    } catch (e) {
        console.warn('Redis set error:', e.message);
        return false;
    }
}

/**
 * Delete a cached value
 */
async function del(key) {
    if (!isConnected || !client) return false;
    try {
        await client.del(key);
        return true;
    } catch (e) {
        console.warn('Redis del error:', e.message);
        return false;
    }
}

/**
 * Clear all keys matching a pattern
 */
async function clearPattern(pattern) {
    if (!isConnected || !client) return 0;
    try {
        const keys = await client.keys(pattern);
        if (keys.length > 0) {
            await client.del(keys);
        }
        return keys.length;
    } catch (e) {
        console.warn('Redis clearPattern error:', e.message);
        return 0;
    }
}

/**
 * Cache-aside pattern helper
 * Gets from cache, or fetches and caches if missing
 */
async function cacheAside(key, fetchFn, ttlSeconds = 3600) {
    // Try cache first
    const cached = await get(key);
    if (cached !== null) {
        return { data: cached, fromCache: true };
    }

    // Fetch fresh data
    const data = await fetchFn();
    
    // Cache it
    await set(key, data, ttlSeconds);
    
    return { data, fromCache: false };
}

/**
 * Increment a counter (for rate limiting)
 */
async function incr(key, ttlSeconds = 60) {
    if (!isConnected || !client) return 0;
    try {
        const value = await client.incr(key);
        if (value === 1) {
            await client.expire(key, ttlSeconds);
        }
        return value;
    } catch (e) {
        console.warn('Redis incr error:', e.message);
        return 0;
    }
}

/**
 * Simple rate limiter
 * Returns true if request is allowed, false if rate limited
 */
async function rateLimit(identifier, maxRequests = 100, windowSeconds = 60) {
    const key = `ratelimit:${identifier}`;
    const count = await incr(key, windowSeconds);
    return {
        allowed: count <= maxRequests,
        remaining: Math.max(0, maxRequests - count),
        resetIn: windowSeconds
    };
}

/**
 * Health check
 */
async function ping() {
    if (!isConnected || !client) return false;
    try {
        const result = await client.ping();
        return result === 'PONG';
    } catch (e) {
        return false;
    }
}

module.exports = {
    connect,
    disconnect,
    get,
    set,
    del,
    clearPattern,
    cacheAside,
    incr,
    rateLimit,
    ping,
    isConnected: () => isConnected
};
