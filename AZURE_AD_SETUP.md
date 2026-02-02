# Azure AD PKCE Login Setup Guide

## Overview
This document outlines the Azure AD login implementation with PKCE (Proof Key for Code Exchange) and the steps required to configure it properly.

## What Changed

### 1. Frontend Login Flow (LoginClient.tsx)
- Added PKCE code generation (`generateCodeVerifier()`, `generateCodeChallenge()`)
- Login button now generates `code_verifier` and `code_challenge` before redirecting to Azure
- Stores `code_verifier` in sessionStorage for later retrieval

### 2. Callback Handler (CallbackClient.tsx)
- **NEW**: Primary flow checks for `code` in query params (not hash)
- Retrieves `code_verifier` from sessionStorage
- Exchanges authorization code for tokens via `/api/auth/azure-token-exchange`
- **LEGACY**: Falls back to MSAL flow for existing users

### 3. Backend Token Exchange (Already Implemented)
- `/api/auth/azure-token-exchange/route.ts` already validates PKCE `codeVerifier`
- No backend changes needed!

### 4. Environment Variables
Added public environment variables needed for browser-side PKCE:
- `NEXT_PUBLIC_AZURE_CLIENT_ID` - Azure AD application client ID
- `NEXT_PUBLIC_AZURE_TENANT_ID` - Azure AD tenant (usually "common")
- `NEXT_PUBLIC_SITE_URL` - Your site URL for redirect URI construction

## Azure Portal Configuration

### Required Redirect URIs
Add these in **Azure Portal → App Registrations → [Your App] → Authentication**:

#### Production
```
https://www.greenchainz.com/login/callback
```

#### Local Development
```
http://localhost:3000/login/callback
```

#### Other Environments (if applicable)
```
https://greenchainz-frontend.jollyrock-a66f2da6.eastus.azurecontainerapps.io/login/callback
```

### Platform Configuration
- Platform type: **Web**
- Token configuration:
  - ✅ ID tokens (used for sign-ins)
  - ✅ Access tokens (used for implicit flows - optional)
- Supported account types: **Multi-tenant + Personal Microsoft accounts**

### API Permissions
Ensure these Microsoft Graph permissions are granted:
- `openid` - Required for OIDC
- `profile` - User profile information
- `email` - User email address
- `User.Read` - Read user profile (optional but recommended)

## Local Development Setup

1. **Copy environment template**:
   ```bash
   cp .env.local.example .env.local
   ```

2. **Update .env.local** with your Azure AD credentials:
   ```bash
   # Server-side (backend) configuration
   AZURE_CLIENT_ID=479e2a01-70ab-4df9-baa4-560d317c3423
   AZURE_CLIENT_SECRET=your_client_secret_from_azure_portal
   AZURE_TENANT_ID=ca4f78d4-c753-4893-9cd8-1b309922b4dc
   
   # Client-side (frontend/browser) configuration
   NEXT_PUBLIC_AZURE_CLIENT_ID=479e2a01-70ab-4df9-baa4-560d317c3423
   NEXT_PUBLIC_AZURE_TENANT_ID=ca4f78d4-c753-4893-9cd8-1b309922b4dc
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```

4. **Test login**:
   - Navigate to http://localhost:3000/login
   - Click "Sign in with Microsoft"
   - Should redirect to Microsoft → back to `/login/callback` → `/dashboard`

## Production Deployment (Azure Container Apps)

### Environment Variables in Azure Container Apps

Set these in **Azure Portal → Container Apps → [greenchainz-frontend] → Configuration**:

```bash
# Server-side configuration
AZURE_CLIENT_ID=479e2a01-70ab-4df9-baa4-560d317c3423
AZURE_CLIENT_SECRET=<stored-in-key-vault>
AZURE_TENANT_ID=ca4f78d4-c753-4893-9cd8-1b309922b4dc

# Client-side configuration (embedded at build time)
NEXT_PUBLIC_AZURE_CLIENT_ID=479e2a01-70ab-4df9-baa4-560d317c3423
NEXT_PUBLIC_AZURE_TENANT_ID=ca4f78d4-c753-4893-9cd8-1b309922b4dc
NEXT_PUBLIC_SITE_URL=https://www.greenchainz.com
```

**⚠️ CRITICAL**: `NEXT_PUBLIC_*` variables must be set **before building** the Next.js app, as they are embedded into the JavaScript bundle at build time.

### Deployment Workflow

If using GitHub Actions for deployment, ensure the workflow sets these variables during the build step:

```yaml
- name: Build Next.js app
  env:
    NEXT_PUBLIC_AZURE_CLIENT_ID: ${{ secrets.AZURE_CLIENT_ID }}
    NEXT_PUBLIC_AZURE_TENANT_ID: ${{ secrets.AZURE_TENANT_ID }}
    NEXT_PUBLIC_SITE_URL: https://www.greenchainz.com
  run: npm run build
```

## Testing Checklist

### Local Testing
- [ ] Login button redirects to Microsoft
- [ ] After Microsoft authentication, redirects back to `/login/callback`
- [ ] User is redirected to `/dashboard` (or `/dashboard/buyer` based on role)
- [ ] No console errors
- [ ] Network tab shows POST to `/api/auth/azure-token-exchange` with `codeVerifier` in body

### Production Testing
- [ ] Test from https://www.greenchainz.com/login
- [ ] Verify redirect URI matches exactly in Azure Portal
- [ ] Check browser DevTools console for errors
- [ ] Verify cookies are set after successful login

## Troubleshooting

### Error: "invalid_grant"
**Cause**: Redirect URI mismatch between frontend and Azure Portal

**Fix**:
1. Check the exact redirect URI sent in authorization request (browser Network tab)
2. Ensure it matches EXACTLY in Azure Portal (no trailing slash, correct protocol/domain)
3. Common mismatch: `http://localhost:3000/login/callback` vs `http://localhost:3002/login/callback`

### Error: "PKCE code_verifier missing from sessionStorage"
**Cause**: SessionStorage was cleared between login initiation and callback

**Fix**:
1. Ensure browser allows sessionStorage
2. Check if you have strict CORS or cookie policies blocking cross-origin storage
3. Verify you're clicking the Microsoft button (not directly navigating to callback)

### Error: "Azure AD configuration missing"
**Cause**: Missing `NEXT_PUBLIC_AZURE_CLIENT_ID` environment variable

**Fix**:
1. Add `NEXT_PUBLIC_AZURE_CLIENT_ID` to `.env.local` (local) or Azure Container Apps config (production)
2. For production, rebuild the Next.js app after adding the variable
3. Restart the container/server

### Error: Infinite redirect loop
**Cause**: Middleware redirects to `/login` because it doesn't find auth cookies

**Fix**:
1. Check that `/login/callback` is in the `publicPaths` array in `middleware.ts`
2. Verify that the backend sets cookies with correct names (`greenchainz-auth-token`, `token`, etc.)
3. Check cookie `httpOnly`, `secure`, and `sameSite` settings match your environment

### Debugging Tips

**Enable debug logging**:
```bash
NEXT_PUBLIC_AUTH_DEBUG=true
```

**Check sessionStorage**:
```javascript
// In browser console
console.log(sessionStorage.getItem('pkce_code_verifier'));
```

**Check cookies**:
```javascript
// In browser console
document.cookie
```

**Monitor network requests**:
1. Open DevTools → Network tab
2. Filter for "azure-token-exchange"
3. Check request payload includes `codeVerifier`
4. Check response for tokens

## RBAC and Additional Considerations

### Items Found (Not Fixed in This PR)
1. **Cookie Strategy**: Multiple cookie names used (`authjs.session-token`, `greenchainz-auth-token`, `token`, `session`)
   - **Recommendation**: Standardize on one cookie name across all auth flows

2. **Middleware Token Check**: Checks multiple cookie names but could be more explicit
   - **Current**: Checks 4 different cookie names
   - **Recommendation**: Document which flows use which cookies

3. **Role-Based Routing**: Callback routes to `/dashboard` or `/dashboard/buyer` based on role
   - **Current**: Works as implemented
   - **Consideration**: May want to add admin role routing in the future

4. **Legacy MSAL Flow**: Still supported for backwards compatibility
   - **Current**: Falls back to hash-based MSAL if new PKCE flow not detected
   - **Recommendation**: Plan deprecation timeline for legacy flow

5. **Token Refresh**: `/api/auth/refresh` endpoint exists but not called from new flow
   - **Recommendation**: Integrate token refresh with PKCE flow

6. **Public Config Endpoint**: `/api/public-config` used by legacy MSAL flow
   - **New PKCE flow**: Uses environment variables directly
   - **Consideration**: May be able to remove public-config endpoint after MSAL deprecation

### Security Best Practices

✅ **Implemented**:
- PKCE for public clients (no client_secret in browser)
- Code verifier stored in sessionStorage (cleared after use)
- Authorization code single-use (validated by Azure)
- HTTPS required in production

⚠️ **To Consider**:
- [ ] Add rate limiting on token exchange endpoint
- [ ] Implement token rotation on refresh
- [ ] Add logging/monitoring for failed auth attempts
- [ ] Consider adding MFA requirement in Azure AD
- [ ] Implement session timeout warnings

## Node.js Version Compliance

✅ **Current Status**: Compliant with Azure Container Apps requirements

- **package.json**: Requires Node >=18.18.0, npm >=9.0.0
- **Dockerfile**: Uses Node 20 Alpine
- **Dockerfile.azure**: Uses Node 20 Alpine
- **.oryx-node-version**: Specifies 18.18.0 (minimum)
- **Local environment**: Running Node 20.20.0

**No changes needed** for Node.js version compliance.

## Next Steps

After login works:
1. **Deploy auth agent** to Azure AI Foundry (from Space instructions)
2. **Connect RFQ system** to authenticated sessions
3. **Test with first supplier account**
4. **Monitor auth metrics** in Azure Application Insights
5. **Plan MSAL deprecation** (set timeline, communicate to users)

## Contact

For issues or questions:
- Check Application Insights logs in Azure Portal
- Review auth diagnostics at `/api/auth/diagnostics` (if endpoint exists)
- Contact: support@greenchainz.com
