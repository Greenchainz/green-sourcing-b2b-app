const crypto = require('crypto');
const { pool } = require('../../db');

// Function to create a secure random token
function generateClaimToken(scrapedSupplierId) {
    // Generate a random 32-byte hex string
    const token = crypto.randomBytes(32).toString('hex');
    // We could store it here, but typically this is called before saving to DB
    // For now just return the token
    return token;
}

// Function to verify and get supplier data based on the token
async function validateClaimToken(token) {
    try {
        const query = `
            SELECT id, company_name, email, claimed_status
            FROM Scraped_Supplier_Data
            WHERE claim_token = $1 AND claimed_status = 'unclaimed'
        `;
        const result = await pool.query(query, [token]);

        if (result.rows.length === 0) {
            return { valid: false, message: 'Invalid or expired token, or profile already claimed.' };
        }

        return { valid: true, supplier: result.rows[0] };
    } catch (error) {
        console.error('Error validating claim token:', error);
        throw error;
    }
}

// Function to link scraped data to a new user
async function processClaimRequest(token, userData) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Verify token again (double check within transaction)
        const checkQuery = `
            SELECT id, company_name, email
            FROM Scraped_Supplier_Data
            WHERE claim_token = $1 AND claimed_status = 'unclaimed'
            FOR UPDATE
        `;
        const checkResult = await client.query(checkQuery, [token]);

        if (checkResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return { success: false, message: 'Invalid token or already claimed' };
        }

        const scrapedSupplier = checkResult.rows[0];

        // 2. Create new user in users table if not exists (or user data provided)
        // Note: userData should come from the registration form where they provided password etc.
        // Assuming userData contains { email, passwordHash, ... } or user is already created and we are linking.
        // The prompt says "Link scraped data to new user", implying new user creation or mapping.
        // Let's assume the user is already created in the auth system and we have their newSupplierId
        // OR we are returning data for the frontend to pre-fill.

        // However, the function signature `processClaimRequest(token, userData)` suggests we are doing the linking.
        // Let's assume `userData` has `newSupplierId`.

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
        throw error;
    } finally {
        client.release();
    }
}

// Function to update Scraped_Supplier_Data status
async function markAsClaimed(scrapedSupplierId, newSupplierId, client) {
    const query = `
        UPDATE Scraped_Supplier_Data
        SET claimed_status = 'claimed',
            claimed_by_user_id = $2,
            claimed_at = NOW()
        WHERE id = $1
    `;
    // Use provided client if transaction, otherwise pool
    const db = client || pool;
    await db.query(query, [scrapedSupplierId, newSupplierId]);
}

module.exports = {
    generateClaimToken,
    validateClaimToken,
    processClaimRequest,
    markAsClaimed
};
