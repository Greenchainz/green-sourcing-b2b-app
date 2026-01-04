# Intercom Integration

This module provides services for integrating with Intercom for supplier outreach and RFQ notifications.

## Setup

1.  **Environment Variables**:
    Ensure the following environment variables are set:
    *   `INTERCOM_ACCESS_TOKEN`: Access token for Intercom API.
    *   `INTERCOM_WEBHOOK_SECRET`: Secret for verifying webhook signatures (optional but recommended).
    *   `FRONTEND_URL`: URL of the frontend (used in email/message templates).
    *   `INTERNAL_API_KEY`: API key for internal route protection.

2.  **Database Migration**:
    Run the SQL in `schema.sql` to create the `Intercom_Contacts` table needed for tracking message history.

## Usage

*   **Initialize**: The client is initialized in `index.js`.
*   **Contacts**: Use `contacts.js` to create/update contacts and add tags.
*   **Messaging**: Use `messaging.js` to send outbound messages and notifications.
*   **Templates**: Use `templates.js` for consistent message formatting.
*   **Webhooks**: Use `webhooks.js` to handle events like `conversation.user.replied` and `user.created`.

## RFQ Notification Flow

### Verified Suppliers (Waves 1-3)
When an RFQ is distributed to a verified supplier:
```javascript
const { sendRfqNotification } = require('./messaging');
await sendRfqNotification(supplierId, rfqId, waveNumber);
```

### Shadow Suppliers (Wave 4)
Shadow suppliers receive claim prompts instead of full RFQ details:
```javascript
const { sendClaimPrompt } = require('./messaging');
await sendClaimPrompt(shadowSupplierId, rfqId);
```

### Quote Notifications
Notify architects when suppliers submit quotes:
```javascript
const { sendQuoteReceived } = require('./messaging');
await sendQuoteReceived(architectId, rfqId, supplierId);
```

### Wave Distribution Integration
After RFQ wave distribution, trigger notifications:
```javascript
const { triggerWaveNotifications, extractWaveEntries } = require('./index');

// After createDistributionWaves:
const waveResult = await createDistributionWaves(rfqId, suppliers);
const entries = extractWaveEntries(waveResult.auditLog);
await triggerWaveNotifications(rfqId, entries);
```

## API Routes

The `backend/routes/intercom.js` provides internal API endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/intercom/send-rfq-notification` | POST | Notify supplier of new RFQ |
| `/api/v1/intercom/send-claim-prompt` | POST | Prompt shadow supplier to claim |
| `/api/v1/intercom/send-quote-received` | POST | Notify architect of new quote |
| `/api/v1/intercom/send-deposit-verified` | POST | Confirm deposit to buyer |
| `/api/v1/intercom/sync-supplier` | POST | Sync supplier to Intercom |
| `/api/v1/intercom/batch-sync` | POST | Batch sync suppliers by tier |
| `/api/v1/intercom/webhook` | POST | Handle Intercom webhooks |
| `/api/v1/intercom/health` | GET | Health check |

All endpoints except `/webhook` and `/health` require the `x-internal-api-key` header.

## Message Templates

Templates in `templates.js`:

| Template | Purpose |
|----------|---------|
| `new_rfq` | Notify supplier of RFQ opportunity |
| `claim_prompt` | Prompt shadow supplier to claim profile |
| `quote_received` | Notify architect of new quote |
| `deposit_verified` | Confirm deposit verification |

## Files

*   `index.js`: Entry point, client initialization, wave notification trigger.
*   `contacts.js`: Contact management, supplier sync, tier tagging.
*   `messaging.js`: Outbound messaging and RFQ notifications.
*   `templates.js`: Message templates for consistent branding.
*   `webhooks.js`: Webhook handlers.
*   `schema.sql`: Database schema for tracking.

## Supplier Tier Tags

Suppliers are tagged in Intercom for segmentation:

| Tier | Tag |
|------|-----|
| premium | `supplier_premium` |
| enterprise | `supplier_enterprise` |
| standard | `supplier_standard` |
| pro | `supplier_pro` |
| claimed | `supplier_claimed` |
| free | `supplier_free` |
| scraped | `supplier_shadow` |
