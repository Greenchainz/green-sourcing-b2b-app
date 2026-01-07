/**
 * Subscription Routes
 *
 * Endpoints for managing supplier subscriptions.
 * Mounted at /api/v1/subscriptions
 */

const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const subscriptionService = require("../services/payments/subscriptions");
const rateLimit = require("express-rate-limit");

const subscriptionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs for subscription routes
});

// Middleware to ensure user is a supplier
const requireSupplier = (req, res, next) => {
  if (!req.user || req.user.role !== "supplier") {
    return res.status(403).json({ error: "Access denied. Suppliers only." });
  }
  next();
};

/**
 * POST /checkout
 * Create a checkout session for upgrading tier
 * Body: { tier: 'standard'|'premium', interval: 'month'|'year' }
 */
router.post("/checkout", subscriptionLimiter, authenticateToken, requireSupplier, async (req, res) => {
  try {
    const { tier, interval } = req.body;
    // Look up supplier ID if req.user.userId is a User ID (not Supplier ID)
    // For simplicity, assuming req.userData.userId IS the supplier/user ID or 1:1 mapping logic exists
    // If strict separation exists, we might need: const supplierId = await getSupplierIdFromUserId(req.user.userId);
    // Using req.user.supplierId if available would be better.
    const idToUse = req.user.supplierId || req.user.userId;

    const session = await subscriptionService.createCheckoutSession(
      idToUse,
      tier,
      interval
    );
    res.json(session);
  } catch (error) {
    console.error("Checkout error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /portal
 * Get Stripe Billing Portal URL
 */
router.post("/portal", subscriptionLimiter, authenticateToken, requireSupplier, async (req, res) => {
  try {
    const idToUse = req.user.supplierId || req.user.userId;
    const session =
      await subscriptionService.createBillingPortalSession(idToUse);
    res.json(session);
  } catch (error) {
    console.error("Portal error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /status
 * Get current subscription status
 */
router.get("/status", subscriptionLimiter, authenticateToken, requireSupplier, async (req, res) => {
  try {
    const idToUse = req.user.supplierId || req.user.userId;
    const status = await subscriptionService.getSubscriptionStatus(idToUse);
    res.json(status);
  } catch (error) {
    console.error("Status error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /sync
 * Manually sync subscription status (e.g. after return from checkout)
 */
router.post("/sync", subscriptionLimiter, authenticateToken, requireSupplier, async (req, res) => {
  try {
    const idToUse = req.user.supplierId || req.user.userId;
    const result = await subscriptionService.syncSubscriptionStatus(idToUse);
    res.json(result);
  } catch (error) {
    console.error("Sync error:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
