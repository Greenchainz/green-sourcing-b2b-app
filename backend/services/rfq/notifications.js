const { pool } = require('../../db');

/**
 * Sends a notification to a supplier about an RFQ.
 * @param {string} supplierId - The UUID of the supplier.
 * @param {string} rfqId - The UUID of the RFQ.
 * @param {string} channel - The notification channel ('email', 'push', 'intercom').
 */
async function notifySupplier(supplierId, rfqId, channel) {
    const client = await pool.connect();
    try {
        console.log(`Sending ${channel} notification to supplier ${supplierId} for RFQ ${rfqId}`);

        // In a real implementation, this would call an email service (SendGrid, SES),
        // Push notification service, or Intercom API.
        // For this foundation, we will simulate the send and update the database.

        // TODO: Implement actual sending logic based on channel
        // if (channel === 'email') { ... }
        // if (channel === 'push') { ... }

        // Update RFQ_Distribution_Queue.NotifiedAt
        const query = `
            UPDATE "RFQ_Distribution_Queue"
            SET
                notified_at = NOW(),
                status = 'notified'
            WHERE rfq_id = $1 AND supplier_id = $2
            RETURNING *;
        `;

        await client.query(query, [rfqId, supplierId]);

        return true;
    } catch (err) {
        console.error('Error notifying supplier:', err);
        return false;
    } finally {
        client.release();
    }
}

module.exports = {
    notifySupplier
};
