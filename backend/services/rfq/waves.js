const { pool } = require('../../db');

/**
 * Inserts an entry into the RFQ distribution queue.
 * @param {object} client - Database client for transaction.
 * @param {string} rfqId - RFQ UUID.
 * @param {string} supplierId - Supplier UUID.
 * @param {number} wave - Wave number.
 * @param {Date} visibleAt - Time when RFQ becomes visible.
 * @param {Date} expiresAt - Time when RFQ expires (optional).
 */
async function insertQueueEntries(client, rfqId, supplierId, wave, visibleAt, expiresAt) {
    const query = `
        INSERT INTO "RFQ_Distribution_Queue" (rfq_id, supplier_id, wave_number, visible_at, expires_at)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (rfq_id, supplier_id) DO NOTHING
    `;
    await client.query(query, [rfqId, supplierId, wave, visibleAt, expiresAt]);
}

/**
 * Creates distribution waves for an RFQ based on supplier tiers.
 * @param {string} rfqId - The RFQ UUID.
 * @param {Array} suppliers - List of suppliers with 'tier' property.
 */
async function createDistributionWaves(rfqId, suppliers) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const now = new Date();

        // Define delays in minutes
        const delays = {
            enterprise: 0,
            pro: 15,
            claimed: 30,
            free: 30,
            scraped: 120 // 2 hours
        };

        // Define waves
        // Wave 1 (0 min): Enterprise
        // Wave 2 (15 min): Pro
        // Wave 3 (30 min): Claimed/Free
        // Wave 4 (2 hours): Scraped

        for (const supplier of suppliers) {
            let wave = 1;
            let delayMinutes = 0;
            const tier = (supplier.tier || 'free').toLowerCase();

            if (tier === 'enterprise') {
                wave = 1;
                delayMinutes = delays.enterprise;
            } else if (tier === 'pro') {
                wave = 2;
                delayMinutes = delays.pro;
            } else if (tier === 'claimed' || tier === 'free') {
                wave = 3;
                delayMinutes = delays.claimed; // 30 min for both
            } else { // scraped
                wave = 4;
                delayMinutes = delays.scraped;
            }

            const visibleAt = new Date(now.getTime() + delayMinutes * 60000);
            const expiresAt = new Date(now.getTime() + (delayMinutes + 2880) * 60000); // Expires in 48 hours + delay

            await insertQueueEntries(client, rfqId, supplier.id, wave, visibleAt, expiresAt);
        }

        await client.query('COMMIT');
        console.log(`Created waves for RFQ ${rfqId} with ${suppliers.length} suppliers.`);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error creating distribution waves:', err);
        throw err;
    } finally {
        client.release();
    }
}

module.exports = {
    createDistributionWaves,
    insertQueueEntries
};
