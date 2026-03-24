# GreenChainz Auth & Route Contract

> Source of truth — do not change auth without architecture review.
> See also: `docs/AUTH_ARCHITECTURE.md` for implementation details.

## Core Principles

- Single auth method per service.
- No route may be exposed without explicit auth classification.
- All cross-service calls use service-to-service auth (managed identity / API key), never user tokens.
- Session cookie (`app_session_id`) is a signed JWT, `HttpOnly`, `Secure`, `SameSite=Lax`.
- `VITE_BACKEND_URL` must be empty in production — all API calls are same-origin.

---

## Route → Auth Matrix

### Authentication Routes (Express — `server/_core/`)

| Route                              | Method | Auth Required | Who Calls It         | Notes                                                  |
|------------------------------------|--------|---------------|----------------------|--------------------------------------------------------|
| `/api/auth/microsoft`              | GET    | None          | Browser (redirect)   | Initiates Microsoft OAuth2 flow                        |
| `/api/auth/google`                 | GET    | None          | Browser (redirect)   | Initiates Google OAuth2 flow                           |
| `/api/auth/linkedin`               | GET    | None          | Browser (redirect)   | Initiates LinkedIn OAuth2 flow                         |
| `/api/auth/callback/:provider`     | GET    | None          | OAuth provider       | Receives code, exchanges token, sets cookie, redirects |
| `/api/auth/email/signup`           | POST   | None          | Browser (fetch)      | Creates account + issues session cookie                |
| `/api/auth/email/login`            | POST   | None          | Browser (fetch)      | Validates password + issues session cookie             |
| `/api/auth/me`                     | GET    | JWT cookie    | Browser (fetch)      | Returns current user from session                      |
| `/api/auth/logout`                 | GET/POST | JWT cookie | Browser              | Clears session cookie, redirects to `/`                |

### Express API Routes (`server/_core/index.ts`)

| Route                                  | Method | Auth Required | Who Calls It       | Notes                                    |
|----------------------------------------|--------|---------------|--------------------|------------------------------------------|
| `/api/health`                          | GET    | None          | Azure healthcheck  | Container health probe                   |
| `/api/marketplace/landing`             | GET    | None          | Microsoft Mktplace | Marketplace landing page handler         |
| `/api/marketplace/webhook`             | POST   | None          | Microsoft Mktplace | Marketplace subscription webhook         |
| `/api/microsoft/subscription-webhook`  | POST   | None          | Microsoft          | Subscription lifecycle webhook           |
| `/api/admin/trigger-outreach`          | POST   | ⚠️ NONE       | Internal           | **NEEDS AUTH** — currently unprotected   |
| `/api/admin/seed-materials`            | POST   | ⚠️ NONE       | Internal           | **NEEDS AUTH** — currently unprotected   |
| `/api/admin/run-supplier-scraper`      | POST   | ⚠️ NONE       | Internal           | **NEEDS AUTH** — currently unprotected   |
| `/api/admin/run-txdot-scraper`         | POST   | ⚠️ NONE       | Internal           | **NEEDS AUTH** — currently unprotected   |
| `/api/pdf/material-score/:materialId`  | GET    | JWT cookie    | Browser            | Generates material score PDF             |
| `/api/rfq/:rfqId/pdf/summary`          | GET    | ⚠️ NONE       | Browser            | **NEEDS AUTH** — RFQ data is private     |
| `/api/rfq/:rfqId/pdf/bids`            | GET    | ⚠️ NONE       | Browser            | **NEEDS AUTH** — bid data is private     |
| `/api/messages/threads`                | GET    | JWT cookie    | Browser            | List user's message threads              |
| `/api/messages/unread-count`           | GET    | JWT cookie    | Browser            | Unread message count                     |
| `/api/messages/threads/:threadId`      | GET    | JWT cookie    | Browser            | Get thread messages                      |
| `/api/messages/threads`                | POST   | JWT cookie    | Browser            | Create message thread                    |
| `/api/messages/threads/:id/send`       | POST   | JWT cookie    | Browser            | Send message in thread                   |
| `/api/messages/threads/:id/read`       | POST   | JWT cookie    | Browser            | Mark thread as read                      |
| `/api/upload/*`                        | POST   | Varies        | Browser            | File upload (via uploadRouter)           |
| `/api/zeptomail/webhook`               | POST   | None          | Zeptomail          | Inbound email webhook                    |

### tRPC Routes (`/api/trpc/*` — `server/routers.ts`)

| Router                   | Public Procedures | Protected Procedures | Admin Procedures | Notes                        |
|--------------------------|:-----------------:|:--------------------:|:----------------:|------------------------------|
| `auth`                   | 2                 | —                    | —                | `me` + `logout`              |
| `materials`              | 4                 | —                    | —                | Catalog is public            |
| `assemblies`             | 2                 | 1                    | —                | List/view public, edit auth  |
| `personas`               | 1                 | —                    | —                | Public                       |
| `rfq`                    | —                 | 3                    | —                | Create/list/view RFQs        |
| `rfqRequests`            | 2                 | 7                    | —                | RFQ request system           |
| `rfqMarketplace`         | —                 | 15                   | —                | Full RFQ marketplace         |
| `supplier`               | —                 | 8                    | —                | Supplier CRUD                |
| `supplierOnboarding`     | —                 | 4                    | —                | Supplier onboarding          |
| `supplierRfq`            | —                 | 9                    | —                | Supplier RFQ responses       |
| `subscription`           | 1                 | 16                   | —                | Plans public, manage auth    |
| `admin`                  | —                 | 2                    | 14               | Admin-only operations        |
| `ec3`                    | 3                 | 3                    | —                | EPD data from EC3            |
| `epd`                    | 3                 | 4                    | —                | EPD management               |
| `location`               | 2                 | 10                   | —                | Location/geo services        |
| `materialSpec`           | 2                 | 6                    | —                | Material specifications      |
| `materialSwap`           | 5                 | —                    | —                | Swap candidates (public)     |
| `materialSwaps`          | 2                 | 1                    | —                | Save/get swaps               |
| `swapValidation`         | 7                 | —                    | —                | CSI validation (public)      |
| `agentConfig`            | 1                 | 4                    | —                | AI agent config              |
| `autodesk`               | 4                 | —                    | —                | Autodesk SDA integration     |
| `txdotScraper`           | 2                 | 3                    | —                | TxDOT bid tab scraper        |
| `legal`                  | —                 | 6                    | —                | Legal doc generation         |
| `agent`                  | 2                 | —                    | —                | ChainBot chat                |
| `leads`                  | 1                 | —                    | —                | Lead capture form            |

### Client-Side Route Protection (`client/src/App.tsx`)

| Frontend Route           | Auth Required | Guard                 |
|--------------------------|---------------|-----------------------|
| `/`                      | No            | —                     |
| `/get-started`           | No            | —                     |
| `/materials`             | No            | —                     |
| `/materials/:id`         | No            | —                     |
| `/assemblies`            | No            | —                     |
| `/about`                 | No            | —                     |
| `/terms`, `/privacy`     | No            | —                     |
| `/login`                 | No            | —                     |
| `/how-it-works`          | No            | —                     |
| `/compare`               | No            | —                     |
| `/dashboard`             | **Yes**       | `AuthGuard`           |
| `/rfq-dashboard`         | **Yes**       | `AuthGuard`           |
| `/rfq/*`                 | **Yes**       | `AuthGuard`           |
| `/rfqs`                  | **Yes**       | `AuthGuard`           |
| `/rfq-form`              | **Yes**       | `AuthGuard`           |
| `/messages`              | **Yes**       | `AuthGuard`           |
| `/supplier/*`            | **Yes**       | `AuthGuard` + `SupplierOnboardingGuard` |
| `/admin/*`               | **Yes**       | `AuthGuard`           |
| `/subscription`          | **Yes**       | `AuthGuard`           |
| `/search`                | **Yes**       | `AuthGuard`           |

### Future Services (Not Yet Built)

| Service / App            | Route Pattern        | Auth Method            | Who Can Call It         | Notes                              |
|--------------------------|----------------------|------------------------|-------------------------|------------------------------------|
| AI Audit Agent (Azure)   | `/agents/auth`       | Service token / MI     | Backend services only   | Centralized login/check            |
| Mobile API               | `/api/mobile/*`      | Mobile JWT (OIDC)      | Mobile apps only        | Same issuer & audience rules       |
| Revit Plugin API         | `/api/revit/*`       | OAuth device / PKCE    | Revit plugin only       | No client secrets in plugin        |
| Webhook Receivers        | `/api/webhooks/*`    | HMAC signature         | External services       | Verify request signature           |

---

## ⚠️ Known Issues

1. **Admin routes unprotected**: `/api/admin/trigger-outreach`, `/api/admin/seed-materials`, `/api/admin/run-supplier-scraper`, `/api/admin/run-txdot-scraper` have NO auth check. Add `sdk.authenticateRequest` + admin role check.
2. **RFQ PDF routes unprotected**: `/api/rfq/:rfqId/pdf/summary` and `/api/rfq/:rfqId/pdf/bids` expose private data without auth.
3. **Legacy Easy Auth code**: `server/_core/easy-auth.ts` and `lib/auth/easy-auth.ts` still register routes but are not used by the frontend. Safe to delete.
