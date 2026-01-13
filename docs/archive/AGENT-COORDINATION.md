# GreenChainz Agent Coordination Plan

> **Objective:** Ship the v1 marketplace with Sweets-like catalog, tiered RFQ distribution, Stripe deposits, LinkedIn verification, and Revit connector—all on Azure, with zero merge conflicts.

---

## 1. Agent Roster (7 Agents)

### Agent 1: 🏗️ AZURE-INFRA
**Lane:** CI/CD, Infrastructure, Deployment  
**Files (EXCLUSIVE):**
- `.github/workflows/**`
- `azure/**`
- Root `Dockerfile`, `docker-compose.yml`
- `CLOUD-DEPLOYMENT.md`

**DO NOT TOUCH:**
- `backend/**`, `app/**`, `database-schemas/**`, `.env*`

**PROMPT:**
```
You are the Azure Infrastructure Agent for GreenChainz.

LANE: CI/CD and Azure infrastructure only.
FILES YOU OWN (exclusive):
- .github/workflows/**
- azure/**
- Root Dockerfile, docker-compose.yml
- CLOUD-DEPLOYMENT.md

FILES FORBIDDEN:
- backend/**, app/**, database-schemas/**, .env*, package*.json

YOUR TASKS:
1. Ensure azure-deploy.yml has proper staging/production environments
2. Add Stripe webhook endpoint to Container App ingress rules
3. Configure Azure Key Vault references for STRIPE_SECRET_KEY, LINKEDIN_CLIENT_SECRET
4. Add health check probes for /health and /ready endpoints
5. Ensure Redis, Postgres, Storage, Document Intelligence connections are configured

OUTPUT: Only infrastructure files. No application code.
```

---

### Agent 2: 🔐 SECRETS-CONFIG
**Lane:** Environment configuration, secrets documentation  
**Files (EXCLUSIVE):**
- `.env.example`
- `backend/config/validateEnv.js`
- `docs/SECRETS-SETUP.md` (new)

**DO NOT TOUCH:**
- Any route files, services, migrations, UI

**PROMPT:**
```
You are the Secrets Configuration Agent for GreenChainz.

LANE: Environment variables and secrets documentation only.
FILES YOU OWN (exclusive):
- .env.example
- backend/config/validateEnv.js
- docs/SECRETS-SETUP.md

FILES FORBIDDEN:
- backend/routes/**, backend/services/**, database-schemas/**, app/**

YOUR TASKS:
1. Add to .env.example:
   - STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_RFQ_DEPOSIT_PRICE_ID
   - LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET
   - AZURE_AI_FOUNDRY_ENDPOINT, AZURE_AI_FOUNDRY_KEY
2. Update validateEnv.js to fail-fast if STRIPE_SECRET_KEY missing in production
3. Document Key Vault secret names in docs/SECRETS-SETUP.md

OUTPUT: Only configuration files and documentation. No business logic.
```

---

### Agent 3: 🗄️ DB-SCHEMA
**Lane:** Database schema, migrations only  
**Files (EXCLUSIVE):**
- `database-schemas/**`
- `backend/db.js` (only if schema-related)

**DO NOT TOUCH:**
- Routes, services, UI, backend routes

**PROMPT:**
```
You are the Database Schema Agent for GreenChainz.

LANE: Database schemas and migrations only.
FILES YOU OWN (exclusive):
- database-schemas/**
- backend/db.js (schema-related changes only)

FILES FORBIDDEN:
- backend/routes/**, backend/services/**, app/**

YOUR TASKS:
1. Create migration: 20260104_130000_add_stripe_deposits.sql
   - rfq_deposits table (rfq_id, user_id, stripe_payment_intent_id, amount_cents, status, created_at)
   - Add deposit_verified BOOLEAN to rfqs table

2. Create migration: 20260104_140000_add_linkedin_verification.sql
   - user_verifications table (user_id, provider, provider_user_id, verified_at, profile_data JSONB)
   - Add linkedin_verified BOOLEAN and linkedin_profile_url to users table

3. Create migration: 20260104_150000_add_catalog_tables.sql
   - materials table (id, name, description, material_type, category_id, sustainability_score, ...)
   - material_certifications junction table
   - material_suppliers junction table (for shadow vs claimed linking)
   - catalog_search_index materialized view with full-text search

4. Ensure all tables have proper indexes for catalog queries

OUTPUT: Only SQL migration files. No JavaScript/TypeScript.
```

---

### Agent 4: ⚙️ BACKEND-RFQ
**Lane:** RFQ routes, RFQ services, wave distribution  
**Files (EXCLUSIVE):**
- `backend/routes/rfqs.js`
- `backend/routes/rfq-simulator.js`
- `backend/services/rfq/**`

**DO NOT TOUCH:**
- Database schemas, UI, other route files, AI gateway

**PROMPT:**
```
You are the Backend RFQ Agent for GreenChainz.

LANE: RFQ routes and RFQ distribution services only.
FILES YOU OWN (exclusive):
- backend/routes/rfqs.js
- backend/routes/rfq-simulator.js
- backend/services/rfq/**

FILES FORBIDDEN:
- database-schemas/**, app/**, backend/services/ai-gateway/**, backend/routes/auth.js

YOUR TASKS:
1. Add Stripe deposit verification to RFQ creation flow:
   - POST /api/v1/rfqs requires deposit_payment_intent_id
   - Verify payment with Stripe before creating RFQ
   - Mark RFQ as deposit_verified: true

2. Add LinkedIn verification check to RFQ creation:
   - Require user.linkedin_verified for RFQ creation
   - Return 403 with upgrade prompt if not verified

3. Enhance wave distribution in backend/services/rfq/waves.js:
   - Wave 1 (0 min): Premium tier only
   - Wave 2 (15 min): Standard tier
   - Wave 3 (60 min): Free tier
   - Wave 4: Shadow suppliers get outreach only (no RFQ listing)

4. Add distance/sustainability scoring to matcher.js:
   - Calculate distance from project location to supplier
   - Factor into match score (closer = higher score)
   - Expose scoring breakdown in API response

OUTPUT: Only RFQ-related backend files.
```

---

### Agent 5: 🛒 BACKEND-CATALOG
**Lane:** Catalog API, materials search, product endpoints  
**Files (EXCLUSIVE):**
- `backend/routes/catalog.js` (NEW)
- `backend/services/catalog/**` (NEW)
- `backend/routes/scoring.js`

**DO NOT TOUCH:**
- RFQ routes, auth routes, UI, database schemas

**PROMPT:**
```
You are the Backend Catalog Agent for GreenChainz.

LANE: Catalog API and material search services.
FILES YOU OWN (exclusive):
- backend/routes/catalog.js (create new)
- backend/services/catalog/** (create new)
- backend/routes/scoring.js

FILES FORBIDDEN:
- backend/routes/rfqs.js, database-schemas/**, app/**, backend/services/rfq/**

YOUR TASKS:
1. Create backend/routes/catalog.js:
   GET /api/v1/catalog/materials
   - Filters: category, certifications[], material_type, sustainability_score_min
   - Pagination: limit, offset, cursor
   - Sorting: sustainability_score, distance, name
   - Returns: materials with anonymized shadow suppliers
   
   GET /api/v1/catalog/materials/:materialId
   - Full material details
   - Related suppliers (claimed only, shadow anonymized)
   - Sustainability breakdown (LEED points, carbon, certifications)
   
   GET /api/v1/catalog/categories
   - Tree structure of material categories
   
   POST /api/v1/catalog/compare
   - Compare up to 5 materials side-by-side
   - Sustainability comparison matrix

2. Create backend/services/catalog/search.js:
   - Full-text search with PostgreSQL tsvector
   - Certification filtering
   - Distance-based relevance boost

3. Create backend/services/catalog/scoring.js:
   - Sustainability score calculation
   - LEED point aggregation
   - Carbon footprint estimation
   - Distance-adjusted scoring

OUTPUT: Only catalog-related backend files.
```

---

### Agent 6: 🎨 UI-CATALOG
**Lane:** Frontend catalog pages, components  
**Files (EXCLUSIVE):**
- `app/catalog/**` (NEW)
- `app/components/catalog/**` (NEW)
- `app/components/MaterialCard.tsx` (NEW)
- `app/components/FilterSidebar.tsx` (NEW)
- `app/components/CompareTray.tsx` (NEW)

**DO NOT TOUCH:**
- `app/layout.tsx`, `app/globals.css` (LOCKED - request edits via commander)
- Backend files, database schemas

**PROMPT:**
```
You are the UI Catalog Agent for GreenChainz.

LANE: Frontend catalog pages and components only.
FILES YOU OWN (exclusive):
- app/catalog/** (create new)
- app/components/catalog/** (create new)

FILES YOU MAY READ BUT NOT EDIT (request changes via commander):
- app/layout.tsx
- app/globals.css

FILES FORBIDDEN:
- backend/**, database-schemas/**, app/rfqs/**, app/login/**

YOUR TASKS:
1. Create app/catalog/page.tsx (Sweets-like material catalog):
   - Left rail: FilterSidebar component
     * Category accordion
     * Certification checkboxes (FSC, EPD, LEED, etc.)
     * Sustainability score slider
     * Distance/location filter
   - Main grid: MaterialCard components
     * Dense results (24 per page)
     * Material image, name, sustainability score badge
     * Key certifications as chips
     * "Add to Compare" button
   - Fixed bottom: CompareTray
     * Shows selected materials (max 5)
     * "Compare Now" CTA
     * "Request Quote" CTA

2. Create app/catalog/[materialId]/page.tsx:
   - Hero with material image gallery
   - Sustainability scorecard (LEED, carbon, certifications)
   - Supplier section (claimed suppliers only, "More suppliers available")
   - "Request Quote" CTA -> /rfqs/new?material=<id>
   - Similar materials carousel

3. Create components:
   - app/components/catalog/FilterSidebar.tsx
   - app/components/catalog/MaterialCard.tsx
   - app/components/catalog/CompareTray.tsx
   - app/components/catalog/SustainabilityScore.tsx
   - app/components/catalog/CertificationBadge.tsx

DESIGN NOTES:
- Follow existing gc-* CSS classes in globals.css
- Use emerald/teal gradient theme
- Glass morphism cards with hover effects
- Mobile-first responsive design

OUTPUT: Only frontend catalog files.
```

---

### Agent 7: 💳 BACKEND-PAYMENTS
**Lane:** Stripe integration, webhooks, deposits  
**Files (EXCLUSIVE):**
- `backend/routes/payments.js` (NEW)
- `backend/services/payments/**` (NEW)
- `backend/routes/webhooks/stripe.js` (NEW)

**DO NOT TOUCH:**
- RFQ business logic, UI, database schemas

**PROMPT:**
```
You are the Backend Payments Agent for GreenChainz.

LANE: Stripe payment integration only.
FILES YOU OWN (exclusive):
- backend/routes/payments.js (create new)
- backend/services/payments/** (create new)
- backend/routes/webhooks/stripe.js (create new)

FILES FORBIDDEN:
- backend/routes/rfqs.js (read only), app/**, database-schemas/**

YOUR TASKS:
1. Create backend/services/payments/stripe.js:
   - Initialize Stripe client with STRIPE_SECRET_KEY
   - createRfqDeposit(userId, rfqData) -> PaymentIntent
   - verifyPayment(paymentIntentId) -> boolean
   - refundDeposit(paymentIntentId, reason) -> Refund

2. Create backend/routes/payments.js:
   POST /api/v1/payments/rfq-deposit
   - Creates Stripe PaymentIntent for RFQ deposit
   - Amount: $25 default (configurable)
   - Returns: clientSecret for Stripe Elements
   
   GET /api/v1/payments/deposit-status/:paymentIntentId
   - Check payment status

3. Create backend/routes/webhooks/stripe.js:
   POST /api/webhooks/stripe
   - Verify webhook signature
   - Handle payment_intent.succeeded -> mark RFQ deposit verified
   - Handle payment_intent.failed -> mark RFQ deposit failed

4. Create backend/services/payments/linkedin.js:
   - LinkedIn OAuth flow helpers
   - verifyLinkedInProfile(code) -> profile data
   - Store verification in user_verifications table

OUTPUT: Only payment-related backend files.
```

---

## 2. Merge Order & Hot File Locks

### Merge Order (Sequential)
```
1. SECRETS-CONFIG  (no dependencies)
2. DB-SCHEMA       (creates tables)
3. AZURE-INFRA     (configures deployment)
4. BACKEND-PAYMENTS (depends on schema)
5. BACKEND-CATALOG  (depends on schema)
6. BACKEND-RFQ      (depends on schema + payments)
7. UI-CATALOG       (depends on catalog API)
```

### Hot Files (LOCKED - Commander Approval Required)
| File | Reason | Lock Status |
|------|--------|-------------|
| `app/layout.tsx` | Single root, easy conflicts | 🔒 LOCKED |
| `app/globals.css` | Styles cascade conflicts | 🔒 LOCKED |
| `backend/index.js` | Route registration | 🔒 LOCKED |
| `package.json` / `package-lock.json` | Lockfile churn | 🔒 LOCKED |
| `backend/db.js` | Pool singleton | 🔒 LOCKED |

### Requested Edits to Locked Files
If an agent needs changes to locked files, they submit a request:

```json
{
  "agent": "UI-CATALOG",
  "file": "backend/index.js",
  "change": "Add catalog routes: app.use('/api/v1/catalog', catalogRoutes)",
  "line_after": "app.use('/api/v1/scoring', scoringRoutes);"
}
```

Commander applies all locked file changes in a single commit at the end.

---

## 3. V1 Implementation Plan

### Phase 1: Foundation (Days 1-2)
| Task | Agent | Deliverable |
|------|-------|-------------|
| Add env vars | SECRETS-CONFIG | .env.example updated |
| Create Stripe/LinkedIn migrations | DB-SCHEMA | 3 new migration files |
| Create catalog tables migration | DB-SCHEMA | catalog schema ready |
| Update Azure deploy | AZURE-INFRA | webhook routes, Key Vault refs |

### Phase 2: Backend APIs (Days 3-5)
| Task | Agent | Deliverable |
|------|-------|-------------|
| Stripe integration | BACKEND-PAYMENTS | /api/v1/payments/* ready |
| LinkedIn verification | BACKEND-PAYMENTS | OAuth flow working |
| Catalog API | BACKEND-CATALOG | /api/v1/catalog/* ready |
| RFQ deposit gating | BACKEND-RFQ | deposit required for RFQ |
| Wave distribution | BACKEND-RFQ | tiered access enforced |
| Distance scoring | BACKEND-RFQ | location-aware matching |

### Phase 3: Frontend Catalog (Days 6-8)
| Task | Agent | Deliverable |
|------|-------|-------------|
| Catalog listing page | UI-CATALOG | /catalog with filters |
| Material detail page | UI-CATALOG | /catalog/[materialId] |
| Compare tray | UI-CATALOG | side-by-side comparison |
| RFQ integration | UI-CATALOG | "Request Quote" flow |

### Phase 4: Integration & Polish (Days 9-10)
| Task | Agent | Deliverable |
|------|-------|-------------|
| E2E testing | AZURE-INFRA | CI pipeline with tests |
| Webhook testing | BACKEND-PAYMENTS | Stripe CLI verification |
| Mobile responsive | UI-CATALOG | Mobile breakpoints |
| Documentation | ALL | README updates |

---

## 4. Feature Specifications

### 4.1 Sweets-Like Catalog (`/catalog`)

**Left Rail Filters:**
```
📁 Categories
├── Wood & Lumber
│   ├── FSC Certified (12)
│   ├── Reclaimed (5)
│   └── Engineered (23)
├── Insulation
├── Concrete & Masonry
└── ...

🏅 Certifications
☑️ FSC (34)
☑️ EPD Available (89)
☑️ LEED Contributing (67)
☑️ Cradle to Cradle (12)

📊 Sustainability Score
[======|====] 60-100

📍 Distance
○ Local (<50 mi)
○ Regional (<200 mi)
○ National
```

**Material Card:**
```
┌──────────────────────────────┐
│ [IMAGE]                      │
│                              │
│ Sustainable Bamboo Flooring  │
│ ⭐ 87 Sustainability Score   │
│                              │
│ [FSC] [EPD] [LEED 3pts]      │
│                              │
│ 3 Verified Suppliers         │
│ +2 more available            │
│                              │
│ [Compare] [Request Quote]    │
└──────────────────────────────┘
```

### 4.2 Shadow vs Claimed Suppliers

**Visibility Rules:**
| Supplier Type | Catalog Visibility | RFQ Access | Outreach |
|---------------|-------------------|------------|----------|
| Premium (claimed) | Full profile | Wave 1 (immediate) | Intercom enabled |
| Standard (claimed) | Full profile | Wave 2 (15 min) | Intercom enabled |
| Free (claimed) | Basic profile | Wave 3 (60 min) | No outbound |
| Shadow (scraped) | Anonymous | None | Claim prompts only |

**Anonymous Display:**
- "Anonymous Supplier" name
- No email, phone, website
- Only: category, certifications, material types
- CTA: "This supplier hasn't claimed their profile yet"

### 4.3 Tiered RFQ Wave Distribution

```
RFQ Created → Wave 1 → Wave 2 → Wave 3 → Expires
                │         │         │
                ▼         ▼         ▼
            Premium    Standard    Free
            (0 min)    (+15 min)  (+60 min)
```

**Wave Audit Dashboard Fields:**
- `wave_number`: 1-4
- `wave_reason`: "Premium tier: immediate access"
- `access_level`: "full" | "outreach_only"
- `tier_snapshot`: tier at time of distribution
- `visible_at`: when RFQ becomes visible
- `expires_at`: when RFQ expires for supplier

### 4.4 Sustainability + Distance Scoring

**Score Components (100 points max):**
```javascript
score = (
  certificationScore * 0.40 +  // FSC, EPD, LEED presence
  carbonScore * 0.25 +         // GWP vs category average
  distanceScore * 0.20 +       // Closer = higher
  transparencyScore * 0.15     // Data completeness
)
```

**Explainable Response:**
```json
{
  "material_id": "uuid",
  "sustainability_score": 82,
  "breakdown": {
    "certifications": { "score": 35, "max": 40, "items": ["FSC", "EPD"] },
    "carbon": { "score": 20, "max": 25, "gwp_kg": 12.5, "category_avg": 18.2 },
    "distance": { "score": 18, "max": 20, "miles": 120, "penalty": -2 },
    "transparency": { "score": 9, "max": 15, "missing": ["manufacturer_location"] }
  },
  "leed_contribution": {
    "mr_credit_3": 2,
    "mr_credit_4": 1,
    "total_points": 3
  }
}
```

### 4.5 Stripe RFQ Deposit

**Flow:**
1. Buyer fills RFQ form
2. Frontend calls `POST /api/v1/payments/rfq-deposit`
3. Backend creates PaymentIntent ($25), returns `clientSecret`
4. Frontend uses Stripe Elements to collect card
5. On success, frontend submits RFQ with `payment_intent_id`
6. Backend verifies payment, creates RFQ with `deposit_verified: true`
7. Suppliers see "Deposit Verified ✓" badge on RFQ

**Webhook Flow:**
```
Stripe → POST /api/webhooks/stripe
         ├── payment_intent.succeeded → mark deposit verified
         ├── payment_intent.failed → alert buyer
         └── charge.refunded → update deposit status
```

### 4.6 LinkedIn Verification Gate

**OAuth Flow:**
1. Buyer clicks "Verify with LinkedIn"
2. Redirect to LinkedIn OAuth URL
3. LinkedIn returns code to `/api/v1/auth/linkedin/callback`
4. Backend exchanges code for access token
5. Backend fetches profile, stores in `user_verifications`
6. User marked `linkedin_verified: true`

**RFQ Gate:**
```javascript
// In rfqs.js POST handler
if (!req.user.linkedin_verified) {
  return res.status(403).json({
    error: 'LinkedIn verification required',
    message: 'Verify your LinkedIn profile to create RFQs',
    action: '/settings/verification'
  });
}
```

**Badge Display:**
Suppliers see: `👤 LinkedIn Verified` on RFQ detail

### 4.7 Agent Gateway (AI Foundry)

**Architecture:**
```
Frontend → Backend → Agent Gateway → Azure AI Foundry
                         │
                         ├── Tier-gate (check entitlements)
                         ├── Rate-limit (per-tier quotas)
                         ├── Cache (safe responses)
                         ├── Log (audit trail)
                         └── Draft Intercom messages
```

**Workflow Examples:**
| Workflow | Tier Required | Use Case |
|----------|---------------|----------|
| `material-alternative` | Free | Suggest similar materials |
| `compliance-check` | Standard | Check cert validity |
| `outreach-draft` | Premium | Draft Intercom message |
| `rfq-scorer` | Standard | Score RFQ matches |
| `carbon-estimator` | Free | Estimate carbon footprint |

**Intercom Separation:**
- AI Gateway ONLY drafts messages
- `intercomSender.js` handles actual sending
- Premium tier required for outbound

### 4.8 Revit Connector API

**Existing Endpoints (in `backend/routes/revit.js`):**
```
POST /api/integrations/revit/v1/register
POST /api/integrations/revit/v1/sessions
POST /api/integrations/revit/v1/projects
POST /api/integrations/revit/v1/projects/:projectId/materials/sync
GET  /api/integrations/revit/v1/projects/:projectId/score
POST /api/integrations/revit/v1/rfq
```

**Auth Approach (Azure Entra ID):**
1. Plugin authenticates user via Azure Entra ID
2. Token includes `oid` (object ID) and `tid` (tenant ID)
3. Backend middleware validates token with Azure
4. Links Entra user to GreenChainz user via `AzureEntraObjectID`

**Recommended Additions:**
```
GET /api/integrations/revit/v1/catalog/search
- Search catalog from Revit
- Same filters as web catalog

POST /api/integrations/revit/v1/materials/:mappingId/alternatives
- AI-powered material alternatives
- Uses Agent Gateway for suggestions
```

---

## 5. File Dependency Map

```
database-schemas/migrations/*.sql
         │
         ▼
backend/db.js ◀────────────────────────────────────┐
         │                                          │
         ├──▶ backend/services/payments/stripe.js   │
         │           │                              │
         │           ▼                              │
         │    backend/routes/payments.js            │
         │                                          │
         ├──▶ backend/services/catalog/search.js    │
         │           │                              │
         │           ▼                              │
         │    backend/routes/catalog.js             │
         │                                          │
         ├──▶ backend/services/rfq/waves.js ◀──────┤
         │           │                              │
         │           ▼                              │
         │    backend/routes/rfqs.js ◀─────────────┤
         │                                          │
         └──▶ backend/index.js ◀───────────────────┘
                     │
                     ▼
              app/catalog/**
              app/rfqs/**
```

---

## 6. Commander Checklist

Before each agent starts:
- [ ] Confirm agent has read this document
- [ ] Confirm agent understands their lane boundaries
- [ ] Confirm agent will not touch locked files

After each agent PR:
- [ ] Review changes are within lane
- [ ] No lockfile modifications without approval
- [ ] No edits to locked files
- [ ] Linting passes

End of sprint:
- [ ] Apply all locked file change requests
- [ ] Run full integration test
- [ ] Merge in order specified
- [ ] Deploy to staging

---

## 7. Quick Reference

### Agent → Lane → Files
| Agent | Lane | Primary Files |
|-------|------|---------------|
| AZURE-INFRA | CI/Deploy | `.github/workflows/**`, `azure/**` |
| SECRETS-CONFIG | Env/Docs | `.env.example`, `validateEnv.js` |
| DB-SCHEMA | Migrations | `database-schemas/**` |
| BACKEND-RFQ | RFQ Logic | `backend/routes/rfqs.js`, `backend/services/rfq/**` |
| BACKEND-CATALOG | Catalog API | `backend/routes/catalog.js`, `backend/services/catalog/**` |
| UI-CATALOG | Frontend | `app/catalog/**`, `app/components/catalog/**` |
| BACKEND-PAYMENTS | Stripe/Auth | `backend/routes/payments.js`, `backend/services/payments/**` |

### Merge Order
1. SECRETS → 2. DB-SCHEMA → 3. AZURE-INFRA → 4. PAYMENTS → 5. CATALOG → 6. RFQ → 7. UI

### Locked Files
`app/layout.tsx`, `app/globals.css`, `backend/index.js`, `package*.json`, `backend/db.js`

---

*Generated by GreenChainz Commander - Last Updated: 2026-01-04*
