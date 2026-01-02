const cron = require('node-cron');
const { pool } = require('../../db');
const { generateMissedRFQEmail } = require('./missedRfq');
const { sendEmail } = require('../mailer');

// Run daily at 9 AM
function scheduleMissedRFQEmails() {
    // Schedule task to run at 9:00 AM every day
    cron.schedule('0 9 * * *', async () => {
        console.log('Running Missed RFQ Email Campaign...');
        try {
            await processMissedRFQCampaign();
        } catch (error) {
            console.error('Error in Missed RFQ Campaign:', error);
        }
    });
}

async function processMissedRFQCampaign() {
    const suppliersQuery = `
        SELECT s.id, s.email
        FROM Scraped_Supplier_Data s
        WHERE s.claimed_status = 'unclaimed'
        AND NOT EXISTS (
            SELECT 1 FROM Missed_RFQs m
            WHERE m.supplier_id = s.id
            AND m.sent_at > NOW() - INTERVAL '7 days'
        )
    `;

    const result = await pool.query(suppliersQuery);
    const suppliers = result.rows;

    console.log(`Found ${suppliers.length} potential suppliers for campaign.`);

    for (const supplier of suppliers) {
        try {
            // Check for missed RFQs and generate email content
            const emailData = await generateMissedRFQEmail(supplier.id);

            if (emailData) {
                // Send Email
                const sendResult = await sendEmail({
                    to: emailData.to,
                    subject: emailData.subject,
                    html: emailData.html,
                    notificationType: 'missed_rfq'
                });

                if (sendResult.sent) {
                    await pool.query(
                        `INSERT INTO Missed_RFQs (supplier_id, sent_at) VALUES ($1, NOW())`,
                        [supplier.id]
                    );
                    console.log(`Sent Missed RFQ email to supplier ${supplier.id}`);
                }
            }
        } catch (err) {
            console.error(`Failed to process supplier ${supplier.id}:`, err);
        }
    }
}

module.exports = {
    scheduleMissedRFQEmails,
    processMissedRFQCampaign // Exported for testing/manual triggering
};
