/**
 * AI Gateway - Workflow Cache
 * 
 * Caches safe workflow results (compliance, alternatives) for performance.
 * Uses Redis for fast access with PostgreSQL as persistent backup.
 */

const { pool } = require('../../db');
const redis = require('../azure/redis');
const monitoring = require('../azure/monitoring');
const { hashInput } = require('./callLogger');

// Cache key prefix
const CACHE_PREFIX = 'ai_cache:';

// Default TTLs (in seconds)
const DEFAULT_TTL = 3600; // 1 hour
const MAX_TTL = 86400 * 7; // 7 days

/**
 * Get cache key for a workflow + input combination
 */
function getCacheKey(workflowId, inputHash) {
    return `${CACHE_PREFIX}${workflowId}:${inputHash}`;
}

/**
 * Check if workflow is cacheable and get TTL
 */
async function getWorkflowCacheConfig(workflowId) {
    try {
        const result = await pool.query(`
            SELECT IsCacheable, CacheTTLSeconds, SafetyLevel
            FROM AI_Workflows WHERE WorkflowID = $1
        `, [workflowId]);

        if (result.rows.length === 0) {
            return { cacheable: false, ttl: 0 };
        }

        const workflow = result.rows[0];
        return {
            cacheable: workflow.iscacheable,
            ttl: workflow.cachettlseconds || DEFAULT_TTL,
            safetyLevel: workflow.safetylevel
        };
    } catch (error) {
        console.error('Error getting workflow cache config:', error.message);
        return { cacheable: false, ttl: 0 };
    }
}

/**
 * Get cached result for a workflow call
 * Returns { hit: boolean, data?: any }
 */
async function get(workflowId, input) {
    const inputHash = hashInput(input);
    const cacheKey = getCacheKey(workflowId, inputHash);

    try {
        // Try Redis first (faster)
        const redisResult = await redis.get(cacheKey);
        if (redisResult) {
            monitoring.trackEvent('AIGateway_CacheHit', { 
                workflowId: String(workflowId), 
                source: 'redis' 
            });
            
            // Update hit count in DB (async, don't wait)
            updateHitCount(workflowId, inputHash).catch(() => {});
            
            return { hit: true, data: redisResult, source: 'redis' };
        }

        // Fall back to PostgreSQL
        const dbResult = await pool.query(`
            SELECT OutputData, ExpiresAt 
            FROM AI_Workflow_Cache 
            WHERE WorkflowID = $1 AND InputHash = $2 AND ExpiresAt > NOW()
        `, [workflowId, inputHash]);

        if (dbResult.rows.length > 0) {
            const cached = dbResult.rows[0];
            
            // Re-populate Redis for future requests
            const ttlRemaining = Math.floor((new Date(cached.expiresat) - new Date()) / 1000);
            if (ttlRemaining > 60) { // Only if more than 1 minute left
                redis.set(cacheKey, cached.outputdata, ttlRemaining).catch(() => {});
            }

            monitoring.trackEvent('AIGateway_CacheHit', { 
                workflowId: String(workflowId), 
                source: 'postgres' 
            });
            
            // Update hit count
            updateHitCount(workflowId, inputHash).catch(() => {});
            
            return { hit: true, data: cached.outputdata, source: 'postgres' };
        }

        monitoring.trackEvent('AIGateway_CacheMiss', { 
            workflowId: String(workflowId) 
        });

        return { hit: false };
    } catch (error) {
        console.error('Cache get error:', error.message);
        monitoring.trackException(error, { context: 'workflowCache.get' });
        return { hit: false };
    }
}

/**
 * Store result in cache
 */
async function set(workflowId, input, output, customTtl = null) {
    const config = await getWorkflowCacheConfig(workflowId);
    
    if (!config.cacheable) {
        return false;
    }

    const inputHash = hashInput(input);
    const cacheKey = getCacheKey(workflowId, inputHash);
    const ttl = Math.min(customTtl || config.ttl, MAX_TTL);
    const expiresAt = new Date(Date.now() + ttl * 1000);
    const byteSize = Buffer.byteLength(JSON.stringify(output));

    try {
        // Store in Redis (fast access)
        await redis.set(cacheKey, output, ttl);

        // Store in PostgreSQL (persistence)
        await pool.query(`
            INSERT INTO AI_Workflow_Cache (WorkflowID, InputHash, OutputData, ExpiresAt, ByteSize)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (WorkflowID, InputHash) 
            DO UPDATE SET OutputData = $3, ExpiresAt = $4, ByteSize = $5, HitCount = 0
        `, [workflowId, inputHash, JSON.stringify(output), expiresAt, byteSize]);

        monitoring.trackEvent('AIGateway_CacheSet', { 
            workflowId: String(workflowId),
            ttl: String(ttl),
            byteSize: String(byteSize)
        });

        return true;
    } catch (error) {
        console.error('Cache set error:', error.message);
        monitoring.trackException(error, { context: 'workflowCache.set' });
        return false;
    }
}

/**
 * Invalidate cache for a workflow (or specific input)
 */
async function invalidate(workflowId, input = null) {
    try {
        if (input) {
            const inputHash = hashInput(input);
            const cacheKey = getCacheKey(workflowId, inputHash);
            
            await redis.del(cacheKey);
            await pool.query(
                'DELETE FROM AI_Workflow_Cache WHERE WorkflowID = $1 AND InputHash = $2',
                [workflowId, inputHash]
            );
        } else {
            // Invalidate all cache entries for this workflow
            await redis.clearPattern(`${CACHE_PREFIX}${workflowId}:*`);
            await pool.query(
                'DELETE FROM AI_Workflow_Cache WHERE WorkflowID = $1',
                [workflowId]
            );
        }

        monitoring.trackEvent('AIGateway_CacheInvalidate', { 
            workflowId: String(workflowId),
            scope: input ? 'single' : 'all'
        });

        return true;
    } catch (error) {
        console.error('Cache invalidate error:', error.message);
        return false;
    }
}

/**
 * Update hit count for analytics
 */
async function updateHitCount(workflowId, inputHash) {
    try {
        await pool.query(`
            UPDATE AI_Workflow_Cache 
            SET HitCount = HitCount + 1, LastHitAt = NOW()
            WHERE WorkflowID = $1 AND InputHash = $2
        `, [workflowId, inputHash]);
    } catch (error) {
        // Non-critical, just log
        console.warn('Failed to update cache hit count:', error.message);
    }
}

/**
 * Clean up expired cache entries
 */
async function cleanup() {
    try {
        const result = await pool.query(`
            DELETE FROM AI_Workflow_Cache WHERE ExpiresAt < NOW()
            RETURNING CacheID
        `);

        const cleaned = result.rowCount;
        if (cleaned > 0) {
            monitoring.trackMetric('AIGateway_CacheCleanup', cleaned);
        }

        return cleaned;
    } catch (error) {
        console.error('Cache cleanup error:', error.message);
        return 0;
    }
}

/**
 * Get cache statistics
 */
async function getStats() {
    try {
        const result = await pool.query(`
            SELECT 
                COUNT(*) as total_entries,
                SUM(HitCount) as total_hits,
                SUM(ByteSize) as total_bytes,
                AVG(HitCount) as avg_hits_per_entry,
                COUNT(CASE WHEN ExpiresAt > NOW() THEN 1 END) as active_entries,
                COUNT(CASE WHEN ExpiresAt <= NOW() THEN 1 END) as expired_entries
            FROM AI_Workflow_Cache
        `);

        const workflowStats = await pool.query(`
            SELECT 
                w.Name as workflow_name,
                COUNT(c.CacheID) as cached_entries,
                SUM(c.HitCount) as total_hits,
                SUM(c.ByteSize) as total_bytes
            FROM AI_Workflows w
            LEFT JOIN AI_Workflow_Cache c ON w.WorkflowID = c.WorkflowID
            WHERE w.IsCacheable = TRUE
            GROUP BY w.WorkflowID, w.Name
        `);

        return {
            global: result.rows[0],
            byWorkflow: workflowStats.rows
        };
    } catch (error) {
        console.error('Error getting cache stats:', error.message);
        return null;
    }
}

/**
 * Warm cache with pre-computed results (for common queries)
 */
async function warmCache(workflowId, precomputedResults) {
    let successCount = 0;
    
    for (const { input, output } of precomputedResults) {
        const success = await set(workflowId, input, output);
        if (success) successCount++;
    }

    monitoring.trackEvent('AIGateway_CacheWarm', { 
        workflowId: String(workflowId),
        entriesWarmed: String(successCount)
    });

    return successCount;
}

module.exports = {
    get,
    set,
    invalidate,
    cleanup,
    getStats,
    warmCache,
    getWorkflowCacheConfig,
    getCacheKey
};
