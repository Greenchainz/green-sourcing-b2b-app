# GreenChainz Excel Add-in: Deployment & Setup Guide

## Overview

The **GreenChainz Carbon Audit Add-in** is an Office.js application that brings real-time sustainability data into Microsoft Excel. Users can audit Bills of Materials (BOMs) for embodied carbon, health hazards, and building material certifications without leaving Excel.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Microsoft Excel (Desktop/Web)             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  GreenChainz Task Pane                               │  │
│  │  - Select materials column                           │  │
│  │  - Click "Run Audit"                                 │  │
│  │  - Display results                                   │  │
│  └───────────────────┬──────────────────────────────────┘  │
└────────────────────────┼──────────────────────────────────────┘
                         │
                         ▼ (Office.js + HTTP)
┌─────────────────────────────────────────────────────────────┐
│          GreenChainz Next.js Backend (greenchainz.com)       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  /api/audit/excel-batch                              │  │
│  │  - Receives material names from Excel                │  │
│  │  - Queries Supabase for cached EPD data              │  │
│  │  - Falls back to scraper agent if data missing       │  │
│  │  - Returns carbon, health grade, certifications      │  │
│  └───────────────────┬──────────────────────────────────┘  │
└────────────────────────┼──────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
    ┌─────────┐    ┌──────────────┐   ┌─────────────────┐
    │ Supabase│    │ Azure OpenAI │   │ Scraper Agent   │
    │ Products│    │  (Embeddings)│   │ (EC3, NIST, etc)│
    │ Database│    │              │   │                 │
    └─────────┘    └──────────────┘   └─────────────────┘
```

## Files Created

### 1. Manifest File (Microsoft Office Registration)
**File:** `public/manifest.xml`
- Registers the add-in with Microsoft Office
- Specifies entry point: `https://greenchainz.com/excel-addin`
- Required for AppSource submission

### 2. Frontend (Excel Task Pane)
**File:** `app/excel-addin/page.tsx`
- React component displayed as a sidebar in Excel
- Handles user interactions (select materials, click audit)
- Displays results with status indicators

**File:** `app/excel-addin/layout.tsx`
- Loads Office.js library
- Minimal HTML wrapper for Excel's constraints

### 3. Backend API
**File:** `app/api/audit/excel-batch/route.ts`
- Receives batch of material names from Excel
- Queries Supabase for cached data
- Falls back to scraper agent if data missing
- Returns: `{ carbon_score, health_grade, red_list_status, certifications }`

### 4. Utilities
**File:** `lib/excel/utils.ts`
- TypeScript helpers for Excel.js interactions
- Functions: `getSelectedMaterials()`, `writeAuditResults()`
- Global type declarations for Office.js

### 5. Updated Prompts
**File:** `lib/prompts/data-janitor.ts`
- **NEW:** `HEALTH_SAFETY_EXTRACTION_PROMPT` - Extract health hazards & toxins
- **NEW:** `FUZZY_MATCH_EXTRACTION_PROMPT` - Match messy Excel text to products
- Existing carbon/cost prompts remain unchanged

## Setup & Deployment

### Step 1: Install Dependencies

```bash
npm install @types/office-js lucide-react
```

**Why these packages:**
- `@types/office-js` - TypeScript types for Office.js API
- `lucide-react` - Icons used in the UI (AlertCircle, CheckCircle, etc.)

### Step 2: Test Locally (Excel Online)

Excel Add-ins require HTTPS and must be accessible from the internet. For local development:

#### Option A: Use Excel Web (Recommended for dev)
1. Go to **Office.com** → Open Excel Online
2. Click **Insert** → **Get Add-ins** → **My Add-ins** → **Upload My Add-in**
3. Upload `public/manifest.xml`
4. **Important:** Update `manifest.xml` to point to your local dev server (e.g., `http://localhost:3000/excel-addin`)
5. Run `npm run dev` to start Next.js dev server

#### Option B: Use Excel Desktop (Production-Ready)
- Requires HTTPS endpoint
- Update manifest to production URL: `https://greenchainz.com/excel-addin`
- Submit manifest to Microsoft AppSource (see below)

### Step 3: Update Manifest for Your Domain

**File:** `public/manifest.xml`

Replace these placeholders:
```xml
<!-- CHANGE THIS -->
<Id>12345678-1234-1234-1234-123456789012</Id>

<!-- CHANGE THIS to your production domain -->
<SourceLocation DefaultValue="https://greenchainz.com/excel-addin"/>
<AppDomain>https://greenchainz.com</AppDomain>
```

Generate a GUID here: https://www.uuidgenerator.net/

### Step 4: Verify Backend API

The Excel add-in calls `/api/audit/excel-batch`. Verify it works:

```bash
# From terminal
curl -X POST http://localhost:3000/api/audit/excel-batch \
  -H "Content-Type: application/json" \
  -d '{"materials": ["Drywall 5/8", "Concrete 4000 PSI"]}'

# Expected response:
# {"results": [{"original": "Drywall 5/8", "carbon_score": 5.5, "health_grade": "A", ...}, ...]}
```

### Step 5: Database Schema (Products Table)

The API expects a `products` table in Supabase. Ensure it has these columns:

```sql
CREATE TABLE products (
  id BIGINT PRIMARY KEY,
  name TEXT,
  gwp_per_unit FLOAT,
  health_grade TEXT ('A', 'C', 'F'),
  red_list_status TEXT ('Free', 'Approved', 'None'),
  certifications TEXT[] (Array of certification names),
  has_epd BOOLEAN,
  created_at TIMESTAMP
);
```

If this table doesn't exist, the API will skip the database query and go straight to the scraper agent.

### Step 6: Deploy to Production

#### Deploy Frontend (Next.js)
```bash
# Push to your hosting (Azure Container Apps, Azure App Service, etc.)
git push origin main
# Azure Container Apps auto-deploys on push
```

#### Update Manifest
```xml
<!-- In public/manifest.xml -->
<SourceLocation DefaultValue="https://greenchainz.com/excel-addin"/>
```

#### Submit to Microsoft AppSource (Optional)
1. Go to **Partner Center** → **Create new app**
2. Upload `public/manifest.xml`
3. Fill in app details (name, description, categories, icons)
4. Microsoft reviews (3-5 business days)
5. Once approved, users can install from **Excel → Insert → Get Add-ins → AppSource**

## User Workflow

### Step 1: Install the Add-in
- **Excel Web:** Insert → Get Add-ins → Search "GreenChainz"
- **Excel Desktop:** Insert → Get Add-ins → Upload `manifest.xml`

### Step 2: Open Task Pane
- Click **GreenChainz** in the ribbon
- Task pane appears on the right side

### Step 3: Run Audit
1. Select a column of material names (e.g., A1:A100)
2. Click **"Run Audit"**
3. Add-in extracts materials and sends to backend
4. Results append to columns B, C, D:
   - **Column B:** Embodied Carbon (kgCO2e)
   - **Column C:** Health Grade (A/C/F)
   - **Column D:** Compliance Status (Red List Free/Approved/None)

### Step 4: Interpret Results
- 🟢 **Grade A:** Safe material (Red List Free, Cradle to Cradle Gold, or no toxins)
- 🟡 **Grade C:** Caution (HPD available but contains some hazards)
- 🔴 **Grade F:** Toxic (PVC, Formaldehyde, or no health data)

## Data Sources

The Excel Add-in sources material data from:

1. **Supabase (Cached):** Fast lookup of previously scraped materials
2. **Scraper Agent (On-Demand):** If material not in cache:
   - Searches Building Transparency (EC3) for carbon data
   - Searches HPD database for health certifications
   - Uses Azure OpenAI embeddings to match messy Excel text to standard product names

## Security & Privacy

### Authentication
Currently, the API has **no authentication**. To add Azure AD:

**File:** `app/api/audit/excel-batch/route.ts`
```typescript
import { validateAzureADToken } from '@/lib/auth'; // Your auth helper

export async function POST(request: NextRequest) {
  const token = request.headers.get('Authorization')?.split(' ')[1];
  const user = await validateAzureADToken(token);
  if (!user) return new NextResponse({ error: 'Unauthorized' }, { status: 401 });
  
  // ... rest of API
}
```

### Data Privacy
- Material names sent to backend (stored temporarily in API logs)
- EPD data sourced from public databases (EC3, HPD)
- Recommend using HTTPS in production (✅ already enforced in manifest)

## Troubleshooting

### "Excel library not loaded"
- Ensure `Office.js` script tag in `app/excel-addin/layout.tsx` is loaded
- Try refreshing Excel add-in or restarting Excel

### "No cells selected"
- User must select a range before clicking "Run Audit"
- Only single-column selections are supported currently

### "No EPD data found"
- Material name doesn't match database
- Scraper agent failed to find data online
- Try searching manually on Building Transparency (ec3platform.com)

### CORS Errors
- Add frontend domain to CORS headers in API route
- Update `app/api/audit/excel-batch/route.ts`:
```typescript
return new NextResponse(null, {
  headers: {
    "Access-Control-Allow-Origin": "https://yourdomain.com",
  }
});
```

## Next Steps

1. ✅ **Test with sample materials** (Drywall, Concrete, Steel)
2. 🔄 **Integrate Azure AD auth** for enterprise SSO
3. 🔄 **Add batch export** (export audit results to PDF/Excel)
4. 🔄 **Build Revit integration** (pull data directly from Revit models)
5. 🔄 **Submit to AppSource** (reach all Microsoft Office users)

## References

- [Office.js Documentation](https://learn.microsoft.com/en-us/office/dev/add-ins/reference/javascript-api-for-office)
- [Manifest XML Reference](https://learn.microsoft.com/en-us/office/dev/add-ins/develop/add-in-manifests)
- [Excel Add-in Tutorial](https://learn.microsoft.com/en-us/office/dev/add-ins/tutorials/excel-tutorial)
- [Microsoft AppSource Publishing](https://learn.microsoft.com/en-us/office/dev/store/submit-to-the-office-store)

---

**Last Updated:** January 7, 2026
**Status:** ✅ MVP Ready for Testing
