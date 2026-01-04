const crypto = require('crypto');
const { pool } = require('../../db');

/**
 * Generate a secure claim token for a scraped supplier.
 * @param {string} scrapedSupplierId - The UUID of the scraped supplier.
 * @returns {string} A 64-character hex token.
 */
function generateClaimToken(scrapedSupplierId) {
    // Generate a random 32-byte hex string
    const token = crypto.randomBytes(32).toString('hex');
    return token;
}

/**
 * Validate a claim token and return the supplier data.
 * Uses lowercase table names per canonical schema (azure_postgres_rfq_simulator.sql).
 * 
 * @param {string} token - The claim token to validate.
 * @returns {Promise<{valid: boolean, message?: string, supplier?: object}>}
 */
async function validateClaimToken(token) {
    if (!token || typeof token !== 'string') {
        return { valid: false, message: 'Invalid token format.' };
    }

    try {
        // Uses lowercase table name per canonical schema
        const query = `
            SELECT id, company_name, email, claimed_status
            FROM scraped_supplier_data
            WHERE claim_token = $1 AND claimed_status = 'unclaimed'
        `;
        const result = await pool.query(query, [token]);

        if (result.rows.length === 0) {
            return { valid: false, message: 'Invalid or expired token, or profile already claimed.' };
        }

        return { valid: true, supplier: result.rows[0] };
    } catch (error) {
        console.error('Error validating claim token:', error);
        return { valid: false, message: 'Validation error.' };
    }
}

/**
 * Process a claim request to link scraped data to a new user.
 * Uses lowercase table names per canonical schema.
 * 
 * @param {string} token - The claim token.
 * @param {object} userData - User data containing newSupplierId.
 * @returns {Promise<{success: boolean, message?: string, scrapedSupplierId?: string}>}
 */
async function processClaimRequest(token, userData) {
    if (!token) {
        return { success: false, message: 'Missing token' };
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Verify token again within transaction (uses FOR UPDATE for locking)
        // Uses lowercase table name per canonical schema
        const checkQuery = `
            SELECT id, company_name, email
            FROM scraped_supplier_data
            WHERE claim_token = $1 AND claimed_status = 'unclaimed'
            FOR UPDATE
        `;
        const checkResult = await client.query(checkQuery, [token]);

        if (checkResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return { success: false, message: 'Invalid token or already claimed' };
        }

        const scrapedSupplier = checkResult.rows[0];

        // 2. Validate user data
        if (!userData || !userData.newSupplierId) {
            await client.query('ROLLBACK');
            return { success: false, message: 'Missing new user ID' };
        }

        const newSupplierId = userData.newSupplierId;

        // 3. Mark as claimed
        await markAsClaimed(scrapedSupplier.id, newSupplierId, client);

        await client.query('COMMIT');
        return { success: true, scrapedSupplierId: scrapedSupplier.id };

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error processing claim request:', error);
        return { success: false, message: 'Processing error.' };
    } finally {
        client.release();
    }
}

/**
 * Mark a scraped supplier as claimed by a user.
 * Uses lowercase table names per canonical schema.
 * 
 * @param {string} scrapedSupplierId - The UUID of the scraped supplier.
 * @param {string} newSupplierId - The UUID of the claiming user/supplier.
 * @param {object} client - Optional database client for transaction.
 * @returns {Promise<boolean>}
 */
async function markAsClaimed(scrapedSupplierId, newSupplierId, client) {
    if (!scrapedSupplierId || !newSupplierId) return false;

    // Uses lowercase table name per canonical schema
    const query = `
        UPDATE scraped_supplier_data
        SET claimed_status = 'claimed',
            claimed_by_user_id = $2,
            claimed_at = NOW()
        WHERE id = $1
    `;
    // Use provided client if transaction, otherwise pool
    const db = client || pool;
    await db.query(query, [scrapedSupplierId, newSupplierId]);
    return true;
}

module.exports = {
    generateClaimToken,
    validateClaimToken,
    processClaimRequest,
    markAsClaimed
};
