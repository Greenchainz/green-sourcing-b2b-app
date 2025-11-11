# Data Provider Integration - Architecture Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         GREENCHAINZ FRONTEND (React)                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐          │
│  │ Architect        │  │ Supplier         │  │ Admin            │          │
│  │ Dashboard        │  │ Onboarding       │  │ Console          │          │
│  │                  │  │                  │  │                  │          │
│  │ • Material Search│  │ • FSC Upload     │  │ • Provider Stats │          │
│  │ • Carbon Filter  │  │ • B Corp Verify  │  │ • Expiring Certs │          │
│  │ • Verified Badges│  │ • Auto-Verify    │  │ • Data Accuracy  │          │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘          │
│           │                     │                      │                     │
└───────────┼─────────────────────┼──────────────────────┼─────────────────────┘
            │                     │                      │
            │                     │                      │
            ▼                     ▼                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      GREENCHAINZ BACKEND (Node.js/Express)                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                          API ROUTES (index.js)                        │  │
│  ├──────────────────────────────────────────────────────────────────────┤  │
│  │                                                                       │  │
│  │  PUBLIC ENDPOINTS                                                    │  │
│  │  • GET  /api/carbon/search?q=insulation                              │  │
│  │  • GET  /api/carbon/:productId                                       │  │
│  │  • GET  /api/suppliers/bcorp                                         │  │
│  │  • GET  /api/data-providers                                          │  │
│  │                                                                       │  │
│  │  PROTECTED ENDPOINTS (JWT Required)                                  │  │
│  │  • POST /api/carbon/verify                                           │  │
│  │  • POST /api/verify/fsc                                              │  │
│  │  • POST /api/verify/bcorp                                            │  │
│  │                                                                       │  │
│  │  ADMIN ENDPOINTS (Admin Role Required)                               │  │
│  │  • GET  /api/verify/fsc/expiring                                     │  │
│  │  • POST /api/data-providers/import-bcorp                             │  │
│  │  • GET  /api/data-providers/stats                                    │  │
│  │                                                                       │  │
│  └───────┬──────────────────────┬──────────────────────┬─────────────────┘  │
│          │                      │                      │                     │
│          ▼                      ▼                      ▼                     │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐              │
│  │ ec3Service   │      │ fscService   │      │ bcorpService │              │
│  │              │      │              │      │              │              │
│  │ • search     │      │ • verifyCert │      │ • importCSV  │              │
│  │ • getCO2     │      │ • bulkVerify │      │ • lookup     │              │
│  │ • compare    │      │ • checkExpiry│      │ • getBadge   │              │
│  │ • save       │      │ • save       │      │ • save       │              │
│  └──────┬───────┘      └──────┬───────┘      └──────┬───────┘              │
│         │                     │                     │                        │
└─────────┼─────────────────────┼─────────────────────┼────────────────────────┘
          │                     │                     │
          │                     │                     │
          ▼                     ▼                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        EXTERNAL DATA PROVIDERS (APIs)                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐          │
│  │ Building         │  │ Forest           │  │ B Lab            │          │
│  │ Transparency     │  │ Stewardship      │  │ (B Corporation)  │          │
│  │ (EC3)            │  │ Council (FSC)    │  │                  │          │
│  │                  │  │                  │  │                  │          │
│  │ FREE API         │  │ FREE (Scrape)    │  │ FREE (CSV)       │          │
│  │ 15k+ materials   │  │ Cert directory   │  │ 6,500+ companies │          │
│  │ Carbon footprint │  │ Real-time verify │  │ Impact scores    │          │
│  └──────┬───────────┘  └──────┬───────────┘  └──────┬───────────┘          │
│         │                     │                     │                        │
│         │ Returns:            │ Returns:            │ Returns:               │
│         │ {gwp_kgco2e,        │ {verified,          │ {overall_score,        │
│         │  functional_unit,   │  status,            │  impact_areas,         │
│         │  epd_url}           │  expiry_date}       │  cert_date}            │
│         │                     │                     │                        │
└─────────┼─────────────────────┼─────────────────────┼────────────────────────┘
          │                     │                     │
          │                     │                     │
          ▼                     ▼                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       POSTGRESQL DATABASE (Event Sourcing)                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────── DATA PROVIDER TABLES ────────────────────────┐│
│  │                                                                          ││
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         ││
│  │  │ Data_Providers  │  │ Product_Env     │  │ Supplier_BCorp  │         ││
│  │  │                 │  │ _Data           │  │ _Data           │         ││
│  │  │ 10 providers    │  │                 │  │                 │         ││
│  │  │ P0/P1/P2/P3     │  │ Carbon, EPD,    │  │ Score 0-200     │         ││
│  │  │ FREE/PAID       │  │ LCA, Toxicity   │  │ 5 impact areas  │         ││
│  │  │ API call counts │  │ JSONB storage   │  │ Badges          │         ││
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘         ││
│  │                                                                          ││
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         ││
│  │  │ FSC_Certs       │  │ C2C_Certs       │  │ LEED_Credits    │         ││
│  │  │                 │  │                 │  │                 │         ││
│  │  │ Cert number     │  │ 5 levels        │  │ Credit          │         ││
│  │  │ Status          │  │ Material health │  │ eligibility     │         ││
│  │  │ Expiry tracking │  │ Circularity     │  │ Contribution    │         ││
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘         ││
│  │                                                                          ││
│  │  ┌─────────────────┐  ┌─────────────────────────────────────┐           ││
│  │  │ Product_EPDs    │  │ Data_Provider_Sync_Log              │           ││
│  │  │                 │  │                                     │           ││
│  │  │ 6 impact metrics│  │ RecordsProcessed, RecordsFailed     │           ││
│  │  │ GWP, Acidif,    │  │ ErrorLog (JSONB)                    │           ││
│  │  │ Eutrophication  │  │ Success/Failed status               │           ││
│  │  └─────────────────┘  └─────────────────────────────────────┘           ││
│  │                                                                          ││
│  └──────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ┌──────────────────── EVENT SOURCING (AUDIT TRAIL) ──────────────────────┐ │
│  │                                                                         │ │
│  │  ┌────────────────────┐  ┌────────────────────┐  ┌────────────────┐   │ │
│  │  │ Certification_     │  │ API_Verification   │  │ Cert_Verify    │   │ │
│  │  │ Events             │  │ _Log               │  │ _Status        │   │ │
│  │  │                    │  │                    │  │ (Materialized) │   │ │
│  │  │ Immutable log      │  │ Every API call     │  │                │   │ │
│  │  │ API_VERIFIED       │  │ EventHash          │  │ Fast queries   │   │ │
│  │  │ VERIFICATION_FAILED│  │ Blockchain-ready   │  │ Data Accuracy  │   │ │
│  │  │ EXPIRED, RENEWED   │  │ Request/Response   │  │ KPI            │   │ │
│  │  └────────────────────┘  └────────────────────┘  └────────────────┘   │ │
│  │                                                                         │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagrams

### Flow 1: Product Carbon Footprint Verification (EC3)

```
┌──────────┐                                                    ┌──────────┐
│ Architect│                                                    │ Building │
│          │                                                    │ Transp.  │
│ Dashboard│                                                    │ (EC3 API)│
└────┬─────┘                                                    └────┬─────┘
     │                                                               │
     │ 1. Search "cellulose insulation"                             │
     ├──────────────────────────────►                               │
     │  GET /api/carbon/search?q=cellulose                          │
     │                                                               │
     │                                   2. Forward search to EC3    │
     │                                   ──────────────────────────► │
     │                                                               │
     │                                   3. Return 20 materials      │
     │                                   ◄────────────────────────── │
     │                                      (gwp_kgco2e, epd_url)    │
     │                                                               │
     │ 4. Display results with carbon data                          │
     ◄───────────────────────────────                               │
     │ • Warmcel: 1.2 kgCO2e/kg ✅                                  │
     │ • Competitor: 4.5 kgCO2e/kg                                  │
     │                                                               │
     │ 5. Admin: "Verify for Product #456"                          │
     ├──────────────────────────────►                               │
     │  POST /api/carbon/verify                                     │
     │  {productId: 456, ec3_id: "abc123"}                          │
     │                                                               │
     │                                   6. Fetch detailed data      │
     │                                   ──────────────────────────► │
     │                                                               │
     │                                   7. Full carbon footprint    │
     │                                   ◄────────────────────────── │
     │                                      (A1-A3, C3-C4, EPD)      │
     │                                                               │
     │                         ┌─────────────────────┐               │
     │                         │ PostgreSQL          │               │
     │                         │                     │               │
     │                         │ Product_Env_Data    │               │
     │                         │ + Certification_    │               │
     │                         │   Events            │               │
     │                         │ + API_Verify_Log    │               │
     │                         └─────────────────────┘               │
     │                                   │                            │
     │                           8. Save to database                  │
     │                           ──────►│                            │
     │                                   │                            │
     │                           9. Log event:                        │
     │                              API_VERIFIED                      │
     │                           ──────►│                            │
     │                                                                │
     │ 10. Display on product page                                   │
     ◄───────────────────────────────                                │
     │ ✅ Verified Low Carbon: 1.2 kgCO2e/kg                         │
     │ (73% lower than average)                                      │
     │ Data: Building Transparency EC3                               │
     │ Verified: 2025-01-15                                          │
     └                                                                │
```

---

### Flow 2: FSC Certificate Verification (Supplier Onboarding)

```
┌──────────┐                                                    ┌──────────┐
│ Supplier │                                                    │   FSC    │
│Onboarding│                                                    │ Public   │
│   Form   │                                                    │ Directory│
└────┬─────┘                                                    └────┬─────┘
     │                                                               │
     │ 1. Upload FSC cert + enter number                            │
     ├──────────────────────────────►                               │
     │  POST /api/verify/fsc                                        │
     │  {supplierId: 123, certNum: "FSC-C112233"}                   │
     │                                                               │
     │                                   2. Scrape FSC website       │
     │                                   ──────────────────────────► │
     │                                      (POST form submission)   │
     │                                                               │
     │                                   3. Parse HTML response      │
     │                                   ◄────────────────────────── │
     │                                      (cheerio extraction)     │
     │                                                               │
     │                         ┌─────────────────────┐               │
     │                         │ PostgreSQL          │               │
     │                         │                     │               │
     │                         │ FSC_Certifications  │               │
     │                         │ + Certification_    │               │
     │                         │   Events            │               │
     │                         │ + API_Verify_Log    │               │
     │                         └─────────────────────┘               │
     │                                   │                            │
     │                           4. Save verification                 │
     │                           ──────►│                            │
     │                           {verified: true,                     │
     │                            status: "Valid",                    │
     │                            expiry: "2026-05-15"}               │
     │                                                                │
     │                           5. Log event:                        │
     │                              API_VERIFIED                      │
     │                           ──────►│                            │
     │                                                                │
     │ 6. Update supplier profile                                    │
     ◄───────────────────────────────                                │
     │ ✅ FSC Certified (Valid until 2026-05-15)                     │
     │ Certificate: FSC-C112233 (Chain of Custody)                   │
     │                                                                │
     │                                                                │
     │                         ┌─────────────────────┐               │
     │                         │ CRON JOB            │               │
     │                         │ (Daily 9 AM)        │               │
     │                         │                     │               │
     │                         │ checkExpiringCerts()│               │
     │                         └──────┬──────────────┘               │
     │                                │                               │
     │                         7. Query FSC_Certs                     │
     │                            WHERE ExpiryDate                    │
     │                            < NOW() + 30 days                   │
     │                         ──────►│                               │
     │                                                                │
     │                         8. Send email alert                    │
     │                         ──────────────────────────────────┐    │
     │                         "Your FSC cert expires in 27 days"│    │
     │                         "Please renew to maintain status" │    │
     │                         ◄──────────────────────────────────┘    │
     └                                                                │
```

---

### Flow 3: B Corp Verification (Directory Lookup)

```
┌──────────┐                                                    ┌──────────┐
│ Supplier │                                                    │  B Lab   │
│ Profile  │                                                    │ (CSV Dir)│
│   Page   │                                                    └────┬─────┘
└────┬─────┘                                                         │
     │                                                                │
     │                         ┌─────────────────────┐                │
     │                         │ ADMIN ACTION        │                │
     │                         │ (One-time)          │                │
     │                         │                     │                │
     │                         │ 1. Email B Lab:     │                │
     │                         │ Request CSV export  │                │
     │                         └──────┬──────────────┘                │
     │                                │                                │
     │                                │ 2. Receive CSV                 │
     │                                │    (6,500 companies)           │
     │                                ◄─────────────────────────────── │
     │                                                                 │
     │                                │ 3. Import CSV                  │
     │                                ├──────────────────────────────► │
     │                                │  POST /import-bcorp            │
     │                                │  {csvFilePath: "./data/..."}   │
     │                                                                 │
     │                                │ 4. Parse 6,500 companies       │
     │                                │    (csv-parser)                │
     │                                                                 │
     │                         ┌─────────────────────┐                 │
     │                         │ In-Memory Cache     │                 │
     │                         │ bcorpDirectory[]    │                 │
     │                         │ (6,500 companies)   │                 │
     │                         └─────────────────────┘                 │
     │                                                                 │
     │ 5. Architect searches "B Corp suppliers"                       │
     ├──────────────────────────────►                                 │
     │  GET /api/suppliers/bcorp                                      │
     │                                                                 │
     │                                   6. Lookup in cache            │
     │                                   lookupCompany("Interface Inc")│
     │                                   (fuzzy matching)              │
     │                                                                 │
     │                         ┌─────────────────────┐                 │
     │                         │ PostgreSQL          │                 │
     │                         │                     │                 │
     │                         │ Supplier_BCorp_Data │                 │
     │                         └─────────────────────┘                 │
     │                                   │                             │
     │                           7. Save match                         │
     │                           ──────►│                             │
     │                           {score: 102.5,                        │
     │                            impact_areas: {...}}                 │
     │                                                                 │
     │ 8. Display on supplier profile                                 │
     ◄───────────────────────────────                                 │
     │ ✅ B Corp Certified - Gold (Score: 102.5)                      │
     │ Environment: 38.2 | Workers: 21.3 | Community: 18.5            │
     │ Certified since: 2019-06-01                                    │
     │                                                                 │
     │                                                                 │
     │                         ┌─────────────────────┐                 │
     │                         │ FRONTEND FILTER     │                 │
     │                         │                     │                 │
     │                         │ ☑ B Corp Certified  │                 │
     │                         │ ☐ Score > 100       │                 │
     │                         │ ☐ Platinum badge    │                 │
     │                         └─────────────────────┘                 │
     │                                                                 │
     │ 9. Filter results                                               │
     ├──────────────────────────────►                                 │
     │  WHERE BCorpCertified = TRUE                                   │
     │  AND BCorpScore > 100                                          │
     │                                                                 │
     │ 10. Sorted results (highest score first)                       │
     ◄───────────────────────────────                                 │
     │ 1. Patagonia (151 - Platinum)                                  │
     │ 2. Interface (102.5 - Gold)                                    │
     │ 3. King Arthur Baking (95.3 - Silver)                          │
     └                                                                 │
```

---

## Database Schema Visual

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATA PROVIDER TABLES                               │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐
│ Data_Providers       │────────────────────────────┐
├──────────────────────┤                            │
│ ProviderID PK        │                            │
│ ProviderName         │                            │ FK Reference
│ ProviderType         │                            │
│ AccessType           │◄───────────────────────────┼───────────────┐
│ Priority (P0-P3)     │                            │               │
│ APIEndpoint          │                            │               │
│ MonthlyAPICalls      │                            │               │
│ MonthlyCost          │                            │               │
│ Status               │                            │               │
└──────────────────────┘                            │               │
                                                    │               │
                                                    │               │
┌──────────────────────┐       ┌──────────────────────┐       ┌──────────────────────┐
│ Product_Env_Data     │       │ Supplier_BCorp_Data  │       │ FSC_Certifications   │
├──────────────────────┤       ├──────────────────────┤       ├──────────────────────┤
│ EnvDataID PK         │       │ BCorpID PK           │       │ FSCCertID PK         │
│ ProductID FK         │       │ SupplierID FK UNIQUE │       │ SupplierID FK        │
│ ProviderID FK        │◄──────│ BCorpCertified       │       │ CertificateNumber UK │
│ DataType             │       │ BCorpScore (0-200)   │       │ CertificateType      │
│ DataValue JSONB      │       │ ImpactAreas JSONB    │       │ CertificateStatus    │
│ VerificationStatus   │       │ CertificationDate    │       │ IssueDate            │
│ VerifiedAt           │       │ ProviderID FK        │◄──────│ ExpiryDate           │
│ ExpiryDate           │       │ LastVerifiedAt       │       │ ProviderID FK        │
│ RawAPIResponse JSONB │       │ RawAPIResponse JSONB │       │ LastVerifiedAt       │
└──────────────────────┘       └──────────────────────┘       │ RawAPIResponse JSONB │
                                                               └──────────────────────┘
         │                              │                              │
         │                              │                              │
         ▼                              ▼                              ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         EVENT SOURCING (AUDIT TRAIL)                         │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐       ┌──────────────────────┐       ┌──────────────────────┐
│ Certification_Events │       │ API_Verification_Log │       │ Cert_Verification    │
├──────────────────────┤       ├──────────────────────┤       │ _Status (Materialized)│
│ EventID PK           │       │ VerificationID PK    │       ├──────────────────────┤
│ EntityType           │       │ EntityType           │       │ EntityType           │
│ EntityID             │       │ EntityID             │       │ EntityID             │
│ EventType            │       │ APIProvider          │       │ LastEventType        │
│ • API_VERIFIED       │       │ RequestPayload JSONB │       │ LastVerifiedAt       │
│ • VERIFICATION_FAILED│       │ ResponsePayload JSONB│       │ VerificationSource   │
│ • RENEWED            │       │ VerificationStatus   │       │ CurrentStatus        │
│ • EXPIRED            │       │ EventHash SHA256     │       └──────────────────────┘
│ • REVOKED            │       │ PreviousEventHash    │              │
│ EventDetails JSONB   │       │ BlockchainSynced     │              │ Created by:
│ EventHash SHA256     │       │ BlockchainTxID       │              │ REFRESH MATERIALIZED VIEW
│ PreviousEventHash    │       │ CreatedAt            │              │
│ CreatedAt            │       └──────────────────────┘              │
└──────────────────────┘                                             │
         │                                                           │
         └───────────────────────────────────────────────────────────┘
                                                                     │
                                                                     ▼
                                                          ┌──────────────────────┐
                                                          │ BANKING KPI QUERY    │
                                                          ├──────────────────────┤
                                                          │ Data Accuracy:       │
                                                          │ 98.2% API-Verified   │
                                                          │                      │
                                                          │ SELECT ROUND(        │
                                                          │   COUNT(*) FILTER    │
                                                          │   (WHERE Source !=   │
                                                          │    'Manual') * 100.0 │
                                                          │   / COUNT(*), 2      │
                                                          │ ) FROM Cert_Verify   │
                                                          │ _Status              │
                                                          └──────────────────────┘
```

---

## API Request/Response Examples

### Example 1: Search EC3 Materials

**Request**:
```bash
GET /api/carbon/search?q=cellulose%20insulation&limit=5
```

**Response** (200 OK):
```json
{
  "count": 5,
  "materials": [
    {
      "ec3_id": "abc123-uuid",
      "name": "Warmcel Cellulose Insulation",
      "category": "Thermal Insulation",
      "gwp_kgco2e": 1.2,
      "functional_unit": "kg",
      "manufacturer": "Warmcel",
      "epd_url": "https://www.environdec.com/Detail/?EPD=12345",
      "data_quality": "High"
    },
    {
      "ec3_id": "def456-uuid",
      "name": "Greenfiber Cellulose Insulation",
      "category": "Thermal Insulation",
      "gwp_kgco2e": 1.35,
      "functional_unit": "kg",
      "manufacturer": "Greenfiber",
      "epd_url": "https://www.environdec.com/Detail/?EPD=67890",
      "data_quality": "High"
    }
  ]
}
```

---

### Example 2: Verify FSC Certificate

**Request**:
```bash
POST /api/verify/fsc
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "supplierId": 123,
  "certificateNumber": "FSC-C112233"
}
```

**Response** (200 OK - Valid):
```json
{
  "success": true,
  "fsc_cert_id": 45,
  "verification": {
    "verified": true,
    "certificate_number": "FSC-C112233",
    "certificate_type": "FSC Chain of Custody",
    "holder_name": "Sustainable Wood Products Inc",
    "issue_date": "2023-06-15",
    "expiry_date": "2026-06-15",
    "status": "Valid"
  },
  "message": "FSC certificate verified"
}
```

**Response** (200 OK - Invalid):
```json
{
  "success": false,
  "fsc_cert_id": 46,
  "verification": {
    "verified": false,
    "certificate_number": "FSC-C999999",
    "status": "Not Found",
    "message": "Certificate FSC-C999999 not found in FSC directory"
  },
  "message": "FSC certificate not valid"
}
```

---

### Example 3: Get B Corp Suppliers

**Request**:
```bash
GET /api/suppliers/bcorp
```

**Response** (200 OK):
```json
{
  "count": 3,
  "suppliers": [
    {
      "supplierid": 78,
      "companyname": "Patagonia Inc",
      "industry": "Apparel",
      "bcorpscore": 151,
      "certificationdate": "2012-01-15",
      "impactareas": {
        "governance": 18.5,
        "workers": 32.1,
        "community": 24.3,
        "environment": 52.6,
        "customers": 23.5
      },
      "lastverifiedat": "2025-01-15T10:30:00Z"
    },
    {
      "supplierid": 92,
      "companyname": "Interface Inc",
      "industry": "Flooring",
      "bcorpscore": 102.5,
      "certificationdate": "2019-06-01",
      "impactareas": {
        "governance": 15.2,
        "workers": 21.3,
        "community": 18.5,
        "environment": 38.2,
        "customers": 9.3
      },
      "lastverifiedat": "2025-01-14T14:20:00Z"
    }
  ]
}
```

---

## Technology Stack

```
┌─────────────────────────────────────────────────────────────────┐
│                         TECHNOLOGY LAYERS                        │
└─────────────────────────────────────────────────────────────────┘

Frontend
├── React 19.1.1
├── Vite 7.1.12
├── Tailwind CSS v4
├── TypeScript
└── Google Tag Manager (GTM-MVBZVSTV)

Backend API
├── Node.js 18-alpine
├── Express 4.18.2
├── JWT Authentication (jsonwebtoken 9.0.2)
├── bcrypt 6.0.0 (password hashing)
└── cors 2.8.5

Data Provider Integration
├── cheerio 1.0.0 (FSC web scraping)
├── csv-parser 3.0.0 (B Corp CSV import)
└── https (native - EC3 API calls)

Database
├── PostgreSQL 15
├── pg 8.11.3 (Node.js driver)
├── Event Sourcing (immutable log)
├── JSONB (flexible storage)
└── Materialized Views (fast queries)

External APIs
├── Building Transparency EC3 (FREE)
├── FSC Public Directory (FREE - scrape)
└── B Lab Directory (FREE - CSV)

Infrastructure
├── Docker Compose 3.8
├── .env (environment config)
└── GitHub (version control)
```

---

## Security & Compliance

### Authentication Flow
```
User Login
    │
    ├─► POST /auth/login {email, password}
    │
    ├─► Backend: bcrypt.compare(password, hashedPassword)
    │
    ├─► Generate JWT: jwt.sign({userId, role}, JWT_SECRET)
    │
    └─► Return: {token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."}

Protected Endpoint
    │
    ├─► GET /api/verify/fsc/expiring
    │   Header: Authorization: Bearer <token>
    │
    ├─► Middleware: authenticateToken(req, res, next)
    │   jwt.verify(token, JWT_SECRET)
    │
    ├─► Middleware: authorizeRoles(['Admin'])
    │   Check user.role === 'Admin'
    │
    └─► Execute: fscService.checkExpiringCertificates(pool)
```

### Data Privacy (GDPR Compliance)
- **Personal Data**: ContactEmail, ContactPhone stored in Suppliers table
- **Encryption**: Passwords hashed with bcrypt (10 rounds)
- **Audit Trail**: All API calls logged with timestamps (GDPR Article 30)
- **Right to Erasure**: CASCADE DELETE on Suppliers removes all linked data
- **Data Minimization**: Only store necessary fields from external APIs

### API Security
- **Rate Limiting**: FSC scraping limited to 1 req/second (prevent blocking)
- **Input Validation**: Certificate numbers, product IDs validated before API calls
- **Error Handling**: Never expose internal error details to frontend
- **CORS**: Restricted to `http://localhost:5173` (frontend origin)

---

## Performance Optimizations

### Database Indexes (13 total)
```sql
-- Product lookups (O(log n) instead of O(n))
CREATE INDEX idx_product_env_data_product ON Product_Environmental_Data(ProductID);
CREATE INDEX idx_c2c_cert_product ON C2C_Certifications(ProductID);
CREATE INDEX idx_leed_credit_product ON LEED_Product_Credits(ProductID);
CREATE INDEX idx_product_epd_product ON Product_EPDs(ProductID);

-- Provider queries
CREATE INDEX idx_data_providers_type ON Data_Providers(ProviderType);
CREATE INDEX idx_data_providers_status ON Data_Providers(Status);
CREATE INDEX idx_product_env_data_provider ON Product_Environmental_Data(ProviderID);

-- FSC verification
CREATE INDEX idx_fsc_cert_supplier ON FSC_Certifications(SupplierID);
CREATE INDEX idx_fsc_cert_number ON FSC_Certifications(CertificateNumber);

-- B Corp lookups
CREATE INDEX idx_supplier_bcorp_supplier ON Supplier_BCorp_Data(SupplierID);

-- Monitoring
CREATE INDEX idx_sync_log_provider ON Data_Provider_Sync_Log(ProviderID, CreatedAt DESC);
```

### Materialized View (Fast KPI Queries)
```sql
-- Refresh nightly instead of real-time joins
REFRESH MATERIALIZED VIEW Certification_Verification_Status;

-- Query time: 5ms vs 2000ms for multi-table JOIN
SELECT COUNT(*) FILTER (WHERE VerificationSource != 'Manual') * 100.0 / COUNT(*)
FROM Certification_Verification_Status;
```

### Caching Strategy (Future)
```javascript
// Cache B Corp directory in memory (6,500 companies)
const bcorpCache = await bcorpService.importBCorpCSV('./data/bcorp-directory.csv');

// Cache EC3 searches (Redis)
const cacheKey = `ec3:search:${query}`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);

// Cache expiry: 24 hours
await redis.set(cacheKey, JSON.stringify(results), 'EX', 86400);
```

---

## Monitoring & Analytics

### Banking KPIs Dashboard

```sql
-- 1. Data Accuracy (Target: 98%+)
SELECT 
  ROUND(
    COUNT(*) FILTER (WHERE VerificationSource != 'Manual') * 100.0 / NULLIF(COUNT(*), 0), 
    2
  ) AS data_accuracy_pct
FROM Certification_Verification_Status;

-- 2. API Uptime (Target: 99.5%+)
SELECT 
  ROUND(
    COUNT(*) FILTER (WHERE Status = 'Success') * 100.0 / NULLIF(COUNT(*), 0), 
    2
  ) AS api_uptime_pct,
  COUNT(*) AS total_syncs,
  COUNT(*) FILTER (WHERE Status = 'Failed') AS failed_syncs
FROM Data_Provider_Sync_Log
WHERE CreatedAt >= NOW() - INTERVAL '30 days';

-- 3. Data Freshness (Target: 95%+ within 30 days)
SELECT 
  ROUND(
    COUNT(*) FILTER (WHERE LastVerifiedAt > NOW() - INTERVAL '30 days') * 100.0 / NULLIF(COUNT(*), 0), 
    2
  ) AS freshness_pct
FROM Certification_Verification_Status;

-- 4. Coverage (Target: 80%+ products have env data)
SELECT 
  ROUND(
    COUNT(DISTINCT p.ProductID) * 100.0 / (SELECT COUNT(*) FROM Products), 
    2
  ) AS coverage_pct
FROM Products p
JOIN Product_Environmental_Data ped ON p.ProductID = ped.ProductID;

-- 5. Cost Efficiency
SELECT 
  SUM(MonthlyCost) AS total_monthly_cost,
  COUNT(*) AS active_providers,
  COUNT(*) FILTER (WHERE AccessType = 'FREE') AS free_providers
FROM Data_Providers
WHERE Status = 'Active';
```

### Google Tag Manager Events
```javascript
// Track EC3 searches
dataLayer.push({
  event: 'ec3_search',
  search_query: query,
  results_count: materials.length,
  timestamp: new Date().toISOString()
});

// Track FSC verifications
dataLayer.push({
  event: 'fsc_verification',
  certificate_number: certNum,
  verification_result: result.verified ? 'success' : 'failed',
  supplier_id: supplierId
});

// Track B Corp lookups
dataLayer.push({
  event: 'bcorp_lookup',
  company_name: companyName,
  bcorp_found: match !== null,
  bcorp_score: match?.overall_score
});
```

---

**Diagram Version**: 1.0  
**Last Updated**: 2025-01-15  
**Status**: Phase 1 Complete (EC3, FSC, B Corp)
