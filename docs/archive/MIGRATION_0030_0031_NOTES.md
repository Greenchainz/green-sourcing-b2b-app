# Migration 0030 + 0031 — Material Credit Score v2, Paywall, Architect PDF Pipeline

**Status:** Ready to apply
**Author:** GreenChainz core
**Date:** 2026-04-15

## BLUF

Two migrations and a new server pipeline that:

1. Adds the **GreenChainz Score (GCS) v2** scoring backbone (60% sustainability + 40% performance) and persists the breakdown so we don't recompute on every page load.
2. Adds the **Supplier Reliability Score (SRS)** + audit history + RFQ response-event log (drives DoorDash-style speed bonuses and "Lightning Fast" badge).
3. Adds the **4-tier paywall** (Free / Basic $199 / Standard $499 / Premium $999) with seeded `supplier_tier_pricing` and a backfill from `supplier_subscriptions`.
4. Adds the **Lead-Credit Ledger** (running balance, reason codes, idempotent grants).
5. Adds the **Company of the Week** showcase table (`featured_suppliers`, weekly UNIQUE).
6. Adds the **Architect PDF Pipeline** — upload an architect's Embodied Carbon Tables PDF/XLSX, parse with Azure Document Intelligence, classify rows by assembly code, then surface ranked sustainable alternatives via the Near-Match Algorithm.

## Why the migration is split into two files

Postgres rejects `ALTER TYPE ... ADD VALUE` followed by an `INSERT` that references the new value in the **same transaction** ("unsafe use of new value of enum type"). Drizzle wraps each migration file in a transaction, so the enum changes had to be isolated.

Apply order is strict:

```
0030_mcs_enums.sql   →  COMMIT  →  0031_mcs_tables.sql
```

`drizzle-kit migrate` does this automatically. If you're applying with `psql`, run them as separate files — do not concatenate.

## What 0030 adds (enums only)

| Type | New values |
|---|---|
| `supplier_tier` | + `basic`, `standard` (was `free`, `premium`) |
| `subscription_tier` | + `basic` (was `free`, `standard`, `premium`) |
| `architect_persona` | NEW — `aor`, `leed_ap`, `gc_pm`, `spec_writer`, `interior_designer` |
| `spec_parse_status` | NEW — `pending`, `processing`, `ready`, `failed` |
| `rfq_event_type` | NEW — `viewed`, `responded`, `declined`, `completed`, `expired` |
| `lead_credit_reason` | NEW — `monthly_grant`, `tier_upgrade_bonus`, `referral_bonus`, `rfq_unlock`, `architect_contact_unlock`, `admin_adjustment`, `company_of_week_bonus`, `top_responder_bonus` |

## What 0031 adds (columns + tables + views + seeds)

### Columns added to existing tables

- `suppliers` (+23 columns): `tier`, `lead_credits`, `monthly_lead_credit_allowance`, `duns_number`, `duns_score`, `linkedin_verified`, `avg_response_time_hours`, `rfq_completion_rate`, `avg_rating`, `srs_score`, `top_responder_badge`, `lightning_fast_badge`, `territory_exclusive_metro`, `featured_company_of_week_at`, `hidden_from_search`, plus 4 new indexes (tier, srs_score desc, hidden_from_search where false, featured_company_of_week_at).
- `epd_materials` (+26 columns): `epd_expiry`, `epd_program_operator`, `interior_exterior`, `r_value`, `fire_rating`, `astm_standards` (jsonb), `msf_factor`, `title24_compliant`, `iecc_compliant`, `voc_compliant`, `not_on_red_list`, `hpd_available`, `c2c_certified`, `fsc_certified`, `greenguard_gold`, `declare_label`, `recycled_content_pct`, `regional_availability` (jsonb), `regional_within_500mi`, `lead_time_days`, `price_per_unit`, `price_unit`, `take_back_program`, `leed_credits` (jsonb).

### New tables

| Table | Purpose |
|---|---|
| `material_credit_scores` | Cached GCS with full sustainability/performance breakdown (avoids recompute on every page load). |
| `supplier_reliability_history` | SRS audit trail — every score change with reason. |
| `rfq_response_events` | Event log driving SRS response-time score (viewed/responded/declined/completed/expired). |
| `lead_credit_ledger` | Append-only ledger with running `balance_after`, idempotent via `idempotency_key`. |
| `featured_suppliers` | Company of the Week — `week_start` UNIQUE so the cron is idempotent. |
| `architect_uploaded_specs` | Tracks each PDF/XLSX upload (status, blob URL, project metadata). |
| `architect_spec_assemblies` | Parsed rows from the architect's PDF (assembly code, GWP, units, matched EPD). |
| `generated_rfqs` | Auto-built RFQs from a parsed spec (PDF/Excel/Revit/Intercom output). |
| `supplier_tier_pricing` | Seeded with the 4-tier paywall ($0/$199/$499/$999) + JSON feature matrix. |

### Views

- `v_material_latest_gcs` — most recent GCS per material.
- `v_supplier_scoreboard` — DoorDash-style leaderboard ordered by tier then SRS.

### Backfill

- `suppliers.tier` populated from `supplier_subscriptions.current_tier`.

## How to run it

### Local dev (Drizzle)

```bash
npm run db:migrate
```

Drizzle applies 0030 → COMMIT → 0031 in order.

### Production (Azure Postgres, manual)

```bash
psql "$DATABASE_URL" -f drizzle/0030_mcs_enums.sql
psql "$DATABASE_URL" -f drizzle/0031_mcs_tables.sql
```

Both files are idempotent (`IF NOT EXISTS` everywhere, `ADD VALUE IF NOT EXISTS`, `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object`).

### Rollback

There's no auto rollback. If you need to revert, drop the new tables, drop the new enums, and `ALTER TABLE ... DROP COLUMN` for each new column. The existing data on `suppliers` and `epd_materials` is untouched by the migration so dropping the new columns is safe.

## New tRPC endpoints

Mounted at `appRouter.architectSpec.*`:

| Procedure | Purpose |
|---|---|
| `architectSpec.listSpecs` | List all specs the current architect has uploaded. |
| `architectSpec.getSpec({ specId })` | Get one spec + every parsed assembly row + match status. |
| `architectSpec.uploadAndParse({ originalFilename, blobUrl, mimeType, fileBufferBase64, projectName?, projectLocation?, estimatedValue? })` | Upload + parse a PDF/XLSX. Frontend should upload to Azure Blob first via SAS, then call this with the buffer + blob URL. |
| `architectSpec.matchAlternatives({ specId, topN?, persona? })` | Run the Near-Match Algorithm across every parsed row, persist top match back to `architect_spec_assemblies`. |

All endpoints are `protectedProcedure` and check `architectId === ctx.user.id` before returning anything.

## New services

- `server/services/architect-spec-parser.ts` — Pipeline entry. Calls `getDocumentTablesFromAzure()`, classifies rows by EWS-1A → EWS-5 assembly code, normalises units to kgCO2e per 1000 SF (1000 SF = 92.903 m²), inserts batch rows.
- `server/services/architect-spec-matcher.ts` — Near-Match Algorithm. Hard filter by assembly type + carbon-better, rank by GCS, slice top N, persist top match's `epdMaterialId`.

## Required env vars

Already in the repo, but for reference:

```
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=https://<your-resource>.cognitiveservices.azure.com/
AZURE_DOCUMENT_INTELLIGENCE_KEY=<key>
```

If unset, `parseArchitectSpec()` will throw before touching the DB and write `failed` status to `architect_uploaded_specs`.

## Frontend integration (what to build next)

1. **Architect spec upload page** — `app/architect/specs/upload/page.tsx`. Drag-drop PDF/XLSX, request SAS via existing endpoint, PUT to blob, then call `architectSpec.uploadAndParse`.
2. **Spec results page** — `app/architect/specs/[specId]/page.tsx`. Render `architectSpec.getSpec` with a "Run match" button that calls `matchAlternatives` and shows top 5 alternatives per row with carbon-savings badge.
3. **Material Credit Score widget** — Reads `v_material_latest_gcs` for any material card.
4. **Supplier scoreboard** — Reads `v_supplier_scoreboard` for the public leaderboard page.

## Implementation backlog (post-migration)

| Item | Why |
|---|---|
| **GCS v2 scoring service** | Replace `server/services/material-credit-score.ts` with the 60/40 sustainability/performance split. Current matcher uses the legacy 4-factor score as a proxy. |
| **RFQ generation engine** | After matching, generate PDF/Excel/Revit/Intercom RFQ outputs into `generated_rfqs`. |
| **SRS cron** | Recompute `srs_score` nightly from `rfq_response_events`, write to `supplier_reliability_history`. |
| **Company of the Week cron** | Weekly job picks top SRS supplier with hidden_from_search=false, writes one row to `featured_suppliers` (UNIQUE on week_start makes it idempotent). |
| **Lead-credit unlock endpoint** | `subscription.unlockArchitectContact({ architectId })` — debits ledger, returns contact info. |
| **Monthly lead-credit grant cron** | First of every month: `INSERT INTO lead_credit_ledger` with reason `monthly_grant`, amount = `monthly_lead_credit_allowance`. |

## Verification before deploy

```bash
# 1. Syntax check (already done — sqlparse passed both files cleanly)
python3 -c "import sqlparse, pathlib; [sqlparse.parse(p.read_text()) for p in pathlib.Path('drizzle').glob('003[01]_*.sql')]"

# 2. Local apply
docker compose up -d postgres
DATABASE_URL=postgres://... npm run db:migrate

# 3. Smoke test the architect upload pipeline
DATABASE_URL=... npx tsx -e "
  import { parseArchitectSpec } from './server/services/architect-spec-parser';
  import { readFileSync } from 'fs';
  parseArchitectSpec({
    architectId: '<test user id>',
    fileBuffer: readFileSync('./tests/fixtures/embodied-carbon-tables.pdf'),
    originalFilename: 'embodied-carbon-tables.pdf',
    blobUrl: 'https://example.com/test.pdf',
  }).then(r => console.log(JSON.stringify(r, null, 2)));
"
```

## Files in this changeset

```
drizzle/0030_mcs_enums.sql                       NEW   47 lines
drizzle/0031_mcs_tables.sql                      NEW   ~390 lines
drizzle/schema-additions-mcs.ts                  NEW   ~250 lines (Drizzle TS schema)
server/services/architect-spec-parser.ts         NEW   ~280 lines
server/services/architect-spec-matcher.ts        NEW   ~150 lines
server/routers/architect-spec.ts                 NEW   ~120 lines
server/routers.ts                                EDIT  added architectSpec mount
```
