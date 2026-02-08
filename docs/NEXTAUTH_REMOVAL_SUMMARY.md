# NextAuth.js Removal - Migration Summary

**Date:** February 8, 2026  
**Status:** ✅ Complete

## Overview

GreenChainz has fully migrated from NextAuth.js to Azure Container Apps Easy Auth for authentication. This document summarizes what was removed and why.

## Why Remove NextAuth.js?

1. **Redundancy** - Azure Container Apps Easy Auth handles OAuth at the infrastructure level
2. **Simplicity** - No need to manage OAuth flows, sessions, or tokens in application code
3. **Security** - Authentication happens before requests reach the application
4. **Maintenance** - Fewer dependencies and less code to maintain

## What Was Removed

### Code Files Deleted

#### Type Definitions
- `types/next-auth.d.ts` - NextAuth TypeScript types

#### Test Files
- `tests/mocks/next-auth.ts` - NextAuth mock
- `tests/mocks/next-auth-react.ts` - NextAuth React mock
- `tests/mocks/next-auth-providers.ts` - NextAuth providers mock
- `tests/unit/auth/linkedin-provider.test.ts` - LinkedIn provider test
- `tests/unit/auth/authentication-fixes.test.ts` - NextAuth fixes test
- `tests/unit/auth/azure-callback.test.ts` - OAuth callback test

#### API Routes
- `app/api/auth/signin/route.js` - Custom signin route (unnecessary with Easy Auth)
- `app/api/auth/redirect/route.js` - OAuth redirect handler (unnecessary)
- `app/api/auth-callback/route.ts` - OAuth callback handler (unnecessary)

#### Database Files
- `database-schemas/migrations/20260126_165700_add_nextauth_tables.sql` - NextAuth database migration

### Configuration Changes

#### Prisma Schema (`prisma/schema.prisma`)
Removed NextAuth models:
- `Account` - OAuth provider accounts
- `Session` - User sessions
- `User` - NextAuth user table
- `VerificationToken` - Email verification tokens

#### Jest Configuration (`jest.config.js`)
Removed NextAuth module mappings:
```javascript
// REMOVED:
'^next-auth$': '<rootDir>/tests/mocks/next-auth.ts',
'^next-auth/react$': '<rootDir>/tests/mocks/next-auth-react.ts',
'^next-auth/providers/(.*)$': '<rootDir>/tests/mocks/next-auth-providers.ts',
```

#### Environment Variables
Removed from `.env.azure.example` and `.env.local.example`:
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `AUTH_URL`
- `AUTH_SECRET`
- `AUTH_MICROSOFT_ENTRA_ID_ID`
- `AUTH_MICROSOFT_ENTRA_ID_SECRET`
- `AUTH_MICROSOFT_ENTRA_ID_ISSUER`

## What Was Added

### New Files

#### Client-Side Hook
- `lib/auth/use-easy-auth.ts` - React hook for client components
  - Provides `useAuth()` hook compatible with existing code
  - Fetches user from `/api/auth/me` endpoint
  - Returns `{ user, loading, error }` state

#### Module Index
- `lib/auth/index.ts` - Unified exports for authentication
  - Server-side utilities from `easy-auth.ts`
  - Client-side hook from `use-easy-auth.ts`

## Current Authentication Architecture

### Server-Side (API Routes, Server Components)
```typescript
import { getEasyAuthUser, isAuthenticated } from '@/lib/auth/easy-auth';

export async function GET(request: NextRequest) {
  const user = getEasyAuthUser(request.headers);
  // user contains: { id, email, name, roles }
}
```

### Client-Side (React Components)
```typescript
'use client';
import { useAuth } from '@/lib/auth';

export default function MyComponent() {
  const { user, loading, error } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Please login</div>;
  
  return <div>Welcome, {user.name}!</div>;
}
```

### Middleware (Automatic)
- `middleware.ts` protects routes automatically
- Checks Easy Auth headers: `x-ms-client-principal-id`, etc.
- Redirects unauthenticated users to `/.auth/login/aad`

## Benefits Achieved

1. **Simpler codebase** - Removed ~1000 lines of code and config
2. **No OAuth code** - Azure handles OAuth flows completely
3. **No session management** - Azure manages sessions automatically
4. **Better security** - Authentication happens before app code runs
5. **Easier testing** - Mock Easy Auth headers instead of complex OAuth flows

## Migration Path for Future Features

When building new features:

1. **Server-side auth** - Use `getEasyAuthUser(request.headers)`
2. **Client-side auth** - Use `useAuth()` hook
3. **Protected routes** - Add to `PROTECTED_ROUTES` in `middleware.ts`
4. **Role checks** - Use `hasRole(user, 'admin')` or `hasAnyRole(user, roles)`

## Documentation Updated

- `.github/copilot-instructions.md` - Removed NextAuth references
- `docs/EASY_AUTH_INTEGRATION.md` - Updated migration section
- `.env.azure.example` - Replaced NextAuth config with Easy Auth notes
- `.env.local.example` - Replaced NextAuth config with Easy Auth notes

## Archived Documentation

Legacy NextAuth documentation moved to:
- `docs/archive/auth-legacy/NEXTAUTH_DEPLOYMENT_GUIDE.md`
- `docs/archive/auth-legacy/*` (various NextAuth setup docs)

## Compatibility

The new `useAuth()` hook maintains API compatibility with the old NextAuth hook:

```typescript
// Old NextAuth usage (removed):
const { user, token } = useAuth();

// New Easy Auth usage (works the same):
const { user, token } = useAuth(); // token is null with Easy Auth
```

This allows existing components to work without changes.

## Testing

- ✅ Build passes: `npm run build`
- ✅ Auth tests pass: 75 tests passing
- ✅ Easy Auth utilities tested: `tests/unit/auth/easy-auth.test.ts`
- ✅ Client hook created: `lib/auth/use-easy-auth.ts`

## References

- [Azure Easy Auth Documentation](https://learn.microsoft.com/en-us/azure/container-apps/authentication)
- [GreenChainz Easy Auth Integration Guide](./EASY_AUTH_INTEGRATION.md)
- [Middleware Implementation](../middleware.ts)
