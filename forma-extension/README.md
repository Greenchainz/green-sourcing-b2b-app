# GreenChainz Forma Extension

Surfaces the GreenChainz verified green materials catalog directly inside **Autodesk Forma** — no tab switching, no copy-paste.

## What it does

| Panel | Function |
|-------|----------|
| **Left (Search)** | Search 100,000+ verified EPDs by keyword or category, view Material Credit Scores, fire an RFQ without leaving Forma |
| **Right (Analysis)** | Select a building element → auto-detect material → show embodied carbon (kgCO₂e) → suggest greener alternatives from GreenChainz SWAP Engine |

## Tech stack

- `forma-embedded-view-sdk` — Autodesk Forma Extension SDK
- Preact (lightweight React-compatible, ~3KB)
- Vite
- TypeScript strict

## Local dev

```bash
cd forma-extension
cp .env.example .env.local
pnpm install
pnpm dev       # starts on http://localhost:8081
```

The dev server runs on port 8081. In Autodesk Forma:
1. Open a project
2. Go to Extensions → Add Extension
3. Enter your Extension ID (from APS portal)
4. The extension will load from `http://localhost:8081/left.html` (left panel) and `http://localhost:8081/right.html` (right panel)

## APS Portal setup

1. Go to [Autodesk Platform Services](https://aps.autodesk.com)
2. Open your app → **Extensions** tab
3. Create a new extension with:
   - Left panel URL: `http://localhost:8081/left.html` (dev) / `https://forma.greenchainz.com/left.html` (prod)
   - Right panel URL: `http://localhost:8081/right.html` (dev) / `https://forma.greenchainz.com/right.html` (prod)

## Production build

```bash
pnpm build    # outputs to dist/
```

Deploy `dist/` to Azure Static Web Apps or any CDN. Point the APS portal Extension URLs at the deployed domain.

## GreenChainz API endpoints used

| Endpoint | Auth | Purpose |
|----------|------|---------|
| `GET /api/materials/search` | Public | Material search + category filter |
| `GET /api/materials/:id` | Public | Single material detail |
| `GET /api/materials/:id/swaps` | Public | Greener alternatives |
| `POST /api/rfq/add-item` | Bearer token | Add material to RFQ |
