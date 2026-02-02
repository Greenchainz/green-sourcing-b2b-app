# Quick Deployment Checklist

Use this checklist to deploy the Azure AD authentication fix to production.

## Prerequisites

- [ ] Azure CLI installed
- [ ] Logged into Azure (`az login`)
- [ ] Access to Azure Key Vault (to get client secret)
- [ ] Contributor or Owner role on Container App
- [ ] Access to Azure Portal (to add redirect URIs)

## Step 1: Verify Current Configuration (5 min)

```bash
cd /home/runner/work/green-sourcing-b2b-app/green-sourcing-b2b-app
./scripts/verify-azure-ad-config.sh
```

**Expected Output:**
- Green checkmarks for Container App and Azure CLI
- Red X's for missing environment variables (we'll fix these next)
- List of redirect URIs to add in Azure Portal

**Action:** Note which environment variables are missing.

## Step 2: Get Azure AD Client Secret (2 min)

1. Go to: **Azure Portal** → **Key Vaults** → **Greenchainz-vault-2026**
2. Navigate to: **Secrets** → **AzureAD-ClientSecret**
3. Click on the **current version**
4. Click **"Show Secret Value"**
5. **Copy the value** (you'll need it in the next step)

⚠️ **Important**: Do NOT commit this secret to git. The script will handle it securely.

## Step 3: Update Environment Variables (5 min)

```bash
./scripts/update-azure-auth-config.sh
```

**The script will prompt you for:**
1. Azure AD Client Secret (paste from Step 2)
2. NextAuth Secret (choose to generate new or provide existing)

**What it does:**
- Sets all required NextAuth environment variables
- Sets Azure AD provider variables
- Restarts the Container App

**Expected Output:**
```
✓ Environment variables updated
✓ Container App restarted
```

## Step 4: Add Redirect URIs in Azure Portal (10 min)

1. Go to: **Azure Portal** → **Azure Active Directory** → **App Registrations**
2. Find: **GreenChainz** (Client ID: `479e2a01-70ab-4df9-baa4-560d317c3423`)
3. Click: **Authentication** in the left menu
4. Under **Platform configurations** → **Web** → **Redirect URIs**, add these:

### Required URIs:

**NextAuth v5 (recommended):**
```
https://greenchainz.com/api/auth/callback/microsoft-entra-id
https://www.greenchainz.com/api/auth/callback/microsoft-entra-id
https://greenchainz-frontend.jollyrock-a66f2da6.eastus.azurecontainerapps.io/api/auth/callback/microsoft-entra-id
```

**Custom Azure AD flow (legacy, for backward compatibility):**
```
https://greenchainz.com/api/auth/callback
https://www.greenchainz.com/api/auth/callback
https://greenchainz-frontend.jollyrock-a66f2da6.eastus.azurecontainerapps.io/api/auth/callback
```

**Local development:**
```
http://localhost:3000/api/auth/callback/microsoft-entra-id
http://localhost:3000/api/auth/callback
```

**Note:** If your Container App has a revision-specific URL (with `---0000186`), add that too.

5. Click **Save** at the top

## Step 5: Verify Token Configuration (1 min)

While in the Azure Portal Authentication page:

- [ ] ✅ **ID tokens** (used for sign-ins) - Should be checked
- [ ] ✅ **Access tokens** (used for implicit flows) - Should be checked

If not checked, check them and click **Save**.

## Step 6: Verify API Permissions (1 min)

1. Click **API permissions** in the left menu
2. Verify these permissions are granted:
   - [ ] `openid`
   - [ ] `profile`
   - [ ] `email`
   - [ ] `User.Read` (Microsoft Graph)
3. Check **Status** column - should show **"Granted for ..."**
4. If not granted, click **"Grant admin consent for [tenant]"**

## Step 7: Test Login Flow (5 min)

### Clear Browser Cache First
```javascript
// In browser DevTools console (F12)
sessionStorage.clear()
localStorage.clear()
location.reload()
```

### Test Login
1. Open: **https://greenchainz.com/login**
2. Click: **"Sign in with Microsoft"**
3. **Expected:** Redirects to Microsoft login page
4. Enter credentials and sign in
5. **Expected:** Redirects back to greenchainz.com
6. **Expected:** Dashboard loads successfully
7. **Expected:** No errors in browser console

### Verify in Network Tab
1. Open DevTools (F12) → **Network** tab
2. Look for request to: `/api/auth/callback/microsoft-entra-id` or `/api/auth/callback`
3. **Expected status:** 302 (redirect to dashboard)
4. **Expected cookies set:** `authjs.session-token` or `__Secure-authjs.session-token`

## Step 8: Monitor Logs (5 min)

```bash
# Check Container App logs for any errors
az containerapp logs show \
  --name greenchainz-frontend \
  --resource-group greenchainz-production \
  --tail 50 \
  --follow
```

**Look for:**
- ✅ No errors related to authentication
- ✅ Successful token exchanges
- ✅ Session creation logs

**Press Ctrl+C** to stop following logs.

## Step 9: Verify Configuration Again (2 min)

```bash
./scripts/verify-azure-ad-config.sh
```

**Expected Output:**
- Green checkmarks for ALL environment variables
- No red X's
- Summary shows all required variables are set

## Troubleshooting

### Error: "invalid_grant" still occurring

**Check 1: Redirect URI Exact Match**
```bash
# In browser Network tab, find the authorization request
# Check the redirect_uri parameter
# Ensure it EXACTLY matches one in Azure Portal (no trailing slash, correct protocol)
```

**Check 2: Client Secret is Correct**
```bash
# Verify the secret you entered matches the one in Key Vault
# If unsure, regenerate the secret:
# Azure Portal → App Registrations → Certificates & secrets → + New client secret
# Then re-run: ./scripts/update-azure-auth-config.sh
```

**Check 3: Container App Restarted**
```bash
# Manually restart if automatic restart failed
az containerapp restart \
  --name greenchainz-frontend \
  --resource-group greenchainz-production
```

### Error: Still seeing CSS syntax errors

**Solution:**
```bash
# The CSS fix is in next.config.js
# Requires a rebuild - push to main to trigger GitHub Actions
git push origin copilot/fix-token-exchange-error:main
```

### Error: "NEXTAUTH_URL not set" in logs

**Solution:**
```bash
# Re-run the update script
./scripts/update-azure-auth-config.sh

# Or manually set via Azure Portal:
# Container Apps → greenchainz-frontend → Configuration → Environment variables
# Add: NEXTAUTH_URL=https://greenchainz.com
```

## Success Criteria

- [ ] Users can sign in without `invalid_grant` errors
- [ ] Token exchange completes successfully (no 401 errors)
- [ ] Session persists across page reloads
- [ ] Dashboard loads after successful login
- [ ] No authentication errors in Container App logs
- [ ] No CSS syntax errors in browser console
- [ ] Verification script shows all green checkmarks

## Rollback Plan

If authentication is completely broken:

```bash
# Restore previous environment variables
# (You should have backed up the current values before starting)

# Or revert to previous Container App revision
az containerapp revision list \
  --name greenchainz-frontend \
  --resource-group greenchainz-production

az containerapp revision activate \
  --name greenchainz-frontend \
  --resource-group greenchainz-production \
  --revision <previous-revision-name>
```

## Post-Deployment

### Monitor Auth Success Rate
- Check Application Insights for auth metrics
- Monitor for next 24 hours
- Review user feedback

### Update Documentation
- [ ] Mark this fix as deployed in JIRA/GitHub issues
- [ ] Update team wiki with new auth flow
- [ ] Send deployment summary to stakeholders

### Next Steps
- Phase out legacy auth flow in 2-3 months
- Monitor adoption of NextAuth v5
- Plan migration of existing sessions

## Estimated Time

- **Total:** ~35 minutes
- Prerequisites: 0 min (should already be done)
- Steps 1-3: 12 minutes
- Steps 4-6: 12 minutes
- Steps 7-9: 12 minutes

## Support

Issues? Check these resources:
1. `docs/AZURE_AD_FIX.md` - Comprehensive troubleshooting guide
2. Application Insights - Auth error logs
3. Container App logs - Detailed error messages
4. Contact: devops@greenchainz.com

## Completion

- [ ] All steps completed
- [ ] All success criteria met
- [ ] Tested by at least 2 users
- [ ] No errors in logs for 1 hour
- [ ] Deployment documented
- [ ] Team notified

**Date Deployed:** ___________  
**Deployed By:** ___________  
**Issues Encountered:** ___________  
**Resolution Time:** ___________
