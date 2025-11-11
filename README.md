# GreenChainz - B2B Green Sourcing Marketplace

**Mission**: Build a data-driven B2B marketplace connecting sustainability-minded buyers (architects, contractors, procurement teams) with verified green suppliers.

**Our Moat**: Verifiable sustainability data. We aggregate, standardize, and present EPDs, certifications, and carbon footprints in a single, trusted platform.

---

## **Tech Stack**

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Vercel (Next.js/React) | Headless, API-first UI with automatic deployments from GitHub |
| **Backend** | Supabase (PostgreSQL + Edge Functions) | Managed database (SQL for transactions) + instant REST/GraphQL APIs |
| **Database Strategy** | Hybrid SQL + NoSQL | SQL (Supabase) for transactional data (users, orders); NoSQL (MongoDB/Supabase JSONB) for flexible product/sustainability data |
| **Security & CDN** | Cloudflare | DDoS protection, WAF, SSL/TLS, global CDN for performance |
| **Version Control** | GitHub (Student Developer Pack) | CI/CD pipeline via Vercel integration |

---

## **Architecture Principles**

1. **API-First**: Every platform function (auth, search, orders) exposed via secure, documented APIs
2. **Headless Commerce**: Decoupled frontend (presentation) from backend (business logic) for multi-channel flexibility
3. **Data as Core Asset**: Sustainability data treated as first-class citizen (dedicated database schema for EPDs, certifications, carbon metrics)

---

## **Current Status: MVP Development**

### **Phase 1: Foundation (Weeks 1-4) - IN PROGRESS**
- [x] Strategic blueprint finalized
- [x] Tech stack selected
- [ ] **IN PROGRESS**: Data provider partnerships (EPD International, WAP Sustainability, Building Transparency, Autodesk, FSC)
- [ ] GitHub Student Developer Pack activated
- [ ] Cloud credits approved (AWS/Google Cloud - pending)
- [ ] Local MVP deployed to Vercel (staging environment)

### **Phase 2: Data Integration (Weeks 5-8)**
- [ ] API integrations with 2-3 core data providers
- [ ] Database schema design (hybrid SQL/NoSQL)
- [ ] Product Information Management (PIM) tool selection

### **Phase 3: Supplier Onboarding (Weeks 9-12)**
- [ ] White-glove onboarding for 10-15 anchor suppliers
- [ ] Tiered integration model (API, file upload, manual entry)

---

## **User Personas**

### **Demand Side (Buyer)**: Sustainability-Minded Architect (Sarah)
- **Goal**: Discover, compare, and de-risk sourcing of green materials
- **Pain Point**: Fragmented research, no "apples-to-apples" comparisons

### **Supply Side (Seller)**: Regional Materials Manufacturer (David)
- **Goal**: Get innovative, sustainable products in front of qualified buyers
- **Pain Point**: High cost, low ROI of traditional marketing

---

## **Key Differentiators**

| **Feature** | **GreenChainz** | **Competitors (2050 Materials, Ecomedes)** |
|-------------|-----------------|---------------------------------------------|
| **Data Moat** | Verified EPDs, certifications, carbon metrics aggregated from 5+ sources | Limited or fragmented data |
| **Architecture** | Modern, API-first, headless (scalable, multi-channel) | Often monolithic |
| **Database** | Hybrid SQL/NoSQL (transactional integrity + flexible sustainability data) | Typically single-paradigm |
| **Target Market** | B2B (architects, contractors, procurement) | Often B2C or mixed |

---

## **Documentation**

- **Strategic Plan**: `/docs/Greenchainz B2B Marketplace Research Plan.md`
- **Solo Founder Strategy**: `/docs/Solo Tech Business Launch Strategy.pdf`
- **Data Provider Contacts**: `/docs/data-provider-contacts.md`
- **Outreach Templates**: `/docs/outreach-email-template.md`
- **Deployment Checklist**: `/docs/deployment-checklist.md`
- **Cloud Credits Follow-up**: `/docs/cloud-credits-followup-email.md`

---

## **Compliance & Standards**

Our platform aligns with:
- **ISO 14025**: Type III Environmental Declarations (EPDs)
- **EN 15804**: Sustainability of construction works
- **ISO 21930**: Environmental declarations for building products
- **EPD Hub GPI v1.3**: General Program Instructions for EPD verification

---

## **Next Milestones**

- **November 10, 2025**: Data provider contact list finalized, first outreach emails sent
- **November 17, 2025**: Minimum 2 API partnership responses received
- **December 1, 2025**: Local MVP deployed to Vercel staging
- **January 2026**: First anchor supplier onboarded

---

**Contact**: [Your Email] | [LinkedIn Profile]  
**License**: [Choose appropriate license - MIT, Apache 2.0, or proprietary]
