# Azure AD Authentication Fix Guide

## Problem Summary
The frontend is throwing `invalid_grant` errors during Azure AD token exchange. This is typically caused by redirect URI mismatches or expired authorization codes.

## Root Causes Identified
1. **Redirect URI Mismatch**: Azure Container Apps revision URLs (with `---0000186` suffix) not registered in Azure AD
2. **Environment Variable Configuration**: Missing or incorrect NextAuth v5 environment variables
3. **CSS Syntax Errors**: Next.js 16 CSS module issues (non-blocking but should be fixed)

## Immediate Fixes Applied

### 1. NextAuth Configuration Updated (`app/app.auth.ts`)
- Added fallback to legacy `AZURE_AD_*` environment variables for backward compatibility
- Added `prompt: "select_account"` to force account picker and avoid stale tokens
- Auto-generate issuer URL from tenant ID if `AUTH_MICROSOFT_ENTRA_ID_ISSUER` not set

### 2. CSS Optimization (`next.config.js`)
- Added `experimental.optimizeCss: true` for Next.js 16 compatibility
- Fixes CSS syntax errors in production builds

### 3. Redirect URI Handling (`app/api/auth/callback/route.ts`, `app/api/auth/signin/route.ts`)
- Updated to prioritize `NEXTAUTH_URL` and `AUTH_URL` environment variables
- Falls back to `NEXT_PUBLIC_SITE_URL` then `requestUrl.origin`
- Ensures consistent redirect URI across authorization and token exchange

## Azure Portal Configuration Required

### Step 1: Add All Possible Redirect URIs

Navigate to: **Azure Portal → Azure Active Directory → App Registrations → GreenChainz (App ID: `479e2a01-70ab-4df9-baa4-560d317c3423`) → Authentication**

Add **ALL** of these redirect URIs:

```
# NextAuth v5 callback (recommended)
https://greenchainz.com/api/auth/callback/microsoft-entra-id
https://www.greenchainz.com/api/auth/callback/microsoft-entra-id
http://localhost:3000/api/auth/callback/microsoft-entra-id

# Custom Azure AD flow callback (legacy)
https://greenchainz.com/api/auth/callback
https://www.greenchainz.com/api/auth/callback
http://localhost:3000/api/auth/callback

# Container Apps revision URLs (current deployment)
https://greenchainz-frontend---0000186.jollyrock-a66f2da6.eastus.azurecontainerapps.io/api/auth/callback/microsoft-entra-id
https://greenchainz-frontend---0000186.jollyrock-a66f2da6.eastus.azurecontainerapps.io/api/auth/callback
https://greenchainz-frontend.jollyrock-a66f2da6.eastus.azurecontainerapps.io/api/auth/callback/microsoft-entra-id
https://greenchainz-frontend.jollyrock-a66f2da6.eastus.azurecontainerapps.io/api/auth/callback

# Legacy PKCE callback (if still in use)
https://greenchainz.com/login/callback
https://www.greenchainz.com/login/callback
http://localhost:3000/login/callback
```

**Note**: Azure Container Apps creates revision-specific URLs with the format `{app-name}---{revision-id}.{environment}.{region}.azurecontainerapps.io`. Always include the base URL without revision suffix to avoid future mismatches.

### Step 2: Verify Token Configuration

In the same **Authentication** page:
- ✅ ID tokens (used for sign-ins)
- ✅ Access tokens (used for implicit flows)

### Step 3: Verify API Permissions

Navigate to: **API Permissions**

Ensure these are granted:
- `openid` - Required
- `profile` - Required
- `email` - Required
- `User.Read` - Recommended

Click **"Grant admin consent"** if not already done.

## Environment Variables Configuration

### Azure Container Apps

Navigate to: **Azure Portal → Container Apps → greenchainz-frontend → Configuration → Environment variables**

Add/verify these variables:

```bash
# NextAuth v5 Configuration (Required)
NEXTAUTH_URL=https://greenchainz.com
AUTH_URL=https://greenchainz.com
NEXTAUTH_SECRET=<generate-with: openssl rand -base64 32>
AUTH_SECRET=<same-as-NEXTAUTH_SECRET>

# Microsoft Entra ID (Azure AD) Provider (Required)
AUTH_MICROSOFT_ENTRA_ID_ID=479e2a01-70ab-4df9-baa4-560d317c3423
AUTH_MICROSOFT_ENTRA_ID_SECRET=<from-key-vault>
AUTH_MICROSOFT_ENTRA_ID_ISSUER=https://login.microsoftonline.com/ca4f78d4-c753-4893-9cd8-1b309922b4dc/v2.0

# Legacy Azure AD variables (for backward compatibility)
AZURE_AD_CLIENT_ID=479e2a01-70ab-4df9-baa4-560d317c3423
AZURE_AD_CLIENT_SECRET=<from-key-vault>
AZURE_AD_TENANT_ID=ca4f78d4-c753-4893-9cd8-1b309922b4dc

# Public variables for browser (optional, used by custom flow)
NEXT_PUBLIC_AZURE_CLIENT_ID=479e2a01-70ab-4df9-baa4-560d317c3423
NEXT_PUBLIC_AZURE_TENANT_ID=ca4f78d4-c753-4893-9cd8-1b309922b4dc
NEXT_PUBLIC_SITE_URL=https://greenchainz.com

# Cookie configuration
COOKIE_DOMAIN=.greenchainz.com
NODE_ENV=production
```

### Generate New NEXTAUTH_SECRET

If you don't have a NextAuth secret yet:

```bash
# Generate a secure random secret
openssl rand -base64 32
```

Copy the output and set it as both `NEXTAUTH_SECRET` and `AUTH_SECRET`.

## Deployment Steps

### Option 1: Restart Container App (Quick Fix)

After updating environment variables in Azure Portal:

```bash
az containerapp restart \
  --name greenchainz-frontend \
  --resource-group greenchainz-production
```

### Option 2: Redeploy with Latest Code (Recommended)

Push changes to `main` branch to trigger GitHub Actions deployment:

```bash
git add .
git commit -m "fix: Azure AD authentication configuration"
git push origin main
```

The GitHub Actions workflow will:
1. Build with updated environment variables
2. Push to Azure Container Registry
3. Deploy to Container Apps

## Testing Checklist

### Local Testing

1. **Copy environment template**:
   ```bash
   cp .env.local.example .env.local
   ```

2. **Update `.env.local`**:
   ```bash
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-generated-secret
   AUTH_MICROSOFT_ENTRA_ID_ID=479e2a01-70ab-4df9-baa4-560d317c3423
   AUTH_MICROSOFT_ENTRA_ID_SECRET=your-client-secret
   AUTH_MICROSOFT_ENTRA_ID_ISSUER=https://login.microsoftonline.com/ca4f78d4-c753-4893-9cd8-1b309922b4dc/v2.0
   ```

3. **Start dev server**:
   ```bash
   npm install
   npm run dev
   ```

4. **Test login**:
   - Navigate to http://localhost:3000/login
   - Click "Sign in with Microsoft" (NextAuth provider)
   - Should redirect to Microsoft → back to callback → dashboard
   - Check browser console for errors

### Production Testing

After deployment:

1. **Clear browser cache**:
   ```javascript
   // In browser DevTools console
   sessionStorage.clear()
   localStorage.clear()
   location.reload()
   ```

2. **Test login flow**:
   - Go to https://greenchainz.com/login
   - Click "Sign in with Microsoft"
   - Verify redirect to Azure AD
   - Check callback succeeds (no 401)
   - Verify dashboard loads

3. **Check Network tab**:
   - POST to `/api/auth/callback/microsoft-entra-id` should return 302 (redirect)
   - No 401 errors
   - Cookies should be set (`authjs.session-token` or `__Secure-authjs.session-token`)

## Troubleshooting

### Error: "invalid_grant" still occurring

**Check 1: Verify Exact Redirect URI**
```bash
# In browser DevTools, Network tab
# Look for the authorization request to login.microsoftonline.com
# Check the redirect_uri parameter
# Ensure it EXACTLY matches one in Azure Portal
```

**Check 2: Verify Environment Variables**
```bash
# Check what NEXTAUTH_URL is set to
az containerapp show \
  --name greenchainz-frontend \
  --resource-group greenchainz-production \
  --query 'properties.template.containers[0].env' \
  -o json | jq '.[] | select(.name | contains("NEXTAUTH"))'
```

**Check 3: Regenerate Client Secret**
If secret is invalid or expired:
1. Azure Portal → App Registrations → Certificates & secrets
2. Click "+ New client secret"
3. Description: "GreenChainz NextAuth - Feb 2026"
4. Expires: 24 months
5. Copy VALUE immediately
6. Update in Azure Key Vault and Container Apps

### Error: CSS Syntax Errors

If you still see CSS errors after the `optimizeCss` fix:
1. Clear Next.js cache: `rm -rf .next`
2. Rebuild: `npm run build`
3. Test: `npm start`

### Error: Infinite Redirect Loop

Check middleware cookie detection:
```bash
# In browser DevTools, Application tab → Cookies
# Should see one of these:
# - authjs.session-token (development)
# - __Secure-authjs.session-token (production)
# - greenchainz-auth-token (legacy)
```

If cookies are missing, check backend is setting them correctly.

## Migration Path

### Current State
- ✅ Dual authentication system (NextAuth v5 + Custom Azure AD)
- ✅ Both flows supported for backward compatibility

### Recommended Future State
1. **Phase 1** (Current): Both flows work
2. **Phase 2** (Next 2 weeks): Monitor adoption, prefer NextAuth v5
3. **Phase 3** (Month 2): Add deprecation warnings for custom flow
4. **Phase 4** (Month 3): Remove custom Azure AD flow, keep only NextAuth v5

## Architecture Decision

### Why NextAuth v5?
- Industry-standard authentication library
- Built-in CSRF protection
- Automatic token refresh
- Support for multiple providers (Google, LinkedIn, etc.)
- Better security defaults
- Active maintenance and community

### Why Keep Custom Flow Temporarily?
- Existing users may have sessions in custom flow
- Gradual migration reduces risk
- Both flows share same backend (users table, roles, etc.)

## Support

For issues:
1. Check Application Insights: `az monitor app-insights query`
2. Check Container App logs: `az containerapp logs show`
3. Review this document
4. Contact: devops@greenchainz.com

## Related Documents
- `AZURE_AD_SETUP.md` - Original PKCE setup guide
- `AZURE_PORTAL_CHECKLIST.md` - Complete Azure configuration checklist
- `.env.azure.example` - Environment variable reference
