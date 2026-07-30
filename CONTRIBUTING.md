# Contributing to GreenChainz — green-sourcing-b2b-app

> **For all human developers and AI coding agents (Copilot, Claude, etc.):**  
> Read this file before touching any code. These rules are non-negotiable.

---

## ⚠️ Package Manager: pnpm ONLY

**This repo uses `pnpm` exclusively. Never use `npm` or `yarn`.**

```bash
# ✅ Correct
pnpm install
pnpm add <package>
pnpm remove <package>
pnpm run build
pnpm run dev

# ❌ Never do this
npm install
yarn add
npm ci
```

Why: the lockfile (`pnpm-lock.yaml`) is authoritative. Running `npm install` or `yarn` will corrupt it, create a `package-lock.json`, and break the Docker build.

### Pinned version

The project pins pnpm via `corepack`. The correct version is declared in `package.json` under `"packageManager"`. If you need to activate it locally:

```bash
corepack enable
corepack use pnpm@10.28.2
```

If `node_modules` is corrupt or you see JSON parse errors in packages:

```bash
Remove-Item -Recurse -Force node_modules   # Windows PowerShell
rm -rf node_modules                        # macOS / Linux
pnpm install
```

---

## Stack at a Glance

| Layer | Technology |
|---|---|
| Runtime | Node.js 22 (LTS) |
| Language | TypeScript (strict) |
| Frontend | Vite + React 19 |
| Backend | Express 5 + tRPC 11 |
| ORM | Drizzle ORM (`drizzle-orm/pg-core`) |
| Database | PostgreSQL (via `pg`) |
| Auth | Azure Entra ID Easy Auth (prod) / `registerDevAuthShim()` (local) |
| Secrets | Azure Key Vault |
| Infra | Azure Container Apps |
| Build | `vite build` (client) + `esbuild` (server bundle → `dist/index.js`) |

---

## Local Development

```bash
# 1. Copy env file and fill in values
cp .env.example .env

# 2. Install dependencies
pnpm install

# 3. Start dev server (hot reload)
pnpm run dev

# 4. Or run via Docker Compose
docker compose up --build
```

> **Never put secrets in `.env.local`** — all Azure credentials must be in `.env` (not `.env.local`).

---

## Auth Rules (Critical)

- **Prod**: Custom Express OAuth routes in `server/_core/oauth-providers.ts` handle all auth flows. Do not add Easy Auth or NextAuth.
- **Local**: Set `AZURE_AD_CLIENT_SECRET` in `.env` — the same OAuth flow runs in dev against the real Entra app registration.
- **Never mix** `MANAGED_IDENTITY_CLIENT_ID` with `AZURE_AD_CLIENT_ID` — they are different Azure identities.
- **Never derive user identity from the request body or query string.** Always read from the Easy Auth principal headers (`X-MS-CLIENT-PRINCIPAL-*`) server-side.

---

## Drizzle ORM Schema Rules

All schema changes go in `drizzle/schema.ts`. Import every column type you use from `drizzle-orm/pg-core` explicitly:

```ts
import {
  pgTable,
  text,
  integer,
  smallint,      // ← must be imported if used
  boolean,
  timestamp,
  uuid,
  varchar,
  numeric,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
```

**Common mistake**: adding a column type (e.g. `smallint`, `real`, `doublePrecision`) to a table definition without adding it to this import — this causes `ReferenceError: smallint is not defined` at server startup and crashes the container.

After any schema change:

```bash
pnpm run db:generate   # generates migration in drizzle/migrations/
pnpm run db:migrate    # applies migration to local DB
```

---

## Known Dead APIs (Do Not Resurrect)

| Service | Status | Notes |
|---|---|---|
| Autodesk SDA API | ❌ Shut down April 2026 | `server/autodesk-sda-service.ts` is a stub. Do not call `searchEpds` or `getEpdDetail`. |
| `EpdLookupModal.tsx` | ❌ Deleted | Called the deleted SDA tRPC router. Removed in commit `5e3753e`. |

If you need EPD data, use **EC3 (Building Transparency)** or **EPD International** integrations instead.

---

## Docker Build

```bash
# Standard build
docker compose up --build

# Force full rebuild (no cache) — required after schema or import changes
docker compose build --no-cache app
docker compose up
```

The Dockerfile runs:
1. `vite build` → `dist/public/` (client assets)
2. `esbuild server/_core/index.ts` → `dist/index.js` (server bundle)

Both must succeed for the image to build. Any TypeScript import error in the server bundle will fail step 2 with exit code 1.

---

## Branch Naming

| Type | Pattern | Example |
|---|---|---|
| Bug fix | `fix/<short-description>` | `fix/schema-smallint-import` |
| Feature | `feat/<short-description>` | `feat/supplier-onboarding-step2` |
| Chore | `chore/<short-description>` | `chore/remove-orphan-components` |
| Hotfix | `hotfix/<short-description>` | `hotfix/docker-crash-loop` |

Always branch from `main`. Never commit directly to `main`.

---

## For AI Coding Agents (Copilot, Claude, etc.)

> **AEC scope & compliance invariants are binding.** Before touching the CSI 1.5C /
> 13.1A generators, the Submittal Log, or swap validation/ranking, read and follow
> [`docs/AEC_SCOPE_AND_COMPLIANCE_INVARIANTS.md`](./docs/AEC_SCOPE_AND_COMPLIANCE_INVARIANTS.md).
> Two non-negotiable rules: (1) compliance is a hard gate — never surface a material that
> fails a showstopper check, no matter how green; sustainability only sorts the survivors.
> (2) The Submittal Log tracks GreenChainz-generated substitution packets only — not RFIs,
> payment certs, or the whole job (that's Procore territory).

1. **Use `pnpm` for all package operations** — no exceptions.
2. **Check imports in `drizzle/schema.ts`** whenever you add a column type.
3. **Do not re-enable SDA API calls** — the service is stubbed and returns empty arrays by design.
4. **Auth identity must come from server-side Easy Auth headers**, never from client-supplied values.
5. **Do not create `.env.local`** — use `.env` only.
6. **Run `pnpm run build` locally before pushing** to catch esbuild errors before they hit Docker.
7. **Stash local changes before switching branches**: `git stash push -m "wip: description"`.
