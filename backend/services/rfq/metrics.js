const { pool } = require('../../db');

/**
 * Updates response metrics for a supplier based on RFQ history.
 * Uses quoted table names per canonical schema (azure_postgres_rfq_simulator.sql).
 * 
 * Metrics calculated:
 * - Response Rate: (Responded / Total) * 100
 * - Avg Response Time: Average of (responded_at - visible_at) in minutes
 * - Win Rate: Percentage of responses that led to wins (placeholder for future)
 * 
 * @param {string} supplierId - The UUID of the supplier.
 * @returns {Promise<{success: boolean, metrics?: object, error?: string}>}
 */
async function updateResponseMetrics(supplierId) {
    if (!supplierId) {
        console.error('updateResponseMetrics called without supplierId');
        return { success: false, error: 'Missing supplierId' };
    }

    const client = await pool.connect();
    try {
        // First, ensure supplier exists
        const supplierCheck = await client.query(
            'SELECT id FROM suppliers WHERE id = $1',
            [supplierId]
        );

        if (supplierCheck.rows.length === 0) {
            console.log(`Supplier ${supplierId} not found, skipping metrics update.`);
            return { success: false, error: 'Supplier not found' };
        }

        // Calculate metrics from RFQ_Distribution_Queue
        const statsQuery = `
            SELECT
                COUNT(*) as total_received,
                COUNT(*) FILTER (WHERE status = 'responded') as total_responded,
                COALESCE(
                    AVG(
                        EXTRACT(EPOCH FROM (responded_at - visible_at)) / 60
                    ) FILTER (WHERE status = 'responded' AND responded_at IS NOT NULL),
                    0
                ) as avg_response_minutes
            FROM "RFQ_Distribution_Queue"
            WHERE supplier_id = $1
              AND visible_at <= NOW()
        `;

        const statsResult = await client.query(statsQuery, [supplierId]);
        const stats = statsResult.rows[0];

        const totalReceived = parseInt(stats.total_received) || 0;
        const totalResponded = parseInt(stats.total_responded) || 0;
        const avgResponseMinutes = Math.round(parseFloat(stats.avg_response_minutes) || 0);
        const responseRate = totalReceived > 0 
            ? Math.round((totalResponded / totalReceived) * 10000) / 100 // 2 decimal places
            : 0;

        // Upsert metrics
        const upsertQuery = `
            INSERT INTO "Supplier_Response_Metrics"
                (supplier_id, response_rate, avg_response_time_minutes, 
                 total_rfqs_received, total_responses, last_updated)
            VALUES ($1, $2, $3, $4, $5, NOW())
            ON CONFLICT (supplier_id) DO UPDATE SET
                response_rate = EXCLUDED.response_rate,
                avg_response_time_minutes = EXCLUDED.avg_response_time_minutes,
                total_rfqs_received = EXCLUDED.total_rfqs_received,
                total_responses = EXCLUDED.total_responses,
                last_updated = NOW()
            RETURNING *
        `;

        const result = await client.query(upsertQuery, [
            supplierId,
            responseRate,
            avgResponseMinutes,
            totalReceived,
            totalResponded
        ]);

        console.log(`Updated metrics for supplier ${supplierId}: ` +
            `rate=${responseRate}%, avg=${avgResponseMinutes}min, ` +
            `received=${totalReceived}, responded=${totalResponded}`);

        return { 
            success: true, 
            metrics: result.rows[0] 
        };

    } catch (err) {
        console.error(`Error updating supplier metrics for ${supplierId}:`, err);
        return { success: false, error: err.message };
    } finally {
        client.release();
    }
}

/**
 * Gets response metrics for a supplier.
 * @param {string} supplierId - The UUID of the supplier.
 * @returns {Promise<object|null>}
 */
async function getResponseMetrics(supplierId) {
    if (!supplierId) return null;

    try {
        const result = await pool.query(
            `SELECT * FROM "Supplier_Response_Metrics" WHERE supplier_id = $1`,
            [supplierId]
        );
        return result.rows[0] || null;
    } catch (err) {
        console.error(`Error fetching metrics for ${supplierId}:`, err);
        return null;
    }
}

/**
 * Batch update metrics for multiple suppliers.
 * @param {string[]} supplierIds - Array of supplier UUIDs.
 * @returns {Promise<{success: number, failed: number}>}
 */
async function batchUpdateMetrics(supplierIds) {
    if (!Array.isArray(supplierIds) || supplierIds.length === 0) {
        return { success: 0, failed: 0 };
    }

    let successCount = 0;
    let failedCount = 0;

    for (const supplierId of supplierIds) {
        const result = await updateResponseMetrics(supplierId);
        if (result.success) {
            successCount++;
        } else {
            failedCount++;
        }
    }

    return { success: successCount, failed: failedCount };
}

module.exports = {
    updateResponseMetrics,
    getResponseMetrics,
    batchUpdateMetrics
};
