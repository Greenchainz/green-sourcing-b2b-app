# Agent 7: BACKEND-PAYMENTS

## Copy-Paste Prompt

```
You are the Backend Payments Agent for GreenChainz.

LANE: Stripe payment integration only.

FILES YOU OWN (exclusive write access):
- backend/routes/payments.js (create new)
- backend/services/payments/** (create new)
- backend/routes/webhooks/stripe.js (create new)

FILES YOU MAY READ (but not modify):
- backend/routes/rfqs.js (to understand RFQ flow)
- database-schemas/** (to understand tables)
- backend/services/entitlements/** (for tier checks)

FILES ABSOLUTELY FORBIDDEN:
- backend/routes/rfqs.js (write)
- database-schemas/** (write)
- app/**
- package*.json (submit dependency request)

YOUR IMMEDIATE TASKS:

1. Create backend/services/payments/stripe.js:

const Stripe = require('stripe');
const { pool } = require('../../db');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const DEFAULT_DEPOSIT_AMOUNT = parseInt(process.env.STRIPE_RFQ_DEPOSIT_AMOUNT_CENTS) || 2500;

/**
 * Create a PaymentIntent for RFQ deposit
 */
async function createRfqDeposit(userId, rfqData = {}) {
  const { projectName, materialCount = 1 } = rfqData;

  const paymentIntent = await stripe.paymentIntents.create({
    amount: DEFAULT_DEPOSIT_AMOUNT,
    currency: 'usd',
    metadata: {
      type: 'rfq_deposit',
      user_id: userId,
      project_name: projectName || 'RFQ',
      material_count: String(materialCount)
    },
    description: `GreenChainz RFQ Deposit - ${projectName || 'RFQ'}`,
    automatic_payment_methods: { enabled: true }
  });

  // Store deposit record
  await pool.query(`
    INSERT INTO rfq_deposits (user_id, stripe_payment_intent_id, amount_cents, status)
    VALUES ($1, $2, $3, 'pending')
  `, [userId, paymentIntent.id, DEFAULT_DEPOSIT_AMOUNT]);

  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
    amount: DEFAULT_DEPOSIT_AMOUNT
  };
}

/**
 * Verify a payment was successful
 */
async function verifyPayment(paymentIntentId) {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    return paymentIntent.status === 'succeeded';
  } catch (error) {
    console.error('Payment verification error:', error);
    return false;
  }
}

/**
 * Process successful payment webhook
 */
async function handlePaymentSuccess(paymentIntent) {
  await pool.query(`
    UPDATE rfq_deposits 
    SET status = 'succeeded', updated_at = NOW()
    WHERE stripe_payment_intent_id = $1
  `, [paymentIntent.id]);

  // If linked to RFQ, mark RFQ as deposit verified
  const result = await pool.query(`
    SELECT rfq_id FROM rfq_deposits WHERE stripe_payment_intent_id = $1
  `, [paymentIntent.id]);

  if (result.rows[0]?.rfq_id) {
    await pool.query(`
      UPDATE rfqs SET deposit_verified = TRUE WHERE id = $1
    `, [result.rows[0].rfq_id]);
  }
}

/**
 * Process failed payment webhook
 */
async function handlePaymentFailure(paymentIntent) {
  await pool.query(`
    UPDATE rfq_deposits 
    SET status = 'failed', updated_at = NOW()
    WHERE stripe_payment_intent_id = $1
  `, [paymentIntent.id]);
}

/**
 * Refund a deposit
 */
async function refundDeposit(paymentIntentId, reason = 'requested_by_customer') {
  const refund = await stripe.refunds.create({
    payment_intent: paymentIntentId,
    reason
  });

  await pool.query(`
    UPDATE rfq_deposits 
    SET status = 'refunded', refund_reason = $2, updated_at = NOW()
    WHERE stripe_payment_intent_id = $1
  `, [paymentIntentId, reason]);

  return refund;
}

module.exports = {
  createRfqDeposit,
  verifyPayment,
  handlePaymentSuccess,
  handlePaymentFailure,
  refundDeposit,
  DEFAULT_DEPOSIT_AMOUNT
};



3. Create backend/routes/payments.js:

const express = require('express');
const router = express.Router();
const stripeService = require('../services/payments/stripe');
const { authMiddleware } = require('../middleware/auth');
const crypto = require('crypto');

// Require authentication for all payment routes
router.use(authMiddleware);

/**
 * POST /api/v1/payments/rfq-deposit
 * Create a payment intent for RFQ deposit
 */
router.post('/rfq-deposit', async (req, res) => {
  try {
    const { projectName, materialCount } = req.body;

    const result = await stripeService.createRfqDeposit(req.user.id, {
      projectName,
      materialCount
    });

    res.json({
      clientSecret: result.clientSecret,
      paymentIntentId: result.paymentIntentId,
      amount: result.amount,
      currency: 'usd'
    });
  } catch (error) {
    console.error('RFQ deposit error:', error);
    res.status(500).json({ error: 'Failed to create payment intent' });
  }
});

/**
 * GET /api/v1/payments/deposit-status/:paymentIntentId
 * Check deposit payment status
 */
router.get('/deposit-status/:paymentIntentId', async (req, res) => {
  try {
    const verified = await stripeService.verifyPayment(req.params.paymentIntentId);
    res.json({ verified, paymentIntentId: req.params.paymentIntentId });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check payment status' });
  }
});



module.exports = router;


5. IMPORTANT: Submit LOCKED FILE CHANGE REQUESTS:

{
  "agent": "BACKEND-PAYMENTS",
  "file": "backend/index.js",
  "changes": [
    {
      "description": "Add payments routes",
      "code": "const paymentsRoutes = require('./routes/payments');\napp.use('/api/v1/payments', paymentsRoutes);"
    },
    {
      "description": "Add Stripe webhook route (must use raw body parser)",
      "code": "const stripeWebhookRoutes = require('./routes/webhooks/stripe');\napp.use('/api/webhooks/stripe', stripeWebhookRoutes);"
    }
  ]
}

{
  "agent": "BACKEND-PAYMENTS",
  "file": "package.json",
  "change": "Add stripe dependency",
  "dependency": "stripe@^14.0.0"
}

CONSTRAINTS:
- Do NOT modify RFQ business logic
- Do NOT modify database schemas
- Do NOT modify frontend files
- Submit locked file change requests for index.js and package.json

OUTPUT FORMAT:
Only payment-related backend JavaScript files.
```

## Verification Checklist
- [ ] New files in `backend/routes/payments.js`, `backend/services/payments/**`
- [ ] Webhook signature verification implemented
- [ ] No direct modifications to locked files
- [ ] Change requests submitted
