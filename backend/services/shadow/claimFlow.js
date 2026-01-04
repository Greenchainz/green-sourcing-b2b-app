/**
 * Shadow Supplier Claim Flow Service
 * 
 * Implements the claim/opt-in flow primitives for shadow suppliers.
 * Handles claim token generation, validation, verification codes,
 * and opt-out processing with full audit logging.
 * 
 * @module services/shadow/claimFlow
 */

const { pool } = require('../../db');
const crypto = require('crypto');

/**
 * Token expiry durations (in hours)
 */
const TOKEN_EXPIRY = {
    CLAIM: 72,           // 3 days for claim tokens
    VERIFICATION: 1,     // 1 hour for verification codes
    PASSWORD_RESET: 24   // 24 hours for password reset
};

/**
 * Rate limiting settings
 */
const RATE_LIMITS = {
    MAX_CLAIM_ATTEMPTS: 5,
    LOCKOUT_MINUTES: 30,
    MAX_TOKENS_PER_DAY: 3
};

/**
 * Generate a cryptographically secure claim token
 * @param {number} length - Token length in bytes (default 32)
 * @returns {string} - Hex encoded token
 */
function generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate a 6-digit verification code
 * @returns {string} - 6 digit code
 */
function generateVerificationCode() {
    return crypto.randomInt(100000, 999999).toString();
}

/**
 * Check if supplier is rate limited for claim attempts
 * @param {string} shadowSupplierId - UUID of shadow supplier
 * @returns {Promise<{limited: boolean, reason?: string, retryAfter?: Date}>}
 */
async function checkRateLimit(shadowSupplierId) {
    if (!shadowSupplierId) {
        return { limited: true, reason: 'Invalid supplier ID' };
    }
    
    try {
        const result = await pool.query(
            `SELECT claim_attempts, last_claim_attempt_at
             FROM scraped_supplier_data
             WHERE id = $1`,
            [shadowSupplierId]
        );
        
        if (result.rows.length === 0) {
            return { limited: true, reason: 'Supplier not found' };
        }
        
        const { claim_attempts, last_claim_attempt_at } = result.rows[0];
        
        // Check if in lockout period
        if (claim_attempts >= RATE_LIMITS.MAX_CLAIM_ATTEMPTS && last_claim_attempt_at) {
            const lockoutEnd = new Date(last_claim_attempt_at);
            lockoutEnd.setMinutes(lockoutEnd.getMinutes() + RATE_LIMITS.LOCKOUT_MINUTES);
            
            if (new Date() < lockoutEnd) {
                return { 
                    limited: true, 
                    reason: 'Too many attempts',
                    retryAfter: lockoutEnd
                };
            }
            
            // Lockout period passed, reset counter
            await pool.query(
                `UPDATE scraped_supplier_data
                 SET claim_attempts = 0
                 WHERE id = $1`,
                [shadowSupplierId]
            );
        }
        
        // Check daily token limit
        const tokenCountResult = await pool.query(
            `SELECT COUNT(*) as count
             FROM supplier_claim_tokens
             WHERE shadow_supplier_id = $1
               AND created_at > NOW() - INTERVAL '24 hours'`,
            [shadowSupplierId]
        );
        
        if (parseInt(tokenCountResult.rows[0].count, 10) >= RATE_LIMITS.MAX_TOKENS_PER_DAY) {
            return { 
                limited: true, 
                reason: 'Daily token limit reached'
            };
        }
        
        return { limited: false };
        
    } catch (error) {
        console.error('Error checking rate limit:', error);
        return { limited: false }; // Allow on error to avoid blocking legitimate requests
    }
}

/**
 * Generate a claim token for a shadow supplier
 * @param {string} shadowSupplierId - UUID of shadow supplier
 * @param {object} options - Options
 * @returns {Promise<{success: boolean, token?: string, expiresAt?: Date, error?: string}>}
 */
async function generateClaimToken(shadowSupplierId, options = {}) {
    if (!shadowSupplierId) {
        return { success: false, error: 'Supplier ID required' };
    }
    
    const { expiryHours = TOKEN_EXPIRY.CLAIM, ipAddress = null } = options;
    
    // Check rate limits
    const rateLimit = await checkRateLimit(shadowSupplierId);
    if (rateLimit.limited) {
        return { 
            success: false, 
            error: rateLimit.reason,
            retryAfter: rateLimit.retryAfter
        };
    }
    
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // Verify supplier exists and is claimable
        const supplierResult = await client.query(
            `SELECT id, claimed_status, opt_out_status
             FROM scraped_supplier_data
             WHERE id = $1
             FOR UPDATE`,
            [shadowSupplierId]
        );
        
        if (supplierResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return { success: false, error: 'Supplier not found' };
        }
        
        const supplier = supplierResult.rows[0];
        
        if (supplier.claimed_status === 'claimed') {
            await client.query('ROLLBACK');
            return { success: false, error: 'Supplier already claimed' };
        }
        
        if (supplier.opt_out_status === 'opted_out') {
            await client.query('ROLLBACK');
            return { success: false, error: 'Supplier has opted out' };
        }
        
        // Invalidate any existing unused tokens
        await client.query(
            `UPDATE supplier_claim_tokens
             SET used_at = NOW()
             WHERE shadow_supplier_id = $1
               AND token_type = 'claim'
               AND used_at IS NULL`,
            [shadowSupplierId]
        );
        
        // Generate new token
        const token = generateSecureToken();
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + expiryHours);
        
        // Insert token record
        await client.query(
            `INSERT INTO supplier_claim_tokens (
                shadow_supplier_id, token, token_type, expires_at
             ) VALUES ($1, $2, 'claim', $3)`,
            [shadowSupplierId, token, expiresAt]
        );
        
        // Update supplier with token info
        await client.query(
            `UPDATE scraped_supplier_data
             SET claim_token = $2,
                 claim_token_created_at = NOW(),
                 claim_token_expires_at = $3
             WHERE id = $1`,
            [shadowSupplierId, token, expiresAt]
        );
        
        // Log the action
        await client.query(
            `INSERT INTO supplier_claim_audit_log (
                shadow_supplier_id, action, ip_address, success
             ) VALUES ($1, 'token_generated', $2, TRUE)`,
            [shadowSupplierId, ipAddress]
        );
        
        await client.query('COMMIT');
        
        console.log(`Claim token generated for shadow supplier ${shadowSupplierId}`);
        return { success: true, token, expiresAt };
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error generating claim token:', error);
        return { success: false, error: error.message };
    } finally {
        client.release();
    }
}

/**
 * Validate a claim token
 * @param {string} token - The claim token to validate
 * @param {object} options - Options
 * @returns {Promise<{valid: boolean, supplierId?: string, supplierData?: object, error?: string}>}
 */
async function validateClaimToken(token, options = {}) {
    if (!token || typeof token !== 'string') {
        return { valid: false, error: 'Invalid token format' };
    }
    
    const { consumeToken = false, ipAddress = null } = options;
    
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // Find the token
        const tokenResult = await client.query(
            `SELECT t.id as token_id, t.shadow_supplier_id, t.expires_at, t.used_at,
                    s.company_name, s.email, s.category, s.claimed_status, s.opt_out_status
             FROM supplier_claim_tokens t
             JOIN scraped_supplier_data s ON t.shadow_supplier_id = s.id
             WHERE t.token = $1
               AND t.token_type = 'claim'
             FOR UPDATE`,
            [token]
        );
        
        if (tokenResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return { valid: false, error: 'Token not found' };
        }
        
        const tokenData = tokenResult.rows[0];
        
        // Check if already used
        if (tokenData.used_at) {
            await client.query('ROLLBACK');
            return { valid: false, error: 'Token already used' };
        }
        
        // Check expiry
        if (new Date(tokenData.expires_at) < new Date()) {
            // Log expired attempt
            await client.query(
                `INSERT INTO supplier_claim_audit_log (
                    shadow_supplier_id, action, success, error_message
                 ) VALUES ($1, 'token_expired', FALSE, 'Token expired')`,
                [tokenData.shadow_supplier_id]
            );
            await client.query('COMMIT');
            return { valid: false, error: 'Token expired' };
        }
        
        // Check supplier status
        if (tokenData.claimed_status === 'claimed') {
            await client.query('ROLLBACK');
            return { valid: false, error: 'Supplier already claimed' };
        }
        
        if (tokenData.opt_out_status === 'opted_out') {
            await client.query('ROLLBACK');
            return { valid: false, error: 'Supplier has opted out' };
        }
        
        // Optionally consume the token
        if (consumeToken) {
            await client.query(
                `UPDATE supplier_claim_tokens
                 SET used_at = NOW(), used_by_ip = $2
                 WHERE id = $1`,
                [tokenData.token_id, ipAddress]
            );
            
            await client.query(
                `INSERT INTO supplier_claim_audit_log (
                    shadow_supplier_id, action, ip_address, success
                 ) VALUES ($1, 'token_used', $2, TRUE)`,
                [tokenData.shadow_supplier_id, ipAddress]
            );
        }
        
        await client.query('COMMIT');
        
        return {
            valid: true,
            supplierId: tokenData.shadow_supplier_id,
            supplierData: {
                company_name: tokenData.company_name,
                email: tokenData.email,
                category: tokenData.category
            }
        };
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error validating claim token:', error);
        return { valid: false, error: error.message };
    } finally {
        client.release();
    }
}

/**
 * Generate and send a verification code
 * @param {string} shadowSupplierId - UUID of shadow supplier
 * @param {object} options - Options
 * @returns {Promise<{success: boolean, code?: string, expiresAt?: Date, error?: string}>}
 */
async function generateVerificationCode(shadowSupplierId, options = {}) {
    if (!shadowSupplierId) {
        return { success: false, error: 'Supplier ID required' };
    }
    
    const { expiryHours = TOKEN_EXPIRY.VERIFICATION } = options;
    
    try {
        const code = generateVerificationCode();
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + expiryHours);
        
        await pool.query(
            `UPDATE scraped_supplier_data
             SET verification_code = $2,
                 verification_code_expires_at = $3,
                 verification_email_sent_at = NOW()
             WHERE id = $1`,
            [shadowSupplierId, code, expiresAt]
        );
        
        // Log action
        await pool.query(
            `INSERT INTO supplier_claim_audit_log (
                shadow_supplier_id, action, success
             ) VALUES ($1, 'verification_sent', TRUE)`,
            [shadowSupplierId]
        );
        
        return { success: true, code, expiresAt };
        
    } catch (error) {
        console.error('Error generating verification code:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Verify a verification code
 * @param {string} shadowSupplierId - UUID of shadow supplier
 * @param {string} code - The verification code
 * @returns {Promise<{valid: boolean, error?: string}>}
 */
async function verifyCode(shadowSupplierId, code) {
    if (!shadowSupplierId || !code) {
        return { valid: false, error: 'Supplier ID and code required' };
    }
    
    try {
        const result = await pool.query(
            `SELECT verification_code, verification_code_expires_at
             FROM scraped_supplier_data
             WHERE id = $1`,
            [shadowSupplierId]
        );
        
        if (result.rows.length === 0) {
            return { valid: false, error: 'Supplier not found' };
        }
        
        const { verification_code, verification_code_expires_at } = result.rows[0];
        
        if (!verification_code) {
            return { valid: false, error: 'No verification code pending' };
        }
        
        if (new Date(verification_code_expires_at) < new Date()) {
            return { valid: false, error: 'Verification code expired' };
        }
        
        if (verification_code !== code) {
            // Increment attempt counter
            await pool.query(
                `UPDATE scraped_supplier_data
                 SET claim_attempts = claim_attempts + 1,
                     last_claim_attempt_at = NOW()
                 WHERE id = $1`,
                [shadowSupplierId]
            );
            
            await pool.query(
                `INSERT INTO supplier_claim_audit_log (
                    shadow_supplier_id, action, success, error_message
                 ) VALUES ($1, 'verification_failed', FALSE, 'Invalid code')`,
                [shadowSupplierId]
            );
            
            return { valid: false, error: 'Invalid verification code' };
        }
        
        // Clear the code after successful verification
        await pool.query(
            `UPDATE scraped_supplier_data
             SET verification_code = NULL,
                 verification_code_expires_at = NULL
             WHERE id = $1`,
            [shadowSupplierId]
        );
        
        await pool.query(
            `INSERT INTO supplier_claim_audit_log (
                shadow_supplier_id, action, success
             ) VALUES ($1, 'verification_completed', TRUE)`,
            [shadowSupplierId]
        );
        
        return { valid: true };
        
    } catch (error) {
        console.error('Error verifying code:', error);
        return { valid: false, error: error.message };
    }
}

/**
 * Complete the claim process - link shadow supplier to real supplier
 * @param {string} shadowSupplierId - UUID of shadow supplier
 * @param {string} newSupplierId - UUID of the new/claimed supplier
 * @param {object} options - Options
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function completeClaim(shadowSupplierId, newSupplierId, options = {}) {
    if (!shadowSupplierId || !newSupplierId) {
        return { success: false, error: 'Both supplier IDs required' };
    }
    
    const { userId = null, ipAddress = null } = options;
    
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // Verify shadow supplier is claimable
        const supplierResult = await client.query(
            `SELECT claimed_status, opt_out_status
             FROM scraped_supplier_data
             WHERE id = $1
             FOR UPDATE`,
            [shadowSupplierId]
        );
        
        if (supplierResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return { success: false, error: 'Shadow supplier not found' };
        }
        
        const supplier = supplierResult.rows[0];
        
        if (supplier.claimed_status === 'claimed') {
            await client.query('ROLLBACK');
            return { success: false, error: 'Already claimed' };
        }
        
        if (supplier.opt_out_status === 'opted_out') {
            await client.query('ROLLBACK');
            return { success: false, error: 'Supplier opted out' };
        }
        
        // Mark as claimed
        await client.query(
            `UPDATE scraped_supplier_data
             SET claimed_status = 'claimed',
                 claimed_by_user_id = $2,
                 claimed_at = NOW(),
                 linked_supplier_id = $3,
                 conversion_status = 'converted',
                 converted_at = NOW(),
                 claim_token = NULL,
                 claim_token_expires_at = NULL
             WHERE id = $1`,
            [shadowSupplierId, userId, newSupplierId]
        );
        
        // Update shadow products visibility
        await client.query(
            `UPDATE shadow_products
             SET visibility = 'claimed'
             WHERE shadow_supplier_id = $1`,
            [shadowSupplierId]
        );
        
        // Invalidate any remaining tokens
        await client.query(
            `UPDATE supplier_claim_tokens
             SET used_at = NOW()
             WHERE shadow_supplier_id = $1 AND used_at IS NULL`,
            [shadowSupplierId]
        );
        
        // Log the action
        await client.query(
            `INSERT INTO supplier_claim_audit_log (
                shadow_supplier_id, claimed_by_user_id, action, ip_address, success
             ) VALUES ($1, $2, 'claim_completed', $3, TRUE)`,
            [shadowSupplierId, userId, ipAddress]
        );
        
        await client.query('COMMIT');
        
        console.log(`Claim completed: Shadow ${shadowSupplierId} -> Supplier ${newSupplierId}`);
        return { success: true };
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error completing claim:', error);
        return { success: false, error: error.message };
    } finally {
        client.release();
    }
}

/**
 * Process opt-out request
 * @param {string} shadowSupplierId - UUID of shadow supplier
 * @param {object} options - Options including reason and IP
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function processOptOut(shadowSupplierId, options = {}) {
    if (!shadowSupplierId) {
        return { success: false, error: 'Supplier ID required' };
    }
    
    const { reason = null, ipAddress = null } = options;
    
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // Update supplier to opted out
        const result = await client.query(
            `UPDATE scraped_supplier_data
             SET opt_out_status = 'opted_out',
                 opted_out_at = NOW(),
                 opt_out_reason = $2,
                 claim_token = NULL,
                 claim_token_expires_at = NULL
             WHERE id = $1
               AND opt_out_status = 'active'`,
            [shadowSupplierId, reason]
        );
        
        if (result.rowCount === 0) {
            await client.query('ROLLBACK');
            return { success: false, error: 'Supplier not found or already opted out' };
        }
        
        // Hide all products
        await client.query(
            `UPDATE shadow_products
             SET visibility = 'hidden'
             WHERE shadow_supplier_id = $1`,
            [shadowSupplierId]
        );
        
        // Invalidate all tokens
        await client.query(
            `UPDATE supplier_claim_tokens
             SET used_at = NOW()
             WHERE shadow_supplier_id = $1 AND used_at IS NULL`,
            [shadowSupplierId]
        );
        
        // Log the action
        await client.query(
            `INSERT INTO supplier_claim_audit_log (
                shadow_supplier_id, action, ip_address, success, metadata
             ) VALUES ($1, 'opt_out_completed', $2, TRUE, $3)`,
            [shadowSupplierId, ipAddress, JSON.stringify({ reason })]
        );
        
        await client.query('COMMIT');
        
        console.log(`Opt-out processed for shadow supplier ${shadowSupplierId}`);
        return { success: true };
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error processing opt-out:', error);
        return { success: false, error: error.message };
    } finally {
        client.release();
    }
}

/**
 * Get claim status for a shadow supplier
 * @param {string} shadowSupplierId - UUID of shadow supplier
 * @returns {Promise<object>}
 */
async function getClaimStatus(shadowSupplierId) {
    if (!shadowSupplierId) {
        return { found: false };
    }
    
    try {
        const result = await pool.query(
            `SELECT 
                claimed_status,
                opt_out_status,
                claim_token IS NOT NULL as has_active_token,
                claim_token_expires_at,
                claimed_at,
                opted_out_at,
                linked_supplier_id
             FROM scraped_supplier_data
             WHERE id = $1`,
            [shadowSupplierId]
        );
        
        if (result.rows.length === 0) {
            return { found: false };
        }
        
        return { found: true, ...result.rows[0] };
        
    } catch (error) {
        console.error('Error getting claim status:', error);
        return { found: false, error: error.message };
    }
}

module.exports = {
    TOKEN_EXPIRY,
    RATE_LIMITS,
    generateSecureToken,
    generateVerificationCode,
    checkRateLimit,
    generateClaimToken,
    validateClaimToken,
    generateVerificationCode,
    verifyCode,
    completeClaim,
    processOptOut,
    getClaimStatus
};
