# ⚠️ ARCHIVE — DO NOT CODE FROM THESE DOCUMENTS

This directory contains **historical documents** from earlier phases of GreenChainz development.
They are preserved for audit trail purposes only.

## Why These Are Dangerous

Many docs here describe a **Next.js + NextAuth architecture that was removed**.
If you implement anything from these files, you will break the current app.

**Specifically wrong in these docs:**
- NextAuth session handling → replaced with custom Express OAuth + JWT cookies
- Azure Easy Auth sidecar → NOT used (was considered, then dropped)
- Next.js middleware patterns → this is an Express app, there is no Next.js middleware
- App Router / `pages/` routing → does not exist in this codebase
- Supabase references → we use Azure PostgreSQL

## What to Use Instead

| You want to know about... | Read this instead |
|--------------------------|------------------|
| Current auth architecture | `docs/AUTH_ARCHITECTURE.md` |
| Tech stack | `docs/STACK.md` |
| Environment setup | `docs/ENV_SETUP.md` |
| Database / ORM | `drizzle/schema.ts` + `lib/pg-pool.ts` |
| Overall orientation | `CLAUDE.md` (repo root) |

## Rule

**If a document in this archive contradicts `docs/STACK.md` or `CLAUDE.md`, the archive document is wrong.**
Do not open a PR that implements patterns from this archive without explicit sign-off from @jnorvi5.
