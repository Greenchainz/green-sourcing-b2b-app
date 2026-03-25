# GreenChainz Auth Guardrails

> This file exists to prevent well-intentioned developers and AI agents from breaking authentication.
> If you are about to touch auth, read this first.

---

## The One Rule

**Do not change how authentication works without an architecture review from @jnorvi5.**

This includes:
- Adding, removing, or changing login flows
- Changing the session cookie name, format, or flags
- Introducing a new token type or auth mechanism
- Enabling Azure Easy Auth or any platform-managed auth
- Changing which routes are protected or public
- Modifying `sdk.authenticateRequest`, `protectedProcedure`, or `AuthGuard`

---

## What the Auth System Is

- **User login:** Custom OAuth2 (Microsoft, Google, LinkedIn) + email/password
- **Session:** Single signed JWT cookie named `app_session_id` — HttpOnly, Secure, SameSite=Lax
- **API protection (Express):** `sdk.authenticateRequest(req)` — returns user or throws
- **API protection (tRPC):** `protectedProcedure` and `adminProcedure` in `server/_core/trpc.ts`
- **Frontend protection:** `AuthGuard` component in `client/src/App.tsx`
- **Service-to-service:** Managed Identity or API keys — never user JWTs

---

## What the Auth System Is NOT

- NOT Azure Easy Auth
- NOT `/.auth/login/aad` or `/.auth/callback`
- NOT NextAuth or any third-party auth library
- NOT localStorage tokens
- NOT multiple session cookies
- NOT client secrets in the frontend, mobile app, or Revit plugin

---

## Dead Code — Do Not Revive

These files exist in the repo but are NOT active and must be deleted (tracked in issue #725):

- `server/_core/easy-auth.ts`
- `lib/auth/easy-auth.ts`
- `docs/EASY_AUTH_INTEGRATION.md` (move to `docs/archive/`)

They are imported in `server/_core/index.ts` but the routes they register do nothing. Removing the import lines is safe and required.

---

## Open Security Issues

These are known gaps that must be fixed before go-live:

- **#729** — Four admin REST routes have no auth check
- **#730** — Two RFQ PDF routes expose private data without auth
- **#731** — Managed Identity roles need least-privilege audit

---

## Managed Identity Rules

- `MANAGED_IDENTITY_CLIENT_ID` in `.env` = the user-assigned managed identity client ID
- `CLIENT_ID` in `.env` = the Entra app registration for user sign-in (479e2a01-70ab-4df9-baa4-560d317c3423)
- These are **different things**. Never mix them.
- `OAUTH_SERVER_URL` must be in `.env`, not `.env.local`
- No managed identity should have Contributor or Owner at subscription scope

---

## For AI Agents and Copilot

If you are an AI agent working in this repo:

1. Do not add Easy Auth to any container app or route
2. Do not introduce new login endpoints or session mechanisms
3. Do not change the `app_session_id` cookie name, flags, or signing method
4. Do not add `/.auth/*` routes
5. If asked to change auth, stop and ask @jnorvi5 for architecture review first
6. The full route contract is in `docs/AUTH_ROUTE_CONTRACT.md` — read it before touching any route

---

Last updated: 2026-03-24
Owner: @jnorvi5
