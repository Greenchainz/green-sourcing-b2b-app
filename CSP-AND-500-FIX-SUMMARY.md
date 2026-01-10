# CSP and 500 Error Fix Summary

## 🔧 Issues Fixed

### 1. **CSP Violations - Ketch and Intercom Scripts Blocked**
**Problem:** Content Security Policy was blocking required third-party scripts:
- `https://cdn.ketchjs.com/ketchtag/stable/v2.12/ketch-sdk.js` (Ketch consent management)
- `https://widget.intercom.io/widget/w0p2831g` (Intercom chat widget)

**Root Cause:**
- Backend Helmet CSP didn't include required domains
- Frontend Next.js CSP header didn't include required domains

**Fix:**
- ✅ Updated `backend/index.js` - Added Ketch and Intercom domains to Helmet CSP
- ✅ Updated `next.config.js` - Added Ketch and Intercom domains to CSP header

**Files Changed:**
- `backend/index.js` (lines 88-153)
- `next.config.js` (line 45)

---

### 2. **CORS Error - Frontend Container App Blocked**
**Problem:** 
```
Error: CORS blocked for origin: https://greenchainz-frontend.jollyrock-a66f2da6.eastus.azurecontainerapps.io
```

**Root Cause:**
- Backend CORS configuration only checked exact origin matches
- Frontend container app URL (`*.azurecontainerapps.io`) wasn't in allowed origins
- `FRONTEND_URL` env var was set to `https://greenchainz.com`, not the actual frontend container URL

**Fix:**
- ✅ Updated CORS logic to accept Azure Container Apps subdomains via regex pattern
- ✅ Added greenchainz.com and www.greenchainz.com to default allowed origins

**Files Changed:**
- `backend/index.js` (lines 51-85)

**Changes Made:**
```javascript
// Now accepts: https://*.azurecontainerapps.io
const azureContainerAppsPattern = /^https:\/\/.*\.azurecontainerapps\.io$/;
```

---

### 3. **CSRF Token Error - Auth Routes Blocked** ⚠️ **CRITICAL FIX**
**Problem:**
```
Error: CSRF token missing
```

**Root Cause:**
- Lusca CSRF middleware was blocking `/api/v1/auth/me` and other auth endpoints
- **CRITICAL BUG:** `excludePathPrefixes` option does NOT exist in lusca 1.7.0
- The invalid option was silently ignored, causing CSRF to apply to ALL routes
- CSRF protection is not needed for API routes using JWT authentication

**Fix:**
- ✅ **CRITICAL FIX:** `excludePathPrefixes` option does NOT exist in lusca 1.7.0 - must exclude manually
- ✅ Updated CSRF to apply conditionally based on path (manually check exclusions)
- ✅ Excluded all `/api/` routes (JWT-based, not session-based)
- ✅ Excluded `/auth/` routes for OAuth callbacks
- ✅ Excluded health check endpoints
- ✅ Skip CSRF for GET, OPTIONS, and HEAD requests (read-only/preflight)

**Files Changed:**
- `backend/index.js` (lines 154-186)

**Changes Made:**
```javascript
// IMPORTANT: lusca 1.7.0 does NOT support excludePathPrefixes - must exclude manually
const csrfMiddleware = lusca.csrf({
  cookie: {
    name: '_csrf',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict'
  }
});

app.use((req, res, next) => {
  const excludedPaths = ['/api/', '/auth/', '/health', '/ready', '/diagnose'];
  const isExcluded = excludedPaths.some(path => req.path.startsWith(path));
  
  // Skip CSRF for excluded paths, GET/OPTIONS/HEAD requests
  if (isExcluded || req.method === 'GET' || req.method === 'OPTIONS' || req.method === 'HEAD') {
    return next();
  }
  
  // Apply CSRF only to state-changing methods on non-excluded paths
  return csrfMiddleware(req, res, next);
});
```

---

## 📋 Deployment Steps

### Backend Deployment (Required)

1. **Build and push new Docker image:**
   ```bash
   # From project root
   az acr build --registry acrgreenchainzprod916 \
     --image greenchainz-backend:latest \
     --file Dockerfile.backend .
   
   # Container app will auto-deploy new revision
   ```

2. **Verify deployment:**
   ```bash
   az containerapp revision list \
     --name greenchainz-container \
     --resource-group rg-greenchainz-prod-container \
     --query "[0].name" \
     --output tsv
   ```

3. **Check logs for errors:**
   ```bash
   az containerapp logs show \
     --name greenchainz-container \
     --resource-group rg-greenchainz-prod-container \
     --tail 100 \
     --type console
   ```

### Frontend Deployment (Required)

1. **Set environment variable** (if not already set):
   ```bash
   # For Next.js deployment (Vercel/Container App/etc)
   NEXT_PUBLIC_BACKEND_URL=https://greenchainz-container.jollyrock-a66f2da6.eastus.azurecontainerapps.io
   ```

2. **Rebuild Next.js app** (CSP is set at build time):
   ```bash
   npm run build
   # Then deploy the built app
   ```

3. **If using Azure Container Apps for frontend:**
   ```bash
   # Update environment variable
   az containerapp update \
     --name greenchainz-frontend \
     --resource-group rg-greenchainz-prod-container \
     --set-env-vars "NEXT_PUBLIC_BACKEND_URL=https://greenchainz-container.jollyrock-a66f2da6.eastus.azurecontainerapps.io"
   ```

---

## 🧪 Testing After Deployment

### 1. Test CSP - Check Browser Console
- ✅ Ketch scripts should load: `https://cdn.ketchjs.com/ketchtag/stable/v2.12/ketch-sdk.js`
- ✅ Intercom widget should load: `https://widget.intercom.io/widget/w0p2831g`
- ✅ No CSP violation errors in console

### 2. Test CORS - Check Network Tab
```bash
# Test from frontend
curl -H "Origin: https://greenchainz-frontend.jollyrock-a66f2da6.eastus.azurecontainerapps.io" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: authorization" \
     -X OPTIONS \
     https://greenchainz-container.jollyrock-a66f2da6.eastus.azurecontainerapps.io/api/v1/auth/me
```

### 3. Test Auth Endpoints
```bash
# Test /api/v1/auth/me (should work without CSRF error)
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     https://greenchainz-container.jollyrock-a66f2da6.eastus.azurecontainerapps.io/api/v1/auth/me

# Test /api/auth/azure-token-exchange (from frontend, should not return 500)
```

### 4. Test Health Endpoints
```bash
curl https://greenchainz-container.jollyrock-a66f2da6.eastus.azurecontainerapps.io/health
curl https://greenchainz-container.jollyrock-a66f2da6.eastus.azurecontainerapps.io/ready
```

---

## ✅ Expected Results

After deployment:

1. **CSP Violations:**
   - ✅ Ketch SDK loads successfully
   - ✅ Intercom widget loads successfully
   - ✅ No CSP errors in browser console

2. **CORS Errors:**
   - ✅ Frontend container app can make requests to backend
   - ✅ No "CORS blocked" errors in logs
   - ✅ API responses include proper CORS headers

3. **CSRF Errors:**
   - ✅ `/api/v1/auth/me` returns 200 or 401 (not 500)
   - ✅ `/api/auth/azure-token-exchange` works without CSRF errors
   - ✅ All API routes work without CSRF tokens

4. **500 Errors:**
   - ✅ Auth endpoints return proper status codes (200, 401, 400, not 500)
   - ✅ Backend logs show no CORS or CSRF blocking errors

---

## 📊 Success Criteria

- [ ] No CSP violations in browser console
- [ ] Ketch consent banner appears and works
- [ ] Intercom chat widget appears and works
- [ ] `/api/v1/auth/me` returns 401 with invalid token (not 500)
- [ ] `/api/auth/azure-token-exchange` returns 400 with invalid input (not 500)
- [ ] Frontend can successfully authenticate users
- [ ] No CORS errors in backend logs
- [ ] No CSRF errors in backend logs

---

## 🔍 Troubleshooting

### If CSP violations still occur:
1. Check browser cache - hard refresh (Ctrl+Shift+R)
2. Verify Next.js app was rebuilt (CSP is build-time)
3. Check browser console for exact blocked resource
4. Verify CSP header in response: `curl -I https://your-frontend-url | grep -i "content-security-policy"`

### If CORS errors still occur:
1. Check backend logs for exact origin being blocked
2. Verify frontend origin matches pattern: `https://*.azurecontainerapps.io`
3. Test with curl to see actual CORS headers
4. Check `FRONTEND_URL` env var in container app

### If CSRF errors still occur:
1. Verify all `/api/` routes are excluded
2. Check if request is actually hitting `/api/` path
3. Verify Lusca version supports `excludePathPrefixes`
4. Check backend logs for exact path being blocked

### If 500 errors still occur:
1. Check backend logs: `az containerapp logs show --name greenchainz-container --resource-group rg-greenchainz-prod-container --tail 200`
2. Test endpoint directly: `curl https://greenchainz-container.../api/v1/auth/me`
3. Verify environment variables are set correctly
4. Check database connectivity

---

## 📝 Files Modified

1. **backend/index.js**
   - Lines 51-85: CORS configuration (added Azure Container Apps pattern)
   - Lines 88-153: CSP configuration (added Ketch and Intercom domains)
   - Lines 154-188: CSRF configuration (**CRITICAL FIX**: manually exclude paths - `excludePathPrefixes` doesn't exist in lusca 1.7.0)

2. **next.config.js**
   - Line 45: CSP header (added Ketch and Intercom domains)

---

## 🎯 Odds Assessment: **90%**

**Reasons:**
- ✅ All fixes are code-based (no infrastructure changes needed)
- ✅ Fixes address root causes identified in logs
- ✅ Patterns match Azure Container Apps architecture
- ⚠️ Requires rebuild/redeploy (not just code changes)
- ⚠️ Frontend CSP requires Next.js rebuild (build-time configuration)

**Risk Factors:**
- Frontend deployment might need manual rebuild if using different deployment method
- ~~Need to verify Lusca `excludePathPrefixes` works with wildcards~~ ✅ **FIXED**: Manual path exclusion implemented (option doesn't exist)
- Azure Container Apps subdomain pattern might need adjustment if domain structure differs

**Critical Fix Applied:**
- ✅ **CRITICAL:** Fixed CSRF configuration - `excludePathPrefixes` option does NOT exist in lusca 1.7.0
- ✅ Implemented manual path exclusion middleware (proper fix)
- ✅ All `/api/` routes now correctly excluded from CSRF protection

---

**Fixed by:** Auto (AI Assistant)  
**Date:** January 10, 2026  
**Status:** ✅ Code fixes complete, awaiting deployment
