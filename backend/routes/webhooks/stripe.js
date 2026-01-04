/**
 * Stripe Webhook Handler
 *
 * Handles incoming webhooks from Stripe for payment events.
 *
 * IMPORTANT: This route must use raw body parsing (express.raw) for signature verification.
 * It should be mounted BEFORE the global express.json() middleware, or with a specific path exclusion.
 *
 * Events handled:
 * - payment_intent.succeeded - Payment completed successfully
 * - payment_intent.payment_failed - Payment failed
 * - charge.refunded - Refund processed
 * - charge.dispute.created - Dispute opened (for monitoring)
 *
 * Environment Variables Required:
 * - STRIPE_WEBHOOK_SECRET: Stripe webhook signing secret (whsec_...)
 */

const express = require("express");
const router = express.Router();

const stripeService = require("../../services/payments/stripe");
const subscriptionService = require("../../services/payments/subscriptions");

// ============================================
// WEBHOOK ENDPOINT
// ============================================

/**
 * POST /api/webhooks/stripe
 *
 * Receives and processes Stripe webhook events.
 *
 * Headers:
 * - Stripe-Signature: Stripe webhook signature for verification
 *
 * Body:
 * - Raw request body (NOT parsed JSON)
 *
 * Returns:
 * - 200: Event processed successfully
 * - 400: Invalid signature or malformed request
 * - 500: Processing error
 */
router.post("/", async (req, res) => {
  const signature = req.headers["stripe-signature"];

  if (!signature) {
    console.error("[Stripe Webhook] Missing stripe-signature header");
    return res.status(400).json({ error: "Missing stripe-signature header" });
  }

  // Ensure we have raw body
  if (!req.body || !(req.body instanceof Buffer)) {
    console.error("[Stripe Webhook] Request body must be raw Buffer");
    return res.status(400).json({
      error: "Invalid request body format",
      hint: "Webhook endpoint requires raw body parsing",
    });
  }

  let event;

  try {
    // Verify webhook signature and construct event
    event = stripeService.constructWebhookEvent(req.body, signature);
  } catch (err) {
    console.error(
      "[Stripe Webhook] Signature verification failed:",
      err.message
    );
    return res
      .status(400)
      .json({ error: `Webhook signature verification failed: ${err.message}` });
  }

  // Log event for debugging (in production, use structured logging)
  console.log(`[Stripe Webhook] Received event: ${event.type} (${event.id})`);

  try {
    // Handle the event
    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object;
        console.log(`[Stripe Webhook] Payment succeeded: ${paymentIntent.id}`);

        // Only process RFQ deposits
        if (paymentIntent.metadata?.type === "rfq_deposit") {
          const result =
            await stripeService.handlePaymentSuccess(paymentIntent);
          if (!result.success) {
            console.error(
              `[Stripe Webhook] Failed to handle payment success: ${result.error}`
            );
            // Still return 200 to prevent Stripe retries - we logged the error
          }
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object;
        console.log(`[Stripe Webhook] Payment failed: ${paymentIntent.id}`);

        if (paymentIntent.metadata?.type === "rfq_deposit") {
          await stripeService.handlePaymentFailure(paymentIntent);
        }
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object;
        console.log(
          `[Stripe Webhook] Charge refunded: ${charge.id} (PI: ${charge.payment_intent})`
        );

        // Log the refund - the refundDeposit function already updates the database
        // This is for when refunds are initiated from Stripe Dashboard
        if (charge.payment_intent) {
          const { pool } = require("../../db");
          await pool.query(
            `UPDATE rfq_deposits 
                         SET status = 'refunded',
                             refund_reason = 'stripe_dashboard',
                             refunded_at = NOW(),
                             updated_at = NOW()
                         WHERE payment_intent_id = $1 AND status != 'refunded'`,
            [charge.payment_intent]
          );
        }
        break;
      }

      case "charge.dispute.created": {
        const dispute = event.data.object;
        console.warn(
          `[Stripe Webhook] ⚠️ DISPUTE CREATED: ${dispute.id} for charge ${dispute.charge}`
        );

        // Alert for disputes - these need immediate attention
        // In production, send notification to admin/support
        const { pool } = require("../../db");
        await pool.query(
          `INSERT INTO payment_disputes 
                     (dispute_id, charge_id, payment_intent_id, amount, reason, status, created_at)
                     VALUES ($1, $2, $3, $4, $5, $6, NOW())
                     ON CONFLICT (dispute_id) DO NOTHING`,
          [
            dispute.id,
            dispute.charge,
            dispute.payment_intent,
            dispute.amount,
            dispute.reason,
            dispute.status,
          ]
        );
        break;
      }

      case "charge.dispute.closed": {
        const dispute = event.data.object;
        console.log(
          `[Stripe Webhook] Dispute closed: ${dispute.id} - Status: ${dispute.status}`
        );

        const { pool } = require("../../db");
        await pool.query(
          `UPDATE payment_disputes 
                     SET status = $2, closed_at = NOW()
                     WHERE dispute_id = $1`,
          [dispute.id, dispute.status]
        );
        break;
      }

      case "customer.created": {
        const customer = event.data.object;
        // Optional: Store Stripe customer ID in our database for future reference
        break;
      }

      // ============================================
      // SUBSCRIPTION EVENTS
      // ============================================

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object;
        console.log(
          `[Stripe Webhook] Subscription update: ${subscription.id} (${subscription.status})`
        );
        await subscriptionService.handleSubscriptionChange(subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        console.log(
          `[Stripe Webhook] Subscription deleted: ${subscription.id}`
        );
        await subscriptionService.handleSubscriptionDeleted(subscription);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        // Check if this is for a subscription
        if (invoice.subscription) {
          console.warn(
            `[Stripe Webhook] Subscription payment failed: ${invoice.subscription}`
          );
          // Optionally trigger email notification logic here
        }
        break;
      }

      case "invoice.paid": {
        // Good for analytics or keeping 'last_paid' dates
        break;
      }

      default:
        // Unhandled event types - log for monitoring
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    // Always return 200 to acknowledge receipt
    // Stripe will retry on non-2xx responses
    res.status(200).json({ received: true, type: event.type });
  } catch (error) {
    console.error(`[Stripe Webhook] Error processing ${event.type}:`, error);

    // Return 200 anyway to prevent infinite retries
    // Errors are logged and should trigger alerts
    res.status(200).json({
      received: true,
      type: event.type,
      processed: false,
      error: "Processing error - event logged",
    });
  }
});

// ============================================
// WEBHOOK HEALTH CHECK
// ============================================

/**
 * GET /api/webhooks/stripe/health
 *
 * Health check for webhook endpoint.
 * Used by monitoring systems.
 */
router.get("/health", (req, res) => {
  const isConfigured = !!process.env.STRIPE_WEBHOOK_SECRET;

  res.json({
    status: isConfigured ? "ready" : "not_configured",
    message: isConfigured
      ? "Stripe webhook endpoint ready"
      : "STRIPE_WEBHOOK_SECRET not configured",
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
