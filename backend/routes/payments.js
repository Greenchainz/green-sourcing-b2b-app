/**
 * Payment Routes
 * 
 * Handles RFQ deposits via Stripe and LinkedIn OAuth verification.
 * 
 * Routes:
 * - POST /api/v1/payments/rfq-deposit - Create PaymentIntent for RFQ deposit
 * - GET  /api/v1/payments/deposit-status/:paymentIntentId - Check deposit status
 * - GET  /api/v1/payments/linkedin/auth - Start LinkedIn OAuth flow
 * - GET  /api/v1/payments/linkedin/callback - Handle LinkedIn OAuth callback
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

const { general: generalRateLimit } = require('../middleware/rateLimit');
const stripeService = require('../services/payments/stripe');
const linkedinService = require('../services/payments/linkedin');
const { getEnvOrFallback } = require('../config/validateEnv');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const JWT_SECRET = process.env.NODE_ENV === 'production'
    ? requireEnv('JWT_SECRET', { minLength: 32 })
    : getEnvOrFallback('JWT_SECRET', 'dev-secret-key', { minLength: 32 });

// ============================================
// RATE LIMITERS
// ============================================

// Stricter rate limit for payment creation
const paymentLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 payment attempts per minute
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many payment requests, please try again later' }
});

// Rate limit for OAuth endpoints
const oauthLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 20, // 20 OAuth requests per minute
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many OAuth requests, please try again later' }
});

// ============================================
// HELPER: Extract and verify JWT from request
// ============================================

function extractUser(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return decoded;
    } catch {
        return null;
    }
}

function requireAuth(req, res, next) {
    const user = extractUser(req);
    if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    req.user = user;
    next();
}

// ============================================
// STRIPE PAYMENT ROUTES
// ============================================

/**
 * POST /api/v1/payments/rfq-deposit
 * 
 * Creates a Stripe PaymentIntent for an RFQ deposit.
 * Requires authentication.
 * 
 * Body:
 * - projectName: string (required) - Name of the RFQ project
 * - rfqId: string (optional) - Associated RFQ ID
 * 
 * Returns:
 * - clientSecret: string - Stripe client secret for frontend
 * - paymentIntentId: string - PaymentIntent ID for tracking
 * - amount: number - Amount in cents
 */
router.post('/rfq-deposit', paymentLimiter, requireAuth, async (req, res) => {
    try {
        const { projectName, rfqId } = req.body;

        if (!projectName) {
            return res.status(400).json({ error: 'projectName is required' });
        }

        const result = await stripeService.createRfqDeposit(req.user.userId, {
            projectName,
            rfqId
        });

        res.status(201).json({
            clientSecret: result.clientSecret,
            paymentIntentId: result.paymentIntentId,
            amount: result.amount,
            amountDisplay: `$${(result.amount / 100).toFixed(2)}`
        });
    } catch (error) {
        console.error('[Payments Route] Create deposit error:', error);
        
        // Handle Stripe-specific errors
        if (error.type === 'StripeCardError') {
            return res.status(400).json({ error: error.message });
        }
        if (error.type === 'StripeInvalidRequestError') {
            return res.status(400).json({ error: 'Invalid payment request' });
        }

        res.status(500).json({ 
            error: 'Failed to create payment',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * GET /api/v1/payments/deposit-status/:paymentIntentId
 * 
 * Checks the status of an RFQ deposit payment.
 * Requires authentication.
 * 
 * Returns:
 * - status: string - 'pending', 'completed', 'failed', 'refunded', or 'not_found'
 * - deposit: object - Deposit details if found
 */
router.get('/deposit-status/:paymentIntentId', requireAuth, generalRateLimit, async (req, res) => {
    try {
        const { paymentIntentId } = req.params;

        if (!paymentIntentId) {
            return res.status(400).json({ error: 'paymentIntentId is required' });
        }

        // Validate paymentIntentId format (starts with 'pi_')
        if (!paymentIntentId.startsWith('pi_')) {
            return res.status(400).json({ error: 'Invalid paymentIntentId format' });
        }

        const result = await stripeService.getDepositStatus(paymentIntentId);

        res.json(result);
    } catch (error) {
        console.error('[Payments Route] Get deposit status error:', error);
        res.status(500).json({ error: 'Failed to get deposit status' });
    }
});

/**
 * POST /api/v1/payments/verify-deposit
 * 
 * Verifies a payment was completed (for frontend confirmation).
 * Requires authentication.
 * 
 * Body:
 * - paymentIntentId: string - The PaymentIntent ID to verify
 * 
 * Returns:
 * - verified: boolean
 */
router.post('/verify-deposit', requireAuth, generalRateLimit, async (req, res) => {
    try {
        const { paymentIntentId } = req.body;

        if (!paymentIntentId) {
            return res.status(400).json({ error: 'paymentIntentId is required' });
        }

        const isVerified = await stripeService.verifyPayment(paymentIntentId);

        res.json({ verified: isVerified });
    } catch (error) {
        console.error('[Payments Route] Verify deposit error:', error);
        res.status(500).json({ error: 'Failed to verify deposit' });
    }
});

// ============================================
// LINKEDIN OAUTH ROUTES
// ============================================

/**
 * GET /api/v1/payments/linkedin/auth
 * 
 * Starts the LinkedIn OAuth flow.
 * Requires authentication.
 * Stores state in session for CSRF protection.
 * 
 * Query params:
 * - returnUrl: string (optional) - URL to redirect after OAuth
 * 
 * Returns:
 * - Redirects to LinkedIn authorization page
 */
router.get('/linkedin/auth', oauthLimiter, requireAuth, async (req, res) => {
    try {
        const { returnUrl } = req.query;

        // Generate and store state for CSRF protection
        const state = linkedinService.generateState();
        
        // Store state and user info in session
        req.session.linkedinOAuth = {
            state,
            userId: req.user.userId,
            returnUrl: returnUrl || `${FRONTEND_URL}/settings`,
            createdAt: Date.now()
        };

        // Save session before redirect
        await new Promise((resolve, reject) => {
            req.session.save((err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        const authUrl = linkedinService.getAuthorizationUrl(state);
        res.redirect(authUrl);
    } catch (error) {
        console.error('[Payments Route] LinkedIn auth start error:', error);
        res.redirect(`${FRONTEND_URL}/settings?error=linkedin_auth_failed`);
    }
});

/**
 * GET /api/v1/payments/linkedin/callback
 * 
 * Handles the LinkedIn OAuth callback.
 * Validates state, exchanges code for token, fetches profile, stores verification.
 * 
 * Query params (from LinkedIn):
 * - code: string - Authorization code
 * - state: string - CSRF state parameter
 * - error: string - Error code if OAuth failed
 * 
 * Returns:
 * - Redirects to frontend with success or error
 */
router.get('/linkedin/callback', oauthLimiter, async (req, res) => {
    try {
        const { code, state, error, error_description } = req.query;

        // Handle OAuth errors from LinkedIn
        if (error) {
            console.error('[LinkedIn OAuth] Error from LinkedIn:', error, error_description);
            return res.redirect(`${FRONTEND_URL}/settings?error=linkedin_denied&message=${encodeURIComponent(error_description || error)}`);
        }

        if (!code || !state) {
            return res.redirect(`${FRONTEND_URL}/settings?error=linkedin_invalid_callback`);
        }

        // Validate state from session
        const oauthData = req.session?.linkedinOAuth;
        
        if (!oauthData) {
            return res.redirect(`${FRONTEND_URL}/settings?error=linkedin_session_expired`);
        }

        if (oauthData.state !== state) {
            return res.redirect(`${FRONTEND_URL}/settings?error=linkedin_invalid_state`);
        }

        // Check if state is expired (10 minutes max)
        const stateAge = Date.now() - oauthData.createdAt;
        if (stateAge > 10 * 60 * 1000) {
            return res.redirect(`${FRONTEND_URL}/settings?error=linkedin_state_expired`);
        }

        const userId = oauthData.userId;
        const returnUrl = oauthData.returnUrl || `${FRONTEND_URL}/settings`;

        // Get client info for verification log
        const ipAddress = req.ip || req.connection?.remoteAddress;
        const userAgent = req.headers['user-agent'];

        // Exchange code and store verification
        const result = await linkedinService.verifyAndStore(userId, code, {
            ipAddress,
            userAgent
        });

        // Clear OAuth session data
        delete req.session.linkedinOAuth;

        if (result.success) {
            console.log(`[LinkedIn OAuth] User ${userId} successfully verified`);
            res.redirect(`${returnUrl}?linkedin_verified=true&name=${encodeURIComponent(result.profile.name || '')}`);
        } else {
            console.error('[LinkedIn OAuth] Verification failed:', result.error);
            res.redirect(`${returnUrl}?error=linkedin_verification_failed&message=${encodeURIComponent(result.error || 'Unknown error')}`);
        }
    } catch (error) {
        console.error('[Payments Route] LinkedIn callback error:', error);
        res.redirect(`${FRONTEND_URL}/settings?error=linkedin_callback_error`);
    }
});

/**
 * GET /api/v1/payments/linkedin/status
 * 
 * Checks the user's LinkedIn verification status.
 * Requires authentication.
 * 
 * Returns:
 * - verified: boolean
 * - profile: object (if verified)
 */
router.get('/linkedin/status', requireAuth, generalRateLimit, async (req, res) => {
    try {
        const result = await linkedinService.getVerificationStatus(req.user.userId);
        res.json(result);
    } catch (error) {
        console.error('[Payments Route] LinkedIn status error:', error);
        res.status(500).json({ error: 'Failed to get LinkedIn status' });
    }
});

/**
 * DELETE /api/v1/payments/linkedin/verification
 * 
 * Revokes the user's LinkedIn verification.
 * Requires authentication.
 * 
 * Returns:
 * - success: boolean
 */
router.delete('/linkedin/verification', requireAuth, generalRateLimit, async (req, res) => {
    try {
        const { reason } = req.body;
        const result = await linkedinService.revokeVerification(
            req.user.userId, 
            reason || 'user_requested'
        );

        if (result.success) {
            res.json({ success: true, message: 'LinkedIn verification revoked' });
        } else {
            res.status(400).json({ success: false, error: result.error });
        }
    } catch (error) {
        console.error('[Payments Route] LinkedIn revoke error:', error);
        res.status(500).json({ error: 'Failed to revoke LinkedIn verification' });
    }
});

// ============================================
// VERIFICATION STATUS (COMBINED)
// ============================================

/**
 * GET /api/v1/payments/verification-status
 * 
 * Gets combined verification status (deposit + LinkedIn).
 * Requires authentication.
 * 
 * Returns:
 * - depositVerified: boolean
 * - linkedinVerified: boolean
 * - fullyVerified: boolean (both verified)
 * - canSubmitRfq: boolean
 */
router.get('/verification-status', requireAuth, generalRateLimit, async (req, res) => {
    try {
        const userId = req.user.userId;

        // Get LinkedIn status
        const linkedinStatus = await linkedinService.getVerificationStatus(userId);

        // Get deposit status from database
        const { pool } = require('../db');
        const depositResult = await pool.query(
            `SELECT deposit_verified, deposit_verified_at, deposit_amount_cents
             FROM Buyers 
             WHERE UserID = $1 OR BuyerID = $1
             LIMIT 1`,
            [userId]
        );

        const depositVerified = depositResult.rows[0]?.deposit_verified || false;

        res.json({
            depositVerified,
            depositAmount: depositResult.rows[0]?.deposit_amount_cents || null,
            depositVerifiedAt: depositResult.rows[0]?.deposit_verified_at || null,
            linkedinVerified: linkedinStatus.verified,
            linkedinProfile: linkedinStatus.profile || null,
            fullyVerified: depositVerified && linkedinStatus.verified,
            canSubmitRfq: depositVerified && linkedinStatus.verified
        });
    } catch (error) {
        console.error('[Payments Route] Verification status error:', error);
        res.status(500).json({ error: 'Failed to get verification status' });
    }
});

module.exports = router;
