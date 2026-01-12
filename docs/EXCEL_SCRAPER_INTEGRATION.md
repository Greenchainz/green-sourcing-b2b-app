# Excel Add-in ↔ Scraper Agent Integration

This document explains how the Excel Add-in connects to your **existing scraper infrastructure** to fetch real-time EPD data.

## Current Architecture

Your codebase has:
- **`lib/agents/scraper`** - The "Data Scout" that searches the web for EPD documents
- **`app/api/scrape/suppliers`** - Existing API endpoint for scraper triggers
- **`lib/prompts/data-janitor.ts`** - Azure OpenAI prompts for data extraction

The Excel Add-in **reuses all of this.** We don't reinvent the wheel; we just add a new "pair of glasses" (the Excel interface).

## Data Flow

### Scenario 1: Material Found in Cache (Fast Path - 50ms)

```
Excel Add-in User: "Audit: Drywall 5/8"
    ↓
GreenChainz API: /api/audit/excel-batch
    ↓
Azure SQL/PostgreSQL Query: SELECT * FROM products WHERE name ILIKE '%drywall%'
    ↓
✅ Found: { name: "5/8 Type X Drywall", gwp: 5.5, health_grade: "A" }
    ↓
Excel: Displays "✅ Drywall 5/8 | 5.5 kgCO2e | Grade A"
```

### Scenario 2: Material NOT in Cache (Scraper Trigger - 3-5 seconds)

```
Excel Add-in User: "Audit: Acme Drywall 5/8"
    ↓
GreenChainz API: /api/audit/excel-batch
    ↓
Azure SQL/PostgreSQL Query: SELECT * FROM products WHERE name ILIKE '%acme drywall%'
    ↓
❌ Not found
    ↓
Scraper Trigger: POST /api/scrape/suppliers
    {
      "material_name": "Acme Drywall 5/8",
      "search_type": "epddb",
      "extract_fields": ["gwp_per_unit", "health_grade", "red_list_status"]
    }
    ↓
Your Scraper Agent:
  1. Searches Google for "Acme Drywall 5/8 EPD"
  2. Downloads PDF from Building Transparency (EC3)
  3. Sends to Azure OpenAI with HEALTH_SAFETY_EXTRACTION_PROMPT
  4. Extracts: gwp=5.2, health_grade="A", red_list_status="Free"
  5. Caches in Azure SQL/PostgreSQL (next time: fast path)
    ↓
Excel: Displays "🟢 Acme Drywall | 5.2 kgCO2e | Grade A"
```

## Implementation Details

### Step 1: Modify Your Scraper Agent to Support "On-Demand" Mode

**File to update:** `lib/agents/scraper/scraper-agent.ts`

Currently, your scraper likely runs on a **schedule** (cron job). We need to enable **on-demand** triggering from the Excel API.

**Current pattern (scheduled):**
```typescript
// Runs every 24 hours
schedule.scheduleJob('0 0 * * *', async () => {
  const suppliers = await getAllSuppliers();
  for (const supplier of suppliers) {
    // Scrape data...
  }
});
```

**New pattern (on-demand):**
```typescript
// Add this export to scraper-agent.ts
export async function scrapeMaterialData(options: {
  material_name: string;
  search_type: 'epddb' | 'healthdb' | 'both';
  extract_fields: string[];
}): Promise<ScrapedMaterial> {
  // 1. Determine search queries based on material_name
  const searchQuery = `${options.material_name} EPD environmental product declaration`;
  
  // 2. Search for documents (web scraper)
  const documents = await searchWeb(searchQuery);
  
  // 3. For each document, extract data using appropriate prompt
  for (const doc of documents) {
    const pdf = await downloadPDF(doc.url);
    
    // Choose prompt based on extract_fields
    const prompt = options.extract_fields.includes('health_grade')
      ? HEALTH_SAFETY_EXTRACTION_PROMPT  // New prompt from data-janitor.ts
      : CARBON_COST_EXTRACTION_PROMPT;   // Existing prompt
    
    const extracted = await extractWithAzureOpenAI(pdf, prompt);
    
    // 4. Cache in Azure SQL/PostgreSQL
    await Azure database.from('products').insert({
      name: options.material_name,
      gwp_per_unit: extracted.gwp_per_unit,
      health_grade: extracted.health_grade,
      red_list_status: extracted.red_list_status,
      certifications: extracted.certifications,
      has_epd: !!extracted.epd_link,
      created_at: new Date(),
    });
    
    return extracted;
  }
  
  throw new Error('No data found for material');
}
```

### Step 2: Verify Your Scraper API Endpoint

Your existing endpoint: **`app/api/scrape/suppliers`**

Make sure it can accept the Excel Add-in's request format:

```typescript
// app/api/scrape/suppliers (existing file)
// Verify it handles this request:

{
  "material_name": "Drywall 5/8",
  "search_type": "epddb",
  "extract_fields": ["gwp_per_unit", "health_grade", "red_list_status", "certifications"]
}
```

If your current endpoint is supplier-focused, you may need a **new endpoint** specifically for materials:

**File:** `app/api/scrape/materials/route.ts` (optional new endpoint)

```typescript
import { NextRequest, NextResponse } from "next/server";
import { scrapeMaterialData } from "@/lib/agents/scraper/scraper-agent";

export async function POST(request: NextRequest) {
  const { material_name, search_type, extract_fields } = await request.json();

  try {
    const data = await scrapeMaterialData({
      material_name,
      search_type: search_type || "epddb",
      extract_fields: extract_fields || ["gwp_per_unit"],
    });

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 404 }
    );
  }
}
```

### Step 3: Update Data Janitor Prompts

✅ **Already done** in `lib/prompts/data-janitor.ts`:
- Added `HEALTH_SAFETY_EXTRACTION_PROMPT` (extracts toxins, health grade, certifications)
- Added `FUZZY_MATCH_EXTRACTION_PROMPT` (handles typos in Excel material names)

Your scraper agent should now use these when processing material documents.

### Step 4: Connect Excel API to Scraper

**File:** `app/api/audit/excel-batch/route.ts` (already created)

This file:
1. ✅ Checks Azure SQL/PostgreSQL first (fast path)
2. ✅ Falls back to scraper if not found
3. ✅ Uses your existing scraper infrastructure

No changes needed here. Just verify the fallback URL matches your scraper endpoint:

```typescript
// Line ~60 in excel-batch route
const scraperResponse = await fetch(
  `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/scrape/suppliers`,
  // or
  `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/api/scrape/materials`,
);
```

## Testing the Integration

### Test 1: Cached Material (Fast Path)

```bash
# 1. Seed Azure SQL/PostgreSQL with test data
INSERT INTO products (name, gwp_per_unit, health_grade, red_list_status, certifications, has_epd)
VALUES ('Drywall 5/8', 5.5, 'A', 'Free', ARRAY['Cradle to Cradle'], true);

# 2. Call Excel API
curl -X POST http://localhost:3000/api/audit/excel-batch \
  -H "Content-Type: application/json" \
  -d '{"materials": ["Drywall 5/8"]}'

# Expected response:
# {
#   "results": [{
#     "original": "Drywall 5/8",
#     "carbon_score": 5.5,
#     "health_grade": "A",
#     "red_list_status": "Free",
#     "verified": true
#   }],
#   "count": 1
# }
```

### Test 2: Scraper Fallback (On-Demand)

```bash
# Call Excel API with material NOT in database
curl -X POST http://localhost:3000/api/audit/excel-batch \
  -H "Content-Type: application/json" \
  -d '{"materials": ["Some Unknown Drywall Brand"]}'

# Expected behavior:
# 1. Azure SQL/PostgreSQL query returns empty
# 2. API triggers scraper endpoint
# 3. Scraper searches web for EPD data
# 4. Azure OpenAI extracts health/carbon data
# 5. Result returned to Excel (or error if not found online)
```

## Performance Tuning

### Cache Hit Rate Optimization
To maximize cached results (fast path):

1. **Seed your database** with common materials:
   ```bash
   # Run this script to populate common building materials
   npm run seed:materials
   ```

2. **Batch crawl** using your scheduled scraper:
   - Every 24 hours, search for top 100 materials from your supplier database
   - Cache results in Azure SQL/PostgreSQL
   - Excel users benefit from fast lookups

### Scraper Timeout Handling
Excel Add-in users expect **results in < 5 seconds**. If scraper takes longer:

```typescript
// In excel-batch route, add timeout:
const scraperResponse = await Promise.race([
  fetch('/api/scrape/materials', {...}),
  new Promise((_, reject) => setTimeout(() => reject(new Error('Scraper timeout')), 4000))
]);
```

## Next: Azure AD Authentication

When you're ready to add enterprise SSO:

**File:** `app/api/audit/excel-batch/route.ts`

```typescript
import { validateAzureADToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  // Validate that user is authenticated
  const token = request.headers.get('Authorization')?.split(' ')[1];
  const user = await validateAzureADToken(token);
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Log audit for compliance
  console.log(`Material audit by ${user.email}: ${materials.length} items`);
  
  // ... rest of implementation
}
```

The Excel Add-in already handles sending the token:

**File:** `app/excel-addin/page.tsx` (update)

```typescript
const response = await fetch("/api/audit/excel-batch", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${azureADToken}` // Add this
  },
  body: JSON.stringify({ materials }),
});
```

## Deployment Checklist

- [ ] `lib/agents/scraper/scraper-agent.ts` supports on-demand mode
- [ ] `app/api/scrape/suppliers` (or `/materials`) accepts Excel Add-in request format
- [ ] `lib/prompts/data-janitor.ts` has health/safety prompts
- [ ] `app/api/audit/excel-batch/route.ts` is deployed
- [ ] Azure SQL/PostgreSQL `products` table exists with required columns
- [ ] Scraper can be triggered via API (not just cron)
- [ ] `public/manifest.xml` points to correct domain
- [ ] Excel Add-in tested in Excel Online (web)

---

**Status:** ✅ Ready to integrate
**Next Step:** Update your scraper agent to support on-demand mode, then test end-to-end
