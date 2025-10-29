# Copilot Instructions for this repo

This repo is a minimal, multi-folder skeleton for a B2B platform (“GreenChainz”) with Node/Express backend, React frontend, and a Postgres database brought up by Docker Compose.

## Architecture and source of truth

- Top-level directories are the primary working tree:
  - `backend/` — Node.js + Express entrypoint in `backend/index.js` (no package.json yet).
  - `frontend/` — placeholder for a React app (empty aside from README).
  - `database-schemas/` — placeholder for SQL/migrations.
  - `docker-compose.yml` — runs Postgres only (no API service defined yet).
- There is a duplicated nested tree at `green-sourcing-b2b-app/` with the same structure and content. Unless explicitly required, prefer editing the top-level files to avoid drift.

## Runtime and ports

- Database: Postgres 15 via `docker-compose.yml`
  - Service/container: `greenchainz_db`
  - Env: `POSTGRES_USER=user`, `POSTGRES_PASSWORD=password`, `POSTGRES_DB=greenchainz_dev`
  - Port: host `5432` -> container `5432`
  - Example connection string: `postgres://user:password@localhost:5432/greenchainz_dev`
- Backend: `backend/index.js` listens on port `3001` (when run with Node). No Compose service is defined for it yet.

## Typical local workflow (Windows PowerShell)

1. Start Postgres
   - `docker compose up -d` (from repo root)
2. Backend prerequisites (repo doesn’t include Node deps yet)
   - Create `backend/package.json` and install `express` before running `node backend/index.js`.
   - Keep versions pinned and add start scripts when you introduce features.

## Coding patterns to follow here

- Backend API: plain Express. Add routes directly in `backend/index.js` until structure expands.
  - Example: add a health endpoint
    - File: `backend/index.js`
    - Pattern: `app.get('/health', (_,res)=>res.json({ok:true}))`
- Database access: not implemented yet. When you add it, prefer environment-based connection using the Compose values above.
- Frontend: not scaffolded. If you add React here, keep it under `frontend/` and document how it runs.

## Cross-cutting conventions

- Prefer top-level tree over the duplicated nested tree. If you must touch both, keep them identical.
- Keep Compose as the single source of truth for DB config. If you add an API container, wire it into `docker-compose.yml` with `depends_on: [db]` and the same envs.
- Use `.env` files only if you also document them in the README and reference from Compose/npm scripts.

## Key files to read first

- `docker-compose.yml` — DB service, names, credentials, ports, volume.
- `backend/index.js` — Express entrypoint and initial route.
- `README.md` — short project description; subfolder READMEs describe intended roles.

## Pitfalls and gotchas

- Missing Node metadata: there is no `package.json` or lockfile in `backend/`. Install and pin dependencies before adding features.
- Duplicate tree: edits in `green-sourcing-b2b-app/` won’t affect the top-level app. Pick one (prefer top-level) and be consistent.

## Quick checks after changes

- Backend: start DB, run `node backend/index.js`, hit `http://localhost:3001/` and any new routes you add.
- DB: `psql` to `greenchainz_dev` with the env above; ensure tables/migrations live under `database-schemas/`.
