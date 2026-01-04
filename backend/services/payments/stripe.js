/**
 * Stripe Payment Service
 * 
 * Handles RFQ deposit payments via Stripe:
 * - Create PaymentIntents for RFQ deposits
 * - Verify payment status
 * - Handle successful payments
 * - Process refunds
 * 
 * Environment Variables Required:
 * - STRIPE_SECRET_KEY: Stripe API secret key
 * - STRIPE_WEBHOOK_SECRET: Stripe webhook signing secret
 * - RFQ_DEPOSIT_AMOUNT_CENTS: Deposit amount in cents (default: 2500 = $25)
 */

const { pool } = require('../../db');

// Lazy-load Stripe to allow graceful degradation if not configured
let stripe = null;

function getStripe() {
    if (!stripe) {
        const secretKey = process.env.STRIPE_SECRET_KEY;
        if (!secretKey) {
            throw new Error('STRIPE_SECRET_KEY environment variable is required');
        }
        const Stripe = require('stripe');
        stripe = new Stripe(secretKey, {
            apiVersion: '2024-11-20.acacia'
        });
    }
    return stripe;
}

// Default RFQ deposit amount: $25.00
const RFQ_DEPOSIT_AMOUNT_CENTS = parseInt(process.env.RFQ_DEPOSIT_AMOUNT_CENTS || '2500', 10);

/**
 * Creates a PaymentIntent for an RFQ deposit
 * 
 * @param {string|number} userId - The user's ID
 * @param {object} options - Payment options
 * @param {string} options.projectName - Name of the RFQ project
 * @param {string} [options.rfqId] - Optional RFQ ID to associate
 * @param {number} [options.amountCents] - Override amount in cents
 * @returns {Promise<{clientSecret: string, paymentIntentId: string, amount: number}>}
 */
async function createRfqDeposit(userId, { projectName, rfqId = null, amountCents = null }) {
    if (!userId) {
        throw new Error('userId is required');
    }
    if (!projectName) {
        throw new Error('projectName is required');
    }

    const amount = amountCents || RFQ_DEPOSIT_AMOUNT_CENTS;
    const stripeClient = getStripe();

    // Get user email for Stripe customer lookup/creation
    const userResult = await pool.query(
        'SELECT id, email, first_name, last_name FROM Users WHERE id = $1',
        [userId]
    );

    if (userResult.rows.length === 0) {
        throw new Error('User not found');
    }

    const user = userResult.rows[0];

    // Create or retrieve Stripe customer
    let customerId;
    const customerSearch = await stripeClient.customers.list({
        email: user.email,
        limit: 1
    });

    if (customerSearch.data.length > 0) {
        customerId = customerSearch.data[0].id;
    } else {
        const customer = await stripeClient.customers.create({
            email: user.email,
            name: [user.first_name, user.last_name].filter(Boolean).join(' ') || undefined,
            metadata: {
                greenchainz_user_id: String(userId)
            }
        });
        customerId = customer.id;
    }

    // Create PaymentIntent
    const paymentIntent = await stripeClient.paymentIntents.create({
        amount,
        currency: 'usd',
        customer: customerId,
        description: `RFQ Deposit: ${projectName}`,
        metadata: {
            type: 'rfq_deposit',
            user_id: String(userId),
            project_name: projectName,
            rfq_id: rfqId ? String(rfqId) : ''
        },
        automatic_payment_methods: {
            enabled: true
        }
    });

    // Record the deposit attempt in the database
    await pool.query(
        `INSERT INTO rfq_deposits 
         (user_id, payment_intent_id, amount_cents, project_name, rfq_id, status, created_at)
         VALUES ($1, $2, $3, $4, $5, 'pending', NOW())
         ON CONFLICT (payment_intent_id) DO UPDATE 
         SET status = 'pending', updated_at = NOW()`,
        [userId, paymentIntent.id, amount, projectName, rfqId]
    );

    return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount
    };
}

/**
 * Verifies a payment was successful
 * 
 * @param {string} paymentIntentId - The Stripe PaymentIntent ID
 * @returns {Promise<boolean>}
 */
async function verifyPayment(paymentIntentId) {
    if (!paymentIntentId) {
        return false;
    }

    try {
        const stripeClient = getStripe();
        const paymentIntent = await stripeClient.paymentIntents.retrieve(paymentIntentId);
        return paymentIntent.status === 'succeeded';
    } catch (error) {
        console.error('[Stripe] Payment verification error:', error.message);
        return false;
    }
}

/**
 * Handles a successful payment - updates deposit status and user verification
 * 
 * @param {object} paymentIntent - The Stripe PaymentIntent object
 * @returns {Promise<{success: boolean, depositId?: string, error?: string}>}
 */
async function handlePaymentSuccess(paymentIntent) {
    if (!paymentIntent || !paymentIntent.id) {
        return { success: false, error: 'Invalid payment intent' };
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const { id: paymentIntentId, metadata, amount } = paymentIntent;
        const userId = metadata?.user_id;

        if (!userId) {
            await client.query('ROLLBACK');
            return { success: false, error: 'Missing user_id in payment metadata' };
        }

        // Update deposit record
        const depositResult = await client.query(
            `UPDATE rfq_deposits 
             SET status = 'completed',
                 completed_at = NOW(),
                 updated_at = NOW()
             WHERE payment_intent_id = $1
             RETURNING id, user_id, rfq_id`,
            [paymentIntentId]
        );

        let depositId = null;
        if (depositResult.rows.length > 0) {
            depositId = depositResult.rows[0].id;
        } else {
            // Create deposit record if it doesn't exist (webhook before frontend record)
            const insertResult = await client.query(
                `INSERT INTO rfq_deposits 
                 (user_id, payment_intent_id, amount_cents, project_name, status, completed_at, created_at)
                 VALUES ($1, $2, $3, $4, 'completed', NOW(), NOW())
                 RETURNING id`,
                [userId, paymentIntentId, amount, metadata?.project_name || 'Unknown Project']
            );
            depositId = insertResult.rows[0].id;
        }

        // Update user/buyer deposit verification status
        // Try Buyers table first (for buyer verification flow)
        const buyerUpdate = await client.query(
            `UPDATE Buyers 
             SET deposit_verified = TRUE,
                 deposit_verified_at = NOW(),
                 deposit_amount_cents = $2,
                 UpdatedAt = NOW()
             WHERE BuyerID = (SELECT id FROM Users WHERE id = $1)
             OR UserID = $1
             RETURNING BuyerID`,
            [userId, amount]
        );

        // Log the verification event if buyer was updated
        if (buyerUpdate.rows.length > 0) {
            await client.query(
                `INSERT INTO Buyer_Verification_Log 
                 (buyer_id, verification_type, status, metadata)
                 VALUES ($1, 'deposit', 'verified', $2)`,
                [
                    buyerUpdate.rows[0].buyerid,
                    JSON.stringify({
                        payment_intent_id: paymentIntentId,
                        amount_cents: amount,
                        source: 'stripe_webhook'
                    })
                ]
            );
        }

        await client.query('COMMIT');

        console.log(`[Stripe] Payment success handled: ${paymentIntentId} for user ${userId}`);
        return { success: true, depositId };
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('[Stripe] Handle payment success error:', error);
        return { success: false, error: error.message };
    } finally {
        client.release();
    }
}

/**
 * Handles a failed payment - updates deposit status
 * 
 * @param {object} paymentIntent - The Stripe PaymentIntent object
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function handlePaymentFailure(paymentIntent) {
    if (!paymentIntent || !paymentIntent.id) {
        return { success: false, error: 'Invalid payment intent' };
    }

    try {
        const { id: paymentIntentId, last_payment_error } = paymentIntent;

        await pool.query(
            `UPDATE rfq_deposits 
             SET status = 'failed',
                 failure_reason = $2,
                 updated_at = NOW()
             WHERE payment_intent_id = $1`,
            [paymentIntentId, last_payment_error?.message || 'Payment failed']
        );

        console.log(`[Stripe] Payment failure recorded: ${paymentIntentId}`);
        return { success: true };
    } catch (error) {
        console.error('[Stripe] Handle payment failure error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Refunds a deposit
 * 
 * @param {string} paymentIntentId - The Stripe PaymentIntent ID
 * @param {string} reason - Reason for refund
 * @returns {Promise<{success: boolean, refund?: object, error?: string}>}
 */
async function refundDeposit(paymentIntentId, reason = 'requested_by_customer') {
    if (!paymentIntentId) {
        throw new Error('paymentIntentId is required');
    }

    const stripeClient = getStripe();
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Create refund in Stripe
        const refund = await stripeClient.refunds.create({
            payment_intent: paymentIntentId,
            reason: reason === 'duplicate' ? 'duplicate' : 
                    reason === 'fraudulent' ? 'fraudulent' : 'requested_by_customer',
            metadata: {
                internal_reason: reason
            }
        });

        // Update deposit record
        await client.query(
            `UPDATE rfq_deposits 
             SET status = 'refunded',
                 refund_id = $2,
                 refund_reason = $3,
                 refunded_at = NOW(),
                 updated_at = NOW()
             WHERE payment_intent_id = $1`,
            [paymentIntentId, refund.id, reason]
        );

        // Optionally revert deposit verification (depending on business logic)
        // For now, we don't revert verification - deposit was still made initially

        await client.query('COMMIT');

        console.log(`[Stripe] Deposit refunded: ${paymentIntentId} -> ${refund.id}`);
        return { success: true, refund };
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('[Stripe] Refund error:', error);
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Gets deposit status by PaymentIntent ID
 * 
 * @param {string} paymentIntentId - The Stripe PaymentIntent ID
 * @returns {Promise<{status: string, deposit?: object}>}
 */
async function getDepositStatus(paymentIntentId) {
    if (!paymentIntentId) {
        return { status: 'not_found' };
    }

    try {
        const result = await pool.query(
            `SELECT id, user_id, payment_intent_id, amount_cents, project_name, 
                    rfq_id, status, failure_reason, refund_id, refund_reason,
                    created_at, completed_at, refunded_at
             FROM rfq_deposits 
             WHERE payment_intent_id = $1`,
            [paymentIntentId]
        );

        if (result.rows.length === 0) {
            // Check Stripe directly
            try {
                const stripeClient = getStripe();
                const paymentIntent = await stripeClient.paymentIntents.retrieve(paymentIntentId);
                return {
                    status: paymentIntent.status,
                    stripeOnly: true
                };
            } catch {
                return { status: 'not_found' };
            }
        }

        return {
            status: result.rows[0].status,
            deposit: result.rows[0]
        };
    } catch (error) {
        console.error('[Stripe] Get deposit status error:', error);
        return { status: 'error', error: error.message };
    }
}

/**
 * Constructs and verifies a Stripe webhook event
 * 
 * @param {Buffer} rawBody - Raw request body
 * @param {string} signature - Stripe-Signature header
 * @returns {object} Verified Stripe event
 */
function constructWebhookEvent(rawBody, signature) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
        throw new Error('STRIPE_WEBHOOK_SECRET environment variable is required');
    }

    const stripeClient = getStripe();
    return stripeClient.webhooks.constructEvent(rawBody, signature, webhookSecret);
}

module.exports = {
    createRfqDeposit,
    verifyPayment,
    handlePaymentSuccess,
    handlePaymentFailure,
    refundDeposit,
    getDepositStatus,
    constructWebhookEvent,
    RFQ_DEPOSIT_AMOUNT_CENTS
};
