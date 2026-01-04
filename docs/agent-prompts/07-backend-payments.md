# Agent 7: BACKEND-PAYMENTS

## Copy-Paste Prompt

```
You are the Backend Payments Agent for GreenChainz.

LANE: Stripe payment integration and LinkedIn OAuth only.

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


2. Create backend/services/payments/linkedin.js:

const { pool } = require('../../db');

const LINKEDIN_AUTH_URL = 'https://www.linkedin.com/oauth/v2/authorization';
const LINKEDIN_TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';
const LINKEDIN_PROFILE_URL = 'https://api.linkedin.com/v2/userinfo';

/**
 * Generate LinkedIn OAuth URL
 */
function getAuthorizationUrl(state) {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.LINKEDIN_CLIENT_ID,
    redirect_uri: process.env.LINKEDIN_REDIRECT_URI,
    state,
    scope: 'openid profile email'
  });
  return `${LINKEDIN_AUTH_URL}?${params}`;
}

/**
 * Exchange auth code for access token
 */
async function exchangeCodeForToken(code) {
  const response = await fetch(LINKEDIN_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.LINKEDIN_REDIRECT_URI,
      client_id: process.env.LINKEDIN_CLIENT_ID,
      client_secret: process.env.LINKEDIN_CLIENT_SECRET
    })
  });

  if (!response.ok) {
    throw new Error('Failed to exchange code for token');
  }

  return response.json();
}

/**
 * Get LinkedIn profile with access token
 */
async function getProfile(accessToken) {
  const response = await fetch(LINKEDIN_PROFILE_URL, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch LinkedIn profile');
  }

  return response.json();
}

/**
 * Verify and store LinkedIn profile for user
 */
async function verifyAndStore(userId, code) {
  const { access_token } = await exchangeCodeForToken(code);
  const profile = await getProfile(access_token);

  // Store verification
  await pool.query(`
    INSERT INTO user_verifications (user_id, provider, provider_user_id, profile_data)
    VALUES ($1, 'linkedin', $2, $3)
    ON CONFLICT (user_id, provider) DO UPDATE SET
      provider_user_id = EXCLUDED.provider_user_id,
      profile_data = EXCLUDED.profile_data,
      verified_at = NOW()
  `, [userId, profile.sub, JSON.stringify(profile)]);

  // Update user
  await pool.query(`
    UPDATE users SET 
      linkedin_verified = TRUE,
      linkedin_profile_url = $2
    WHERE id = $1
  `, [userId, `https://www.linkedin.com/in/${profile.sub}`]);

  return { verified: true, profile };
}

module.exports = {
  getAuthorizationUrl,
  exchangeCodeForToken,
  getProfile,
  verifyAndStore
};


3. Create backend/routes/payments.js:

const express = require('express');
const router = express.Router();
const stripeService = require('../services/payments/stripe');
const linkedinService = require('../services/payments/linkedin');
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

/**
 * GET /api/v1/payments/linkedin/auth
 * Start LinkedIn OAuth flow
 */
router.get('/linkedin/auth', (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  // Store state in session for CSRF protection
  req.session.linkedinState = state;

  const authUrl = linkedinService.getAuthorizationUrl(state);
  res.json({ authUrl });
});

/**
 * GET /api/v1/payments/linkedin/callback
 * Handle LinkedIn OAuth callback
 */
router.get('/linkedin/callback', async (req, res) => {
  try {
    const { code, state } = req.query;

    // Verify state for CSRF protection
    if (state !== req.session.linkedinState) {
      return res.status(403).json({ error: 'Invalid state parameter' });
    }

    const result = await linkedinService.verifyAndStore(req.user.id, code);

    // Redirect to settings page with success
    res.redirect('/settings/verification?linkedin=success');
  } catch (error) {
    console.error('LinkedIn callback error:', error);
    res.redirect('/settings/verification?linkedin=error');
  }
});

module.exports = router;


4. Create backend/routes/webhooks/stripe.js:

const express = require('express');
const router = express.Router();
const Stripe = require('stripe');
const stripeService = require('../../services/payments/stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

/**
 * POST /api/webhooks/stripe
 * Handle Stripe webhook events
 */
router.post('/', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      await stripeService.handlePaymentSuccess(event.data.object);
      console.log('Payment succeeded:', event.data.object.id);
      break;

    case 'payment_intent.payment_failed':
      await stripeService.handlePaymentFailure(event.data.object);
      console.log('Payment failed:', event.data.object.id);
      break;

    case 'charge.refunded':
      console.log('Charge refunded:', event.data.object.id);
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.json({ received: true });
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
- [ ] LinkedIn OAuth with CSRF protection
- [ ] No direct modifications to locked files
- [ ] Change requests submitted
