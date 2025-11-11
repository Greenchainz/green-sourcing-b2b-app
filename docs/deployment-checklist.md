# GreenChainz Deployment Readiness Checklist

**Purpose**: Document what needs to be deployed when cloud credits are approved.

## **1. Frontend Deployment (Vercel)**
- [ ] Vercel account connected to GitHub repo
- [ ] Next.js app configured for production build
- [ ] Environment variables set (API keys, Supabase URL, etc.)
- [ ] Custom domain purchased (optional for MVP)
- [ ] Cloudflare CDN configured in front of Vercel

## **2. Backend Deployment (Supabase)**
- [ ] Supabase project created
- [ ] PostgreSQL database schema designed:
  - Users, Customers, Suppliers, Products, Orders, Certifications, EPDData tables
- [ ] Supabase Auth configured (buyer/supplier roles)
- [ ] Edge Functions deployed for custom business logic
- [ ] API keys secured (`.env` file, never committed to GitHub)

## **3. Database Strategy**
- [ ] **SQL (Supabase PostgreSQL)**:
  - Transactional data: users, orders, payments, RFQs
- [ ] **NoSQL (Supabase JSONB or external MongoDB)**:
  - Product catalog, sustainability data (EPDs, certifications)

## **4. Security & Performance (Cloudflare)**
- [ ] Domain DNS pointed to Cloudflare
- [ ] SSL/TLS certificate enabled (free via Cloudflare)
- [ ] DDoS protection active
- [ ] WAF (Web Application Firewall) configured

## **5. CI/CD Pipeline**
- [ ] GitHub → Vercel automatic deployments configured
- [ ] Staging environment (preview URLs for pull requests)
- [ ] Production environment (main branch auto-deploys)

## **6. Monitoring & Analytics (Future)**
- [ ] Error tracking (Sentry or similar)
- [ ] Analytics (Google Analytics or Plausible)
- [ ] Supabase logs monitored

## **Estimated Timeline**
- **Week 1**: Frontend deployed to Vercel (staging)
- **Week 2**: Supabase backend + database schema live
- **Week 3**: Cloudflare security layer active
- **Week 4**: CI/CD pipeline tested, production-ready
