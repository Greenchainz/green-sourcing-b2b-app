# AUTH_GUARDRAILS.md


> [!CAUTION]
> **Stack alert:** This is an **Express + Vite app — NOT Next.js**. Any references to `next/*`, App Router, `NextResponse`, or NextAuth in this document are outdated or incorrect. See [`docs/STACK.md`](./docs/STACK.md) or [`CLAUDE.md`](./CLAUDE.md) at repo root.

> **DO NOT CHANGE AUTH WITHOUT AN ARCHITECTURE REVIEW.**
> Any modification to auth flows, token formats, route protection rules, or
> identity provider configuration must update this file **and**
> `AuthMethod-Route-HowItWorks.csv`.

> **Status (April 2026):** Centralized JWT model is canonical. Easy Auth and Next.js edge middleware references are deprecated and being removed.

---

## Centralized Auth Model

GreenChainz uses a **single, centralized authentication system** based on
custom Express OAuth routes and signed JWT session cookies.

**Explicitly prohibited (do not add):**
- Azure Easy Auth / App Service Auth / `/.auth/*` sidecar endpoints
- NextAuth / Auth.js / better-auth
- MSAL client-side library
- Azure Entra External ID automatic platform auth
- Any third-party auth-as-a-service

---

## JWT Session Cookie Rules

| Property | Value |
|----------|-------|
| Cookie name | `app_session_id` |
| Algorithm | HS256 |
| Payload fields | `openId`, `appId`, `name` |
| Expiry | 1 year |
| HttpOnly | ✅ Yes |
| Secure | ✅ Yes (production) |
| SameSite | `Lax` |
| Scope | Same-origin only — `VITE_BACKEND_URL` **must be empty** in production |

---

## Route Protection Rules

Every route **must** be assigned one of the following auth levels. No route
may be exposed without explicit classification.

| Level | Middleware | Notes |
|-------|-----------|-------|
| **Public** | None | Data must be non-sensitive |
| **Authenticated** | `sdk.authenticateRequest(req)` — returns 401 if invalid | Any valid session |
| **Admin** | `sdk.authenticateRequest(req)` + `user.role === "admin"` — returns 403 | `@greenchainz.com` accounts only |

---

## Service-to-Service Auth

Cross-service calls **must** use managed identity or explicit service tokens.
User JWTs **must never** be forwarded to another service.

| Credential | Use for |
|-----------|---------|
| Azure Managed Identity (`ec248abf-f6ce-4d7c-8888-740317709f1b`) | Key Vault, Azure services |
| Service API key | Webhook receivers (verify HMAC signature) |
| User JWT (`app_session_id`) | Browser → backend **only**. Never service → service. |

---

## OAuth Provider Credentials

Secrets are stored in Azure Key Vault (`Greenchainz-vault-2026`), not in env vars.

| Provider | Client ID env var | Key Vault secret |
|----------|------------------|-----------------|
| Microsoft | `AZURE_AD_CLIENT_ID` | `microsoft-client-secret` → `AZURE_AD_CLIENT_SECRET` |
| Google | `GOOGLE_CLIENT_ID` | `LINKEDIN-SECRET` → `GOOGLE_CLIENT_SECRET` |
| LinkedIn | `LINKEDIN_CLIENT_ID` | `LINKEDIN-SECRET` → `LINKEDIN_CLIENT_SECRET` |

---

## What Triggers a Required Architecture Review

A review is required before merging any change to:

1. The JWT payload fields (`openId`, `appId`, `name`) or signing algorithm.
2. The session cookie name, flags (HttpOnly, Secure, SameSite), or expiry.
3. Login / refresh / logout flows (OAuth callback, email auth, token exchange).
4. The list of auth-protected routes or their auth level.
5. Any new identity provider or removal of an existing one.
6. The managed identity or any service token configuration.
7. The `sdk.authenticateRequest()` or `sdk.verifySession()` implementation.

After review, update **both** this file and `AuthMethod-Route-HowItWorks.csv`.

---

## Change Log

| Date | Author | Change Summary | Reviewed By |
|------|--------|---------------|-------------|
| 2026-03-24 | @copilot | Initial creation; added auth checks to unprotected admin and RFQ PDF routes | architecture-review-required |
| 2026-04-06 | operations | Confirmed centralized JWT as canonical; deprecated Easy Auth and middleware.ts references | architecture-review-complete |
