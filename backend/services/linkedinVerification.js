/**
 * LinkedIn Verification Service
 * 
 * Handles buyer verification via LinkedIn OAuth.
 * Stores verification status, timestamp, and profile info.
 * 
 * NOTE: This is a backend-only service. OAuth flow must be initiated by frontend.
 */

const { pool } = require('../db');

/**
 * Marks a buyer as LinkedIn verified.
 * Called after successful LinkedIn OAuth callback.
 * 
 * @param {number|string} buyerId - The buyer's ID
 * @param {object} linkedinData - LinkedIn profile data
 * @param {string} linkedinData.profileId - LinkedIn member ID
 * @param {string} linkedinData.profileUrl - LinkedIn profile URL
 * @param {object} options - Additional options
 * @param {string} options.ipAddress - Client IP address
 * @param {string} options.userAgent - Client user agent
 * @returns {Promise<{success: boolean, buyer?: object, error?: string}>}
 */
async function verifyLinkedIn(buyerId, linkedinData, options = {}) {
    if (!buyerId) {
        return { success: false, error: 'buyerId is required' };
    }

    if (!linkedinData?.profileId) {
        return { success: false, error: 'LinkedIn profileId is required' };
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Check if buyer exists
        const buyerCheck = await client.query(
            'SELECT BuyerID, linkedin_verified FROM Buyers WHERE BuyerID = $1',
            [buyerId]
        );

        if (buyerCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return { success: false, error: 'Buyer not found' };
        }

        // Update buyer with LinkedIn verification
        const now = new Date();
        const updateResult = await client.query(
            `UPDATE Buyers 
             SET linkedin_verified = TRUE,
                 linkedin_verified_at = $2,
                 linkedin_profile_id = $3,
                 linkedin_profile_url = $4,
                 UpdatedAt = $2
             WHERE BuyerID = $1
             RETURNING BuyerID, linkedin_verified, linkedin_verified_at, linkedin_profile_id, linkedin_profile_url`,
            [buyerId, now, linkedinData.profileId, linkedinData.profileUrl || null]
        );

        // Log the verification event
        await client.query(
            `INSERT INTO Buyer_Verification_Log 
             (buyer_id, verification_type, status, profile_id, profile_url, metadata, ip_address, user_agent)
             VALUES ($1, 'linkedin', 'verified', $2, $3, $4, $5, $6)`,
            [
                buyerId,
                linkedinData.profileId,
                linkedinData.profileUrl || null,
                JSON.stringify({ source: 'oauth', timestamp: now.toISOString() }),
                options.ipAddress || null,
                options.userAgent || null
            ]
        );

        await client.query('COMMIT');

        return {
            success: true,
            buyer: updateResult.rows[0]
        };
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[LinkedIn Verification] Error:', err);
        return { success: false, error: err.message };
    } finally {
        client.release();
    }
}

/**
 * Revokes LinkedIn verification for a buyer.
 * 
 * @param {number|string} buyerId - The buyer's ID
 * @param {string} reason - Reason for revocation
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function revokeLinkedInVerification(buyerId, reason = 'manual_revocation') {
    if (!buyerId) {
        return { success: false, error: 'buyerId is required' };
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Clear LinkedIn verification
        await client.query(
            `UPDATE Buyers 
             SET linkedin_verified = FALSE,
                 linkedin_verified_at = NULL,
                 linkedin_profile_id = NULL,
                 linkedin_profile_url = NULL,
                 UpdatedAt = NOW()
             WHERE BuyerID = $1`,
            [buyerId]
        );

        // Log the revocation event
        await client.query(
            `INSERT INTO Buyer_Verification_Log 
             (buyer_id, verification_type, status, metadata)
             VALUES ($1, 'linkedin', 'revoked', $2)`,
            [buyerId, JSON.stringify({ reason })]
        );

        await client.query('COMMIT');
        return { success: true };
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[LinkedIn Verification] Revocation error:', err);
        return { success: false, error: err.message };
    } finally {
        client.release();
    }
}

/**
 * Gets the verification status for a buyer.
 * 
 * @param {number|string} buyerId - The buyer's ID
 * @returns {Promise<{success: boolean, status?: object, error?: string}>}
 */
async function getVerificationStatus(buyerId) {
    if (!buyerId) {
        return { success: false, error: 'buyerId is required' };
    }

    try {
        const result = await pool.query(
            `SELECT 
                BuyerID,
                linkedin_verified,
                linkedin_verified_at,
                linkedin_profile_id,
                linkedin_profile_url,
                deposit_verified,
                deposit_verified_at,
                (linkedin_verified = TRUE AND deposit_verified = TRUE) as fully_verified
             FROM Buyers 
             WHERE BuyerID = $1`,
            [buyerId]
        );

        if (result.rows.length === 0) {
            return { success: false, error: 'Buyer not found' };
        }

        return {
            success: true,
            status: result.rows[0]
        };
    } catch (err) {
        console.error('[LinkedIn Verification] Status check error:', err);
        return { success: false, error: err.message };
    }
}

/**
 * Checks if a buyer can distribute RFQs (both verifications required).
 * 
 * @param {number|string} buyerId - The buyer's ID
 * @returns {Promise<{canDistribute: boolean, missing: string[], error?: string}>}
 */
async function canDistributeRFQ(buyerId) {
    if (!buyerId) {
        return { canDistribute: false, missing: ['buyerId'], error: 'buyerId is required' };
    }

    try {
        const result = await pool.query(
            `SELECT linkedin_verified, deposit_verified 
             FROM Buyers 
             WHERE BuyerID = $1`,
            [buyerId]
        );

        if (result.rows.length === 0) {
            return { canDistribute: false, missing: ['buyer'], error: 'Buyer not found' };
        }

        const { linkedin_verified, deposit_verified } = result.rows[0];
        const missing = [];

        if (!linkedin_verified) missing.push('linkedin');
        if (!deposit_verified) missing.push('deposit');

        return {
            canDistribute: missing.length === 0,
            missing
        };
    } catch (err) {
        console.error('[LinkedIn Verification] Distribution check error:', err);
        return { canDistribute: false, missing: [], error: err.message };
    }
}

/**
 * Marks a buyer's deposit as verified.
 * This is typically called by a payment webhook or admin action.
 * 
 * @param {number|string} buyerId - The buyer's ID
 * @param {number} amountCents - Deposit amount in cents
 * @param {object} options - Additional options
 * @returns {Promise<{success: boolean, buyer?: object, error?: string}>}
 */
async function verifyDeposit(buyerId, amountCents, options = {}) {
    if (!buyerId) {
        return { success: false, error: 'buyerId is required' };
    }

    if (!amountCents || amountCents <= 0) {
        return { success: false, error: 'Valid deposit amount is required' };
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const now = new Date();
        const updateResult = await client.query(
            `UPDATE Buyers 
             SET deposit_verified = TRUE,
                 deposit_verified_at = $2,
                 deposit_amount_cents = $3,
                 UpdatedAt = $2
             WHERE BuyerID = $1
             RETURNING BuyerID, deposit_verified, deposit_verified_at, deposit_amount_cents`,
            [buyerId, now, amountCents]
        );

        if (updateResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return { success: false, error: 'Buyer not found' };
        }

        // Log the verification event
        await client.query(
            `INSERT INTO Buyer_Verification_Log 
             (buyer_id, verification_type, status, metadata, ip_address)
             VALUES ($1, 'deposit', 'verified', $2, $3)`,
            [
                buyerId,
                JSON.stringify({ amount_cents: amountCents, source: options.source || 'api' }),
                options.ipAddress || null
            ]
        );

        await client.query('COMMIT');

        return {
            success: true,
            buyer: updateResult.rows[0]
        };
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[Deposit Verification] Error:', err);
        return { success: false, error: err.message };
    } finally {
        client.release();
    }
}

module.exports = {
    verifyLinkedIn,
    revokeLinkedInVerification,
    getVerificationStatus,
    canDistributeRFQ,
    verifyDeposit
};
