# GreenChainz — AI Agent & Developer Orientation

> [!CAUTION]
> ## THIS IS AN EXPRESS + VITE APP. IT IS NOT NEXT.JS.
>
> If you are about to write `import { useRouter } from 'next/navigation'`, `import Link from 'next/link'`,
> `import { notFound } from 'next/navigation'`, `NextResponse.redirect(...)`, or create an `app/` directory
> with `page.tsx` files — **STOP**. You are in the wrong mental model. Read this file before touching anything.

---

## Canonical Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Server | **Express.js** (TypeScript) | Single entry: `server/_core/index.ts` |
| API | **tRPC** over Express | All routers in `server/routers/` |
| Client | **Vite + React** | SPA served from `client/src/` |
| Auth | **Custom OAuth (PKCE)** | `server/_core/oauth-providers.ts` + JWT cookies |
| Database | **PostgreSQL** via **Drizzle ORM** | Schema in `drizzle/schema.ts` |
| Infra | **Azure Container Apps** | Docker, GitHub Actions CI/CD |
| Styling | **Tailwind CSS + shadcn/ui** | |

**NOT in this codebase:** Next.js, NextAuth/Auth.js, React Server Components, App Router, `pages/` routing, `middleware.ts` at project root, `NextResponse`, Prisma, Supabase, Remix, or any SSR framework.

---

## Project Layout

```
server/          Express server (tRPC, auth, webhooks, schedulers)
  _core/         Entry point, OAuth, JWT, dev auth shim
  routers/       tRPC route handlers
  services/      Business logic
  admin-routes/  Admin-only Express routes
client/          Vite React SPA (being migrated feature-by-feature)
  src/           React components, pages (wouter routing)
lib/             Shared utilities (secrets, scrapers, DB helpers)
drizzle/         Drizzle ORM schema + migrations
docs/            Living architecture docs (read before coding)
docs/archive/    DEAD historical docs — do not code from these
```

---

## Auth — Read This Before Touching Anything Auth-Related

- **Production:** Custom Express OAuth (Microsoft Entra ID PKCE flow) — `server/_core/oauth-providers.ts`
- **Local dev:** `registerDevAuthShim()` in `server/_core/easy-auth.ts` simulates the flow
- **Session:** HttpOnly JWT cookie (`greenchainz-auth-token`), verified server-side via `sdk.authenticateRequest(req)`
- **tRPC guard:** `protectedProcedure` in `server/_core/trpc.ts` — use this, never roll your own
- **Role hierarchy:** `admin > architect > supplier > public`
- Client ID: `8b597068-9347-4e99-8860-8c4e9a9bc112`
- Tenant ID: `1d04bf50-8175-40af-a9d5-f8e441460b06`
- `MANAGED_IDENTITY_CLIENT_ID` ≠ `CLIENT_ID` — never mix these

See `docs/AUTH_ARCHITECTURE.md` for the full flow diagram.

---

## Database

- **Canonical chain:** `lib/pg-pool.ts` → `lib/db.ts` → `server/db.ts`
- **Server code:** import `getDb` from `./db` (or `../db`) — never directly from `lib/db` or `lib/pg-pool`
- **Raw SQL helpers only:** `query` / `queryOne` / `queryMany` from `lib/pg-pool` — only when Drizzle can't do it
- **All queries must be scoped to `ctx.user.id`** — multi-tenant safety
- Never raw SQL strings — always Drizzle query builder with `eq()`, `and()`, `or()`, `not()`

---

## Code Conventions

- TypeScript strict mode everywhere — no `any`
- `async/await` only — no `.then()` chains
- Functional React components only
- `lucide-react` for icons, `shadcn/ui` for primitives
- Tailwind only — no CSS modules, no inline styles
- `toast` (sonner) for user feedback
- Error states use `AlertCircle` + descriptive message, never blank screen
- Fire-and-forget side effects: `void promise.catch(err => console.error(err))`

---

## Common Commands

```bash
npm run dev          # Express + Vite dev server (port 3001)
npm run db:push      # Push Drizzle schema changes
npm run db:studio    # Open Drizzle Studio
npm run build        # Production build
```

---

## Key Env Vars

```
DATABASE_URL              PostgreSQL connection string (Azure)
JWT_SECRET                Session cookie signing secret
OAUTH_SERVER_URL          Must be in .env (not .env.local) — loaded at module init
MICROSOFT_CLIENT_ID       8b597068-9347-4e99-8860-8c4e9a9bc112
MICROSOFT_CLIENT_SECRET   From Azure Portal
MANAGED_IDENTITY_CLIENT_ID  ec248abf-f6ce-4d7c-8888-740317709f1b  ← NOT the app client ID
```

---

## Repos (GitHub org: Greenchainz)

| Repo | Purpose |
|------|---------|
| `green-sourcing-b2b-app` | This repo — main platform |
| `greenchainz-intelligence` | AI scraper microservice (Python Azure Functions) |
| `greenchainz-sda-connector` | Autodesk SDA integration |
| `greenchainz-mobile` | Expo mobile app |
| `greenchainz-revit-plugin` | C# Revit plugin |

---

## Before You Code

1. Read this file ✅
2. Read `docs/AUTH_ARCHITECTURE.md` if touching auth
3. Read `docs/STACK.md` for the authoritative stack reference
4. Run `npm run dev` and confirm the server starts before editing
5. Scope every DB query to `ctx.user.id`
6. Use `protectedProcedure` — never roll your own auth check
