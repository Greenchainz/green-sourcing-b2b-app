# GreenChainz Strategic Pivot: "Toolbox" Launch Summary

## 🎯 The Pivot

**From:** "Marketplace" (search suppliers) → **To:** "Toolbox" (AI-powered utilities)

**Why:** 
- Eliminates chicken-and-egg problem (no need to launch with 100+ suppliers)
- Architects get instant value (audit BOM, browse with data overlays, scan models)
- Microsoft partnership story is stronger ("Sustainability Copilot for Excel")
- Tools drive network effects (free tools → network growth)

---

## ✅ What's Been Launched

### 1. **Toolbox Homepage** (`app/page.tsx`)
- New hero: "Stop Searching. Start Auditing."
- 3 tools prominently featured as "products"
- "Come for the Tool, Stay for the Network" positioning
- Call-to-action: "Get the Toolkit (Free)"

### 2. **Excel Carbon Audit Tool**
**Files Created:**
- `app/excel-addin/page.tsx` - Task pane UI (runs in Excel)
- `app/excel-addin/layout.tsx` - Office.js bootstrap
- `app/excel-addin/page-landing.tsx` - Marketing landing page
- `public/manifest.xml` - Office add-in registration

**API Backend:**
- `app/api/audit/excel-batch/route.ts` - ✅ **UPDATED TO AZURE SQL**
  - Queries Azure SQL for cached product data
  - Falls back to scraper agent if material not found
  - Returns: carbon_score, health_grade, red_list_status, certifications

**How It Works:**
1. Architect selects material column in Excel
2. Clicks "Run Audit"
3. We append 3 columns: Carbon (kgCO2e), Health Grade (A/C/F), Compliance Status

### 3. **Chrome Extension (Sweets Interceptor)**
**File Created:**
- `app/chrome-extension/page.tsx` - Landing page + install link

**Concept:**
- Browser extension that overlays sustainability data on Sweets/Material Bank
- Shows real-time carbon + green alternatives while browsing
- No new workflow = instant adoption

### 4. **Revit Compliance Plugin**
**File Created:**
- `app/revit-plugin/page.tsx` - Landing page + download

**Concept:**
- Scans 3D models for missing EPDs and high-carbon materials
- Calculates LEED credit eligibility
- Bulk material replacement tool

---

## 🔧 Technical Changes

### Azure SQL Integration (✅ Complete)
**Updated:** `app/api/audit/excel-batch/route.ts`

```typescript
// Old: Supabase connection
// New: Azure SQL connection pool with mssql library

import sql from "mssql";

const pool = new sql.ConnectionPool({
  server: process.env.AZURE_SQL_SERVER,
  database: process.env.AZURE_SQL_DATABASE,
  authentication: { type: "default", options: { userName, password } },
});

// Query products table
const result = await pool.request()
  .input('materialName', sql.VarChar, `%${cleanName}%`)
  .query(`SELECT ... FROM Products WHERE LOWER(name) LIKE LOWER(@materialName)`);
```

**Required Environment Variables:**
```
AZURE_SQL_SERVER=yourserver.database.windows.net
AZURE_SQL_DATABASE=yourdb
AZURE_SQL_USER=sqluser
AZURE_SQL_PASSWORD=strongpassword
```

### Package.json Updates
- Added `@types/office-js` (for Office.js types)
- Added `lucide-react` (icons)
- Added `mssql` (Azure SQL driver)

### Data Janitor Prompts (✅ Complete)
**Updated:** `lib/prompts/data-janitor.ts`

Added 4 extraction prompts:
1. `CARBON_COST_EXTRACTION_PROMPT` - Carbon + cost
2. `HEALTH_SAFETY_EXTRACTION_PROMPT` - **NEW** - Toxins, health grade, certifications
3. `FUZZY_MATCH_EXTRACTION_PROMPT` - **NEW** - Handle messy Excel text
4. `REVIT_SCHEDULE_EXTRACTION_PROMPT` - Revit BOM extraction

---

## 📁 New File Structure

```
app/
├── page.tsx                           # ✨ UPDATED: New Toolbox homepage
├── excel-addin/
│   ├── page.tsx                       # Excel task pane UI
│   ├── page-landing.tsx               # Excel tool marketing page
│   └── layout.tsx                     # Office.js loader
├── chrome-extension/
│   └── page.tsx                       # Sweets Interceptor landing page
├── revit-plugin/
│   └── page.tsx                       # Revit plugin landing page
└── api/audit/
    └── excel-batch/
        └── route.ts                   # ✨ UPDATED: Azure SQL backend

lib/
├── excel/
│   └── utils.ts                       # Office.js wrappers
├── prompts/
│   └── data-janitor.ts                # ✨ UPDATED: 4 extraction prompts

public/
└── manifest.xml                       # Office add-in registration

docs/
├── EXCEL_ADDIN_SETUP.md               # Setup + deployment guide
└── EXCEL_SCRAPER_INTEGRATION.md       # Integration with scraper
```

---

## 🚀 Deployment Checklist

### Immediate (Today)
- [ ] Run `npm install` (adds mssql, @types/office-js, lucide-react)
- [ ] Test homepage locally: `npm run dev`
- [ ] Verify Azure SQL connection string is set in `.env`

### This Week
- [ ] Test Excel add-in with sample materials in Excel Online
- [ ] Upload manifest to Office for testing: `public/manifest.xml`
- [ ] Create 5-10 test materials in Azure SQL `Products` table
- [ ] Record 2-minute demo video of Excel audit workflow

### Before Launch
- [ ] Seed database with 500+ common building materials
- [ ] Validate scraper fallback for unmapped materials
- [ ] Add Azure AD auth to Excel API (enterprise SSO)
- [ ] Optimize database queries (index on product names)

### Production (Launch Week)
- [ ] Deploy homepage to Vercel
- [ ] Update manifest with production domain: `https://greenchainz.com/excel-addin`
- [ ] Submit to Office AppSource (review takes 3-5 days)
- [ ] Launch Chrome extension to Chrome Web Store

---

## 💰 Business Model Shift

**Old Model:** "Find suppliers" → search fee or supplier subscription
**New Model:** "Use free tools" → capture users → upsell premium features

**Tool Monetization:**
1. **Excel Audit (Free):** 10 audits/month → Premium: $29/mo (unlimited)
2. **Chrome Extension (Free):** Ad-supported in free tier → $9/mo ad-free
3. **Revit Plugin (Free):** Personal use → $299/mo Professional license

**Network Value:**
- Every free Excel audit is a potential supplier lead
- Every material audited → we learn what architects want
- Premium users unlock API access → integrate into their workflows

---

## 🎤 Microsoft Partnership Pitch (Updated)

**Old:** "We built a B2B supplier marketplace"
**New:** "We built the first Sustainability Copilot for Excel"

**Talking Points:**
- ✅ Uses Azure OpenAI for fuzzy text matching
- ✅ Integrates Office.js for seamless Excel experience
- ✅ Drives Azure SQL + OpenAI consumption (Microsoft revenue)
- ✅ Aligns with "Microsoft Cloud for Sustainability" initiative
- ✅ 1-click install from Office AppSource (distribution channel)

**Demo:** 
1. Open Excel with BOM
2. Select material names column
3. Click "GreenChainz Audit"
4. 3 columns append with carbon + health data in 3 seconds
5. "This is what compliance looks like in 2026."

---

## 🔗 Integration with Existing Systems

The tools don't need new infrastructure. They plug into what you already have:

1. **Scraper Agent** (`lib/agents/scraper/`) → Powers on-demand material lookup
2. **Azure SQL** → Caches EPD data for fast lookups
3. **Azure OpenAI** → Fuzzy matches messy text to products

**Data Flow Example:**
```
Architect audits "Drywall 5/8" in Excel
    ↓
Excel API checks Azure SQL
    ↓
Not found → Triggers scraper agent
    ↓
Scraper searches Building Transparency
    ↓
Azure OpenAI extracts carbon + health data
    ↓
Data cached + returned to Excel
    ↓
Architect sees "5.5 kgCO2e | Grade A | Red List Free"
```

---

## ⚠️ Important Notes

### Azure SQL Schema Required
You'll need a `Products` table in Azure SQL with columns:
```sql
CREATE TABLE Products (
  id INT PRIMARY KEY,
  name VARCHAR(255),
  gwp_per_unit FLOAT,
  health_grade VARCHAR(1),           -- 'A', 'C', or 'F'
  red_list_status VARCHAR(20),       -- 'Free', 'Approved', 'None'
  certifications VARCHAR(500),       -- Comma-separated list
  has_epd BIT,
  created_at DATETIME2
);
```

### Office Add-in Manifest
The manifest (`public/manifest.xml`) needs to be:
1. Uploaded to Office for testing (development)
2. Submitted to Microsoft AppSource (production)
3. Updated with your production domain before launch

### Scraper Integration
The Excel audit API calls your scraper at:
```
POST /api/scrape/suppliers
```

Make sure your scraper endpoint accepts the new request format with `extract_fields: ["gwp_per_unit", "health_grade", "red_list_status", "certifications"]`

---

## 🎯 Next 3 Steps

### Step 1: Enable On-Demand Scraper (Today)
Ensure your scraper can be triggered via API (not just cron). 
See: `docs/EXCEL_SCRAPER_INTEGRATION.md`

### Step 2: Test End-to-End (Today)
```bash
npm install                          # Install new dependencies
npm run dev                          # Start dev server
# Test at http://localhost:3000
# Upload manifest to Excel Online for testing
```

### Step 3: Prepare Microsoft Pitch (This Week)
- Record demo video (2 minutes max)
- Prepare talking points on Azure integration
- Schedule call with Microsoft Partner Sales

---

## 📊 Success Metrics

- **Week 1:** 100+ architects test Excel audit
- **Month 1:** 1K+ free audits
- **Month 2:** Launch Chrome extension (10K+ installs)
- **Month 3:** Revit plugin beta (200+ testers)
- **Month 4:** 50+ sign-ups for premium features

---

## 🛠️ File References

| File | Purpose | Status |
|------|---------|--------|
| `app/page.tsx` | Toolbox homepage | ✅ Complete |
| `app/excel-addin/page.tsx` | Excel UI | ✅ Complete |
| `app/api/audit/excel-batch/route.ts` | Audit API (Azure SQL) | ✅ Complete |
| `public/manifest.xml` | Office registration | ✅ Complete |
| `lib/excel/utils.ts` | Office.js utilities | ✅ Complete |
| `lib/prompts/data-janitor.ts` | AI extraction prompts | ✅ Complete |
| `docs/EXCEL_ADDIN_SETUP.md` | Setup guide | ✅ Complete |
| `docs/EXCEL_SCRAPER_INTEGRATION.md` | Integration guide | ✅ Complete |
| `package.json` | Dependencies | ✅ Updated |

---

**Status:** 🟢 Ready for testing
**Next Action:** Deploy to Vercel and test with sample materials
**Timeline:** Launch to Office AppSource within 2 weeks

