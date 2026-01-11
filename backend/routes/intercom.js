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

const express = require("express");
const router = express.Router();
const messaging = require("../services/intercom/messaging");
const contacts = require("../services/intercom/contacts");
const { handleWebhook } = require("../services/intercom/webhooks");
const internalApiKeyMiddleware = require("../middleware/internalKey");
const { pool } = require("../db");

// ============================================
// MIDDLEWARE
// ============================================

/**
 * Request logging middleware for audit trail
 */
const logRequest = (req, res, next) => {
  console.log(`[Intercom Routes] ${req.method} ${req.path}`, {
    ip:
      req.headers["x-forwarded-for"]?.split(",")[0] ||
      req.socket?.remoteAddress,
    timestamp: new Date().toISOString(),
  });
  next();
};

// Apply middleware to all internal routes
router.use("/send-rfq-notification", internalApiKeyMiddleware, logRequest);
router.use("/send-claim-prompt", internalApiKeyMiddleware, logRequest);
router.use("/send-quote-received", internalApiKeyMiddleware, logRequest);
router.use("/send-deposit-verified", internalApiKeyMiddleware, logRequest);
router.use("/sync-supplier", internalApiKeyMiddleware, logRequest);
router.use("/batch-sync", internalApiKeyMiddleware, logRequest);

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
router.post("/send-rfq-notification", async (req, res) => {
  try {
    const { supplierId, rfqId, waveNumber } = req.body;

    if (!supplierId || !rfqId) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: supplierId and rfqId",
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
    console.error("[Intercom Routes] Error sending RFQ notification:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
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
router.post("/send-claim-prompt", async (req, res) => {
  try {
    const { shadowSupplierId, rfqId } = req.body;

    if (!shadowSupplierId) {
      return res.status(400).json({
        success: false,
        error: "Missing required field: shadowSupplierId",
      });
    }

    const result = await messaging.sendClaimPrompt(shadowSupplierId, rfqId);

    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(422).json(result);
    }
  } catch (error) {
    console.error("[Intercom Routes] Error sending claim prompt:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
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
router.post("/send-quote-received", async (req, res) => {
  try {
    const { architectId, rfqId, supplierId } = req.body;

    if (!architectId || !rfqId || !supplierId) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: architectId, rfqId, and supplierId",
      });
    }

    const result = await messaging.sendQuoteReceived(
      architectId,
      rfqId,
      supplierId
    );

    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(422).json(result);
    }
  } catch (error) {
    console.error(
      "[Intercom Routes] Error sending quote received notification:",
      error
    );
    return res.status(500).json({
      success: false,
      error: "Internal server error",
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
router.post("/send-deposit-verified", async (req, res) => {
  try {
    const { buyerId, amount, currency } = req.body;

    if (!buyerId || !amount) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: buyerId and amount",
      });
    }

    const result = await messaging.sendDepositVerified(buyerId, {
      amount,
      currency,
    });

    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(422).json(result);
    }
  } catch (error) {
    console.error(
      "[Intercom Routes] Error sending deposit verified notification:",
      error
    );
    return res.status(500).json({
      success: false,
      error: "Internal server error",
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
router.post("/sync-supplier", async (req, res) => {
  try {
    const { supplier } = req.body;

    if (!supplier || !supplier.id) {
      return res.status(400).json({
        success: false,
        error: "Missing required field: supplier with id",
      });
    }

    const result = await contacts.syncSupplierToIntercom(supplier);

    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(422).json(result);
    }
  } catch (error) {
    console.error("[Intercom Routes] Error syncing supplier:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
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
router.post("/batch-sync", async (req, res) => {
  try {
    const { tier = "all", limit = 100 } = req.body;

    const result = await contacts.syncSuppliersByTier(tier, { limit });

    return res.status(200).json({
      success: true,
      synced: result.success,
      failed: result.failed,
      errors: result.errors,
    });
  } catch (error) {
    console.error("[Intercom Routes] Error batch syncing suppliers:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

// ============================================
// IDENTITY VERIFICATION ENDPOINTS
// ============================================

const crypto = require("crypto");
const { authenticateToken } = require("../middleware/auth");

/**
 * GET /api/v1/intercom/identity-hash
 * Generate secure identity hash for Intercom
 * Requires authentication
 */
router.get("/identity-hash", authenticateToken, (req, res) => {
  try {
    const userEmail = req.user.email;
    const userId = req.user.id || req.user.sub;
    const intercomSecretKey = process.env.INTERCOM_SECRET_KEY;

    if (!intercomSecretKey) {
      console.error("INTERCOM_SECRET_KEY not configured");
      return res.status(500).json({ error: "Intercom not configured" });
    }

    // Generate HMAC SHA256 hash
    const hash = crypto
      .createHmac("sha256", intercomSecretKey)
      .update(userId.toString())
      .digest("hex");

    res.json({
      userHash: hash,
      appId: process.env.INTERCOM_APP_ID || "cqtm1euj",
    });
  } catch (error) {
    console.error("Error generating Intercom hash:", error);
    res.status(500).json({ error: "Failed to generate identity hash" });
  }
});

/**
 * GET /api/v1/intercom/config
 * Get public Intercom configuration
 * No authentication required (only returns app ID)
 */
router.get("/config", (req, res) => {
  res.json({
    appId: process.env.INTERCOM_APP_ID || "cqtm1euj",
    enabled: !!(process.env.INTERCOM_APP_ID && process.env.INTERCOM_SECRET_KEY),
  });
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
router.post("/webhook", handleWebhook);

// ============================================
// HEALTH CHECK
// ============================================

/**
 * GET /api/v1/intercom/health
 *
 * Health check endpoint for the Intercom service.
 * Not protected - used for monitoring.
 */
router.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "intercom",
    timestamp: new Date().toISOString(),
  });
});

// ============================================
// PERSONA-BASED CONVERSATION (Matrix of Motivation)
// ============================================

const personaService = require("../services/intercom/personaService");

/**
 * POST /api/v1/intercom/adapt-message
 *
 * Adapt a message based on user's role and motivation matrix.
 * Uses GPT-4o to adjust tone and focus.
 *
 * Request body:
 * - userId: User ID
 * - userMessage: Message from user
 * - jobTitle: User's job title (for role mapping)
 * - conversationHistory: Previous messages (optional)
 *
 * Response:
 * - adaptedResponse: Role-adapted message
 * - role: Detected user role
 * - persona: Motivation matrix for the role
 */
router.post("/adapt-message", internalApiKeyMiddleware, async (req, res) => {
  try {
    const { userId, userMessage, jobTitle, conversationHistory } = req.body;

    if (!userId || !userMessage) {
      return res.status(400).json({
        error: "userId and userMessage are required",
      });
    }

    const result = await personaService.processIntercomMessage(
      userId,
      userMessage,
      { jobTitle, conversationHistory }
    );

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("[Intercom Routes] Error adapting message:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

/**
 * GET /api/v1/intercom/persona/:jobTitle
 *
 * Get persona summary for a job title.
 *
 * Response:
 * - role: Mapped role
 * - primaryDrivers: Key motivations
 * - keyPhrases: Language to use
 * - decisionCriteria: What they care about
 */
router.get("/persona/:jobTitle", internalApiKeyMiddleware, async (req, res) => {
  try {
    const { jobTitle } = req.params;

    if (!jobTitle) {
      return res.status(400).json({
        error: "jobTitle is required",
      });
    }

    const summary = personaService.getPersonaSummary(jobTitle);

    return res.status(200).json({
      success: true,
      ...summary,
    });
  } catch (error) {
    console.error("[Intercom Routes] Error getting persona:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

/**
 * POST /api/v1/intercom/webhook/conversation
 *
 * Webhook handler for Intercom conversation events.
 * Automatically adapts responses based on user role.
 */
router.post("/webhook/conversation", async (req, res) => {
  try {
    const event = req.body;

    // Acknowledge webhook immediately
    res.status(200).json({ received: true });

    // Process asynchronously
    if (event.type === 'conversation.user.replied' || event.type === 'conversation.user.created') {
      const userId = event.data?.item?.user?.id;
      const userMessage = event.data?.item?.conversation_parts?.conversation_parts?.[0]?.body;
      const jobTitle = event.data?.item?.user?.custom_attributes?.job_title || '';

      if (userId && userMessage) {
        console.log(`[Intercom Webhook] Processing message from ${userId} (${jobTitle})`);
        
        // Adapt message based on role
        const adapted = await personaService.processIntercomMessage(
          userId,
          userMessage,
          { jobTitle }
        );

        console.log(`[Intercom Webhook] Adapted for ${adapted.role}: ${adapted.adaptedResponse.substring(0, 100)}...`);

        // Send adapted response back to Intercom
        // (This would integrate with Intercom API to send the message)
      }
    }
  } catch (error) {
    console.error("[Intercom Webhook] Error processing conversation:", error);
    // Already sent 200 response, just log the error
  }
});

// ============================================
// CONVERSATION ROUTING ENDPOINTS
// ============================================

/**
 * POST /api/v1/intercom/route-conversation
 *
 * Route a conversation to supplier team inbox or concierge based on tier.
 * Used by AskSupplierButton component for contextual product inquiries.
 *
 * Request body:
 * - supplierId: Supplier UUID (required)
 * - message: Pre-filled message content (required)
 * - productId: Product UUID (optional, for context)
 * - productName: Product name (optional, for context)
 *
 * Response:
 * - success: boolean
 * - conversationId: Intercom conversation ID (if created)
 * - routedTo: 'supplier' or 'concierge'
 * - supplierTier: Supplier tier
 */
router.post("/route-conversation", authenticateToken, async (req, res) => {
  try {
    const { supplierId, message, productId, productName } = req.body;

    if (!supplierId || !message) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: supplierId and message",
      });
    }

    // Get supplier tier from database
    let supplierTier = null;
    let routedTo = "concierge";

    try {
      const supplierResult = await pool.query(
        `SELECT st.TierCode, st.TierName
         FROM Suppliers s
         LEFT JOIN Supplier_Subscriptions ss ON s.SupplierID = ss.SupplierID
         LEFT JOIN Supplier_Tiers st ON ss.TierID = st.TierID
         WHERE s.SupplierID = $1
         AND (ss.Status IN ('active', 'trialing') OR ss.Status IS NULL)
         LIMIT 1`,
        [supplierId]
      );

      if (supplierResult.rows.length > 0 && supplierResult.rows[0].tiercode) {
        supplierTier = supplierResult.rows[0].tiercode.toLowerCase();
      }
    } catch (dbError) {
      console.error("[Intercom] Error fetching supplier tier:", dbError);
      // Continue with concierge routing if DB lookup fails
    }

    // Determine routing based on tier
    const isPremiumTier = supplierTier && (
      supplierTier === 'premium' || 
      supplierTier === 'enterprise' || 
      supplierTier === 'pro'
    );

    if (isPremiumTier) {
      routedTo = "supplier";
      // In a full implementation, this would use Intercom API to route to supplier's team
      console.log(`[Intercom] Routing conversation to supplier team (tier: ${supplierTier})`);
    } else {
      routedTo = "concierge";
      console.log(`[Intercom] Routing conversation to concierge (tier: ${supplierTier || 'free/unknown'})`);
    }

    // Create metadata for the conversation
    const metadata = {
      supplierId,
      productId: productId || null,
      productName: productName || null,
      supplierTier: supplierTier || "unknown",
      routedTo,
      userId: req.user.userId || req.user.id,
      timestamp: new Date().toISOString(),
    };

    // In a full implementation, this would:
    // 1. Create a conversation in Intercom via their API
    // 2. Tag it with metadata
    // 3. Route to appropriate team inbox
    // For now, we'll return success and log the routing decision

    return res.status(200).json({
      success: true,
      routedTo,
      supplierTier: supplierTier || "unknown",
      metadata,
      message: `Conversation will be routed to ${routedTo === "supplier" ? "supplier team" : "concierge team"}`,
    });
  } catch (error) {
    console.error("[Intercom Routes] Error routing conversation:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

module.exports = router;
