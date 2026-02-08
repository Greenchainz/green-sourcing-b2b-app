# Azure Container Apps Easy Auth Integration

## Overview

This document explains how to use Azure Container Apps Easy Auth (App Service Authentication) in the GreenChainz B2B application. Easy Auth handles OAuth authentication at the infrastructure level, eliminating the need for application-level OAuth implementation.

## What is Easy Auth?

Azure Container Apps Easy Auth is a built-in authentication feature that:
- Handles OAuth/OIDC flows at the infrastructure level
- Injects authentication headers into every request
- Provides automatic session management
- Supports multiple identity providers (Azure AD, Google, GitHub, etc.)

**Reference:** [Azure Container Apps Authentication](https://learn.microsoft.com/en-us/azure/container-apps/authentication)

## Architecture

```
User → Azure Container Apps → Easy Auth → Application
                                   ↓
                          Injects Auth Headers
                          - x-ms-client-principal-id
                          - x-ms-client-principal-name
                          - x-ms-client-principal (base64 JSON)
                          - x-ms-token-aad-access-token
```

## Configuration

### Azure Portal Configuration

1. **Enable Authentication** in Azure Container Apps:
   - Go to your Container App in Azure Portal
   - Navigate to "Authentication" section
   - Click "Add identity provider"
   - Select "Microsoft"
   - Configure with your Azure AD app registration

2. **Configure App Registration**:
   - App ID: `479e2a01-70ab-4df9-baa4-560d317c3423`
   - Tenant: `ca4f78d4-c753-4893-9cd8-1b309922b4dc` (greenchainz2025.onmicrosoft.com)
   - Redirect URI: `https://greenchainz-container.jollyrock-a66f2da6.eastus.azurecontainerapps.io/.auth/login/aad/callback`

3. **Authentication Settings**:
   - Require authentication: Yes (for protected routes)
   - Unauthenticated requests: Redirect to login page
   - Token store: Enabled (recommended)

### Environment Variables

No environment variables are required in the application code! Easy Auth handles everything.

For local development without Easy Auth, you can simulate headers (see Testing section).

## Usage

### Middleware (Automatic Protection)

The `middleware.ts` file at the root automatically:
1. Checks authentication status for protected routes
2. Redirects unauthenticated users to `/.auth/login/aad`
3. Attaches user information to request headers

**Protected Routes:**
- `/dashboard/*`
- `/rfqs/*`
- `/api/*` (except public routes)

**Public API Routes:**
- `/api/health`
- `/api/sentry-example-api`

### Accessing User Information in API Routes

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getEasyAuthUser, hasRole } from '@/lib/auth/easy-auth';

export async function GET(request: NextRequest) {
  // Get authenticated user from Easy Auth headers
  const user = getEasyAuthUser(request.headers);
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Access user properties
  console.log('User ID:', user.id);
  console.log('Email:', user.email);
  console.log('Name:', user.name);
  console.log('Roles:', user.roles);

  // Check roles
  if (hasRole(user, 'admin')) {
    // Admin-only logic
  }

  return NextResponse.json({ user });
}
```

### Accessing User Information in Server Components

```typescript
import { headers } from 'next/headers';
import { getEasyAuthUser } from '@/lib/auth/easy-auth';

export default async function DashboardPage() {
  const headersList = headers();
  const user = getEasyAuthUser(headersList);

  if (!user) {
    // This shouldn't happen if middleware is working
    return <div>Unauthorized</div>;
  }

  return (
    <div>
      <h1>Welcome, {user.name}!</h1>
      <p>Email: {user.email}</p>
    </div>
  );
}
```

### Accessing User Information in Client Components

Client components can't access headers directly. Use an API route:

```typescript
'use client';

import { useEffect, useState } from 'react';

export default function UserProfile() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => setUser(data.user));
  }, []);

  if (!user) return <div>Loading...</div>;

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  );
}
```

## Utility Functions

### `getEasyAuthUser(request)`

Parse user information from Easy Auth headers.

```typescript
const user = getEasyAuthUser(request.headers);
// Returns: { id, email, name, roles, claims } or null
```

### `isAuthenticated(request)`

Check if user is authenticated.

```typescript
if (isAuthenticated(request.headers)) {
  // User is authenticated
}
```

### `getAccessToken(request)`

Get Azure AD access token for calling Microsoft Graph or other APIs.

```typescript
const token = getAccessToken(request.headers);
if (token) {
  // Use token to call Microsoft Graph
}
```

### `hasRole(user, role)`

Check if user has a specific role.

```typescript
if (hasRole(user, 'admin')) {
  // Admin-only logic
}
```

### `hasAnyRole(user, roles)`

Check if user has any of the specified roles.

```typescript
if (hasAnyRole(user, ['admin', 'moderator'])) {
  // Admin or moderator logic
}
```

### `getLoginUrl(redirect?)`

Get the login URL to redirect unauthenticated users.

```typescript
const loginUrl = getLoginUrl('/dashboard');
// Returns: /.auth/login/aad?post_login_redirect_uri=%2Fdashboard
```

### `getLogoutUrl(redirect?)`

Get the logout URL.

```typescript
const logoutUrl = getLogoutUrl('/');
// Returns: /.auth/logout?post_logout_redirect_uri=%2F
```

## Testing

### Local Development (Without Easy Auth)

For local development, Easy Auth headers won't be present. You can:

1. **Bypass authentication** for local development:
   - Set `NODE_ENV=development`
   - Middleware can be configured to skip auth checks locally

2. **Simulate Easy Auth headers** in your HTTP client (Postman, curl, etc.):

```bash
curl http://localhost:3000/api/auth/me \
  -H "x-ms-client-principal-id: test-user-123" \
  -H "x-ms-client-principal-name: test@example.com" \
  -H "x-ms-client-principal: $(echo '{"auth_typ":"aad","claims":[{"typ":"email","val":"test@example.com"},{"typ":"name","val":"Test User"}]}' | base64)"
```

3. **Use a mock middleware** for local development:

```typescript
// middleware.local.ts (for development only)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // In development, inject mock headers
  if (process.env.NODE_ENV === 'development') {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-ms-client-principal-id', 'dev-user-123');
    requestHeaders.set('x-ms-client-principal-name', 'dev@example.com');
    
    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }
  
  return NextResponse.next();
}
```

### Unit Tests

Unit tests for Easy Auth utilities are in `tests/unit/auth/easy-auth.test.ts`.

Run tests:
```bash
npm test -- tests/unit/auth/easy-auth.test.ts
```

## Troubleshooting

### Issue: User is redirected to login in a loop

**Solution:**
- Check that Azure AD app registration has the correct redirect URI
- Verify that the app registration allows the user's tenant
- Check Container Apps authentication logs in Azure Portal

### Issue: User information is null even though authenticated

**Solution:**
- Verify Easy Auth is enabled in Azure Container Apps
- Check that token store is enabled
- Inspect request headers to ensure `x-ms-client-principal` is present

### Issue: Access token is null

**Solution:**
- Ensure the Azure AD app registration has the required API permissions
- Verify token store is enabled in Container Apps authentication settings
- Check that the user has consented to the required scopes

### Issue: Roles are empty

**Solution:**
- Configure app roles in Azure AD app registration
- Assign users to roles in Azure AD
- Ensure the `roles` claim is included in the token

## Security Considerations

1. **Never trust client-provided headers** - Easy Auth headers are only trustworthy in production when Azure Container Apps is handling authentication

2. **Validate user identity** - Always check `isAuthenticated()` before processing requests

3. **Role-based access control** - Use `hasRole()` to enforce permissions

4. **Token handling** - Access tokens should be used server-side only, never exposed to clients

5. **HTTPS only** - Easy Auth requires HTTPS in production (automatic with Container Apps)

## Migration from NextAuth

If migrating from NextAuth:

1. **Remove NextAuth configuration** - Delete `auth.config.ts` or similar files
2. **Update API routes** - Replace NextAuth session checks with Easy Auth
3. **Update client components** - Use `/api/auth/me` instead of NextAuth hooks
4. **Remove NextAuth dependencies** - Uninstall `next-auth` from `package.json`

## Additional Resources

- [Azure Container Apps Authentication Documentation](https://learn.microsoft.com/en-us/azure/container-apps/authentication)
- [Azure AD App Registration Guide](https://learn.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app)
- [Easy Auth Header Reference](https://learn.microsoft.com/en-us/azure/app-service/configure-authentication-customize-sign-in-out#access-user-claims-in-app-code)
