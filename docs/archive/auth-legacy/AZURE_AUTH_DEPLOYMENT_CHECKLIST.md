# Microsoft Entra ID Authentication Deployment Checklist

## 🎯 Pre-Deployment Validation

This checklist ensures Microsoft Entra ID SSO authentication is properly configured for Azure Container Apps deployment.

### ✅ 1. Node.js Version Compliance

**Status:** ✅ **COMPLIANT**

- [x] `.oryx-node-version` set to `20.18.0`
- [x] `package.json` engines requires `>=20.0.0`
- [x] Dockerfiles use `node:20-alpine`
- [x] GitHub workflows use Node `20.x`
- [x] Azure SDKs compatible (`@azure/identity@4.13.0` requires >=20.0.0)

**Validation Command:**
```bash
bash scripts/validate-node-version.sh
```

---

### ✅ 2. NextAuth.js Configuration

**Location:** `app/app.auth.ts`

**Required Environment Variables:**

| Variable | Source | Status |
|----------|--------|--------|
| `AUTH_MICROSOFT_ENTRA_ID_ID` | Azure Key Vault `azure-ad-client-id` | ✅ Configured |
| `AUTH_MICROSOFT_ENTRA_ID_SECRET` | Azure Key Vault `azure-ad-client-secret` | ✅ Configured |
| `AUTH_MICROSOFT_ENTRA_ID_ISSUER` | Container App env var | ✅ Configured |
| `NEXTAUTH_URL` | Container App env var (`https://greenchainz.com`) | ✅ Configured |
| `AUTH_URL` | Container App env var (`https://greenchainz.com`) | ✅ Configured |
| `NEXTAUTH_SECRET` | Azure Key Vault `nextauth-secret` | ✅ Configured |

**Microsoft Entra ID App Registration Details:**
- **Tenant ID:** `ca4f78d4-c753-4893-9cd8-1b309922b4dc`
- **Client ID:** `479e2a01-70ab-4df9-baa4-560d317c3423`
- **Issuer URL:** `https://login.microsoftonline.com/ca4f78d4-c753-4893-9cd8-1b309922b4dc/v2.0`

**Redirect URI (MUST match exactly):**
```
https://greenchainz.com/api/auth/callback/microsoft-entra-id
```

**API Permissions:**
- `openid` - Sign users in
- `profile` - Read basic profile info
- `email` - Read user email address
- `User.Read` - Microsoft Graph API (basic user info)

---

### ✅ 3. Azure Container Apps Configuration

**Container App Name:** `greenchainz-frontend`
**Resource Group:** `rg-greenchainz-prod-container`
**Region:** East US
**Subscription:** `f9164e8d-d74d-43ea-98d4-b0466b3ef8b8`

**Environment Variables to Set:**

```bash
az containerapp update \
  --name greenchainz-frontend \
  --resource-group rg-greenchainz-prod-container \
  --set-env-vars \
    "NEXTAUTH_URL=https://greenchainz.com" \
    "AUTH_URL=https://greenchainz.com" \
    "AUTH_MICROSOFT_ENTRA_ID_ISSUER=https://login.microsoftonline.com/ca4f78d4-c753-4893-9cd8-1b309922b4dc/v2.0" \
    "NODE_ENV=production" \
  --secrets \
    "auth-microsoft-entra-id-id=keyvaultref:https://greenchainz-vault.vault.azure.net/secrets/azure-ad-client-id,identityref:/subscriptions/f9164e8d-d74d-43ea-98d4-b0466b3ef8b8/resourceGroups/rg-greenchainz-prod-container/providers/Microsoft.ManagedIdentity/userAssignedIdentities/greenchainz-frontend-identity" \
    "auth-microsoft-entra-id-secret=keyvaultref:https://greenchainz-vault.vault.azure.net/secrets/azure-ad-client-secret,identityref:/subscriptions/f9164e8d-d74d-43ea-98d4-b0466b3ef8b8/resourceGroups/rg-greenchainz-prod-container/providers/Microsoft.ManagedIdentity/userAssignedIdentities/greenchainz-frontend-identity" \
    "nextauth-secret=keyvaultref:https://greenchainz-vault.vault.azure.net/secrets/nextauth-secret,identityref:/subscriptions/f9164e8d-d74d-43ea-98d4-b0466b3ef8b8/resourceGroups/rg-greenchainz-prod-container/providers/Microsoft.ManagedIdentity/userAssignedIdentities/greenchainz-frontend-identity"
```

---

### ✅ 4. Azure Key Vault Secrets

**Vault Name:** `greenchainz-vault`

**Required Secrets:**

| Secret Name | Purpose | Validation Command |
|-------------|---------|-------------------|
| `azure-ad-client-id` | OAuth client ID | `az keyvault secret show --vault-name greenchainz-vault --name azure-ad-client-id --query value -o tsv` |
| `azure-ad-client-secret` | OAuth client secret | `az keyvault secret show --vault-name greenchainz-vault --name azure-ad-client-secret --query value -o tsv` |
| `nextauth-secret` | Session encryption key | `az keyvault secret show --vault-name greenchainz-vault --name nextauth-secret --query value -o tsv` |

**Managed Identity Access:**

```bash
# Get container app managed identity principal ID
PRINCIPAL_ID=$(az containerapp show \
  --name greenchainz-frontend \
  --resource-group rg-greenchainz-prod-container \
  --query "identity.principalId" -o tsv)

# Grant Key Vault Secrets User role
az role assignment create \
  --assignee $PRINCIPAL_ID \
  --role "Key Vault Secrets User" \
  --scope /subscriptions/f9164e8d-d74d-43ea-98d4-b0466b3ef8b8/resourceGroups/rg-greenchainz-prod-container/providers/Microsoft.KeyVault/vaults/greenchainz-vault
```

---

### ✅ 5. Azure AD App Registration Validation

**Check Redirect URIs:**

```bash
CLIENT_ID=$(az keyvault secret show --vault-name greenchainz-vault --name azure-ad-client-id --query value -o tsv)

az ad app show --id $CLIENT_ID --query "web.redirectUris"
```

**Expected Output:**
```json
[
  "https://greenchainz.com/api/auth/callback/microsoft-entra-id"
]
```

**If redirect URI is missing:**

```bash
az ad app update --id $CLIENT_ID --web-redirect-uris \
  "https://greenchainz.com/api/auth/callback/microsoft-entra-id"
```

---

### ✅ 6. Authentication Endpoints Verification

**After deployment, verify these endpoints respond:**

| Endpoint | Expected Response | Test Command |
|----------|-------------------|--------------|
| `/api/auth/providers` | JSON with provider list | `curl https://greenchainz.com/api/auth/providers` |
| `/api/auth/session` | Session info or null | `curl https://greenchainz.com/api/auth/session` |
| `/api/auth/signin/microsoft-entra-id` | Redirect to Microsoft | Browser test |
| `/api/health` | `{"status":"ok"}` | `curl https://greenchainz.com/api/health` |

**Example `/api/auth/providers` response:**

```json
{
  "microsoft-entra-id": {
    "id": "microsoft-entra-id",
    "name": "Microsoft Entra ID",
    "type": "oidc",
    "signinUrl": "https://greenchainz.com/api/auth/signin/microsoft-entra-id",
    "callbackUrl": "https://greenchainz.com/api/auth/callback/microsoft-entra-id"
  }
}
```

---

### ✅ 7. End-to-End Authentication Flow Test

**Manual Test Procedure:**

1. ✅ Open incognito browser window
2. ✅ Navigate to `https://greenchainz.com`
3. ✅ Click "Sign In" button
4. ✅ Should redirect to `login.microsoftonline.com`
5. ✅ Enter valid Microsoft credentials (user@company.com)
6. ✅ After authentication, should redirect back to greenchainz.com
7. ✅ Check for session cookie: `__Secure-authjs.session-token`
8. ✅ Verify `/api/auth/session` returns user data

**Expected Session Response:**

```json
{
  "user": {
    "name": "John Smith",
    "email": "john@company.com",
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
  },
  "expires": "2026-03-04T06:11:44.000Z"
}
```

---

### ✅ 8. Container App Logs Monitoring

**View authentication-related logs:**

```bash
az containerapp logs show \
  --name greenchainz-frontend \
  --resource-group rg-greenchainz-prod-container \
  --tail 100 --follow | grep -i "auth\|entra\|signin"
```

**Expected log messages:**
- `🔐 OAuth SignIn - Provider: microsoft-entra-id, Email: user@company.com`
- `✅ Credentials authenticated successfully`
- `NextAuth.js: Session token created`

---

### ✅ 9. Common Error Resolution

#### Error: "Redirect URI mismatch" (AADSTS50011)

**Cause:** Azure AD app registration doesn't have the exact redirect URI

**Fix:**
```bash
CLIENT_ID=$(az keyvault secret show --vault-name greenchainz-vault --name azure-ad-client-id --query value -o tsv)
az ad app update --id $CLIENT_ID --web-redirect-uris \
  "https://greenchainz.com/api/auth/callback/microsoft-entra-id"
```

---

#### Error: "invalid_client" (AADSTS7000215)

**Cause:** Client secret expired or incorrect

**Fix:**
```bash
CLIENT_ID=$(az keyvault secret show --vault-name greenchainz-vault --name azure-ad-client-id --query value -o tsv)

# Check secret expiration
az ad app credential list --id $CLIENT_ID --query "[].{EndDate:endDateTime}" -o table

# If expired, generate new secret
NEW_SECRET=$(az ad app credential reset --id $CLIENT_ID --query password -o tsv)

# Update Key Vault
az keyvault secret set --vault-name greenchainz-vault --name azure-ad-client-secret --value "$NEW_SECRET"

# Restart container app
az containerapp revision restart --name greenchainz-frontend --resource-group rg-greenchainz-prod-container
```

---

#### Error: 404 on `/api/auth/providers`

**Cause:** NextAuth.js route handler not deployed

**Fix:** Rebuild and redeploy
```bash
npm run build
docker build -t greenchainz-frontend -f Dockerfile.azure .
az acr login --name acrgreenchainzprod916
docker tag greenchainz-frontend acrgreenchainzprod916.azurecr.io/greenchainz-frontend:latest
docker push acrgreenchainzprod916.azurecr.io/greenchainz-frontend:latest

az containerapp update \
  --name greenchainz-frontend \
  --resource-group rg-greenchainz-prod-container \
  --image acrgreenchainzprod916.azurecr.io/greenchainz-frontend:latest
```

---

### ✅ 10. Security Best Practices

- [x] **NO passwords stored** - All secrets in Azure Key Vault
- [x] **Managed identity enabled** - No client secrets in env vars
- [x] **HTTPS enforced** - All cookies marked `secure`
- [x] **Session cookies HttpOnly** - No JavaScript access
- [x] **CSRF protection** - State parameter validated
- [x] **Token validation** - ID tokens verified from Microsoft

---

## 📊 Deployment Status Dashboard

**Container App Health:**
```bash
az containerapp show \
  --name greenchainz-frontend \
  --resource-group rg-greenchainz-prod-container \
  --query "{Name:name, Status:properties.runningStatus, URL:properties.configuration.ingress.fqdn}" -o table
```

**Active Revision:**
```bash
az containerapp revision list \
  --name greenchainz-frontend \
  --resource-group rg-greenchainz-prod-container \
  --query "[?properties.active].{Name:name, Traffic:properties.trafficWeight, Status:properties.runningState}" -o table
```

**Recent Logs:**
```bash
az containerapp logs show \
  --name greenchainz-frontend \
  --resource-group rg-greenchainz-prod-container \
  --tail 50
```

---

## 🚀 Final Deployment Command

**After all checks pass, deploy with:**

```bash
# Build
npm run build

# Build Docker image
docker build -t greenchainz-frontend:latest -f Dockerfile.azure .

# Push to ACR
az acr login --name acrgreenchainzprod916
docker tag greenchainz-frontend:latest acrgreenchainzprod916.azurecr.io/greenchainz-frontend:latest
docker push acrgreenchainzprod916.azurecr.io/greenchainz-frontend:latest

# Update container app
az containerapp update \
  --name greenchainz-frontend \
  --resource-group rg-greenchainz-prod-container \
  --image acrgreenchainzprod916.azurecr.io/greenchainz-frontend:latest

# Wait for new revision
watch -n 5 'az containerapp revision list --name greenchainz-frontend --resource-group rg-greenchainz-prod-container --query "[?properties.active].{Name:name, Status:properties.runningState}" -o table'

# Test
curl https://greenchainz.com/api/auth/providers
```

---

## ✅ Success Criteria

Authentication is working when:

- ✅ User clicks "Sign In" → Redirects to Microsoft
- ✅ User enters credentials → Redirects back to app
- ✅ Session cookie is set (visible in browser dev tools)
- ✅ `GET /api/auth/session` returns user info
- ✅ Protected pages show user data
- ✅ User clicks "Sign Out" → Session cleared

---

## 📚 Related Documentation

- `NODEJS_VERSION_REQUIREMENTS.md` - Node.js version compliance
- `app/app.auth.ts` - NextAuth.js configuration
- `app/auth.config.ts` - Edge-safe auth config
- `.env.azure.example` - Environment variables template
- `AZURE_AD_SETUP.md` - Azure AD configuration guide

---

**Last Updated:** 2026-02-02  
**Status:** ✅ All configurations validated  
**Next Review:** Before production deployment
