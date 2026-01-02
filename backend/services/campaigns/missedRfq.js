const { pool } = require('../../db');
const { missedRfqTemplate } = require('./emailTemplates');
const { generateClaimToken } = require('./claimProfile');

// Configure mailer pool if not already configured (mailer handles singleton)
const mailer = require('../mailer');
mailer.setPool(pool);

async function findMissedRFQs(supplierId) {
    try {
        const query = `
            SELECT r.id, r.project_name, r.budget as value, r.category, r.created_at
            FROM rfqs r
            JOIN Scraped_Supplier_Data s ON s.id = $1
            WHERE r.created_at >= NOW() - INTERVAL '7 days'
            AND r.category = s.category
        `;

        const result = await pool.query(query, [supplierId]);
        return result.rows;
    } catch (error) {
        console.error(`Error finding missed RFQs for supplier ${supplierId}:`, error);
        return [];
    }
}

function calculateMissedValue(rfqs) {
    if (!rfqs || rfqs.length === 0) return 0;
    return rfqs.reduce((total, rfq) => total + (Number(rfq.value) || 0), 0);
}

async function generateMissedRFQEmail(supplierId) {
    try {
        // 1. Get Supplier Data
        const supplierRes = await pool.query('SELECT * FROM Scraped_Supplier_Data WHERE id = $1', [supplierId]);
        if (supplierRes.rows.length === 0) {
            throw new Error(`Supplier ${supplierId} not found`);
        }
        const supplier = supplierRes.rows[0];

        // 2. Get Missed RFQs
        const rfqs = await findMissedRFQs(supplierId);
        if (rfqs.length === 0) {
            console.log(`No missed RFQs for supplier ${supplierId}`);
            return null;
        }

        // 3. Calculate Value
        const totalValue = calculateMissedValue(rfqs);

        // 4. Generate Claim Token
        const token = generateClaimToken(supplierId);

        // Save token to DB so it works when clicked
        await pool.query('UPDATE Scraped_Supplier_Data SET claim_token = $1 WHERE id = $2', [token, supplierId]);

        // 5. Construct Email Data
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const claimUrl = `${frontendUrl}/claim-profile?token=${token}`;

        const emailData = {
            rfqCount: rfqs.length,
            totalValue: totalValue,
            categories: [...new Set(rfqs.map(r => r.category))].filter(Boolean),
            claimUrl: claimUrl
        };

        const html = missedRfqTemplate(emailData);
        const subject = `You missed ${rfqs.length} RFQs worth $${totalValue.toLocaleString()} this week`;

        return {
            to: supplier.email,
            subject: subject,
            html: html,
            notificationType: 'missed_rfq'
        };

    } catch (error) {
        console.error('Error generating missed RFQ email:', error);
        throw error;
    }
}

module.exports = {
    findMissedRFQs,
    calculateMissedValue,
    generateMissedRFQEmail
};
