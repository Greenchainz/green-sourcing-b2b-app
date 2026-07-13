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
> | Generate a new migration | `pnpm exec drizzle-kit generate` → outputs to `drizzle/0NNN_*.sql` |
> | Apply journaled migrations | `pnpm run db:migrate` |
> | One-off SQL changes | Add a timestamped file to `drizzle/migrations/` — **note**: these are NOT applied automatically by `pnpm run db:migrate` or CI/CD; you must apply them manually or add a dedicated runner step. |

---

# Database Schemas (HISTORICAL REFERENCE ONLY)

This directory contains legacy database schemas and migration files that predate the adoption of Drizzle ORM. **Do not use any file here for production operations.**
