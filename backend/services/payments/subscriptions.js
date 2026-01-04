/**
 * Stripe Subscription Service
 *
 * Handles supplier subscription lifecycles:
 * - Create Checkout Sessions for upgrades
 * - Create Billing Portal sessions
 * - Sync subscription status from Stripe webhooks
 * - Manage entitlements based on subscription status
 */

const { pool } = require("../../db");
const stripeService = require("./stripe"); // Reuse getStripe from existing service
// We need to access the un-exported getStripe or duplicate the logic.
// Looking at stripe.js, getStripe is internal.
// I will replicate the lazy-load pattern here for robustness or try to require 'stripe' directly if env is guaranteed.
// Actually, better to require the stripe package directly here to avoid dependency on internal implementation details of stripe.js
// unless I modify stripe.js to export the client getter.
// For now, I'll implement a local getStripe to be safe and independent.

// Environment variables for Price IDs
const STRIPE_PRICE_IDS = {
  standard_monthly: process.env.STRIPE_PRICE_STANDARD_MONTHLY,
  standard_yearly: process.env.STRIPE_PRICE_STANDARD_YEARLY,
  premium_monthly: process.env.STRIPE_PRICE_PREMIUM_MONTHLY,
  premium_yearly: process.env.STRIPE_PRICE_PREMIUM_YEARLY,
};

let stripe = null;

function getStripe() {
  if (!stripe) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error("STRIPE_SECRET_KEY environment variable is required");
    }
    const Stripe = require("stripe");
    stripe = new Stripe(secretKey, {
      apiVersion: "2024-11-20.acacia",
    });
  }
  return stripe;
}

const entitlements = require("../ai-gateway/entitlements");

/**
 * Creates a Checkout Session for a subscription upgrade
 *
 * @param {string} supplierId - ID of the supplier
 * @param {string} tierCode - 'standard' or 'premium'
 * @param {string} interval - 'month' or 'year'
 * @param {string} returnUrl - URL to redirect to after checkout
 */
async function createCheckoutSession(
  supplierId,
  tierCode,
  interval = "month",
  returnUrl
) {
  if (!supplierId || !tierCode) {
    throw new Error("supplierId and tierCode are required");
  }

  const priceKey = `${tierCode.toLowerCase()}_${interval.toLowerCase()}`;
  const priceId = STRIPE_PRICE_IDS[priceKey];

  if (!priceId) {
    throw new Error(
      `Invalid tier configuration: ${tierCode} (${interval}). Price ID not found.`
    );
  }

  const stripeClient = getStripe();
  const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const finalReturnUrl = returnUrl || `${baseUrl}/supplier/dashboard/settings`;

  // 1. Get supplier email and Stripe Customer ID
  const supplierResult = await pool.query(
    `SELECT id, email, stripe_customer_id, company_name 
         FROM Suppliers 
         WHERE id = $1`,
    [supplierId]
  );

  if (supplierResult.rows.length === 0) {
    throw new Error("Supplier not found");
  }

  const supplier = supplierResult.rows[0];
  let customerId = supplier.stripe_customer_id;

  // 2. If no customer ID, create one or find by email
  if (!customerId) {
    const existingCustomers = await stripeClient.customers.list({
      email: supplier.email,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      customerId = existingCustomers.data[0].id;
    } else {
      const newCustomer = await stripeClient.customers.create({
        email: supplier.email,
        name: supplier.company_name,
        metadata: {
          greenchainz_supplier_id: String(supplierId),
        },
      });
      customerId = newCustomer.id;
    }

    // Save customer ID to supplier record
    await pool.query(
      "UPDATE Suppliers SET stripe_customer_id = $1 WHERE id = $2",
      [customerId, supplierId]
    );
  }

  // 3. Create Checkout Session
  const session = await stripeClient.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    metadata: {
      supplier_id: String(supplierId),
      target_tier: tierCode,
    },
    success_url: `${finalReturnUrl}?session_id={CHECKOUT_SESSION_ID}&success=true`,
    cancel_url: `${finalReturnUrl}?canceled=true`,
    subscription_data: {
      metadata: {
        supplier_id: String(supplierId),
        tier: tierCode,
      },
    },
  });

  return {
    url: session.url,
    sessionId: session.id,
  };
}

/**
 * Creates a Billing Portal session for managing subscription
 *
 * @param {string} supplierId
 * @param {string} returnUrl
 */
async function createBillingPortalSession(supplierId, returnUrl) {
  const supplierResult = await pool.query(
    "SELECT stripe_customer_id FROM Suppliers WHERE id = $1",
    [supplierId]
  );

  if (
    supplierResult.rows.length === 0 ||
    !supplierResult.rows[0].stripe_customer_id
  ) {
    throw new Error("Supplier has no Stripe customer record");
  }

  const stripeClient = getStripe();
  const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000";

  const session = await stripeClient.billingPortal.sessions.create({
    customer: supplierResult.rows[0].stripe_customer_id,
    return_url: returnUrl || `${baseUrl}/supplier/dashboard/settings`,
  });

  return {
    url: session.url,
  };
}

/**
 * Handles 'customer.subscription.created' and 'updated' webhook events
 */
async function handleSubscriptionChange(subscription) {
  const stripeClient = getStripe();
  const customerId = subscription.customer;
  let supplierId = subscription.metadata.supplier_id;

  // If metadata is missing (e.g. created outside app), lookup by customer ID
  if (!supplierId) {
    const supplierResult = await pool.query(
      "SELECT id FROM Suppliers WHERE stripe_customer_id = $1",
      [customerId]
    );
    if (supplierResult.rows.length > 0) {
      supplierId = supplierResult.rows[0].id;
    }
  }

  if (!supplierId) {
    console.warn(
      `[Stripe Subscription] No supplier found for customer ${customerId}`
    );
    return;
  }

  const status = subscription.status;
  const planId = subscription.items.data[0].price.id; // Basic assumption: 1 item

  // Determine tier from Price ID
  let tier = "free";
  if (Object.values(STRIPE_PRICE_IDS).includes(planId)) {
    if (
      planId === STRIPE_PRICE_IDS.standard_monthly ||
      planId === STRIPE_PRICE_IDS.standard_yearly
    ) {
      tier = "standard";
    } else if (
      planId === STRIPE_PRICE_IDS.premium_monthly ||
      planId === STRIPE_PRICE_IDS.premium_yearly
    ) {
      tier = "premium";
    }
  }

  // Handle "active" or "trialing" -> grant access.
  // "past_due", "canceled", "unpaid" -> revoke or downgrade?
  // Logic:
  // - active/trialing: set tier to matched tier
  // - canceled/unpaid: set tier to free

  let targetTier = "free";
  if (["active", "trialing"].includes(status)) {
    targetTier = tier;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Upsert Supplier_Subscriptions
    await client.query(
      `INSERT INTO Supplier_Subscriptions 
             (supplier_id, stripe_subscription_id, plan_id, status, current_period_start, current_period_end, created_at, updated_at)
             VALUES ($1, $2, $3, $4, to_timestamp($5), to_timestamp($6), NOW(), NOW())
             ON CONFLICT (stripe_subscription_id) DO UPDATE
             SET status = $4, 
                 plan_id = $3,
                 current_period_start = to_timestamp($5),
                 current_period_end = to_timestamp($6),
                 updated_at = NOW()`,
      [
        supplierId,
        subscription.id,
        planId,
        status,
        subscription.current_period_start,
        subscription.current_period_end,
      ]
    );

    // Update Supplier main record tier
    // NOTE: We rely on the entitlements service to manage what this "tier" actually means for permissions
    // But we store the "billing tier" on the supplier record for easy lookup
    await client.query(
      "UPDATE Suppliers SET subscription_tier = $1, updated_at = NOW() WHERE id = $2",
      [targetTier, supplierId]
    );

    // Propagate to Entitlements (if applicable)
    if (entitlements.setSupplierTier) {
      await entitlements.setSupplierTier(supplierId, targetTier);
    }

    await client.query("COMMIT");
    console.log(
      `[Stripe Subscription] Updated supplier ${supplierId} to tier ${targetTier} (Status: ${status})`
    );
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[Stripe Subscription] Error handling change:", err);
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Handles subscription deletion
 */
async function handleSubscriptionDeleted(subscription) {
  // Treat as downgrade to free
  const stripeClient = getStripe();
  const customerId = subscription.customer;

  // Find supplier
  const supplierResult = await pool.query(
    "SELECT id FROM Suppliers WHERE stripe_customer_id = $1",
    [customerId]
  );

  if (supplierResult.rows.length === 0) return;
  const supplierId = supplierResult.rows[0].id;

  // Update DB
  await pool.query(
    `UPDATE Supplier_Subscriptions 
         SET status = 'canceled', updated_at = NOW() 
         WHERE stripe_subscription_id = $1`,
    [subscription.id]
  );

  await pool.query(
    "UPDATE Suppliers SET subscription_tier = 'free', updated_at = NOW() WHERE id = $1",
    [supplierId]
  );

  if (entitlements.setSupplierTier) {
    await entitlements.setSupplierTier(supplierId, "free");
  }

  console.log(
    `[Stripe Subscription] Supplier ${supplierId} degraded to free (Subscription deleted)`
  );
}

/**
 * Manual sync of subscription status from Stripe
 */
async function syncSubscriptionStatus(supplierId) {
  const supplierResult = await pool.query(
    "SELECT stripe_customer_id FROM Suppliers WHERE id = $1",
    [supplierId]
  );

  if (
    supplierResult.rows.length === 0 ||
    !supplierResult.rows[0].stripe_customer_id
  ) {
    return { status: "no_customer", tier: "free" };
  }

  const stripeClient = getStripe();
  const customerId = supplierResult.rows[0].stripe_customer_id;

  const subscriptions = await stripeClient.subscriptions.list({
    customer: customerId,
    limit: 1,
    status: "all", // get all to see most recent
  });

  if (subscriptions.data.length === 0) {
    // No subscription found -> Free
    return { status: "none", tier: "free" };
  }

  const sub = subscriptions.data[0];
  await handleSubscriptionChange(sub);

  return {
    status: sub.status,
    subscriptionId: sub.id,
  };
}

/**
 * Get current subscription status from DB
 */
async function getSubscriptionStatus(supplierId) {
  const result = await pool.query(
    `SELECT ss.*, s.subscription_tier as active_tier
         FROM Suppliers s
         LEFT JOIN Supplier_Subscriptions ss ON s.id = ss.supplier_id AND ss.status IN ('active', 'trialing')
         WHERE s.id = $1`,
    [supplierId]
  );

  if (result.rows.length === 0) return null;

  return {
    tier: result.rows[0].active_tier || "free",
    details: result.rows[0],
  };
}

module.exports = {
  createCheckoutSession,
  createBillingPortalSession,
  handleSubscriptionChange,
  handleSubscriptionDeleted,
  syncSubscriptionStatus,
  getSubscriptionStatus,
};
