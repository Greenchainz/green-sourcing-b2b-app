/**
 * Intercom Routes
 * 
 * Internal API endpoints for Intercom messaging:
 * - POST /api/v1/intercom/send-rfq-notification - Notify supplier of new RFQ
 * - POST /api/v1/intercom/send-claim-prompt - Prompt shadow supplier to claim
 * - POST /api/v1/intercom/send-quote-received - Notify architect of new quote
 * - POST /api/v1/intercom/sync-supplier - Sync supplier to Intercom
 * 
 * All endpoints are protected by INTERNAL_API_KEY header.
 * 
 * @module routes/intercom
 */

const express = require('express');
const router = express.Router();
const messaging = require('../services/intercom/messaging');
const contacts = require('../services/intercom/contacts');
const { handleWebhook } = require('../services/intercom/webhooks');
const internalApiKeyMiddleware = require('../middleware/internalKey');

// ============================================
// MIDDLEWARE
// ============================================

/**
 * Request logging middleware for audit trail
 */
const logRequest = (req, res, next) => {
    console.log(`[Intercom Routes] ${req.method} ${req.path}`, {
        ip: req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress,
        timestamp: new Date().toISOString()
    });
    next();
};

// Apply middleware to all internal routes
router.use('/send-rfq-notification', internalApiKeyMiddleware, logRequest);
router.use('/send-claim-prompt', internalApiKeyMiddleware, logRequest);
router.use('/send-quote-received', internalApiKeyMiddleware, logRequest);
router.use('/send-deposit-verified', internalApiKeyMiddleware, logRequest);
router.use('/sync-supplier', internalApiKeyMiddleware, logRequest);
router.use('/batch-sync', internalApiKeyMiddleware, logRequest);

// ============================================
// RFQ NOTIFICATION ENDPOINTS
// ============================================

/**
 * POST /api/v1/intercom/send-rfq-notification
 * 
 * Notify a verified supplier of a new RFQ opportunity.
 * Called internally after RFQ wave distribution.
 * 
 * Request body:
 * - supplierId: Supplier UUID (required)
 * - rfqId: RFQ UUID (required)
 * - waveNumber: Wave number 1-3 (optional, default 3)
 * 
 * Response:
 * - success: boolean
 * - result: Intercom message result (if successful)
 * - error: Error message (if failed)
 */
router.post('/send-rfq-notification', async (req, res) => {
    try {
        const { supplierId, rfqId, waveNumber } = req.body;
        
        if (!supplierId || !rfqId) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: supplierId and rfqId'
            });
        }
        
        const result = await messaging.sendRfqNotification(
            supplierId, 
            rfqId, 
            waveNumber || 3
        );
        
        if (result.success) {
            return res.status(200).json(result);
        } else {
            return res.status(422).json(result);
        }
    } catch (error) {
        console.error('[Intercom Routes] Error sending RFQ notification:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * POST /api/v1/intercom/send-claim-prompt
 * 
 * Prompt a shadow supplier to claim their profile.
 * Called when a shadow supplier matches an RFQ but hasn't claimed yet.
 * Does NOT reveal RFQ details - only prompts to claim.
 * 
 * Request body:
 * - shadowSupplierId: Shadow supplier UUID (required)
 * - rfqId: RFQ UUID for tracking (optional, not revealed to supplier)
 * 
 * Response:
 * - success: boolean
 * - result: Intercom message result (if successful)
 * - error: Error message (if failed)
 */
router.post('/send-claim-prompt', async (req, res) => {
    try {
        const { shadowSupplierId, rfqId } = req.body;
        
        if (!shadowSupplierId) {
            return res.status(400).json({
                success: false,
                error: 'Missing required field: shadowSupplierId'
            });
        }
        
        const result = await messaging.sendClaimPrompt(shadowSupplierId, rfqId);
        
        if (result.success) {
            return res.status(200).json(result);
        } else {
            return res.status(422).json(result);
        }
    } catch (error) {
        console.error('[Intercom Routes] Error sending claim prompt:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * POST /api/v1/intercom/send-quote-received
 * 
 * Notify an architect when a supplier submits a quote.
 * 
 * Request body:
 * - architectId: Architect/buyer UUID (required)
 * - rfqId: RFQ UUID (required)
 * - supplierId: Supplier UUID who submitted quote (required)
 * 
 * Response:
 * - success: boolean
 * - result: Intercom message result (if successful)
 * - error: Error message (if failed)
 */
router.post('/send-quote-received', async (req, res) => {
    try {
        const { architectId, rfqId, supplierId } = req.body;
        
        if (!architectId || !rfqId || !supplierId) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: architectId, rfqId, and supplierId'
            });
        }
        
        const result = await messaging.sendQuoteReceived(architectId, rfqId, supplierId);
        
        if (result.success) {
            return res.status(200).json(result);
        } else {
            return res.status(422).json(result);
        }
    } catch (error) {
        console.error('[Intercom Routes] Error sending quote received notification:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * POST /api/v1/intercom/send-deposit-verified
 * 
 * Notify a buyer when their deposit is verified.
 * 
 * Request body:
 * - buyerId: Buyer UUID (required)
 * - amount: Deposit amount (required)
 * - currency: Currency code (optional, default USD)
 * 
 * Response:
 * - success: boolean
 * - result: Intercom message result (if successful)
 * - error: Error message (if failed)
 */
router.post('/send-deposit-verified', async (req, res) => {
    try {
        const { buyerId, amount, currency } = req.body;
        
        if (!buyerId || !amount) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: buyerId and amount'
            });
        }
        
        const result = await messaging.sendDepositVerified(buyerId, { amount, currency });
        
        if (result.success) {
            return res.status(200).json(result);
        } else {
            return res.status(422).json(result);
        }
    } catch (error) {
        console.error('[Intercom Routes] Error sending deposit verified notification:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// ============================================
// CONTACT SYNC ENDPOINTS
// ============================================

/**
 * POST /api/v1/intercom/sync-supplier
 * 
 * Sync a supplier to Intercom with tier tagging.
 * Creates or updates the contact in Intercom.
 * 
 * Request body:
 * - supplier: Supplier object (required)
 *   - id: Supplier UUID
 *   - name: Company name
 *   - email: Contact email
 *   - tier: Supplier tier
 *   - category: Product category (optional)
 *   - location: Location (optional)
 * 
 * Response:
 * - success: boolean
 * - contact: Intercom contact object (if successful)
 * - created: boolean (true if new contact was created)
 * - error: Error message (if failed)
 */
router.post('/sync-supplier', async (req, res) => {
    try {
        const { supplier } = req.body;
        
        if (!supplier || !supplier.id) {
            return res.status(400).json({
                success: false,
                error: 'Missing required field: supplier with id'
            });
        }
        
        const result = await contacts.syncSupplierToIntercom(supplier);
        
        if (result.success) {
            return res.status(200).json(result);
        } else {
            return res.status(422).json(result);
        }
    } catch (error) {
        console.error('[Intercom Routes] Error syncing supplier:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * POST /api/v1/intercom/batch-sync
 * 
 * Batch sync suppliers to Intercom by tier.
 * 
 * Request body:
 * - tier: Tier to sync (optional, 'all' for all tiers)
 * - limit: Max suppliers to sync (optional, default 100)
 * 
 * Response:
 * - success: number of successful syncs
 * - failed: number of failed syncs
 * - errors: Array of error details
 */
router.post('/batch-sync', async (req, res) => {
    try {
        const { tier = 'all', limit = 100 } = req.body;
        
        const result = await contacts.syncSuppliersByTier(tier, { limit });
        
        return res.status(200).json({
            success: true,
            synced: result.success,
            failed: result.failed,
            errors: result.errors
        });
    } catch (error) {
        console.error('[Intercom Routes] Error batch syncing suppliers:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// ============================================
// WEBHOOK ENDPOINT
// ============================================

/**
 * POST /api/v1/intercom/webhook
 * 
 * Handle Intercom webhooks (conversation.user.replied, user.created, etc.)
 * This endpoint is NOT protected by INTERNAL_API_KEY - Intercom authenticates
 * via webhook signature (handled in webhooks.js).
 */
router.post('/webhook', handleWebhook);

// ============================================
// HEALTH CHECK
// ============================================

/**
 * GET /api/v1/intercom/health
 * 
 * Health check endpoint for the Intercom service.
 * Not protected - used for monitoring.
 */
router.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        service: 'intercom',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;
