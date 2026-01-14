# GreenChainz Development Configuration - Azure Production Environment

> **Stack Philosophy**: Enterprise-grade Azure infrastructure. No shortcuts. **No Vercel. No Supabase. Everything Azure.**
> 
> **Founder's directive**: "I am no longer on Supabase or Vercel - I am **only on Azure**"

---

## 🏗️ **Current Azure Infrastructure**

### **Production Environment**
```yaml
tenant: ca4f78d4-c753-4893-9cd8-1b309922b4dc
subscription: greenchainz-core-start (f9164e8d-d74d-43ea-98d4-b0466b3ef8b8)
resource_group: rg-greenchainz-prod-container
region: eastus
credits_remaining: $5000 (treat as free but optimize)
```

### **Container Services (Serverless)**
```yaml
container_apps:
  environment: greenchainz-container-env
  frontend:
    name: greenchainz-frontend
    url: https://greenchainz-frontend.jollyrock-a66f2da6.eastus.azurecontainerapps.io
    image: acrgreenchainzprod916.azurecr.io/greenchainz-frontend:latest
    tech: Next.js 15.5.9, React 19.2.3
    port: 3000
    cpu: 0.5
    memory: 1.0Gi
    replicas: 1-3
    
  backend:
    name: greenchainz-container
    url: https://greenchainz-container.jollyrock-a66f2da6.eastus.azurecontainerapps.io
    image: acrgreenchainzprod916.azurecr.io/greenchainz-backend:latest
    tech: Node.js 20, Express
    port: 8080
    cpu: 0.5
    memory: 1.0Gi
    replicas: 1-3

container_registry:
  name: acrgreenchainzprod916
  url: acrgreenchainzprod916.azurecr.io
  sku: Basic
```

### **Database & Storage**
```yaml
database:
  name: greenchainz-db-prod
  type: Azure Database for PostgreSQL (Flexible)
  connection: ${DATABASE_URL}
  
storage:
  primary: greenchainzscraper (Storage Account)
  revit_files: revitfiles (Storage Account)
  type: Azure Blob Storage
```

### **AI Services**
```yaml
azure_ai_foundry:
  projects:
    - greenchainz-foundry
    - greenchainz-content-intel
    - gemenis-agents-resource
  model: GPT-4o
  use_case: AI Audit Agent (Autodesk SDA API integration)
  status: Architected, not deployed yet
```

### **Authentication**
```yaml
azure_ad:
  app_id: 479e2a01-70ab-4df9-baa4-560d317c3423
  app_name: greenchainz
  tenant: ca4f78d4-c753-4893-9cd8-1b309922b4dc
  type: Multi-tenant + Personal Microsoft Accounts
  redirect_uris:
    - https://greenchainz-frontend.jollyrock-a66f2da6.eastus.azurecontainerapps.io/login/callback
    - http://localhost:3000/login/callback
```

### **CI/CD - GitHub Actions (Federated Identity)**
```yaml
service_principal: 111de6c0-9535-4b2a-a281-9b657072ef6a
federated_credential: github-actions-production
subject: repo:jnorvi5/green-sourcing-b2b-app:environment:production
workflow: .github/workflows/deploy-azure-cd.yml
trigger: push to main
```

### **Monitoring & Logging**
```yaml
application_insights:
  - greenchainz-platform
  - greenchainz-scraper
log_analytics:
  - workspace-rggreenchainzprod-container5PZ8
  - workspacerggreenchainz906c

api_management:
  name: greenchainz-scraper-apim
  use_case: API gateway, rate limiting, analytics
```

### **Other Azure Services**
```yaml
redis: greenchainz (Azure Cache for Redis)
key_vault: greenchianz-vault
app_service_plans:
  - FLEX-greenchainz-scraper-d986
  - ASP-greenchainzscraper-8598
```

---

## 🛠️ **4 Strategic Tools**

### **1. Ketch (Privacy & Consent Management)**
```yaml
purpose: GDPR/CCPA compliance, user consent tracking
integration_points:
  - Frontend: Cookie consent banner
  - Backend: Privacy API for data subject requests
priority: Pre-launch requirement
setup_needed:
  - Ketch account configuration
  - Privacy policy sync
  - Data mapping (what data we collect, where stored)
```

### **2. Intercom (Customer Support & Engagement)**
```yaml
purpose: Live chat, onboarding flows, customer success
integration_points:
  - Frontend: Chat widget on all pages
  - Backend: User data sync for context
  - Segments: Suppliers vs Architects
use_cases:
  - Founding 50 onboarding support
  - RFQ troubleshooting
  - Feature feedback collection
priority: Week 1-2 (supplier onboarding starting)
```

### **3. Google Analytics (GA4)**
```yaml
purpose: User behavior tracking, conversion funnels
integration_points:
  - Frontend: GA4 tag via Google Tag Manager
  - Custom events:
    - Supplier signup
    - Material search
    - RFQ submission
    - EPD download
metrics_to_track:
  - Daily Active Users (DAU)
  - RFQ conversion rate
  - Search-to-RFQ funnel
  - Time to first material search
priority: Pre-launch (need baseline data)
```

### **4. Zoho Mail (Transactional Email)**
```yaml
purpose: Supplier welcome emails, RFQ notifications, alerts
configuration:
  domain: greenchainz.com
  from_addresses:
    - jerit@greenchainz.com
    - noreply@greenchainz.com
    - rfq@greenchainz.com
email_types:
  - Supplier onboarding sequence
  - RFQ notifications (new/closed)
  - Weekly digest for architects
  - Data quality alerts (internal)
integration: Backend API + email templates
priority: Founding 50 campaign (this week)
```

---

## 📋 **Development Standards**

### **Code Formatting (Prettier)**
```yaml
enabled: true
semi: true
singleQuote: true
trailingComma: "es5"
tabWidth: 2
printWidth: 100
```

### **TypeScript (Strict Mode)**
```yaml
strict: true
noImplicitAny: true
strictNullChecks: true
noUnusedLocals: true
noUnusedParameters: true
```

### **ESLint Rules**
```yaml
extends:
  - "eslint:recommended"
  - "plugin:@typescript-eslint/recommended"
  - "plugin:react/recommended"
  - "plugin:react-hooks/recommended"
rules:
  no-console: "warn"  # Use proper logging
  no-unused-vars: "error"
  prefer-const: "error"
  no-var: "error"  # Ban var, use const/let
```

### **Git Branch Naming**
```bash
# Pattern: {type}/{ticket-id}-{short-description}
feature/GC-123-add-epd-search
fix/GC-456-supplier-dashboard-bug
refactor/GC-789-database-schema
docs/GC-012-api-documentation
```

### **Commit Message Format**
```bash
# Pattern: {type}({scope}): {subject}
feat(epd-search): add filter by carbon footprint
fix(auth): resolve Azure AD redirect loop
refactor(database): optimize EPD query performance
docs(readme): update deployment instructions
```

---

## 🚀 **Current Sprint Focus**

### **This Week (2-Hour Horizon)**
```yaml
priority_1: Fix backend deployment (container app failing)
priority_2: Zoho Mail integration for Founding 50 emails
priority_3: Intercom setup for supplier support
priority_4: RFQ system backend API scaffolding
```

### **Next 2 Weeks**
```yaml
week_1:
  - Backend deployment working
  - Zoho Mail sending welcome emails
  - Intercom chat widget live
  - RFQ form UI (frontend)
  
week_2:
  - RFQ submission flow complete
  - Google Analytics events tracking
  - Ketch privacy banner deployed
  - Founding 50: First 10 suppliers onboarded
```

---

## 🎯 **Key Initiatives**

### **1. RFQ System (NOT BUILT YET - URGENT)**
```yaml
status: Scaffolding needed
components:
  frontend:
    - RFQ form (architect submits material request)
    - Supplier response interface
    - RFQ status tracking
  backend:
    - API: POST /api/rfq
    - Database: rfqs table
    - Email: Notify suppliers via Zoho
    - Matching: Find suppliers by material type
timeline: 2 weeks to MVP
```

### **2. AI Audit Agent (ARCHITECTED, NOT DEPLOYED)**
```yaml
status: Architecture done, deployment pending
tech_stack:
  - Azure AI Foundry (GPT-4o)
  - Autodesk SDA API integration
  - Node.js orchestration service
workflow:
  1. Architect uploads Revit model
  2. Agent extracts materials via SDA API
  3. GPT-4o matches materials to EPD database
  4. Generate sustainability report
timeline: Week 3-4
```

### **3. Founding 50 Campaign (ACTIVE)**
```yaml
goal: 50 verified suppliers by Q1 2026
current_count: 0 (starting now)
strategy:
  - Cold outreach via Zoho Mail
  - Personalized onboarding via Intercom
  - Supplier dashboard (needs build)
tracking:
  - Zoho CRM integration
  - Weekly progress dashboard
  - Founding 50 badge/perks
```

### **4. Data Integrations**
```yaml
sources:
  - EPD International API
  - Building Transparency (EC3)
  - Certification bodies (LEED, BREEAM)
method: Web scraping + API sync
storage: Azure Blob Storage → PostgreSQL
frequency: Weekly automated sync
priority: After RFQ system
```

---

## 🔒 **Security & Compliance**

### **Environment Variables (Never Commit)**
```bash
# Frontend (.env.local)
NEXT_PUBLIC_BACKEND_URL=https://greenchainz-container.jollyrock-a66f2da6.eastus.azurecontainerapps.io
NEXT_PUBLIC_AZURE_TENANT=ca4f78d4-c753-4893-9cd8-1b309922b4dc
NEXT_PUBLIC_AZURE_CLIENT_ID=479e2a01-70ab-4df9-baa4-560d317c3423
NEXT_PUBLIC_AZURE_REDIRECT_URI=https://greenchainz-frontend.jollyrock-a66f2da6.eastus.azurecontainerapps.io/login/callback
NEXT_PUBLIC_GA_ID=<Google Analytics ID>
NEXT_PUBLIC_INTERCOM_APP_ID=<Intercom App ID>

# Backend (.env)
DATABASE_URL=postgresql://user:pass@greenchainz-db-prod.postgres.database.azure.com:5432/greenchainz
AZURE_STORAGE_CONNECTION_STRING=<Azure Blob connection>
AZURE_OPENAI_ENDPOINT=<Azure AI Foundry endpoint>
AZURE_OPENAI_API_KEY=<AI Foundry key>
ZOHO_MAIL_API_KEY=<Zoho Mail key>
KETCH_API_KEY=<Ketch privacy API key>
AUTODESK_CLIENT_ID=<Autodesk Forge client ID>
AUTODESK_CLIENT_SECRET=<Autodesk Forge secret>
```

### **Security Rules**
```yaml
authentication:
  require_2fa: true  # Production access only
  session_timeout: 3600  # 1 hour
  password_min_length: 12

api_security:
  rate_limiting:
    enabled: true
    requests_per_minute: 100
    requests_per_hour: 1000
  cors:
    allowed_origins:
      - https://greenchainz.com
      - https://www.greenchainz.com
      - https://greenchainz-frontend.jollyrock-a66f2da6.eastus.azurecontainerapps.io
  headers:
    - "X-Frame-Options: DENY"
    - "X-Content-Type-Options: nosniff"
    - "Strict-Transport-Security: max-age=31536000"

data_privacy:
  log_retention: 90_days
  anonymize_logs: true
  gdpr_compliant: true
  ketch_integration: required
```

---

## 📂 **Project Structure**

```bash
green-sourcing-b2b-app/
├── frontend/               # Next.js 15 app
│   ├── src/
│   │   ├── components/    # React components (max 300 lines)
│   │   ├── pages/         # Page routes
│   │   ├── hooks/         # Custom hooks (prefix: use*)
│   │   ├── utils/         # Pure utility functions
│   │   ├── types/         # TypeScript interfaces
│   │   └── api/           # API client functions
│   ├── public/            # Static assets
│   └── Dockerfile         # Frontend container image
│
├── backend/               # Node.js Express API
│   ├── routes/            # Express route handlers
│   ├── controllers/       # Business logic (max 200 lines)
│   ├── services/          # Database/external API calls
│   ├── middleware/        # Auth, validation, logging
│   ├── models/            # Database schemas
│   ├── utils/             # Shared utilities
│   └── Dockerfile         # Backend container image
│
├── .github/
│   └── workflows/
│       └── deploy-azure-cd.yml  # CI/CD pipeline
│
├── docs/                  # Documentation
├── scripts/               # Automation scripts
└── README.md             # Main documentation
```

---

## 🚦 **GitHub Actions Workflow**

### **Automated Deployment**
```yaml
name: Deploy to Azure Container Apps
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Azure Login (Federated)
        uses: azure/login@v1
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
      
      - name: Build Frontend Image
        run: |
          az acr build \
            --registry acrgreenchainzprod916 \
            --image greenchainz-frontend:latest \
            --file frontend/Dockerfile \
            frontend/
      
      - name: Deploy Frontend Container App
        run: |
          az containerapp update \
            --name greenchainz-frontend \
            --resource-group rg-greenchainz-prod-container \
            --image acrgreenchainzprod916.azurecr.io/greenchainz-frontend:latest
      
      - name: Build Backend Image
        run: |
          az acr build \
            --registry acrgreenchainzprod916 \
            --image greenchainz-backend:latest \
            --file backend/Dockerfile \
            backend/
      
      - name: Deploy Backend Container App
        run: |
          az containerapp update \
            --name greenchainz-container \
            --resource-group rg-greenchainz-prod-container \
            --image acrgreenchainzprod916.azurecr.io/greenchainz-backend:latest
```

### **Required GitHub Secrets**
```yaml
AZURE_CLIENT_ID: 479e2a01-70ab-4df9-baa4-560d317c3423
AZURE_TENANT_ID: ca4f78d4-c753-4893-9cd8-1b309922b4dc
AZURE_SUBSCRIPTION_ID: f9164e8d-d74d-43ea-98d4-b0466b3ef8b8
```

---

## 📊 **Performance Budgets**

### **Frontend**
```yaml
lighthouse_scores:
  performance: >= 90
  accessibility: >= 95
  best_practices: >= 90
  seo: >= 95

bundle_size:
  max_initial_js: 200KB  # gzipped
  max_initial_css: 50KB

page_load:
  first_contentful_paint: < 1.5s
  time_to_interactive: < 3s
```

### **Backend**
```yaml
api_response_time:
  p50: < 200ms
  p95: < 500ms
  p99: < 1000ms

database_queries:
  max_query_time: 100ms
  connection_pool_size: 10
```

---

## 🎯 **Success Metrics (Q1 2026)**

```yaml
suppliers:
  founding_50: 50 verified suppliers
  active_weekly: >= 30
  average_products_listed: >= 20

architects:
  registered: 200 users
  daily_active: >= 50
  rfq_submissions_weekly: >= 20

platform:
  rfq_conversion_rate: >= 15%
  average_response_time: < 24 hours
  user_retention_30d: >= 60%
```

---

## 🔗 **Quick Links**

- **Production Frontend**: https://greenchainz-frontend.jollyrock-a66f2da6.eastus.azurecontainerapps.io
- **Production Backend**: https://greenchainz-container.jollyrock-a66f2da6.eastus.azurecontainerapps.io
- **Azure Portal**: https://portal.azure.com
- **GitHub Repo**: https://github.com/jnorvi5/green-sourcing-b2b-app
- **GitHub Actions**: https://github.com/jnorvi5/green-sourcing-b2b-app/actions
- **Container Registry**: https://portal.azure.com/#@ca4f78d4-c753-4893-9cd8-1b309922b4dc/resource/subscriptions/f9164e8d-d74d-43ea-98d4-b0466b3ef8b8/resourceGroups/rg-greenchainz-prod-container/providers/Microsoft.ContainerRegistry/registries/acrgreenchainzprod916

---

## 🚨 **Non-Negotiables**

1. **Azure Only**: No Vercel, No Supabase, No AWS. **Everything Azure. Period.**
2. **Enterprise Way**: No shortcuts. Proper architecture even if it takes longer.
3. **2-Hour Horizon**: Focus on immediate task + next 2 hours only.
4. **Evidence-Based**: Report what data supports, not what founder wants to hear.
5. **Scope Creep Flag**: Call out feature bloat immediately.
6. **Copy-Paste Ready**: All commands executable, zero placeholders.

---

**Last Updated**: January 9, 2026  
**Status**: Backend deployment debugging, Zoho Mail integration next  
**Credits Remaining**: $5000 Azure credits (optimize but use what's needed)
