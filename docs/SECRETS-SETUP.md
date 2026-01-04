# GreenChainz Secrets Setup Guide

> **Quick reference for secrets configuration and Azure Key Vault integration**

This document provides a complete inventory of all secrets used by GreenChainz, their Azure Key Vault names, and setup instructions.

---

## Table of Contents

1. [Quick Reference](#quick-reference)
2. [Core Authentication Secrets](#core-authentication-secrets)
3. [Payment Secrets (Stripe)](#payment-secrets-stripe)
4. [OAuth Provider Secrets](#oauth-provider-secrets)
5. [Azure Services Secrets](#azure-services-secrets)
6. [External Integration Secrets](#external-integration-secrets)
7. [Azure Key Vault Setup](#azure-key-vault-setup)
8. [Environment-Specific Configuration](#environment-specific-configuration)

---

## Quick Reference

### Azure Key Vault Secret Names

| Environment Variable | Key Vault Secret Name | Required | Description |
|---------------------|----------------------|----------|-------------|
| `JWT_SECRET` | `jwt-secret` | ✅ Yes | JWT signing key |
| `SESSION_SECRET` | `session-secret` | ✅ Yes | Express session key |
| `COOKIE_SECRET` | `cookie-secret` | ✅ Yes | Cookie encryption key |
| `DB_PASSWORD` | `postgres-password` | ✅ Yes | PostgreSQL password |
| `STRIPE_SECRET_KEY` | `stripe-secret-key` | ✅ Yes | Stripe API key |
| `STRIPE_WEBHOOK_SECRET` | `stripe-webhook-secret` | If using webhooks | Stripe webhook signing |
| `REDIS_PASSWORD` | `redis-password` | If using Redis | Azure Redis access key |
| `AZURE_CLIENT_SECRET` | `azure-client-secret` | If using Azure AD | Azure AD app secret |
| `LINKEDIN_CLIENT_SECRET` | `linkedin-client-secret` | If using LinkedIn | LinkedIn OAuth secret |
| `AZURE_AI_FOUNDRY_KEY` | `ai-foundry-key` | If using AI Foundry | Azure AI Foundry API key |
| `AZURE_DOCUMENT_INTELLIGENCE_KEY` | `document-intel-key` | If using Doc AI | Azure AI key |
| `AZURE_OPENAI_KEY` | `openai-key` | If using OpenAI | Azure OpenAI API key |
| `SMTP_PASS` | `smtp-password` | If sending emails | SMTP password |
| `INTERCOM_ACCESS_TOKEN` | `intercom-token` | If using Intercom | Intercom API token |
| `INTERNAL_API_KEY` | `internal-api-key` | Optional | Internal API protection |

---

## Core Authentication Secrets

These secrets are **required in production** and the application will refuse to start without them.

### JWT_SECRET
- **Purpose:** Signs and verifies JWT authentication tokens
- **Key Vault Name:** `jwt-secret`
- **Minimum Length:** 32 characters
- **Generate:**
  ```bash
  openssl rand -base64 48
  ```
- **Impact of Rotation:** All users will be logged out and need to re-authenticate

### SESSION_SECRET
- **Purpose:** Signs Express session cookies
- **Key Vault Name:** `session-secret`
- **Minimum Length:** 32 characters
- **Generate:**
  ```bash
  openssl rand -base64 48
  ```
- **Impact of Rotation:** All sessions invalidated

### COOKIE_SECRET
- **Purpose:** Encrypts secure cookies
- **Key Vault Name:** `cookie-secret`
- **Minimum Length:** 32 characters
- **Generate:**
  ```bash
  openssl rand -base64 48
  ```

### DB_PASSWORD
- **Purpose:** PostgreSQL database authentication
- **Key Vault Name:** `postgres-password`
- **Minimum Length:** 12 characters
- **Notes:** Use a dedicated application user, not the admin account

---

## Payment Secrets (Stripe)

### STRIPE_SECRET_KEY
- **Purpose:** Stripe API authentication for server-side operations
- **Key Vault Name:** `stripe-secret-key`
- **Minimum Length:** 20 characters
- **Required:** Yes (in production)
- **Format:** `sk_live_...` (production) or `sk_test_...` (testing)
- **Get from:** [Stripe Dashboard → Developers → API Keys](https://dashboard.stripe.com/apikeys)

### STRIPE_WEBHOOK_SECRET
- **Purpose:** Verifies Stripe webhook signatures
- **Key Vault Name:** `stripe-webhook-secret`
- **Required:** When using Stripe webhooks
- **Format:** `whsec_...`
- **Get from:** [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks)

### STRIPE_PUBLISHABLE_KEY
- **Purpose:** Client-side Stripe.js initialization
- **Classification:** 🟢 PUBLIC (safe to expose)
- **Format:** `pk_live_...` or `pk_test_...`
- **Note:** This is NOT a secret and can be committed to code

### STRIPE_RFQ_DEPOSIT_AMOUNT_CENTS
- **Purpose:** Default deposit amount for RFQ submissions
- **Classification:** 🟢 PUBLIC
- **Default:** `2500` (= $25.00)
- **Note:** Configure based on business requirements

---

## OAuth Provider Secrets

### LinkedIn OAuth (Verification Feature)

Required when `FEATURE_LINKEDIN_VERIFICATION=true`

| Variable | Key Vault Name | Description |
|----------|---------------|-------------|
| `LINKEDIN_CLIENT_ID` | N/A (not secret) | LinkedIn app ID |
| `LINKEDIN_CLIENT_SECRET` | `linkedin-client-secret` | LinkedIn app secret |
| `LINKEDIN_REDIRECT_URI` | N/A (server config) | OAuth callback URL |

**Setup:**
1. Go to [LinkedIn Developers](https://www.linkedin.com/developers/)
2. Create an application
3. Add redirect URI: `https://api.greenchainz.com/auth/linkedin/callback`
4. Request OAuth 2.0 scopes: `r_liteprofile`, `r_emailaddress`
5. Copy Client ID and Client Secret

### Other OAuth Providers

| Provider | Client ID Var | Secret Var | Key Vault Name |
|----------|--------------|------------|----------------|
| Google | `GOOGLE_CLIENT_ID` | `GOOGLE_CLIENT_SECRET` | `google-client-secret` |
| GitHub | `GITHUB_CLIENT_ID` | `GITHUB_CLIENT_SECRET` | `github-client-secret` |
| Microsoft | `MICROSOFT_CLIENT_ID` | `MICROSOFT_CLIENT_SECRET` | `microsoft-client-secret` |
| Facebook | `FACEBOOK_APP_ID` | `FACEBOOK_APP_SECRET` | `facebook-app-secret` |

---

## Azure Services Secrets

### Azure AD Authentication

| Variable | Key Vault Name | Description |
|----------|---------------|-------------|
| `AZURE_TENANT_ID` | N/A (server config) | Azure AD tenant |
| `AZURE_CLIENT_ID` | N/A (server config) | Application ID |
| `AZURE_CLIENT_SECRET` | `azure-client-secret` | Application secret |

### Azure AI Foundry

For custom AI models and the model catalog:

| Variable | Key Vault Name | Description |
|----------|---------------|-------------|
| `AZURE_AI_FOUNDRY_ENDPOINT` | N/A (server config) | AI Foundry endpoint URL |
| `AZURE_AI_FOUNDRY_KEY` | `ai-foundry-key` | API authentication key |

**Endpoint Format:** `https://<your-resource>.cognitiveservices.azure.com/`

### Azure Document Intelligence

| Variable | Key Vault Name | Description |
|----------|---------------|-------------|
| `AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT` | N/A | Service endpoint |
| `AZURE_DOCUMENT_INTELLIGENCE_KEY` | `document-intel-key` | API key |

### Azure OpenAI

| Variable | Key Vault Name | Description |
|----------|---------------|-------------|
| `AZURE_OPENAI_ENDPOINT` | N/A | OpenAI endpoint |
| `AZURE_OPENAI_KEY` | `openai-key` | API key |
| `AZURE_OPENAI_API_VERSION` | N/A | API version |
| `AZURE_OPENAI_DEPLOYMENT_NAME` | N/A | Model deployment name |

### Azure Redis Cache

| Variable | Key Vault Name | Description |
|----------|---------------|-------------|
| `REDIS_HOST` | N/A (server config) | Redis hostname |
| `REDIS_PASSWORD` | `redis-password` | Access key |
| `REDIS_PORT` | N/A | Port (default: 6380) |
| `REDIS_SSL` | N/A | TLS enabled (default: true) |

---

## External Integration Secrets

### Autodesk Forge/APS

| Variable | Key Vault Name | Description |
|----------|---------------|-------------|
| `AUTODESK_CLIENT_ID` | N/A | Forge app ID |
| `AUTODESK_CLIENT_SECRET` | `autodesk-secret` | Forge app secret |

### FSC Certificate Database

| Variable | Key Vault Name | Description |
|----------|---------------|-------------|
| `FSC_API_KEY` | `fsc-api-key` | API authentication |
| `FSC_API_URL` | N/A | API endpoint |

### Intercom

| Variable | Key Vault Name | Description |
|----------|---------------|-------------|
| `INTERCOM_ACCESS_TOKEN` | `intercom-token` | API access token |

### Supabase (if using)

| Variable | Key Vault Name | Description |
|----------|---------------|-------------|
| `SUPABASE_URL` | N/A | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | `supabase-service-key` | Service role key |

---

## Azure Key Vault Setup

### Step 1: Create Key Vault

```bash
# Create resource group (if needed)
az group create --name rg-greenchainz --location eastus

# Create Key Vault
az keyvault create \
  --name greenchainz-vault \
  --resource-group rg-greenchainz \
  --location eastus
```

### Step 2: Store Required Secrets

```bash
VAULT_NAME="greenchainz-vault"

# Generate and store authentication secrets
az keyvault secret set --vault-name $VAULT_NAME --name jwt-secret --value "$(openssl rand -base64 48)"
az keyvault secret set --vault-name $VAULT_NAME --name session-secret --value "$(openssl rand -base64 48)"
az keyvault secret set --vault-name $VAULT_NAME --name cookie-secret --value "$(openssl rand -base64 48)"

# Store database password
az keyvault secret set --vault-name $VAULT_NAME --name postgres-password --value "YOUR_DB_PASSWORD"

# Store Stripe keys
az keyvault secret set --vault-name $VAULT_NAME --name stripe-secret-key --value "sk_live_..."
az keyvault secret set --vault-name $VAULT_NAME --name stripe-webhook-secret --value "whsec_..."

# Store LinkedIn OAuth (if using)
az keyvault secret set --vault-name $VAULT_NAME --name linkedin-client-secret --value "YOUR_LINKEDIN_SECRET"

# Store AI Foundry key (if using)
az keyvault secret set --vault-name $VAULT_NAME --name ai-foundry-key --value "YOUR_AI_FOUNDRY_KEY"
```

### Step 3: Grant Container App Access

```bash
# Enable managed identity on Container App
az containerapp identity assign \
  --name greenchainz-backend \
  --resource-group rg-greenchainz \
  --system-assigned

# Get the principal ID
PRINCIPAL_ID=$(az containerapp identity show \
  --name greenchainz-backend \
  --resource-group rg-greenchainz \
  --query principalId -o tsv)

# Grant Key Vault access
az keyvault set-policy \
  --name greenchainz-vault \
  --object-id $PRINCIPAL_ID \
  --secret-permissions get list
```

### Step 4: Reference Secrets in Container App

In Azure Portal → Container App → Secrets, add Key Vault references:

| Secret Name | Source | Key Vault Secret URI |
|------------|--------|---------------------|
| `jwt-secret` | Key Vault | `https://greenchainz-vault.vault.azure.net/secrets/jwt-secret` |
| `stripe-secret-key` | Key Vault | `https://greenchainz-vault.vault.azure.net/secrets/stripe-secret-key` |
| ... | ... | ... |

Then in Environment Variables:

| Variable | Value |
|----------|-------|
| `JWT_SECRET` | `secretref:jwt-secret` |
| `STRIPE_SECRET_KEY` | `secretref:stripe-secret-key` |

---

## Environment-Specific Configuration

### Development (.env)

```env
# Use test keys and simple passwords
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_test_...
STRIPE_RFQ_DEPOSIT_AMOUNT_CENTS=2500

# LinkedIn (optional for dev)
FEATURE_LINKEDIN_VERIFICATION=false

# Local dev secrets (OK for development only)
JWT_SECRET=dev-jwt-secret-min-32-chars-replace-in-prod
```

### Production (Key Vault + Container App)

All secrets stored in Azure Key Vault and referenced via managed identity.

```yaml
# Container App environment variables
NODE_ENV: production
STRIPE_RFQ_DEPOSIT_AMOUNT_CENTS: "2500"
FEATURE_LINKEDIN_VERIFICATION: "true"
LINKEDIN_REDIRECT_URI: https://api.greenchainz.com/auth/linkedin/callback
AZURE_AI_FOUNDRY_ENDPOINT: https://greenchainz-ai.cognitiveservices.azure.com/
```

---

## Validation

The application validates all required secrets at startup:

```javascript
// backend/config/validateEnv.js handles:
// - Required secrets presence
// - Minimum length validation
// - Placeholder detection (blocks insecure defaults)
// - Conditional requirements (e.g., LinkedIn when feature enabled)
```

Production will refuse to start if:
- Required secrets are missing
- Secrets are too short
- Placeholder values detected (e.g., "your-secret-here")

---

## Related Documentation

- [Azure Secrets & Configuration](./AZURE_SECRETS_AND_CONFIG.md) - Detailed Azure setup
- [OAuth Setup](./OAUTH_SETUP.md) - OAuth provider configuration
- [Deployment Checklist](./deployment-checklist.md) - Pre-deployment verification
