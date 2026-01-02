const { pool } = require('../../db');

/**
 * Updates response metrics for a supplier based on RFQ history.
 * @param {string} supplierId - The UUID of the supplier.
 */
async function updateResponseMetrics(supplierId) {
    const client = await pool.connect();
    try {
        // Calculate metrics from RFQ_Distribution_Queue
        // - Response Rate: (Responded / Total) * 100
        // - Avg Response Time: Average of (responded_at - visible_at) in minutes

        const query = `
            WITH stats AS (
                SELECT
                    COUNT(*) as total_received,
                    COUNT(*) FILTER (WHERE status = 'responded') as total_responded,
                    AVG(
                        EXTRACT(EPOCH FROM (responded_at - visible_at)) / 60
                    ) FILTER (WHERE status = 'responded' AND responded_at IS NOT NULL) as avg_response_minutes
                FROM "RFQ_Distribution_Queue"
                WHERE supplier_id = $1
            )
            UPDATE "Supplier_Response_Metrics"
            SET
                total_rfqs_received = stats.total_received,
                total_responses = stats.total_responded,
                response_rate = CASE
                    WHEN stats.total_received > 0 THEN (stats.total_responded::DECIMAL / stats.total_received) * 100
                    ELSE 0
                END,
                avg_response_time_minutes = COALESCE(ROUND(stats.avg_response_minutes), 0),
                last_updated = NOW()
            FROM stats
            WHERE supplier_id = $1
            RETURNING *;
        `;

        const res = await client.query(query, [supplierId]);

        // If no row exists, insert initialization row and retry update
        if (res.rowCount === 0) {
            const checkSupplier = await client.query('SELECT id FROM suppliers WHERE id = $1', [supplierId]);
            if (checkSupplier.rows.length > 0) {
                 await client.query(`
                    INSERT INTO "Supplier_Response_Metrics"
                    (supplier_id, response_rate, avg_response_time_minutes, total_rfqs_received, total_responses)
                    VALUES ($1, 0, 0, 0, 0)
                `, [supplierId]);
                await client.query(query, [supplierId]);
            }
        }

    } catch (err) {
        console.error('Error updating supplier metrics:', err);
        throw err;
    } finally {
        client.release();
    }
}

module.exports = {
    updateResponseMetrics
};
