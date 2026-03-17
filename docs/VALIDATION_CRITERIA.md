# Swap Validation Criteria Design

## Overview

The swap validation engine classifies material substitutions into three categories based on **functional equivalence** across critical performance metrics. Green attributes are the tie-breaker, not the opening bid.

## Classification System

### APPROVED ✅
**Definition**: Functionally identical materials that can be swapped without design changes or additional approvals.

**Criteria**: ALL showstopper checks must pass within tolerance thresholds.

**Use Case**: Architect can confidently specify the sustainable material without additional engineering review.

### EXPERIMENTAL ⚠️
**Definition**: Materials with 1-2 minor deviations that may require design adjustments or additional testing.

**Criteria**: 1-2 showstopper checks fail, but failures are minor (within 20% of threshold).

**Use Case**: Requires engineering review and possible design modifications. May need additional testing or certifications.

### REJECTED ❌
**Definition**: Materials with significant functional differences that make substitution impractical.

**Criteria**: 3+ showstopper checks fail, OR any single check fails by >20% of threshold.

**Use Case**: Not recommended for substitution. Would require major design changes or compromise performance.

## Showstopper Checks

### 1. ASTM Standards Match
**Why It Matters**: ASTM codes define material composition and performance. Mismatched codes = different material.

**Threshold**:
- **APPROVED**: Exact match on all primary ASTM codes (e.g., "C150, C595" must match "C150, C595")
- **EXPERIMENTAL**: 80%+ overlap (e.g., "C150, C595" vs "C150, C618" = 1/2 match)
- **REJECTED**: <80% overlap

**Example**:
- Incumbent: Portland Cement (ASTM C150)
- Sustainable: Blended Cement (ASTM C595) → **EXPERIMENTAL** (different standard)
- Sustainable: Portland Cement (ASTM C150) → **APPROVED** (exact match)

### 2. Fire Rating
**Why It Matters**: Building codes mandate minimum fire resistance. Downgrading fire rating = code violation.

**Threshold**:
- **APPROVED**: ±1 hour (e.g., 2-hour → 1-hour or 3-hour is acceptable)
- **EXPERIMENTAL**: -1 to -2 hours (e.g., 3-hour → 1-hour requires review)
- **REJECTED**: >2 hours downgrade OR upgrade >2 hours (over-engineering)

**Example**:
- Incumbent: 2-hour fire-rated wall assembly
- Sustainable: 2-hour assembly → **APPROVED**
- Sustainable: 1-hour assembly → **APPROVED** (within ±1 hour)
- Sustainable: 0-hour assembly → **REJECTED** (>2 hour downgrade)

### 3. Compressive Strength
**Why It Matters**: Structural loads depend on material strength. Insufficient strength = structural failure.

**Threshold**:
- **APPROVED**: ±10% (e.g., 4000 psi → 3600-4400 psi)
- **EXPERIMENTAL**: -10% to -20% (requires structural review)
- **REJECTED**: >20% deviation

**Example**:
- Incumbent: Concrete (4000 psi compressive strength)
- Sustainable: 4200 psi → **APPROVED** (+5%)
- Sustainable: 3700 psi → **APPROVED** (-7.5%)
- Sustainable: 3000 psi → **REJECTED** (-25%)

### 4. Tensile Strength
**Why It Matters**: Critical for materials under tension (steel, reinforcing, cables).

**Threshold**: Same as compressive strength (±10% APPROVED, -20% EXPERIMENTAL, >20% REJECTED)

### 5. Modulus of Elasticity
**Why It Matters**: Affects deflection and deformation under load. Mismatched modulus = excessive deflection.

**Threshold**:
- **APPROVED**: ±10%
- **EXPERIMENTAL**: -10% to -20%
- **REJECTED**: >20% deviation

### 6. R-Value (Thermal Resistance)
**Why It Matters**: Energy code compliance depends on R-value. Lower R-value = higher energy costs + code violations.

**Threshold**:
- **APPROVED**: ±5% (e.g., R-20 → R-19 to R-21)
- **EXPERIMENTAL**: -5% to -10%
- **REJECTED**: >10% downgrade

**Example**:
- Incumbent: Spray foam insulation (R-6.5 per inch)
- Sustainable: R-6.2 per inch → **APPROVED** (-4.6%)
- Sustainable: R-5.8 per inch → **EXPERIMENTAL** (-10.8%)
- Sustainable: R-5.0 per inch → **REJECTED** (-23%)

### 7. Perm Rating (Vapor Permeability)
**Why It Matters**: Controls moisture movement. Mismatched perm rating = mold, rot, condensation.

**Threshold**:
- **APPROVED**: Same category (Class I, II, or III vapor retarder)
  - Class I: 0.1 perm or less
  - Class II: 0.1 to 1.0 perm
  - Class III: 1.0 to 10 perm
- **EXPERIMENTAL**: Adjacent category (e.g., Class II → Class I or III)
- **REJECTED**: >1 category jump (e.g., Class I → Class III)

### 8. STC Rating (Sound Transmission Class)
**Why It Matters**: Acoustic performance for walls, floors, ceilings. Lower STC = noise complaints.

**Threshold**:
- **APPROVED**: ±3 points (e.g., STC 50 → STC 47-53)
- **EXPERIMENTAL**: -3 to -5 points
- **REJECTED**: >5 point downgrade

### 9. IIC Rating (Impact Insulation Class)
**Why It Matters**: Impact sound isolation (footsteps, dropped objects). Critical for multi-family housing.

**Threshold**: Same as STC (±3 APPROVED, -5 EXPERIMENTAL, >5 REJECTED)

### 10. UL Listing
**Why It Matters**: UL certification proves safety testing. Missing UL listing = liability risk.

**Threshold**:
- **APPROVED**: Both materials have UL listing for same application
- **EXPERIMENTAL**: Sustainable material has UL listing but for different application
- **REJECTED**: Sustainable material has no UL listing

### 11. ICC-ES Report
**Why It Matters**: ICC-ES reports provide code compliance documentation. Missing report = approval delays.

**Threshold**:
- **APPROVED**: Both materials have ICC-ES reports
- **EXPERIMENTAL**: Sustainable material has pending ICC-ES application
- **REJECTED**: No ICC-ES report or application

### 12. Labor Units
**Why It Matters**: Installation time affects project schedule and cost. Higher labor = higher total cost.

**Threshold**:
- **APPROVED**: ±20% (e.g., 0.5 hrs/unit → 0.4-0.6 hrs/unit)
- **EXPERIMENTAL**: +20% to +50%
- **REJECTED**: >50% increase

### 13. Cure Time
**Why It Matters**: Longer cure time delays subsequent trades. Critical for fast-track projects.

**Threshold**:
- **APPROVED**: ±24 hours
- **EXPERIMENTAL**: +24 to +72 hours
- **REJECTED**: >72 hours increase

## Validation Scoring Algorithm

Each showstopper check is assigned a **weight** based on criticality:

| Check | Weight | Rationale |
|---|---|---|
| ASTM Standards | 15% | Defines material identity |
| Fire Rating | 15% | Code compliance, life safety |
| Compressive Strength | 12% | Structural integrity |
| Tensile Strength | 10% | Structural integrity |
| R-Value | 10% | Energy code compliance |
| STC Rating | 8% | Acoustic performance |
| UL Listing | 8% | Safety certification |
| Modulus of Elasticity | 7% | Deflection control |
| Perm Rating | 5% | Moisture control |
| IIC Rating | 5% | Impact sound |
| ICC-ES Report | 3% | Code compliance documentation |
| Labor Units | 2% | Installation efficiency |

**Total Score Calculation**:
- Each passed check contributes its full weight to the score
- Failed checks contribute 0 points
- **APPROVED**: Score ≥ 90%
- **EXPERIMENTAL**: Score 70-89%
- **REJECTED**: Score < 70%

## Edge Cases

### Missing Data
- If incumbent material is missing a spec (e.g., no STC rating), that check is **skipped** (not counted as pass or fail)
- If sustainable material is missing a spec that incumbent has, check **fails**

### Null Values
- `null` = data not applicable (e.g., STC rating for exterior cladding)
- `0` or empty string = data missing (check fails)

### Over-Engineering
- If sustainable material significantly **exceeds** incumbent specs (e.g., +50% strength), flag as **EXPERIMENTAL** (may indicate cost inefficiency)

### Material Category Mismatch
- If materials are in different categories (e.g., concrete vs steel), validation **fails immediately** with REJECTED status

## Validation Report Format

```json
{
  "validationId": 12345,
  "incumbentMaterialId": 100,
  "sustainableMaterialId": 200,
  "validationStatus": "APPROVED",
  "overallScore": 95,
  "showstopperResults": {
    "astmMatch": { "pass": true, "details": "Exact match: C150" },
    "fireRating": { "pass": true, "details": "Both 2-hour rated" },
    "compressiveStrength": { "pass": true, "details": "4200 psi vs 4000 psi (+5%)" },
    "rValue": { "pass": false, "details": "R-5.8 vs R-6.5 (-10.8%)" }
  },
  "costComparison": {
    "incumbentTotalCost": 12.50,
    "sustainableTotalCost": 13.20,
    "costDelta": 0.70,
    "costDeltaPercent": 5.6
  },
  "carbonComparison": {
    "incumbentGWP": 450,
    "sustainableGWP": 280,
    "gwpReduction": 170,
    "gwpReductionPercent": 37.8
  },
  "recommendation": "APPROVED for substitution. All critical showstoppers pass. Sustainable option reduces embodied carbon by 38% with minimal cost increase (+5.6%)."
}
```

## Next Steps

1. Implement `validateSwap()` function in `swapValidationService.ts`
2. Create tRPC procedures for validation API
3. Build validation result storage in `swap_validations` table
4. Test with real material pairs
