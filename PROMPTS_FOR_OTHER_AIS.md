# Prompts for Other AIs — Easy Tasks

Copy-paste these prompts to other Claude instances or AIs. Each is self-contained.

---

## PROMPT 1: Category Baseline Service (1 hour)

**Task:** Create `server/services/category-baseline.ts`

You're building a helper service that computes the median embodied carbon (GWP) for each assembly category. This is used for carbon scoring (to compare a material against its category baseline).

**What you need to know:**
- Assembly types: EWS-1A, EWS-1B, EWS-2A, EWS-2B, EWS-3A, EWS-3B, EWS-3C, EWS-5
- epd_materials table has `assemblyType` and `gwpPer1000sf` columns
- You're computing the median GWP per assembly type
- Cache the result so we don't recompute every time

**Create this file:**
```
server/services/category-baseline.ts
```

**Functions needed:**
1. `getCategoryBaseline(assemblyType: string): Promise<number>` — Returns median GWP for that assembly type
2. `computeAllBaselines(): Promise<Record<string, number>>` — Computes for all assembly types, returns map

**Implementation notes:**
- Use Drizzle ORM to query epd_materials
- Filter out NULL values from gwpPer1000sf
- Calculate median (sort, pick middle value)
- Use simple in-memory caching (Map) or Redis if available
- If no materials for a category, return a default (e.g., 10000)

**Success criteria:**
- [ ] Code compiles without errors
- [ ] `getCategoryBaseline('EWS-1A')` returns a number
- [ ] Can handle empty result sets gracefully
- [ ] Caching works (same category called twice uses cache)

---

## PROMPT 2: Material Properties Seed Data (1 hour)

**Task:** Populate test data for material properties in `epd_materials` table

The database has new columns:
- `installability_hrs_sf` — Hours per 1000 SF to install (float)
- `hardness_mohs` — MOHS hardness scale (float 0-10)
- `leed_credits` — JSON of LEED credits it qualifies for
- `lifespan_years` — Years before replacement needed

**What you're doing:**
For 10 real-world materials, add realistic values to these columns.

**Realistic values:**

| Material | installability_hrs_sf | hardness_mohs | lifespan_years | LEED Credits |
|----------|-----------|----------|----------|----------|
| Granite veneer | 1.5 | 7.0 | 50 | `{"MR_3_1": 1, "MR_3_2": 1}` |
| Limestone | 1.0 | 3.0 | 30 | `{"MR_3_2": 1}` |
| Steel studs | 0.3 | 4.0 | 80 | `{"MR_3_1": 1}` |
| Drywall | 0.2 | 2.0 | 30 | `{}` |
| Concrete (UHPC) | 0.8 | 8.0 | 100 | `{"MR_3_1": 1}` |
| Insulation (recycled) | 0.5 | 1.0 | 50 | `{"MR_3_1": 2}` |
| Aluminum panel | 0.4 | 2.5 | 40 | `{"MR_3_2": 0.5}` |
| Terrazzo | 1.2 | 6.5 | 60 | `{"MR_3_1": 1}` |
| Timber (FSC) | 0.6 | 4.0 | 40 | `{"MR_3_1": 1, "MR_3_3": 1}` |
| Glass (recycled) | 0.7 | 5.0 | 30 | `{"MR_3_1": 1}` |

**How to do it:**

Create a migration file: `drizzle/0033_seed_material_properties.sql`

```sql
UPDATE epd_materials SET 
  installability_hrs_sf = 1.5,
  hardness_mohs = 7.0,
  lifespan_years = 50,
  leed_credits = '{"MR_3_1": 1, "MR_3_2": 1}'::jsonb
WHERE productName ILIKE '%granite%' AND manufacturerName IS NOT NULL
LIMIT 1;

-- Repeat for other 9 materials...
```

**Alternative:** If you can't find those exact materials, pick 10 from `epd_materials` table and assign realistic values based on material type.

**Success criteria:**
- [ ] Migration file created and syntactically valid
- [ ] 10 materials have non-NULL values for all 4 columns
- [ ] LEED credits JSON is valid JSON
- [ ] lifespan_years > 0 for all rows
- [ ] installability_hrs_sf is between 0.1 and 5.0

---

## PROMPT 3: UI Polish — Error/Loading/Empty States (2 hours)

**Task:** Add error handling, loading states, and empty state messages to architect spec pages

**Files to update:**
- `app/architect/specs/[specId]/page.tsx` — Results page
- `app/architect/specs/page.tsx` — Listing page

**What to add:**

### 1. Error State (Results Page)
When `spec.parseStatus === 'failed'`, show:
```
[Red icon] Failed to parse spec
We couldn't extract materials from your PDF. Try uploading a different file or check the format.
[Button] Try Again
```

### 2. Loading State (Results Page)
While `matchAlternativesMutation.isPending`, show skeleton loaders:
```
[Skeleton] [Skeleton]
[Skeleton] [Skeleton]
[Skeleton]
```
(5 skeleton cards, each h-32)

### 3. Empty State (Results Page)
When `alternatives.length === 0` after matcher runs, show:
```
[Search icon] No alternatives found
We couldn't find materials matching your constraints for this assembly.
Try adjusting your persona or filters.
```

### 4. Empty State (Listing Page)
When architect has uploaded zero specs, show:
```
[File icon] No specs yet
Start by uploading your Embodied Carbon Table to find sustainable alternatives.
[Button] Upload Your First Spec
```

### 5. Responsive Design
Test that:
- [ ] Upload form fields stack vertically on mobile (buttons still clickable)
- [ ] Results grid switches from multi-column to single column on mobile
- [ ] Filter buttons wrap instead of overflow on tablet
- [ ] No horizontal scroll needed on any page
- [ ] Text is readable (min 16px on mobile)

**Use existing components:**
- `<Card>`, `<CardContent>` for containers
- `<AlertCircle>`, `<File>`, `<Search>` icons from lucide-react
- `<Skeleton>` for loaders
- `<Badge>` for status

**Success criteria:**
- [ ] All 5 states render without errors
- [ ] Icons display correctly
- [ ] Copy is clear and actionable
- [ ] Buttons are clickable and 44px+ tall (mobile a11y)
- [ ] Responsive tests pass on 320px, 768px, 1024px widths

---

## PROMPT 4: E2E Testing Checklist (3 hours)

**Task:** Run end-to-end tests and document results

You'll test the full architect workflow: upload → parse → match → RFQ generation.

**Setup:**
```bash
npm run dev
# Server running on http://localhost:3001
```

**Test 1: Upload Flow**
- [ ] Navigate to `/architect/specs/upload`
- [ ] Select a test PDF (embodied carbon table)
- [ ] Fill in: Project Name = "Test Office", Location = "SF", Value = "500000"
- [ ] Click "Upload & Analyze"
- [ ] Verify: Progress bar animates
- [ ] Verify: Toast says "Spec uploaded and parsed successfully!"
- [ ] Verify: Redirected to `/architect/specs/[specId]`
- [ ] Verify: Parse status = "Ready"
- [ ] Document: Any errors? Screenshot them.

**Test 2: Material Matching**
- [ ] On results page, select persona = "LEED AP"
- [ ] Set Top N = 5
- [ ] Click "Run Material Matcher"
- [ ] Verify: Toast says "Running material matching algorithm..."
- [ ] Verify: Alternatives load (should see top 5 per assembly)
- [ ] Verify: Each alternative shows: rank, product name, GWP/1000sf, carbon delta %, CCPS score
- [ ] Verify: Confidence bar displays and is 0-100%
- [ ] Document: Any missing data? Screenshot it.

**Test 3: RFQ Generation**
- [ ] On results page, find "Generate RFQ" button (or click on an alternative)
- [ ] Choose format: PDF
- [ ] Verify: PDF downloads (check browser downloads folder)
- [ ] Open PDF and check sections:
  - [ ] Header (project name, architect, RFQ #)
  - [ ] Assembly Specification
  - [ ] Material Details (product, manufacturer, dimensions)
  - [ ] Sustainability Metrics (GWP, carbon delta, LEED credits)
  - [ ] Compliance Summary (fire rating, ASTM, code checklist)
  - [ ] Supplier Info (contact, lead time, regional availability)
  - [ ] Cost Estimate
- [ ] Repeat for Excel format (open in spreadsheet app, check sheets + data)
- [ ] Repeat for Revit format (verify CSV has all columns)
- [ ] Document: Missing sections? Wrong data? Screenshot.

**Test 4: Listing Page**
- [ ] Navigate to `/architect/specs`
- [ ] Verify: Uploaded spec appears in list
- [ ] Verify: Status badge shows "Ready" (green checkmark)
- [ ] Verify: Click spec row → redirects to results page
- [ ] Verify: "New Spec" button works → navigates to upload page

**Test 5: Error Handling**
- [ ] Try uploading invalid file (not PDF/XLSX) → should show error toast
- [ ] Try uploading >50MB file → should show error toast
- [ ] Try parsing non-embodied-carbon PDF → should set status = "failed", show error UI
- [ ] Try accessing `/architect/specs/999` (non-existent) → should show "Spec not found"

**Test 6: Azure Document Intelligence**
- [ ] Ensure parser extracts correct assembly codes (EWS-1A, EWS-2B, etc.)
- [ ] Ensure GWP values are parsed (handles kgCO₂e/kg, /m2, /m3, /1000sf)
- [ ] Ensure structural options are classified (1, 2, 3)
- [ ] Document: Any parsing failures?

**Success criteria:**
- [ ] All 6 tests complete without crashes
- [ ] All RFQ formats generate and download
- [ ] No missing data in outputs
- [ ] Error states display correctly
- [ ] Console has no red errors (warnings OK)

**Document results in:**
```
TEST_RESULTS.md

## Test Results — [Date]
### Test 1: Upload Flow
- Status: PASS / FAIL
- Notes: [any issues]
- Screenshots: [paste links]

### Test 2: Material Matching
- Status: PASS / FAIL
- Notes: ...

[etc.]
```

---

## PROMPT 5: Deployment — Environment Setup & Deploy (1 hour)

**Task:** Set up environment variables and deploy to Azure

**Step 1: Environment Variables**

Get these values (ask Jerit if you don't have them):
```
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=https://<region>.cognitiveservices.azure.com/
AZURE_DOCUMENT_INTELLIGENCE_KEY=<key>
BUILT_IN_FORGE_API_URL=<url>
BUILT_IN_FORGE_API_KEY=<key>
DATABASE_URL=<postgres-connection-string>
OAUTH_SERVER_URL=https://login.microsoftonline.com/ca4f78d4-c753-4893-9cd8-1b309922b4dc
MICROSOFT_CLIENT_ID=479e2a01-70ab-4df9-baa4-560d317c3423
MICROSOFT_CLIENT_SECRET=<secret>
```

Add to Azure Key Vault or `.env.prod`:
```bash
az keyvault secret set --vault-name greenchainz-kv --name AZURE-DOCUMENT-INTELLIGENCE-ENDPOINT --value "..."
# Repeat for all vars
```

**Step 2: Run Database Migrations**

```bash
DATABASE_URL="<your-prod-db>" npm run db:migrate
# Verifies: 0030, 0031, 0032 migrations apply successfully
```

Check that tables exist:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('architect_uploaded_specs', 'architect_spec_assemblies', 'epd_materials');
```

**Step 3: Build Docker Image**

```bash
docker build -t greenchainz:latest .
docker tag greenchainz:latest <your-registry>.azurecr.io/greenchainz:latest
docker push <your-registry>.azurecr.io/greenchainz:latest
```

**Step 4: Deploy to Container Apps**

```bash
az containerapp update \
  --resource-group greenchainz-rg \
  --name greenchainz-app \
  --image <your-registry>.azurecr.io/greenchainz:latest
```

**Step 5: Smoke Test**

```bash
# Wait 2 minutes for container to start
curl https://greenchainz.com/api/health
# Should return 200 OK

# Test login
curl -X GET https://greenchainz.com/.auth/me
# Should redirect or return user info
```

**Step 6: Manual Test**

1. Navigate to https://greenchainz.com/architect/specs/upload
2. Log in (Azure Entra ID)
3. Upload test PDF
4. Run matcher
5. Generate RFQ (PDF)
6. Verify it works end-to-end

**Success criteria:**
- [ ] All env vars set in Key Vault
- [ ] Migrations run without errors
- [ ] Docker image builds and pushes
- [ ] Container App deploys successfully
- [ ] `/architect/specs/upload` loads
- [ ] Login works (Azure Entra ID)
- [ ] Upload flow works end-to-end
- [ ] No 500 errors in browser console

---

## Summary

| Prompt | Task | Time | Owner |
|--------|------|------|-------|
| 1 | Category Baseline Service | 1 hr | Other AI |
| 2 | Material Properties Seed | 1 hr | Other AI |
| 3 | UI Polish (Error/Loading/Empty) | 2 hrs | Other AI |
| 4 | E2E Testing | 3 hrs | Other AI |
| 5 | Deployment | 1 hr | Other AI |
| **Total** | | **8 hrs** | |

Each prompt is self-contained. The AI can execute without understanding the full architecture.

**What Claude (you) will do in parallel:**
- Phase 1: CCPS v2 Scorer (2 hrs)
- Phase 3: RFQ Generator (4 hrs)
- Total: 6.5 hrs

**Critical path: You finish your work, other AI finishes theirs → MVP ships.**
