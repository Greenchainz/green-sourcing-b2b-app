const { pool } = require('../../db');

/**
 * Wave configuration: maps tiers to wave numbers and delays.
 * 
 * Tiered Access Policy:
 * Wave 1 (0 min): Premium (enterprise) - immediate access, full RFQ listing
 * Wave 2 (15 min): Standard (pro) - slight delay, full RFQ listing
 * Wave 3 (60 min): Free (claimed/free) - longer delay, full RFQ listing
 * Wave 4: Shadow (scraped) - NO full listing, outreach/claim prompts ONLY
 * 
 * Shadow suppliers are handled separately and do not receive full RFQ access.
 * They only get outreach emails prompting them to claim their profile.
 */
const WAVE_CONFIG = {
    // Premium tier - immediate access
    enterprise: { 
        wave: 1, 
        delayMinutes: 0, 
        accessLevel: 'full',
        tierCategory: 'premium',
        reason: 'Premium tier: immediate access to full RFQ details'
    },
    premium: { 
        wave: 1, 
        delayMinutes: 0, 
        accessLevel: 'full',
        tierCategory: 'premium',
        reason: 'Premium tier: immediate access to full RFQ details'
    },
    
    // Standard tier - slight delay
    pro: { 
        wave: 2, 
        delayMinutes: 15, 
        accessLevel: 'full',
        tierCategory: 'standard',
        reason: 'Standard tier: 15-minute delay for full RFQ access'
    },
    standard: { 
        wave: 2, 
        delayMinutes: 15, 
        accessLevel: 'full',
        tierCategory: 'standard',
        reason: 'Standard tier: 15-minute delay for full RFQ access'
    },
    
    // Free tier - longer delay
    claimed: { 
        wave: 3, 
        delayMinutes: 60, 
        accessLevel: 'full',
        tierCategory: 'free',
        reason: 'Free tier (claimed): 60-minute delay for full RFQ access'
    },
    free: { 
        wave: 3, 
        delayMinutes: 60, 
        accessLevel: 'full',
        tierCategory: 'free',
        reason: 'Free tier: 60-minute delay for full RFQ access'
    },
    
    // Shadow tier - outreach only, no full listing
    scraped: { 
        wave: 4, 
        delayMinutes: 0, // Immediate outreach, but no listing access
        accessLevel: 'outreach_only',
        tierCategory: 'shadow',
        reason: 'Shadow supplier: outreach/claim prompt only, no full RFQ listing'
    },
    shadow: { 
        wave: 4, 
        delayMinutes: 0,
        accessLevel: 'outreach_only',
        tierCategory: 'shadow',
        reason: 'Shadow supplier: outreach/claim prompt only, no full RFQ listing'
    }
};

/**
 * Access levels for wave distribution.
 * - 'full': Supplier receives complete RFQ details and can respond
 * - 'outreach_only': Supplier receives claim/upgrade prompt, no RFQ access
 */
const ACCESS_LEVELS = {
    FULL: 'full',
    OUTREACH_ONLY: 'outreach_only'
};

// Default expiry: 48 hours after visibility
const DEFAULT_EXPIRY_HOURS = 48;

// Shadow suppliers get a shorter window for outreach prompts
const SHADOW_OUTREACH_EXPIRY_HOURS = 24;

/**
 * Gets wave configuration for a supplier tier.
 * Returns full wave config including audit fields.
 * 
 * @param {string} tier - Supplier tier.
 * @returns {{wave: number, delayMinutes: number, accessLevel: string, tierCategory: string, reason: string}}
 */
function getWaveConfig(tier) {
    const normalizedTier = (tier || 'free').toLowerCase();
    return WAVE_CONFIG[normalizedTier] || WAVE_CONFIG.free;
}

/**
 * Checks if a supplier tier is a shadow tier (outreach only).
 * Shadow suppliers receive claim/upgrade prompts, not full RFQ listings.
 * 
 * @param {string} tier - Supplier tier.
 * @returns {boolean}
 */
function isShadowTier(tier) {
    const config = getWaveConfig(tier);
    return config.accessLevel === ACCESS_LEVELS.OUTREACH_ONLY;
}

/**
 * Generates audit metadata for a wave assignment.
 * Used for dashboard visibility and debugging.
 * 
 * @param {object} supplier - Supplier object with tier and id.
 * @param {object} config - Wave config for the supplier.
 * @param {Date} assignedAt - When the wave was assigned.
 * @returns {object} Audit metadata object.
 */
function generateWaveAudit(supplier, config, assignedAt) {
    return {
        supplier_id: supplier.id,
        tier_at_assignment: supplier.tier || 'free',
        tier_category: config.tierCategory,
        wave_number: config.wave,
        delay_minutes: config.delayMinutes,
        access_level: config.accessLevel,
        reason: config.reason,
        assigned_at: assignedAt.toISOString(),
        is_shadow: config.accessLevel === ACCESS_LEVELS.OUTREACH_ONLY
    };
}

/**
 * Inserts an entry into the RFQ distribution queue with audit metadata.
 * Uses quoted table name per canonical schema (azure_postgres_rfq_simulator.sql).
 * 
 * Includes audit fields for dashboard visibility:
 * - wave_reason: Human-readable explanation of wave assignment
 * - access_level: 'full' or 'outreach_only'
 * - tier_snapshot: Supplier tier at time of distribution
 * 
 * @param {object} client - Database client for transaction.
 * @param {string} rfqId - RFQ UUID.
 * @param {string} supplierId - Supplier UUID.
 * @param {number} wave - Wave number (1-4).
 * @param {Date} visibleAt - Time when RFQ becomes visible.
 * @param {Date} expiresAt - Time when RFQ expires.
 * @param {object} auditData - Audit metadata for the wave assignment.
 */
async function insertQueueEntry(client, rfqId, supplierId, wave, visibleAt, expiresAt, auditData = {}) {
    // Include audit fields for dashboard queries
    // These columns may need to be added via migration if they don't exist
    const query = `
        INSERT INTO "RFQ_Distribution_Queue" 
            (rfq_id, supplier_id, wave_number, visible_at, expires_at, status,
             wave_reason, access_level, tier_snapshot)
        VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7, $8)
        ON CONFLICT (rfq_id, supplier_id) DO UPDATE SET
            wave_number = EXCLUDED.wave_number,
            visible_at = EXCLUDED.visible_at,
            expires_at = EXCLUDED.expires_at,
            status = 'pending',
            wave_reason = EXCLUDED.wave_reason,
            access_level = EXCLUDED.access_level,
            tier_snapshot = EXCLUDED.tier_snapshot
        WHERE "RFQ_Distribution_Queue".status = 'pending'
    `;
    
    const waveReason = auditData.reason || 'Assigned based on supplier tier';
    const accessLevel = auditData.access_level || ACCESS_LEVELS.FULL;
    const tierSnapshot = auditData.tier_at_assignment || 'unknown';
    
    await client.query(query, [
        rfqId, 
        supplierId, 
        wave, 
        visibleAt, 
        expiresAt,
        waveReason,
        accessLevel,
        tierSnapshot
    ]);
}

/**
 * Inserts a shadow supplier outreach entry.
 * Shadow suppliers don't get full RFQ access - they receive claim prompts instead.
 * 
 * @param {object} client - Database client for transaction.
 * @param {string} rfqId - RFQ UUID.
 * @param {string} supplierId - Supplier UUID.
 * @param {object} auditData - Audit metadata.
 */
async function insertShadowOutreachEntry(client, rfqId, supplierId, auditData = {}) {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SHADOW_OUTREACH_EXPIRY_HOURS * 60 * 60 * 1000);
    
    // Shadow entries are visible immediately for outreach but don't grant RFQ access
    await insertQueueEntry(
        client,
        rfqId,
        supplierId,
        4, // Wave 4 for shadow
        now, // Immediate visibility for outreach processing
        expiresAt,
        {
            reason: 'Shadow supplier: claim profile to access RFQ details',
            access_level: ACCESS_LEVELS.OUTREACH_ONLY,
            tier_at_assignment: 'scraped'
        }
    );
    
    console.log(`Shadow outreach entry created for supplier ${supplierId}, RFQ ${rfqId}`);
}

/**
 * Creates distribution waves for an RFQ based on supplier tiers.
 * 
 * Tiered Access Policy:
 * - Premium (enterprise): Wave 1, immediate full access
 * - Standard (pro): Wave 2, 15-min delay, full access
 * - Free (claimed/free): Wave 3, 60-min delay, full access
 * - Shadow (scraped): Wave 4, outreach/claim prompts ONLY (no full listing)
 * 
 * Shadow suppliers are handled separately and receive outreach prompts
 * to claim their profile, rather than full RFQ access.
 * 
 * @param {string} rfqId - The RFQ UUID.
 * @param {Array} suppliers - List of suppliers with 'tier' and 'id' properties.
 * @returns {Promise<{success: boolean, count: number, shadowCount: number, auditLog: Array, error?: string}>}
 */
async function createDistributionWaves(rfqId, suppliers) {
    if (!rfqId) {
        console.error('createDistributionWaves called without rfqId');
        return { success: false, count: 0, shadowCount: 0, auditLog: [], error: 'Missing rfqId' };
    }

    if (!Array.isArray(suppliers) || suppliers.length === 0) {
        console.log(`No suppliers to distribute for RFQ ${rfqId}`);
        return { success: true, count: 0, shadowCount: 0, auditLog: [] };
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const now = new Date();
        let insertedCount = 0;
        let shadowCount = 0;
        const auditLog = [];

        // Group suppliers by wave for logging and metrics
        const waveGroups = { 
            1: { count: 0, tier: 'premium', suppliers: [] }, 
            2: { count: 0, tier: 'standard', suppliers: [] }, 
            3: { count: 0, tier: 'free', suppliers: [] }, 
            4: { count: 0, tier: 'shadow', suppliers: [] }
        };

        for (const supplier of suppliers) {
            if (!supplier.id) {
                console.warn(`Skipping supplier without id in RFQ ${rfqId} distribution`);
                continue;
            }

            const config = getWaveConfig(supplier.tier);
            const auditData = generateWaveAudit(supplier, config, now);
            
            // Handle shadow suppliers differently - outreach only
            if (isShadowTier(supplier.tier)) {
                await insertShadowOutreachEntry(client, rfqId, supplier.id, auditData);
                shadowCount++;
                waveGroups[4].count++;
                waveGroups[4].suppliers.push(supplier.id);
                auditData.distribution_type = 'outreach_only';
            } else {
                // Full access distribution for Premium, Standard, Free tiers
                const visibleAt = new Date(now.getTime() + config.delayMinutes * 60 * 1000);
                const expiresAt = new Date(visibleAt.getTime() + DEFAULT_EXPIRY_HOURS * 60 * 60 * 1000);

                await insertQueueEntry(
                    client, 
                    rfqId, 
                    supplier.id, 
                    config.wave, 
                    visibleAt, 
                    expiresAt,
                    auditData
                );
                
                insertedCount++;
                waveGroups[config.wave].count++;
                waveGroups[config.wave].suppliers.push(supplier.id);
                auditData.distribution_type = 'full_access';
            }
            
            auditLog.push(auditData);
        }

        await client.query('COMMIT');
        
        // Detailed logging for monitoring and debugging
        console.log(`[RFQ Distribution] RFQ ${rfqId}:`);
        console.log(`  Wave 1 (Premium): ${waveGroups[1].count} suppliers - immediate access`);
        console.log(`  Wave 2 (Standard): ${waveGroups[2].count} suppliers - 15min delay`);
        console.log(`  Wave 3 (Free): ${waveGroups[3].count} suppliers - 60min delay`);
        console.log(`  Wave 4 (Shadow): ${waveGroups[4].count} suppliers - outreach only`);
        console.log(`  Total: ${insertedCount} full access, ${shadowCount} outreach only`);

        return { 
            success: true, 
            count: insertedCount, 
            shadowCount,
            waveBreakdown: {
                premium: waveGroups[1].count,
                standard: waveGroups[2].count,
                free: waveGroups[3].count,
                shadow: waveGroups[4].count
            },
            auditLog 
        };

    } catch (err) {
        await client.query('ROLLBACK');
        console.error(`Error creating distribution waves for RFQ ${rfqId}:`, err);
        return { success: false, count: 0, shadowCount: 0, auditLog: [], error: err.message };
    } finally {
        client.release();
    }
}

/**
 * Gets the current queue status for an RFQ with audit details.
 * @param {string} rfqId - The RFQ UUID.
 * @returns {Promise<Array>}
 */
async function getQueueStatus(rfqId) {
    const result = await pool.query(
        `SELECT 
            wave_number,
            status,
            access_level,
            COUNT(*) as count
         FROM "RFQ_Distribution_Queue"
         WHERE rfq_id = $1
         GROUP BY wave_number, status, access_level
         ORDER BY wave_number`,
        [rfqId]
    );
    return result.rows;
}

/**
 * Gets detailed audit log for an RFQ's distribution.
 * Used by dashboards to understand wave assignment decisions.
 * 
 * @param {string} rfqId - The RFQ UUID.
 * @returns {Promise<Array>}
 */
async function getDistributionAudit(rfqId) {
    const result = await pool.query(
        `SELECT 
            q.supplier_id,
            q.wave_number,
            q.wave_reason,
            q.access_level,
            q.tier_snapshot,
            q.visible_at,
            q.expires_at,
            q.status,
            q.created_at,
            s.name as supplier_name,
            s.tier as current_tier
         FROM "RFQ_Distribution_Queue" q
         LEFT JOIN suppliers s ON s.id = q.supplier_id
         WHERE q.rfq_id = $1
         ORDER BY q.wave_number, q.created_at`,
        [rfqId]
    );
    return result.rows;
}

/**
 * Gets shadow supplier entries pending outreach.
 * These suppliers need claim/upgrade prompts, not full RFQ access.
 * 
 * @param {number} limit - Maximum entries to return.
 * @returns {Promise<Array>}
 */
async function getPendingShadowOutreach(limit = 100) {
    const result = await pool.query(
        `SELECT 
            q.rfq_id,
            q.supplier_id,
            q.visible_at,
            q.expires_at,
            q.wave_reason,
            s.name as supplier_name,
            s.email as supplier_email,
            r.project_name,
            r.category
         FROM "RFQ_Distribution_Queue" q
         JOIN suppliers s ON s.id = q.supplier_id
         JOIN rfqs r ON r.id = q.rfq_id
         WHERE q.access_level = $1
           AND q.status = 'pending'
           AND (q.expires_at IS NULL OR q.expires_at > NOW())
         ORDER BY q.created_at ASC
         LIMIT $2`,
        [ACCESS_LEVELS.OUTREACH_ONLY, limit]
    );
    return result.rows;
}

/**
 * Gets wave distribution statistics for dashboard.
 * Provides aggregated view of distribution across all RFQs.
 * 
 * @param {object} options - Query options.
 * @param {Date} options.since - Start date for stats.
 * @param {Date} options.until - End date for stats.
 * @returns {Promise<object>}
 */
async function getWaveDistributionStats(options = {}) {
    const since = options.since || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default: 30 days
    const until = options.until || new Date();
    
    const result = await pool.query(
        `SELECT 
            wave_number,
            access_level,
            tier_snapshot,
            status,
            COUNT(*) as count,
            COUNT(DISTINCT rfq_id) as rfq_count,
            COUNT(DISTINCT supplier_id) as supplier_count
         FROM "RFQ_Distribution_Queue"
         WHERE created_at >= $1 AND created_at <= $2
         GROUP BY wave_number, access_level, tier_snapshot, status
         ORDER BY wave_number`,
        [since, until]
    );
    
    // Aggregate into a summary
    const stats = {
        byWave: {},
        byAccessLevel: { full: 0, outreach_only: 0 },
        byStatus: {},
        total: 0,
        dateRange: { since, until }
    };
    
    for (const row of result.rows) {
        const count = parseInt(row.count);
        stats.total += count;
        
        // By wave
        if (!stats.byWave[row.wave_number]) {
            stats.byWave[row.wave_number] = { count: 0, rfqs: 0, suppliers: 0 };
        }
        stats.byWave[row.wave_number].count += count;
        stats.byWave[row.wave_number].rfqs = Math.max(
            stats.byWave[row.wave_number].rfqs, 
            parseInt(row.rfq_count)
        );
        stats.byWave[row.wave_number].suppliers = Math.max(
            stats.byWave[row.wave_number].suppliers, 
            parseInt(row.supplier_count)
        );
        
        // By access level
        if (row.access_level) {
            stats.byAccessLevel[row.access_level] = 
                (stats.byAccessLevel[row.access_level] || 0) + count;
        }
        
        // By status
        if (row.status) {
            stats.byStatus[row.status] = (stats.byStatus[row.status] || 0) + count;
        }
    }
    
    return stats;
}

module.exports = {
    createDistributionWaves,
    insertQueueEntry,
    insertShadowOutreachEntry,
    getQueueStatus,
    getDistributionAudit,
    getPendingShadowOutreach,
    getWaveDistributionStats,
    getWaveConfig,
    isShadowTier,
    generateWaveAudit,
    WAVE_CONFIG,
    ACCESS_LEVELS,
    DEFAULT_EXPIRY_HOURS,
    SHADOW_OUTREACH_EXPIRY_HOURS
};
