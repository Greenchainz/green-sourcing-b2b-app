const { pool } = require('../../db');
const { ACCESS_LEVELS, getPendingShadowOutreach } = require('./waves');

/**
 * Valid notification channels.
 */
const NOTIFICATION_CHANNELS = ['email', 'push', 'intercom', 'sms'];

/**
 * Notification types for different supplier access levels.
 */
const NOTIFICATION_TYPES = {
    FULL_RFQ: 'full_rfq',           // Full RFQ details for Premium/Standard/Free
    CLAIM_PROMPT: 'claim_prompt',    // Claim profile prompt for Shadow suppliers
    UPGRADE_PROMPT: 'upgrade_prompt' // Upgrade tier prompt
};

/**
 * Sends a notification to a supplier about an RFQ.
 * Updates the queue status to 'notified' using the atomic helper function.
 * 
 * @param {string} supplierId - The UUID of the supplier.
 * @param {string} rfqId - The UUID of the RFQ.
 * @param {string} channel - The notification channel ('email', 'push', 'intercom').
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function notifySupplier(supplierId, rfqId, channel = 'email') {
    if (!supplierId || !rfqId) {
        console.error('notifySupplier called with missing parameters');
        return { success: false, error: 'Missing supplierId or rfqId' };
    }

    const normalizedChannel = (channel || 'email').toLowerCase();
    if (!NOTIFICATION_CHANNELS.includes(normalizedChannel)) {
        console.warn(`Unknown notification channel: ${channel}, defaulting to email`);
    }

    const client = await pool.connect();
    try {
        console.log(`Sending ${normalizedChannel} notification to supplier ${supplierId} for RFQ ${rfqId}`);

        // Use atomic function to mark as notified (prevents race conditions)
        const result = await client.query(
            'SELECT gc_mark_queue_notified($1, $2) AS success',
            [rfqId, supplierId]
        );

        const marked = result.rows[0]?.success === true;

        if (!marked) {
            // Entry might not exist, already notified, or expired
            console.log(`Queue entry not found or already notified for supplier ${supplierId}, RFQ ${rfqId}`);
            return { success: false, error: 'Queue entry not found or already notified' };
        }

        // TODO: Implement actual sending logic based on channel
        // This would integrate with:
        // - Email: SendGrid, SES, or the mailer service
        // - Push: Firebase Cloud Messaging, OneSignal
        // - Intercom: Intercom API (see services/intercom)
        // - SMS: Twilio, MessageBird

        // For now, log success
        console.log(`Notification marked for supplier ${supplierId}, RFQ ${rfqId}`);

        return { success: true };

    } catch (err) {
        console.error(`Error notifying supplier ${supplierId} for RFQ ${rfqId}:`, err);
        return { success: false, error: err.message };
    } finally {
        client.release();
    }
}

/**
 * Gets pending notifications that are due to be sent.
 * @param {number} limit - Maximum number of notifications to fetch.
 * @returns {Promise<Array>}
 */
async function getPendingNotifications(limit = 100) {
    try {
        const result = await pool.query(
            `SELECT 
                q.rfq_id,
                q.supplier_id,
                q.wave_number,
                q.visible_at,
                q.expires_at,
                s.email AS supplier_email,
                s.name AS supplier_name,
                r.project_name,
                r.category,
                r.budget
             FROM "RFQ_Distribution_Queue" q
             JOIN suppliers s ON s.id = q.supplier_id
             JOIN rfqs r ON r.id = q.rfq_id
             WHERE q.status = 'pending'
               AND q.visible_at <= NOW()
               AND (q.expires_at IS NULL OR q.expires_at > NOW())
             ORDER BY q.visible_at ASC
             LIMIT $1`,
            [limit]
        );
        return result.rows;
    } catch (err) {
        console.error('Error fetching pending notifications:', err);
        return [];
    }
}

/**
 * Batch notify multiple suppliers.
 * @param {Array<{supplierId: string, rfqId: string, channel?: string}>} notifications
 * @returns {Promise<{sent: number, failed: number}>}
 */
async function batchNotify(notifications) {
    if (!Array.isArray(notifications) || notifications.length === 0) {
        return { sent: 0, failed: 0 };
    }

    let sent = 0;
    let failed = 0;

    for (const notif of notifications) {
        const result = await notifySupplier(
            notif.supplierId,
            notif.rfqId,
            notif.channel || 'email'
        );
        if (result.success) {
            sent++;
        } else {
            failed++;
        }
    }

    return { sent, failed };
}

/**
 * Marks a queue entry as viewed by the supplier.
 * @param {string} supplierId - The UUID of the supplier.
 * @param {string} rfqId - The UUID of the RFQ.
 * @returns {Promise<boolean>}
 */
async function markAsViewed(supplierId, rfqId) {
    if (!supplierId || !rfqId) return false;

    try {
        await pool.query(
            `UPDATE "RFQ_Distribution_Queue"
             SET status = 'viewed'
             WHERE rfq_id = $1 
               AND supplier_id = $2
               AND status IN ('pending', 'notified')`,
            [rfqId, supplierId]
        );
        return true;
    } catch (err) {
        console.error(`Error marking as viewed for supplier ${supplierId}, RFQ ${rfqId}:`, err);
        return false;
    }
}

/**
 * Sends a claim/outreach prompt to a shadow supplier.
 * Shadow suppliers don't receive full RFQ details - they get prompts to claim their profile.
 * 
 * @param {string} supplierId - The UUID of the supplier.
 * @param {string} rfqId - The UUID of the RFQ (for tracking).
 * @param {string} channel - The notification channel.
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function sendShadowOutreach(supplierId, rfqId, channel = 'email') {
    if (!supplierId || !rfqId) {
        console.error('sendShadowOutreach called with missing parameters');
        return { success: false, error: 'Missing supplierId or rfqId' };
    }

    const client = await pool.connect();
    try {
        console.log(`[Shadow Outreach] Sending claim prompt to supplier ${supplierId} for RFQ ${rfqId}`);

        // Update the queue entry status
        const result = await client.query(
            `UPDATE "RFQ_Distribution_Queue"
             SET notified_at = NOW(),
                 status = 'notified'
             WHERE rfq_id = $1 
               AND supplier_id = $2
               AND access_level = $3
               AND status = 'pending'
             RETURNING *`,
            [rfqId, supplierId, ACCESS_LEVELS.OUTREACH_ONLY]
        );

        if (result.rows.length === 0) {
            console.log(`[Shadow Outreach] No pending shadow entry for supplier ${supplierId}, RFQ ${rfqId}`);
            return { success: false, error: 'No pending shadow entry found' };
        }

        // TODO: Implement actual outreach email sending
        // This would send an email like:
        // "A new RFQ matching your products was just submitted. 
        //  Claim your profile to access full details and respond!"
        // 
        // Integration points:
        // - services/mailer.js for email sending
        // - services/campaigns/claimProfile.js for claim links
        // - services/intercom for chat-based outreach

        console.log(`[Shadow Outreach] Claim prompt marked for supplier ${supplierId}, RFQ ${rfqId}`);

        return { success: true, notificationType: NOTIFICATION_TYPES.CLAIM_PROMPT };

    } catch (err) {
        console.error(`[Shadow Outreach] Error sending outreach to ${supplierId} for RFQ ${rfqId}:`, err);
        return { success: false, error: err.message };
    } finally {
        client.release();
    }
}

/**
 * Gets pending notifications with access level awareness.
 * Separates full RFQ notifications from shadow outreach prompts.
 * 
 * @param {number} limit - Maximum number of notifications to fetch.
 * @returns {Promise<{fullAccess: Array, shadowOutreach: Array}>}
 */
async function getPendingNotificationsByAccessLevel(limit = 100) {
    try {
        const result = await pool.query(
            `SELECT 
                q.rfq_id,
                q.supplier_id,
                q.wave_number,
                q.visible_at,
                q.expires_at,
                q.access_level,
                q.wave_reason,
                q.tier_snapshot,
                s.email AS supplier_email,
                s.name AS supplier_name,
                r.project_name,
                r.category,
                r.budget
             FROM "RFQ_Distribution_Queue" q
             JOIN suppliers s ON s.id = q.supplier_id
             JOIN rfqs r ON r.id = q.rfq_id
             WHERE q.status = 'pending'
               AND q.visible_at <= NOW()
               AND (q.expires_at IS NULL OR q.expires_at > NOW())
             ORDER BY q.access_level DESC, q.visible_at ASC
             LIMIT $1`,
            [limit]
        );

        // Separate by access level
        const fullAccess = [];
        const shadowOutreach = [];

        for (const row of result.rows) {
            if (row.access_level === ACCESS_LEVELS.OUTREACH_ONLY) {
                shadowOutreach.push({
                    ...row,
                    notificationType: NOTIFICATION_TYPES.CLAIM_PROMPT
                });
            } else {
                fullAccess.push({
                    ...row,
                    notificationType: NOTIFICATION_TYPES.FULL_RFQ
                });
            }
        }

        return { fullAccess, shadowOutreach };
    } catch (err) {
        console.error('Error fetching pending notifications by access level:', err);
        return { fullAccess: [], shadowOutreach: [] };
    }
}

/**
 * Batch process shadow supplier outreach.
 * Sends claim/upgrade prompts to shadow suppliers.
 * 
 * @param {number} limit - Maximum suppliers to process.
 * @returns {Promise<{sent: number, failed: number}>}
 */
async function processShadowOutreachBatch(limit = 50) {
    try {
        const shadowEntries = await getPendingShadowOutreach(limit);
        
        if (shadowEntries.length === 0) {
            console.log('[Shadow Outreach] No pending shadow outreach to process');
            return { sent: 0, failed: 0 };
        }

        console.log(`[Shadow Outreach] Processing ${shadowEntries.length} shadow outreach entries`);

        let sent = 0;
        let failed = 0;

        for (const entry of shadowEntries) {
            const result = await sendShadowOutreach(
                entry.supplier_id,
                entry.rfq_id,
                'email'
            );

            if (result.success) {
                sent++;
            } else {
                failed++;
            }
        }

        console.log(`[Shadow Outreach] Batch complete: ${sent} sent, ${failed} failed`);
        return { sent, failed };
    } catch (err) {
        console.error('[Shadow Outreach] Error processing batch:', err);
        return { sent: 0, failed: 0 };
    }
}

module.exports = {
    notifySupplier,
    getPendingNotifications,
    getPendingNotificationsByAccessLevel,
    batchNotify,
    markAsViewed,
    sendShadowOutreach,
    processShadowOutreachBatch,
    NOTIFICATION_CHANNELS,
    NOTIFICATION_TYPES
};
