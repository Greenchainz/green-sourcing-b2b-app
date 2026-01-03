const { pool } = require('../../db');

/**
 * Wave configuration: maps tiers to wave numbers and delays.
 * Wave 1 (0 min): Enterprise - immediate access
 * Wave 2 (15 min): Pro - slight delay
 * Wave 3 (30 min): Claimed/Free - standard delay
 * Wave 4 (2 hours): Scraped - significant delay
 */
const WAVE_CONFIG = {
    enterprise: { wave: 1, delayMinutes: 0 },
    pro: { wave: 2, delayMinutes: 15 },
    claimed: { wave: 3, delayMinutes: 30 },
    free: { wave: 3, delayMinutes: 30 },
    scraped: { wave: 4, delayMinutes: 120 }
};

// Default expiry: 48 hours after visibility
const DEFAULT_EXPIRY_HOURS = 48;

/**
 * Gets wave configuration for a supplier tier.
 * @param {string} tier - Supplier tier.
 * @returns {{wave: number, delayMinutes: number}}
 */
function getWaveConfig(tier) {
    const normalizedTier = (tier || 'free').toLowerCase();
    return WAVE_CONFIG[normalizedTier] || WAVE_CONFIG.free;
}

/**
 * Inserts an entry into the RFQ distribution queue.
 * Uses quoted table name per canonical schema (azure_postgres_rfq_simulator.sql).
 * 
 * @param {object} client - Database client for transaction.
 * @param {string} rfqId - RFQ UUID.
 * @param {string} supplierId - Supplier UUID.
 * @param {number} wave - Wave number (1-4).
 * @param {Date} visibleAt - Time when RFQ becomes visible.
 * @param {Date} expiresAt - Time when RFQ expires.
 */
async function insertQueueEntry(client, rfqId, supplierId, wave, visibleAt, expiresAt) {
    const query = `
        INSERT INTO "RFQ_Distribution_Queue" 
            (rfq_id, supplier_id, wave_number, visible_at, expires_at, status)
        VALUES ($1, $2, $3, $4, $5, 'pending')
        ON CONFLICT (rfq_id, supplier_id) DO UPDATE SET
            wave_number = EXCLUDED.wave_number,
            visible_at = EXCLUDED.visible_at,
            expires_at = EXCLUDED.expires_at,
            status = 'pending'
        WHERE "RFQ_Distribution_Queue".status = 'pending'
    `;
    await client.query(query, [rfqId, supplierId, wave, visibleAt, expiresAt]);
}

/**
 * Creates distribution waves for an RFQ based on supplier tiers.
 * Higher-tier suppliers see RFQs first, creating urgency for upgrades.
 * 
 * @param {string} rfqId - The RFQ UUID.
 * @param {Array} suppliers - List of suppliers with 'tier' and 'id' properties.
 * @returns {Promise<{success: boolean, count: number, error?: string}>}
 */
async function createDistributionWaves(rfqId, suppliers) {
    if (!rfqId) {
        console.error('createDistributionWaves called without rfqId');
        return { success: false, count: 0, error: 'Missing rfqId' };
    }

    if (!Array.isArray(suppliers) || suppliers.length === 0) {
        console.log(`No suppliers to distribute for RFQ ${rfqId}`);
        return { success: true, count: 0 };
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const now = new Date();
        let insertedCount = 0;

        // Group suppliers by wave for batch efficiency info
        const waveGroups = { 1: 0, 2: 0, 3: 0, 4: 0 };

        for (const supplier of suppliers) {
            if (!supplier.id) {
                console.warn(`Skipping supplier without id in RFQ ${rfqId} distribution`);
                continue;
            }

            const config = getWaveConfig(supplier.tier);
            waveGroups[config.wave]++;

            const visibleAt = new Date(now.getTime() + config.delayMinutes * 60 * 1000);
            const expiresAt = new Date(visibleAt.getTime() + DEFAULT_EXPIRY_HOURS * 60 * 60 * 1000);

            await insertQueueEntry(client, rfqId, supplier.id, config.wave, visibleAt, expiresAt);
            insertedCount++;
        }

        await client.query('COMMIT');
        
        console.log(`Created waves for RFQ ${rfqId}: ` +
            `Wave1=${waveGroups[1]}, Wave2=${waveGroups[2]}, ` +
            `Wave3=${waveGroups[3]}, Wave4=${waveGroups[4]}, ` +
            `Total=${insertedCount}`);

        return { success: true, count: insertedCount };

    } catch (err) {
        await client.query('ROLLBACK');
        console.error(`Error creating distribution waves for RFQ ${rfqId}:`, err);
        return { success: false, count: 0, error: err.message };
    } finally {
        client.release();
    }
}

/**
 * Gets the current queue status for an RFQ.
 * @param {string} rfqId - The RFQ UUID.
 * @returns {Promise<Array>}
 */
async function getQueueStatus(rfqId) {
    const result = await pool.query(
        `SELECT 
            wave_number,
            status,
            COUNT(*) as count
         FROM "RFQ_Distribution_Queue"
         WHERE rfq_id = $1
         GROUP BY wave_number, status
         ORDER BY wave_number`,
        [rfqId]
    );
    return result.rows;
}

module.exports = {
    createDistributionWaves,
    insertQueueEntry,
    getQueueStatus,
    getWaveConfig,
    WAVE_CONFIG
};
