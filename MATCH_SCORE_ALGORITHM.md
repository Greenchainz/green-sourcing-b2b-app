# Enhanced RFQ Match Score Algorithm

## Overview

The match score algorithm calculates a 0-100 score representing how well a supplier matches an RFQ's requirements. Higher scores indicate better matches and appear first in the Supplier RFQ Dashboard.

## Scoring Breakdown (Total: 100 points)

### 1. Base Score: 30 points
Every supplier starts with 30 points to ensure all RFQs are visible, even with minimal matching.

### 2. Location Match: +20 points
**Criteria:** Supplier's accepted locations include the RFQ's project location

**Logic:**
- Check if `supplier_filters.acceptedLocations` (comma-separated list) contains the `rfqs.projectLocation`
- Case-insensitive partial matching (e.g., "California" matches "Los Angeles, California")

**Example:**
```
RFQ Location: "Austin, Texas"
Supplier Accepted Locations: "Texas, Oklahoma, Louisiana"
Result: +20 points (Texas matches)
```

### 3. Certification Matching: +15 points
**Criteria:** Supplier holds certifications required by the RFQ

**Logic:**
- Compare `rfqs.requiredCertifications` (JSON array) with `suppliers.certifications` (JSON array)
- Award points proportionally based on percentage of required certs matched
- Formula: `15 × (matched_certs / required_certs)`

**Example:**
```
RFQ Required: ["ISO 9001", "LEED Gold", "FSC Certified"]
Supplier Has: ["ISO 9001", "LEED Gold"]
Result: +10 points (2/3 = 66.7% × 15 = 10)
```

### 4. Material Type Preference: +15 points
**Criteria:** Supplier's material type preferences match RFQ's material categories

**Logic:**
- Get material categories from RFQ items via `rfq_items.materialId` → `materials.category`
- Check if `supplier_filters.materialTypePreferences` (JSON array) includes the category
- Case-insensitive partial matching

**Example:**
```
RFQ Materials: Concrete (category: "concrete")
Supplier Preferences: ["concrete", "steel", "insulation"]
Result: +15 points (concrete matches)
```

### 5. Supplier Capacity: +10 points
**Criteria:** Supplier's current capacity percentage

**Logic:**
- Based on `suppliers.currentCapacity` (0-100 percentage)
- Tiered scoring:
  - **≥70%**: +10 points (high capacity)
  - **40-69%**: +5 points (medium capacity)
  - **20-39%**: +2 points (low capacity)
  - **<20%**: +0 points (overloaded)

**Example:**
```
Supplier Current Capacity: 85%
Result: +10 points (high capacity)
```

### 6. Premium Supplier Bonus: +5 points
**Criteria:** Supplier has active premium subscription

**Logic:**
- Check `suppliers.isPremium = 1`
- Ensures premium suppliers get priority visibility

### 7. Verification Bonus: +5 points
**Criteria:** Supplier is verified by GreenChainz

**Logic:**
- Check `suppliers.verified = 1`
- Rewards suppliers who completed verification process

## Total Score Calculation

```typescript
score = 30 (base)
      + 20 (location match)
      + 15 (certification match %)
      + 15 (material type match)
      + 10 (capacity tier)
      + 5 (premium bonus)
      + 5 (verification bonus)
      = Max 100 points
```

## Color Coding in UI

- **Green (80-100)**: Excellent match
- **Yellow (60-79)**: Good match
- **Gray (<60)**: Fair match

## Future Enhancements

1. **Order Value Matching**: Compare RFQ estimated value with `suppliers.maxOrderValue`
2. **Lead Time Preferences**: Match RFQ urgency with `supplier_filters.minLeadDays` / `maxLeadDays`
3. **Sustainability Score**: Factor in `suppliers.sustainabilityScore` from D&B
4. **Historical Performance**: Track bid acceptance rate and delivery performance
5. **Geographic Distance**: Calculate actual distance instead of binary location match
6. **Minimum Order Quantity**: Check if RFQ quantity meets `supplier_filters.minOrderQuantity`

## Implementation Notes

- All factors are optional (missing data doesn't penalize suppliers)
- Scores are capped at 100 using `Math.min(score, 100)`
- Algorithm runs server-side in `rfq-service.ts::calculateMatchScore()`
- Results are cached in `getSupplierMatchedRfqs()` query for performance
