# GreenChainz Auth & Route Contract

> **SOURCE OF TRUTH — DO NOT CHANGE AUTH WITHOUT ARCHITECTURE REVIEW FROM the lead architect**
> Implementation details: `docs/AUTH_ARCHITECTURE.md`
> Azure identity setup: `docs/MANAGED_IDENTITY_SETUP.md`

---

## CRITICAL — READ BEFORE TOUCHING ANY AUTH CODE

GreenChainz uses a **custom, self-managed authentication model**.

| WE DO NOT USE | WE DO USE |
|---|---|
| Azure Easy Auth / App Service Auth | Custom OAuth2 via `oauth-providers.ts` |
| `/.auth/login/aad`, `/.auth/callback` | `/api/auth/:provider` -> OIDC -> cookie |
| localStorage tokens | `app_session_id` JWT cookie (HttpOnly, Secure, SameSite=Lax) |
| User JWTs for service-to-service | Managed Identity or API keys |
| Client secrets in frontend/mobile/plugin | PKCE / device flow |
| `VITE_BACKEND_URL` set in production | Empty string — all calls are same-origin |

**`server/_core/easy-auth.ts` and `lib/auth/easy-auth.ts` are DEAD CODE. Do not use, import, or revive them. See issue #725.**

---

## Core Principles

1. Single auth method per service.
2. No route may be exposed without explicit auth classification.
3. All cross-service calls use service-to-service auth (Managed Identity / API key) — never user tokens.
4. Session cookie (`app_session_id`) is a signed JWT, HttpOnly, Secure, SameSite=Lax.
5. `VITE_BACKEND_URL` must be empty in production — all API calls are same-origin.

---

## Route -> Auth Matrix

### Authentication Routes (`server/_core/oauth-providers.ts`, `email-auth.ts`)

| Route | Method | Auth Required | Who Calls It | Notes |
|---|---|---|---|---|
| `/api/auth/microsoft` | GET | None | Browser (redirect) | Initiates Microsoft OAuth2 flow |
| `/api/auth/google` | GET | None | Browser (redirect) | Initiates Google OAuth2 flow |
| `/api/auth/linkedin` | GET | None | Browser (redirect) | Initiates LinkedIn OAuth2 flow |
| `/api/auth/callback/:provider` | GET | None | OAuth provider | Receives code, exchanges token, sets cookie, redirects |
| `/api/auth/email/signup` | POST | None | Browser (fetch) | Creates account + issues session cookie |
| `/api/auth/email/login` | POST | None | Browser (fetch) | Validates password + issues session cookie |
| `/api/auth/me` | GET | None | Browser (fetch) | Returns `{ authenticated, user }`; anonymous callers get `200` with `user: null` |
| `/api/auth/logout` | GET/POST | JWT cookie | Browser | Clears session cookie, redirects to `/` |

---

### Express API Routes (`server/_core/index.ts`)

| Route | Method | Auth Required | Who Calls It | Notes |
|---|---|---|---|---|
| `/api/health` | GET | None | Azure healthcheck | Container health probe |
| `/api/marketplace/landing` | GET | None | Microsoft Marketplace | Marketplace landing page handler |
| `/api/marketplace/webhook` | POST | None | Microsoft Marketplace | Marketplace subscription webhook |
| `/api/microsoft/subscription-webhook` | POST | None | Microsoft | Subscription lifecycle webhook |
| `/api/admin/trigger-outreach` | POST | **NEEDS AUTH** | Internal | Unprotected — fix tracked in #729 |
| `/api/admin/seed-materials` | POST | **NEEDS AUTH** | Internal | Unprotected — fix tracked in #729 |
| `/api/admin/run-supplier-scraper` | POST | **NEEDS AUTH** | Internal | Unprotected — fix tracked in #729 |
| `/api/admin/run-txdot-scraper` | POST | **NEEDS AUTH** | Internal | Unprotected — fix tracked in #729 |
| `/api/pdf/material-score/:materialId` | GET | JWT cookie (CORRECT) | Browser | Auth via `sdk.authenticateRequest` |
| `/api/rfq/:rfqId/pdf/summary` | GET | **NEEDS AUTH** | Browser | RFQ data is private — fix tracked in #730 |
| `/api/rfq/:rfqId/pdf/bids` | GET | **NEEDS AUTH** | Browser | Bid data is private — fix tracked in #730 |
| `/api/messages/threads` | GET | JWT cookie | Browser | Auth via `sdk.authenticateRequest` |
| `/api/messages/unread-count` | GET | JWT cookie | Browser | Auth via `sdk.authenticateRequest` |
| `/api/messages/threads/:threadId` | GET | JWT cookie | Browser | Auth via `sdk.authenticateRequest` |
| `/api/messages/threads` | POST | JWT cookie | Browser | Auth via `sdk.authenticateRequest` |
| `/api/messages/threads/:id/send` | POST | JWT cookie | Browser | Auth via `sdk.authenticateRequest` |
| `/api/messages/threads/:id/read` | POST | JWT cookie | Browser | Auth via `sdk.authenticateRequest` |
| `/api/upload/*` | POST | Varies | Browser | File upload via `uploadRouter` |
| `/api/zeptomail/webhook` | POST | None | Zeptomail | Inbound email webhook |

---

### tRPC Routes (`/api/trpc/*` — `server/routers.ts`)

| Router | Public | Protected | Admin | Notes |
|---|---|---|---|---|
| `auth` | 2 | — | — | `me` + `logout` |
| `materials` | 4 | — | — | Catalog is public |
| `assemblies` | 2 | 1 | — | List/view public, edit auth |
| `personas` | 1 | — | — | Public |
| `rfq` | — | 3 | — | Create/list/view RFQs |
| `rfqRequests` | 2 | 7 | — | RFQ request system |
| `rfqMarketplace` | — | 15 | — | Full RFQ marketplace |
| `supplier` | — | 8 | — | Supplier CRUD |
| `supplierOnboarding` | — | 4 | — | Supplier onboarding |
| `supplierRfq` | — | 9 | — | Supplier RFQ responses |
| `subscription` | 1 | 16 | — | Plans public, manage auth |
| `admin` | — | 2 | 14 | Admin-only operations |
| `ec3` | 3 | 3 | — | EPD data from EC3 |
| `epd` | 3 | 4 | — | EPD management |
| `location` | 2 | 10 | — | Location/geo services |
| `materialSpec` | 2 | 6 | — | Material specifications |
| `materialSwap` | 5 | — | — | Swap candidates (public) |
| `materialSwaps` | 2 | 1 | — | Save/get swaps |
| `swapValidation` | 7 | — | — | CSI validation (public) |
| `agentConfig` | 1 | 4 | — | AI agent config |
| `autodesk` | 4 | — | — | Autodesk SDA integration |
| `txdotScraper` | 2 | 3 | — | TxDOT bid tab scraper |
| `legal` | — | 6 | — | Legal doc generation |
| `agent` | 2 | — | — | ChainBot chat |
| `leads` | 1 | — | — | Lead capture form |

---

### Client-Side Route Protection (`client/src/App.tsx`)

| Frontend Route | Auth Required | Guard |
|---|---|---|
| `/` | No | — |
| `/get-started` | No | — |
| `/materials` | No | — |
| `/materials/:id` | No | — |
| `/assemblies` | No | — |
| `/about` | No | — |
| `/terms`, `/privacy` | No | — |
| `/login` | No | — |
| `/how-it-works` | No | — |
| `/compare` | No | — |
| `/dashboard` | Yes | `AuthGuard` |
| `/rfq-dashboard` | Yes | `AuthGuard` |
| `/rfq/*` | Yes | `AuthGuard` |
| `/rfqs` | Yes | `AuthGuard` |
| `/rfq-form` | Yes | `AuthGuard` |
| `/messages` | Yes | `AuthGuard` |
| `/supplier/*` | Yes | `AuthGuard` + `SupplierOnboardingGuard` |
| `/admin/*` | Yes | `AuthGuard` |
| `/subscription` | Yes | `AuthGuard` |
| `/search` | Yes | `AuthGuard` |

---

### Future Services (Not Yet Built)

| Service | Route Pattern | Auth Method | Who Can Call It | Notes |
|---|---|---|---|---|
| AI Audit Agent | `/agents/auth` | Service token / Managed Identity | Backend services only | Centralized login/check |
| Mobile API | `/api/mobile/*` | Mobile JWT (OIDC) | Mobile apps only | Same issuer and audience rules |
| Revit Plugin API | `/api/revit/*` | OAuth device / PKCE | Revit plugin only | No client secrets in plugin |
| Webhook Receivers | `/api/webhooks/*` | HMAC signature | External services | Verify request signature |

---

## Open Security Issues

| Issue | Route(s) | Fix |
|---|---|---|
| #729 | `/api/admin/*` (4 routes) | Add `requireAdmin` middleware |
| #730 | `/api/rfq/:rfqId/pdf/summary`, `/api/rfq/:rfqId/pdf/bids` | Add `sdk.authenticateRequest` + ownership check |
| #725 | `server/_core/easy-auth.ts`, `lib/auth/easy-auth.ts` | Delete both files + remove imports from `index.ts` |
| #731 | Azure resource groups + Managed Identity roles | ✅ Least-privilege setup complete — see `docs/MANAGED_IDENTITY_SETUP.md` |

---

## Rule: Any Change to Auth Requires Architecture Review

Changes to any of the following require a PR reviewed and approved by the lead architect:

- Token format or cookie name/shape
- Login or refresh flows
- Route protection rules
- Identity provider configuration
- This file (`AUTH_ROUTE_CONTRACT.md`) or `AUTH_GUARDRAILS.md`
