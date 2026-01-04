/**
 * Claim Profile Service (Legacy Compatibility Layer)
 * 
 * This module provides backward compatibility with the original claim flow API.
 * New code should use the shadow service directly:
 *   const { claimFlow } = require('../shadow');
 * 
 * @module services/campaigns/claimProfile
 * @deprecated Use services/shadow/claimFlow instead
 */

const { claimFlow } = require('../shadow');

/**
 * Generate a secure claim token for a scraped supplier.
 * @deprecated Use claimFlow.generateClaimToken() instead
 * @param {string} scrapedSupplierId - The UUID of the scraped supplier.
 * @returns {string} A 64-character hex token.
 */
function generateClaimToken(scrapedSupplierId) {
    // For simple token generation without DB, use the helper
    return claimFlow.generateSecureToken();
}

/**
 * Validate a claim token and return the supplier data.
 * @deprecated Use claimFlow.validateClaimToken() instead
 * 
 * @param {string} token - The claim token to validate.
 * @returns {Promise<{valid: boolean, message?: string, supplier?: object}>}
 */
async function validateClaimToken(token) {
    const result = await claimFlow.validateClaimToken(token, { consumeToken: false });
    
    if (!result.valid) {
        return { valid: false, message: result.error || 'Invalid token' };
    }
    
    return { 
        valid: true, 
        supplier: {
            id: result.supplierId,
            ...result.supplierData
        }
    };
}

/**
 * Process a claim request to link scraped data to a new user.
 * @deprecated Use claimFlow.completeClaim() instead
 * 
 * @param {string} token - The claim token.
 * @param {object} userData - User data containing newSupplierId.
 * @returns {Promise<{success: boolean, message?: string, scrapedSupplierId?: string}>}
 */
async function processClaimRequest(token, userData) {
    if (!token) {
        return { success: false, message: 'Missing token' };
    }
    
    if (!userData || !userData.newSupplierId) {
        return { success: false, message: 'Missing new user ID' };
    }
    
    // First validate and consume the token
    const validation = await claimFlow.validateClaimToken(token, { consumeToken: true });
    
    if (!validation.valid) {
        return { success: false, message: validation.error || 'Invalid token or already claimed' };
    }
    
    // Complete the claim
    const result = await claimFlow.completeClaim(
        validation.supplierId,
        userData.newSupplierId,
        { userId: userData.userId }
    );
    
    if (!result.success) {
        return { success: false, message: result.error || 'Processing error' };
    }
    
    return { success: true, scrapedSupplierId: validation.supplierId };
}

/**
 * Mark a scraped supplier as claimed by a user.
 * @deprecated Use claimFlow.completeClaim() instead
 * 
 * @param {string} scrapedSupplierId - The UUID of the scraped supplier.
 * @param {string} newSupplierId - The UUID of the claiming user/supplier.
 * @param {object} client - Optional database client (ignored, kept for compatibility).
 * @returns {Promise<boolean>}
 */
async function markAsClaimed(scrapedSupplierId, newSupplierId, client) {
    const result = await claimFlow.completeClaim(scrapedSupplierId, newSupplierId);
    return result.success;
}

module.exports = {
    generateClaimToken,
    validateClaimToken,
    processClaimRequest,
    markAsClaimed
};
