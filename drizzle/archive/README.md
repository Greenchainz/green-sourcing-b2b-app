# Archived Migration Files

These SQL files are **not** referenced by `drizzle/meta/_journal.json`, which means
`drizzle-kit migrate` will **never execute them**. They are historical artifacts from
earlier `drizzle-kit generate` runs and schema changes that were applied to the
database via `pnpm run db:push` (or manually) instead of through the migration journal.

They are kept here for reference only — do not move them back into `drizzle/` and do
not add them to the journal; re-running them against the production database would
fail or corrupt data because their DDL has already been applied.

## Authoritative migration sources

- `drizzle/*.sql` + `drizzle/meta/_journal.json` — journal-managed migrations run by
  `pnpm run db:migrate` (drizzle-kit).
- `drizzle/migrations/*.sql` — hand-written, date-named migrations applied manually
  (e.g. `20260803_revoked_jtis_table.sql`).

New schema changes: edit `drizzle/schema.ts`, then `pnpm run db:generate` followed by
`pnpm run db:migrate`.
