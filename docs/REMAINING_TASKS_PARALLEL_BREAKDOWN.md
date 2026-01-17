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

**Last Updated:** January 17, 2026  
**Repository:** jnorvi5/green-sourcing-b2b-app
