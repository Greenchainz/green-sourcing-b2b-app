# Data Provider Integration - Implementation Checklist

## ✅ Phase 1: Core Integrations (COMPLETE)

### Database Setup
- [x] Create 8 new data provider tables (`Data_Providers`, `Product_Environmental_Data`, `Supplier_BCorp_Data`, `FSC_Certifications`, `C2C_Certifications`, `LEED_Product_Credits`, `Product_EPDs`, `Data_Provider_Sync_Log`)
- [x] Add 13 indexes for query performance
- [x] Integrate with existing Event Sourcing architecture
- [x] Create seed script with 10 providers
- [x] Document database schema in `schema.sql`

### Backend Services
- [x] **ec3Service.js** (180 lines) - Building Transparency EC3 integration
  - [x] `searchMaterials()` - Search EC3 database
  - [x] `getCarbonData()` - Get detailed carbon footprint
  - [x] `compareMaterials()` - Compare multiple materials
  - [x] `saveCarbonData()` - Save to database with event logging

- [x] **fscService.js** (170 lines) - FSC certificate verification
  - [x] `verifyCertificate()` - Real-time verification via web scraping
  - [x] `bulkVerify()` - Batch verification with rate limiting
  - [x] `saveVerification()` - Save to database with event logging
  - [x] `checkExpiringCertificates()` - Get certs expiring within 30 days

- [x] **bcorpService.js** (140 lines) - B Corp directory integration
  - [x] `importBCorpCSV()` - Parse CSV export
  - [x] `lookupCompany()` - Fuzzy matching (handles "Inc", "LLC" variations)
  - [x] `saveBCorpData()` - Save to database with event logging
  - [x] `getBCorpSuppliers()` - Get all B Corp certified suppliers
  - [x] `getImpactBadge()` - Calculate badge tier (Bronze/Silver/Gold/Platinum)

### API Routes
- [x] **EC3 Routes** (3 endpoints)
  - [x] `GET /api/carbon/search?q=insulation` - Search materials
  - [x] `GET /api/carbon/:productId` - Get cached carbon data
  - [x] `POST /api/carbon/verify` - Fetch from EC3 and save (Protected)

- [x] **FSC Routes** (2 endpoints)
  - [x] `POST /api/verify/fsc` - Verify certificate (Protected)
  - [x] `GET /api/verify/fsc/expiring` - List expiring certs (Admin)

- [x] **B Corp Routes** (3 endpoints)
  - [x] `POST /api/verify/bcorp` - Lookup company (Protected)
  - [x] `GET /api/suppliers/bcorp` - Get all B Corp suppliers (Public)
  - [x] `POST /api/data-providers/import-bcorp` - Import CSV (Admin)

- [x] **Provider Management** (2 endpoints)
  - [x] `GET /api/data-providers` - List all providers (Public)
  - [x] `GET /api/data-providers/stats` - API usage statistics (Admin)

### Dependencies
- [x] Add `cheerio@^1.0.0` to package.json (FSC scraping)
- [x] Add `csv-parser@^3.0.0` to package.json (B Corp CSV import)
- [x] Update backend imports to include new services

### Documentation
- [x] **backend/services/README.md** (400 lines) - Service documentation
- [x] **SETUP-DATA-PROVIDERS.md** (450 lines) - Setup guide
- [x] **DATA-PROVIDER-IMPLEMENTATION-SUMMARY.md** (200 lines) - Implementation summary
- [x] **ARCHITECTURE-DIAGRAMS.md** (500 lines) - Visual architecture diagrams

---

## 📋 Phase 2: Next Steps (TODO)

### Immediate Actions (This Week)

- [ ] **Install Dependencies**
  ```bash
  cd backend
  npm install cheerio csv-parser
  ```

- [ ] **Start Database & Seed Providers**
  ```bash
  docker compose up -d
  docker exec -i greenchainz_db psql -U user -d greenchainz_dev < database-schemas/seed-data-providers.sql
  ```

- [ ] **Start Backend Server**
  ```bash
  node index.js
  # Verify: "✅ Database schema ensured."
  ```

- [ ] **Test API Endpoints**
  ```bash
  # EC3 search
  curl "http://localhost:3001/api/carbon/search?q=insulation&limit=5"
  
  # Data providers list
  curl http://localhost:3001/api/data-providers
  ```

- [ ] **Request B Corp CSV Export**
  - To: data@bcorporation.net
  - Subject: "B Corp Directory Export for GreenChainz Integration"
  - Template: See `SETUP-DATA-PROVIDERS.md` email template
  - Expected: CSV with 6,500+ companies
  - Save to: `backend/data/bcorp-directory.csv`

- [ ] **Request FSC Bulk Data (Optional)**
  - To: info@us.fsc.org
  - Subject: "FSC Certificate Directory Bulk Export for GreenChainz Platform"
  - Template: See `SETUP-DATA-PROVIDERS.md` email template
  - Note: Web scraping works, but bulk export faster for high volume

### Enhanced Features (Weeks 5-8)

- [ ] **EPD International Integration**
  - [ ] Email `info@environdec.com` requesting bulk CSV export
  - [ ] Create `epdService.js` (similar to ec3Service)
  - [ ] Import ~2,000 EPDs to `Product_EPDs` table
  - [ ] Link EPDs to products via manufacturer name matching
  - [ ] API endpoint: `GET /api/epd/:productId`

- [ ] **LEED Credit Calculator**
  - [ ] Email `leedinfo@usgbc.org` for product database access
  - [ ] Create `leedService.js`
  - [ ] Parse LEED credit documentation
  - [ ] Import to `LEED_Product_Credits` table
  - [ ] API endpoint: `GET /api/leed/credits/:productId`
  - [ ] Display: "Contributes to LEED MR Credit 3 (Building Product Disclosure)"

- [ ] **Cradle to Cradle Registry**
  - [ ] Scrape https://www.c2ccertified.org/products
  - [ ] Create `c2cService.js` (web scraping with cheerio)
  - [ ] Import certified products to `C2C_Certifications` table
  - [ ] Display C2C level badges (Basic → Platinum)
  - [ ] Show 5 category scores (Material Health, Reutilization, Renewable Energy, Water, Social Fairness)

- [ ] **Green Seal Integration**
  - [ ] Download product list from https://greenseal.org/certified-products-services
  - [ ] Create `greenSealService.js`
  - [ ] CSV import to `Certifications` table with CertifyingBody='Green Seal'
  - [ ] Filter products by Green Seal standards (GS-11, GS-13, etc.)

### Frontend Integration (Week 6-7)

- [ ] **Certification Badge Component**
  - [ ] Create `frontend/src/components/CertificationBadge.tsx`
  - [ ] Props: `{ type: 'fsc' | 'bcorp' | 'c2c' | 'leed' | 'greenseal', verified: boolean, score?: number, level?: string }`
  - [ ] Color coding: Green=Verified, Gray=Self-reported, Red=Expired
  - [ ] Tooltip: Hover shows verification details (date, source, expiry)

- [ ] **Product Card Badges**
  - [ ] Update `ArchitectDashboard.tsx` material cards
  - [ ] Display FSC badge if `product.fsc_certified`
  - [ ] Display B Corp badge with score if `supplier.bcorp_certified`
  - [ ] Display C2C level badge if `product.c2c_level`
  - [ ] Display carbon footprint with color coding (green < 2.0 kgCO2e, yellow 2-5, red > 5)

- [ ] **Verification Filter**
  - [ ] Add "Verified Only" checkbox to material search filters
  - [ ] Query: `WHERE VerificationStatus = 'Verified'`
  - [ ] Display count: "45 verified materials" vs "127 total materials"

- [ ] **Carbon Comparison Tool**
  - [ ] Create `CarbonComparison.tsx` component
  - [ ] Select 2-4 materials to compare
  - [ ] Bar chart showing GWP (kgCO2e) side-by-side
  - [ ] Highlight lowest carbon option in green

### Automated Monitoring (Week 8)

- [ ] **Expiring Certificates Cron Job**
  - [ ] Create `backend/scripts/check-expiring-certs.js`
  - [ ] Daily check at 9 AM: `fscService.checkExpiringCertificates(pool)`
  - [ ] Send email alerts to suppliers (30-day notice)
  - [ ] Log to `Data_Provider_Sync_Log`
  - [ ] Linux/macOS: Add to crontab
  - [ ] Windows: Create Task Scheduler task

- [ ] **Weekly Re-Verification**
  - [ ] Create `backend/scripts/weekly-reverify.js`
  - [ ] Re-verify all FSC certificates (detect revoked/suspended)
  - [ ] Update `FSC_Certifications.CertificateStatus`
  - [ ] Log changes to `Certification_Events`
  - [ ] Email admins if any certs became invalid

- [ ] **API Usage Dashboard**
  - [ ] Add "Data Providers" tab to Admin Console
  - [ ] Display: Provider name, API calls this month, cost, uptime %
  - [ ] Chart: API calls over time (last 30 days)
  - [ ] Alert if API uptime < 99%

---

## 🚀 Phase 3: Paid Integrations (Month 6+)

### WAP Sustainability (Month 6 - Post Break-Even)

- [ ] **Subscription & Setup**
  - [ ] Email `info@wapsustainability.com` for pricing/API access
  - [ ] Subscribe: $500/month (comprehensive LCA database)
  - [ ] Receive API key + documentation

- [ ] **WAP Service Implementation**
  - [ ] Create `wapService.js`
  - [ ] Functions: `searchProducts()`, `getLCA()`, `getLifecycleStages()`, `saveLCAData()`
  - [ ] API endpoints: `GET /api/lca/search`, `POST /api/lca/verify`
  - [ ] Store in `Product_Environmental_Data` with DataType='LCA'

- [ ] **Product Page LCA Display**
  - [ ] Show full lifecycle stages: A1-A5 (production), B1-B7 (use), C1-C4 (end-of-life)
  - [ ] Chart: Stacked bar showing carbon by stage
  - [ ] Comparison: Product A vs Product B lifecycle impact

### Autodesk Forge Partnership (Year 1-2)

- [ ] **Partnership Outreach**
  - [ ] Email `forge.help@autodesk.com` with partnership proposal
  - [ ] Pitch: "BIM integration for sustainable material sourcing"
  - [ ] Request: Forge API access, co-marketing opportunity

- [ ] **BIM Integration (If Approved)**
  - [ ] Create `forgeService.js`
  - [ ] Sync material specs from Revit/AutoCAD projects
  - [ ] Match BIM specs to GreenChainz products
  - [ ] Display: "15 materials from your Revit project available on GreenChainz"

### SimaPro / Ecochain (Year 2 - Established Revenue)

- [ ] **Enterprise LCA Database**
  - [ ] Email `info@ecochain.com` for pricing ($1,200/mo expected)
  - [ ] Subscribe when revenue > $50k/month
  - [ ] 10,000+ datasets (most comprehensive)
  - [ ] Use for enterprise clients demanding full lifecycle data

---

## 📊 Banking KPIs - Tracking Checklist

### Data Accuracy (Target: 98%+)
- [ ] Set up monthly KPI report
  ```sql
  SELECT ROUND(
    COUNT(*) FILTER (WHERE VerificationSource != 'Manual') * 100.0 / COUNT(*), 2
  ) AS data_accuracy_pct
  FROM Certification_Verification_Status;
  ```
- [ ] Display in Admin Console Financials tab
- [ ] Track in investor update emails

### API Uptime (Target: 99.5%+)
- [ ] Log all API calls to `Data_Provider_Sync_Log`
- [ ] Calculate monthly uptime percentage
  ```sql
  SELECT ROUND(
    COUNT(*) FILTER (WHERE Status = 'Success') * 100.0 / COUNT(*), 2
  ) AS api_uptime_pct
  FROM Data_Provider_Sync_Log
  WHERE CreatedAt >= NOW() - INTERVAL '30 days';
  ```
- [ ] Alert if < 99% uptime

### Data Freshness (Target: 95%+ within 30 days)
- [ ] Track last verified timestamp for all certifications
  ```sql
  SELECT ROUND(
    COUNT(*) FILTER (WHERE LastVerifiedAt > NOW() - INTERVAL '30 days') * 100.0 / COUNT(*), 2
  ) AS freshness_pct
  FROM Certification_Verification_Status;
  ```
- [ ] Re-verify stale data weekly

### Coverage (Target: 80%+ products have env data)
- [ ] Calculate % of products with carbon/EPD/LCA data
  ```sql
  SELECT ROUND(
    COUNT(DISTINCT p.ProductID) * 100.0 / (SELECT COUNT(*) FROM Products), 2
  ) AS coverage_pct
  FROM Products p
  JOIN Product_Environmental_Data ped ON p.ProductID = ped.ProductID;
  ```
- [ ] Display on Admin Console: "567 / 712 products (79.6%) have environmental data"

### Cost Efficiency (Target: $0/month Months 1-5)
- [ ] Track total monthly cost
  ```sql
  SELECT SUM(MonthlyCost) AS total_monthly_cost
  FROM Data_Providers
  WHERE Status = 'Active';
  ```
- [ ] Display in Admin Console
- [ ] Budget alert if exceeds projection

---

## 🧪 Testing Checklist

### Unit Tests (TODO)
- [ ] `ec3Service.test.js`
  - [ ] Test `searchMaterials()` returns array
  - [ ] Test `getCarbonData()` with valid EC3 ID
  - [ ] Test error handling for invalid ID

- [ ] `fscService.test.js`
  - [ ] Test `verifyCertificate()` with valid FSC number
  - [ ] Test `verifyCertificate()` with invalid number
  - [ ] Test `bulkVerify()` rate limiting

- [ ] `bcorpService.test.js`
  - [ ] Test `lookupCompany()` fuzzy matching
  - [ ] Test `getImpactBadge()` score tiers
  - [ ] Test CSV import with sample data

### Integration Tests (TODO)
- [ ] Test EC3 API search endpoint
- [ ] Test FSC verification endpoint with auth
- [ ] Test B Corp supplier list endpoint
- [ ] Test provider stats endpoint (Admin)

### E2E Tests (TODO)
- [ ] Architect searches for "insulation" → sees carbon data
- [ ] Supplier uploads FSC cert → auto-verification → green badge
- [ ] Admin views expiring certs → downloads CSV report

---

## 📧 Email Templates - Tracking

### B Corp CSV Request
- [ ] Sent to: data@bcorporation.net
- [ ] Date sent: __________
- [ ] Response received: __________
- [ ] CSV saved to: `backend/data/bcorp-directory.csv`
- [ ] Imported to database: __________

### FSC Bulk Data Request (Optional)
- [ ] Sent to: info@us.fsc.org
- [ ] Date sent: __________
- [ ] Response received: __________
- [ ] Access granted: __________

### EPD International
- [ ] Sent to: info@environdec.com
- [ ] Date sent: __________
- [ ] Response received: __________
- [ ] CSV imported: __________

### LEED/USGBC
- [ ] Sent to: leedinfo@usgbc.org
- [ ] Date sent: __________
- [ ] Response received: __________
- [ ] Database access granted: __________

### Cradle to Cradle
- [ ] Sent to: info@c2ccertified.org
- [ ] Date sent: __________
- [ ] Response received: __________
- [ ] Data export received: __________

### Green Seal
- [ ] Sent to: greenseal@greenseal.org
- [ ] Date sent: __________
- [ ] Response received: __________
- [ ] Product list downloaded: __________

### WAP Sustainability (Month 6+)
- [ ] Sent to: info@wapsustainability.com
- [ ] Date sent: __________
- [ ] Pricing received: __________
- [ ] Subscription activated: __________
- [ ] API key received: __________

### Autodesk Forge
- [ ] Sent to: forge.help@autodesk.com
- [ ] Date sent: __________
- [ ] Partnership meeting scheduled: __________
- [ ] API access granted: __________

---

## 🎯 Success Metrics - Month 1-3

### Week 1
- [ ] All dependencies installed (`cheerio`, `csv-parser`)
- [ ] Database seeded with 10 providers
- [ ] Backend server running without errors
- [ ] EC3 search endpoint tested successfully
- [ ] B Corp CSV request sent

### Week 2
- [ ] B Corp CSV received and imported
- [ ] First FSC certificate verified via API
- [ ] First product carbon data fetched from EC3
- [ ] Admin Console shows provider stats

### Week 3
- [ ] Frontend certification badges component built
- [ ] Material search displays verified badges
- [ ] "Verified Only" filter working
- [ ] 10+ products have verified carbon data

### Week 4
- [ ] Expiring certs cron job scheduled
- [ ] Weekly re-verification cron job running
- [ ] EPD International CSV request sent
- [ ] LEED data access request sent

### Month 2
- [ ] 50+ products have environmental data (carbon/EPD/LCA)
- [ ] 20+ suppliers have verified certifications (FSC/B Corp)
- [ ] Data accuracy KPI > 95%
- [ ] API uptime > 99%

### Month 3
- [ ] 100+ products with environmental data
- [ ] 40+ suppliers verified
- [ ] Carbon comparison tool live
- [ ] Data accuracy KPI > 98% (target achieved)

---

## 🔍 Troubleshooting Reference

### Issue: EC3 API returns empty results
- **Symptom**: `{"count": 0, "materials": []}`
- **Cause**: Search query too specific or material not in database
- **Solution**: Use broader terms ("insulation" vs "Warmcel 100 Recycled Cellulose")

### Issue: FSC verification fails with "parsing error"
- **Symptom**: `Error: FSC parsing error: Cannot read property 'text' of undefined`
- **Cause**: FSC website HTML structure changed (web scraping fragility)
- **Solution**: 
  1. Inspect current FSC website HTML
  2. Update cheerio selectors in `fscService.js`
  3. Long-term: Request official API access from FSC

### Issue: B Corp CSV import fails
- **Symptom**: `Error: CSV parse error: Invalid column headers`
- **Cause**: CSV column names don't match expected format
- **Solution**: Update `bcorpService.js` column mapping to handle variations

### Issue: Database query timeout
- **Symptom**: `Error: Query timeout after 30000ms`
- **Cause**: Large table scan without indexes
- **Solution**: 
  ```sql
  -- Check missing indexes
  SELECT indexname FROM pg_indexes WHERE tablename = 'product_environmental_data';
  
  -- Analyze query plan
  EXPLAIN ANALYZE SELECT * FROM Product_Environmental_Data WHERE ProductID = 123;
  ```

### Issue: JWT authentication fails
- **Symptom**: `401 Unauthorized` on protected endpoints
- **Cause**: Token expired or invalid
- **Solution**: Re-login to get fresh token (`POST /auth/login`)

---

## 📦 Deliverables Summary

### Code Files (7 new)
1. `backend/services/ec3Service.js` (180 lines)
2. `backend/services/fscService.js` (170 lines)
3. `backend/services/bcorpService.js` (140 lines)
4. `backend/services/README.md` (400 lines)
5. `database-schemas/seed-data-providers.sql` (150 lines)

### Documentation Files (4 new)
1. `SETUP-DATA-PROVIDERS.md` (450 lines)
2. `DATA-PROVIDER-IMPLEMENTATION-SUMMARY.md` (200 lines)
3. `ARCHITECTURE-DIAGRAMS.md` (500 lines)
4. `DATA-PROVIDER-IMPLEMENTATION-CHECKLIST.md` (this file)

### Modified Files (3)
1. `database-schemas/schema.sql` (+200 lines - 8 new tables)
2. `backend/index.js` (+250 lines - 11 new API routes)
3. `backend/package.json` (+2 dependencies)

### Total Lines of Code
- **Backend Services**: 490 lines
- **API Routes**: 250 lines
- **Database Schema**: 200 lines
- **Documentation**: 1,550 lines
- **Total**: **2,490 lines**

---

## 🎉 Celebration Milestones

- [ ] ✅ Phase 1 Complete: EC3, FSC, B Corp integrated (3 of 10 providers)
- [ ] 🎯 First Real Verification: FSC certificate verified via API
- [ ] 📊 Banking KPI Achieved: 98%+ data accuracy
- [ ] 💰 Cost Efficiency Win: $0/month for first 5 months (7 free providers)
- [ ] 🚀 Phase 2 Complete: EPD, LEED, C2C, Green Seal integrated (7 of 10)
- [ ] 💵 Month 6 Milestone: Break-even + WAP Sustainability subscription
- [ ] 🏆 Year 1 Goal: 80%+ products with environmental data

---

**Checklist Version**: 1.0  
**Created**: 2025-01-15  
**Status**: Phase 1 Complete ✅ (EC3, FSC, B Corp)  
**Next Milestone**: Email B Lab + FSC for data access → Phase 2 integration
