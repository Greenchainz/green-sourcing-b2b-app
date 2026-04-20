# Authentication Architecture


> [!CAUTION]
> **Stack alert:** This is an **Express + Vite app — NOT Next.js**. Any references to `next/*`, App Router, `NextResponse`, or NextAuth in this document are outdated or incorrect. See [`STACK.md`](./STACK.md).

> **DO NOT CHANGE THE AUTH SYSTEM without reading this document first.**
> This has been a source of repeated bugs. The current system works. Leave it alone.

## Overview

GreenChainz uses **custom Express OAuth routes + JWT session cookies**.  
We are **NOT** using:
- ❌ Azure Easy Auth sidecar (/.auth/* endpoints)
- ❌ NextAuth / Auth.js
- ❌ better-auth
- ❌ MSAL client-side library
- ❌ Any third-party auth-as-a-service

All authentication is handled by our own Express server code.

## How It Works

```
User clicks "Continue with Microsoft"
  → GET /api/auth/microsoft          (Express route in oauth-providers.ts)
  → 302 redirect to login.microsoftonline.com
  → User authenticates with Microsoft
  → 302 redirect to /api/auth/callback/microsoft
  → Express exchanges code for tokens
  → Upserts user in PostgreSQL
  → Sets app_session_id JWT cookie (HttpOnly, Secure, SameSite=Lax)
  → 302 redirect to /rfq-dashboard (or wherever they came from)
```

Same flow for Google (`/api/auth/google`) and LinkedIn (`/api/auth/linkedin`).

Email/password login uses `/api/auth/email/login` and `/api/auth/email/signup`.

All paths issue the same `app_session_id` JWT cookie. One auth system.

## Key Files

| File | Purpose |
|------|---------|
| `server/_core/oauth-providers.ts` | Microsoft, Google, LinkedIn OAuth routes |
| `server/_core/email-auth.ts` | Email/password signup and login |
| `server/_core/cookies.ts` | Session cookie options (SameSite, Secure, etc.) |
| `server/_core/sdk.ts` | `createSessionToken()` and `authenticateRequest()` |
| `shared/const.ts` | `COOKIE_NAME = "app_session_id"` |
| `client/src/pages/Login.tsx` | Login UI — buttons link to `/api/auth/:provider` |
| `client/src/contexts/AuthContext.tsx` | Frontend auth state — calls `/api/auth/me` |
| `client/src/lib/api-client.ts` | `getCurrentUser()` — fetches `/api/auth/me` |

## Critical Rules

### 1. VITE_BACKEND_URL must be empty in production
All API calls use **relative URLs** (same-origin). The frontend and backend
run in the same Container App. Setting `VITE_BACKEND_URL` to the Azure
Container Apps internal hostname breaks auth because the cookie domain
won't match. This has caused outages before. See `api-client.ts` line 13.

### 2. Session cookie must be SameSite=Lax
`SameSite=None` causes cookies to be dropped by browsers due to third-party
cookie restrictions. `SameSite=Lax` works because:
- All API fetches are same-origin (cookie always sent)
- OAuth callbacks are top-level navigations (Lax sends cookies on these)

### 3. Do NOT add NextAuth, better-auth, or MSAL
These have been tried and removed multiple times. They conflict with the
existing Express OAuth system and cause redirect loops. The current system
is simple and works.

### 4. Easy Auth files are legacy — do not use
`server/_core/easy-auth.ts` and `lib/auth/easy-auth.ts` still exist but
the frontend does not use `/.auth/*` endpoints. These files can be deleted
in a future cleanup but are harmless.

### 5. Secrets come from Azure Key Vault via Managed Identity
`lib/secrets.ts` loads secrets at startup using the user-assigned managed
identity (`ec248abf-f6ce-4d7c-8888-740317709f1b`). OAuth client secrets
(Microsoft, Google, LinkedIn) are stored in Key Vault, not in env vars.
See `lib/secrets.ts` for the full mapping.

## OAuth Provider Credentials

| Provider | Client ID env var | Client Secret env var | Key Vault secret name |
|----------|------------------|-----------------------|----------------------|
| Microsoft | `AZURE_AD_CLIENT_ID` | `AZURE_AD_CLIENT_SECRET` | `AZURE-AD-CLIENT-SECRET` |
| Google | `GOOGLE_CLIENT_ID` | `GOOGLE_CLIENT_SECRET` | `GOOGLE-SECRET` |
| LinkedIn | `LINKEDIN_CLIENT_ID` | `LINKEDIN_CLIENT_SECRET` | `LINKEDIN-SECRET` |

## Session Flow

1. User authenticates via any provider
2. Server creates JWT with `openId`, `appId`, `name`, `exp` (1 year)
3. JWT is set as `app_session_id` cookie (HttpOnly, Secure, SameSite=Lax)
4. Every API request: `sdk.authenticateRequest(req)` reads the cookie, verifies JWT, looks up user in DB
5. Frontend: `AuthContext` calls `GET /api/auth/me` on mount, caches user in sessionStorage for 5 min
6. `AuthGuard` component redirects unauthenticated users away from protected routes
