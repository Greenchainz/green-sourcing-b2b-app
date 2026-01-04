/**
 * Buyer Verification Middleware
 * 
 * Gates RFQ distribution behind LinkedIn and deposit verification.
 * Both verifications must be complete before a buyer can distribute RFQs.
 */

const { canDistributeRFQ, getVerificationStatus } = require('../services/linkedinVerification');
const { pool } = require('../db');

/**
 * Middleware to require both LinkedIn and deposit verification.
 * Must be used after auth middleware (requires req.user).
 * 
 * Usage:
 *   router.post('/rfqs/:id/distribute', requireBuyerVerification, async (req, res) => {...});
 */
async function requireBuyerVerification(req, res, next) {
    try {
        if (!req.user) {
            return res.status(401).json({ 
                error: 'Authentication required',
                code: 'AUTH_REQUIRED'
            });
        }

        // Get buyerId from user
        const buyerId = await getBuyerIdFromUser(req.user.userId || req.user.id);
        
        if (!buyerId) {
            return res.status(403).json({
                error: 'Only buyers can perform this action',
                code: 'BUYER_REQUIRED'
            });
        }

        // Check verification status
        const { canDistribute, missing, error } = await canDistributeRFQ(buyerId);

        if (error) {
            console.error('[Buyer Verification] Check failed:', error);
            return res.status(500).json({
                error: 'Verification check failed',
                code: 'VERIFICATION_CHECK_ERROR'
            });
        }

        if (!canDistribute) {
            return res.status(403).json({
                error: 'Buyer verification required before distributing RFQs',
                code: 'VERIFICATION_REQUIRED',
                missing_verifications: missing,
                message: buildMissingMessage(missing)
            });
        }

        // Attach buyerId to request for downstream use
        req.buyerId = buyerId;
        next();
    } catch (err) {
        console.error('[Buyer Verification] Middleware error:', err);
        return res.status(500).json({
            error: 'Verification check failed',
            code: 'VERIFICATION_CHECK_ERROR'
        });
    }
}

/**
 * Middleware to require LinkedIn verification only.
 * Less strict than requireBuyerVerification.
 */
async function requireLinkedInVerification(req, res, next) {
    try {
        if (!req.user) {
            return res.status(401).json({ 
                error: 'Authentication required',
                code: 'AUTH_REQUIRED'
            });
        }

        const buyerId = await getBuyerIdFromUser(req.user.userId || req.user.id);
        
        if (!buyerId) {
            return res.status(403).json({
                error: 'Only buyers can perform this action',
                code: 'BUYER_REQUIRED'
            });
        }

        const { success, status, error } = await getVerificationStatus(buyerId);

        if (error || !success) {
            console.error('[LinkedIn Verification] Check failed:', error);
            return res.status(500).json({
                error: 'Verification check failed',
                code: 'VERIFICATION_CHECK_ERROR'
            });
        }

        if (!status.linkedin_verified) {
            return res.status(403).json({
                error: 'LinkedIn verification required',
                code: 'LINKEDIN_VERIFICATION_REQUIRED',
                message: 'Please verify your LinkedIn account to continue'
            });
        }

        req.buyerId = buyerId;
        req.verificationStatus = status;
        next();
    } catch (err) {
        console.error('[LinkedIn Verification] Middleware error:', err);
        return res.status(500).json({
            error: 'Verification check failed',
            code: 'VERIFICATION_CHECK_ERROR'
        });
    }
}

/**
 * Helper to get buyer ID from user ID.
 * Buyers table links to Users via UserID.
 */
async function getBuyerIdFromUser(userId) {
    if (!userId) return null;

    try {
        const result = await pool.query(
            'SELECT BuyerID FROM Buyers WHERE UserID = $1',
            [userId]
        );
        return result.rows[0]?.buyerid || null;
    } catch (err) {
        console.error('[Buyer Verification] getBuyerIdFromUser error:', err);
        return null;
    }
}

/**
 * Helper to build user-friendly missing verification message.
 */
function buildMissingMessage(missing) {
    if (missing.length === 0) return 'All verifications complete';
    
    const messages = {
        linkedin: 'LinkedIn account verification',
        deposit: 'Deposit payment'
    };

    const items = missing.map(m => messages[m] || m);
    
    if (items.length === 1) {
        return `Please complete ${items[0]} to distribute RFQs`;
    }
    
    return `Please complete the following to distribute RFQs: ${items.join(' and ')}`;
}

module.exports = {
    requireBuyerVerification,
    requireLinkedInVerification,
    getBuyerIdFromUser
};
