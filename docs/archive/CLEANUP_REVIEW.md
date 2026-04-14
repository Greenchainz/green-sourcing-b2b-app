# Repository Cleanup Review

**Prepared for:** Owner review  
**Date:** 2026-03-24  
**Status:** List only — no files deleted. You decide what goes.

---

## How to Use This Doc

Each section groups files by why they might be clutter. For each item, mark:
- ✅ **Keep** — intentionally here, leave it
- 🗑️ **Delete** — remove it
- 📦 **Move** — belongs in a different repo (intelligence, mobile, SADA, plugin)
- 🔒 **URGENT** — security / credential issue needing immediate attention

---

## ⚠️ URGENT: Committed Secret

> `.env.sentry-build-plugin`
>
> This file contains a live **Sentry auth token** (`SENTRY_AUTH_TOKEN=sntrys_...`).
> The file itself says "DO NOT commit this file to your repository!" — but it is
> committed and public. The token should be **revoked immediately** at
> https://sentry.io and regenerated, then stored only in GitHub Secrets / Key Vault.

---

## Section 1: Entire Directories That Probably Don't Belong

### 1a. `ciam-sign-in-node-express-web-app/` (19 files)

A standalone Express.js sample application from a Microsoft CIAM tutorial — not
integrated into the main Vite/Express app at all. It has its own `package.json`,
`server.js`, Handlebars views, and routes. Its contents were also accidentally
copied into `app/routes/` and `app/authConfig.js` (see Section 5).

Files:
```
ciam-sign-in-node-express-web-app/.env.example
ciam-sign-in-node-express-web-app/README.md
ciam-sign-in-node-express-web-app/app.js
ciam-sign-in-node-express-web-app/auth/AuthProvider.js
ciam-sign-in-node-express-web-app/authConfig.js
ciam-sign-in-node-express-web-app/controller/authController.js
ciam-sign-in-node-express-web-app/fetch.js
ciam-sign-in-node-express-web-app/package-lock.json
ciam-sign-in-node-express-web-app/package.json
ciam-sign-in-node-express-web-app/public/stylesheets/style.css
ciam-sign-in-node-express-web-app/routes/auth.js
ciam-sign-in-node-express-web-app/routes/index.js
ciam-sign-in-node-express-web-app/routes/users.js
ciam-sign-in-node-express-web-app/server.js
ciam-sign-in-node-express-web-app/views/error.hbs
ciam-sign-in-node-express-web-app/views/id.hbs
ciam-sign-in-node-express-web-app/views/index.hbs
ciam-sign-in-node-express-web-app/views/layout.hbs
ciam-sign-in-node-express-web-app/views/profile.hbs
```

### 1b. `Commercial-Marketplace-SaaS-Accelerator/` (empty directory)

An empty folder. Seems to be a leftover placeholder from when you considered
importing the Microsoft SaaS Accelerator template. Nothing inside it.

### 1c. `green-sourcing-b2b-app/` (empty nested directory)

An empty directory with the same name as the repo sitting inside the repo.
Appears to be a mistake.

### 1d. `azure-functions/` — Scraper Timer Function (6 files)

An Azure Functions app whose only job is to run scrapers on a daily timer.
Since scraper logic belongs in the "intelligence repo", this function app
probably goes with it.

```
azure-functions/host.json
azure-functions/package.json
azure-functions/package-lock.json
azure-functions/tsconfig.json
azure-functions/scraper-timer/function.json
azure-functions/scraper-timer/index.ts
```

---

## Section 2: The Old Next.js Frontend (`app/` directory — 189 files)

**Key fact: `next` is not in `package.json` and is not installed.**
The current production build is `vite build + esbuild` (Vite frontend + Express server).
The entire `app/` directory is orphaned Next.js code that is not built or deployed.

This includes:
- `app/` pages and layouts (Next.js App Router)
- `app/api/` route handlers (57 files of Next.js API routes)
- `app/components/` (Next.js components)
- `app/lib/` (Next.js lib utilities)
- `app/providers/` (Next.js providers)
- `app/actions/` (Next.js server actions)
- `next.config.js`
- `middleware.ts` (root — uses `next/server`, not the Express middleware)
- `middleware/parseAuth.js` (a separate Express middleware in its own folder)
- `sentry.edge.config.ts` (Next.js Sentry edge config)
- `sentry.server.config.ts` (Next.js Sentry server config)
- `instrumentation.ts` (Next.js instrumentation)
- `instrumentation-client.ts` (Next.js client instrumentation)
- `Dockerfile.azure` (Next.js-specific Dockerfile, not used by CI)
- `lib/middleware/subscription.ts` (imports from `next/server`)
- `lib/middleware/usage-tracking.ts` (imports from `next/server`)
- `lib/middleware/api-cache.ts` (likely Next.js too)

**Unless you are actively pivoting to Next.js**, all of the above is dead weight.

> Note: If you *are* planning to pivot to Next.js, then the `client/` directory
> (179 files, the current Vite frontend) would be the one to retire instead.

---

## Section 3: Scraper / Intelligence Repo Files

Per the issue: *"all the scraper stuff is in intelligence repo."*
These files implement web scraping, EPD syncing, and outreach pipelines.

### Scraper logic
```
lib/agents/scraper/rate-limiter.ts
lib/agents/scraper/scraper-agent.ts
lib/agents/scraper/web-fetcher.ts
lib/scrapers/autodesk-sda-scraper.ts
lib/scrapers/database.ts
lib/scrapers/supplier-scraper.ts
lib/prompts/data-janitor.ts            ← prompt used by scrapers
scripts/scraper-scheduler.ts
scripts/SCRAPER_SCHEDULER_README.md
server/scraper-outreach-pipeline.ts
server/epd-sync-scheduler.ts           ← syncs Autodesk EPD data on a timer
server/test-txdot-scraper.ts
```

### TxDOT pricing scraper
```
server/routers/txdotScraper.ts
server/services/txdotScraper.ts
server/services/txdotScraperBrowser.ts
server/services/txdotParserSimple.ts
docs/TXDOT_SCRAPER.md
```

### Scraper-related Next.js API routes (orphaned anyway per Section 2)
```
app/api/scrape/epd/route.ts
app/api/scrape/materials/route.ts
app/api/scrape/suppliers/route.ts
app/api/scrapers/supplier-discovery/route.ts
```

### Scraper docs
```
docs/PERSONA_SCRAPER_ARCHITECTURE.md
docs/EXCEL_SCRAPER_INTEGRATION.md
docs/archive/SCRAPER_DEPLOYMENT_STATUS.md
```

---

## Section 4: Revit / Autodesk Files (Receive Plugin Repo?)

Per the issue: *"we have receive plugin repo."*
These integrate with Autodesk Forge / APS (Revit file parsing, EPD lookups):

```
lib/autodesk-interceptor.ts
lib/scrapers/autodesk-sda-scraper.ts   ← also in scraper section
server/autodesk-oauth.ts
server/autodesk-sda-router.ts
server/autodesk-sda-service.ts
server/autodesk-sda-service.test.ts
server/autodesk-oauth.test.ts
server/epd-sync-scheduler.ts           ← also in scraper section
lib/examples/architecture-of-equivalence-demo.ts  ← demo script using autodesk
```

Also the following page and doc exist for Revit:
```
app/revit-plugin/page.tsx              ← orphaned Next.js page
app/integrations/revit/page.tsx        ← orphaned Next.js page
docs/REVIT_INTEGRATION.md
```

---

## Section 5: Accidentally Placed Files in `app/` Root

These Express.js/Node files ended up in the Next.js `app/` folder — they are
copies of (or siblings to) the MSAL sample in `ciam-sign-in-node-express-web-app/`:

```
app/authConfig.js        ← MSAL Node Express auth config
app/routes/auth.js       ← Express route (Microsoft copyright header)
app/routes/index.js      ← Express route (Microsoft copyright header)
app/routes/users.js      ← Express route (Microsoft copyright header)
app/redis_ping.js        ← debug script (contains a heredoc `cat` command, not a real module)
```

---

## Section 6: Old Manus Platform Files

Manus was a previous development platform. These files reference Manus-specific
APIs (`BUILT_IN_FORGE_API_URL`, `OAUTH_SERVER_URL`, Manus type definitions):

```
server/storage.ts                   ← Manus Forge storage proxy
server/_core/sdk.ts                 ← Manus OAuth token exchange / user info
server/_core/dataApi.ts             ← Manus Data API (Forge)
server/_core/llm.ts                 ← Manus LLM proxy
server/_core/imageGeneration.ts     ← Manus image generation
server/_core/voiceTranscription.ts  ← Manus voice transcription
server/_core/notification.ts        ← Manus notification service
server/_core/map.ts                 ← Manus Google Maps proxy
server/_core/types/manusTypes.ts    ← Auto-generated Manus protobuf types
client/public/__manus__/debug-collector.js  ← Manus debug tool injected in HTML
```

> Note: `server/_core/sdk.ts` is still imported by `server/_core/index.ts`
> (`sdk.authenticateRequest`) for session auth on the PDF and messaging REST
> endpoints. Before deleting, those calls need to be replaced.

---

## Section 7: MySQL Migration Scripts (Now on PostgreSQL)

These one-off migration scripts target MySQL (`mysql2` driver) — the project
now uses Azure PostgreSQL with Drizzle ORM:

```
migrate-agents.mjs     ← MySQL: CREATE TABLE agent_conversations
migrate-rfq.mjs        ← MySQL: CREATE TABLE suppliers, rfq_requests, …
migrate-swaps.mjs      ← MySQL: CREATE TABLE material_swaps
test-role-assignment.mjs  ← ad-hoc test script, also uses Drizzle MySQL schema
```

---

## Section 8: Old MySQL Drizzle Schema Files

These files use `drizzle-orm/mysql-core` but the current schema (`drizzle/schema.ts`)
uses `drizzle-orm/pg-core` (PostgreSQL):

```
drizzle/agent-handoff-schema.ts      ← mysql-core
drizzle/location-schema.ts           ← mysql-core
drizzle/schema-additions-swap-engine.ts  ← mysql-core (comment says "copy into schema.ts")
drizzle/relations.ts                 ← imports nothing (empty body: `import {} from "./schema"`)
drizzle/0000_flaky_xorn.sql          ← empty placeholder migration ("Initial migration placeholder")
```

---

## Section 9: Duplicate / Overlapping Database Modules

The project has accumulated multiple PostgreSQL connection files:

| File | Notes |
|------|-------|
| `lib/db.ts` | Primary pool + Drizzle ORM — **this is the one** |
| `server/pg-db.ts` | Near-duplicate of `lib/db.ts` without the Drizzle part |
| `lib/azure-db.ts` | Older PostgreSQL pool used by `lib/agents/scraper/scraper-agent.ts` and its test |
| `lib/db-managed-identity.ts` | Managed-identity PostgreSQL — may overlap with `lib/azure/postgres.ts` |
| `lib/azure-sql.ts` | **Azure SQL (MSSQL)** — different engine entirely; not imported anywhere |

---

## Section 10: Data Dump Files

These large data files appear to be API response snapshots that were committed
by mistake:

```
materials_all.json    ← full API response dump (~300 KB)
materials_check.json  ← another data snapshot
```

---

## Section 11: Developer Artifacts

```
todo.md               ← 74 KB internal dev todo list
assets/partners       ← empty file (not a directory, zero content)
"D…perplexitydownloadsgreen-sourcing-b2b-appclientsrcpages"
                      ← garbled filename, appears to be an empty Perplexity
                         download artifact; git tracks it but the file is 0 bytes
```

---

## Section 12: Duplicate or Conflicting Config Files

| File | Notes |
|------|-------|
| `Dockerfile` | Active — used by CI (`deploy-azure.yml`) for Vite + Express build |
| `Dockerfile.azure` | Alternate Next.js Dockerfile — not used by CI |
| `deploy.sh` (root) | Deployment script at root — `azure/deploy.sh` also exists |
| `azure-pipelines.yml` | Azure DevOps pipeline — CI is GitHub Actions (`deploy-azure.yml`) |
| `package-lock.json` | npm lock file |
| `pnpm-lock.yaml` | pnpm lock file — both exist; the Dockerfile uses pnpm |
| `.env.example` | Three env example files exist: `.env.example`, `.env.local.example`, `.env.azure.example` |
| `jest.config.js` | Jest config — test runner is Vitest (`vitest.config.ts`) |

---

## Section 13: Services Not in Your Stack

### Email: Resend vs Zeptomail
You appear to have two email providers wired up:
- `lib/resend.ts` + `app/actions/send-email.ts` — Resend (used only in the orphaned Next.js `app/`)
- `server/email-service.ts` + `server/zeptomail-webhook.ts` — Zeptomail (active in Express)

If Resend is not used in production, `lib/resend.ts` can go.

### WhatsApp (not in your service list)
```
docs/WHATSAPP_INTEGRATION.md
```

### Video Calling (ACS / WebRTC)
Not in your stated service list. Worth confirming whether these are in active use or planned:
```
server/acs-video-service.ts
server/calling-service.ts
server/video-call-service.ts
server/video-call-service.test.ts
server/webrtc-video-service.ts
server/webrtc-video-service.test.ts
client/src/components/VideoCall.tsx
client/src/components/VideoPlaceholder.tsx
client/src/components/CallModal.tsx
client/src/components/messaging/WebRTCVideoCall.tsx
client/src/components/messaging/VideoCallButton.tsx
client/src/components/messaging/IncomingCallNotification.tsx
```

---

## Section 14: Possibly Example/Demo Pages

These may be internal tools or showcase pages not meant for production:

```
client/src/pages/ApiTest.tsx          ← API test harness page
client/src/pages/ComponentShowcase.tsx ← UI component showcase
```

---

## Summary Count

| Category | Approx. Files |
|----------|--------------|
| `ciam-sign-in-node-express-web-app/` | 19 |
| Empty dirs / junk filenames | 3 |
| `azure-functions/` scraper timer | 6 |
| Orphaned Next.js `app/` directory | 189 |
| Orphaned Next.js root files | ~10 |
| Scraper files (intelligence repo) | ~20 |
| Autodesk / Revit files | ~10 |
| Manus platform leftovers | ~10 |
| MySQL migration scripts | 4 |
| MySQL Drizzle schema files | 5 |
| Duplicate DB modules | 3–4 |
| Data dump / dev artifacts | 4 |
| Duplicate config files | ~6 |
| Out-of-stack services | ~15 |
| **Rough total** | **~300 files** |

---

*This file can be deleted once cleanup decisions are made.*
