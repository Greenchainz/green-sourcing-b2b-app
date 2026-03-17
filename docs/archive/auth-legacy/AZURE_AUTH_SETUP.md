# Azure Container Apps Authentication Setup Guide

This guide explains how to properly configure NextAuth.js v5 authentication with Azure Key Vault secrets in Azure Container Apps.

## Overview of the Authentication Issues (Fixed)

The login system was failing due to three specific issues:

1. **pg-native dependency error** - The `pg` library was trying to load native C++ bindings that don't exist in Alpine containers
2. **Environment variable mismatch** - Azure Key Vault secrets weren't mapped to the correct NextAuth v5 variable names
3. **Production URL hardcoded** - The auth callback was using `localhost:3002` instead of production domain

All these issues have been fixed in this PR.

---

## 1. Key Vault Secret Naming

Your Azure Key Vault contains these secrets:

| Key Vault Secret Name | Purpose |
|----------------------|---------|
| `AzureAD-ClientId` | Microsoft Entra ID application client ID |
| `AzureAD-ClientSecret` | Microsoft Entra ID application client secret |
| `AzureAD-TenantId` | Azure Active Directory tenant ID |
| `Database-URL` | PostgreSQL connection string |
| `Redis-ConnectionString` | Azure Redis Cache connection string |
| `Storage-ConnectionString` | Azure Blob Storage connection string |
| `AzureOpenAI-ApiKey` | Azure OpenAI API key |
| `AzureOpenAI-Endpoint` | Azure OpenAI service endpoint |

---

## 2. NextAuth v5 Environment Variable Requirements

NextAuth.js v5 expects OAuth provider credentials in a specific format:

### Microsoft Entra ID (Azure AD)
```bash
AUTH_MICROSOFT_ENTRA_ID_ID       # Client ID
AUTH_MICROSOFT_ENTRA_ID_SECRET   # Client Secret  
AUTH_MICROSOFT_ENTRA_ID_ISSUER   # Token issuer URL
```

### Google OAuth
```bash
AUTH_GOOGLE_ID      # Google OAuth Client ID
AUTH_GOOGLE_SECRET  # Google OAuth Client Secret
```

### LinkedIn OAuth
```bash
AUTH_LINKEDIN_ID     # LinkedIn Client ID
AUTH_LINKEDIN_SECRET # LinkedIn Client Secret
```

### Core NextAuth Configuration
```bash
NEXTAUTH_URL    # or AUTH_URL - Your application URL
NEXTAUTH_SECRET # or AUTH_SECRET - Random secret for JWT signing
```

---

## 3. Azure Container Apps Configuration

### Step 1: Map Key Vault Secrets to Environment Variables

In Azure Portal → Container Apps → Environment Variables, configure:

#### Microsoft Entra ID Configuration
```
Name: AUTH_MICROSOFT_ENTRA_ID_ID
Value: secretref:azuread-clientid

Name: AUTH_MICROSOFT_ENTRA_ID_SECRET
Value: secretref:azuread-clientsecret
```

#### Build the Issuer URL
The issuer must be constructed from your tenant ID:

1. Get tenant ID from Key Vault: `AzureAD-TenantId`
2. Build issuer URL: `https://login.microsoftonline.com/{TENANT_ID}/v2.0`
3. For multi-tenant apps: `https://login.microsoftonline.com/common/v2.0`

```
Name: AUTH_MICROSOFT_ENTRA_ID_ISSUER
Value: https://login.microsoftonline.com/ca4f78d4-c753-4893-9cd8-1b309922b4dc/v2.0
```

*(Replace `ca4f78d4-c753-4893-9cd8-1b309922b4dc` with your actual tenant ID)*

#### NextAuth Core Configuration
```
Name: NEXTAUTH_URL
Value: https://greenchainz.com

Name: NEXTAUTH_SECRET
Value: secretref:nextauth-secret
```

*(You'll need to create a `nextauth-secret` in Key Vault if it doesn't exist)*

### Step 2: Add Missing Secrets to Key Vault

If you don't have OAuth secrets for Google and LinkedIn yet:

```bash
# Generate NextAuth secret
openssl rand -base64 32

# Add to Key Vault
az keyvault secret set \
  --vault-name Greenchainz-vault-2026 \
  --name nextauth-secret \
  --value "<generated-secret>"

# Add Google OAuth secrets (when ready)
az keyvault secret set \
  --vault-name Greenchainz-vault-2026 \
  --name google-client-id \
  --value "<your-google-client-id>"

az keyvault secret set \
  --vault-name Greenchainz-vault-2026 \
  --name google-client-secret \
  --value "<your-google-client-secret>"

# Add LinkedIn OAuth secrets (when ready)
az keyvault secret set \
  --vault-name Greenchainz-vault-2026 \
  --name linkedin-client-id \
  --value "<your-linkedin-client-id>"

az keyvault secret set \
  --vault-name Greenchainz-vault-2026 \
  --name linkedin-client-secret \
  --value "<your-linkedin-client-secret>"
```

### Step 3: Reference New Secrets in Container App

```
Name: AUTH_GOOGLE_ID
Value: secretref:google-client-id

Name: AUTH_GOOGLE_SECRET
Value: secretref:google-client-secret

Name: AUTH_LINKEDIN_ID
Value: secretref:linkedin-client-id

Name: AUTH_LINKEDIN_SECRET
Value: secretref:linkedin-client-secret
```

---

## 4. Database Configuration for Authentication

The authentication callback (`/api/auth-callback`) needs database access.

Ensure these environment variables are set:

```
Name: DATABASE_URL
Value: secretref:database-url

# OR individual PostgreSQL variables:
Name: POSTGRES_HOST
Value: greenchainz-db-prod.postgres.database.azure.com

Name: POSTGRES_PORT
Value: 5432

Name: POSTGRES_USER
Value: greenchainz_admin

Name: POSTGRES_PASSWORD
Value: secretref:postgres-password

Name: POSTGRES_DB
Value: greenchainz_prod

Name: POSTGRES_SSL
Value: true
```

**Important**: The connection pool in `app/api/auth-callback/route.ts` uses these individual environment variables, not `DATABASE_URL`. Ensure all are set.

---

## 5. Testing the Configuration

### Test Credentials-Based Login

1. Set test user credentials in Container App environment:
```
Name: TEST_USER_EMAIL
Value: test@greenchainz.com

Name: TEST_USER_PASSWORD  
Value: <secure-test-password>

Name: TEST_USER_ID
Value: 1

Name: TEST_USER_NAME
Value: Test User
```

2. Navigate to: `https://greenchainz.com/login`
3. Enter test credentials
4. Should redirect to `/dashboard` on success

### Test OAuth Login

1. Navigate to: `https://greenchainz.com/login`
2. Click "Continue with Microsoft" or "Continue with Google"
3. Complete OAuth flow
4. Should create user in database and redirect to `/dashboard`

---

## 6. Troubleshooting

### Error: "Module not found: Can't resolve 'pg-native'"

**Cause**: The `pg` library is trying to load native C++ bindings that don't exist in Alpine containers.

**Fix**: Applied in this PR - added `NODE_PG_FORCE_NATIVE=""` to Dockerfile and set `process.env.NODE_PG_FORCE_NATIVE = undefined` in database files.

**Verification**:
```bash
# Check logs for pg-native errors
az containerapp logs show \
  --name greenchainz-container \
  --resource-group greenchainz-production \
  --follow
```

### Error: "Missing email or password"

**Cause**: The `credentials` object passed to the `authorize` function is null.

**Fix**: Applied in this PR - added explicit null checks and logging in `app/app.auth.ts`.

**Verification**: Check logs for credential debugging output.

### Error: "Failed to fetch" or "Network request failed"

**Cause**: The `signIn` callback is trying to call `http://localhost:3002/api/auth-callback` in production.

**Fix**: Applied in this PR - changed to use `NEXTAUTH_URL` environment variable.

**Verification**: 
```bash
# Check that NEXTAUTH_URL is set correctly
az containerapp show \
  --name greenchainz-container \
  --resource-group greenchainz-production \
  --query "properties.template.containers[0].env"
```

### Error: "Issuer did not match the issuer from the discovery endpoint"

**Cause**: The `AUTH_MICROSOFT_ENTRA_ID_ISSUER` format is incorrect.

**Fix**: Must be exactly: `https://login.microsoftonline.com/{TENANT_ID}/v2.0`

**Verification**: Check Azure AD token issuer matches exactly.

---

## 7. Security Checklist

- [ ] All OAuth secrets stored in Azure Key Vault
- [ ] Container App uses managed identity to access Key Vault
- [ ] `NEXTAUTH_SECRET` is a strong random value (32+ bytes)
- [ ] Database password is not exposed in environment variables
- [ ] `NEXTAUTH_URL` uses HTTPS in production
- [ ] Cookie domain is set to `.greenchainz.com` for SSO
- [ ] Test user credentials removed or secured for production

---

## 8. Reference Links

- [NextAuth.js v5 Documentation](https://authjs.dev/getting-started)
- [Microsoft Entra ID Provider](https://authjs.dev/getting-started/providers/microsoft-entra-id)
- [Azure Container Apps Environment Variables](https://learn.microsoft.com/en-us/azure/container-apps/environment-variables)
- [Azure Key Vault Integration](https://learn.microsoft.com/en-us/azure/container-apps/manage-secrets)

---

## 9. Complete Environment Variable Checklist

Copy this checklist and verify each variable is set in your Azure Container App:

### Core Configuration
- [ ] `NODE_ENV=production`
- [ ] `PORT=3000`
- [ ] `NEXTAUTH_URL=https://greenchainz.com`
- [ ] `NEXTAUTH_SECRET` (from Key Vault)

### Microsoft Entra ID
- [ ] `AUTH_MICROSOFT_ENTRA_ID_ID` (from Key Vault: `azuread-clientid`)
- [ ] `AUTH_MICROSOFT_ENTRA_ID_SECRET` (from Key Vault: `azuread-clientsecret`)
- [ ] `AUTH_MICROSOFT_ENTRA_ID_ISSUER=https://login.microsoftonline.com/{TENANT_ID}/v2.0`

### Google OAuth (Optional)
- [ ] `AUTH_GOOGLE_ID` (from Key Vault)
- [ ] `AUTH_GOOGLE_SECRET` (from Key Vault)

### LinkedIn OAuth (Optional)
- [ ] `AUTH_LINKEDIN_ID` (from Key Vault)
- [ ] `AUTH_LINKEDIN_SECRET` (from Key Vault)

### Database
- [ ] `DATABASE_URL` (from Key Vault) OR individual Postgres variables:
- [ ] `POSTGRES_HOST`
- [ ] `POSTGRES_PORT`
- [ ] `POSTGRES_USER`
- [ ] `POSTGRES_PASSWORD` (from Key Vault)
- [ ] `POSTGRES_DB`
- [ ] `POSTGRES_SSL=true`

### Cookie & Domain
- [ ] `COOKIE_DOMAIN=.greenchainz.com`

### Test User (Development)
- [ ] `TEST_USER_EMAIL` (optional, for testing)
- [ ] `TEST_USER_PASSWORD` (optional, for testing)

---

**Last Updated**: 2026-01-27  
**Status**: ✅ All authentication fixes applied
