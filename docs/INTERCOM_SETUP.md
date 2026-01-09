# Intercom Setup Guide

This guide covers the complete setup and configuration of Intercom for bidirectional messaging (send and receive) on the GreenChainz platform.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Frontend Configuration](#frontend-configuration)
4. [Backend Configuration](#backend-configuration)
5. [Azure Deployment](#azure-deployment)
6. [Webhook Setup](#webhook-setup)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)

## Overview

The Intercom integration provides:

- **Customer Support Chat Widget**: Visible on every page for both authenticated and unauthenticated users
- **User Identity**: Automatically passes user information (name, email, created date) when logged in
- **Bidirectional Messaging**: Users can send messages to support team and receive replies
- **Webhook Events**: Backend receives real-time notifications for conversation events
- **Privacy Compliance**: Integration with Ketch CMP for consent management

### Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Browser   │ ◄─────► │   Frontend   │ ◄─────► │   Backend   │
│  (Widget)   │         │  (Next.js)   │         │  (Express)  │
└─────────────┘         └──────────────┘         └─────────────┘
       │                                                  │
       │                                                  │
       ▼                                                  ▼
┌─────────────────────────────────────────────────────────────┐
│                     Intercom API                            │
│  - Chat Widget (messenger.js)                               │
│  - REST API (notifications, contact sync)                   │
│  - Webhooks (conversation events)                           │
└─────────────────────────────────────────────────────────────┘
```

## Prerequisites

### 1. Intercom Account & App ID

1. Sign up for Intercom at https://www.intercom.com/
2. Create a new workspace or use existing one
3. Go to **Settings** → **Installation** → **Web**
4. Copy your **App ID** (format: `w0p2831g`)

### 2. Intercom Access Token

1. Go to **Settings** → **Developers** → **Developer Hub**
2. Click **New App** or select existing app
3. Go to **Authentication** section
4. Generate an **Access Token** with these scopes:
   - `messages:write` - Send messages to users
   - `contacts:read` - Read contact information
   - `contacts:write` - Create/update contacts
   - `conversations:read` - Read conversation data
5. Copy the token (format: `dG9rOmxxxxxxxxx`)
6. **IMPORTANT**: Store securely - it won't be shown again

### 3. Webhook Secret

1. In Intercom Developer Hub, go to **Webhooks**
2. Copy the **Webhook Secret** (used to verify webhook signatures)
3. Format: `secret_key_xxxxxxxxxxxxx`

## Frontend Configuration

### Environment Variables

Add to `.env.local` (development) or GitHub Secrets (production):

```bash
# Public: Intercom App ID (safe to expose in client-side code)
NEXT_PUBLIC_INTERCOM_APP_ID=w0p2831g

# Public: Require consent before loading widget (GDPR compliance)
NEXT_PUBLIC_INTERCOM_REQUIRE_CONSENT=false

# Public: Backend API URL for user authentication
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
```

### Widget Configuration

The widget is already configured in:
- **Component**: `app/components/IntercomWidget.tsx`
- **Layout Integration**: `app/layout.tsx` → `app/LayoutContent.tsx`
- **User Context**: `app/hooks/useAuth.ts`

#### How It Works

1. **User Authentication**:
   ```typescript
   // app/hooks/useAuth.ts
   const { user, loading } = useAuth()
   // Fetches from: ${NEXT_PUBLIC_BACKEND_URL}/api/v1/auth/me
   ```

2. **Widget Loading**:
   ```typescript
   // app/LayoutContent.tsx
   {!loading && <IntercomWidget user={user || undefined} />}
   ```

3. **Identity Passing**:
   ```typescript
   // app/components/IntercomWidget.tsx
   Intercom({
     app_id: appId,
     user_id: user.id,        // UUID from database
     name: user.name,         // Full name
     email: user.email,       // Email address
     created_at: user.createdAt  // Unix timestamp
   })
   ```

### Consent Management (Ketch)

If `NEXT_PUBLIC_INTERCOM_REQUIRE_CONSENT=true`, widget will only load if:
- Ketch CMP is present on the page
- User has granted either `functional` or `marketing` consent
- Consent is checked via `window.ketch.getConsent()`

## Backend Configuration

### Environment Variables

Add to `.env` (development) or Azure Key Vault (production):

```bash
# Backend: Intercom API access token (SECRET - never commit!)
INTERCOM_ACCESS_TOKEN=dG9rOmxxxxxxxxx

# Backend: Webhook signature verification (SECRET)
INTERCOM_WEBHOOK_SECRET=secret_key_xxxxxxxxxxxxx

# Backend: Internal API protection (SECRET)
INTERNAL_API_KEY=<generate with: openssl rand -base64 48>
```

### Routes Registration

Already registered in `backend/index.js`:

```javascript
const intercomRoutes = require("./routes/intercom");
app.use("/api/v1/intercom", intercomRoutes);
```

### Available Endpoints

#### Public Endpoints

- **GET** `/api/v1/intercom/health` - Health check (no auth required)
- **POST** `/api/v1/intercom/webhook` - Webhook receiver (Intercom signature auth)

#### Protected Endpoints (require `INTERNAL_API_KEY` header)

- **POST** `/api/v1/intercom/send-rfq-notification` - Notify supplier of new RFQ
- **POST** `/api/v1/intercom/send-claim-prompt` - Prompt shadow supplier to claim
- **POST** `/api/v1/intercom/send-quote-received` - Notify architect of new quote
- **POST** `/api/v1/intercom/send-deposit-verified` - Notify buyer of deposit confirmation
- **POST** `/api/v1/intercom/sync-supplier` - Sync supplier to Intercom
- **POST** `/api/v1/intercom/batch-sync` - Batch sync suppliers by tier

### Database Schema

Run migration to create tracking table:

```sql
-- From: backend/services/intercom/schema.sql
CREATE TABLE IF NOT EXISTS Intercom_Contacts (
    ID SERIAL PRIMARY KEY,
    UserID UUID NOT NULL,
    MessageType TEXT NOT NULL,
    SentAt TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_intercom_contacts_userid ON Intercom_Contacts(UserID);
```

## Azure Deployment

### 1. Add GitHub Secret

```bash
gh secret set NEXT_PUBLIC_INTERCOM_APP_ID \
  --body "w0p2831g" \
  --repo jnorvi5/green-sourcing-b2b-app
```

### 2. Add Secrets to Azure Key Vault

```bash
VAULT_NAME="Greenchainz-vault-2026"

# Intercom Access Token (get from Intercom Developer Hub)
az keyvault secret set \
  --vault-name $VAULT_NAME \
  --name intercom-token \
  --value "dG9rOmxxxxxxxxx"

# Webhook Secret (get from Intercom Webhooks page)
az keyvault secret set \
  --vault-name $VAULT_NAME \
  --name intercom-webhook-secret \
  --value "secret_key_xxxxxxxxxxxxx"

# Internal API Key (generate new)
az keyvault secret set \
  --vault-name $VAULT_NAME \
  --name internal-api-key \
  --value "$(openssl rand -base64 48)"
```

### 3. Update Container App Configuration

#### Frontend Container App

Environment variables are passed at build time via GitHub Actions:

```yaml
# .github/workflows/deploy-azure-cd.yml
--build-arg NEXT_PUBLIC_INTERCOM_APP_ID=${{ secrets.NEXT_PUBLIC_INTERCOM_APP_ID }}
```

#### Backend Container App

Add Key Vault references:

```bash
# Get current backend container app config
az containerapp show \
  --name greenchainz-container \
  --resource-group rg-greenchainz-prod \
  --query properties.template > backend-template.json

# Edit backend-template.json to add:
{
  "secrets": [
    {
      "name": "intercom-token",
      "keyVaultUrl": "https://Greenchainz-vault-2026.vault.azure.net/secrets/intercom-token"
    },
    {
      "name": "intercom-webhook-secret",
      "keyVaultUrl": "https://Greenchainz-vault-2026.vault.azure.net/secrets/intercom-webhook-secret"
    },
    {
      "name": "internal-api-key",
      "keyVaultUrl": "https://Greenchainz-vault-2026.vault.azure.net/secrets/internal-api-key"
    }
  ],
  "containers": [{
    "env": [
      {
        "name": "INTERCOM_ACCESS_TOKEN",
        "secretRef": "intercom-token"
      },
      {
        "name": "INTERCOM_WEBHOOK_SECRET",
        "secretRef": "intercom-webhook-secret"
      },
      {
        "name": "INTERNAL_API_KEY",
        "secretRef": "internal-api-key"
      }
    ]
  }]
}

# Apply updated config
az containerapp update \
  --name greenchainz-container \
  --resource-group rg-greenchainz-prod \
  --yaml backend-template.json
```

## Webhook Setup

### 1. Register Webhook in Intercom

1. Go to **Settings** → **Developers** → **Developer Hub**
2. Select your app
3. Go to **Webhooks** section
4. Click **New webhook**
5. Configure:
   - **Webhook URL**: `https://greenchainz-container.jollyrock-a66f2da6.eastus.azurecontainerapps.io/api/v1/intercom/webhook`
   - **Topics** (select these):
     - `conversation.user.replied` - User sends message
     - `conversation.user.created` - New conversation started
     - `conversation.admin.replied` - Admin replies to user
   - **Version**: Latest stable version

### 2. Test Webhook Delivery

1. In Intercom Developer Hub, go to your webhook
2. Click **Send test event**
3. Check backend logs:
   ```bash
   az containerapp logs show \
     --name greenchainz-container \
     --resource-group rg-greenchainz-prod \
     --tail 50
   ```

4. Look for:
   ```
   [Intercom Webhook] Received event: conversation.user.replied
   [Intercom Webhook] Signature verified: ✓
   ```

## Testing

### 1. Widget Visibility Test

**Unauthenticated User:**

1. Open https://greenchainz.com in incognito window
2. Look for Intercom chat bubble in bottom-right corner
3. Click bubble → widget should open
4. Send test message "Hello from unauthenticated user"
5. Check message appears in Intercom dashboard

**Authenticated User:**

1. Log in to https://greenchainz.com
2. Open browser dev console
3. Check Intercom initialization:
   ```javascript
   console.log(window.Intercom)
   // Should see Intercom function
   ```
4. Widget should show user's name in header
5. Send message "Hello from authenticated user"
6. In Intercom dashboard, verify message shows user details

### 2. Bidirectional Messaging Test

**User → Support:**

1. In widget, send message: "Test from widget"
2. Check Intercom dashboard → should appear in inbox immediately
3. Verify user details shown (name, email, created date)

**Support → User:**

1. In Intercom dashboard, reply to user's message
2. Widget should show notification immediately (red badge)
3. User opens widget → sees support reply

### 3. Backend Integration Test

**Send RFQ Notification:**

```bash
curl -X POST https://greenchainz-container.jollyrock-a66f2da6.eastus.azurecontainerapps.io/api/v1/intercom/send-rfq-notification \
  -H "Content-Type: application/json" \
  -H "x-internal-api-key: YOUR_INTERNAL_API_KEY" \
  -d '{
    "supplierId": "uuid-of-supplier",
    "rfqId": "uuid-of-rfq",
    "waveNumber": 1
  }'
```

Expected response:
```json
{
  "success": true,
  "result": {
    "conversationId": "123456789",
    "messageId": "987654321"
  }
}
```

### 4. Webhook Test

**Trigger Event:**

1. Send message from widget
2. Check backend logs for webhook processing
3. Verify database entry:
   ```sql
   SELECT * FROM Intercom_Contacts 
   ORDER BY SentAt DESC 
   LIMIT 5;
   ```

## Troubleshooting

### Widget Not Appearing

**Check 1: App ID Configuration**

```javascript
// Browser console
console.log(process.env.NEXT_PUBLIC_INTERCOM_APP_ID)
// Should output: "w0p2831g"
```

If undefined:
- Verify GitHub Secret is set: `gh secret list`
- Check GitHub Actions build logs for build-arg
- Rebuild and redeploy frontend

**Check 2: Console Errors**

Open browser console (F12), look for:
- `[Intercom] NEXT_PUBLIC_INTERCOM_APP_ID not configured` → App ID missing
- CORS errors → Check FRONTEND_URL in backend
- Network errors → Check Intercom CDN is not blocked

**Check 3: Consent Gate**

If `NEXT_PUBLIC_INTERCOM_REQUIRE_CONSENT=true`:
```javascript
// Browser console
ketch.getConsent().then(c => console.log(c))
// Check: functional.consented or marketing.consented should be true
```

### User Data Not Showing

**Check 1: Auth Endpoint**

```bash
# Test auth endpoint
curl https://greenchainz.com/api/v1/auth/me \
  -H "Cookie: your-session-cookie" \
  --include
```

Expected response:
```json
{
  "user": {
    "userId": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "createdAt": "2025-01-01T00:00:00.000Z"
  }
}
```

**Check 2: Widget Initialization**

```javascript
// Browser console
window.Intercom('getVisitorId')
// Should return: user_id if logged in, visitor_id if not
```

### Backend Not Receiving Webhooks

**Check 1: Webhook URL Accessible**

```bash
curl https://greenchainz-container.jollyrock-a66f2da6.eastus.azurecontainerapps.io/api/v1/intercom/webhook
# Should return 404 or 405 (not 500 or timeout)
```

**Check 2: Signature Verification**

Check backend logs:
```
[Intercom Webhook] Signature verification failed
```

If failing:
- Verify `INTERCOM_WEBHOOK_SECRET` matches Intercom dashboard
- Check secret is loaded: `printenv | grep INTERCOM_WEBHOOK_SECRET`

**Check 3: Firewall/Network**

- Verify Container App ingress allows external traffic
- Check Azure Network Security Group rules
- Verify no IP allowlist blocking Intercom IPs

### Messages Not Sending from Backend

**Check 1: Access Token**

```javascript
// Test in Node.js REPL or script
const fetch = require('node-fetch');
fetch('https://api.intercom.io/me', {
  headers: {
    'Authorization': 'Bearer YOUR_ACCESS_TOKEN',
    'Accept': 'application/json'
  }
})
.then(r => r.json())
.then(console.log)
// Should return your Intercom app details
```

**Check 2: Rate Limits**

Intercom has rate limits:
- Free/Starter: 100 requests/minute
- Pro: 500 requests/minute
- Enterprise: Custom

Check response headers for rate limit info.

## Additional Resources

- **Intercom API Docs**: https://developers.intercom.com/docs
- **Messenger JS SDK**: https://developers.intercom.com/installing-intercom/web/installation
- **Webhook Events**: https://developers.intercom.com/docs/references/webhooks
- **Rate Limits**: https://developers.intercom.com/docs/build-an-integration/learn-more/rate-limits

## Support

For issues or questions:
- Check backend logs: `az containerapp logs show --name greenchainz-container`
- Check GitHub Actions logs for deployment issues
- Review Intercom Developer Hub → Your App → Logs
- Contact: admin@greenchainz.com
