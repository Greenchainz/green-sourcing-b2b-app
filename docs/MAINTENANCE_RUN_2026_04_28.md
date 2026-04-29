# Automated Maintenance Run — 2026-04-28

Triggered by scheduled task. No coding session detected in the last hour.

---

## What Was Fixed (Auto-Applied)

### 1. Drizzle `.then()` chain violations — 4 files
CLAUDE.md rule: `async/await only — no .then() chains`. All Drizzle query patterns
`await db.select().from(t).where(cond).then((rows) => rows[0])` were rewritten to
`const [row] = await db.select().from(t).where(cond)`.

| File | Changes |
|------|---------|
| `server/services/rfq-excel-generator.ts` | 3 `.then()` chains → array destructure |
| `server/services/rfq-pdf-generator.ts` | 6 `.then()` chains → array destructure (both `generateRfqPdf` and `streamRfqPdf`) |
| `server/services/rfq-revit-generator.ts` | 3 `.then()` chains → array destructure |
| `server/material-swap-service.ts` | 2 violations: Promise.all `.then()` → `[[a],[b]]` destructure; single query → `[row]` |

### 2. `server/routers/location.ts` — `calculateShippingCost` query
Converted `.query(() => fn().then(r => ({ costPerUnit: r })))` to a proper `async` query handler.

### 3. `server/routers/crm-router.ts` — fire-and-forget dynamic imports
Added `void` prefix to both `triggerFred` and `triggerOutreachDrip` mutations per
CLAUDE.md: `Fire-and-forget side effects use void Promise`.

### 4. `server/_core/oauth-providers.ts` — welcome email fire-and-forget
Cleaned up the dynamic import + `.then()` to a proper `void import(...).then(...).catch(...)` chain with `void` prefix.

### 5. `.gitattributes` — created (root)
**Root cause of the 300+ fake modified files.** No `.gitattributes` existed and
`core.autocrlf` was unset. Every file showed as "modified" on the Windows filesystem
because git stored LF but Windows wrote CRLF.

The new `.gitattributes` enforces `eol=lf` for all text files and marks binary
formats (png, jpg, pdf, xlsx, etc.) correctly.

### 6. `.gitignore` — additions
Added patterns for files that kept accumulating in root as tracked junk:
- `*.xlsx`, `*.xls` (binary assets)
- `auth-current.json`, `auth-fixed.json` (debug artifacts)
- `tscheck-client-temp.json`, `tscheck-server-temp.json` (temp TypeScript check files)

---

## What Needs a Manual Run (One-Time)

The git index.lock was held by a Windows process and could not be cleared from the
sandbox. Run `scripts/cleanup-root.sh` once from your terminal to:

1. `git rm` the tracked debug/temp files from root
2. `git mv` root-level docs into `docs/` where they belong
3. Remove the stale `docs/AUTH_GUARDRAILS.md` (root version is newer/more accurate)
4. `git add --renormalize .` — clears the 300+ CRLF diffs permanently

```bash
bash scripts/cleanup-root.sh
git commit -m "chore: cleanup root, normalize line endings, move docs to docs/"
```

---

## Root Clutter Inventory (for cleanup-root.sh)

**Temp/debug files to `git rm`:**
- `auth-current.json`, `auth-fixed.json`
- `tscheck-client-temp.json`, `tscheck-server-temp.json`
- `.gitkeep`

**Scripts to `git mv` → `scripts/`:**
- `check-epd.js`, `check-images.js`, `create-spec-tables.js`

**Root docs to `git mv` → `docs/`:**
- `AGENT_ARCHITECTURE.md`, `ARCHITECT_UPLOAD_READY.md`, `ARCHITECT_UPLOAD_UI_NOTES.md`
- `AUTH_GUARDRAILS.md` (root version is newer; stale `docs/AUTH_GUARDRAILS.md` should be removed)
- `BRAND_VOICE.md` → `docs/brand/BRAND_VOICE.md`
- `CCPS_DATABASE_SCHEMA.md`, `CSI_FORM_13_1A_STRUCTURE.md`, `GITHUB_ACTIONS_SETUP.md`
- `MANAGED_IDENTITY_README.md`, `MATCH_SCORE_ALGORITHM.md`, `MICROSOFT_MARKETPLACE_SETUP.md`
- `MIGRATION_0030_0031_NOTES.md` → `docs/archive/`
- `MVP_IMPLEMENTATION_PLAN.md`, `PROMPTS_FOR_OTHER_AIS.md`
- `SWAP_DASHBOARD_DEPLOYMENT.md`, `SWAP_ENGINE_ROADMAP.md`
- `AuthMethod-Route-HowItWorks.csv` → `docs/`

---

## TypeScript Health
- Server tsconfig: 1 error (`Cannot find type definition file for 'node'` — sandbox-only, not a real error)
- Client tsconfig: 1 error (`Cannot find type definition file for 'vite/client'` — sandbox-only)
- **Zero real TS errors** found

## Code Quality Stats
- `any` types in server/lib: 44 files (deferred — needs individual review)
- `console.log` in server (non-test): 150 instances (deferred — use logger)
- TODOs: 7 (video-call WebPubSub signaling, ACS integration, notification channel)

---

## Run 2 — 2026-04-28 (second automated pass, same day)

No coding session detected. Previous run's file edits confirmed clean on Windows side
(sandbox showed stale mount; real files were intact). Zero TS errors on Windows files.

### Fixed: `any` types in 5 server files

**`server/routers/crm-router.ts`**
- `requireAdmin(ctx: any)` → `requireAdmin(ctx: Pick<TrpcContext, "user">)`
- Added `import type { TrpcContext } from "../_core/context"`

**`server/agent.ts`**
- `const conditions: any[]` → `SQL<unknown>[]`
- Added `import type { SQL } from "drizzle-orm"`

**`server/manufacturer-router.ts`**
- `const conditions: any[]` → `SQL<unknown>[]`
- Added `import type { SQL } from "drizzle-orm"`

**`server/admin-router.ts`**
- `const conditions: any[]` → `SQL<unknown>[]`
- Added `import type { SQL } from "drizzle-orm"`

**`server/marketplace-webhook.ts`** (payment-critical path)
- 5× `subscription: any` → `subscription: MarketplaceSubscription`
- Added `import type { MarketplaceSubscription } from "./marketplace-landing"`
- The type already existed and has all required fields (`planId`, `id`, `quantity`, `term`)

### Still Pending (git index.lock blocks commit)

Same blocker as Run 1: `bash scripts/cleanup-root.sh` then commit from your terminal.

### Deferred for Future Runs
- `messaging-service.ts` — `any` on Drizzle join results (complex shapes, risk of regression)
- `ai-agent-service.ts` — `any` on runtime LLM response parsing (needs schema validation, not just type cast)
- `console.log` → structured logger (150 instances, bulk refactor needed)

---

## Run 3 — 2026-04-29 (automated)

No coding session detected. Last commit: 2 days ago.

### Fixed: `any` types — 5 files, 18 violations

**Pattern 1: `conditions: any[]` → `SQL[]`** (3 files)

The recurring `const conditions: any[]` accumulator pattern was replaced with the
proper `SQL[]` type from `drizzle-orm`. Added `import type { SQL } from 'drizzle-orm'`
to each file.

| File | Change |
|------|--------|
| `server/routers/assemblies-router.ts` | `any[]` → `SQL[]` |
| `server/routers/materials-router.ts` | `any[]` → `SQL[]` |
| `server/routers/swapValidation.ts` | `any[]` → `SQL[]` + refactored query builder to eliminate `as any` cast |

**`swapValidation.ts` refactor detail:**
The old pattern built a query first then conditionally chained `.where()`, requiring
`as any` to satisfy TypeScript. Rewrote to build the `whereClause` first then pass
it to a single clean query chain — same pattern already used in `assemblies-router.ts`
and `materials-router.ts`.

**Pattern 2: `(m: any)` on Drizzle result callbacks** (2 files)

Drizzle infers types from `.select({ ... })` projections — the `: any` annotations
were unnecessary and masking the inference.

| File | Violations fixed |
|------|-----------------|
| `server/routers/ec3-router.ts` | 4× `(m: any)` removed; `as any` on `.values()` → `(typeof materials)["$inferInsert"]` |
| `server/messaging-service.ts` | 5× `(conv: any)`, `(c: any)`, `(m: any)` removed |

### TypeScript health after Run 3
- Zero real errors (only the sandbox-only `@types/node` resolution issue, pre-existing)
- `any` count in primary server routers: down from the previous run

### Still pending (requires terminal — git index.lock blocks sandbox commits)
Same blockers as Runs 1 & 2:

```bash
# One command clears everything:
bash scripts/cleanup-root.sh
git commit -m "chore: cleanup root, normalize line endings, move docs to docs/"
```

Also: the two deprecated stub files cannot be deleted from the sandbox (filesystem
permission). Delete them manually or via `git rm`:

```bash
git rm server/admin-routes/autodesk-oauth.ts
git rm server/autodesk-sda-router.ts
git commit -m "chore: remove deprecated Autodesk SDA stubs"
```
