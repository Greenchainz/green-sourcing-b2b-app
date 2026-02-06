# Azure Portal Configuration Checklist

## 🎯 Quick Actions Required

### 1. Azure AD App Registration - Add Redirect URIs

**Location**: Azure Portal → Azure Active Directory → App Registrations → `GreenChainz` (App ID: `479e2a01-70ab-4df9-baa4-560d317c3423`)

**Navigate to**: Authentication → Platform configurations → Web

**Add these Redirect URIs**:
```
https://www.greenchainz.com/login/callback
http://localhost:3000/login/callback
https://greenchainz-frontend.jollyrock-a66f2da6.eastus.azurecontainerapps.io/login/callback
```

**Screenshot**: After adding, you should see all three URIs listed under "Web → Redirect URIs"

**⚠️ Important**: 
- URIs must match **exactly** (no trailing slash)
- Protocol matters: `https://` for production, `http://` for localhost
- Test each environment with its corresponding URI

---

### 2. GitHub Repository Variables (Already Configured, Verify)

**Location**: GitHub → Settings → Secrets and variables → Actions → Variables

**Verify these variables exist**:
- `AZURE_CLIENT_ID` = `479e2a01-70ab-4df9-baa4-560d317c3423`
- `AZURE_TENANT_ID` = `ca4f78d4-c753-4893-9cd8-1b309922b4dc`
- `AZURE_SUBSCRIPTION_ID` = (your subscription ID)
- `CONTAINER_REGISTRY` = `acrgreenchainzprod916`
- `RESOURCE_GROUP` = (your resource group name)
- `NEXT_PUBLIC_BACKEND_URL` = (your backend URL)

**✅ These are already used in the GitHub Actions workflow for building the Docker image.**

---

### 3. Azure Container Apps - Environment Variables (Optional, Review)

**Location**: Azure Portal → Container Apps → `greenchainz-frontend` → Configuration

**These variables are set at runtime** (separate from build-time variables):

#### Required for Backend Token Exchange:
```bash
AZURE_CLIENT_ID=479e2a01-70ab-4df9-baa4-560d317c3423
AZURE_CLIENT_SECRET=<from-key-vault>
AZURE_TENANT_ID=ca4f78d4-c753-4893-9cd8-1b309922b4dc
```

#### Optional Runtime Variables:
```bash
DATABASE_URL=<postgresql-connection-string>
NEXT_PUBLIC_SITE_URL=https://www.greenchainz.com
```

**Note**: `NEXT_PUBLIC_*` variables are embedded at **build time** via GitHub Actions, so setting them here at runtime won't affect the frontend JavaScript bundle. They're only needed if your backend/API routes reference them.

---

## 📋 Testing Instructions

### Test 1: Local Development
```bash
# 1. Copy environment template
cp .env.local.example .env.local

# 2. Edit .env.local with your Azure credentials
nano .env.local

# Required values:
NEXT_PUBLIC_AZURE_CLIENT_ID=479e2a01-70ab-4df9-baa4-560d317c3423
NEXT_PUBLIC_AZURE_TENANT_ID=ca4f78d4-c753-4893-9cd8-1b309922b4dc
NEXT_PUBLIC_SITE_URL=http://localhost:3000

AZURE_CLIENT_ID=479e2a01-70ab-4df9-baa4-560d317c3423
AZURE_CLIENT_SECRET=<your-secret>
AZURE_TENANT_ID=ca4f78d4-c753-4893-9cd8-1b309922b4dc

# 3. Start dev server
npm install  # if not already done
npm run dev

# 4. Test login
# - Open http://localhost:3000/login
# - Click "Sign in with Microsoft"
# - Should redirect to Microsoft → back to /login/callback → /dashboard
```

**Expected Result**: 
- ✅ Login button redirects to `login.microsoftonline.com`
- ✅ After Microsoft auth, redirects to `http://localhost:3000/login/callback`
- ✅ After callback processing, redirects to `/dashboard`
- ✅ No errors in browser console

**Debugging**:
- Open DevTools (F12) → Console tab
- Look for any red errors
- Check Network tab for failed requests
- Verify `pkce_code_verifier` is in sessionStorage before callback

---

### Test 2: Production Deployment

**After merging to `main` branch**, GitHub Actions will:
1. Build Docker image with `NEXT_PUBLIC_*` variables embedded
2. Push to Azure Container Registry
3. Deploy to Azure Container Apps

**Manual Verification**:
```bash
# 1. Check deployment succeeded in GitHub Actions
# Navigate to: Actions → Deploy to Azure Container Apps

# 2. Test production login
# Open: https://www.greenchainz.com/login
# Click: "Sign in with Microsoft"
# Verify: Redirects to Microsoft → /login/callback → /dashboard
```

**Expected Result**:
- ✅ Production URL works: `https://www.greenchainz.com/login`
- ✅ Redirect URI matches Azure Portal configuration
- ✅ Cookies are set with `secure=true` (HTTPS only)
- ✅ Dashboard loads after successful login

**Debugging Production**:
```bash
# Check Container App logs
az containerapp logs show \
  --name greenchainz-frontend \
  --resource-group <your-rg> \
  --tail 50

# Check if environment variables are set
az containerapp show \
  --name greenchainz-frontend \
  --resource-group <your-rg> \
  --query properties.configuration.secrets
```

---

## 🔍 Troubleshooting Guide

### Issue 1: "invalid_grant" Error

**Symptom**: After clicking "Sign in with Microsoft", you see an error page with "invalid_grant"

**Cause**: Redirect URI mismatch

**Fix**:
1. Check the browser URL bar - note the exact redirect URI Microsoft tried to use
2. Go to Azure Portal → App Registrations → Authentication
3. Verify the exact URI is listed (including protocol, domain, path)
4. Common mistakes:
   - `http://` vs `https://`
   - Trailing slash: `/login/callback` vs `/login/callback/`
   - Wrong domain: `localhost:3000` vs `localhost:3002`

**Solution**: Add the EXACT redirect URI to Azure Portal

---

### Issue 2: "PKCE code_verifier missing from sessionStorage"

**Symptom**: Callback page shows this error message

**Cause**: SessionStorage was cleared or blocked between login initiation and callback

**Fix**:
1. Check browser console for errors about blocked storage
2. Ensure cookies/storage are enabled in browser settings
3. Try incognito/private mode to rule out extensions
4. Clear all site data and try again

**Solution**: Usually a browser privacy setting issue

---

### Issue 3: "Azure AD configuration missing"

**Symptom**: Login button click shows error in console: "Azure AD configuration missing"

**Cause**: Missing `NEXT_PUBLIC_AZURE_CLIENT_ID` environment variable

**Fix**:

**For Local Development**:
```bash
# Check .env.local file
cat .env.local | grep NEXT_PUBLIC_AZURE_CLIENT_ID

# Should show:
NEXT_PUBLIC_AZURE_CLIENT_ID=479e2a01-70ab-4df9-baa4-560d317c3423

# If missing, add it and restart dev server
echo "NEXT_PUBLIC_AZURE_CLIENT_ID=479e2a01-70ab-4df9-baa4-560d317c3423" >> .env.local
npm run dev
```

**For Production**:
1. Check if build arg was passed in GitHub Actions workflow
2. Verify variable is set in GitHub repository settings
3. Re-run the deployment workflow to rebuild with correct env vars

---

### Issue 4: Infinite Redirect Loop

**Symptom**: Browser keeps redirecting between `/login` and `/dashboard`

**Cause**: Middleware can't find auth cookies, so it redirects to `/login`, but login thinks you're already authenticated

**Fix**:
1. Check browser DevTools → Application → Cookies
2. Look for these cookie names:
   - `greenchainz-auth-token`
   - `token`
   - `authjs.session-token`
3. If cookies are missing, check backend `/api/auth/azure-callback` response
4. Verify cookies are set with correct domain/path

**Solution**: Usually a backend cookie-setting issue

---

## 🔐 Security Checklist

### Azure AD App Configuration
- [ ] Redirect URIs are **explicitly listed** (no wildcards)
- [ ] Supported account types: "Multi-tenant + Personal Microsoft accounts"
- [ ] API permissions granted: `openid`, `profile`, `email`
- [ ] Admin consent given (if required by organization policy)
- [ ] Application is **not** using implicit flow (we use authorization code + PKCE)

### Environment Variables
- [ ] **Never commit** `.env.local` to git (should be in `.gitignore`)
- [ ] Client secret stored in Azure Key Vault (not in code)
- [ ] GitHub secrets are configured with proper access controls
- [ ] Production uses different credentials than staging/dev

### PKCE Implementation
- [ ] `code_verifier` generated with sufficient entropy (32 bytes)
- [ ] `code_challenge` uses SHA-256 hash
- [ ] `code_verifier` stored in sessionStorage (not localStorage)
- [ ] `code_verifier` is cleared after successful token exchange

### Network Security
- [ ] Production uses HTTPS only
- [ ] Cookies set with `secure: true` in production
- [ ] Cookies set with `httpOnly: true` to prevent XSS
- [ ] Cookies set with `sameSite: 'lax'` or `'strict'`

---

## 📊 RBAC Findings (Not Fixed in This PR)

### Current State Analysis

**Multiple Cookie Names in Use**:
```typescript
// middleware.ts checks for 4 different cookie names:
'authjs.session-token'         // NextAuth
'__Secure-authjs.session-token' // NextAuth (HTTPS)
'greenchainz-auth-token'       // Custom JWT (Azure callback)
'token'                        // Legacy
```

**Recommendation**: Standardize on one cookie name across all auth flows in future refactor.

---

**Multiple Auth Flows**:
1. NextAuth with credentials provider
2. NextAuth with OAuth providers (Google, LinkedIn)
3. Azure AD with PKCE (new)
4. Azure AD with MSAL (legacy)

**Recommendation**: Document which flow is preferred for new users and plan deprecation of legacy flows.

---

**Token Refresh Not Integrated**:
- `/api/auth/refresh` endpoint exists
- Not called from new PKCE flow
- May cause sessions to expire prematurely

**Recommendation**: Add token refresh logic to PKCE flow.

---

**Role-Based Routing**:
```typescript
const redirectTo = userRole === "supplier" 
  ? "/dashboard" 
  : "/dashboard/buyer";
```

**Current**: Only handles "supplier" vs others
**Future**: May need to add "admin" role with different dashboard

**Recommendation**: Create role routing config object for easier maintenance.

---

## 🎬 Next Steps After Login Works

1. **Monitor Auth Metrics** - Check Azure Application Insights for:
   - Auth success/failure rates
   - Token exchange latency
   - Error types and frequencies

2. **Plan MSAL Deprecation** - Set timeline to phase out legacy MSAL flow:
   - Week 1-2: Monitor new PKCE flow adoption
   - Week 3-4: Add deprecation notice for MSAL flow
   - Month 2: Remove MSAL dependencies

3. **Add Token Refresh** - Implement token refresh in PKCE flow:
   - Detect token expiration
   - Call `/api/auth/refresh` endpoint
   - Update sessionStorage/cookies

4. **Deploy Auth Agent** - From Space instructions:
   - Deploy to Azure AI Foundry
   - Connect to authenticated sessions
   - Test with sample RFQ

5. **Test with Real Users** - Invite first supplier accounts:
   - Monitor for any edge cases
   - Gather feedback on login UX
   - Iterate on improvements

---

## 📞 Support Contacts

**For Technical Issues**:
- Application Insights: Monitor auth failures
- Container App Logs: Check deployment issues
- GitHub Actions: Review build/deploy logs

**For Azure Configuration**:
- Azure Portal → Support → New support request
- Provide: Application ID, Tenant ID, Timestamp of issue

**For Code Questions**:
- See `AZURE_AD_SETUP.md` for detailed implementation notes
- Review this PR for code changes and rationale

---

**Last Updated**: 2026-02-02
**PR Branch**: `copilot/fix-azure-ad-login`
**Status**: ✅ Ready for Review & Testing
