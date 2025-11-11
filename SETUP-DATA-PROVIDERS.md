# GreenChainz Data Provider Integration - Setup Guide

## Quick Start (5 minutes)

### 1. Install Dependencies
```bash
cd backend
npm install cheerio csv-parser
```

### 2. Start Database
```bash
# Start PostgreSQL
docker compose up -d

# Verify database is running
docker ps | grep greenchainz_db
```

### 3. Seed Data Providers
```bash
# Run seed script to insert 10 providers
docker exec -i greenchainz_db psql -U user -d greenchainz_dev < database-schemas/seed-data-providers.sql

# Verify providers inserted
docker exec -it greenchainz_db psql -U user -d greenchainz_dev -c "SELECT ProviderName, Priority, AccessType, MonthlyCost FROM Data_Providers ORDER BY Priority;"
```

**Expected output:**
```
             providername              | priority | accesstype | monthlycost 
---------------------------------------+----------+------------+-------------
 Building Transparency (EC3)           | P0       | FREE       |        0.00
 EPD International                     | P0       | FREE       |        0.00
 Forest Stewardship Council (FSC)      | P0       | FREE       |        0.00
 B Corporation                         | P1       | EMAIL/REQUEST | 0.00
 USGBC / LEED                          | P1       | FREE       |        0.00
 Cradle to Cradle Products Innovation Institute | P1 | FREE |  0.00
 Green Seal                            | P1       | FREE       |        0.00
 WAP Sustainability                    | P2       | PAID       |      500.00
 Autodesk Construction Cloud           | P3       | PARTNERSHIP|        0.00
 SimaPro / Ecochain                    | P3       | PAID       |     1200.00
(10 rows)
```

### 4. Start Backend Server
```bash
cd backend
node index.js
```

**Expected output:**
```
✅ Database schema ensured.
Backend server listening at http://localhost:3001
```

### 5. Test API Endpoints

#### Test EC3 Carbon Search
```bash
curl "http://localhost:3001/api/carbon/search?q=insulation&limit=5"
```

**Expected response:**
```json
{
  "count": 5,
  "materials": [
    {
      "ec3_id": "abc123",
      "name": "Cellulose Insulation",
      "gwp_kgco2e": 1.2,
      "functional_unit": "kg",
      "manufacturer": "Warmcel",
      "data_quality": "High"
    }
  ]
}
```

#### Test Data Providers List
```bash
curl http://localhost:3001/api/data-providers
```

**Expected response:**
```json
{
  "count": 10,
  "providers": [
    {
      "providerid": 1,
      "providername": "Building Transparency (EC3)",
      "providertype": "Carbon",
      "accesstype": "FREE",
      "priority": "P0",
      "monthlycost": "0.00",
      "status": "Active"
    }
  ]
}
```

---

## Detailed Setup Steps

### Step 1: Request B Corp CSV (One-time)

**Email to**: data@bcorporation.net

**Subject**: B Corp Directory Export for GreenChainz Integration

**Body**:
```
Hello B Lab,

I am building GreenChainz, a B2B sustainable materials marketplace that helps 
architects source verified sustainable products. We would like to integrate 
B Corp certification data to help architects identify and filter suppliers by 
social and environmental impact.

Could you please provide a CSV export of the B Corp directory with the following fields:
- Company Name
- Overall Score
- Impact Area Scores (Governance, Workers, Community, Environment, Customers)
- Certification Date
- Industry
- Country

This data will be used to verify B Corp status for suppliers on our platform 
and display B Corp badges with impact scores.

Thank you,
[Your Name]
GreenChainz Platform
```

**Save CSV to**: `backend/data/bcorp-directory.csv`

### Step 2: Import B Corp Data

Once you receive the CSV:

```bash
# Create data directory
mkdir -p backend/data

# Move CSV to data directory
mv ~/Downloads/bcorp-directory.csv backend/data/

# Test import via API (requires admin JWT token)
curl -X POST http://localhost:3001/api/data-providers/import-bcorp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -d '{"csvFilePath": "./data/bcorp-directory.csv"}'
```

**Expected response:**
```json
{
  "success": true,
  "count": 6500,
  "message": "Imported 6500 B Corp companies from CSV",
  "note": "Store this directory in memory or cache for lookups"
}
```

### Step 3: Request FSC Bulk Data (Optional)

For faster verification, request FSC bulk data export:

**Email to**: info@us.fsc.org

**Subject**: FSC Certificate Directory Bulk Export for GreenChainz Platform

**Body**:
```
Hello FSC,

I am building GreenChainz, a B2B sustainable materials marketplace that helps 
architects source FSC-certified products. We would like to integrate FSC 
certificate verification to provide real-time validation of supplier 
certifications.

Currently, we are using your public certificate search website for verification, 
but we anticipate high volume and would like to request:

1. Bulk CSV export of active FSC certificates (if available)
2. API access for programmatic verification (if available)
3. Guidelines for acceptable use and rate limits

Our platform will:
- Verify FSC certificate numbers provided by suppliers
- Display verified FSC badges on supplier profiles
- Alert suppliers when certificates are expiring (30-day notice)
- Support your group certification program by offering 40% discounts to suppliers

Thank you,
[Your Name]
GreenChainz Platform
```

---

## Verification Workflows

### Workflow 1: Supplier Onboarding with FSC Verification

1. **Supplier uploads FSC certificate during onboarding**
   - Frontend: File upload + Certificate Number input field
   - Backend: Save to `Supplier_Certifications` table

2. **Automatic verification triggered**
   ```javascript
   POST /api/verify/fsc
   {
     "supplierId": 123,
     "certificateNumber": "FSC-C123456"
   }
   ```

3. **Verification result saved to database**
   - ✅ Valid: Display green "FSC Certified" badge
   - ❌ Invalid: Email supplier requesting valid certificate
   - ⏳ Pending: Show "Verification in progress"

4. **Email notification sent**
   - Valid: "Congratulations! Your FSC certificate has been verified."
   - Invalid: "We could not verify certificate FSC-C123456. Please provide a valid certificate."

### Workflow 2: Product Carbon Footprint Lookup

1. **Architect searches for "cellulose insulation"**
   - Frontend: Material search with carbon filter
   - Backend: Query products + join `Product_Environmental_Data`

2. **No carbon data found → Trigger EC3 lookup**
   ```javascript
   // Backend auto-searches EC3
   const materials = await ec3Service.searchMaterials('cellulose insulation', 20);
   
   // Admin selects correct match
   POST /api/carbon/verify
   {
     "productId": 456,
     "ec3MaterialId": "abc123-uuid"
   }
   ```

3. **Display verified carbon data on product page**
   ```
   ✅ Verified Low Carbon
   1.2 kgCO2e/kg (73% lower than average)
   
   Data Source: Building Transparency EC3
   Verified: 2025-01-15
   EPD: [View EPD Document]
   ```

4. **Architect filters materials by carbon threshold**
   - "Show only materials < 2.0 kgCO2e/kg"
   - Results: 45 materials (sorted by lowest carbon first)

### Workflow 3: B Corp Supplier Discovery

1. **Architect searches for suppliers with "Social Impact" filter**
   - Frontend: "B Corp Certified" checkbox filter
   - Backend: JOIN `Suppliers` + `Supplier_BCorp_Data`

2. **Results show B Corp badges with scores**
   ```
   Interface Inc
   ⭐ B Corp Certified - Gold (Score: 102.5)
   Environment: 38.2 | Workers: 21.3 | Community: 18.5
   Certified since: 2019-06-01
   ```

3. **Architect clicks on B Corp score to see details**
   - Modal shows breakdown of 5 impact areas
   - Link to B Corp profile on bcorporation.net
   - "Why this matters" explanation for architects

---

## Monitoring & Alerts

### Expiring Certificates Alert (Cron Job)

Create a daily cron job to check expiring FSC certificates:

**Script**: `backend/scripts/check-expiring-certs.js`
```javascript
const fscService = require('../services/fscService');
const { pool } = require('../db');

async function checkAndAlert() {
  const expiring = await fscService.checkExpiringCertificates(pool);
  
  for (const cert of expiring) {
    // Send email to supplier
    console.log(`Alert: FSC certificate ${cert.certificatenumber} expires ${cert.expirydate}`);
    
    // TODO: Integrate with email service (SendGrid, Mailgun)
    // await sendEmail({
    //   to: cert.contactemail,
    //   subject: `FSC Certificate ${cert.certificatenumber} Expiring Soon`,
    //   body: `Your FSC certificate expires on ${cert.expirydate}. Please renew to maintain verified status.`
    // });
  }
  
  console.log(`Checked ${expiring.length} expiring certificates`);
}

checkAndAlert().then(() => process.exit(0));
```

**Cron Schedule** (Linux/macOS):
```bash
# Run daily at 9 AM
0 9 * * * cd /path/to/backend && node scripts/check-expiring-certs.js
```

**Windows Task Scheduler**:
```powershell
# Create scheduled task
schtasks /create /tn "GreenChainz Expiring Certs Check" /tr "node C:\path\to\backend\scripts\check-expiring-certs.js" /sc daily /st 09:00
```

### API Usage Monitoring

View monthly API call statistics:

```bash
curl http://localhost:3001/api/data-providers/stats \
  -H "Authorization: Bearer YOUR_ADMIN_JWT"
```

**Expected response:**
```json
{
  "total_api_calls": 1247,
  "total_monthly_cost": 0.00,
  "providers": [
    {
      "providername": "Building Transparency (EC3)",
      "monthlyapicalls": 523,
      "monthlycost": "0.00",
      "lastsyncеdat": "2025-01-15T14:32:00Z"
    },
    {
      "providername": "Forest Stewardship Council (FSC)",
      "monthlyapicalls": 412,
      "monthlycost": "0.00"
    }
  ]
}
```

**Banking KPI**: Data Accuracy
```sql
-- Calculate % of certifications that are API-verified
SELECT 
  ROUND(
    COUNT(*) FILTER (WHERE VerificationSource != 'Manual') * 100.0 / COUNT(*), 
    2
  ) AS verified_percentage
FROM Certification_Verification_Status;

-- Target: 98%+ verified
```

---

## Troubleshooting

### Issue: EC3 API returns empty results

**Cause**: Material name doesn't match EC3 database

**Solution**: Try broader search terms
```bash
# Too specific (0 results)
curl "http://localhost:3001/api/carbon/search?q=Warmcel%20100%20Recycled%20Cellulose%20Insulation"

# Better (20+ results)
curl "http://localhost:3001/api/carbon/search?q=cellulose%20insulation"
```

### Issue: FSC verification fails with "parsing error"

**Cause**: FSC website HTML structure changed (web scraping fragility)

**Solution**: 
1. Check `fscService.js` cheerio selectors
2. Inspect current FSC website HTML
3. Update selectors: `.certificate-details`, `.cert-status`, etc.
4. Long-term: Email FSC for official API access

### Issue: B Corp CSV import fails

**Cause**: CSV column names mismatch

**Solution**: Check CSV headers match expected format
```javascript
// Expected headers (case-insensitive):
'Company Name', 'Overall Score', 'Governance', 'Workers', 
'Community', 'Environment', 'Customers', 'Certification Date', 
'Industry', 'Country', 'Size', 'Website'

// If different, update bcorpService.js mapping:
company_name: row['Company'] || row['CompanyName'] || row['company_name']
```

### Issue: Database query timeout

**Cause**: Large table scans without indexes

**Solution**: Verify indexes exist
```sql
-- Check indexes on Product_Environmental_Data
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'product_environmental_data';

-- Should see:
-- idx_product_env_data_product
-- idx_product_env_data_provider
-- idx_product_env_data_type
```

---

## Next Steps

### Phase 2 Implementation (Weeks 5-8)

1. **EPD International Integration**
   - Email `info@environdec.com` for bulk CSV export
   - Import ~2,000 EPDs to `Product_EPDs` table
   - Link EPDs to products via manufacturer name matching

2. **LEED Credit Calculator**
   - Parse LEED credit documentation PDFs
   - Create `LEED_Product_Credits` mappings
   - API endpoint: `GET /api/leed/credits?productId=123`
   - Display: "Contributes to LEED MR Credit 3 (Building Product Disclosure)"

3. **Cradle to Cradle Registry**
   - Scrape https://www.c2ccertified.org/products
   - Import certified products to `C2C_Certifications`
   - Display C2C level badges (Basic → Platinum)
   - Show 5 category scores (Material Health, Reutilization, Renewable Energy, Water, Social Fairness)

4. **Green Seal Integration**
   - Download product list from https://greenseal.org/certified-products-services
   - CSV import to `Certifications` table with CertifyingBody='Green Seal'
   - Filter products by Green Seal standards (GS-11, GS-13, etc.)

5. **Frontend Certification Badges**
   - Create `CertificationBadge.tsx` component
   - Props: `{ type: 'fsc' | 'bcorp' | 'c2c', verified: boolean, score?: number }`
   - Display on product cards in `ArchitectDashboard.tsx`
   - Color coding: Green=Verified, Gray=Self-reported, Red=Expired

6. **Automated Monitoring**
   - Cron job: Daily FSC expiry checks
   - Cron job: Weekly re-verification of all certifications
   - Email alerts: Supplier notifications for expiring/failed certs
   - Admin dashboard: "Data Provider Health" widget showing API uptime

---

## Support Contacts

| Provider | Email | Request Type | Response Time |
|----------|-------|--------------|---------------|
| Building Transparency | info@buildingtransparency.org | API access, data questions | 2-3 business days |
| FSC | info@us.fsc.org | Bulk data export, API access | 5-7 business days |
| B Lab | data@bcorporation.net | CSV export, partnership | 3-5 business days |
| EPD International | info@environdec.com | Bulk EPD export | 5-10 business days |
| USGBC | leedinfo@usgbc.org | Product database access | 5-7 business days |
| C2C | info@c2ccertified.org | Data export, API | 5-7 business days |
| Green Seal | greenseal@greenseal.org | Product list download | 2-3 business days |
| WAP Sustainability | info@wapsustainability.com | Pricing, API docs | 1-2 business days |
| Autodesk | forge.help@autodesk.com | Forge API, partnership | 3-5 business days |
| Ecochain | info@ecochain.com | SimaPro API pricing | 2-3 business days |

**Internal Support**: Open GitHub issue with `[Data Providers]` tag

---

## Success Metrics (Banking KPIs)

Track these metrics for investor/bank reporting:

1. **Data Accuracy**: 98%+ certifications API-verified (vs. self-reported)
2. **API Uptime**: 99.5% successful verification calls
3. **Data Freshness**: 95%+ certifications re-verified within 30 days
4. **Coverage**: 80%+ products have environmental data (EPD, carbon, or LCA)
5. **Cost Efficiency**: $0/month Year 1 (7 free providers)
6. **Architect Trust**: Survey metric - "I trust verified certifications" (target 90%+ agree)

Query for Data Accuracy KPI:
```sql
SELECT 
  ROUND(
    COUNT(*) FILTER (WHERE c.VerificationSource != 'Manual') * 100.0 / NULLIF(COUNT(*), 0), 
    2
  ) AS data_accuracy_pct,
  COUNT(*) AS total_certs,
  COUNT(*) FILTER (WHERE c.VerificationSource != 'Manual') AS verified_certs
FROM Certification_Verification_Status c;
```

**Target**: 98.0% (Excellent for banking presentation)
