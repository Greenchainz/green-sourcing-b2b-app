# GreenChainz Authentication Status

**Last Updated:** February 8, 2026  
**Status:** ✅ Easy Auth Only - NextAuth.js Completely Removed

## Current Authentication Method

**Azure Container Apps Easy Auth** is the sole authentication method for GreenChainz.

### How It Works

1. **Infrastructure Level** - Authentication happens before requests reach the application
2. **No OAuth Code** - Azure handles all OAuth flows automatically
3. **Header Injection** - Authenticated user data injected via HTTP headers
4. **Zero Configuration** - No environment variables or app code needed for auth flows

## Quick Reference

### For Server Components & API Routes

```typescript
import { getEasyAuthUser, isAuthenticated } from '@/lib/auth/easy-auth';

export async function GET(request: NextRequest) {
  // Check authentication
  if (!isAuthenticated(request.headers)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get user info
  const user = getEasyAuthUser(request.headers);
  // user: { id, email, name, roles, claims }
  
  return NextResponse.json({ user });
}
```

### For Client Components

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

### Login & Logout

```typescript
import { getLoginUrl, getLogoutUrl } from '@/lib/auth';

// Redirect to login
const loginUrl = getLoginUrl('/dashboard'); // redirect after login
window.location.href = loginUrl;

// Redirect to logout
const logoutUrl = getLogoutUrl('/'); // redirect after logout
window.location.href = logoutUrl;
```

## Available Functions

### Server-Side (`@/lib/auth/easy-auth`)

| Function | Description | Returns |
|----------|-------------|---------|
| `getEasyAuthUser(headers)` | Parse user from Easy Auth headers | `EasyAuthUser \| null` |
| `isAuthenticated(headers)` | Check if request is authenticated | `boolean` |
| `getAccessToken(headers)` | Get AAD access token | `string \| null` |
| `hasRole(user, role)` | Check if user has specific role | `boolean` |
| `hasAnyRole(user, roles)` | Check if user has any of the roles | `boolean` |
| `getLoginUrl(redirect?)` | Get login URL with redirect | `string` |
| `getLogoutUrl(redirect?)` | Get logout URL with redirect | `string` |

### Client-Side (`@/lib/auth`)

| Hook | Description | Returns |
|------|-------------|---------|
| `useAuth()` | Get current user in React | `{ user, loading, error, token }` |

## Protected Routes

Configured in `middleware.ts`:

- `/dashboard/*` - User dashboard
- `/rfqs/*` - RFQ management
- `/api/*` - All API routes (except public)

**Public API Routes:**
- `/api/health`
- `/api/sentry-example-api`

## Authentication Flow

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │ GET /dashboard
       ▼
┌─────────────────────────┐
│  Middleware.ts          │
│  - Check headers        │
│  - Not authenticated?   │
│    → Redirect to login  │
└──────┬──────────────────┘
       │ Redirect to /.auth/login/aad
       ▼
┌─────────────────────────┐
│  Azure Easy Auth        │
│  - Handle OAuth flow    │
│  - Create session       │
│  - Inject headers       │
└──────┬──────────────────┘
       │ Request with headers
       ▼
┌─────────────────────────┐
│  Application            │
│  - Headers available    │
│  - Parse user data      │
│  - Render response      │
└─────────────────────────┘
```

## No Environment Variables Required

Easy Auth authentication requires **zero environment variables** in application code:

- ❌ No `NEXTAUTH_URL`
- ❌ No `NEXTAUTH_SECRET`
- ❌ No `AUTH_*` variables
- ✅ Authentication configured in Azure Portal

## Testing Authentication

### Production (Azure Container Apps)
- Easy Auth automatically enabled
- Headers injected on every request
- No additional configuration needed

### Local Development
Easy Auth headers are not available locally. Options:

1. **Mock headers** for testing:
```typescript
const mockHeaders = new Headers();
mockHeaders.set('x-ms-client-principal-id', 'test-user-123');
mockHeaders.set('x-ms-client-principal-name', 'test@example.com');
```

2. **Use Azure Container Apps development container** with Easy Auth enabled

3. **Skip auth checks** in local development (not recommended for security testing)

## Migration Complete

✅ All NextAuth.js code removed  
✅ All NextAuth.js tests removed  
✅ All NextAuth.js configuration removed  
✅ Easy Auth client hook created  
✅ Documentation updated  
✅ Build passing  
✅ Tests passing  

See [docs/NEXTAUTH_REMOVAL_SUMMARY.md](docs/NEXTAUTH_REMOVAL_SUMMARY.md) for complete migration details.

## Getting Help

- **Easy Auth Guide:** [docs/EASY_AUTH_INTEGRATION.md](docs/EASY_AUTH_INTEGRATION.md)
- **Azure Docs:** [Container Apps Authentication](https://learn.microsoft.com/en-us/azure/container-apps/authentication)
- **Source Code:** 
  - Server utilities: `lib/auth/easy-auth.ts`
  - Client hook: `lib/auth/use-easy-auth.ts`
  - Middleware: `middleware.ts`
  - Example API: `app/api/auth/me/route.ts`
