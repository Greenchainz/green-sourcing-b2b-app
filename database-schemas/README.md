# ⚠️ DEPRECATED — Do Not Use

> **This entire directory is obsolete.** These raw SQL files were written before Drizzle ORM was adopted as the authoritative schema system. They are kept for historical reference only.
>
> **Do NOT run any file from this directory against a database.**
> **Do NOT use these files to understand the current schema.**
>
> ### What to use instead
>
> | Task | Correct location |
> |---|---|
> | Read/edit the live schema | `drizzle/schema.ts` (+ `drizzle/schema-additions-mcs.ts`) |
> | Generate a new migration | `pnpm run db:generate` → outputs to `drizzle/0NNN_*.sql` |
> | Apply migrations | `pnpm run db:migrate` |
> | Add incremental one-off SQL | `drizzle/migrations/<timestamp>_description.sql` |

---

# Database Schemas (HISTORICAL REFERENCE ONLY)

This directory contains legacy database schemas and migration files that predate the adoption of Drizzle ORM.

## Azure Postgres (RFQ Simulator) Schema

The repo historically contained multiple schema variants (some BIGINT/SERIAL, some UUID). The backend RFQ distribution + growth campaign code expects **UUID** tables like `rfqs(id)`, `suppliers(id)`, and the quoted distribution tables (e.g. `"RFQ_Distribution_Queue"`).

Use this file as the canonical Azure Postgres schema for the RFQ simulator:

- `azure_postgres_rfq_simulator.sql`

### How to Apply on Azure Database for PostgreSQL

You can run it from any machine with `psql` installed (or from an Azure-hosted runner):

```bash
psql "$DATABASE_URL" -f database-schemas/azure_postgres_rfq_simulator.sql
```

Where `DATABASE_URL` looks like:

```text
postgresql://<user>:<password>@<server>.postgres.database.azure.com:5432/<db>?sslmode=require
```

### Notes

- This script is **idempotent** (safe to re-run).
- It intentionally creates some tables with **quoted names** (e.g. `"RFQ_Distribution_Queue"`) because backend code queries those exact identifiers.
- Older files like `mvp_schema.sql`, `schema.sql`, and some `migrations/*` may not match the UUID-based RFQ simulator workflow.
