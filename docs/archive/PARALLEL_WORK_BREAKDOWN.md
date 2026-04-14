# GreenChainz - Parallelizable Work Breakdown

**Purpose**: Guide for running multiple agents simultaneously without conflicts.  
**Last Updated**: January 2026

---

## Quick Reference: Work Zones

The codebase is divided into **isolated work zones** that can be developed in parallel without conflicts.

| Zone ID | Work Zone | Primary Directories | Can Run Parallel With |
|---------|-----------|---------------------|----------------------|
| **Z1** | Frontend Pages | `app/*` (pages only) | Z2, Z3, Z4, Z5, Z6, Z7 |
| **Z2** | UI Components | `components/` | Z1, Z3, Z4, Z5, Z6, Z7 |
| **Z3** | API Routes | `app/api/` | Z1, Z2, Z4, Z5, Z6, Z7 |
| **Z4** | Database/Schemas | `database-schemas/` | Z1, Z2, Z3, Z5, Z6 ⚠️ |
| **Z5** | Backend Services | `backend/` | Z1, Z2, Z3, Z4, Z6, Z7 |
| **Z6** | Libs/Utils | `lib/` (non-agent) | Z1, Z2, Z3, Z5, Z7 |
| **Z7** | AI Agents | `lib/agents/` | Z1, Z2, Z3, Z5, Z6 |
| **Z8** | Documentation | `docs/` | ALL |
| **Z9** | Tests | `tests/` | ALL (read-only code) |

---

## Agent Conflict Rules

### ⚠️ NEVER work on these simultaneously:
1. **Same file** - Two agents editing the same file will cause merge conflicts
2. **Shared imports** - If Agent A modifies `lib/auth.ts` and Agent B imports it, coordinate them
3. **Database schema + migrations** - Only one agent should touch `database-schemas/` at a time
4. **Package.json** - Only one agent should add dependencies at a time

### ✅ SAFE to run in parallel:
1. Different page routes (e.g., `/app/dashboard/` vs `/app/admin/`)
2. Different API routes (e.g., `/app/api/auth/` vs `/app/api/submittal/`)
3. Backend routes vs Frontend pages
4. Tests (read-only pattern)
5. Documentation (different docs)

---

## Detailed Task Breakdown

### WORKSTREAM 1: Frontend Pages (Z1)
**Agent Requirements**: React/Next.js knowledge  
**Can Run**: 8 agents simultaneously (one per page section)

| Task ID | Task | Directory | Dependencies | Priority |
|---------|------|-----------|--------------|----------|
| F1.1 | Dashboard Buyer Page | `app/dashboard/buyer/` | None | High |
| F1.2 | Dashboard Supplier Page | `app/dashboard/supplier/` | None | High |
| F1.3 | Dashboard RFQs Page | `app/dashboard/rfqs/` | None | Medium |
| F1.4 | Admin Analytics Page | `app/admin/analytics/` | None | Medium |
| F1.5 | Admin Users Page | `app/admin/users/` | None | Medium |
| F1.6 | Admin Suppliers Page | `app/admin/suppliers/` | None | Medium |
| F1.7 | Supplier Dashboard | `app/supplier/dashboard/` | None | High |
| F1.8 | Supplier Location Page | `app/supplier/location/` | None | Low |
| F1.9 | Tools/Excel Addin | `app/excel-addin/` | None | Medium |
| F1.10 | Tools/Chrome Extension | `app/chrome-extension/` | None | Low |
| F1.11 | Tools/Revit Plugin | `app/revit-plugin/` | None | Low |
| F1.12 | Materials Catalog | `app/catalog/` | None | High |
| F1.13 | RFQ Pages | `app/rfq/` & `app/rfqs/` | None | High |
| F1.14 | Login/Signup | `app/login/` & `app/signup/` | None | Critical |
| F1.15 | Legal Pages | `app/legal/` | None | Low |
| F1.16 | About/Careers/Contact | `app/about/`, `app/careers/`, `app/contact/` | None | Low |

**Parallel Execution Plan**:
```
Agent Group A (Critical Path):
├── Agent 1: F1.14 (Login/Signup)
├── Agent 2: F1.12 (Materials Catalog)
├── Agent 3: F1.13 (RFQ Pages)
└── Agent 4: F1.7 (Supplier Dashboard)

Agent Group B (Dashboard):
├── Agent 5: F1.1 (Dashboard Buyer)
├── Agent 6: F1.2 (Dashboard Supplier)
└── Agent 7: F1.3 (Dashboard RFQs)

Agent Group C (Admin):
├── Agent 8: F1.4 (Admin Analytics)
├── Agent 9: F1.5 (Admin Users)
└── Agent 10: F1.6 (Admin Suppliers)
```

---

### WORKSTREAM 2: API Routes (Z3)
**Agent Requirements**: Node.js/TypeScript, REST API knowledge  
**Can Run**: 6 agents simultaneously

| Task ID | Task | Directory | Dependencies | Priority |
|---------|------|-----------|--------------|----------|
| A2.1 | Auth APIs | `app/api/auth/` | None | Critical |
| A2.2 | Supplier APIs | `app/api/supplier/` | A2.1 (auth) | High |
| A2.3 | Submittal APIs | `app/api/submittal/` | None | High |
| A2.4 | Scrape APIs | `app/api/scrape/` | None | Medium |
| A2.5 | Audit APIs | `app/api/audit/` | None | Medium |
| A2.6 | Health APIs | `app/api/health/` | None | Low |
| A2.7 | IndexNow APIs | `app/api/indexnow/` | None | Low |
| A2.8 | Public Config | `app/api/public-config/` | None | Low |
| A2.9 | AI Agents API | `app/api/agents/` | Z7 (lib/agents) | Medium |

**Parallel Execution Plan**:
```
Agent Group D (Core APIs):
├── Agent 11: A2.1 (Auth) - START FIRST
├── Agent 12: A2.3 (Submittal)
└── Agent 13: A2.4 (Scrape)

Agent Group E (Secondary APIs) - Start after A2.1:
├── Agent 14: A2.2 (Supplier)
├── Agent 15: A2.5 (Audit)
└── Agent 16: A2.9 (Agents API)
```

---

### WORKSTREAM 3: Backend Services (Z5)
**Agent Requirements**: Node.js, Express, PostgreSQL  
**Can Run**: 5 agents simultaneously

| Task ID | Task | Directory | Dependencies | Priority |
|---------|------|-----------|--------------|----------|
| B3.1 | Auth Routes (Legacy) | `backend/routes/auth.js` | None | Medium |
| B3.2 | Catalog Routes | `backend/routes/catalog.js` | None | Medium |
| B3.3 | Materials Routes | `backend/routes/materials.js` | None | Medium |
| B3.4 | RFQ Routes | `backend/routes/rfqs.js` | None | High |
| B3.5 | Supplier Routes | `backend/routes/suppliers.js` | None | High |
| B3.6 | AI Gateway | `backend/routes/ai-gateway.js` | None | High |
| B3.7 | Scoring Routes | `backend/routes/scoring.js` | None | Medium |
| B3.8 | Payments/Subscriptions | `backend/routes/payments.js`, `subscriptions.js` | None | High |
| B3.9 | Document AI | `backend/routes/documentAI.js` | None | Medium |
| B3.10 | Backend Services | `backend/services/` | None | Medium |
| B3.11 | Backend Middleware | `backend/middleware/` | None | Critical |
| B3.12 | Backend Utils | `backend/utils/` | None | Low |

**Parallel Execution Plan**:
```
Agent Group F (Backend Core):
├── Agent 17: B3.11 (Middleware) - START FIRST
├── Agent 18: B3.4 (RFQ Routes)
├── Agent 19: B3.5 (Supplier Routes)
└── Agent 20: B3.6 (AI Gateway)

Agent Group G (Backend Secondary):
├── Agent 21: B3.8 (Payments)
├── Agent 22: B3.1 + B3.2 (Auth + Catalog)
└── Agent 23: B3.10 (Services)
```

---

### WORKSTREAM 4: Libraries & Utilities (Z6 + Z7)
**Agent Requirements**: TypeScript, Azure SDK knowledge  
**Can Run**: 6 agents simultaneously

| Task ID | Task | Directory | Dependencies | Priority |
|---------|------|-----------|--------------|----------|
| L4.1 | Auth Library | `lib/auth.ts` | None | Critical |
| L4.2 | Azure Integration | `lib/azure/` | None | Critical |
| L4.3 | Database Client | `lib/db.ts`, `lib/azure-db.ts` | None | Critical |
| L4.4 | Scoring Engine | `lib/scoring/` | None | High |
| L4.5 | Scraper Agent | `lib/agents/scraper/` | L4.3 | High |
| L4.6 | Submittal Agent | `lib/agents/submittal-generator.ts` | L4.2 | High |
| L4.7 | Decision Logic | `lib/agents/decision-logic-extractor.ts` | None | Medium |
| L4.8 | Defensibility Agent | `lib/agents/defensibility-agent.ts` | None | Medium |
| L4.9 | Excel Utils | `lib/excel/` | None | Low |
| L4.10 | Email (Resend) | `lib/resend.ts` | None | Medium |
| L4.11 | Queue Service | `lib/queue-service.ts` | L4.2 | Low |
| L4.12 | Autodesk Interceptor | `lib/autodesk-interceptor.ts` | None | Medium |
| L4.13 | Prompts | `lib/prompts/` | None | Low |

**Parallel Execution Plan**:
```
Agent Group H (Core Libraries) - START FIRST:
├── Agent 24: L4.1 (Auth)
├── Agent 25: L4.2 (Azure)
└── Agent 26: L4.3 (Database)

Agent Group I (AI Agents) - After Group H:
├── Agent 27: L4.5 (Scraper)
├── Agent 28: L4.6 (Submittal)
└── Agent 29: L4.4 (Scoring)

Agent Group J (Secondary Libs):
├── Agent 30: L4.7 + L4.8 (Decision + Defensibility)
├── Agent 31: L4.10 (Email)
└── Agent 32: L4.12 (Autodesk)
```

---

### WORKSTREAM 5: Database & Migrations (Z4)
**Agent Requirements**: PostgreSQL, SQL  
**⚠️ SEQUENTIAL WITHIN ZONE** - Only one agent should work on database schemas at a time, but can run parallel with other zones (Z1-Z3, Z5-Z6)

| Task ID | Task | File | Dependencies | Priority |
|---------|------|------|--------------|----------|
| D5.1 | Core Schema | `database-schemas/schema.sql` | None | Critical |
| D5.2 | MVP Schema | `database-schemas/mvp_schema.sql` | D5.1 | Critical |
| D5.3 | Performance Indexes | `database-schemas/performance-indexes.sql` | D5.1 | High |
| D5.4 | RFQ Distribution Schema | `database-schemas/rfq-distribution-schema.sql` | D5.1 | High |
| D5.5 | Migrations | `database-schemas/migrations/` | D5.1 | High |
| D5.6 | Seed Data | `database-schemas/seed-*.sql` | D5.1 | Medium |

**Execution Plan** (Sequential within zone, parallel with others):
```
Single Agent 33: D5.1 → D5.2 → D5.3 → D5.4 → D5.5 → D5.6
(Can run alongside frontend, API, backend agents)
```

---

### WORKSTREAM 6: UI Components (Z2)
**Agent Requirements**: React, Tailwind CSS  
**Can Run**: 1 agent (currently limited scope)

| Task ID | Task | Directory | Dependencies | Priority |
|---------|------|-----------|--------------|----------|
| C6.1 | Email Components | `components/emails/` | None | Medium |

**Note**: Most UI components are inline in pages. This zone has growth potential - as shared components are extracted from pages, more agents can work here.

---

### WORKSTREAM 7: Tests (Z9)
**Agent Requirements**: Jest, Playwright  
**Can Run**: 5 agents simultaneously (test files are independent)

| Task ID | Task | Directory | Dependencies | Priority |
|---------|------|-----------|--------------|----------|
| T7.1 | Unit Tests - Auth | `tests/unit/auth/` | L4.1 | High |
| T7.2 | Unit Tests - API | `tests/unit/api/` | Z3 | High |
| T7.3 | Unit Tests - Scoring | `tests/unit/scoring/` | L4.4 | Medium |
| T7.4 | Unit Tests - Agents | `tests/unit/agents/` | Z7 | Medium |
| T7.5 | E2E - Catalog | `tests/e2e/catalog.spec.ts` | F1.12 | High |
| T7.6 | E2E - RFQ Flow | `tests/e2e/rfq-flow.spec.ts` | F1.13 | High |
| T7.7 | E2E - Supplier Dashboard | `tests/e2e/supplier-dashboard.spec.ts` | F1.7 | High |

**Parallel Execution Plan**:
```
Agent Group K (Unit Tests):
├── Agent 34: T7.1 (Auth Tests)
├── Agent 35: T7.2 (API Tests)
└── Agent 36: T7.3 + T7.4 (Scoring + Agents Tests)

Agent Group L (E2E Tests):
├── Agent 37: T7.5 (Catalog E2E)
├── Agent 38: T7.6 (RFQ E2E)
└── Agent 39: T7.7 (Supplier E2E)
```

---

### WORKSTREAM 8: Documentation (Z8)
**Agent Requirements**: Technical writing  
**Can Run**: UNLIMITED agents (docs are independent)

| Task ID | Task | File | Priority |
|---------|------|------|----------|
| Doc8.1 | API Documentation | `docs/MATERIALS_API_DOCUMENTATION.md` | High |
| Doc8.2 | OAuth Setup | `docs/OAUTH_SETUP.md` | High |
| Doc8.3 | Quick Start | `docs/QUICK_START.md` | High |
| Doc8.4 | Database Guide | `docs/DATABASE_VERIFICATION_GUIDE.md` | Medium |
| Doc8.5 | Deployment Checklist | `docs/deployment-checklist.md` | High |
| Doc8.6 | Secrets Setup | `docs/SECRETS-SETUP.md` | High |
| Doc8.7 | Architecture Docs | `docs/ARCHITECTURE_OF_EQUIVALENCE.md` | Medium |
| Doc8.8 | Agent Prompts | `docs/agent-prompts/` | Low |

---

### WORKSTREAM 9: Infrastructure & CI/CD
**Agent Requirements**: Azure, Docker, GitHub Actions  
**⚠️ CAREFUL** - Most infra files are shared and should be handled by a single agent

| Task ID | Task | File | Safe Parallel? | Priority |
|---------|------|------|----------------|----------|
| I9.1 | Main Dockerfile | `Dockerfile` | ❌ Single | High |
| I9.2 | Backend Dockerfile | `backend/Dockerfile` | ✅ Yes | High |
| I9.3 | Docker Compose | `docker-compose.yml` | ❌ Single | Medium |
| I9.4 | GitHub Workflow | `.github/workflows/deploy-azure-cd.yml` | ❌ Single | High |
| I9.5 | ESLint Config | `eslint.config.mjs` | ❌ Single | Low |
| I9.6 | TypeScript Config | `tsconfig.json` | ❌ Single | Low |
| I9.7 | Next.js Config | `next.config.js` | ❌ Single | Medium |
| I9.8 | Tailwind Config | `tailwind.config.js` | ❌ Single | Low |

**Execution Plan**: Assign **1 dedicated infrastructure agent** that handles all config files sequentially.
This agent can run alongside application agents but should be the only one touching config files.

```
Single Infrastructure Agent: I9.1 → I9.3 → I9.4 → I9.5 → I9.6 → I9.7 → I9.8
Parallel Agent for Backend Dockerfile: I9.2 (if needed)
```

---

## Maximum Parallel Agent Configuration

Based on the analysis, here's the optimal configuration for maximum parallelization:

### Phase 1: Foundation (Critical Path)
Run these agents first - they unlock other work:

```
┌─────────────────────────────────────────────────────────────┐
│ PHASE 1 - Foundation (7 agents)                             │
├─────────────────────────────────────────────────────────────┤
│ Agent 1:  L4.1 - Auth Library (lib/auth.ts)                 │
│ Agent 2:  L4.2 - Azure Integration (lib/azure/)             │
│ Agent 3:  L4.3 - Database Client (lib/db.ts)                │
│ Agent 4:  D5.1 - Core Schema (database-schemas/)            │
│ Agent 5:  B3.11 - Backend Middleware (backend/middleware/)  │
│ Agent 6:  A2.1 - Auth APIs (app/api/auth/)                  │
│ Agent 7:  F1.14 - Login/Signup Pages (app/login/, signup/)  │
└─────────────────────────────────────────────────────────────┘
```

### Phase 2: Core Features (After Phase 1)
Once foundation is stable:

```
┌─────────────────────────────────────────────────────────────┐
│ PHASE 2 - Core Features (15 agents)                         │
├─────────────────────────────────────────────────────────────┤
│ Frontend Agents (5):                                         │
│   Agent 8:  F1.1 - Dashboard Buyer                          │
│   Agent 9:  F1.2 - Dashboard Supplier                       │
│   Agent 10: F1.7 - Supplier Dashboard                       │
│   Agent 11: F1.12 - Materials Catalog                       │
│   Agent 12: F1.13 - RFQ Pages                               │
├─────────────────────────────────────────────────────────────┤
│ API Agents (4):                                              │
│   Agent 13: A2.2 - Supplier APIs                            │
│   Agent 14: A2.3 - Submittal APIs                           │
│   Agent 15: A2.4 - Scrape APIs                              │
│   Agent 16: A2.5 - Audit APIs                               │
├─────────────────────────────────────────────────────────────┤
│ Backend Agents (3):                                          │
│   Agent 17: B3.4 - RFQ Routes                               │
│   Agent 18: B3.5 - Supplier Routes                          │
│   Agent 19: B3.6 - AI Gateway                               │
├─────────────────────────────────────────────────────────────┤
│ Library Agents (3):                                          │
│   Agent 20: L4.4 - Scoring Engine                           │
│   Agent 21: L4.5 - Scraper Agent                            │
│   Agent 22: L4.6 - Submittal Agent                          │
└─────────────────────────────────────────────────────────────┘
```

### Phase 3: Secondary Features (After Phase 2)
Parallel with remaining work:

```
┌─────────────────────────────────────────────────────────────┐
│ PHASE 3 - Secondary Features (12 agents)                    │
├─────────────────────────────────────────────────────────────┤
│ Admin Pages (3):                                             │
│   Agent 23: F1.4 - Admin Analytics                          │
│   Agent 24: F1.5 - Admin Users                              │
│   Agent 25: F1.6 - Admin Suppliers                          │
├─────────────────────────────────────────────────────────────┤
│ Tools (3):                                                   │
│   Agent 26: F1.9 - Excel Addin                              │
│   Agent 27: F1.10 - Chrome Extension                        │
│   Agent 28: F1.11 - Revit Plugin                            │
├─────────────────────────────────────────────────────────────┤
│ Backend (3):                                                 │
│   Agent 29: B3.8 - Payments/Subscriptions                   │
│   Agent 30: B3.9 - Document AI                              │
│   Agent 31: B3.10 - Backend Services                        │
├─────────────────────────────────────────────────────────────┤
│ Libraries (3):                                               │
│   Agent 32: L4.7 - Decision Logic                           │
│   Agent 33: L4.8 - Defensibility Agent                      │
│   Agent 34: L4.12 - Autodesk Interceptor                    │
└─────────────────────────────────────────────────────────────┘
```

### Phase 4: Tests & Docs (Anytime)
Can run throughout:

```
┌─────────────────────────────────────────────────────────────┐
│ PHASE 4 - Tests & Documentation (8+ agents)                 │
├─────────────────────────────────────────────────────────────┤
│ Test Agents:                                                 │
│   Agent 35: T7.1 - Auth Unit Tests                          │
│   Agent 36: T7.2 - API Unit Tests                           │
│   Agent 37: T7.3 - Scoring Unit Tests                       │
│   Agent 38: T7.5 - Catalog E2E                              │
│   Agent 39: T7.6 - RFQ Flow E2E                             │
│   Agent 40: T7.7 - Supplier Dashboard E2E                   │
├─────────────────────────────────────────────────────────────┤
│ Doc Agents (unlimited):                                      │
│   Agent 41+: Any documentation file                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Dependency Graph

```
                    ┌──────────────────┐
                    │   Foundation     │
                    │  (L4.1, L4.2,    │
                    │   L4.3, D5.1)    │
                    └────────┬─────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         ▼                   ▼                   ▼
┌────────────────┐  ┌────────────────┐  ┌────────────────┐
│ Frontend Pages │  │   API Routes   │  │    Backend     │
│  (app/*)       │  │  (app/api/*)   │  │  (backend/*)   │
└────────┬───────┘  └────────┬───────┘  └────────┬───────┘
         │                   │                   │
         │          ┌────────┴────────┐          │
         │          │                 │          │
         ▼          ▼                 ▼          ▼
┌────────────────────────────────────────────────────────┐
│                    AI Agents (lib/agents/)              │
│         (Scraper, Submittal, Decision, Defensibility)   │
└────────────────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────────┐
│                        Tests                            │
│              (Unit Tests, E2E Tests)                    │
└────────────────────────────────────────────────────────┘
```

---

## File Ownership Matrix

To prevent conflicts, assign file ownership:

| Agent Type | Owns | Must Not Touch |
|------------|------|----------------|
| Frontend Page Agent | `app/[page]/` | `lib/`, `backend/` |
| API Route Agent | `app/api/[route]/` | `backend/routes/` |
| Backend Route Agent | `backend/routes/[route].js` | `app/api/` |
| Library Agent | `lib/[feature]/` | `app/`, `backend/` |
| Database Agent | `database-schemas/` | ALL code files |
| Test Agent | `tests/[type]/[feature]/` | Source code (read-only) |
| Doc Agent | `docs/[doc].md` | ALL code files |

---

## Communication Protocol

When agents need to coordinate:

### 1. Shared Type Changes
If an agent needs to modify `types/schema.ts`:
- **Signal**: Create PR comment "BLOCKING: Need to modify types/schema.ts"
- **Protocol**: Pause other agents that import from schema.ts
- **Resume**: After merge, all agents pull latest

### 2. Package.json Changes
If an agent needs to add a dependency:
- **Signal**: Create PR comment "DEPENDENCY: Need to add [package]"
- **Protocol**: Only one agent modifies package.json at a time
- **Resume**: After merge, all agents run `npm install`

### 3. Database Schema Changes
- **Signal**: Create PR comment "SCHEMA: Modifying [table]"
- **Protocol**: Run migration in sequence
- **Resume**: All agents update their DB connection

---

## Summary: Maximum Agents Without Conflicts

**Understanding the phases**: Phases are sequential in terms of dependencies, but many agents can run simultaneously within and across phases once foundation work (Phase 1) is stable.

| Phase | Agents | Timing | Focus Area |
|-------|--------|--------|------------|
| Phase 1 | 7 | Start immediately | Foundation (Auth, DB, Core Libs) |
| Phase 2 | 15 | After Phase 1 foundation is stable | Core Features (Pages, APIs, Backend) |
| Phase 3 | 12 | Can overlap with Phase 2 | Secondary Features (Admin, Tools) |
| Phase 4 | 8+ | Run throughout all phases | Tests & Documentation |

**Maximum Concurrent Agents**:
- **Peak concurrency**: ~22-27 agents when Phases 2, 3, and 4 overlap
- **Safe recommendation**: **15-20 agents** to allow buffer for coordination
- **Aggressive mode**: **25+ agents** if using good branch management

**Cumulative unique tasks**: 70+ individual tasks across all workstreams

---

## Quick Start Commands

```bash
# Lint check before any changes
npm run lint

# Type check
npm run type-check

# Build verification
npm run build

# Unit tests (fast)
npm run test:unit

# E2E tests (slow, run after code freeze)
npm run test:e2e
```

---

## Contact & Escalation

For conflicts or blockers:
1. Check this document's File Ownership Matrix
2. Create PR comment with [BLOCKING] or [CONFLICT] prefix
3. Pause work on conflicting area
4. Escalate to repo owner if unresolved

---

**Document Maintainer**: GreenChainz DevOps  
**Review Frequency**: After each major release
