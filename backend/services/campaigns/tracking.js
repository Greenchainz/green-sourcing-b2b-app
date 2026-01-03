const { pool } = require('../../db');

/**
 * Track email open via pixel tracking.
 * Uses lowercase table names per canonical schema (azure_postgres_rfq_simulator.sql).
 * 
 * @param {string} emailId - The UUID of the notification log entry.
 * @returns {Promise<boolean>}
 */
async function trackEmailOpen(emailId) {
    if (!emailId) return false;

    try {
        // Uses lowercase table name per canonical schema
        await pool.query(
            `UPDATE notification_log
             SET opened_at = NOW(), status = 'opened'
             WHERE id = $1`,
            [emailId]
        );
        console.log(`Email open tracked for ID: ${emailId}`);
        return true;
    } catch (error) {
        console.error('Error tracking email open:', error);
        return false;
    }
}

/**
 * Track link click from an email.
 * Uses lowercase table names per canonical schema.
 * 
 * @param {string} emailId - The UUID of the notification log entry.
 * @param {string} linkType - Type of link clicked (e.g., 'claim', 'view_rfq').
 * @returns {Promise<boolean>}
 */
async function trackLinkClick(emailId, linkType) {
    if (!emailId) return false;

    try {
        // Uses lowercase table name per canonical schema
        await pool.query(
            `UPDATE notification_log
             SET clicked_at = NOW(),
                 metadata = jsonb_set(COALESCE(metadata, '{}'), '{last_click_type}', $2::jsonb)
             WHERE id = $1`,
            [emailId, JSON.stringify(linkType || 'unknown')]
        );
        console.log(`Link click tracked for ID: ${emailId}, Type: ${linkType}`);
        return true;
    } catch (error) {
        console.error('Error tracking link click:', error);
        return false;
    }
}

/**
 * Update conversion status when supplier claims profile.
 * Uses lowercase table names per canonical schema.
 * 
 * @param {string} supplierId - The UUID of the scraped supplier.
 * @returns {Promise<boolean>}
 */
async function updateConversionStatus(supplierId) {
    if (!supplierId) return false;

    try {
        // Uses lowercase table name per canonical schema
        await pool.query(
            `UPDATE scraped_supplier_data
             SET conversion_status = 'converted',
                 converted_at = NOW()
             WHERE id = $1`,
            [supplierId]
        );
        console.log(`Conversion status updated for supplier: ${supplierId}`);
        return true;
    } catch (error) {
        console.error('Error updating conversion status:', error);
        return false;
    }
}

/**
 * Get tracking metrics for a supplier.
 * @param {string} supplierId - The UUID of the scraped supplier.
 * @returns {Promise<object>}
 */
async function getSupplierTrackingMetrics(supplierId) {
    if (!supplierId) return null;

    try {
        const result = await pool.query(
            `SELECT 
                COUNT(*) FILTER (WHERE status = 'sent') as emails_sent,
                COUNT(*) FILTER (WHERE status = 'opened') as emails_opened,
                COUNT(*) FILTER (WHERE clicked_at IS NOT NULL) as emails_clicked
             FROM notification_log
             WHERE recipient IN (
                 SELECT email FROM scraped_supplier_data WHERE id = $1
             )`,
            [supplierId]
        );
        return result.rows[0] || { emails_sent: 0, emails_opened: 0, emails_clicked: 0 };
    } catch (error) {
        console.error('Error fetching tracking metrics:', error);
        return null;
    }
}

module.exports = {
    trackEmailOpen,
    trackLinkClick,
    updateConversionStatus,
    getSupplierTrackingMetrics
};
