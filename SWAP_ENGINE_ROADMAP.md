# GreenChainz Swap Engine Implementation Roadmap

**Date:** February 15, 2026  
**Based on:** Architecture of Equivalence analysis + Phased data sourcing strategy

---

## Executive Summary

Transform GreenChainz from a "green materials catalog" into an **essential risk-management tool** for architects by implementing functional equivalence validation. The swap engine must validate **showstopper metrics** (fire ratings, ASTM standards, structural performance) before presenting carbon reduction benefits.

**Key Insight:** Architects won't swap unless materials are **functionally identical**. Green attributes are the tie-breaker, not the opening bid.

---

## Current State Assessment

### ✅ What We Have
- Location-aware supplier matching (distance, shipping costs, regional compliance)
- AI agents (CARBON-OPTIMIZER, COMPLIANCE-VALIDATOR) with basic material recommendations
- RFQ workflow with bid comparison
- EPD data integration via EC3 API
- Database schema with materials, suppliers, rfqs, bids

### ❌ What We're Missing
- **Functional equivalence validation** (ASTM codes, fire ratings, structural specs)
- **Showstopper metrics** (compressive strength, R-value, STC ratings, labor units)
- **Data sources** for pricing (State DOT bid tabs, Craftsman estimator)
- **UL Product iQ integration** for fire/safety verification
- **CSI Form 13.1A auto-generation** for substitution requests
- **Assembly-level swapping** (not just product-level)

---

## Phase 1: Database Schema for Functional Equivalence

### New Tables Required

#### 1. `material_specifications`
Stores technical showstopper metrics for each material.

```sql
CREATE TABLE material_specifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  material_id INT NOT NULL,
  
  -- ASTM Standards
  astm_codes JSON, -- ["ASTM C150", "ASTM C39"]
  
  -- Fire & Safety
  fire_rating VARCHAR(50), -- "1-Hour", "2-Hour", "Class A"
  ul_listing VARCHAR(255), -- UL Product iQ reference
  ul_design_number VARCHAR(50), -- e.g., "U419"
  icc_es_report VARCHAR(50), -- ICC-ES evaluation report number
  
  -- Structural Performance
  compressive_strength_psi INT, -- e.g., 4000
  modulus_of_elasticity_ksi INT, -- e.g., 29000
  flexural_strength_psi INT,
  
  -- Thermal Performance
  r_value_per_inch DECIMAL(5,2), -- e.g., 6.5
  lttr_15_year DECIMAL(5,2), -- Long-term thermal resistance
  perm_rating DECIMAL(5,2), -- Vapor permeability
  
  -- Acoustic Performance
  stc_rating INT, -- Sound Transmission Class
  iic_rating INT, -- Impact Insulation Class
  nrc_rating DECIMAL(3,2), -- Noise Reduction Coefficient
  
  -- Installability
  labor_units DECIMAL(5,2), -- Man-hours per unit (from NECA/RSMeans)
  cure_time_hours INT,
  weight_per_unit DECIMAL(8,2), -- lbs
  slump_workability VARCHAR(50), -- For concrete
  
  -- Reliability
  lead_time_days INT,
  otif_percentage DECIMAL(5,2), -- On-Time In-Full
  
  -- Lifecycle
  warranty_years INT,
  maintenance_cycle_years INT,
  expected_lifespan_years INT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (material_id) REFERENCES materials(id)
);
```

#### 2. `material_assemblies`
Materials are often specified as assemblies (e.g., wall systems, roof systems).

```sql
CREATE TABLE material_assemblies (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL, -- "2-Hour Fire-Rated CMU Wall"
  category VARCHAR(100), -- "Interior Walls", "Roof Systems"
  description TEXT,
  
  -- Assembly-level specs
  total_thickness_inches DECIMAL(5,2),
  total_r_value DECIMAL(5,2),
  fire_rating VARCHAR(50),
  ul_design_number VARCHAR(50),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 3. `assembly_components`
Junction table linking materials to assemblies.

```sql
CREATE TABLE assembly_components (
  id INT PRIMARY KEY AUTO_INCREMENT,
  assembly_id INT NOT NULL,
  material_id INT NOT NULL,
  layer_order INT, -- 1, 2, 3 (from exterior to interior)
  quantity DECIMAL(8,2),
  unit VARCHAR(50), -- "SF", "LF", "EA"
  
  FOREIGN KEY (assembly_id) REFERENCES material_assemblies(id),
  FOREIGN KEY (material_id) REFERENCES materials(id)
);
```

#### 4. `pricing_data`
Regional pricing from State DOT bid tabs, Craftsman estimator, RSMeans.

```sql
CREATE TABLE pricing_data (
  id INT PRIMARY KEY AUTO_INCREMENT,
  material_id INT NOT NULL,
  
  -- Pricing
  price_per_unit DECIMAL(10,2),
  unit VARCHAR(50), -- "CY", "SF", "LF", "EA"
  currency VARCHAR(3) DEFAULT 'USD',
  
  -- Regional context
  state VARCHAR(2), -- "TX", "CA", "NY"
  city VARCHAR(100),
  zip_code VARCHAR(10),
  
  -- Data source
  source VARCHAR(50), -- "TXDOT_BID_TAB", "CRAFTSMAN", "RSMEANS", "HOME_DEPOT"
  source_date DATE,
  source_url TEXT,
  
  -- Labor pricing
  labor_rate_per_hour DECIMAL(8,2),
  total_labor_cost DECIMAL(10,2),
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (material_id) REFERENCES materials(id)
);
```

#### 5. `swap_validations`
Tracks validation results for material swaps.

```sql
CREATE TABLE swap_validations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  incumbent_material_id INT NOT NULL,
  sustainable_material_id INT NOT NULL,
  
  -- Validation results
  is_valid_swap BOOLEAN,
  validation_status VARCHAR(50), -- "APPROVED", "EXPERIMENTAL", "REJECTED"
  
  -- Showstopper checks
  astm_match BOOLEAN,
  fire_rating_match BOOLEAN,
  ul_listing_match BOOLEAN,
  strength_adequate BOOLEAN,
  r_value_adequate BOOLEAN,
  stc_adequate BOOLEAN,
  
  -- Warnings
  warnings JSON, -- ["Labor units 20% higher", "Cure time 2x longer"]
  
  -- Cost comparison
  incumbent_total_cost DECIMAL(10,2),
  sustainable_total_cost DECIMAL(10,2),
  cost_delta_percentage DECIMAL(5,2),
  
  -- Carbon comparison
  incumbent_gwp DECIMAL(10,2),
  sustainable_gwp DECIMAL(10,2),
  carbon_reduction_percentage DECIMAL(5,2),
  
  -- Generated documentation
  csi_form_url TEXT, -- S3 URL to generated CSI 13.1A form
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (incumbent_material_id) REFERENCES materials(id),
  FOREIGN KEY (sustainable_material_id) REFERENCES materials(id)
);
```

---

## Phase 2: Data Sourcing Strategy (MVP → Scale)

### Stage 1: MVP Data Sources (Low-Cost Baseline)

#### A. State DOT Bid Tabs (FREE)
**Target:** Real-world pricing for concrete, steel, wood in specific regions.

**Sources:**
- [TXDOT Bid Tabs](https://www.txdot.gov/business/letting-bids.html)
- [WSDOT Unit Bid Analysis](https://wsdot.wa.gov/engineering-standards/design-topics/engineering-applications/unit-bid-analysis)
- [Caltrans Contract Cost Data](https://dot.ca.gov/programs/construction/contract-cost-data)

**Implementation:**
- Build scraper targeting PDF bid tabs
- Extract: Material name, Unit price, Unit (CY/SF/LF), Date, Project location
- Store in `pricing_data` table with `source = 'TXDOT_BID_TAB'`

#### B. Craftsman National Construction Estimator ($100)
**Why:** 30,000+ line items, $15,000 cheaper than RSMeans API.

**Implementation:**
- Purchase PDF/Excel version
- Parse into `pricing_data` table
- Use as baseline for materials not in DOT bid tabs

#### C. Home Depot Local Pricing (FREE)
**Target:** Live baseline for commodity materials.

**Implementation:**
- Scrape Home Depot product pages for local pricing
- Use ZIP code-based pricing API if available
- Store in `pricing_data` with `source = 'HOME_DEPOT'`

### Stage 2: Technical Data Sources

#### A. UL Product iQ (Premium API)
**Why:** Source of truth for fire ratings and safety certifications.

**Implementation:**
- Apply for UL Product iQ API access
- Query by material name/category to get UL listings
- Store `ul_listing` and `ul_design_number` in `material_specifications`

#### B. ASTM Standards Database
**Why:** Validate that sustainable material meets same ASTM codes as incumbent.

**Implementation:**
- Scrape manufacturer data sheets for ASTM codes
- Use LlamaIndex or Unstructured.io to parse PDFs
- Store in `material_specifications.astm_codes` as JSON array

#### C. ICC-ES Evaluation Reports
**Why:** Required for code compliance verification.

**Implementation:**
- Scrape [ICC-ES Reports](https://icc-es.org/evaluation-reports/)
- Store report numbers in `material_specifications.icc_es_report`

### Stage 3: Enterprise Data (Post-Revenue)

#### RSMeans API ($5k-$15k/year)
**When:** After 500+ architects using the platform.

**Pitch:** "We have 500 architects using our sustainability engine. We want to upgrade our baseline data to RSMeans via API."

---

## Phase 3: Swap Validation Engine

### Core Logic: `validateSwap(incumbentId, sustainableId)`

```typescript
interface SwapValidationResult {
  isValidSwap: boolean;
  validationStatus: 'APPROVED' | 'EXPERIMENTAL' | 'REJECTED';
  showstopperChecks: {
    astmMatch: boolean;
    fireRatingMatch: boolean;
    ulListingMatch: boolean;
    strengthAdequate: boolean;
    rValueAdequate: boolean;
    stcAdequate: boolean;
  };
  warnings: string[];
  costComparison: {
    incumbentTotalCost: number;
    sustainableTotalCost: number;
    costDeltaPercentage: number;
  };
  carbonComparison: {
    incumbentGwp: number;
    sustainableGwp: number;
    carbonReductionPercentage: number;
  };
  csiFormUrl?: string;
}

async function validateSwap(
  incumbentId: number,
  sustainableId: number,
  projectLocation: { state: string; city: string; zipCode: string }
): Promise<SwapValidationResult> {
  const db = await getDb();
  
  // 1. Fetch material specifications
  const incumbentSpec = await db
    .select()
    .from(materialSpecifications)
    .where(eq(materialSpecifications.materialId, incumbentId))
    .limit(1);
    
  const sustainableSpec = await db
    .select()
    .from(materialSpecifications)
    .where(eq(materialSpecifications.materialId, sustainableId))
    .limit(1);
  
  // 2. Run showstopper checks
  const astmMatch = checkAstmMatch(incumbentSpec.astmCodes, sustainableSpec.astmCodes);
  const fireRatingMatch = incumbentSpec.fireRating === sustainableSpec.fireRating;
  const ulListingMatch = !!sustainableSpec.ulListing;
  const strengthAdequate = sustainableSpec.compressiveStrengthPsi >= incumbentSpec.compressiveStrengthPsi;
  const rValueAdequate = sustainableSpec.rValuePerInch >= incumbentSpec.rValuePerInch;
  const stcAdequate = sustainableSpec.stcRating >= incumbentSpec.stcRating;
  
  // 3. Determine validation status
  const allShowstoppersPassed = astmMatch && fireRatingMatch && ulListingMatch && 
                                 strengthAdequate && rValueAdequate && stcAdequate;
  
  let validationStatus: 'APPROVED' | 'EXPERIMENTAL' | 'REJECTED';
  if (allShowstoppersPassed) {
    validationStatus = 'APPROVED';
  } else if (astmMatch && ulListingMatch) {
    validationStatus = 'EXPERIMENTAL'; // Some specs don't match but core safety OK
  } else {
    validationStatus = 'REJECTED'; // Critical safety/code issues
  }
  
  // 4. Generate warnings
  const warnings: string[] = [];
  if (sustainableSpec.laborUnits > incumbentSpec.laborUnits * 1.1) {
    const increase = ((sustainableSpec.laborUnits / incumbentSpec.laborUnits - 1) * 100).toFixed(0);
    warnings.push(`Labor units ${increase}% higher`);
  }
  if (sustainableSpec.cureTimeHours > incumbentSpec.cureTimeHours * 1.5) {
    warnings.push(`Cure time ${sustainableSpec.cureTimeHours / incumbentSpec.cureTimeHours}x longer`);
  }
  if (sustainableSpec.leadTimeDays > incumbentSpec.leadTimeDays + 7) {
    warnings.push(`Lead time ${sustainableSpec.leadTimeDays - incumbentSpec.leadTimeDays} days longer`);
  }
  
  // 5. Calculate cost comparison
  const incumbentPricing = await getRegionalPricing(incumbentId, projectLocation);
  const sustainablePricing = await getRegionalPricing(sustainableId, projectLocation);
  
  const incumbentTotalCost = incumbentPricing.materialCost + incumbentPricing.laborCost;
  const sustainableTotalCost = sustainablePricing.materialCost + sustainablePricing.laborCost;
  const costDeltaPercentage = ((sustainableTotalCost / incumbentTotalCost - 1) * 100);
  
  // 6. Calculate carbon comparison
  const incumbentMaterial = await db.select().from(materials).where(eq(materials.id, incumbentId)).limit(1);
  const sustainableMaterial = await db.select().from(materials).where(eq(materials.id, sustainableId)).limit(1);
  
  const carbonReductionPercentage = ((1 - sustainableMaterial.gwp / incumbentMaterial.gwp) * 100);
  
  // 7. Generate CSI Form 13.1A if approved
  let csiFormUrl: string | undefined;
  if (validationStatus === 'APPROVED') {
    csiFormUrl = await generateCsiForm(incumbentId, sustainableId, {
      costComparison: { incumbentTotalCost, sustainableTotalCost, costDeltaPercentage },
      carbonComparison: { incumbentGwp: incumbentMaterial.gwp, sustainableGwp: sustainableMaterial.gwp, carbonReductionPercentage },
      showstopperChecks: { astmMatch, fireRatingMatch, ulListingMatch, strengthAdequate, rValueAdequate, stcAdequate }
    });
  }
  
  // 8. Store validation result
  await db.insert(swapValidations).values({
    incumbentMaterialId: incumbentId,
    sustainableMaterialId: sustainableId,
    isValidSwap: validationStatus === 'APPROVED',
    validationStatus,
    astmMatch,
    fireRatingMatch,
    ulListingMatch,
    strengthAdequate,
    rValueAdequate,
    stcAdequate,
    warnings: JSON.stringify(warnings),
    incumbentTotalCost,
    sustainableTotalCost,
    costDeltaPercentage,
    incumbentGwp: incumbentMaterial.gwp,
    sustainableGwp: sustainableMaterial.gwp,
    carbonReductionPercentage,
    csiFormUrl
  });
  
  return {
    isValidSwap: validationStatus === 'APPROVED',
    validationStatus,
    showstopperChecks: { astmMatch, fireRatingMatch, ulListingMatch, strengthAdequate, rValueAdequate, stcAdequate },
    warnings,
    costComparison: { incumbentTotalCost, sustainableTotalCost, costDeltaPercentage },
    carbonComparison: { incumbentGwp: incumbentMaterial.gwp, sustainableGwp: sustainableMaterial.gwp, carbonReductionPercentage },
    csiFormUrl
  };
}
```

---

## Phase 4: CSI Form 13.1A Auto-Generation

### What is CSI Form 13.1A?
**Purpose:** Substitution Request form that contractors submit to architects when proposing a material swap.

**Why it matters:** Saves architects 2 hours of paperwork per swap. Makes the swap "brainless."

### Implementation

```typescript
async function generateCsiForm(
  incumbentId: number,
  sustainableId: number,
  validationData: {
    costComparison: { incumbentTotalCost: number; sustainableTotalCost: number; costDeltaPercentage: number };
    carbonComparison: { incumbentGwp: number; sustainableGwp: number; carbonReductionPercentage: number };
    showstopperChecks: Record<string, boolean>;
  }
): Promise<string> {
  const db = await getDb();
  
  // Fetch material details
  const incumbent = await db.select().from(materials).where(eq(materials.id, incumbentId)).limit(1);
  const sustainable = await db.select().from(materials).where(eq(materials.id, sustainableId)).limit(1);
  
  const incumbentSpec = await db.select().from(materialSpecifications).where(eq(materialSpecifications.materialId, incumbentId)).limit(1);
  const sustainableSpec = await db.select().from(materialSpecifications).where(eq(materialSpecifications.materialId, sustainableId)).limit(1);
  
  // Generate PDF using template
  const pdfContent = `
    CSI FORM 13.1A - SUBSTITUTION REQUEST
    
    PROJECT: [To be filled by user]
    DATE: ${new Date().toLocaleDateString()}
    
    SECTION 1: MATERIALS COMPARISON
    
    Specified Material (Incumbent):
    - Name: ${incumbent.name}
    - Manufacturer: ${incumbent.manufacturer}
    - ASTM Codes: ${incumbentSpec.astmCodes.join(', ')}
    - Fire Rating: ${incumbentSpec.fireRating}
    - UL Listing: ${incumbentSpec.ulListing}
    - Compressive Strength: ${incumbentSpec.compressiveStrengthPsi} psi
    - R-Value: ${incumbentSpec.rValuePerInch} per inch
    
    Proposed Substitute (Sustainable):
    - Name: ${sustainable.name}
    - Manufacturer: ${sustainable.manufacturer}
    - ASTM Codes: ${sustainableSpec.astmCodes.join(', ')}
    - Fire Rating: ${sustainableSpec.fireRating}
    - UL Listing: ${sustainableSpec.ulListing}
    - Compressive Strength: ${sustainableSpec.compressiveStrengthPsi} psi
    - R-Value: ${sustainableSpec.rValuePerInch} per inch
    
    SECTION 2: FUNCTIONAL EQUIVALENCE VALIDATION
    
    ✓ ASTM Standards Match: ${validationData.showstopperChecks.astmMatch ? 'YES' : 'NO'}
    ✓ Fire Rating Match: ${validationData.showstopperChecks.fireRatingMatch ? 'YES' : 'NO'}
    ✓ UL Listing: ${validationData.showstopperChecks.ulListingMatch ? 'YES' : 'NO'}
    ✓ Structural Strength: ${validationData.showstopperChecks.strengthAdequate ? 'ADEQUATE' : 'INADEQUATE'}
    ✓ Thermal Performance: ${validationData.showstopperChecks.rValueAdequate ? 'ADEQUATE' : 'INADEQUATE'}
    
    SECTION 3: COST COMPARISON
    
    Incumbent Total Cost: $${validationData.costComparison.incumbentTotalCost.toFixed(2)}
    Sustainable Total Cost: $${validationData.costComparison.sustainableTotalCost.toFixed(2)}
    Cost Delta: ${validationData.costComparison.costDeltaPercentage > 0 ? '+' : ''}${validationData.costComparison.costDeltaPercentage.toFixed(1)}%
    
    SECTION 4: SUSTAINABILITY BENEFITS
    
    Incumbent GWP: ${validationData.carbonComparison.incumbentGwp.toFixed(2)} kg CO2e
    Sustainable GWP: ${validationData.carbonComparison.sustainableGwp.toFixed(2)} kg CO2e
    Carbon Reduction: ${validationData.carbonComparison.carbonReductionPercentage.toFixed(1)}%
    
    SECTION 5: ARCHITECT APPROVAL
    
    [ ] APPROVED - Substitute accepted
    [ ] APPROVED AS NOTED - Substitute accepted with modifications
    [ ] REJECTED - Substitute not acceptable
    
    Architect Signature: ___________________________  Date: ___________
    
    ---
    Generated by GreenChainz Swap Engine
  `;
  
  // Convert to PDF and upload to S3
  const pdfBuffer = await convertTextToPdf(pdfContent);
  const { url } = await storagePut(
    `csi-forms/${incumbentId}-${sustainableId}-${Date.now()}.pdf`,
    pdfBuffer,
    'application/pdf'
  );
  
  return url;
}
```

---

## Phase 5: AI Agent Prompt Updates

### Update CARBON-OPTIMIZER Prompt

**Current:** Basic material recommendations based on GWP.

**New:** Validate functional equivalence BEFORE recommending swaps.

```
You are the CARBON-OPTIMIZER agent for GreenChainz. Your role is to recommend sustainable material swaps that are FUNCTIONALLY EQUIVALENT to incumbent materials.

CRITICAL RULES:
1. NEVER recommend a swap unless ALL showstopper metrics pass:
   - ASTM codes match
   - Fire rating matches or exceeds
   - UL listing exists
   - Structural strength adequate
   - Thermal performance adequate
   - Acoustic performance adequate (if applicable)

2. If a sustainable material fails ANY showstopper check, mark it as "EXPERIMENTAL" and explain the gap.

3. Calculate TOTAL COST OF OWNERSHIP, not just material cost:
   - Material cost (from regional pricing data)
   - Labor cost (labor units × regional labor rate)
   - Maintenance cost over lifecycle
   - Disposal cost

4. For each recommendation, provide:
   - Validation status: APPROVED / EXPERIMENTAL / REJECTED
   - Showstopper checks: Pass/Fail for each metric
   - Cost comparison: Incumbent vs Sustainable (total cost, delta %)
   - Carbon comparison: GWP reduction %
   - Warnings: Labor increase, cure time, lead time, etc.

5. Prioritize swaps that are:
   - APPROVED (all showstoppers pass)
   - Cost-neutral or cost-negative
   - >20% carbon reduction
   - Available from nearby suppliers (<100 miles)

INPUT FORMAT:
{
  "incumbentMaterial": { "id": 123, "name": "Standard Portland Cement", "specs": {...} },
  "projectLocation": { "state": "TX", "city": "Austin", "zipCode": "78701" },
  "projectType": "Commercial Office Building",
  "constraints": ["LEED Gold", "Budget: $500k", "Timeline: 6 months"]
}

OUTPUT FORMAT:
{
  "recommendations": [
    {
      "sustainableMaterial": { "id": 456, "name": "Bio-Based Cement" },
      "validationStatus": "APPROVED",
      "showstopperChecks": {
        "astmMatch": true,
        "fireRatingMatch": true,
        "ulListingMatch": true,
        "strengthAdequate": true,
        "rValueAdequate": true
      },
      "costComparison": {
        "incumbentTotalCost": 14000,
        "sustainableTotalCost": 15400,
        "costDeltaPercentage": 10
      },
      "carbonComparison": {
        "incumbentGwp": 900,
        "sustainableGwp": 450,
        "carbonReductionPercentage": 50
      },
      "warnings": ["Labor units 10% higher", "Lead time 14 days longer"],
      "csiFormUrl": "https://storage.greenchainz.com/csi-forms/123-456.pdf"
    }
  ]
}
```

---

## Phase 6: UI Updates

### Swap Validation Dashboard

**New Component:** `SwapValidationCard.tsx`

**Features:**
- Side-by-side comparison of incumbent vs sustainable material
- Showstopper checks with ✓/✗ indicators
- Cost comparison chart (material + labor + lifecycle)
- Carbon reduction visualization
- Download CSI Form 13.1A button
- Warnings/caveats section

**Mockup:**

```
┌─────────────────────────────────────────────────────────────┐
│ SWAP VALIDATION: Portland Cement → Bio-Based Cement        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ STATUS: ✓ APPROVED                                          │
│                                                             │
│ SHOWSTOPPER CHECKS:                                         │
│ ✓ ASTM Standards Match (ASTM C150, ASTM C39)               │
│ ✓ Fire Rating Match (Class A)                              │
│ ✓ UL Listing (UL 263)                                       │
│ ✓ Compressive Strength (4200 psi ≥ 4000 psi)               │
│ ✓ Thermal Performance (R-value adequate)                    │
│                                                             │
│ COST COMPARISON:                                            │
│ Incumbent: $14,000 | Sustainable: $15,400 | Delta: +10%    │
│ [████████████████████░░] Material: $12k → $13k              │
│ [████████░░░░░░░░░░░░░░] Labor: $2k → $2.4k                 │
│                                                             │
│ CARBON REDUCTION:                                           │
│ 900 kg CO2e → 450 kg CO2e | -50% 🌱                         │
│                                                             │
│ ⚠ WARNINGS:                                                 │
│ • Labor units 10% higher (slower cure time)                 │
│ • Lead time 14 days longer (limited suppliers)              │
│                                                             │
│ [Download CSI Form 13.1A] [Approve Swap] [Reject]          │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Priority

### Sprint 1: Database Schema (Week 1)
- [ ] Create `material_specifications` table
- [ ] Create `material_assemblies` and `assembly_components` tables
- [ ] Create `pricing_data` table
- [ ] Create `swap_validations` table
- [ ] Migrate existing materials data to new schema

### Sprint 2: Data Sourcing (Week 2-3)
- [ ] Build TXDOT bid tab scraper
- [ ] Purchase and parse Craftsman estimator
- [ ] Build Home Depot pricing scraper
- [ ] Apply for UL Product iQ API access
- [ ] Build PDF parser for manufacturer data sheets (ASTM codes, specs)

### Sprint 3: Swap Validation Engine (Week 4-5)
- [ ] Implement `validateSwap()` function
- [ ] Build showstopper check logic
- [ ] Implement regional pricing lookup
- [ ] Create tRPC procedure for swap validation
- [ ] Write comprehensive unit tests

### Sprint 4: CSI Form Generation (Week 6)
- [ ] Design CSI Form 13.1A PDF template
- [ ] Implement `generateCsiForm()` function
- [ ] Integrate with S3 storage
- [ ] Add download button to UI

### Sprint 5: AI Agent Updates (Week 7)
- [ ] Update CARBON-OPTIMIZER prompt with showstopper validation
- [ ] Update COMPLIANCE-VALIDATOR to check ASTM/UL/ICC-ES
- [ ] Test agent responses with real material data
- [ ] Integrate with swap validation engine

### Sprint 6: UI Integration (Week 8)
- [ ] Build `SwapValidationCard.tsx` component
- [ ] Add to RFQ detail modal
- [ ] Create swap validation dashboard for buyers
- [ ] Add filtering by validation status (Approved/Experimental/Rejected)

---

## Success Metrics

### Technical Metrics
- **Swap validation accuracy:** >95% (validated against architect feedback)
- **Data coverage:** >80% of top 100 materials have complete specifications
- **API response time:** <2s for swap validation
- **CSI form generation:** <5s per form

### Business Metrics
- **Architect adoption:** 200 architects using swap engine by Q2 2026
- **Swap approval rate:** >60% of recommended swaps approved by architects
- **Time saved:** Average 2 hours saved per swap (CSI form auto-generation)
- **Revenue:** $2/swap charge with 4x margin on AI agent costs

### User Feedback
- **Net Promoter Score:** >50
- **Feature satisfaction:** >4.5/5 for swap validation accuracy
- **Support tickets:** <5% of swaps require manual intervention

---

## Risk Mitigation

### Data Quality Risks
**Risk:** Scraped data from DOT bid tabs is incomplete or inaccurate.  
**Mitigation:** Cross-validate with multiple sources (Craftsman, Home Depot). Flag low-confidence data.

### Legal Risks
**Risk:** Recommending a swap that fails in production leads to liability.  
**Mitigation:** Add disclaimer: "GreenChainz provides recommendations based on available data. Final approval by licensed architect required."

### API Access Risks
**Risk:** UL Product iQ denies API access.  
**Mitigation:** Manual data entry for top 100 materials. Apply for access post-revenue.

### Competitive Risks
**Risk:** Autodesk or RSMeans builds similar feature.  
**Mitigation:** Focus on speed to market. Build proprietary dataset from State DOT bid tabs.

---

## Next Steps

1. **Review with stakeholders** — Get approval on database schema and data sourcing strategy
2. **Create todo.md items** — Break down each sprint into actionable tasks
3. **Start Sprint 1** — Database schema implementation
4. **Parallel track:** Apply for UL Product iQ API access (long lead time)

---

**Document Owner:** Manus AI Agent  
**Last Updated:** February 15, 2026  
**Status:** Draft - Awaiting stakeholder review
