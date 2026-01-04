# Backend Services

This directory contains the backend services for GreenChainz including data provider integrations and the billing/entitlements system.

## Entitlements Service (`entitlements/index.js`)

The entitlements service manages supplier pricing tiers (Free/Standard/Premium) and their associated capabilities. It provides a central interface for checking tier-based permissions across the platform.

### Tier Structure

| Tier | Monthly | RFQ Wave | RFQ Delay | RFQ Quota | Outbound Messaging |
|------|---------|----------|-----------|-----------|-------------------|
| **Free** | $0 | 3 | 30 min | 10/month | ❌ |
| **Standard** | $49 | 2 | 15 min | 50/month | ✅ 25/month |
| **Premium** | $199 | 1 | 0 min | Unlimited | ✅ Unlimited |

### Core Functions

```javascript
const entitlements = require('./services/entitlements');

// Check if supplier can send outbound messages
const canSend = await entitlements.canOutbound(supplierId);
// Returns: { allowed: true, remaining: 20 } or { allowed: false, reason: '...' }

// Get RFQ priority (wave placement)
const priority = await entitlements.getRfqPriority(supplierId);
// Returns: { waveNumber: 1, delayMinutes: 0, tierCode: 'premium' }

// Get all quotas
const quotas = await entitlements.getQuotas(supplierId);
// Returns: { rfq: { limit: 50, used: 12, remaining: 38 }, outbound: {...} }

// Get full entitlements
const ent = await entitlements.getEntitlements(supplierId);
// Returns all tier capabilities (messaging, badges, analytics, etc.)

// Check if supplier can receive more RFQs
const canReceive = await entitlements.canReceiveRfq(supplierId);
```

### Tier Management

```javascript
// Set supplier to a tier
await entitlements.setSupplierTier(supplierId, 'standard', {
  billingCycle: 'monthly',
  stripeCustomerId: 'cus_xxx',
  trialDays: 14
});

// Get all available tiers
const tiers = await entitlements.getAllTiers();

// Get specific tier info
const tier = await entitlements.getTierByCode('premium');
```

### Usage Tracking

```javascript
// Track RFQ received (for quota enforcement)
await entitlements.incrementRfqUsage(supplierId, rfqId);

// Track outbound message (for quota enforcement)
await entitlements.incrementOutboundUsage(supplierId, messageId);

// Reset monthly usage (run on cron)
await entitlements.resetMonthlyUsage();
```

### Database Tables

- `Supplier_Tiers` - Defines Free/Standard/Premium tiers
- `Tier_Entitlements` - Maps tiers to capabilities (wave, quota, features)
- `Supplier_Subscriptions` - Links suppliers to their tier + tracks usage
- `Supplier_Usage_Log` - Audit trail for billing/analytics

### Integration Points

The entitlements service is integrated with:
- **RFQ Distribution** (`rfq/waves.js`) - Wave placement based on tier
- **RFQ Distributor** (`rfq/distributor.js`) - Priority scoring includes tier
- **Messaging** (`intercom/messaging.js`) - Outbound permission checks

---

# Data Provider Integration Services

This directory also contains the backend services for integrating with 10 data providers for certification verification and environmental data. See [DATA-PROVIDERS.md](../../DATA-PROVIDERS.md) for the complete integration roadmap.

## Implemented Services

### 1. EC3 Service (`ec3Service.js`)
**Provider**: Building Transparency - Embodied Carbon in Construction Calculator (EC3)  
**Priority**: P0 (Critical)  
**Access**: FREE API  
**Database**: 15,000+ materials with embodied carbon data

#### Functions
- `searchMaterials(query, limit)` - Search EC3 database for materials
- `getCarbonData(ec3MaterialId)` - Get detailed carbon footprint for material
- `compareMaterials(ec3MaterialIds[])` - Compare carbon impact of multiple materials
- `saveCarbonData(pool, productId, carbonData, providerId)` - Save to `Product_Environmental_Data` table

#### API Endpoints
- `GET /api/carbon/search?q=insulation&limit=20` - Search materials
- `GET /api/carbon/:productId` - Get cached carbon data for product
- `POST /api/carbon/verify` - Fetch fresh data from EC3 and save

#### Example Usage
```javascript
// Search for insulation materials
const materials = await ec3Service.searchMaterials('cellulose insulation', 20);

// Get detailed carbon data
const carbonData = await ec3Service.getCarbonData('ec3-material-uuid-123');
// Returns: { gwp_total: 1.45, functional_unit: 'kg', manufacturer: 'Warmcel', ... }

// Save to database
const envDataId = await ec3Service.saveCarbonData(pool, productId, carbonData, providerId);
```

#### Data Stored
- Global Warming Potential (GWP) in kgCO2e
- Lifecycle stages (A1-A3, C3-C4)
- Functional unit (kg, m², m³)
- EPD link, manufacturer, plant location
- Verification status + expiry date

---

### 2. FSC Service (`fscService.js`)
**Provider**: Forest Stewardship Council  
**Priority**: P0 (Critical)  
**Access**: FREE public certificate directory  
**Database**: Real-time verification via web scraping

#### Functions
- `verifyCertificate(certificateNumber)` - Verify FSC cert against public directory
- `bulkVerify(certificateNumbers[])` - Batch verification with rate limiting
- `saveVerification(pool, supplierId, verificationResult, providerId)` - Save to `FSC_Certifications` table
- `checkExpiringCertificates(pool)` - Get certs expiring within 30 days

#### API Endpoints
- `POST /api/verify/fsc` - Verify FSC certificate
- `GET /api/verify/fsc/expiring` - List expiring certificates (Admin only)

#### Example Usage
```javascript
// Verify FSC certificate
const result = await fscService.verifyCertificate('FSC-C123456');
// Returns: { verified: true, status: 'Valid', expiry_date: '2025-12-31', ... }

// Bulk verification
const certs = ['FSC-C123456', 'FSC-C789012'];
const results = await fscService.bulkVerify(certs);

// Check expiring certs
const expiring = await fscService.checkExpiringCertificates(pool);
// Returns suppliers with certs expiring in next 30 days
```

#### Data Stored
- Certificate number, type (FSC 100%, Mix, Recycled, CoC)
- Status (Valid, Expired, Suspended, Revoked)
- Issue/expiry dates
- Certified area (hectares)
- Last verification timestamp

#### Notes
- Uses web scraping (cheerio) - FSC has no public API yet
- Rate limiting: 1 second delay between bulk requests
- Email `info@us.fsc.org` to request bulk data export
- **Group certification program**: 40% discount for suppliers (document in sales materials)

---

### 3. B Corp Service (`bcorpService.js`)
**Provider**: B Lab (B Corporation Certification)  
**Priority**: P1 (High Value)  
**Access**: FREE - Request CSV export from `data@bcorporation.net`  
**Database**: Import CSV directory, fuzzy matching for lookups

#### Functions
- `importBCorpCSV(csvFilePath)` - Parse B Corp CSV export
- `lookupCompany(bcorpDirectory, companyName)` - Fuzzy match company name
- `saveBCorpData(pool, supplierId, bcorpData, providerId)` - Save to `Supplier_BCorp_Data` table
- `getBCorpSuppliers(pool)` - Get all B Corp certified suppliers
- `getImpactBadge(score)` - Calculate badge color (bronze/silver/gold/platinum)

#### API Endpoints
- `POST /api/verify/bcorp` - Lookup company in B Corp directory
- `GET /api/suppliers/bcorp` - Get all B Corp suppliers
- `POST /api/data-providers/import-bcorp` - Import CSV (Admin only)

#### Example Usage
```javascript
// Import CSV (one-time setup)
const bcorpDirectory = await bcorpService.importBCorpCSV('./bcorp-directory.csv');

// Lookup company
const match = bcorpService.lookupCompany(bcorpDirectory, 'Patagonia Inc');
// Returns: { overall_score: 151, environment_score: 42.3, ... }

// Save to database
const bcorpId = await bcorpService.saveBCorpData(pool, supplierId, match, providerId);

// Get impact badge
const badge = bcorpService.getImpactBadge(151); // Returns: 'platinum'
```

#### Data Stored
- B Corp certification status (boolean)
- Overall score (0-200 scale)
- Impact area scores: Governance, Workers, Community, Environment, Customers
- Certification/recertification dates
- Company size, industry, country

#### Impact Badge Tiers
- **Platinum** (120+): Top tier, exceptional impact
- **Gold** (100-119): Outstanding social/environmental performance
- **Silver** (90-99): Strong commitment
- **Bronze** (80-89): Certified baseline
- **Certified** (80+): Meets B Corp standards

#### Notes
- CSV import required (no real-time API)
- Fuzzy matching handles "Inc", "LLC", "Ltd", "Corp" variations
- Email `data@bcorporation.net` with subject: "B Corp Directory Export for GreenChainz Integration"
- **Supplier differentiation**: Display B Corp score on profiles, filter/sort by impact

---

## Database Schema

All services write to these tables (see `database-schemas/schema.sql`):

### Core Tables
1. **Data_Providers** - Master registry of 10 providers
2. **Product_Environmental_Data** - Aggregated environmental data (carbon, EPD, LCA)
3. **Supplier_BCorp_Data** - B Corp certifications + impact scores
4. **FSC_Certifications** - FSC certificate details
5. **C2C_Certifications** - Cradle to Cradle levels
6. **LEED_Product_Credits** - LEED credit eligibility
7. **Product_EPDs** - EPD declarations
8. **Data_Provider_Sync_Log** - Sync history + error tracking

### Event Sourcing (Audit Trail)
- **Certification_Events** - Immutable log (API_VERIFIED, VERIFICATION_FAILED, RENEWED, EXPIRED, REVOKED)
- **API_Verification_Log** - All external API calls with EventHash (blockchain-ready)

---

## Installation

### Dependencies
```bash
cd backend
npm install cheerio csv-parser
```

### Environment Variables
Add to `.env`:
```bash
# EC3 API (optional - no auth required for public endpoints)
EC3_API_KEY=optional-future-auth-key

# B Corp CSV Path (after requesting from B Lab)
BCORP_CSV_PATH=./data/bcorp-directory.csv

# FSC Rate Limiting
FSC_RATE_LIMIT_MS=1000
```

### Seed Data Providers
```bash
# Start PostgreSQL
docker compose up -d

# Run seed script to insert 10 providers
psql postgres://user:password@localhost:5432/greenchainz_dev -f database-schemas/seed-data-providers.sql

# Verify providers
psql postgres://user:password@localhost:5432/greenchainz_dev -c "SELECT ProviderName, Priority, AccessType, MonthlyCost FROM Data_Providers ORDER BY Priority;"
```

---

## Usage Examples

### Example 1: Verify Product Carbon Footprint
```javascript
// Architect searching for low-carbon insulation
const materials = await ec3Service.searchMaterials('cellulose insulation', 10);

// Found Warmcel Cellulose Insulation (1.2 kgCO2e/kg)
// vs. competitor fiberglass (4.5 kgCO2e/kg)

// Save to product
await ec3Service.saveCarbonData(pool, productId, materials[0], ec3ProviderId);

// Display on product page:
// ✅ Verified Low Carbon: 1.2 kgCO2e/kg (73% lower than average)
```

### Example 2: Verify Supplier FSC Certification
```javascript
// Supplier claims FSC certification
const result = await fscService.verifyCertificate('FSC-C112233');

if (result.verified) {
  // Save to database
  await fscService.saveVerification(pool, supplierId, result, fscProviderId);
  
  // Display on supplier profile:
  // ✅ FSC Certified (Valid until 2026-05-15)
  // Certificate: FSC-C112233 (Chain of Custody)
} else {
  // Alert admin: False claim detected
  // Send email to supplier requesting valid certificate
}
```

### Example 3: Verify B Corp Status
```javascript
// Load B Corp directory (cache in memory)
const bcorpDirectory = await bcorpService.importBCorpCSV('./bcorp-directory.csv');

// Check supplier
const match = bcorpService.lookupCompany(bcorpDirectory, 'Interface Inc');

if (match) {
  await bcorpService.saveBCorpData(pool, supplierId, match, bcorpProviderId);
  
  // Display on supplier profile:
  // ✅ B Corp Certified (Score: 102.5 - Gold)
  // Environment: 38.2 | Workers: 21.3 | Community: 18.5
  // Certified since: 2019-06-01
}
```

---

## Testing

### Manual API Testing
```bash
# Start backend
cd backend
node index.js

# Test EC3 search
curl "http://localhost:3001/api/carbon/search?q=insulation&limit=5"

# Test FSC verification (requires auth token)
curl -X POST http://localhost:3001/api/verify/fsc \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"supplierId": 1, "certificateNumber": "FSC-C123456"}'

# Get B Corp suppliers
curl http://localhost:3001/api/suppliers/bcorp
```

### Integration Tests (TODO)
```javascript
// tests/integration/dataProviders.test.js
describe('EC3 Integration', () => {
  it('should search materials', async () => {
    const results = await ec3Service.searchMaterials('concrete', 5);
    expect(results).toHaveLength(5);
    expect(results[0]).toHaveProperty('gwp_kgco2e');
  });
});

describe('FSC Integration', () => {
  it('should verify valid certificate', async () => {
    const result = await fscService.verifyCertificate('FSC-C112233');
    expect(result.verified).toBe(true);
    expect(result.status).toBe('Valid');
  });
});
```

---

## Roadmap

### Phase 1: Core Integrations (Weeks 1-4) ✅ COMPLETE
- [x] EC3 embodied carbon API
- [x] FSC certificate verification
- [x] B Corp directory import
- [x] Database schema + seed data
- [x] Backend API routes
- [x] Event sourcing audit trail

### Phase 2: Enhanced Features (Weeks 5-8)
- [ ] EPD International bulk import
- [ ] LEED credit calculator integration
- [ ] Cradle to Cradle registry scraper
- [ ] Green Seal product list download
- [ ] Frontend certification badges
- [ ] Automated expiry monitoring + email alerts

### Phase 3: Paid Integrations (Month 6+)
- [ ] WAP Sustainability LCA API ($500/mo - post-break-even)
- [ ] Autodesk Forge BIM integration (partnership)
- [ ] SimaPro/Ecochain (Year 2 - $1,200/mo)

### Phase 4: Advanced Analytics (Year 2)
- [ ] Carbon comparison reports (product A vs B)
- [ ] Supply chain carbon mapping (Scope 1+2+3)
- [ ] LEED project compliance checker
- [ ] Material health scoring (C2C data)
- [ ] Portfolio-level sustainability dashboards

---

## Budget Summary

| Provider | Priority | Access | Year 1 Cost | Status |
|----------|----------|--------|-------------|--------|
| Building Transparency (EC3) | P0 | FREE | $0 | ✅ Implemented |
| EPD International | P0 | FREE | $0 | ✅ Implemented |
| FSC | P0 | FREE | $0 | ✅ Implemented |
| B Corp | P1 | FREE | $0 | ✅ Implemented |
| USGBC/LEED | P1 | FREE | $0 | 📋 TODO |
| Cradle to Cradle | P1 | FREE | $0 | 📋 TODO |
| Green Seal | P1 | FREE | $0 | 📋 TODO |
| WAP Sustainability | P2 | PAID | $3,500 | ⏳ Defer to M6 |
| Autodesk | P3 | PARTNER | $0 | 📧 Email sent |
| SimaPro | P3 | PAID | $0 | ⏸️ Defer to Year 2 |

**Total Year 1**: $3,500 (7 free providers + WAP from Month 6)  
**Monthly Budget**:
- Months 1-5: $0/month (7 free providers)
- Months 6-12: $500/month (add WAP post-break-even)

---

## Anti-Greenwashing Value

This integration system provides **real-time third-party verification** vs. self-reported claims:

1. **Certification Verification**
   - FSC certificates verified against official directory (not just uploaded PDFs)
   - B Corp status confirmed with B Lab registry (prevent false claims)
   - Expiry monitoring (auto-flag expired certs within 30 days)

2. **Immutable Audit Trail**
   - Every verification logged to `Certification_Events` (Event Sourcing)
   - Blockchain-ready with EventHash, PreviousEventHash chaining
   - API_Verification_Log tracks all external calls (timestamp, payload, response)

3. **Visual Trust Indicators**
   - Green checkmark badges for API-verified certifications
   - Gray badges for self-reported (pending verification)
   - Red flags for expired/revoked certifications

4. **Architect Confidence**
   - "Verified" filter shows only third-party confirmed products
   - Carbon data traceable to EPDs (EC3 links to source documents)
   - B Corp scores show validated social/environmental impact

5. **Banking KPI: Data Accuracy**
   - Target: 98% of certifications API-verified
   - Track via: `COUNT(*) FROM Certification_Verification_Status WHERE VerificationSource != 'Manual'`
   - Investor pitch: "Only B2B marketplace with real-time third-party verification"

---

## Support

**Technical Issues**: Open GitHub issue with `[Data Providers]` tag  
**Provider Access**: See [DATA-PROVIDERS.md](../../DATA-PROVIDERS.md) email templates  
**Database Schema**: See [database-schemas/schema.sql](../../database-schemas/schema.sql)

**Provider Support Contacts**:
- EC3: info@buildingtransparency.org
- FSC: info@us.fsc.org (bulk data requests)
- B Corp: data@bcorporation.net (CSV export)
- EPD International: info@environdec.com
- LEED: leedinfo@usgbc.org
