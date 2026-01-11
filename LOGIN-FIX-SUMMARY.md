# Login Issue Fix Summary

## 🔧 Issues Fixed

### 1. **Database Schema Mismatch** (NEW - January 2026)

**Problem:** The backend auth code expected different column names and tables than what existed in the database schema.

**Root Causes:**

- Auth code expects lowercase columns (`id`, `first_name`, `azure_id`) but schema used PascalCase (`UserID`, `FirstName`)
- Missing `azure_id` column for Azure AD user identity
- Missing `RefreshTokens` table for session management
- Role constraint only allowed 'Admin', 'Buyer', 'Supplier' but auth code uses 'architect', 'supplier'

**Fix:**
- Created database migration: `database-schemas/migrations/20260107_000000_add_azure_auth_columns.sql`
- Adds `id`, `first_name`, `last_name`, `azure_id`, `last_login` columns to Users table
- Creates `RefreshTokens` table with proper foreign key to Users
- Updates role constraint to allow 'architect' and 'supplier' values
- Adds triggers to keep lowercase columns in sync with PascalCase columns

**How to apply the fix:**
```bash
# Run the migration against your database
docker exec -i greenchainz-db psql -U user -d greenchainz_dev < database-schemas/migrations/20260107_000000_add_azure_auth_columns.sql

# Or if running PostgreSQL locally
psql -U postgres -d greenchainz_dev -f database-schemas/migrations/20260107_000000_add_azure_auth_columns.sql
```

### 2. **Backend URL Resolution Too Strict**
**Problem:** The backend URL resolution function was rejecting valid URLs in development environments.

**Fix:**
- Added fallback to `http://localhost:3001` when no URL is configured
- Made development mode more permissive (allows non-standard URLs)
- Added better error messages when backend URL is invalid
- Priority order: header > INTERNAL_BACKEND_URL > NEXT_PUBLIC_BACKEND_URL > BACKEND_URL > localhost fallback

**Files Changed:**
- `app/api/auth/azure-token-exchange/route.ts`
- `app/api/auth/azure-callback/route.ts`

### 2. **Poor Error Handling**
**Problem:** Errors were generic and didn't help diagnose connection issues.

**Fix:**
- Added detailed console logging for debugging
- Improved error messages to indicate if backend is down
- Better JSON error parsing (handles both JSON and text responses)
- Specific error messages for network failures (502 errors)

**Files Changed:**
- `app/api/auth/azure-token-exchange/route.ts`
- `app/api/auth/azure-callback/route.ts`
- `lib/auth.ts`
- `app/login/callback/CallbackClient.tsx`

### 3. **Timeout Too Short**
**Problem:** 10-second timeout was too short for slow networks or cold starts.

**Fix:**
- Increased timeout from 10s to 15s

**Files Changed:**
- `app/api/auth/azure-token-exchange/route.ts`
- `app/api/auth/azure-callback/route.ts`

## 🧪 How to Test

### 1. **Check Backend is Running**
```bash
# Test backend health endpoint
curl http://localhost:3001/api/v1/health

# Or check if backend container is running
docker ps | grep backend
```

### 2. **Check Environment Variables**
Make sure these are set (in `.env.local` or environment):
```bash
# Frontend
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001  # or your backend URL
NEXT_PUBLIC_AZURE_CLIENT_ID=your-client-id
NEXT_PUBLIC_AZURE_TENANT=your-tenant-id

# Backend (if running separately)
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret
AZURE_TENANT_ID=your-tenant-id
JWT_SECRET=your-jwt-secret
```

### 3. **Test Login Flow**
1. Navigate to `/login`
2. Click "Sign in with Microsoft"
3. Complete Azure AD authentication
4. Should redirect back and create session

### 4. **Check Browser Console**
Enable debug mode by setting:
```bash
NEXT_PUBLIC_AUTH_DEBUG=true
```

This will show detailed step-by-step logging in the browser console.

## 🐛 Common Issues & Solutions

### Issue: "Database error" or "column does not exist"
**Solution:**
Run the database migration to add required auth columns:
```bash
# Docker
docker exec -i greenchainz-db psql -U user -d greenchainz_dev < database-schemas/migrations/20260107_000000_add_azure_auth_columns.sql

# Local PostgreSQL
psql -U postgres -d greenchainz_dev -f database-schemas/migrations/20260107_000000_add_azure_auth_columns.sql
```

### Issue: "Cannot connect to backend service"
**Solution:**
1. Ensure backend is running: `cd backend && npm start`
2. Check backend URL is correct in environment variables
3. Verify backend is accessible: `curl http://localhost:3001/api/v1/health`
4. Check CORS settings if backend is on different domain

### Issue: "Missing or invalid BACKEND_URL"
**Solution:**
1. Set `NEXT_PUBLIC_BACKEND_URL` in `.env.local`
2. Or set `BACKEND_URL` environment variable
3. Default fallback is `http://localhost:3001`

### Issue: "Token exchange failed"
**Solution:**
1. Check Azure AD app registration settings
2. Verify redirect URI matches: `http://localhost:3000/login/callback`
3. Check Azure client ID and secret are correct
4. Verify Azure tenant ID is correct

### Issue: "Sign-in session expired or invalid state"
**Solution:**
1. Clear browser session storage
2. Try logging in again
3. This happens if you navigate away during login

## 📋 Required Environment Variables

### Frontend (`.env.local`)
```bash
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
NEXT_PUBLIC_AZURE_CLIENT_ID=your-azure-client-id
NEXT_PUBLIC_AZURE_TENANT=your-tenant-id.onmicrosoft.com
NEXT_PUBLIC_AUTH_DEBUG=true  # Optional: for debugging
```

### Backend (`.env` or environment)
```bash
AZURE_CLIENT_ID=your-azure-client-id
AZURE_CLIENT_SECRET=your-azure-client-secret
AZURE_TENANT_ID=your-tenant-id.onmicrosoft.com
JWT_SECRET=your-jwt-secret-min-32-chars
BACKEND_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3000
```

## ✅ What Was Changed

1. **Backend URL Resolution** - More flexible, with fallbacks
2. **Error Messages** - More descriptive and actionable
3. **Logging** - Better debugging information
4. **Timeouts** - Increased for reliability
5. **Error Parsing** - Handles both JSON and text error responses

## 🚀 Next Steps

1. **Test the login flow** end-to-end
2. **Check browser console** for any errors
3. **Verify backend logs** for authentication attempts
4. **Test with different environments** (local, staging, production)

## 📝 Notes

- The backend must be running for login to work
- Azure AD app registration must have correct redirect URIs
- CORS must be configured if frontend and backend are on different domains
- All environment variables must be set correctly

---

**Fixed by:** Auto (AI Assistant)  
**Date:** January 2026  
**Status:** ✅ Ready for Testing

