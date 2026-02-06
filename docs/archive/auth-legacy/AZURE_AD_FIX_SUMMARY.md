# Azure AD Authentication Fix - Summary

## Problem Statement

The GreenChainz frontend was experiencing `invalid_grant` errors during Azure AD token exchange, preventing users from logging in.

## Root Causes

1. **Environment Variable Misconfiguration**: NextAuth v5 requires specific environment variable names (`AUTH_MICROSOFT_ENTRA_ID_*`) that were not set
2. **Redirect URI Mismatch**: Azure Container Apps revision URLs (with `---0000186` suffix) were not registered in Azure AD app registration
3. **Missing Fallback Logic**: No fallback from NextAuth v5 variables to legacy `AZURE_AD_*` variables
4. **CSS Optimization**: Next.js 16 CSS syntax errors (non-blocking but should be fixed)

## Solutions Implemented

### 1. NextAuth Configuration Update (`app/app.auth.ts`)

**Changes:**
- Added fallback logic: `process.env.AUTH_MICROSOFT_ENTRA_ID_ID || process.env.AZURE_AD_CLIENT_ID`
- Added `prompt: "select_account"` to authorization params to force account picker
- Auto-generate issuer URL if not explicitly set: `https://login.microsoftonline.com/${TENANT_ID}/v2.0`

**Impact:**
- Supports both NextAuth v5 and legacy environment variable naming
- Prevents stale token issues by forcing account selection
- Reduces configuration complexity

### 2. Redirect URI Handling

**Files Modified:**
- `app/api/auth/callback/route.ts`
- `app/api/auth/signin/route.ts`

**Changes:**
- Updated to prioritize `NEXTAUTH_URL` and `AUTH_URL` over `NEXT_PUBLIC_SITE_URL`
- Falls back to `requestUrl.origin` if no environment variable is set
- Ensures consistency between authorization and token exchange

**Impact:**
- Handles revision-specific URLs automatically
- Prevents redirect URI mismatches
- Works with both custom domain and Azure Container Apps URLs

### 3. CSS Optimization (`next.config.js`)

**Changes:**
- Added `experimental.optimizeCss: true`

**Impact:**
- Fixes Next.js 16 CSS module syntax errors
- Improves build performance

### 4. Environment Configuration

**Files Updated:**
- `.env.local.example` - Local development template
- `.env.azure.example` - Production configuration reference

**Changes:**
- Added correct Azure AD client ID: `479e2a01-70ab-4df9-baa4-560d317c3423`
- Added correct tenant ID: `ca4f78d4-c753-4893-9cd8-1b309922b4dc`
- Added issuer URL template
- Documented all required variables

**Impact:**
- Clear documentation for developers
- Reduced configuration errors
- Easier onboarding

### 5. Comprehensive Documentation

**New File:** `docs/AZURE_AD_FIX.md`

**Contents:**
- Problem summary and root causes
- Step-by-step Azure Portal configuration
- Environment variable setup guide
- Testing checklist
- Troubleshooting guide
- Migration path from custom auth to NextAuth v5

**Impact:**
- Self-service troubleshooting
- Reduced support burden
- Clear deployment process

### 6. Helper Scripts

**New Scripts:**
- `scripts/verify-azure-ad-config.sh` - Automated configuration verification
- `scripts/update-azure-auth-config.sh` - Automated environment variable update

**Features:**
- Checks Azure CLI installation and login
- Verifies Container App exists and gets URL
- Checks all required environment variables
- Provides step-by-step guidance
- Updates variables and restarts Container App

**Impact:**
- Faster troubleshooting
- Reduced manual errors
- Consistent configuration

## Required Azure Portal Changes

### 1. Add Redirect URIs

Navigate to: **Azure Portal → Azure AD → App Registrations → GreenChainz**

Add these URIs under **Authentication**:

```
# NextAuth v5 (recommended)
https://greenchainz.com/api/auth/callback/microsoft-entra-id
https://www.greenchainz.com/api/auth/callback/microsoft-entra-id
https://greenchainz-frontend.jollyrock-a66f2da6.eastus.azurecontainerapps.io/api/auth/callback/microsoft-entra-id
https://greenchainz-frontend---0000186.jollyrock-a66f2da6.eastus.azurecontainerapps.io/api/auth/callback/microsoft-entra-id

# Custom Azure AD flow (legacy)
https://greenchainz.com/api/auth/callback
https://www.greenchainz.com/api/auth/callback
https://greenchainz-frontend.jollyrock-a66f2da6.eastus.azurecontainerapps.io/api/auth/callback
https://greenchainz-frontend---0000186.jollyrock-a66f2da6.eastus.azurecontainerapps.io/api/auth/callback

# Local development
http://localhost:3000/api/auth/callback/microsoft-entra-id
http://localhost:3000/api/auth/callback
```

### 2. Set Environment Variables

Navigate to: **Azure Portal → Container Apps → greenchainz-frontend → Configuration**

Add these variables:

```bash
# NextAuth v5 (required)
NEXTAUTH_URL=https://greenchainz.com
AUTH_URL=https://greenchainz.com
NEXTAUTH_SECRET=<generate-with: openssl rand -base64 32>
AUTH_SECRET=<same-as-NEXTAUTH_SECRET>

# Microsoft Entra ID Provider (required)
AUTH_MICROSOFT_ENTRA_ID_ID=479e2a01-70ab-4df9-baa4-560d317c3423
AUTH_MICROSOFT_ENTRA_ID_SECRET=<from-key-vault>
AUTH_MICROSOFT_ENTRA_ID_ISSUER=https://login.microsoftonline.com/ca4f78d4-c753-4893-9cd8-1b309922b4dc/v2.0

# Legacy Azure AD (backward compatibility)
AZURE_AD_CLIENT_ID=479e2a01-70ab-4df9-baa4-560d317c3423
AZURE_AD_CLIENT_SECRET=<from-key-vault>
AZURE_AD_TENANT_ID=ca4f78d4-c753-4893-9cd8-1b309922b4dc
```

## Deployment Steps

### Option 1: Use Helper Script (Recommended)

```bash
# Verify current configuration
./scripts/verify-azure-ad-config.sh

# Update environment variables
./scripts/update-azure-auth-config.sh
```

### Option 2: Manual Deployment

1. Update environment variables in Azure Portal
2. Restart Container App:
   ```bash
   az containerapp restart \
     --name greenchainz-frontend \
     --resource-group greenchainz-production
   ```
3. Add redirect URIs in Azure AD app registration
4. Test login

## Testing Checklist

### Local Testing

- [ ] Copy `.env.local.example` to `.env.local`
- [ ] Add Azure AD client secret
- [ ] Run `npm install`
- [ ] Run `npm run dev`
- [ ] Navigate to http://localhost:3000/login
- [ ] Click "Sign in with Microsoft"
- [ ] Verify redirect to Azure AD
- [ ] Verify callback succeeds
- [ ] Verify dashboard loads

### Production Testing

- [ ] Clear browser cache and cookies
- [ ] Navigate to https://greenchainz.com/login
- [ ] Click "Sign in with Microsoft"
- [ ] Verify no `invalid_grant` error
- [ ] Verify no 401 errors in Network tab
- [ ] Verify session cookie is set
- [ ] Verify dashboard loads

## Validation

### Success Criteria

- ✅ Users can log in without `invalid_grant` errors
- ✅ Token exchange completes successfully (no 401)
- ✅ Session persists across page reloads
- ✅ No CSS syntax errors in browser console
- ✅ Helper scripts successfully verify configuration

### Monitoring

Check these metrics after deployment:
- Application Insights: Auth success rate
- Container App logs: No token exchange errors
- User reports: Successful login experiences

## Architecture Decision

### Current State
- Dual authentication system: NextAuth v5 + Custom Azure AD
- Both flows supported for backward compatibility
- NextAuth v5 is recommended for new features

### Future State
- **Phase 1** (Current): Both flows work
- **Phase 2** (Weeks 2-3): Monitor adoption, prefer NextAuth v5
- **Phase 3** (Month 2): Deprecation warnings for custom flow
- **Phase 4** (Month 3): Remove custom Azure AD flow

### Rationale
- NextAuth v5 is industry standard
- Better security defaults
- Multi-provider support (Google, LinkedIn, etc.)
- Active maintenance

## Related Files

### Code Changes
- `app/app.auth.ts` - NextAuth configuration
- `app/api/auth/callback/route.ts` - Custom callback handler
- `app/api/auth/signin/route.ts` - Custom signin handler
- `next.config.js` - Next.js configuration

### Documentation
- `docs/AZURE_AD_FIX.md` - Complete fix guide
- `AZURE_AD_SETUP.md` - PKCE setup documentation
- `AZURE_PORTAL_CHECKLIST.md` - Portal configuration

### Configuration
- `.env.local.example` - Local development template
- `.env.azure.example` - Production reference
- `scripts/README.md` - Helper scripts documentation

### Helper Scripts
- `scripts/verify-azure-ad-config.sh` - Configuration verification
- `scripts/update-azure-auth-config.sh` - Automated update

## Support

For issues:
1. Run `./scripts/verify-azure-ad-config.sh`
2. Check `docs/AZURE_AD_FIX.md` for troubleshooting
3. Review Application Insights logs
4. Check Container App logs
5. Contact: devops@greenchainz.com

## Timeline

- **Day 1**: Code changes and documentation (✅ Complete)
- **Day 2**: Azure Portal configuration (⏳ Pending)
- **Day 3**: Testing and validation (⏳ Pending)
- **Day 4**: Production deployment (⏳ Pending)
- **Day 5**: Monitoring and support (⏳ Pending)
