# GreenChainz — Green Sourcing B2B App

## Overview

GreenChainz is a B2B sustainability platform connecting buyers with eco-friendly suppliers. It provides tools for material sourcing, RFQ management, supplier discovery, compliance tracking, and AI-assisted green procurement.

## Architecture

- **Full-stack TypeScript** monorepo
- **Frontend**: React 19 + Vite + TailwindCSS + Radix UI
- **Backend**: Express 5 + tRPC + Drizzle ORM
- **Database**: PostgreSQL (via `pg` pool + Drizzle)
- **Auth**: Custom JWT + Azure AD / OAuth2 (Better Auth)
- **Dev server**: Single unified Express server that serves frontend via Vite middleware in development

## Project Structure

```
client/           # React frontend (Vite root)
  src/            # App source: pages, components, hooks, contexts
server/           # Express backend
  _core/          # Server bootstrap (index.ts, vite.ts, env.ts, auth)
  routers/        # tRPC routers
  services/       # Business logic services
  db.ts           # Drizzle ORM entry point
lib/              # Shared utilities (pg-pool, db, secrets)
drizzle/          # Drizzle schema + migrations
shared/           # Types shared between client and server
components/       # Shared UI components (shadcn/ui)
```

## Key Files

- `server/_core/index.ts` — Express server entry point (starts on PORT, default 5000)
- `server/_core/vite.ts` — Vite dev middleware integration
- `vite.config.ts` — Vite config (root: `client/`, aliases: `@` → `client/src`, `@shared` → `shared/`)
- `lib/pg-pool.ts` — PostgreSQL connection pool singleton
- `lib/secrets.ts` — Azure Key Vault secrets loader (falls back to env in dev)
- `drizzle/schema.ts` — Database schema

## Development

```bash
pnpm run dev        # Start dev server (Express + Vite middleware)
pnpm run build      # Build frontend + bundle backend
pnpm run db:push    # Push schema to database
pnpm run db:migrate # Run migrations
```

## Environment Variables

See `.env.example` and `.env.local.example` for required variables.

Key variables:
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — Session signing secret
- `PORT` — Server port (set to 5000 for Replit)
- `NODE_ENV` — `development` or `production`
- `AZURE_AD_CLIENT_ID` / `AZURE_AD_CLIENT_SECRET` — Azure AD OAuth
- `AZURE_OPENAI_ENDPOINT` / `AZURE_OPENAI_API_KEY` — Azure OpenAI

## Replit Configuration

- **Workflow**: `pnpm run dev` on port 5000 (webview)
- **Deployment**: autoscale, build=`pnpm run build`, run=`node dist/index.js`
- The server listens on `0.0.0.0:5000` in development
- Vite is configured with `allowedHosts: true` for proxy compatibility

## New Components & Routers (added May 2026)

- `server/featured-router.ts` — Featured placement tRPC router (`featured.*` procedures); admin can set `isFeatured` + `featuredUntil` on materials/suppliers
- `server/manufacturer-search-router.ts` — Public manufacturer search (`manufacturerSearch.search`); used on supplier landing page
- `client/src/components/ArchitectMaterialCard.tsx` — Architect-first material card with LEED credit callouts, carbon bar, basket state
- `client/src/components/FeaturedRow.tsx` — Horizontal scroll row for featured materials in catalog
- `client/src/components/MaterialImageUpload.tsx` — Drag-and-drop image uploader (POSTs to `/api/supplier/upload-image`)
- Image upload endpoint added to `server/upload-route.ts` at `POST /api/supplier/upload-image`

## Database Columns Added

- `materials`: `imageUrl`, `imageBlobName`, `imageUpdatedAt`, `isFeatured`, `featuredUntil`
- `suppliers`: `isFeatured`, `featuredUntil`
- `price_history`: created (required by price-trends service)

## Notes

- Azure Key Vault secrets are only loaded in production (Managed Identity). In dev, use `.env.local`.
- DB schema errors on startup are expected if `DATABASE_URL` is not set — the app degrades gracefully.
- Schedulers (RFQ, notifications, EPD sync) run in the background and log errors if DB is unavailable.
- WebPubSub warnings are expected if `AZURE_WEBPUBSUB_CONNECTION_STRING` is not set.
- `materials.list` and `materials.semanticSearch` are public — catalog browses without login.
- Material images require `AZURE_STORAGE_CONNECTION_STRING` + a `material-images` blob container with public read access.
- Analytics script (`%VITE_ANALYTICS_ENDPOINT%`) removed from `client/index.html` — was causing server URIError crashes.
