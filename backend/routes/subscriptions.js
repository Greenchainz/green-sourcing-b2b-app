/**
 * Subscription Routes
 *
 * Endpoints for managing supplier subscriptions.
 * Mounted at /api/v1/subscriptions
 */

const express = require("express");
const router = express.Router();
const checkAuth = require("../../middleware/check-auth"); // Assuming auth middleware exists
const subscriptionService = require("../../services/payments/subscriptions");

// Middleware to ensure user is a supplier
const requireSupplier = (req, res, next) => {
  // Assuming req.userData is populated by checkAuth and contains role/id
  if (!req.userData || req.userData.role !== "supplier") {
    return res.status(403).json({ error: "Access denied. Suppliers only." });
  }
  next();
};

/**
 * POST /checkout
 * Create a checkout session for upgrading tier
 * Body: { tier: 'standard'|'premium', interval: 'month'|'year' }
 */
router.post("/checkout", checkAuth, requireSupplier, async (req, res) => {
  try {
    const { tier, interval } = req.body;
    const supplierId = req.userData.userId; // Assuming userId maps to supplier 'user' or we need to look up supplier ID

    // Look up supplier ID if req.userData.userId is a User ID (not Supplier ID)
    // For simplicity, assuming req.userData.userId IS the supplier/user ID or 1:1 mapping logic exists
    // If strict separation exists, we might need: const supplierId = await getSupplierIdFromUserId(req.userData.userId);
    // Using req.userData.supplierId if available would be better.
    const idToUse = req.userData.supplierId || req.userData.userId;

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
router.post("/portal", checkAuth, requireSupplier, async (req, res) => {
  try {
    const idToUse = req.userData.supplierId || req.userData.userId;
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
router.get("/status", checkAuth, requireSupplier, async (req, res) => {
  try {
    const idToUse = req.userData.supplierId || req.userData.userId;
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
router.post("/sync", checkAuth, requireSupplier, async (req, res) => {
  try {
    const idToUse = req.userData.supplierId || req.userData.userId;
    const result = await subscriptionService.syncSubscriptionStatus(idToUse);
    res.json(result);
  } catch (error) {
    console.error("Sync error:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
