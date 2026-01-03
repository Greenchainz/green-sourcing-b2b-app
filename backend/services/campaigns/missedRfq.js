const { pool } = require('../../db');
const { missedRfqTemplate } = require('./emailTemplates');
const { generateClaimToken } = require('./claimProfile');

// Configure mailer pool if not already configured (mailer handles singleton)
const mailer = require('../mailer');
mailer.setPool(pool);

/**
 * Find RFQs that a scraped supplier missed in the last 7 days.
 * Uses lowercase table names per canonical schema (azure_postgres_rfq_simulator.sql).
 * 
 * @param {string} supplierId - The UUID of the scraped supplier.
 * @returns {Promise<Array>}
 */
async function findMissedRFQs(supplierId) {
    if (!supplierId) return [];

    try {
        // Uses lowercase table names per canonical schema
        const query = `
            SELECT r.id, r.project_name, r.budget as value, r.category, r.created_at
            FROM rfqs r
            JOIN scraped_supplier_data s ON s.id = $1
            WHERE r.created_at >= NOW() - INTERVAL '7 days'
              AND r.status = 'open'
              AND (
                  r.category IS NULL 
                  OR s.category IS NULL 
                  OR LOWER(r.category) = LOWER(s.category)
              )
            ORDER BY r.created_at DESC
            LIMIT 50
        `;

        const result = await pool.query(query, [supplierId]);
        return result.rows;
    } catch (error) {
        console.error(`Error finding missed RFQs for supplier ${supplierId}:`, error);
        return [];
    }
}

/**
 * Calculate total value of missed RFQs.
 * @param {Array} rfqs - Array of RFQ objects with 'value' field.
 * @returns {number}
 */
function calculateMissedValue(rfqs) {
    if (!Array.isArray(rfqs) || rfqs.length === 0) return 0;
    return rfqs.reduce((total, rfq) => {
        const value = parseFloat(rfq.value) || 0;
        return total + value;
    }, 0);
}

/**
 * Generate a missed RFQ email for a scraped supplier.
 * Uses lowercase table names per canonical schema.
 * 
 * @param {string} supplierId - The UUID of the scraped supplier.
 * @returns {Promise<{to: string, subject: string, html: string, notificationType: string}|null>}
 */
async function generateMissedRFQEmail(supplierId) {
    if (!supplierId) {
        console.error('generateMissedRFQEmail called without supplierId');
        return null;
    }

    try {
        // 1. Get Supplier Data (lowercase table name)
        const supplierRes = await pool.query(
            'SELECT * FROM scraped_supplier_data WHERE id = $1',
            [supplierId]
        );
        if (supplierRes.rows.length === 0) {
            console.log(`Scraped supplier ${supplierId} not found`);
            return null;
        }
        const supplier = supplierRes.rows[0];

        if (!supplier.email) {
            console.log(`Supplier ${supplierId} has no email`);
            return null;
        }

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

        // Save token to DB so it works when clicked (lowercase table)
        await pool.query(
            'UPDATE scraped_supplier_data SET claim_token = $1 WHERE id = $2',
            [token, supplierId]
        );

        // 5. Construct Email Data
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const claimUrl = `${frontendUrl}/claim-profile?token=${token}`;

        const categories = [...new Set(rfqs.map(r => r.category))].filter(Boolean);
        
        const emailData = {
            rfqCount: rfqs.length,
            totalValue: totalValue,
            categories: categories.length > 0 ? categories : ['General'],
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
        console.error(`Error generating missed RFQ email for ${supplierId}:`, error);
        return null;
    }
}

module.exports = {
    findMissedRFQs,
    calculateMissedValue,
    generateMissedRFQEmail
};
