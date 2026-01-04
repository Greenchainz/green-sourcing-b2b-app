# LOCKED FILE CHANGE REQUESTS

This document contains the required changes to locked files for the payment integration to work.

---

## 1. backend/index.js

### Changes Required

Add imports for the new routes at the top of the file (around line 17-18):

```javascript
// Existing imports...
const buyerVerificationRoutes = require('./routes/buyerVerification');

// ADD THESE NEW IMPORTS:
const paymentsRoutes = require('./routes/payments');
const stripeWebhookRoutes = require('./routes/webhooks/stripe');
```

Add webhook route BEFORE the `express.json()` middleware (around line 53):

**IMPORTANT**: Stripe webhooks require raw body parsing for signature verification. This must be mounted BEFORE `express.json()`.

```javascript
// Add BEFORE express.json() middleware:
// Stripe webhook needs raw body for signature verification
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }), stripeWebhookRoutes);
```

Add payments route with other API routes (around line 150):

```javascript
// After the verification routes:
app.use('/api/v1/verification', buyerVerificationRoutes);

// ADD THIS NEW ROUTE:
app.use('/api/v1/payments', paymentsRoutes);
```

### Full Diff

```diff
--- a/backend/index.js
+++ b/backend/index.js
@@ -17,6 +17,8 @@ const rfqRoutes = require('./routes/rfqs');
 const shadowSupplierRoutes = require('./routes/shadow-suppliers');
 const aiGatewayRoutes = require('./routes/ai-gateway');
 const buyerVerificationRoutes = require('./routes/buyerVerification');
+const paymentsRoutes = require('./routes/payments');
+const stripeWebhookRoutes = require('./routes/webhooks/stripe');
 
 // AI Gateway
 const aiGateway = require('./services/ai-gateway');
@@ -45,6 +47,10 @@ async function start() {
 
     const sessionMiddleware = buildSessionMiddleware({ redisClient });
 
+    // Stripe webhook needs raw body for signature verification
+    // Must be mounted BEFORE express.json()
+    app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }), stripeWebhookRoutes);
+
     // Security & Basic Middleware
     app.use(cors({
         origin: process.env.FRONTEND_URL || 'http://localhost:3000', // Default to Next.js port
@@ -148,6 +154,7 @@ async function start() {
     app.use('/api/v1/auth', authRoutes);
     app.use('/api/v1/rfqs', rfqRoutes);
     app.use('/api/v1/verification', buyerVerificationRoutes);
+    app.use('/api/v1/payments', paymentsRoutes);
     app.use('/api/v1/ai-gateway', aiGatewayRoutes);
```

---

## 2. backend/package.json

### Changes Required

Add the Stripe and Axios packages to dependencies:

```json
{
  "dependencies": {
    "axios": "^1.7.0",
    "stripe": "^14.0.0"
  }
}
```

### Full Diff

```diff
--- a/backend/package.json
+++ b/backend/package.json
@@ -15,6 +15,7 @@
   "dependencies": {
     "@azure/ai-form-recognizer": "^5.0.0",
     "@azure/identity": "^4.5.0",
+    "axios": "^1.7.0",
     ...
     "redis": "^4.7.0",
+    "stripe": "^14.0.0",
     "swagger-ui-express": "^5.0.1",
     "yaml": "^2.5.1"
   }
```

### Installation Command

```bash
cd backend && npm install stripe@^14.0.0 axios@^1.7.0
```

---

## Environment Variables Required

Add these to your `.env` or Azure Key Vault:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...       # or sk_live_... for production
STRIPE_WEBHOOK_SECRET=whsec_...     # From Stripe Dashboard > Webhooks
RFQ_DEPOSIT_AMOUNT_CENTS=2500       # Optional: defaults to $25.00

# LinkedIn OAuth Configuration
LINKEDIN_CLIENT_ID=your_client_id
LINKEDIN_CLIENT_SECRET=your_client_secret
LINKEDIN_REDIRECT_URI=https://api.greenchainz.com/api/v1/payments/linkedin/callback
```

---

## Database Schema Required

These tables are needed for the payment integration. If they don't exist, add them to the database:

```sql
-- RFQ Deposits table
CREATE TABLE IF NOT EXISTS rfq_deposits (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES Users(id),
    payment_intent_id VARCHAR(255) UNIQUE NOT NULL,
    amount_cents INTEGER NOT NULL,
    project_name VARCHAR(500),
    rfq_id INTEGER REFERENCES rfqs(id),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    failure_reason TEXT,
    refund_id VARCHAR(255),
    refund_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    refunded_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_rfq_deposits_user_id ON rfq_deposits(user_id);
CREATE INDEX idx_rfq_deposits_status ON rfq_deposits(status);
CREATE INDEX idx_rfq_deposits_payment_intent ON rfq_deposits(payment_intent_id);

-- User Verifications table (for LinkedIn and other OAuth providers)
CREATE TABLE IF NOT EXISTS user_verifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES Users(id),
    provider VARCHAR(50) NOT NULL,
    provider_id VARCHAR(255),
    provider_email VARCHAR(255),
    profile_data JSONB,
    verified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, provider)
);

CREATE INDEX idx_user_verifications_user ON user_verifications(user_id);
CREATE INDEX idx_user_verifications_provider ON user_verifications(provider);

-- Payment Disputes table (for monitoring)
CREATE TABLE IF NOT EXISTS payment_disputes (
    id SERIAL PRIMARY KEY,
    dispute_id VARCHAR(255) UNIQUE NOT NULL,
    charge_id VARCHAR(255),
    payment_intent_id VARCHAR(255),
    amount INTEGER,
    reason VARCHAR(100),
    status VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    closed_at TIMESTAMP WITH TIME ZONE
);

-- Add linkedin_verified and linkedin_id columns to Users if not exists
ALTER TABLE Users ADD COLUMN IF NOT EXISTS linkedin_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE Users ADD COLUMN IF NOT EXISTS linkedin_id VARCHAR(255);
```

---

## Stripe Webhook Setup

1. Go to Stripe Dashboard > Developers > Webhooks
2. Click "Add endpoint"
3. Enter webhook URL: `https://api.greenchainz.com/api/webhooks/stripe`
4. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
   - `charge.dispute.created`
   - `charge.dispute.closed`
5. Copy the signing secret (whsec_...) to `STRIPE_WEBHOOK_SECRET`

---

## LinkedIn OAuth Setup

1. Go to LinkedIn Developer Portal: https://www.linkedin.com/developers/
2. Create or select your app
3. Go to "Auth" tab
4. Add redirect URL: `https://api.greenchainz.com/api/v1/payments/linkedin/callback`
5. Request these scopes: `openid`, `profile`, `email`
6. Copy Client ID and Client Secret to environment variables
