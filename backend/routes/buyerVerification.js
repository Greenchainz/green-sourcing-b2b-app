/**
 * Buyer Verification Routes
 * 
 * Endpoints for LinkedIn verification flow and verification status.
 * These are backend-only endpoints - no UI components.
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

const { getJwtSecret } = require('../middleware/auth');
const {
    verifyLinkedIn,
    revokeLinkedInVerification,
    getVerificationStatus,
    canDistributeRFQ,
    verifyDeposit
} = require('../services/linkedinVerification');
const { getBuyerIdFromUser } = require('../middleware/buyerVerification');

// ============================================
// AUTH MIDDLEWARE
// ============================================

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
        return res.status(401).json({ error: 'Authorization header required' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Bearer token required' });
    }

    try {
        const decoded = jwt.verify(token, getJwtSecret());
        req.user = { id: decoded.userId, email: decoded.email, role: decoded.role };
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};

router.use(authMiddleware);

// ============================================
// GET /api/v1/verification/status
// Get current buyer's verification status
// ============================================

router.get('/status', async (req, res) => {
    try {
        const buyerId = await getBuyerIdFromUser(req.user.id);
        
        if (!buyerId) {
            return res.status(404).json({ 
                error: 'Buyer profile not found',
                hint: 'Create a buyer profile first'
            });
        }

        const { success, status, error } = await getVerificationStatus(buyerId);

        if (!success) {
            return res.status(500).json({ error: error || 'Failed to get verification status' });
        }

        res.json({
            linkedin: {
                verified: status.linkedin_verified,
                verified_at: status.linkedin_verified_at,
                profile_id: status.linkedin_profile_id,
                profile_url: status.linkedin_profile_url
            },
            deposit: {
                verified: status.deposit_verified,
                verified_at: status.deposit_verified_at
            },
            fully_verified: status.fully_verified,
            can_distribute_rfqs: status.fully_verified
        });
    } catch (error) {
        console.error('Verification status error:', error);
        res.status(500).json({ error: 'Failed to get verification status' });
    }
});

// ============================================
// GET /api/v1/verification/can-distribute
// Quick check if buyer can distribute RFQs
// ============================================

router.get('/can-distribute', async (req, res) => {
    try {
        const buyerId = await getBuyerIdFromUser(req.user.id);
        
        if (!buyerId) {
            return res.json({ 
                can_distribute: false,
                missing: ['buyer_profile'],
                message: 'Create a buyer profile first'
            });
        }

        const { canDistribute, missing, error } = await canDistributeRFQ(buyerId);

        if (error) {
            return res.status(500).json({ error });
        }

        res.json({
            can_distribute: canDistribute,
            missing: missing,
            message: canDistribute 
                ? 'All verifications complete. You can distribute RFQs.'
                : `Missing verifications: ${missing.join(', ')}`
        });
    } catch (error) {
        console.error('Can distribute check error:', error);
        res.status(500).json({ error: 'Failed to check distribution eligibility' });
    }
});

// ============================================
// POST /api/v1/verification/linkedin
// Complete LinkedIn verification (called after OAuth callback)
// ============================================

router.post('/linkedin', async (req, res) => {
    try {
        const { profile_id, profile_url } = req.body;

        if (!profile_id) {
            return res.status(400).json({ error: 'LinkedIn profile_id is required' });
        }

        const buyerId = await getBuyerIdFromUser(req.user.id);
        
        if (!buyerId) {
            return res.status(404).json({ 
                error: 'Buyer profile not found',
                hint: 'Create a buyer profile first'
            });
        }

        const result = await verifyLinkedIn(
            buyerId,
            { profileId: profile_id, profileUrl: profile_url },
            {
                ipAddress: req.ip || req.connection?.remoteAddress,
                userAgent: req.headers['user-agent']
            }
        );

        if (!result.success) {
            return res.status(400).json({ error: result.error });
        }

        res.status(200).json({
            message: 'LinkedIn verification successful',
            verified: true,
            verified_at: result.buyer.linkedin_verified_at
        });
    } catch (error) {
        console.error('LinkedIn verification error:', error);
        res.status(500).json({ error: 'LinkedIn verification failed' });
    }
});

// ============================================
// DELETE /api/v1/verification/linkedin
// Revoke LinkedIn verification (admin or self-service)
// ============================================

router.delete('/linkedin', async (req, res) => {
    try {
        const buyerId = await getBuyerIdFromUser(req.user.id);
        
        if (!buyerId) {
            return res.status(404).json({ error: 'Buyer profile not found' });
        }

        const { reason } = req.body || {};
        const result = await revokeLinkedInVerification(buyerId, reason || 'user_requested');

        if (!result.success) {
            return res.status(400).json({ error: result.error });
        }

        res.status(200).json({
            message: 'LinkedIn verification revoked',
            verified: false
        });
    } catch (error) {
        console.error('LinkedIn revocation error:', error);
        res.status(500).json({ error: 'Failed to revoke LinkedIn verification' });
    }
});

// ============================================
// POST /api/v1/verification/deposit
// Mark deposit as verified (typically from payment webhook)
// This endpoint requires additional security in production
// ============================================

router.post('/deposit', async (req, res) => {
    try {
        const { buyer_id, amount_cents, source } = req.body;

        // In production, this should be protected by webhook signature verification
        // or require admin role. For now, allow self-verification for development.
        let targetBuyerId = buyer_id;
        
        if (!targetBuyerId) {
            // Allow self-verification if no buyer_id specified
            targetBuyerId = await getBuyerIdFromUser(req.user.id);
        }

        if (!targetBuyerId) {
            return res.status(404).json({ error: 'Buyer profile not found' });
        }

        if (!amount_cents || amount_cents <= 0) {
            return res.status(400).json({ error: 'Valid amount_cents is required' });
        }

        const result = await verifyDeposit(
            targetBuyerId,
            amount_cents,
            {
                source: source || 'api',
                ipAddress: req.ip || req.connection?.remoteAddress
            }
        );

        if (!result.success) {
            return res.status(400).json({ error: result.error });
        }

        res.status(200).json({
            message: 'Deposit verification successful',
            verified: true,
            verified_at: result.buyer.deposit_verified_at,
            amount_cents: result.buyer.deposit_amount_cents
        });
    } catch (error) {
        console.error('Deposit verification error:', error);
        res.status(500).json({ error: 'Deposit verification failed' });
    }
});

module.exports = router;
