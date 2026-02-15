# Microsoft SaaS Accelerator - Partner Center Configuration Guide

This document provides step-by-step instructions for configuring GreenChainz in Microsoft Partner Center to enable Azure Marketplace transactions.

---

## Prerequisites

Before you begin, ensure you have:

1. **Microsoft Partner Center account** with Commercial Marketplace access
2. **Azure AD tenant** with admin privileges
3. **GreenChainz production domain** (e.g., `greenchainz.com` or `greenchainz.manus.space`)
4. **Azure AD application** registered for marketplace authentication

---

## Part 1: Azure AD Application Setup

### Step 1: Register Azure AD Application

1. Go to [Azure Portal](https://portal.azure.com) → **Azure Active Directory** → **App registrations**
2. Click **New registration**
3. Configure:
   - **Name**: `GreenChainz Marketplace Integration`
   - **Supported account types**: `Accounts in any organizational directory (Any Azure AD directory - Multitenant)`
   - **Redirect URI**: Leave blank for now
4. Click **Register**

### Step 2: Create Client Secret

1. In your app registration, go to **Certificates & secrets**
2. Click **New client secret**
3. Configure:
   - **Description**: `GreenChainz Production Secret`
   - **Expires**: `24 months` (recommended)
4. Click **Add**
5. **IMPORTANT**: Copy the secret value immediately (you won't be able to see it again)

### Step 3: Configure API Permissions

1. Go to **API permissions**
2. Click **Add a permission** → **APIs my organization uses**
3. Search for `Microsoft Marketplace` or use Application ID: `20e940b3-4c77-4b0b-9a53-9e16a1b010a7`
4. Select **Delegated permissions**:
   - `user_impersonation`
5. Click **Add permissions**
6. Click **Grant admin consent** (requires admin privileges)

### Step 4: Note Your Credentials

You'll need these values for environment variables:

```bash
AZURE_AD_TENANT_ID=<your-tenant-id>          # Found in Azure AD Overview
AZURE_AD_CLIENT_ID=<your-app-client-id>      # Found in App Registration Overview
AZURE_AD_CLIENT_SECRET=<your-client-secret>  # Created in Step 2
```

---

## Part 2: Partner Center Offer Configuration

### Step 1: Create SaaS Offer

1. Go to [Partner Center](https://partner.microsoft.com/dashboard/commercial-marketplace/overview)
2. Navigate to **Commercial Marketplace** → **Overview**
3. Click **New offer** → **Software as a Service**
4. Configure:
   - **Offer ID**: `greenchainz` (must be unique in your publisher namespace)
   - **Offer alias**: `GreenChainz B2B Marketplace`
5. Click **Create**

### Step 2: Configure Offer Setup

1. Go to **Offer setup** tab
2. Configure **Sell through Microsoft**:
   - ✅ **Yes, I would like to sell through Microsoft and have Microsoft host transactions on my behalf**
3. Configure **Microsoft 365 integration**: Leave unchecked
4. Configure **Customer leads**:
   - Select your CRM system (e.g., Azure Table, Dynamics 365, Salesforce)
   - Or use **HTTPS Endpoint** to send leads to your webhook
5. Click **Save draft**

### Step 3: Configure Properties

1. Go to **Properties** tab
2. Configure:
   - **Category**: `Business Applications` → `Project Management`
   - **Industries**: `Architecture & Engineering`, `Construction`
   - **Legal terms**: Use **Standard Contract** or upload custom terms
3. Click **Save draft**

### Step 4: Configure Offer Listing

1. Go to **Offer listing** tab
2. Configure:
   - **Name**: `GreenChainz - Verified Sustainable Material Sourcing`
   - **Search results summary**: `AI-powered B2B marketplace connecting architects with verified sustainable building materials. CCPS scoring, EPD data, and RFQ management in one platform.`
   - **Description**: (Use the marketing copy from your landing page)
   - **Getting started instructions**: `Sign in with your Microsoft account to activate your subscription. You'll be redirected to the GreenChainz dashboard to complete setup.`
   - **Privacy policy link**: `https://greenchainz.com/privacy`
   - **Support link**: `https://greenchainz.com/support`
   - **Engineering contact**: `jerit@greenchainz.com`
   - **Support contact**: `support@greenchainz.com`
3. Upload **Marketing artifacts**:
   - **Logo (216x216)**: GreenChainz logo PNG
   - **Screenshots (1280x720)**: Dashboard, Materials Catalog, RFQ System, CCPS Scoring
   - **Videos** (optional): Product demo, customer testimonials
4. Click **Save draft**

### Step 5: Configure Technical Configuration

**This is the most critical section for SaaS Accelerator integration.**

1. Go to **Technical configuration** tab
2. Configure **Landing page URL**:
   ```
   https://greenchainz.com/api/marketplace/landing
   ```
   - This is where Microsoft redirects customers after purchase
   - Must be HTTPS
   - Must return 200 OK within 10 seconds

3. Configure **Connection webhook**:
   ```
   https://greenchainz.com/api/marketplace/webhook
   ```
   - This is where Microsoft sends subscription lifecycle events
   - Must be HTTPS
   - Must return 200 OK within 10 seconds

4. Configure **Azure Active Directory tenant ID**:
   ```
   <your-tenant-id>
   ```
   - Use the tenant ID from Part 1, Step 4

5. Configure **Azure Active Directory application ID**:
   ```
   <your-app-client-id>
   ```
   - Use the client ID from Part 1, Step 4

6. Click **Save draft**

### Step 6: Configure Plans & Pricing

**Plan 1: Standard**

1. Go to **Plan overview** → **Create new plan**
2. Configure:
   - **Plan ID**: `greenchainz-standard`
   - **Plan name**: `Standard`
3. Go to **Plan listing**:
   - **Plan description**: `Full access to materials catalog, CCPS scoring, and limited RFQ submissions. Perfect for individual architects and small firms.`
4. Go to **Pricing and availability**:
   - **Markets**: Select all markets (or specific regions)
   - **Pricing model**: `Flat rate + metered billing`
   - **Billing term**: `Monthly` and `Annual`
   - **Monthly price**: `$99.00 USD`
   - **Annual price**: `$999.00 USD` (save $189/year)
5. Configure **Metered dimensions**:
   
   | Dimension ID | Display Name | Unit of Measure | Price per Unit |
   |---|---|---|---|
   | `rfq_submissions` | RFQ Submissions | Per RFQ | $15.00 |
   | `ai_queries` | AI Material Analysis | Per Query | $0.50 |
   | `swap_analyses` | Material Swap Analysis | Per Analysis | $2.00 |
   | `ccps_exports` | CCPS Report Exports | Per Export | $3.00 |
   | `material_comparisons` | Material Comparisons | Per Comparison | $0.00 |

6. Configure **Included quantities** (monthly):
   - `rfq_submissions`: 5
   - `ai_queries`: 25
   - `swap_analyses`: 20
   - `ccps_exports`: 10
   - `material_comparisons`: 50

7. Click **Save draft**

**Plan 2: Premium**

1. Create new plan with:
   - **Plan ID**: `greenchainz-premium`
   - **Plan name**: `Premium`
2. Configure:
   - **Plan description**: `Unlimited access to all features including RFQs, AI queries, swap analyses, and exports. Perfect for procurement teams and general contractors.`
   - **Monthly price**: `$299.00 USD`
   - **Annual price**: `$2,999.00 USD` (save $589/year)
3. Configure **Metered dimensions**: Same as Standard, but with **unlimited included quantities**
   - Set all included quantities to `999999` (effectively unlimited)
4. Click **Save draft**

### Step 7: Configure Free Trial (Optional)

1. In each plan, enable **Free trial**:
   - **Trial duration**: `30 days`
   - **Trial type**: `Full access` (customer gets all plan features during trial)
2. Click **Save draft**

### Step 8: Review & Publish

1. Go to **Review and publish** tab
2. Review all sections for completeness
3. Click **Publish**
4. Microsoft will review your offer (typically 1-3 business days)
5. Once approved, your offer will be live on Azure Marketplace

---

## Part 3: Environment Variables

Add these environment variables to your production deployment:

```bash
# Azure AD Configuration
AZURE_AD_TENANT_ID=<your-tenant-id>
AZURE_AD_CLIENT_ID=<your-app-client-id>
AZURE_AD_CLIENT_SECRET=<your-client-secret>

# Frontend URL (for redirects after subscription activation)
FRONTEND_URL=https://greenchainz.com
```

**How to add in Manus:**

1. Go to your project in Manus
2. Click **Settings** → **Secrets**
3. Add each environment variable
4. Redeploy your application

---

## Part 4: Testing the Integration

### Test Landing Page

1. Go to your offer in Partner Center
2. Copy the **Preview link** (available after publishing to preview)
3. Click the link to simulate a customer purchase
4. Verify:
   - ✅ You're redirected to `https://greenchainz.com/api/marketplace/landing?token=...`
   - ✅ The page resolves the token and creates a subscription
   - ✅ You're redirected to the dashboard with `?welcome=true`
   - ✅ Subscription appears in database with `msSubscriptionId` and `msPlanId`

### Test Webhook

1. In Partner Center, go to **Technical configuration**
2. Click **Test webhook**
3. Select event type (e.g., `Subscribed`, `Unsubscribed`)
4. Click **Send**
5. Verify:
   - ✅ Webhook endpoint returns 200 OK
   - ✅ Event is processed correctly (check logs)
   - ✅ Subscription status is updated in database

### Test Metering API

1. Trigger a usage event (e.g., submit an RFQ)
2. Check logs for metering API call
3. Verify:
   - ✅ Usage is tracked in `usage_tracking` table
   - ✅ Usage is reported to Microsoft Metering API
   - ✅ API returns `status: "Accepted"`
4. Check Azure Portal → **Cost Management + Billing** to verify usage appears

---

## Part 5: Go-Live Checklist

Before publishing to production:

- [ ] Azure AD application registered and configured
- [ ] Client secret created and stored securely
- [ ] API permissions granted and admin consent given
- [ ] Partner Center offer created with all required fields
- [ ] Landing page URL configured and tested
- [ ] Webhook URL configured and tested
- [ ] Plans and pricing configured (Standard $99/mo, Premium $299/mo)
- [ ] Metered dimensions configured with correct pricing
- [ ] Free trial enabled (optional)
- [ ] Environment variables added to production deployment
- [ ] Landing page tested with preview link
- [ ] Webhook tested with Partner Center test tool
- [ ] Metering API tested with real usage events
- [ ] Legal terms and privacy policy published
- [ ] Support contact information verified
- [ ] Marketing materials uploaded (logo, screenshots, videos)
- [ ] Offer submitted for Microsoft review
- [ ] Offer approved and published to Azure Marketplace

---

## Troubleshooting

### Landing Page Issues

**Problem**: `Invalid marketplace token` error

**Solution**:
- Verify `AZURE_AD_TENANT_ID` and `AZURE_AD_CLIENT_ID` are correct
- Check that Azure AD application has correct API permissions
- Ensure admin consent was granted for API permissions

**Problem**: `Failed to resolve subscription` error

**Solution**:
- Verify the marketplace token is being sent correctly in the URL
- Check that your Azure AD application has access to Microsoft Marketplace API
- Review logs for specific API error messages

### Webhook Issues

**Problem**: Webhook not receiving events

**Solution**:
- Verify webhook URL is publicly accessible (HTTPS)
- Check that webhook returns 200 OK within 10 seconds
- Review Partner Center webhook test results for error details

**Problem**: `User not found for subscription` error

**Solution**:
- Ensure landing page creates subscription with correct `msSubscriptionId`
- Verify `buyer_subscriptions` table has correct data
- Check that user lookup logic matches your authentication system

### Metering API Issues

**Problem**: `InvalidDimension` error

**Solution**:
- Verify dimension IDs in code match Partner Center configuration exactly
- Check that dimension is enabled for the customer's plan
- Ensure dimension ID is lowercase with underscores (e.g., `rfq_submissions`)

**Problem**: `Duplicate` error

**Solution**:
- Microsoft rejects duplicate usage events (same resourceId, dimension, effectiveStartTime)
- Ensure you're not reporting the same usage twice
- Add deduplication logic to track reported events

**Problem**: `ResourceNotAuthorized` error

**Solution**:
- Verify `msSubscriptionId` is correct and active
- Check that subscription is in `active` status (not `suspended` or `canceled`)
- Ensure Azure AD credentials have correct permissions

---

## Support

For issues with Microsoft Partner Center or Azure Marketplace:
- [Partner Center Support](https://partner.microsoft.com/support)
- [Azure Marketplace Documentation](https://learn.microsoft.com/en-us/azure/marketplace/)
- [SaaS Fulfillment API Reference](https://learn.microsoft.com/en-us/azure/marketplace/partner-center-portal/pc-saas-fulfillment-api-v2)

For issues with GreenChainz integration:
- Email: jerit@greenchainz.com
- Check server logs in `/home/ubuntu/green-sourcing-b2b-app/.manus-logs/`
