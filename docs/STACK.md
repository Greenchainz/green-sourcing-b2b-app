# GreenChainz Tech Stack — Authoritative Reference

> This document is the single source of truth for the GreenChainz technology stack.
> If any other document contradicts this file, **this file wins**.

---

## THIS IS AN EXPRESS + VITE APP. NOT NEXT.JS.

The following technologies are **explicitly NOT used** in `green-sourcing-b2b-app`:

| ❌ Not Used | ✅ What We Use Instead |
|------------|----------------------|
| Next.js / App Router | Express.js server |
| NextAuth / Auth.js | Custom OAuth (PKCE) + JWT cookies |
| React Server Components | Client-side Vite SPA |
| `next/navigation` | `wouter` (client routing) |
| `next/link` | `<a>` or wouter `<Link>` |
| `pages/` or `app/` routing directories | Express routes + Vite SPA |
| `NextResponse.redirect()` | `res.redirect()` (Express) |
| Project-root `middleware.ts` | Express middleware in `server/_core/` |
| Prisma | Drizzle ORM |
| Supabase | Azure PostgreSQL (Flexible Server) |
| Remix | Not applicable |
| tRPC edge runtime | tRPC over Express (Node.js only) |

---

## The Actual Stack

### Server
- **Runtime:** Node.js 20+
- **Framework:** Express.js (TypeScript)
- **Entry point:** `server/_core/index.ts`
- **API layer:** tRPC (`@trpc/server`) mounted at `/api/trpc`
- **Auth:** Custom OAuth PKCE flow → JWT HttpOnly cookie
- **Validation:** Zod (all tRPC inputs)
- **Email:** Zeptomail + Resend (via `server/email-service.ts`)

### Client
- **Bundler:** Vite 5
- **Framework:** React 18
- **Routing:** `wouter` (not React Router, not Next.js App Router)
- **State:** React Query (server state) + component state
- **Styling:** Tailwind CSS + shadcn/ui + lucide-react
- **tRPC client:** `@trpc/react-query`

### Database
- **Engine:** PostgreSQL 16 (Azure Database for PostgreSQL — Flexible Server)
- **ORM:** Drizzle ORM (`drizzle-orm/node-postgres`)
- **Schema:** `drizzle/schema.ts`
- **Migrations:** `drizzle/` directory, numbered SQL files
- **Pool:** `lib/pg-pool.ts` → singleton `Pool` instance

### Infrastructure
- **Hosting:** Azure Container Apps
- **CI/CD:** GitHub Actions (`.github/workflows/deploy-azure.yml`)
- **Secrets:** Azure Key Vault (loaded at startup via `lib/secrets.ts`)
- **Storage:** Azure Blob Storage
- **Monitoring:** Azure Application Insights + Sentry
- **CDN/Static:** Vite build served by Express in production

### Authentication Architecture
```
Client → GET /api/auth/microsoft
       → 302 to login.microsoftonline.com
       → Microsoft auth
       → 302 to /api/auth/callback/microsoft
       → Express: code exchange → upsert user in PostgreSQL
       → Set app_session_id (HttpOnly JWT cookie)
       → 302 to app
```

- **Local dev:** set `APP_BASE_URL=http://localhost:3000` and ensure your Entra app redirect URIs include localhost
- **tRPC protection:** `protectedProcedure` extracts user from verified JWT — use this, never roll your own

---

## Import Conventions

```typescript
// ✅ Correct — server code uses canonical chain
import { getDb } from './db';                    // or '../db' from subdirectory
import { query, queryMany } from '../../lib/pg-pool';  // raw SQL helpers only

// ✅ Correct — tRPC routers
import { protectedProcedure, router } from '../_core/trpc';

// ✅ Correct — client routing (NOT next/navigation)
import { useLocation, Link } from 'wouter';

// ❌ Wrong — will not compile / wrong framework
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { NextResponse } from 'next/server';
```

---

## Environment Variables (Required)

| Variable | Where | Purpose |
|----------|-------|---------|
| `DATABASE_URL` | Azure Container App secret (Key Vault ref) | PostgreSQL connection string |
| `JWT_SECRET` | Azure Key Vault | Session cookie signing |
| `AZURE_AD_TENANT_ID` | Azure Container App env var | Entra tenant ID (public identifier) |
| `AZURE_AD_CLIENT_ID` | Azure Container App env var | Entra app (client) ID (public identifier) |
| `AZURE_AD_CLIENT_SECRET` | Azure Key Vault | Entra app client secret |
| `APP_BASE_URL` | Azure Container App env var | Public base URL used to build OAuth redirect URIs |
| `AZURE_MI_CLIENT_ID` or `MANAGED_IDENTITY_CLIENT_ID` | Azure Container App env var | Managed identity client ID for Key Vault access |

> **Critical:** `APP_BASE_URL` must match the public domain you configured in Entra redirect URIs (e.g., `https://greenchainz.com`).
