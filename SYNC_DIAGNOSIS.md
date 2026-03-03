# GreenChainz Sync Diagnosis

## The Problem: Three Separate Systems, No Unified Pipeline

### Environment 1: Azure / greenchainz.com (PRODUCTION)
- **Framework**: Next.js (app/ directory)
- **Deployment**: Azure Container Apps via azure-pipelines.yml + Dockerfile
- **Trigger**: Pushes to `main` branch on GitHub
- **What it shows**: The Next.js marketing site (app/page.tsx)

### Environment 2: Manus Dev Server (DEVELOPMENT)
- **Framework**: Vite + React + Express + tRPC (client/ directory)
- **Deployment**: Manus sandbox (auto-runs on port 3000)
- **What it shows**: The Vite-based app (client/src/pages/Home.tsx)

### Environment 3: GitHub Repository
- **Contains BOTH**: Next.js app/ AND Vite client/ directories
- **Currently synced to**: Manus (commit 6b320021)

## Root Cause

**The repo contains TWO completely different applications in one repository:**

1. `app/` — Next.js application (what Azure deploys to greenchainz.com)
2. `client/` — Vite/React application (what Manus runs as dev server)

When Manus pushes code, it updates `client/`, `server/`, `drizzle/` etc. but Azure's pipeline builds from `app/` + `next.config.js` + `Dockerfile`. The two apps share the same repo but are completely independent codebases.

## Why They Don't Line Up

| What | Azure sees | Manus sees |
|------|-----------|------------|
| Homepage | `app/page.tsx` (Next.js) | `client/src/pages/Home.tsx` (Vite) |
| Router | Next.js App Router | Wouter (client-side) |
| Backend | `app/api/` routes | `server/routers.ts` (tRPC) |
| Database | Prisma + PostgreSQL | Drizzle + TiDB/MySQL |
| Auth | Azure Entra ID | Manus OAuth |
| Build | `npm run build` (Next.js) | `vite build` + `esbuild` |

## Impact

- New features built in Manus (swap engine, TXDOT scraper, validation engine) exist in `server/` and `drizzle/` — Azure ignores these
- The Next.js app in `app/` has its own pages, components, and API routes that Manus doesn't touch
- Pushing to GitHub triggers Azure pipeline, but it builds the OLD Next.js app, not the new Manus features
