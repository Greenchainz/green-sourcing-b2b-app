# GreenChainz — Full Repo Audit (2026-05-25)

> Code-level audit of all repos. Read every router, CI workflow, and Dockerfile.
> Surface-level package.json inspection was NOT used for these conclusions.

---

## TL;DR — What's Built vs. What's Blocking Launch

| Repo | Code Status | CI/CD | Blocker |
|---|---|---|---|
| `green-sourcing-b2b-app` | ✅ Complete | ✅ Has workflows | None |
| `greenchainz-sda-connector` | ✅ Complete | ✅ Has workflow | Azure infra + secrets |
| `greenchainz-revit-plugin` | ✅ Complete | ✅ Has workflows | Azure infra + secrets |
| `forma-extension` | ✅ Complete | ✅ Has workflow | 1 GitHub secret |
| `greenchainz-intelligence` | ✅ Complete | ✅ Has workflows | OIDC vars + Azure Function Apps |
| `greenchainz-mobile` | ✅ Feature-complete | ❌ No CI | Not a current priority |

**Every repo has working code. Every blocker is Azure infra or GitHub secrets — not missing features.**

---

## 1. `green-sourcing-b2b-app` — Main Platform

The hub everything else calls into.

### Public API — serves ALL satellite repos

File: `server/public-materials-api.ts`, mounted at `/api/public`

| Endpoint | Who calls it |
|---|---|
| `GET /api/public/materials/search` | Forma Extension (left panel) |
| `GET /api/public/materials/:id/swaps` | Forma Extension (right panel, SWAP engine) |
| `GET /api/public/suppliers` | Revit Plugin web API |
| `POST /api/public/rfq/add-item` | Forma Extension (RFQ flow) |
| `GET /api/public/auth/verify` | Forma Extension (token validation) |

All five endpoints are fully implemented with Drizzle ORM queries, supplier matching,
and fire-and-forget RFQ email notifications. **No gaps.**

### Docker security (fixed this session)
- All three Dockerfiles (`Dockerfile`, `Dockerfile.backend`, `Dockerfile.frontend`) updated:
  - Build stages: `apt-get upgrade -y` to pull glibc patches
  - Runtime stage: switched from `dhi.io/node:22-debian13` to `node:22-bookworm-slim` + `apt-get upgrade`

### pnpm overrides (fixed this session)
Pinned: `uuid >=11.0.0`, `qs ~6.14.2`, `vite`, `rollup`, `esbuild`, `undici`, `dompurify`,
`fast-xml-parser`, `tar`, `@opentelemetry/*`, `nodemailer`, `protobufjs`

---

## 2. `greenchainz-sda-connector`

**What it actually does (NOT the defunct Autodesk SDA data feed):**
- Receives BIM model URNs from the Revit plugin or main platform
- Calls **APS Model Derivative API** (Autodesk Platform Services — still live) to extract material data from BIM models
- Looks up GWP carbon factors from the **local EC3/materials DB** (not a live API call)
- Returns carbon audit results with per-material GWP breakdown

### Key files
- `4_connector.ts` — Express router with all endpoints
- `lib/sda-analyzer.ts` — APS carbon audit pipeline
- `Dockerfile` — Multi-stage Node build
- `.github/workflows/deploy-azure.yml` — CI/CD

### Endpoints implemented
```
POST /api/autodesk/analyze-model     # BIM carbon audit via APS
GET  /api/autodesk/export-material   # Material data export
POST /api/rfqs/create-from-model     # RFQ from BIM model audit
GET  /api/rfqs/:rfqId                # RFQ status
POST /api/materials/swap             # SWAP Engine
GET  /api/materials/search           # Material search
GET  /api/autodesk/health            # Health check
POST /api/autodesk/carbon-audit      # Full carbon audit (consumes credits)
GET  /api/price-trends/:category     # Price trend data
GET  /epds/categories                # EPD category list
GET  /admin/ec3-stats                # Admin stats
```

### CI/CD config
- **Target:** Container App `greenchainz-sda-connector`, RG `rg-greenchainz-prod-container`
- **ACR:** `acrgreenchainzprod916`
- **Command:** `az containerapp update` — **Container App must already exist in Azure**
- **Trigger:** push to `main` or `workflow_dispatch`

### Secrets needed in GitHub (`greenchainz-sda-connector` repo)
```
AZURE_CREDENTIALS    # az login service principal JSON
ACR_USERNAME         # acrgreenchainzprod916 admin username
ACR_PASSWORD         # acrgreenchainzprod916 admin password
```

### Env vars needed in Container App secrets
```
DATABASE_URL
AUTODESK_CLIENT_ID
AUTODESK_CLIENT_SECRET
SENTRY_DSN           # optional but recommended
```

---

## 3. `greenchainz-revit-plugin`

Two independent subsystems — C# plugin + Next.js `web/` API.

### C# Plugin
- Targets Revit 2026, built with `.NET 8`, `x64`
- NuGet: `Nice3point.Revit.Api.RevitAPI` — no stub DLLs needed, CI works without Revit installed
- Services: `AuditService`, `MaterialService`, `RfqService`, `LeedCalculatorService` (v4.1 + v5 + MRpc132), `TelemetryService`
- Calls GreenChainz `web/` API with Bearer token for RFQ, audit submission
- Falls back to local file save (`%MyDocuments%/GreenChainz/RFQs/`) if API unavailable

### Next.js `web/` API (middleware for Revit ↔ GreenChainz)
Routes: `POST /api/rfq`, `GET /api/rfq?id=`, `GET /api/suppliers`, `POST /api/suppliers`, `POST /api/audit`

The suppliers endpoint proxies to `greenchainz.com/api/public/suppliers` — which exists ✅

### CI/CD
**`ci-plugin.yml`** — runs on push to `src/`, `tests/`:
- `dotnet restore` + `dotnet build` on `windows-latest`
- Also builds and lints `web/` (Next.js)

**`release.yml`** — triggered by `v*` tags:
- Builds MSI with **WiX Toolset v3.11**
- Publishes `GreenChainzSetup-vX.X.X.msi` to GitHub Release
- Per-user install → `%APPDATA%\Autodesk\Revit\Addins\2026\`

**`deploy-web.yml`** — deploys `web/` Next.js API:
- **Target:** Container App `greenchainz-revit-web`, RG `rg-greenchainz-prod-container`
- **ACR:** `acrgreenchainzprod916` (same as SDA connector)
- **Command:** `az containerapp update` — **Container App must already exist**

### Secrets needed in GitHub (`greenchainz-revit-plugin` repo)
```
AZURE_CREDENTIALS    # same service principal as SDA connector
```

### Env vars needed in Container App secrets
```
DATABASE_URL                 # secretref:database-url
GREENCHAINZ_API_SECRET       # secretref:greenchainz-api-secret (validates Revit bearer tokens)
```

### To ship the plugin to users
Push a `v1.0.0` tag — GitHub Actions builds and publishes the MSI automatically.
Architects download and run `GreenChainzSetup-v1.0.0.msi`.

---

## 4. `forma-extension`

Preact app running inside Autodesk Forma's left and right panels.

### What's built
**Left panel** (`src/pages/left/MaterialSearch.tsx`):
- Keyword search + category chips (Concrete, Steel, Timber, Insulation, Masonry, Glass, Roofing, Aluminum, Gypsum, Flooring)
- GWP range slider + MCS score filter
- SWAP suggestions (lazy-loaded per card)
- "Add to RFQ" → opens GreenChainz RFQ flow as a Forma floating panel
- "View EPD" → links to epdUrl or EC3 document

**Right panel** (`src/pages/right/CarbonAnalysis.tsx`):
- Reads selected Forma element's material properties via Forma SDK
- Looks up matching GreenChainz materials for verified EPD/GWP data
- Fires "Interceptor" callout (per `SALES_PSYCHOLOGY.md`) when material GWP > 200 kgCO₂e
- SWAP Engine inside Forma — this is the killer feature

### API dependencies — all satisfied by main platform
```
GET  https://greenchainz.com/api/public/materials/search   ✅ exists
GET  https://greenchainz.com/api/public/materials/:id/swaps ✅ exists
POST https://greenchainz.com/api/public/rfq/add-item        ✅ exists
GET  https://greenchainz.com/api/public/auth/verify         ✅ exists
```

### CI/CD
**`deploy.yml`** → **Azure Static Web Apps** (not a container):
```yaml
azure/static-web-apps-deploy@v1
app_location: "dist"
```
Builds with Vite (`pnpm build`), deploys `dist/` to Azure SWA.

**Target URL:** `https://forma.greenchainz.com/` (left.html, right.html)

### Secrets needed in GitHub (`forma-extension` repo)
```
AZURE_STATIC_WEB_APPS_API_TOKEN_FORMA   # from Azure portal when SWA is provisioned
```

### To provision the Azure Static Web App
1. Azure Portal → Static Web Apps → Create
2. Link to `Greenchainz/forma-extension` repo
3. Copy the deployment token → set as `AZURE_STATIC_WEB_APPS_API_TOKEN_FORMA`
4. Set custom domain `forma.greenchainz.com`

---

## 5. `greenchainz-intelligence`

Three independently deployed components in one repo.

### A. Python Azure Functions (root)
Scrapers: `SupplierScraper`, `CustomerScraper`, `AutodeskScraper`, `EC3Scraper`, `EPDScraper`,
`ArchitectFirmScraper`, `CostScraper`, `DecisionMakerScraper`

All use `shared/scraper_utils.py` for HTTP retries, structured logging, config loading.

**Deploy target:** Azure Function App `greenchainz-scrapers-py`, RG `rg-greenchainz`

### B. ScraperAgent — Node.js (`scraper-agent-app/`)
Separate Node.js Azure Functions app (Python and Node can't share one Function App).

**Deploy target:** Azure Function App `greenchainz-scraper`, RG `rg-greenchainz`

### C. Audit API (`greenchainz-audit-api/`)
Next.js 16 app — the AI Audit Agent / LEED scoring microservice.

Routes implemented:
```
POST /api/audit     # LEED credit calculation (paid + free tier)
POST /api/checkout  # Marketplace checkout
GET  /api/credits   # Credit balance
GET  /api/health    # Health check
POST /api/leads     # Lead capture
POST /api/scrape    # Supplier scrape proxy (via Spoke API)
POST /api/upload    # Document upload
```

Has Azure Marketplace metering (`validateMarketplaceToken`, `reportAuditUsage`) — paid tier
already wired. Free tier with rate limiting by IP+UA hash.

**Deploy target:** Azure Web App `greenchainz-audit-api`, RG `rg-greenchainz`
**ACR:** `greenchainzregistry` ⚠️ — different from `acrgreenchainzprod916` used by SDA+Revit

### CI/CD — `deploy.yml` (intelligence root)
Uses **OIDC** (no stored credentials):
```yaml
azure/login@v2:
  client-id: ${{ vars.AZURE_CLIENT_ID }}
  tenant-id: ${{ vars.AZURE_TENANT_ID }}
  subscription-id: ${{ vars.AZURE_SUBSCRIPTION_ID }}
```
Pulls all secrets from Key Vault at runtime.

### GitHub Variables needed (not secrets) — intelligence repo
```
AZURE_CLIENT_ID       = 479e2a01-70ab-4df9-baa4-560d317c3423
AZURE_TENANT_ID       = ca4f78d4-c753-4893-9cd8-1b309922b4dc
AZURE_SUBSCRIPTION_ID = <your Azure sub ID>
KEYVAULT_NAME         = Greenchainz-vault
```

The OIDC login requires a **Federated Identity Credential** on the app registration — must be
configured in Azure Portal → App Registrations → `479e2a01-...` → Certificates & secrets →
Federated credentials → GitHub Actions.

### Env vars needed in Audit API Container (Azure secrets/app settings)
```
AZURE_AD_TENANT_ID       = ca4f78d4-c753-4893-9cd8-1b309922b4dc
AZURE_AD_CLIENT_ID       = <audit api app registration>
AZURE_AD_CLIENT_SECRET
DATABASE_URL
MARKETPLACE_AUDIT_DIMENSION = leed_audit
MARKETPLACE_LANDING_URL  = https://greenchainz.com/subscription
SPOKE_API_URL            # scrape proxy — required in prod
```

---

## 6. `greenchainz-mobile` — Parked

Expo SDK 52 + React Native 0.76. Feature-complete:
- Materials browse, material detail (9 EPD indicators), RFQ list/detail, supplier directory
- Azure Entra ID OIDC auth, tRPC client, barcode scanner
- No CI/CD workflow

**Status:** Web is responsive. Mobile is not a priority right now.
When ready: EAS Build (`eas build --platform all`) → App Store / Play Store.

---

## Cross-Cutting Issues

### ⚠️ ACR name mismatch
| Repo | ACR used |
|---|---|
| `greenchainz-sda-connector` | `acrgreenchainzprod916` |
| `greenchainz-revit-plugin` (web) | `acrgreenchainzprod916` |
| `greenchainz-intelligence` (audit-api) | `greenchainzregistry` |

Verify in Azure Portal which ACR actually exists (or if both exist).
If only one exists, update the non-matching workflow.

### Container Apps that must exist before first deploy
All workflows use `az containerapp update`, not `az containerapp create`.
If the Container App doesn't exist yet, the deploy will fail. Create them first:

```bash
# SDA Connector
az containerapp create \
  --name greenchainz-sda-connector \
  --resource-group rg-greenchainz-prod-container \
  --environment <your-aca-environment> \
  --image nginx:latest   # placeholder, will be replaced by CI

# Revit Plugin Web API
az containerapp create \
  --name greenchainz-revit-web \
  --resource-group rg-greenchainz-prod-container \
  --environment <your-aca-environment> \
  --image nginx:latest
```

### Secrets matrix — what goes where

| Secret | main-app | sda-connector | revit-plugin | forma-extension | intelligence |
|---|---|---|---|---|---|
| `AZURE_CREDENTIALS` | ✅ (existing) | ❌ needs setting | ❌ needs setting | — | — |
| `ACR_USERNAME` | ✅ (existing) | ❌ needs setting | — | — | — |
| `ACR_PASSWORD` | ✅ (existing) | ❌ needs setting | — | — | — |
| `AZURE_STATIC_WEB_APPS_API_TOKEN_FORMA` | — | — | — | ❌ needs setting | — |
| `AZURE_CLIENT_ID` (var) | — | — | — | — | ❌ needs setting |
| `AZURE_TENANT_ID` (var) | — | — | — | — | ❌ needs setting |
| `AZURE_SUBSCRIPTION_ID` (var) | — | — | — | — | ❌ needs setting |
| `KEYVAULT_NAME` (var) | — | — | — | — | ❌ needs setting |

---

## Launch Sequence

Order matters — the main platform must be live before anything else can call it.

1. **`green-sourcing-b2b-app`** — already deploying (CI/CD already exists)
2. **`forma-extension`** — provision Azure SWA → set secret → push to main → live immediately
3. **`greenchainz-sda-connector`** — create Container App → set 3 secrets → push to main
4. **`greenchainz-revit-plugin`** — create Container App for web/ → set `AZURE_CREDENTIALS` → push to main; tag `v1.0.0` to ship MSI
5. **`greenchainz-intelligence`** — create Function Apps + Audit API Web App → set OIDC vars → push to main
6. **`greenchainz-mobile`** — EAS Build when ready

---

*Generated by code audit — 2026-05-25. All findings from actual source files, not package.json inspection.*
