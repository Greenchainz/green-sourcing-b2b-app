# Azure Secrets & Configuration Guide

> **Enterprise-grade secrets management for GreenChainz Azure deployment**

This document provides a complete inventory of all environment variables, their classification, and step-by-step instructions for configuring them securely in Azure.

---

## Table of Contents

1. [Quick Start Checklist](#quick-start-checklist)
2. [Environment Variable Classification](#environment-variable-classification)
3. [Azure Key Vault Setup](#azure-key-vault-setup)
4. [Container Apps Configuration](#container-apps-configuration)
5. [Required Actions Outside Cursor](#required-actions-outside-cursor)
6. [Secret Rotation Guide](#secret-rotation-guide)
7. [Troubleshooting](#troubleshooting)

---

## Quick Start Checklist

Before deploying to production, complete these steps **outside of Cursor**:

### ✅ Azure Portal Actions Required

- [ ] **Create Azure Key Vault** (if not exists)
  - Name: `greenchainz-vault` (or your preferred name)
  - Region: Same as your Container Apps
  - SKU: Standard
  
- [ ] **Store all secrets in Key Vault** (see [Secrets Inventory](#1-secrets-high-priority) below)

- [ ] **Enable Managed Identity** on Container Apps
  - Go to Container App → Identity → System assigned → ON
  
- [ ] **Grant Key Vault Access** to Managed Identity
  - Key Vault → Access policies → Add → Select your Container App identity
  - Permissions: Secret → Get, List

- [ ] **Configure Azure AD App Registration**
  - Register app for authentication
  - Set redirect URIs for production domain
  - Create client secret and store in Key Vault

- [ ] **Set up Azure Database for PostgreSQL**
  - Enable SSL enforcement
  - Configure firewall rules
  - Create application database user (not admin)

- [ ] **Set up Azure Cache for Redis**
  - Enable TLS
  - Copy access keys to Key Vault

- [ ] **Verify SSL certificates** are properly configured

---

## Environment Variable Classification

### Classification Legend

| Type | Description | Storage Location |
|------|-------------|------------------|
| 🔴 **SECRET** | Cryptographic keys, passwords, API keys. **NEVER commit to git.** | Azure Key Vault |
| 🟡 **SERVER** | Server configuration, URLs, identifiers. Non-sensitive but environment-specific. | Container App Environment Variables |
| 🟢 **PUBLIC** | Feature flags, pool sizes, logging. Safe to commit. | Container App or `.env` |

---

### 1. SECRETS (High Priority) 🔴

These **MUST** be stored in Azure Key Vault. Production will **refuse to start** if these are missing or set to placeholder values.

| Variable | Key Vault Secret Name | Description | Min Length |
|----------|----------------------|-------------|------------|
| `JWT_SECRET` | `jwt-secret` | JWT signing key for auth tokens | 32 chars |
| `SESSION_SECRET` | `session-secret` | Express session signing | 32 chars |
| `COOKIE_SECRET` | `cookie-secret` | Cookie encryption key | 32 chars |
| `DB_PASSWORD` | `postgres-password` | PostgreSQL password | 12 chars |
| `REDIS_PASSWORD` | `redis-password` | Azure Redis access key | 10 chars |
| `AZURE_CLIENT_SECRET` | `azure-client-secret` | Azure AD app secret | 10 chars |
| `AZURE_DOCUMENT_INTELLIGENCE_KEY` | `document-intel-key` | Azure AI key | 10 chars |

#### Optional Secrets (if using these services)

| Variable | Key Vault Secret Name | Description |
|----------|----------------------|-------------|
| `AZURE_STORAGE_CONNECTION_STRING` | `storage-connection-string` | Blob storage (contains keys) |
| `AZURE_REDIS_CONNECTION_STRING` | `redis-connection-string` | Redis URL with password |
| `APPLICATIONINSIGHTS_CONNECTION_STRING` | `appinsights-connection-string` | App Insights (contains key) |
| `SMTP_PASS` | `smtp-password` | Email service password |
| `STRIPE_SECRET_KEY` | `stripe-secret-key` | Stripe API key |
| `STRIPE_WEBHOOK_SECRET` | `stripe-webhook-secret` | Stripe webhook signing |
| `AZURE_OPENAI_KEY` | `openai-key` | Azure OpenAI API key |
| `INTERNAL_API_KEY` | `internal-api-key` | Internal service auth |
| `AUTODESK_CLIENT_SECRET` | `autodesk-secret` | Autodesk API secret |
| `FSC_API_KEY` | `fsc-api-key` | FSC database API key |

#### OAuth Provider Secrets (if using social login)

| Variable | Key Vault Secret Name |
|----------|----------------------|
| `GOOGLE_CLIENT_SECRET` | `google-client-secret` |
| `FACEBOOK_APP_SECRET` | `facebook-app-secret` |
| `LINKEDIN_CLIENT_SECRET` | `linkedin-client-secret` |
| `GITHUB_CLIENT_SECRET` | `github-client-secret` |
| `MICROSOFT_CLIENT_SECRET` | `microsoft-client-secret` |

---

### 2. SERVER Configuration 🟡

Set these as Container App environment variables. Not secrets, but environment-specific.

| Variable | Example Value | Description | Required |
|----------|---------------|-------------|----------|
| `NODE_ENV` | `production` | Environment mode | ✅ Yes |
| `PORT` | `3001` | Server port | ✅ Yes |
| `FRONTEND_URL` | `https://greenchainz.com` | Frontend URL for CORS | ✅ Yes |
| `BACKEND_URL` | `https://api.greenchainz.com` | Backend self-reference | ✅ Yes |
| `POSTGRES_HOST` | `greenchainz.postgres.database.azure.com` | Database host | ✅ Yes |
| `POSTGRES_PORT` | `5432` | Database port | No (default: 5432) |
| `DB_USER` | `greenchainz_app` | Database username | ✅ Yes |
| `DB_NAME` | `greenchainz_prod` | Database name | ✅ Yes |
| `POSTGRES_SSL` | `true` | Enable SSL (always true for Azure) | ✅ Yes |
| `REDIS_HOST` | `greenchainz.redis.cache.windows.net` | Redis host | ✅ Yes (if using sessions) |
| `REDIS_PORT` | `6380` | Redis port | No (default: 6380) |
| `REDIS_SSL` | `true` | Enable TLS | No (default: true in prod) |
| `COOKIE_DOMAIN` | `.greenchainz.com` | Cookie domain scope | Recommended |
| `AZURE_TENANT_ID` | `greenchainz2025.onmicrosoft.com` | Azure AD tenant | ✅ Yes |
| `AZURE_CLIENT_ID` | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` | Azure AD app ID | ✅ Yes |
| `AZURE_KEY_VAULT_URL` | `https://greenchainz-vault.vault.azure.net/` | Key Vault URL | ✅ Yes |
| `AZURE_USE_MANAGED_IDENTITY` | `true` | Use managed identity | ✅ Yes |
| `AZURE_STORAGE_ACCOUNT_NAME` | `greenchainzstorage` | Storage account | If using blob storage |
| `AZURE_STORAGE_CONTAINER_NAME` | `greenchainz-uploads` | Storage container | If using blob storage |
| `AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT` | `https://greenchainz-ai.cognitiveservices.azure.com/` | AI endpoint | If using doc AI |
| `AZURE_OPENAI_ENDPOINT` | `https://your-resource.openai.azure.com/` | OpenAI endpoint | If using OpenAI |
| `AZURE_OPENAI_API_VERSION` | `2024-10-21` | OpenAI API version | If using OpenAI |
| `AZURE_OPENAI_DEPLOYMENT_NAME` | `gpt-4o` | OpenAI model deployment | If using OpenAI |
| `SMTP_HOST` | `smtp.zoho.com` | Email SMTP host | If sending emails |
| `SMTP_PORT` | `465` | Email SMTP port | If sending emails |
| `SMTP_USER` | `noreply@greenchainz.com` | Email username | If sending emails |
| `SMTP_FROM_EMAIL` | `noreply@greenchainz.com` | Sender email | If sending emails |
| `SMTP_FROM_NAME` | `GreenChainz` | Sender display name | If sending emails |
| `ADMIN_EMAIL` | `admin@greenchainz.com` | Admin alerts recipient | Recommended |

---

### 3. PUBLIC Configuration 🟢

Safe to include in configuration files. These are feature flags and tuning parameters.

| Variable | Default | Description |
|----------|---------|-------------|
| `NOTIFICATIONS_ENABLED` | `false` | Enable email notifications |
| `FEATURE_AZURE_MONITORING` | `false` | Enable App Insights |
| `FEATURE_REDIS_CACHING` | `false` | Enable Redis caching layer |
| `FEATURE_AI_DOCUMENT_ANALYSIS` | `false` | Enable document AI |
| `LOG_LEVEL` | `info` | Logging verbosity |
| `DEBUG` | `` | Debug namespaces |
| `PGPOOL_MAX` | `20` | Max database connections |
| `PGPOOL_MIN` | `2` | Min database connections |
| `PGPOOL_IDLE` | `30000` | Idle timeout (ms) |
| `PGPOOL_CONNECTION_TIMEOUT` | `5000` | Connection timeout (ms) |
| `PGPOOL_STATEMENT_TIMEOUT` | `30000` | Query timeout (ms) |
| `STRIPE_PUBLISHABLE_KEY` | `` | Stripe public key (safe to expose) |

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
  --location eastus \
  --enable-rbac-authorization false
```

### Step 2: Add Secrets

```bash
# Generate secure secrets
JWT_SECRET=$(openssl rand -base64 48)
SESSION_SECRET=$(openssl rand -base64 48)
COOKIE_SECRET=$(openssl rand -base64 48)

# Store in Key Vault
az keyvault secret set --vault-name greenchainz-vault --name jwt-secret --value "$JWT_SECRET"
az keyvault secret set --vault-name greenchainz-vault --name session-secret --value "$SESSION_SECRET"
az keyvault secret set --vault-name greenchainz-vault --name cookie-secret --value "$COOKIE_SECRET"

# Store database password
az keyvault secret set --vault-name greenchainz-vault --name postgres-password --value "YOUR_SECURE_PASSWORD"

# Store Redis key (get from Azure Portal)
az keyvault secret set --vault-name greenchainz-vault --name redis-password --value "YOUR_REDIS_KEY"

# Store Azure AD client secret
az keyvault secret set --vault-name greenchainz-vault --name azure-client-secret --value "YOUR_CLIENT_SECRET"
```

### Step 3: Grant Access to Container App

```bash
# Get Container App's managed identity principal ID
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

---

## Container Apps Configuration

### Environment Variables Setup

In Azure Portal → Container App → Configuration → Environment Variables:

```yaml
# Required for all deployments
NODE_ENV: production
PORT: 3001
FRONTEND_URL: https://greenchainz.com
BACKEND_URL: https://api.greenchainz.com

# Database (password from Key Vault)
POSTGRES_HOST: greenchainz.postgres.database.azure.com
DB_USER: greenchainz_app
DB_NAME: greenchainz_prod
POSTGRES_SSL: true

# Redis
REDIS_HOST: greenchainz.redis.cache.windows.net
REDIS_PORT: 6380
REDIS_SSL: true

# Azure AD
AZURE_TENANT_ID: greenchainz2025.onmicrosoft.com
AZURE_CLIENT_ID: your-client-id

# Key Vault Integration
AZURE_KEY_VAULT_URL: https://greenchainz-vault.vault.azure.net/
AZURE_USE_MANAGED_IDENTITY: true

# Feature Flags
FEATURE_AZURE_MONITORING: true
FEATURE_REDIS_CACHING: true
NOTIFICATIONS_ENABLED: true
```

### Referencing Key Vault Secrets

For secrets, use Key Vault references in Container Apps:

```yaml
# In Container App configuration
- name: JWT_SECRET
  secretRef: jwt-secret

# Where jwt-secret is defined in secrets section as:
# secretRef: keyvault-jwt-secret
# keyVaultUrl: https://greenchainz-vault.vault.azure.net/secrets/jwt-secret
```

---

## Required Actions Outside Cursor

### Pre-Deployment Checklist

These actions **cannot** be done in code and must be performed in Azure Portal or CLI:

#### 1. Azure AD Configuration

```
Azure Portal → Azure Active Directory → App Registrations

□ Create new registration: "GreenChainz Production"
□ Set Redirect URIs:
  - https://greenchainz.com/login/callback
  - https://api.greenchainz.com/api/v1/auth/azure-callback
□ Create client secret (copy immediately, won't be shown again)
□ Note the Application (client) ID
□ Note the Directory (tenant) ID
```

#### 2. Database Setup

```
Azure Portal → Azure Database for PostgreSQL

□ Create Flexible Server
□ Enable "Require SSL" in Connection Security
□ Add firewall rule for Container Apps subnet
□ Create application database: greenchainz_prod
□ Create application user (not admin):
  
  CREATE USER greenchainz_app WITH PASSWORD 'secure_password';
  GRANT CONNECT ON DATABASE greenchainz_prod TO greenchainz_app;
  GRANT USAGE ON SCHEMA public TO greenchainz_app;
  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO greenchainz_app;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO greenchainz_app;
```

#### 3. Redis Cache Setup

```
Azure Portal → Azure Cache for Redis

□ Create Premium tier (for persistence) or Standard
□ Enable TLS 1.2+
□ Copy Primary Access Key to Key Vault
□ Note the hostname: xxx.redis.cache.windows.net
```

#### 4. Storage Account Setup

```
Azure Portal → Storage Accounts

□ Create storage account
□ Create private container: greenchainz-uploads
□ Enable soft delete for blobs
□ Copy connection string OR configure managed identity access
```

#### 5. DNS & SSL

```
□ Configure custom domain in Container Apps
□ Enable managed certificate or upload your own
□ Set up DNS records:
  - A record: api.greenchainz.com → Container App IP
  - CNAME: www.greenchainz.com → Container App FQDN
```

#### 6. Monitoring Setup

```
Azure Portal → Application Insights

□ Create Application Insights resource
□ Copy Connection String to Key Vault
□ Enable Live Metrics
□ Set up alerts for:
  - Error rate > 5%
  - Response time > 2s
  - Failed requests
```

---

## Secret Rotation Guide

### Rotating Cryptographic Secrets

For `JWT_SECRET`, `SESSION_SECRET`, `COOKIE_SECRET`:

1. **Generate new secret:**

   ```bash
   NEW_SECRET=$(openssl rand -base64 48)
   ```

2. **Update Key Vault:**

   ```bash
   az keyvault secret set --vault-name greenchainz-vault --name jwt-secret --value "$NEW_SECRET"
   ```

3. **Restart Container App:**

   ```bash
   az containerapp revision restart --name greenchainz-backend --resource-group rg-greenchainz
   ```

4. **Note:** JWT rotation will invalidate all existing tokens. Users will need to re-authenticate.

### Rotating Database Password

1. Update password in PostgreSQL
2. Update Key Vault secret
3. Restart Container App
4. Verify connectivity

### Rotating Azure AD Client Secret

1. Create new secret in App Registration (old one still works)
2. Update Key Vault
3. Restart Container App
4. Verify authentication works
5. Delete old secret from App Registration

---

## Troubleshooting

### Backend Refuses to Start

**Error:** `Missing required environment variable: JWT_SECRET`

**Solution:** Ensure all required secrets are set. In production, these cannot have fallbacks.

---

**Error:** `JWT_SECRET is set to a placeholder value; refuse to start`

**Solution:** Replace placeholder values like `your-secret-here` with actual secure values.

---

### Key Vault Access Denied

**Error:** `Failed to retrieve secret: Access denied`

**Solution:**

1. Verify managed identity is enabled on Container App
2. Check Key Vault access policies include the Container App's identity
3. Ensure the identity has `Get` and `List` permissions

---

### Database Connection Failed

**Error:** `Connection to PostgreSQL failed: SSL required`

**Solution:** Set `POSTGRES_SSL=true` in environment variables.

---

### Redis Connection Failed

**Error:** `Redis Client Error: ECONNREFUSED`

**Solution:**

1. Verify `REDIS_HOST` is correct
2. Ensure `REDIS_SSL=true` for Azure Redis
3. Check firewall allows Container App access

---

## Security Best Practices

1. **Never commit secrets to git** - Use `.env.example` with placeholders only
2. **Use Managed Identity** - Avoid storing connection strings where possible
3. **Rotate secrets regularly** - At least every 90 days for critical secrets
4. **Monitor Key Vault access** - Enable diagnostic logging
5. **Use separate secrets per environment** - Dev/Staging/Prod should have different secrets
6. **Minimum privilege** - Database user should only have necessary permissions
7. **Enable audit logging** - Track who accesses what secrets when

---

## Related Documentation

- [Azure Authentication Setup](./OAUTH_SETUP.md)
- [Deployment Checklist](./deployment-checklist.md)
- [Backend README](../backend/README.md)
