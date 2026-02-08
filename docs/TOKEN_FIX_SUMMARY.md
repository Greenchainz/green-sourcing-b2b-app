# Token Fix Summary - Easy Auth Migration

**Date:** February 8, 2026  
**Issue:** CONSTANT_CONDITION warnings after NextAuth removal  
**Status:** ✅ Fixed

## Problem

After removing NextAuth.js, 8 CONSTANT_CONDITION warnings appeared in the codebase:

```typescript
const { user, token } = useAuth();
if (!token) return; // ⚠️ token is always null - condition always true!
```

### Root Cause

With Easy Auth, the `useAuth()` hook returns `token: null` because:
- Easy Auth doesn't use JWT bearer tokens
- Authentication happens at infrastructure level via headers
- Azure Container Apps injects headers: `x-ms-client-principal-id`, etc.

## Solution

### Changed Pattern

**Before (NextAuth):**
```typescript
const { user, token } = useAuth();

// Check authentication
if (!token) return;

// Make API call
fetch(url, {
  headers: { Authorization: `Bearer ${token}` }
});
```

**After (Easy Auth):**
```typescript
const { user } = useAuth();

// Check authentication
if (!user) return;

// Make API call
fetch(url, {
  credentials: 'include' // Easy Auth headers included automatically
});
```

## Files Fixed

1. **app/rfqs/page.tsx**
   - Removed `token` from useAuth destructuring
   - Changed `if (!token)` to `if (!user)`
   - Removed `Authorization: Bearer ${token}` header
   - Added `credentials: 'include'`

2. **app/rfqs/create/page.tsx**
   - Removed `token` from useAuth destructuring
   - Changed `if (!token)` to `if (!user)`
   - Removed `Authorization: Bearer ${token}` header
   - Added `credentials: 'include'`

3. **app/rfqs/[rfqId]/page.tsx**
   - Removed `token` from useAuth destructuring
   - Changed 5 instances of `if (!token)` to `if (!user)`
   - Removed all `Authorization: Bearer ${token}` headers
   - Added `credentials: 'include'` to all fetch calls

4. **app/dashboard/supplier/rfqs/page.tsx**
   - Removed `token` from useAuth destructuring
   - Changed `if (!token || !user?.id)` to `if (!user?.id)`
   - Removed `Authorization: Bearer ${token}` header
   - Added `credentials: 'include'`

## Key Learnings

### ✅ Do This with Easy Auth

```typescript
// 1. Check user object for authentication
const { user } = useAuth();
if (!user) {
  // Not authenticated
}

// 2. Use credentials: 'include' for authenticated requests
fetch('/api/endpoint', {
  credentials: 'include',
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
});

// 3. Server-side: Read Easy Auth headers
import { getEasyAuthUser } from '@/lib/auth/easy-auth';
const user = getEasyAuthUser(request.headers);
```

### ❌ Don't Do This

```typescript
// DON'T: Check token (always null)
const { token } = useAuth();
if (!token) { /* This is always true! */ }

// DON'T: Use Bearer token header
fetch('/api/endpoint', {
  headers: { Authorization: `Bearer ${token}` } // token is null!
});

// DON'T: Store JWT tokens in localStorage
localStorage.setItem('token', someToken); // Not needed with Easy Auth
```

## How Easy Auth Works

```
┌─────────────┐
│   Browser   │  fetch('/api/rfqs', { credentials: 'include' })
└──────┬──────┘
       │
       ▼
┌─────────────────────────┐
│  Azure Container Apps   │
│  Easy Auth Middleware   │
│  - Validates session    │
│  - Injects headers      │
└──────┬──────────────────┘
       │ Request with headers:
       │ x-ms-client-principal-id: "user-123"
       │ x-ms-client-principal: "base64-json"
       ▼
┌─────────────────────────┐
│  Next.js API Route      │
│  - Reads headers        │
│  - Extracts user info   │
│  - Returns data         │
└─────────────────────────┘
```

## Testing

### Build Status
✅ Build passes without errors or warnings
✅ No CONSTANT_CONDITION issues remain

### Authentication Flow
1. User visits protected route
2. Middleware checks Easy Auth headers
3. If not authenticated → redirect to `/.auth/login/aad`
4. If authenticated → headers available, user info accessible

## Future Development

When creating new authenticated features:

1. **Client Components:**
   - Use `const { user } = useAuth();`
   - Check `if (!user)` for authentication
   - Use `credentials: 'include'` in fetch

2. **Server Components/API Routes:**
   - Import from `@/lib/auth/easy-auth`
   - Use `getEasyAuthUser(request.headers)`
   - Check user object, not token

3. **Never:**
   - Use `Authorization: Bearer` headers from client
   - Check `token` variable (always null)
   - Implement OAuth flows (Easy Auth does this)

## References

- [AUTHENTICATION_STATUS.md](../AUTHENTICATION_STATUS.md) - Quick reference
- [docs/EASY_AUTH_INTEGRATION.md](EASY_AUTH_INTEGRATION.md) - Full guide
- [lib/auth/use-easy-auth.ts](../lib/auth/use-easy-auth.ts) - Client hook
- [lib/auth/easy-auth.ts](../lib/auth/easy-auth.ts) - Server utilities
