const { pool } = require('../../db');

// Pixel tracking for email opens
async function trackEmailOpen(emailId) {
    try {
        await pool.query(
            `UPDATE Notification_Log
             SET opened_at = NOW(), status = 'opened'
             WHERE id = $1`,
            [emailId]
        );
        console.log(`Email open tracked for ID: ${emailId}`);
    } catch (error) {
        console.error('Error tracking email open:', error);
    }
}

// Link click tracking
async function trackLinkClick(emailId, linkType) {
    try {
        // We might want a separate table for clicks if multiple clicks are possible
        // For now, update Notification_Log or a related events table
        // Assuming Notification_Log has a clicked_at column or similar,
        // or we just log an event.
        // Let's assume we update Notification_Log for simplicity or log to a new table if exists.
        // The prompt says "Uses tables: Missed_RFQs, Scraped_Supplier_Data, Notification_Log".

        await pool.query(
            `UPDATE Notification_Log
             SET clicked_at = NOW(),
                 metadata = jsonb_set(COALESCE(metadata, '{}'), '{last_click_type}', $2)
             WHERE id = $1`,
            [emailId, JSON.stringify(linkType)]
        );
        console.log(`Link click tracked for ID: ${emailId}, Type: ${linkType}`);
    } catch (error) {
        console.error('Error tracking link click:', error);
    }
}

// Mark converted when supplier claims profile
async function updateConversionStatus(supplierId) {
    try {
        // Mark Scraped_Supplier_Data as converted/claimed
        // This overlaps with processClaimRequest in claimProfile.js but this might be for analytics
        await pool.query(
            `UPDATE Scraped_Supplier_Data
             SET conversion_status = 'converted',
                 converted_at = NOW()
             WHERE id = $1`,
            [supplierId]
        );
        console.log(`Conversion status updated for supplier: ${supplierId}`);
    } catch (error) {
        console.error('Error updating conversion status:', error);
    }
}

module.exports = {
    trackEmailOpen,
    trackLinkClick,
    updateConversionStatus
};
