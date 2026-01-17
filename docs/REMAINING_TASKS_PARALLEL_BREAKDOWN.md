# GreenChainz - Remaining Tasks for Parallel Agent Execution

**Generated:** January 17, 2026  
**Purpose:** All remaining tasks grouped so you can run multiple agents in parallel without conflicts.

---

## 🎯 Quick Summary

Based on analysis of the repository, you have **70+ individual tasks** across 9 work zones. Here's how to run them in parallel:

### Maximum Parallel Agents: **15-25 agents** (recommended: 15 for safety)

---

## 📋 AGENT GROUPS - Copy/Paste Ready

### GROUP A: Core Infrastructure (Run First - Dependencies for Others)

**⚠️ These must complete before starting Groups B-E**

| Agent # | Zone | Task | Files to Edit | Priority |
|---------|------|------|---------------|----------|
| A1 | Z6 | Auth Library | `lib/auth.ts` | Critical |
| A2 | Z6 | Azure Integration | `lib/azure/` | Critical |
| A3 | Z6 | Database Client | `lib/db.ts`, `lib/azure-db.ts` | Critical |
| A4 | Z4 | Database Schema & Migrations | `database-schemas/` | Critical |

**Prompt for Agent A1:**
```
Complete and verify the auth library at lib/auth.ts. Ensure it:
- Works with Azure AD authentication
- Integrates with NextAuth.js
- Handles JWT verification
- Supports multi-tenant + personal accounts
Do not modify any files outside lib/auth.ts.
```

**Prompt for Agent A2:**
```
Complete the Azure integration libraries in lib/azure/. Ensure:
- Azure Blob Storage client works
- Azure SQL/PostgreSQL connection pool is configured
- Azure OpenAI SDK is properly configured
- All Azure SDKs use proper error handling
Do not modify files outside lib/azure/.
```

**Prompt for Agent A3:**
```
Complete the database client libraries at lib/db.ts and lib/azure-db.ts. Ensure:
- PostgreSQL connection pool is properly configured
- Parameterized queries prevent SQL injection
- Connection strings work with Azure PostgreSQL
- Error handling is robust
Do not modify files outside lib/db.ts and lib/azure-db.ts.
```

**Prompt for Agent A4:**
```
Review and complete database schemas in database-schemas/. Ensure:
- schema.sql is complete and has all required tables
- mvp_schema.sql is aligned with schema.sql
- Performance indexes are defined
- Migrations are properly sequenced
Do not modify any code files.
```

---

### GROUP B: API Routes (Can Run After Group A Starts)

**✅ Each agent works on independent API routes - NO conflicts**

| Agent # | Zone | Task | Files to Edit | Priority |
|---------|------|------|---------------|----------|
| B1 | Z3 | Auth APIs | `app/api/auth/` | Critical |
| B2 | Z3 | Supplier APIs | `app/api/supplier/` | High |
| B3 | Z3 | Submittal APIs | `app/api/submittal/` | High |
| B4 | Z3 | Scrape APIs | `app/api/scrape/` | Medium |
| B5 | Z3 | Audit APIs | `app/api/audit/` | Medium |
| B6 | Z3 | AI Agents API | `app/api/agents/` | Medium |

**Prompt for Agent B1:**
```
Complete authentication APIs in app/api/auth/. Implement:
- Azure AD sign-in/sign-out endpoints
- Session management
- Token refresh
- User profile retrieval
Only edit files in app/api/auth/.
```

**Prompt for Agent B2:**
```
Complete supplier APIs in app/api/supplier/. Implement:
- Supplier profile CRUD operations
- Supplier verification endpoints
- Product listing endpoints
- Location management
Only edit files in app/api/supplier/.
```

**Prompt for Agent B3:**
```
Complete submittal generation APIs in app/api/submittal/. Implement:
- PDF upload endpoint
- Submittal generation with Azure Document Intelligence
- PDF download endpoint
Only edit files in app/api/submittal/.
```

**Prompt for Agent B4:**
```
Complete scraping APIs in app/api/scrape/. Implement:
- EPD scraping endpoints
- Material data extraction
- Results caching
Only edit files in app/api/scrape/.
```

**Prompt for Agent B5:**
```
Complete audit APIs in app/api/audit/. Implement:
- Excel batch audit endpoint
- Material comparison
- Health grade calculation
Only edit files in app/api/audit/.
```

**Prompt for Agent B6:**
```
Complete AI agents API in app/api/agents/. Implement:
- Agent orchestration endpoints
- Decision logic extraction
- Defensibility analysis
Only edit files in app/api/agents/.
```

---

### GROUP C: Frontend Pages (Can Run Fully Parallel)

**✅ Each agent works on separate page directories - NO conflicts**

| Agent # | Zone | Task | Files to Edit | Priority |
|---------|------|------|---------------|----------|
| C1 | Z1 | Login/Signup Pages | `app/login/`, `app/signup/` | Critical |
| C2 | Z1 | Dashboard Buyer | `app/dashboard/` | High |
| C3 | Z1 | Supplier Dashboard | `app/supplier/` | High |
| C4 | Z1 | Materials Catalog | `app/catalog/`, `app/materials/` | High |
| C5 | Z1 | RFQ Pages | `app/rfq/`, `app/rfqs/` | High |
| C6 | Z1 | Admin Analytics | `app/admin/` | Medium |
| C7 | Z1 | Excel Add-in | `app/excel-addin/` | Medium |
| C8 | Z1 | Chrome Extension | `app/chrome-extension/` | Low |
| C9 | Z1 | Revit Plugin | `app/revit-plugin/` | Low |
| C10 | Z1 | Legal/About Pages | `app/legal/`, `app/about/`, `app/careers/`, `app/contact/` | Low |

**Prompt for Agent C1:**
```
Complete login and signup pages at app/login/ and app/signup/. Implement:
- Azure AD sign-in button
- Email/password fallback (if needed)
- User registration flow
- Password reset flow
Only edit files in app/login/ and app/signup/.
```

**Prompt for Agent C2:**
```
Complete the buyer dashboard at app/dashboard/. Implement:
- Dashboard overview page
- RFQ management
- Supplier comparison
- Order history
Only edit files in app/dashboard/.
```

**Prompt for Agent C3:**
```
Complete the supplier dashboard at app/supplier/. Implement:
- Supplier profile management
- Product listing management
- RFQ response interface
- Analytics overview
Only edit files in app/supplier/.
```

**Prompt for Agent C4:**
```
Complete the materials catalog at app/catalog/ and app/materials/. Implement:
- Product browsing
- Filtering and search
- EPD data display
- GWP comparison
Only edit files in app/catalog/ and app/materials/.
```

**Prompt for Agent C5:**
```
Complete RFQ pages at app/rfq/ and app/rfqs/. Implement:
- RFQ creation form
- RFQ listing page
- RFQ detail view
- Response management
Only edit files in app/rfq/ and app/rfqs/.
```

**Prompt for Agent C6:**
```
Complete admin pages at app/admin/. Implement:
- Admin dashboard
- User management
- Supplier verification
- Analytics dashboard
Only edit files in app/admin/.
```

**Prompt for Agent C7:**
```
Complete the Excel add-in at app/excel-addin/. Implement:
- Excel sidebar UI
- Material audit functionality
- Results display in Excel
- Office.js integration
Only edit files in app/excel-addin/.
```

---

### GROUP D: Backend Services (Legacy - Can Run Parallel)

**✅ Each agent works on separate route files - NO conflicts**

| Agent # | Zone | Task | Files to Edit | Priority |
|---------|------|------|---------------|----------|
| D1 | Z5 | Backend Middleware | `backend/middleware/` | Critical |
| D2 | Z5 | RFQ Routes | `backend/routes/rfqs.js` | High |
| D3 | Z5 | Supplier Routes | `backend/routes/suppliers.js` | High |
| D4 | Z5 | AI Gateway | `backend/routes/ai-gateway.js` | High |
| D5 | Z5 | Payments Routes | `backend/routes/payments.js`, `subscriptions.js` | High |
| D6 | Z5 | Backend Services | `backend/services/` | Medium |

**Prompt for Agent D1:**
```
Complete backend middleware at backend/middleware/. Implement:
- JWT authentication middleware
- Role-based authorization
- Error handling middleware
- Request logging
Only edit files in backend/middleware/.
```

**Prompt for Agent D2:**
```
Complete RFQ routes at backend/routes/rfqs.js. Implement:
- RFQ CRUD operations
- RFQ distribution logic
- Response collection
Only edit backend/routes/rfqs.js.
```

**Prompt for Agent D3:**
```
Complete supplier routes at backend/routes/suppliers.js. Implement:
- Supplier CRUD operations
- Verification endpoints
- Product management
Only edit backend/routes/suppliers.js.
```

**Prompt for Agent D4:**
```
Complete AI gateway at backend/routes/ai-gateway.js. Implement:
- Azure OpenAI proxy
- Quota management
- Rate limiting
Only edit backend/routes/ai-gateway.js.
```

**Prompt for Agent D5:**
```
Complete payments routes at backend/routes/payments.js and subscriptions.js. Implement:
- Stripe checkout integration
- Subscription management
- Webhook handling
Only edit backend/routes/payments.js and backend/routes/subscriptions.js.
```

---

### GROUP E: AI Agents & Libraries (Can Run After Group A)

**✅ Each agent works on separate library files - NO conflicts**

| Agent # | Zone | Task | Files to Edit | Priority |
|---------|------|------|---------------|----------|
| E1 | Z7 | Scraper Agent | `lib/agents/scraper/` | High |
| E2 | Z7 | Submittal Agent | `lib/agents/submittal-generator.ts` | High |
| E3 | Z6 | Scoring Engine | `lib/scoring/` | High |
| E4 | Z7 | Decision Logic | `lib/agents/decision-logic-extractor.ts` | Medium |
| E5 | Z7 | Defensibility Agent | `lib/agents/defensibility-agent.ts` | Medium |
| E6 | Z6 | Email (Resend) | `lib/resend.ts` | Medium |

**Prompt for Agent E1:**
```
Complete the scraper agent at lib/agents/scraper/. Implement:
- EPD website scraping
- Data extraction logic
- Rate limiting
- Error handling
Only edit files in lib/agents/scraper/.
```

**Prompt for Agent E2:**
```
Complete submittal generator at lib/agents/submittal-generator.ts. Implement:
- PDF parsing with Document Intelligence
- Product matching logic
- Submittal PDF generation
Only edit lib/agents/submittal-generator.ts.
```

**Prompt for Agent E3:**
```
Complete scoring engine at lib/scoring/. Implement:
- GWP calculation
- Verification scoring
- Health grade algorithm
Only edit files in lib/scoring/.
```

**Prompt for Agent E4:**
```
Complete decision logic extractor at lib/agents/decision-logic-extractor.ts. Implement:
- Spec PDF analysis
- Criteria extraction
- Decision tree generation
Only edit lib/agents/decision-logic-extractor.ts.
```

**Prompt for Agent E5:**
```
Complete defensibility agent at lib/agents/defensibility-agent.ts. Implement:
- LEED compliance checking
- Certification verification
- Documentation generation
Only edit lib/agents/defensibility-agent.ts.
```

---

### GROUP F: Tests (Can Run Anytime - Read-Only Pattern)

**✅ Tests don't modify source code - FULLY parallel**

| Agent # | Zone | Task | Files to Edit | Priority |
|---------|------|------|---------------|----------|
| F1 | Z9 | Auth Unit Tests | `tests/unit/auth/` | High |
| F2 | Z9 | API Unit Tests | `tests/unit/api/` | High |
| F3 | Z9 | Scoring Unit Tests | `tests/unit/scoring/` | Medium |
| F4 | Z9 | Agent Unit Tests | `tests/unit/agents/` | Medium |
| F5 | Z9 | E2E Catalog Tests | `tests/e2e/catalog.spec.ts` | High |
| F6 | Z9 | E2E RFQ Tests | `tests/e2e/rfq-flow.spec.ts` | High |

**Prompt for Agent F1:**
```
Write comprehensive unit tests for auth at tests/unit/auth/. Test:
- JWT token generation/verification
- Session management
- Azure AD integration mocks
Only edit files in tests/unit/auth/.
```

---

### GROUP G: Documentation (Can Run Anytime - UNLIMITED)

**✅ Docs are independent - UNLIMITED parallel agents**

| Agent # | Zone | Task | Files to Edit | Priority |
|---------|------|------|---------------|----------|
| G1 | Z8 | API Documentation | `docs/MATERIALS_API_DOCUMENTATION.md` | High |
| G2 | Z8 | OAuth Setup | `docs/OAUTH_SETUP.md` | High |
| G3 | Z8 | Quick Start | `docs/QUICK_START.md` | High |
| G4 | Z8 | Deployment Checklist | `docs/deployment-checklist.md` | High |
| G5 | Z8 | Database Guide | `docs/DATABASE_VERIFICATION_GUIDE.md` | Medium |

---

### GROUP H: Infrastructure (SINGLE AGENT)

**⚠️ Only ONE agent should touch these files**

| Agent # | Zone | Task | Files to Edit | Priority |
|---------|------|------|---------------|----------|
| H1 | Z9 | All Config Files | `Dockerfile`, `docker-compose.yml`, `next.config.js`, `tsconfig.json`, `.github/workflows/` | High |

**Prompt for Agent H1:**
```
Review and fix all infrastructure configuration files:
- Dockerfile and Dockerfile.azure
- docker-compose.yml
- next.config.js
- tsconfig.json
- GitHub Actions workflows in .github/workflows/
Ensure builds work and CI/CD pipeline is functional.
```

---

## 🚀 EXECUTION PLAN

### Phase 1: Foundation (Start Immediately)
```
┌────────────────────────────────────────────────────┐
│ START THESE 7 AGENTS FIRST:                        │
├────────────────────────────────────────────────────┤
│ A1: Auth Library (lib/auth.ts)                     │
│ A2: Azure Integration (lib/azure/)                 │
│ A3: Database Client (lib/db.ts)                    │
│ A4: Database Schema (database-schemas/)            │
│ B1: Auth APIs (app/api/auth/)                      │
│ C1: Login/Signup Pages (app/login/, signup/)       │
│ H1: Infrastructure (Dockerfile, configs)           │
└────────────────────────────────────────────────────┘
```

### Phase 2: Core Features (After Phase 1 foundation stable)
```
┌────────────────────────────────────────────────────┐
│ ADD THESE 12 AGENTS:                               │
├────────────────────────────────────────────────────┤
│ Frontend (5 agents):                               │
│   C2: Dashboard Buyer                              │
│   C3: Supplier Dashboard                           │
│   C4: Materials Catalog                            │
│   C5: RFQ Pages                                    │
│   C6: Admin Pages                                  │
├────────────────────────────────────────────────────┤
│ API Routes (4 agents):                             │
│   B2: Supplier APIs                                │
│   B3: Submittal APIs                               │
│   B4: Scrape APIs                                  │
│   B5: Audit APIs                                   │
├────────────────────────────────────────────────────┤
│ Libraries (3 agents):                              │
│   E1: Scraper Agent                                │
│   E2: Submittal Agent                              │
│   E3: Scoring Engine                               │
└────────────────────────────────────────────────────┘
```

### Phase 3: Secondary Features (Can overlap with Phase 2)
```
┌────────────────────────────────────────────────────┐
│ ADD THESE 8 AGENTS:                                │
├────────────────────────────────────────────────────┤
│ Tools (3 agents):                                  │
│   C7: Excel Add-in                                 │
│   C8: Chrome Extension                             │
│   C9: Revit Plugin                                 │
├────────────────────────────────────────────────────┤
│ Backend (3 agents):                                │
│   D2: RFQ Routes                                   │
│   D3: Supplier Routes                              │
│   D5: Payments Routes                              │
├────────────────────────────────────────────────────┤
│ Libraries (2 agents):                              │
│   E4: Decision Logic                               │
│   E5: Defensibility Agent                          │
└────────────────────────────────────────────────────┘
```

### Phase 4: Tests & Docs (Run Throughout)
```
┌────────────────────────────────────────────────────┐
│ CAN RUN ANYTIME (read-only):                       │
├────────────────────────────────────────────────────┤
│ F1-F6: All Test Agents                             │
│ G1-G5: All Documentation Agents                    │
└────────────────────────────────────────────────────┘
```

---

## ⚠️ CONFLICT PREVENTION RULES

### NEVER DO THIS:
1. ❌ Two agents editing the same file
2. ❌ Two agents touching `package.json` simultaneously
3. ❌ Two agents modifying `database-schemas/` at the same time
4. ❌ Two agents editing shared type definitions in `types/`

### ALWAYS SAFE:
1. ✅ Different page directories (e.g., `/app/dashboard/` vs `/app/admin/`)
2. ✅ Different API routes (e.g., `/app/api/auth/` vs `/app/api/supplier/`)
3. ✅ Different backend route files
4. ✅ Different library files
5. ✅ Tests (read-only pattern)
6. ✅ Different documentation files

---

## 📊 Task Count Summary

| Group | Agent Count | Can Run Parallel | Dependencies |
|-------|-------------|-----------------|--------------|
| A: Infrastructure | 4 | ✅ Yes (with each other) | None |
| B: API Routes | 6 | ✅ Yes | Group A (partial) |
| C: Frontend | 10 | ✅ Yes | Group A, B |
| D: Backend | 6 | ✅ Yes | Group A |
| E: Libraries | 6 | ✅ Yes | Group A |
| F: Tests | 6 | ✅ Yes (anytime) | Read-only |
| G: Docs | 5+ | ✅ Yes (unlimited) | None |
| H: Config | 1 | ❌ Single | None |

**Total: ~44 named agents, 70+ individual tasks**

---

## 🔧 Quick Commands

```bash
# Install dependencies
npm install

# Lint check
npm run lint

# Type check
npm run type-check

# Build (requires network for Google Fonts)
npm run build

# Run tests
npm run test:unit
npm run test:e2e

# Start dev server
npm run dev
```

---

## 📁 File Ownership Reference

| Directory | Owner Agent | Must Not Touch |
|-----------|-------------|----------------|
| `app/login/`, `app/signup/` | C1 | Other agents |
| `app/dashboard/` | C2 | Other agents |
| `app/supplier/` | C3 | Other agents |
| `app/catalog/`, `app/materials/` | C4 | Other agents |
| `app/rfq/`, `app/rfqs/` | C5 | Other agents |
| `app/admin/` | C6 | Other agents |
| `app/api/auth/` | B1 | Other agents |
| `app/api/supplier/` | B2 | Other agents |
| `app/api/submittal/` | B3 | Other agents |
| `lib/auth.ts` | A1 | Other agents |
| `lib/azure/` | A2 | Other agents |
| `lib/db.ts`, `lib/azure-db.ts` | A3 | Other agents |
| `lib/agents/` | E1-E5 | By file only |
| `lib/scoring/` | E3 | Other agents |
| `backend/routes/` | D2-D5 | By file only |
| `backend/middleware/` | D1 | Other agents |
| `database-schemas/` | A4 | Other agents |
| `tests/` | F1-F6 | Source code |
| `docs/` | G1-G5 | Source code |
| Config files | H1 | Other agents |

---

## 🛑 MANUAL TASKS (Agents CAN'T Do These)

**These require human action in external services - agents cannot configure them.**

---

### SECTION M1: Azure Portal Configuration

| Task | Portal Location | Status | Notes |
|------|-----------------|--------|-------|
| M1.1 | Create Azure Key Vault | Azure Portal → Key Vaults | ☐ | Name: `greenchainz-vault` |
| M1.2 | Store secrets in Key Vault | Key Vault → Secrets | ☐ | See secret list below |
| M1.3 | Enable Managed Identity on Container Apps | Container App → Identity → System Assigned | ☐ | Required for Key Vault access |
| M1.4 | Grant Key Vault Access to Container Apps | Key Vault → Access Policies | ☐ | Secret permissions: Get, List |
| M1.5 | Create Azure AD App Registration | Azure AD → App Registrations | ☐ | Multi-tenant + personal accounts |
| M1.6 | Configure Azure AD Redirect URIs | App Registration → Authentication | ☐ | Production + dev URLs |
| M1.7 | Create Azure AD Client Secret | App Registration → Certificates & Secrets | ☐ | Store in Key Vault |
| M1.8 | Create Azure PostgreSQL Flexible Server | Azure Portal → Azure Database for PostgreSQL | ☐ | Enable SSL enforcement |
| M1.9 | Configure PostgreSQL Firewall | PostgreSQL → Connection Security | ☐ | Allow Container Apps subnet |
| M1.10 | Create Azure Redis Cache | Azure Portal → Azure Cache for Redis | ☐ | Premium for persistence |
| M1.11 | Create Azure Blob Storage Account | Azure Portal → Storage Accounts | ☐ | Container: `greenchainz-uploads` |
| M1.12 | Configure Blob Storage CORS | Storage → CORS | ☐ | Allow frontend domain |
| M1.13 | Create Azure OpenAI Resource | Azure Portal → Azure OpenAI | ☐ | Deploy GPT-4o model |
| M1.14 | Create Document Intelligence Resource | Azure Portal → Azure AI Services | ☐ | For PDF analysis |
| M1.15 | Create Azure Container Registry | Azure Portal → Container Registries | ☐ | For Docker images |
| M1.16 | Create Azure Cosmos DB (for scrapers) | Azure Portal → Cosmos DB | ☐ | Database: `greenchainz`, Container: `ScrapingRules` |
| M1.17 | Create Azure Functions App (scraper) | Azure Portal → Function App | ☐ | Name: `greenchainz-scraper` |
| M1.18 | Configure Custom Domain & SSL | Container App → Custom Domains | ☐ | `greenchainz.com` with SSL cert |
| M1.19 | Set up Azure Application Insights | Azure Portal → Application Insights | ☐ | For monitoring |
| M1.20 | Configure Azure Maps | Azure Portal → Azure Maps | ☐ | For geocoding |

#### Azure Key Vault Secrets to Create:

```bash
# Required secrets (generate with: openssl rand -base64 48)
jwt-secret              # JWT signing key (min 32 chars)
session-secret          # Express session key (min 32 chars)
cookie-secret           # Cookie encryption key (min 32 chars)
postgres-password       # PostgreSQL password
redis-password          # Azure Redis access key
azure-client-secret     # Azure AD app secret
stripe-secret-key       # Stripe API key (sk_live_...)
stripe-webhook-secret   # Stripe webhook signing (whsec_...)
linkedin-client-secret  # LinkedIn OAuth secret
openai-key              # Azure OpenAI API key
document-intel-key      # Document Intelligence key
intercom-token          # Intercom API access token
smtp-password           # Zoho Mail app password
cosmos-connection-string # Cosmos DB connection (for scrapers)
bing-search-key         # Bing Search API key (for Hunter agents)
```

---

### SECTION M2: GitHub Configuration

| Task | Location | Status | Notes |
|------|----------|--------|-------|
| M2.1 | Create GitHub Environment: `production` | Repo Settings → Environments | ☐ | Required for CD workflow |
| M2.2 | Configure Environment Protection Rules | Environment → Protection rules | ☐ | Optional: require approval |
| M2.3 | Set GitHub Repository Variables | Settings → Secrets and Variables → Variables | ☐ | See list below |
| M2.4 | Set GitHub Repository Secrets | Settings → Secrets and Variables → Secrets | ☐ | See list below |
| M2.5 | Configure Federated Identity for Azure | Azure AD App → Federated Credentials | ☐ | Zero-secret GitHub auth |

#### GitHub Repository Variables (`vars.*`):

```
AZURE_CLIENT_ID=<Azure AD App Client ID>
AZURE_TENANT_ID=<Azure AD Tenant ID>
AZURE_SUBSCRIPTION_ID=<Azure Subscription ID>
CONTAINER_REGISTRY=acrgreenchainzprod916
RESOURCE_GROUP=greenchainz-production
NEXT_PUBLIC_BACKEND_URL=https://greenchainz-container.jollyrock-a66f2da6.eastus.azurecontainerapps.io
```

#### GitHub Repository Secrets (`secrets.*`):

```
NEXT_PUBLIC_INTERCOM_APP_ID=<Intercom App ID>
```

---

### SECTION M3: Stripe Configuration

| Task | Location | Status | Notes |
|------|----------|--------|-------|
| M3.1 | Create Stripe Account | stripe.com | ☐ | Business verification |
| M3.2 | Create Product: Standard Membership | Stripe Dashboard → Products | ☐ | Monthly + Yearly prices |
| M3.3 | Create Product: Premium Membership | Stripe Dashboard → Products | ☐ | Monthly + Yearly prices |
| M3.4 | Copy Price IDs | Stripe Dashboard → Products → Prices | ☐ | For env vars |
| M3.5 | Create Webhook Endpoint | Stripe Dashboard → Developers → Webhooks | ☐ | URL: `https://api.greenchainz.com/api/webhooks/stripe` |
| M3.6 | Configure Webhook Events | Webhook Endpoint → Events | ☐ | See list below |
| M3.7 | Copy Webhook Secret | Webhook Endpoint → Signing secret | ☐ | Store in Key Vault |

#### Stripe Webhook Events to Enable:

```
payment_intent.succeeded
payment_intent.payment_failed
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
invoice.paid
invoice.payment_failed
checkout.session.completed
```

#### Stripe Environment Variables:

```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STANDARD_MONTHLY=price_...
STRIPE_PRICE_STANDARD_YEARLY=price_...
STRIPE_PRICE_PREMIUM_MONTHLY=price_...
STRIPE_PRICE_PREMIUM_YEARLY=price_...
STRIPE_RFQ_DEPOSIT_AMOUNT_CENTS=2500
```

---

### SECTION M4: OAuth Providers Configuration

| Task | Location | Status | Notes |
|------|----------|--------|-------|
| M4.1 | LinkedIn: Create App | LinkedIn Developers | ☐ | For buyer verification |
| M4.2 | LinkedIn: Verify Domain | App Settings → Verify | ☐ | `greenchainz.com` |
| M4.3 | LinkedIn: Add Products | App Settings → Products | ☐ | "Sign In with LinkedIn" |
| M4.4 | LinkedIn: Set Redirect URI | App Settings → Auth | ☐ | `https://api.greenchainz.com/auth/linkedin/callback` |
| M4.5 | Google: Create OAuth App | Google Cloud Console | ☐ | Optional |
| M4.6 | Microsoft: Create OAuth App | Azure AD | ☐ | Separate from Azure AD auth app |

---

### SECTION M5: Intercom Configuration

| Task | Location | Status | Notes |
|------|----------|--------|-------|
| M5.1 | Create Intercom Account | intercom.io | ☐ | For customer support chat |
| M5.2 | Get App ID | Settings → Installation | ☐ | Goes in `NEXT_PUBLIC_INTERCOM_APP_ID` |
| M5.3 | Get Access Token | Settings → Developers → Access Token | ☐ | Store in Key Vault as `intercom-token` |
| M5.4 | Configure Messenger Settings | Settings → Messenger | ☐ | Appearance, position |
| M5.5 | Set up User Identity Verification | Settings → Identity Verification | ☐ | HMAC secret for secure user hash |
| M5.6 | Create Custom Attributes | People → Custom Attributes | ☐ | `tier`, `company`, `role` |

---

### SECTION M6: Debugging & Monitoring Tools

| Task | Location | Status | Notes |
|------|----------|--------|-------|
| **PostHog** | | | |
| M6.1 | Create PostHog Account | posthog.com | ☐ | Product analytics |
| M6.2 | Get PostHog API Key | Project Settings → API Keys | ☐ | `NEXT_PUBLIC_POSTHOG_KEY` |
| M6.3 | Get PostHog Host | Project Settings | ☐ | `NEXT_PUBLIC_POSTHOG_HOST` |
| M6.4 | Configure Event Tracking | PostHog Dashboard | ☐ | Define key events |
| M6.5 | Set up Dashboards | Dashboards | ☐ | User journeys, funnel analysis |
| **Sentry** | | | |
| M6.6 | Create Sentry Account | sentry.io | ☐ | Error tracking |
| M6.7 | Create Sentry Project (Frontend) | Projects → Create | ☐ | Platform: Next.js |
| M6.8 | Create Sentry Project (Backend) | Projects → Create | ☐ | Platform: Node.js |
| M6.9 | Get Sentry DSN (Frontend) | Project Settings → Client Keys | ☐ | `NEXT_PUBLIC_SENTRY_DSN` |
| M6.10 | Get Sentry DSN (Backend) | Project Settings → Client Keys | ☐ | `SENTRY_DSN` |
| M6.11 | Configure Source Maps Upload | Sentry Settings | ☐ | For readable stack traces |
| M6.12 | Set up Alerts | Alerts → Create | ☐ | Error rate, new issues |
| **Azure Application Insights** | | | |
| M6.13 | Already in M1.19 | See Azure section | ☐ | Native Azure monitoring |
| M6.14 | Configure Alerts | Application Insights → Alerts | ☐ | Response time, error rate |
| M6.15 | Set up Dashboards | Application Insights → Dashboards | ☐ | Performance monitoring |

#### Debugging Environment Variables:

```env
# PostHog
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# Sentry
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
SENTRY_DSN=https://...@sentry.io/...
SENTRY_AUTH_TOKEN=... # For source maps upload

# Azure Application Insights
APPLICATIONINSIGHTS_CONNECTION_STRING=InstrumentationKey=...;IngestionEndpoint=...
```

---

### SECTION M7: Cookie & GDPR Configuration

| Task | Location | Status | Notes |
|------|----------|--------|-------|
| M7.1 | Review cookie consent implementation | `backend/middleware/cookies.js` | ☐ | Already in codebase |
| M7.2 | Configure cookie domain | Environment variable | ☐ | `COOKIE_DOMAIN=.greenchainz.com` |
| M7.3 | Set up cookie consent banner UI | Frontend component | ☐ | Agent task (C-series) |
| M7.4 | Configure GDPR-compliant tracking categories | Cookie consent logic | ☐ | Necessary, Analytics, Marketing |
| M7.5 | Review privacy policy cookie section | `app/legal/privacy/page.tsx` | ☐ | Update if needed |

#### Cookie Configuration Environment Variables:

```env
COOKIE_SECRET=<32+ char secret>
COOKIE_DOMAIN=.greenchainz.com  # Or leave empty for localhost
```

---

### SECTION M8: Email Service (Zoho Mail)

| Task | Location | Status | Notes |
|------|----------|--------|-------|
| M8.1 | Set up Zoho Mail Account | zoho.com/mail | ☐ | Business email |
| M8.2 | Create App Password | Zoho Mail → Security → App Passwords | ☐ | For SMTP |
| M8.3 | Configure SPF Record | Domain DNS | ☐ | For deliverability |
| M8.4 | Configure DKIM Record | Domain DNS | ☐ | For deliverability |
| M8.5 | Configure DMARC Record | Domain DNS | ☐ | For deliverability |

#### Email Environment Variables:

```env
SMTP_HOST=smtp.zoho.com
SMTP_PORT=465
SMTP_USER=noreply@greenchainz.com
SMTP_PASS=<app-password>
SMTP_FROM_EMAIL=noreply@greenchainz.com
SMTP_FROM_NAME=GreenChainz
ADMIN_EMAIL=founder@greenchainz.com
```

---

### SECTION M9: Scraper Functions Configuration (Azure Functions)

| Task | Location | Status | Notes |
|------|----------|--------|-------|
| M9.1 | Deploy Scraper Function App | Azure Portal / CLI | ☐ | `greenchainz-scraper` |
| M9.2 | Configure Cosmos DB connection | Function App → Configuration | ☐ | `COSMOS_CONNECTION_STRING` |
| M9.3 | Configure Bing Search API | Function App → Configuration | ☐ | `BING_SEARCH_API_KEY` |
| M9.4 | Configure Azure OpenAI for GPT-4o | Function App → Configuration | ☐ | For lead qualification |
| M9.5 | Seed Persona Rules to Cosmos DB | Cosmos DB Data Explorer | ☐ | 7 procurement personas |
| M9.6 | Set up scheduled triggers | Function App | ☐ | Daily/weekly scraping |
| M9.7 | Configure function keys | Function App → App keys | ☐ | For API authentication |

#### Scraper Environment Variables:

```env
# Cosmos DB (for persona rules)
COSMOS_CONNECTION_STRING=AccountEndpoint=https://...;AccountKey=...
COSMOS_DATABASE_NAME=greenchainz
COSMOS_CONTAINER_NAME=ScrapingRules

# Bing Search API (for Hunter Agents)
BING_SEARCH_API_KEY=...
BING_SEARCH_ENDPOINT=https://api.bing.microsoft.com/v7.0/search

# Azure OpenAI (for GPT-4o qualification)
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_KEY=...
AZURE_OPENAI_DEPLOYMENT=gpt-4o
AZURE_OPENAI_API_VERSION=2024-10-21
```

---

### SECTION M10: DNS & Domain Configuration

| Task | Location | Status | Notes |
|------|----------|--------|-------|
| M10.1 | Configure A record | Domain registrar DNS | ☐ | `greenchainz.com` → Container App IP |
| M10.2 | Configure CNAME | Domain registrar DNS | ☐ | `www` → Container App FQDN |
| M10.3 | Configure API subdomain | Domain registrar DNS | ☐ | `api.greenchainz.com` |
| M10.4 | Verify SSL certificates | Container App → Custom domains | ☐ | Auto-managed or upload |

---

### SECTION M11: Autodesk Forge/APS Integration (Revit Plugin)

| Task | Location | Status | Notes |
|------|----------|--------|-------|
| M11.1 | Create Autodesk Developer Account | developer.autodesk.com | ☐ | For Revit integration |
| M11.2 | Create Forge App | Forge Portal | ☐ | Get Client ID/Secret |
| M11.3 | Configure OAuth Callback | Forge App Settings | ☐ | Production URL |

#### Autodesk Environment Variables:

```env
AUTODESK_CLIENT_ID=...
AUTODESK_CLIENT_SECRET=...
```

---

### SECTION M12: Office Add-in (Excel) Configuration

| Task | Location | Status | Notes |
|------|----------|--------|-------|
| M12.1 | Generate Add-in GUID | uuidgenerator.net | ☐ | Unique identifier |
| M12.2 | Update manifest.xml with GUID | `public/manifest.xml` | ☐ | Agent can do |
| M12.3 | Update SourceLocation in manifest | `public/manifest.xml` | ☐ | Production URL |
| M12.4 | Test in Excel Online | Excel Online → Add-ins | ☐ | Upload manifest |
| M12.5 | Create Partner Center Account | partner.microsoft.com | ☐ | For AppSource submission |
| M12.6 | Prepare AppSource assets | Marketing images, descriptions | ☐ | 1200x720, 1000x600, 190x190 |
| M12.7 | Submit to AppSource | Partner Center | ☐ | 3-5 day review |

---

## 🔗 EXTERNAL REPOSITORIES / SERVICES

### greenchainz-intelligence (Separate Repo - If Exists)

Based on code references, there may be a separate Azure Functions repository for heavy processing:

| What to Check | Status | Notes |
|---------------|--------|-------|
| Does `greenchainz-intelligence` repo exist? | ☐ | May be part of `backend/functions/` |
| Azure Storage Queue integration | ☐ | For dispatching heavy tasks |
| Azure Functions deployment | ☐ | Separate Function App |

**Note:** The scraper functions (`persona-scraper`, `distributor-intelligence`, `gatekeeper-discovery`) appear to be in `backend/functions/` within this repo. If there's a separate `greenchainz-intelligence` or `bmile` repo, document its location and purpose.

---

## 📋 COMPLETE CHECKLIST SUMMARY

### Manual Configuration Summary

| Section | Tasks | Category |
|---------|-------|----------|
| M1: Azure Portal | 20 tasks | Infrastructure |
| M2: GitHub | 5 tasks | CI/CD |
| M3: Stripe | 7 tasks | Payments |
| M4: OAuth Providers | 6 tasks | Authentication |
| M5: Intercom | 6 tasks | Customer Support |
| M6: Debugging/Monitoring | 15 tasks | PostHog, Sentry, App Insights |
| M7: Cookies/GDPR | 5 tasks | Compliance |
| M8: Email | 5 tasks | Notifications |
| M9: Scraper Functions | 7 tasks | AI/ML |
| M10: DNS/Domain | 4 tasks | Networking |
| M11: Autodesk | 3 tasks | Integration |
| M12: Office Add-in | 7 tasks | Distribution |

**Total Manual Tasks: ~90 tasks** (cannot be done by agents)

---

## 🔐 ALL ENVIRONMENT VARIABLES REFERENCE

### Frontend (NEXT_PUBLIC_* - Exposed to Browser)

```env
NEXT_PUBLIC_BACKEND_URL=https://greenchainz-container.jollyrock-a66f2da6.eastus.azurecontainerapps.io
NEXT_PUBLIC_AZURE_TENANT=<tenant-id>
NEXT_PUBLIC_AZURE_CLIENT_ID=<client-id>
NEXT_PUBLIC_AZURE_REDIRECT_URI=https://greenchainz-frontend.../login/callback
NEXT_PUBLIC_INTERCOM_APP_ID=<intercom-app-id>
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

### Backend (Server-Side Only)

```env
# Core
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://greenchainz.com
BACKEND_URL=https://api.greenchainz.com

# Security (from Key Vault)
JWT_SECRET=<from-key-vault>
SESSION_SECRET=<from-key-vault>
COOKIE_SECRET=<from-key-vault>
COOKIE_DOMAIN=.greenchainz.com

# Database
POSTGRES_HOST=greenchainz.postgres.database.azure.com
POSTGRES_PORT=5432
DB_USER=greenchainz_app
DB_PASSWORD=<from-key-vault>
DB_NAME=greenchainz_prod
POSTGRES_SSL=true

# Redis
REDIS_HOST=greenchainz.redis.cache.windows.net
REDIS_PORT=6380
REDIS_PASSWORD=<from-key-vault>
REDIS_SSL=true

# Azure AD
AZURE_TENANT_ID=<tenant-id>
AZURE_CLIENT_ID=<client-id>
AZURE_CLIENT_SECRET=<from-key-vault>

# Azure Key Vault
AZURE_KEY_VAULT_URL=https://greenchainz-vault.vault.azure.net/
AZURE_USE_MANAGED_IDENTITY=true

# Azure AI
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_KEY=<from-key-vault>
AZURE_OPENAI_API_VERSION=2024-10-21
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=https://your-resource.cognitiveservices.azure.com/
AZURE_DOCUMENT_INTELLIGENCE_KEY=<from-key-vault>

# Azure Storage
AZURE_STORAGE_ACCOUNT_NAME=greenchainzstorage
AZURE_STORAGE_CONTAINER_NAME=greenchainz-uploads
AZURE_STORAGE_CONNECTION_STRING=<from-key-vault>

# Stripe
STRIPE_SECRET_KEY=<from-key-vault>
STRIPE_WEBHOOK_SECRET=<from-key-vault>
STRIPE_PRICE_STANDARD_MONTHLY=price_...
STRIPE_PRICE_STANDARD_YEARLY=price_...
STRIPE_PRICE_PREMIUM_MONTHLY=price_...
STRIPE_PRICE_PREMIUM_YEARLY=price_...
STRIPE_RFQ_DEPOSIT_AMOUNT_CENTS=2500

# Email
SMTP_HOST=smtp.zoho.com
SMTP_PORT=465
SMTP_USER=noreply@greenchainz.com
SMTP_PASS=<from-key-vault>
SMTP_FROM_EMAIL=noreply@greenchainz.com
SMTP_FROM_NAME=GreenChainz
ADMIN_EMAIL=founder@greenchainz.com

# OAuth Providers
LINKEDIN_CLIENT_ID=...
LINKEDIN_CLIENT_SECRET=<from-key-vault>
LINKEDIN_REDIRECT_URI=https://api.greenchainz.com/auth/linkedin/callback

# Integrations
INTERCOM_ACCESS_TOKEN=<from-key-vault>
AUTODESK_CLIENT_ID=...
AUTODESK_CLIENT_SECRET=<from-key-vault>

# Monitoring
APPLICATIONINSIGHTS_CONNECTION_STRING=<from-key-vault>
SENTRY_DSN=<from-key-vault>

# Feature Flags
FEATURE_AZURE_MONITORING=true
FEATURE_REDIS_CACHING=true
FEATURE_AI_DOCUMENT_ANALYSIS=true
FEATURE_LINKEDIN_VERIFICATION=true
NOTIFICATIONS_ENABLED=true
```

### Azure Functions (Scraper)

```env
# Cosmos DB
COSMOS_CONNECTION_STRING=<from-key-vault>
COSMOS_DATABASE_NAME=greenchainz
COSMOS_CONTAINER_NAME=ScrapingRules

# Bing Search (Hunter Agents)
BING_SEARCH_API_KEY=<from-key-vault>
BING_SEARCH_ENDPOINT=https://api.bing.microsoft.com/v7.0/search

# Azure OpenAI
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_KEY=<from-key-vault>
AZURE_OPENAI_DEPLOYMENT=gpt-4o
AZURE_OPENAI_API_VERSION=2024-10-21
```

---

**Last Updated:** January 17, 2026  
**Repository:** jnorvi5/green-sourcing-b2b-app
