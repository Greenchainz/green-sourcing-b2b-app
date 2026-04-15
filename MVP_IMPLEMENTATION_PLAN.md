# MVP Implementation Plan — Full Scope (9-13 hours)

**Target:** Ship working MVP so architects can upload embodied carbon tables → see alternatives → generate RFQs

**Status:** Task list created, ready to execute

---

## Phase 0: Blocker Checks (30 mins)

Must verify these before starting heavy lifting.

**Task 1: Check @/lib/utils cn() function**
```bash
grep -n "export.*cn" lib/utils.ts
```
If missing, create:
```typescript
// lib/utils.ts
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}
```
**Why:** Button component uses `cn()` for className merging.

**Task 2: Verify Azure Document Intelligence**
Check `.env.local` has:
```
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=https://<region>.cognitiveservices.azure.com/
AZURE_DOCUMENT_INTELLIGENCE_KEY=<key>
```
Test by running:
```bash
npm run dev
curl -X POST http://localhost:3001/trpc/architectSpec.uploadAndParse \
  -H "Content-Type: application/json" \
  -d '{"fileBufferBase64":"...", "blobUrl":"...", ...}'
```

**Task 3: Verify Forge Storage API**
Check `.env.local`:
```
BUILT_IN_FORGE_API_URL=<your-url>
BUILT_IN_FORGE_API_KEY=<your-key>
```
**Task 4: Verify Database**
```bash
npm run db:studio
# Check tables exist:
# - architect_uploaded_specs
# - architect_spec_assemblies
# - epd_materials
# - material_credit_scores
```

---

## Phase 1: CCPS v2 Scoring (2 hours)

**Task 5: Create CCPS v2 Scorer Service**

File: `server/services/ccps-v2-scorer.ts`

```typescript
interface Factor {
  name: 'carbon' | 'compliance' | 'cost' | 'health';
  score: number; // 0-100
}

interface CCPS {
  total: number; // 0-100
  breakdown: Record<string, number>;
}

export async function computeCCPS(
  materialId: number,
  persona: 'aor' | 'leed_ap' | 'gc_pm' | 'spec_writer',
): Promise<CCPS>
```

**Carbon Score (S_carbon) 0-100:**
- Get `baseline_gwp` for material's assembly_type
- Get `gwp_per_1000sf` from material
- Formula: `max(0, min(100, 50 + (baseline_gwp - material_gwp) / baseline_gwp × 50))`
- Baseline = 50, -50% carbon = 100, +50% carbon = 0

**Compliance Score (S_compliance) 0-100, additive:**
- Valid EPD (not expired): +25 pts
- ASTM/ISO standard documented: +25 pts
- Title 24 compliant: +15 pts
- IECC compliant: +15 pts
- Fire rating documented: +10 pts
- VOC compliant: +10 pts
- **Max 100 pts**

**Cost Score (S_cost) 0-100:**
- Get category average price from epd_materials
- Get material price_per_unit
- Formula: `max(0, min(100, 50 + (avg_price - material_price) / avg_price × 50))`
- At average = 50, lower cost = higher score

**Health Score (S_health) 0-100, additive:**
- VOC below CDPH v1.2: +30 pts
- Not on Red List (not_on_red_list=true): +25 pts
- HPD available with full disclosure: +20 pts
- GREENGUARD Gold certified: +15 pts
- Antimicrobial documented: +10 pts
- **Max 100 pts**

**Persona Weights:**
```typescript
const weights = {
  aor: { carbon: 0.35, compliance: 0.30, cost: 0.15, health: 0.20 },
  leed_ap: { carbon: 0.40, compliance: 0.20, cost: 0.05, health: 0.35 },
  gc_pm: { carbon: 0.15, compliance: 0.25, cost: 0.50, health: 0.10 },
  spec_writer: { carbon: 0.30, compliance: 0.35, cost: 0.10, health: 0.25 },
};

CCPS = weights.carbon × S_carbon 
     + weights.compliance × S_compliance 
     + weights.cost × S_cost 
     + weights.health × S_health
```

**Task 6: Add Category Baseline Logic**

File: `server/services/category-baseline.ts`

For each assembly_type (EWS-1A, EWS-1B, etc.), compute median GWP:
```typescript
export async function getCategoryBaseline(assemblyType: string): Promise<number> {
  const materials = await db
    .select({ gwp: epdMaterials.gwpPer1000sf })
    .from(epdMaterials)
    .where(eq(epdMaterials.assemblyType, assemblyType));
  
  // Return median GWP
  return median(materials.map(m => parseFloat(m.gwp)));
}
```

**Task 7: Wire CCPS into Matcher**

File: `server/services/architect-spec-matcher.ts`

Replace:
```typescript
const score = await computeMcs(c.id);
```

With:
```typescript
const score = await computeCCPS(c.id, input.persona);
```

Update return type to include all 4 factor breakdowns.

---

## Phase 2: Material Properties (1 hour)

**Task 8: Add Material Property Columns**

File: `drizzle/0032_material_properties.sql`

```sql
ALTER TABLE epd_materials ADD COLUMN IF NOT EXISTS installability_hrs_sf DECIMAL(5,2);
ALTER TABLE epd_materials ADD COLUMN IF NOT EXISTS hardness_mohs DECIMAL(3,1);
ALTER TABLE epd_materials ADD COLUMN IF NOT EXISTS leed_credits JSONB;
ALTER TABLE epd_materials ADD COLUMN IF NOT EXISTS lifespan_years INTEGER;

-- Example data structure for leed_credits:
-- {"MR_3_1": {"name": "Recycled Content", "points": 1}, "MR_3_2": {"name": "Regional", "points": 1}}
```

**Task 9: Seed Test Data**

For 10 test materials, populate:
```typescript
// Example
{
  installability_hrs_sf: 1.5,    // Granite = harder than drywall
  hardness_mohs: 7.0,             // Granite = 7, Limestone = 3
  leed_credits: {
    "MR_3_1": {"points": 1},      // 10% recycled content
    "MR_3_2": {"points": 1}       // Regional sourcing
  },
  lifespan_years: 50              // How long before replacement
}
```

---

## Phase 3: RFQ Generator (4 hours)

**Task 10: RFQ PDF Generator**

File: `server/services/rfq-pdf-generator.ts`

Use **Weasy Print** or **FPDF2** (Python) via subprocess.

Output sections:
1. **Header** — Project name, date, architect firm, RFQ number
2. **Assembly Specification** — Interior/exterior/core layer breakdown
3. **Material Details** — Product name, manufacturer, EPD #, dimensions
4. **Sustainability Metrics** — GWP/1000sf, carbon delta, LEED credits
5. **Compliance Summary** — Fire rating, ASTM standards, code compliance checklist
6. **Certification Checklist** — EPD ✓, HPD ✓, GREENGUARD ✓, FSC ✓, etc.
7. **Material Properties** — Hardness, installability, lifespan, cost
8. **Supplier Information** — Contact, lead time, regional availability, MOQ
9. **Cost Estimate** — Price per unit × quantity estimate

**Task 11: RFQ Excel Generator**

File: `server/services/rfq-excel-generator.ts`

Use **OpenPyXL** (Python) or **ExcelJS** (Node).

Sheets:
1. **Cover** — Project info
2. **Assemblies** — Table of all assembly alternatives with CCPS scores
3. **Materials** — Detailed material spec sheet (one row per material)
4. **Compliance** — Code requirements checklist
5. **Sourcing** — Lead time, availability, MOQ

**Task 12: RFQ Revit Generator**

File: `server/services/rfq-revit-generator.ts`

Output as CSV that Revit can import as a schedule:
```
Material_ID,Product_Name,Manufacturer,Assembly_Type,GWP_Per_1000SF,Fire_Rating,ASTM_Standard,Lead_Time_Days,Price_Per_Unit,Lifespan_Years
```

**Task 13: Wire RFQ Endpoints**

File: `server/routers/architect-spec.ts`

Add:
```typescript
generateRfq: protectedProcedure
  .input(z.object({ 
    specId: z.number(),
    format: z.enum(['pdf', 'excel', 'revit'])
  }))
  .mutation(async ({ input, ctx }) => {
    // Verify spec ownership
    // Get spec + all matched alternatives
    // Call appropriate generator
    // Return blob URL or download stream
  })
```

---

## Phase 4: UI Polish (2 hours)

**Task 14: Error State UI**

In `app/architect/specs/[specId]/page.tsx`:
```typescript
if (spec.parseStatus === 'failed') {
  return (
    <Card className="border-red-200 bg-red-50">
      <CardContent>
        <AlertCircle className="text-red-600" />
        <p>Failed to parse spec</p>
        <Button onClick={() => router.push('/architect/specs/upload')}>
          Try uploading again
        </Button>
      </CardContent>
    </Card>
  );
}
```

**Task 15: Loading Skeleton**

While matcher is running:
```typescript
{matchAlternativesMutation.isPending && (
  <div className="space-y-4">
    {[...Array(5)].map((_, i) => (
      <Skeleton key={i} className="h-32 w-full" />
    ))}
  </div>
)}
```

**Task 16: Empty State**

When no alternatives found:
```typescript
{alternatives.length === 0 && (
  <Card>
    <CardContent className="text-center pt-12">
      <AlertCircle className="mx-auto h-8 w-8 text-gray-400 mb-4" />
      <p>No alternatives found matching your constraints</p>
      <p className="text-sm text-gray-500">Try adjusting filters or persona</p>
    </CardContent>
  </Card>
)}
```

**Task 17: Responsive Design Test**

- [ ] Upload page works on mobile (button, form fields stack)
- [ ] Results page shows alternatives in single column on mobile
- [ ] Filter buttons wrap on tablet
- [ ] All text readable without horizontal scroll

---

## Phase 5: Testing (3 hours)

**Task 18: E2E Test — Upload Flow**

1. Go to `/architect/specs/upload`
2. Select real PDF embodied carbon table (from test fixtures)
3. Fill project metadata
4. Click "Upload & Analyze"
5. **Verify:**
   - Progress bar animates 25% → 50% → 75% → 100%
   - Toast: "Spec uploaded and parsed successfully!"
   - Redirects to `/architect/specs/[specId]`
   - Page shows parsed assembly rows
   - Parse status = "ready"

**Task 19: E2E Test — Matching**

1. On results page, select persona (LEED AP recommended)
2. Click "Run Material Matcher"
3. **Verify:**
   - Toast: "Running material matching algorithm..."
   - Alternatives load (top 5 per assembly)
   - Each shows: rank, product name, GWP/1000sf, carbon delta %, CCPS score
   - "Match Confidence" bar shows (CCPS/100)

**Task 20: E2E Test — RFQ Generation**

1. On results page, click "Generate RFQ"
2. Choose format (PDF, Excel, Revit)
3. **Verify:**
   - PDF opens and displays all sections (header, materials, compliance, sourcing)
   - Excel downloads with correct sheets + data
   - Revit CSV has all columns with values
   - All material specs populated correctly

**Task 21: Test Azure Document Intelligence**

1. Use sample embodied carbon table PDFs (or create test fixture)
2. Run `parseArchitectSpec()` directly
3. **Verify:**
   - Extracts assembly codes correctly (EWS-1A, EWS-2B, etc.)
   - Parses GWP values (handles various units: kgCO₂e/kg, /m2, /m3, /1000sf)
   - Classifies structural options (1, 2, 3)
   - Handles parsing errors gracefully (sets status = "failed")

**Task 22: Test Forge Storage**

1. Upload test file via `uploadFile()` endpoint
2. **Verify:**
   - File stored successfully
   - Blob URL returned
   - URL is publicly accessible
   - File can be downloaded

**Task 23: Fix Bugs**

Document any failures from above tests. Fix before proceeding to deployment.

---

## Phase 6: Deployment (1 hour)

**Task 24: Set Environment Variables**

In Azure Key Vault (or `.env.prod`):
```
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=...
AZURE_DOCUMENT_INTELLIGENCE_KEY=...
BUILT_IN_FORGE_API_URL=...
BUILT_IN_FORGE_API_KEY=...
DATABASE_URL=...
OAUTH_SERVER_URL=...
MICROSOFT_CLIENT_ID=...
MICROSOFT_CLIENT_SECRET=...
```

**Task 25: Run Database Migrations**

```bash
DATABASE_URL=... npm run db:migrate
# Verifies: 0030_mcs_enums.sql → 0031_mcs_tables.sql → 0032_material_properties.sql
```

**Task 26: Build & Deploy**

```bash
docker build -t greenchainz:latest .
az acr build --registry <your-registry> --image greenchainz:latest .
# Deploy to Azure Container Apps
```

**Task 27: Smoke Test on Prod**

1. Navigate to `https://greenchainz.com/architect/specs/upload`
2. Log in (Azure Entra ID)
3. Upload test PDF
4. Verify flow works end-to-end
5. Generate sample RFQ

---

## Time Breakdown

| Phase | Task | Time | Status |
|-------|------|------|--------|
| 0 | Blocker Checks | 0.5 hr | Pending |
| 1 | CCPS v2 Scorer (3 tasks) | 2 hrs | Pending |
| 2 | Material Properties (2 tasks) | 1 hr | Pending |
| 3 | RFQ Generators (4 tasks) | 4 hrs | Pending |
| 4 | UI Polish (4 tasks) | 2 hrs | Pending |
| 5 | Testing (6 tasks) | 3 hrs | Pending |
| 6 | Deployment (4 tasks) | 1 hr | Pending |
| **TOTAL** | | **13.5 hrs** | |

---

## Go/No-Go Checkpoints

After each phase, verify:
- ✅ Phase 0: Blockers resolved
- ✅ Phase 1: CCPS scorer computes correctly for all personas
- ✅ Phase 2: Material properties schema in place, sample data seeded
- ✅ Phase 3: All RFQ formats generate without errors
- ✅ Phase 4: UI renders correctly on all screen sizes
- ✅ Phase 5: All E2E tests pass
- ✅ Phase 6: Production deployment accessible and working

---

## Success Criteria for MVP

An architect should be able to:

1. ✅ Navigate to `/architect/specs/upload`
2. ✅ Upload embodied carbon table (PDF/XLSX)
3. ✅ See parsed assembly rows
4. ✅ Select architect persona
5. ✅ Click "Run Material Matcher" and see top 5 alternatives per assembly
6. ✅ See CCPS score, carbon delta %, and material properties for each alternative
7. ✅ Click "Generate RFQ" and download PDF/Excel with all specs + compliance checklist
8. ✅ Send RFQ to suppliers

**That's the MVP. Ship it.**

---

## Next Phase (After MVP)

- [ ] Path 2: Search/filter interface (no upload needed)
- [ ] Add category baseline data (compute for all assembly types)
- [ ] Supplier contact integration (auto-fill RFQ recipient)
- [ ] RFQ tracking (view response status)
- [ ] Revit plugin (in-workflow material lookup)
- [ ] Intercom integration (real-time supplier messaging)

