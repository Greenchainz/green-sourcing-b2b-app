const cron = require('node-cron');
const { pool } = require('../../db');
const { generateMissedRFQEmail } = require('./missedRfq');
const { sendEmail } = require('../mailer');

/**
 * Schedule the missed RFQ email campaign to run daily at 9 AM.
 * This campaign targets unclaimed suppliers who have missed RFQs in their category.
 */
function scheduleMissedRFQEmails() {
    // Schedule task to run at 9:00 AM every day
    cron.schedule('0 9 * * *', async () => {
        console.log('Running Missed RFQ Email Campaign...');
        try {
            const result = await processMissedRFQCampaign();
            console.log(`Missed RFQ Campaign completed: ${result.sent} sent, ${result.skipped} skipped, ${result.failed} failed`);
        } catch (error) {
            console.error('Error in Missed RFQ Campaign:', error);
        }
    });
}

/**
 * Process the missed RFQ email campaign.
 * Finds unclaimed suppliers who haven't received a campaign email in the last 7 days.
 * Uses lowercase table names per canonical schema (azure_postgres_rfq_simulator.sql).
 * 
 * @returns {Promise<{sent: number, skipped: number, failed: number}>}
 */
async function processMissedRFQCampaign() {
    const stats = { sent: 0, skipped: 0, failed: 0 };

    try {
        // Query uses lowercase table names per canonical schema
        const suppliersQuery = `
            SELECT s.id, s.email
            FROM scraped_supplier_data s
            WHERE s.claimed_status = 'unclaimed'
              AND s.email IS NOT NULL
              AND NOT EXISTS (
                  SELECT 1 FROM missed_rfqs m
                  WHERE m.supplier_id = s.id
                    AND m.sent_at > NOW() - INTERVAL '7 days'
              )
            LIMIT 100
        `;

        const result = await pool.query(suppliersQuery);
        const suppliers = result.rows;

        console.log(`Found ${suppliers.length} potential suppliers for campaign.`);

        for (const supplier of suppliers) {
            try {
                // Check for missed RFQs and generate email content
                const emailData = await generateMissedRFQEmail(supplier.id);

                if (!emailData) {
                    stats.skipped++;
                    continue;
                }

                // Send Email
                const sendResult = await sendEmail({
                    to: emailData.to,
                    subject: emailData.subject,
                    html: emailData.html,
                    notificationType: 'missed_rfq'
                });

                if (sendResult.sent) {
                    // Record that we sent this campaign email (lowercase table)
                    await pool.query(
                        `INSERT INTO missed_rfqs (supplier_id, sent_at) VALUES ($1, NOW())`,
                        [supplier.id]
                    );
                    console.log(`Sent Missed RFQ email to supplier ${supplier.id}`);
                    stats.sent++;
                } else {
                    stats.failed++;
                }
            } catch (err) {
                console.error(`Failed to process supplier ${supplier.id}:`, err);
                stats.failed++;
            }
        }
    } catch (err) {
        console.error('Error in processMissedRFQCampaign:', err);
        throw err;
    }

    return stats;
}

module.exports = {
    scheduleMissedRFQEmails,
    processMissedRFQCampaign
};
