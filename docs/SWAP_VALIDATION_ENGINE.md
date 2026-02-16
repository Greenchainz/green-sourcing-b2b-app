# Swap Validation Engine Documentation

## Overview

The Swap Validation Engine is the core risk-management tool that determines whether a sustainable material can safely substitute an incumbent material without compromising performance, safety, or code compliance. It validates **functional equivalence** across 12 critical showstopper checks and classifies swaps as **APPROVED**, **EXPERIMENTAL**, or **REJECTED**.

## Philosophy

> **Green attributes are the tie-breaker, not the opening bid.**

Architects won't swap unless materials are functionally identical. The validation engine enforces this by checking:
- ASTM codes (material identity)
- Fire ratings (life safety)
- Structural performance (load capacity)
- Thermal performance (energy code compliance)
- Acoustic performance (occupant comfort)
- Certifications (UL, ICC-ES)
- Installability (labor, cure time)

Only after passing these checks does carbon reduction matter.

## Classification System

### APPROVED ✅
**Criteria**: Score ≥90% AND 0 failed checks

**Meaning**: Functionally identical materials. Architect can specify the sustainable material without additional engineering review or design changes.

**Example**: Portland cement (ASTM C150) → Blended cement (ASTM C150) with 95% strength match, same fire rating, same R-value

### EXPERIMENTAL ⚠️
**Criteria**: Score 70-89% OR 1-2 failed checks

**Meaning**: Minor deviations that require engineering review and possible design modifications. May need additional testing or certifications.

**Example**: Concrete with 85% strength match (requires structural review) OR different ASTM code with 80% overlap

### REJECTED ❌
**Criteria**: Score <70% OR 3+ failed checks

**Meaning**: Significant functional differences make substitution impractical. Would require major design changes or compromise performance.

**Example**: Material with wrong fire rating (-2 hours), insufficient strength (-25%), and missing UL listing

## Showstopper Checks

### 1. ASTM Standards Match (Weight: 15%)
**Purpose**: ASTM codes define material composition and performance. Mismatched codes = different material.

**Thresholds**:
- **APPROVED**: 100% overlap (exact match)
- **EXPERIMENTAL**: 80-99% overlap
- **REJECTED**: <80% overlap

**Example**:
```
Incumbent: "C150, C595"
Sustainable: "C150, C595" → APPROVED (100% match)
Sustainable: "C150, C618" → EXPERIMENTAL (50% match)
Sustainable: "C618, C989" → REJECTED (0% match)
```

### 2. Fire Rating (Weight: 15%)
**Purpose**: Building codes mandate minimum fire resistance. Downgrading = code violation.

**Thresholds**:
- **APPROVED**: ±1 hour
- **EXPERIMENTAL**: -1 to -2 hours
- **REJECTED**: >2 hour downgrade OR >2 hour upgrade (over-engineering)

**Example**:
```
Incumbent: 2-hour rated
Sustainable: 2-hour → APPROVED
Sustainable: 1-hour → APPROVED (within ±1 hour)
Sustainable: 0-hour → REJECTED (>2 hour downgrade)
```

### 3. Compressive Strength (Weight: 12%)
**Purpose**: Structural loads depend on material strength. Insufficient strength = structural failure.

**Thresholds**:
- **APPROVED**: ±10%
- **EXPERIMENTAL**: -10% to -20%
- **REJECTED**: >20% deviation

**Example**:
```
Incumbent: 4000 psi
Sustainable: 4200 psi → APPROVED (+5%)
Sustainable: 3700 psi → APPROVED (-7.5%)
Sustainable: 3000 psi → REJECTED (-25%)
```

### 4. Tensile Strength (Weight: 10%)
**Purpose**: Critical for materials under tension (steel, reinforcing, cables).

**Thresholds**: Same as compressive strength (±10% APPROVED, -20% EXPERIMENTAL, >20% REJECTED)

### 5. Modulus of Elasticity (Weight: 7%)
**Purpose**: Affects deflection and deformation under load. Mismatched modulus = excessive deflection.

**Thresholds**: ±10% APPROVED, -20% EXPERIMENTAL, >20% REJECTED

### 6. R-Value (Thermal Resistance) (Weight: 10%)
**Purpose**: Energy code compliance depends on R-value. Lower R-value = higher energy costs + code violations.

**Thresholds**:
- **APPROVED**: ±5%
- **EXPERIMENTAL**: -5% to -10%
- **REJECTED**: >10% downgrade

**Example**:
```
Incumbent: R-6.5 per inch
Sustainable: R-6.2 → APPROVED (-4.6%)
Sustainable: R-5.8 → EXPERIMENTAL (-10.8%)
Sustainable: R-5.0 → REJECTED (-23%)
```

### 7. Perm Rating (Vapor Permeability) (Weight: 5%)
**Purpose**: Controls moisture movement. Mismatched perm rating = mold, rot, condensation.

**Thresholds**:
- **APPROVED**: Same vapor retarder class
  - Class I: ≤0.1 perm
  - Class II: 0.1-1.0 perm
  - Class III: 1.0-10 perm
- **EXPERIMENTAL**: Adjacent class (I↔II or II↔III)
- **REJECTED**: >1 class jump (I↔III)

### 8. STC Rating (Sound Transmission Class) (Weight: 8%)
**Purpose**: Acoustic performance for walls, floors, ceilings. Lower STC = noise complaints.

**Thresholds**:
- **APPROVED**: ±3 points
- **EXPERIMENTAL**: -3 to -5 points
- **REJECTED**: >5 point downgrade

### 9. IIC Rating (Impact Insulation Class) (Weight: 5%)
**Purpose**: Impact sound isolation (footsteps, dropped objects). Critical for multi-family housing.

**Thresholds**: Same as STC (±3 APPROVED, -5 EXPERIMENTAL, >5 REJECTED)

### 10. UL Listing (Weight: 8%)
**Purpose**: UL certification proves safety testing. Missing UL listing = liability risk.

**Thresholds**:
- **APPROVED**: Both materials have UL listing for same application
- **EXPERIMENTAL**: Sustainable material has UL listing but for different application
- **REJECTED**: Sustainable material has no UL listing

### 11. ICC-ES Report (Weight: 3%)
**Purpose**: ICC-ES reports provide code compliance documentation. Missing report = approval delays.

**Thresholds**:
- **APPROVED**: Both materials have ICC-ES reports
- **EXPERIMENTAL**: Sustainable material has pending ICC-ES application
- **REJECTED**: No ICC-ES report or application

### 12. Labor Units (Weight: 2%)
**Purpose**: Installation time affects project schedule and cost. Higher labor = higher total cost.

**Thresholds**:
- **APPROVED**: ±20%
- **EXPERIMENTAL**: +20% to +50%
- **REJECTED**: >50% increase

## API Usage

### Validate a Material Swap

```typescript
const result = await trpc.swapValidation.validateMaterialSwap.mutate({
  incumbentMaterialId: 100,
  sustainableMaterialId: 200,
  projectId: 50, // optional
  saveResult: true, // save to database
});

console.log(result.validationStatus); // "APPROVED" | "EXPERIMENTAL" | "REJECTED"
console.log(result.overallScore); // 0-100
console.log(result.recommendation); // Human-readable recommendation
console.log(result.showstopperResults); // Detailed check results
```

### Get Validation History

```typescript
// Get all validations for a material
const history = await trpc.swapValidation.getValidationHistory.query({
  sustainableMaterialId: 200,
  limit: 50,
});

// Filter by status
const approved = await trpc.swapValidation.getValidationHistory.query({
  validationStatus: 'APPROVED',
});
```

### Get Validation by ID

```typescript
const validation = await trpc.swapValidation.getValidationById.query({
  validationId: 12345,
});

console.log(validation.incumbentMaterial); // Full material details
console.log(validation.sustainableMaterial);
console.log(validation.showstopperResults);
```

### Revalidate a Swap

```typescript
// Re-run validation with current material specs
const updated = await trpc.swapValidation.revalidateSwap.mutate({
  validationId: 12345,
});
```

### Get Validation Statistics

```typescript
const stats = await trpc.swapValidation.getValidationStats.query();

console.log(stats.total); // Total validations
console.log(stats.approved); // Count of APPROVED
console.log(stats.experimental); // Count of EXPERIMENTAL
console.log(stats.rejected); // Count of REJECTED
console.log(stats.averageScore); // Average score across all validations
console.log(stats.recentValidations); // Last 10 validations
```

## Validation Result Structure

```typescript
{
  validationId: 12345,
  validationStatus: "APPROVED",
  overallScore: 95.5,
  passedChecks: 12,
  failedChecks: 0,
  skippedChecks: 0,
  recommendation: "APPROVED for substitution. All critical showstoppers pass. Material is functionally equivalent.",
  showstopperResults: {
    astmMatch: {
      pass: true,
      details: "Exact match: C150, C595",
      weight: 15,
      score: 15
    },
    fireRating: {
      pass: true,
      details: "2hr vs 2hr (within ±1hr)",
      weight: 15,
      score: 15
    },
    // ... 10 more checks
  },
  incumbentMaterial: { /* full material object */ },
  sustainableMaterial: { /* full material object */ },
  validatedAt: "2026-02-16T06:00:00Z",
  expiresAt: "2026-08-16T06:00:00Z" // 6 months
}
```

## Edge Cases

### Missing Data
- If **incumbent** material is missing a spec (e.g., no STC rating), that check is **skipped** (not counted as pass or fail)
- If **sustainable** material is missing a spec that incumbent has, check **fails**

### Null vs Zero
- `null` = data not applicable (e.g., STC rating for exterior cladding)
- `0` or empty string = data missing (check fails)

### Over-Engineering
- If sustainable material significantly **exceeds** incumbent specs (e.g., +50% strength), flag as **EXPERIMENTAL** (may indicate cost inefficiency)

### Material Category Mismatch
- If materials are in different categories (e.g., concrete vs steel), validation **fails immediately** with REJECTED status

## Testing

All validation logic is covered by 24 unit tests:

```bash
pnpm test swapValidationService.test.ts
```

**Test Coverage**:
- ✅ APPROVED scenarios (6 tests)
- ✅ EXPERIMENTAL scenarios (3 tests)
- ✅ REJECTED scenarios (6 tests)
- ✅ Edge cases (6 tests)
- ✅ Scoring algorithm (3 tests)

## Integration with Other Systems

### RFQ System
When a buyer requests a sustainable material swap, the validation engine automatically runs and attaches the validation result to the RFQ.

### AI Agent
The AI agent uses validation results to recommend materials and explain why certain swaps are approved or rejected.

### CSI Form 13.1A Generator
Validation results feed into the CSI Form 13.1A generator, which creates substitution request forms with side-by-side spec comparison.

## Future Enhancements

1. **Assembly-Level Validation**: Validate entire wall/roof/floor assemblies (not just individual materials)
2. **Regional Code Compliance**: Check against state/local building codes (e.g., California Title 24, NYC Building Code)
3. **Cost-Benefit Analysis**: Calculate ROI based on carbon savings vs cost premium
4. **Machine Learning**: Train model to predict validation outcomes based on historical data
5. **Real-Time Notifications**: Alert users when validation expires (6 months) and needs revalidation

## Support

For issues or questions:
- **Code**: `server/services/swapValidationService.ts`, `server/routers/swapValidation.ts`
- **Tests**: `server/services/swapValidationService.test.ts`
- **Documentation**: This file, `VALIDATION_CRITERIA.md`

## References

- **ASTM Standards**: https://www.astm.org/
- **UL Listings**: https://database.ul.com/
- **ICC-ES Reports**: https://icc-es.org/
- **Building Codes**: IBC, IRC, NFPA 5000
- **Energy Codes**: IECC, ASHRAE 90.1
