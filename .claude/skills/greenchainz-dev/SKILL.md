---
name: greenchainz-dev
description: GreenChainz B2B sustainable building materials marketplace development assistant. Use when working on the GreenChainz codebase, Azure infrastructure, authentication, RFQ system, supplier onboarding, EPD integrations, Autodesk SDA connector, or any green-sourcing-b2b-app tasks. Covers full-stack TypeScript, tRPC, Azure Container Apps, Easy Auth, Drizzle ORM, and Vite.
---

# GreenChainz Dev Skill

## Project Identity
- **App**: GreenChainz — B2B marketplace for verified sustainable building materials
- **Repo**: `green-sourcing-b2b-app` (monorepo)
- **Stack**: TypeScript, Express, tRPC, Vite, Drizzle ORM, PostgreSQL (Azure)
- **Infra**: Azure Container Apps, Azure Key Vault, Azure Entra ID (Easy Auth)
- **Target**: 50 suppliers + 200 architects by Q1 2026 launch

## Architecture
```
server/_core/         → Express server entry, auth, OAuth shim, SDK
server/routers/       → tRPC routers (RFQ, suppliers, materials, users)
server/services/      → Business logic (EC3, EPD, scraper, pricing)
client/               → Vite React frontend
lib/                  → Shared utilities (secrets, scrapers, EPD)
db/                   → Drizzle schema + migrations
```

## Auth Architecture (LOCAL DEV)
- Production: Azure Container Apps Easy Auth sidecar handles `/.auth/*`
- Local: `registerDevAuthShim()` in `server/_core/easy-auth.ts` simulates it
- Flow: `/.auth/login/aad` → Microsoft OIDC → `/.auth/callback` → token exchange → session cookie
- Client ID: `479e2a01-70ab-4df9-baa4-560d317c3423`
- Tenant ID: `ca4f78d4-c753-4893-9cd8-1b309922b4dc`
- The Replit SDK (`/webdev.v1.WebDevAuthPublicService/*`) is NOT used locally — bypassed entirely

## Key Env Vars (.env.local)
```
OAUTH_SERVER_URL=https://login.microsoftonline.com/ca4f78d4-c753-4893-9cd8-1b309922b4dc
MICROSOFT_CLIENT_ID=479e2a01-70ab-4df9-baa4-560d317c3423
MICROSOFT_CLIENT_SECRET=<from Azure Portal>
MANAGED_IDENTITY_CLIENT_ID=ec248abf-f6ce-4d7c-8888-740317709f1b  ← NOT the app client ID
DATABASE_URL=<Azure PostgreSQL>
```

## Known Gotchas
1. **Import order bug**: OAuth module imports execute before dotenv loads → `OAUTH_SERVER_URL` must be in `.env` (not just `.env.local`) so it's available at module init time
2. **Replit SDK**: `EXCHANGE_TOKEN_PATH = /webdev.v1.WebDevAuthPublicService/ExchangeToken` — only works on Replit infrastructure, bypass for local/Azure dev
3. **CLIENT_ID collision**: Two env vars named `CLIENT_ID` existed — managed identity ID shadowed app registration ID. Use `MANAGED_IDENTITY_CLIENT_ID` for the managed identity
4. **Easy Auth headers**: Use `X-MS-CLIENT-PRINCIPAL-ID/IDP/NAME` as authoritative source, not the base64 JSON blob
5. **Vite env warning**: `VITE_ANALYTICS_WEBSITE_ID` must be defined or Vite warns — add to `.env.local` even if empty

## Active Initiatives (Priority Order)
1. **Auth** — Local dev login working via `/.auth/login/aad` dev shim (IN PROGRESS)
2. **RFQ System** — Build supplier RFQ flow (NOT STARTED — urgent)
3. **AI Audit Agent** — GPT-4o + Autodesk SDA API (architected, not deployed)
4. **Founding 50 Campaign** — Cold outreach to suppliers
5. **EPD Integrations** — Building Transparency (EC3), EPD International

## Common Commands
```bash
npm run dev          # Start dev server (tsx watch on port 3001)
git pull             # Always pull before editing
npm run db:push      # Push Drizzle schema changes
npm run db:studio    # Open Drizzle Studio
```

## Dev Server Startup Checklist
1. `.env` has `OAUTH_SERVER_URL` (for module init order)
2. `.env.local` has `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `DATABASE_URL`
3. Azure Portal → App Registration `479e2a01` → Authentication has `http://localhost:3001/.auth/callback` as redirect URI
4. Server shows `[OAuth] Initialized with baseURL: https://login.microsoftonline.com/...` (no ERROR line)

## Response Format for This Skill
- **BLUF first**: bottom line, time estimate, verification step
- **Execute-first**: copy-paste ready commands, zero placeholders
- **Flag blockers immediately**: don't paper over errors
- **One step at a time**: confirm each step works before the next
