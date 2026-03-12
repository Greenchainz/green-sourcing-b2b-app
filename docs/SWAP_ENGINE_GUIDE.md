# GreenChainz Swap Engine & Valuation Disclaimer Guide

**Version:** 2.0 | **Last Updated:** March 2026 | **Owner:** Jerit Norville, Founder & CEO

---

## Bottom Line

GreenChainz is the global trust layer for sustainable material procurement. That means **we can never publish a false precision score or an unqualified valuation**. Every score we surface must carry a confidence level and a disclaimer. This document defines how the swap engine works, what was fine-tuned, and the non-negotiable rules around how scores are displayed.

---

## 1. The CCPS Engine — What Changed (v2.0)

The Composite Compliance-Performance Score (CCPS) engine was fine-tuned in March 2026. Here is exactly what changed and why.

### 1.1 Carbon Score — Piecewise Curve (was: linear)

**Before:** `score = 100 * (1 - (ratio - 1) * 0.5)` — a simple linear formula that produced extreme scores for materials only marginally different from baseline.

**After:** A three-segment piecewise curve:

| GWP vs. Baseline | Score Range | Rationale |
|---|---|---|
| 0% of baseline (carbon-zero) | 100 | Maximum reward |
| 50% of baseline | ~75 | Strong performer |
| 100% of baseline (at baseline) | 50 | Neutral — not penalized |
| 200% of baseline | 10 | Significantly worse |
| 300%+ of baseline | 0 | Disqualifying |

**Why:** The old formula gave a material at 99% of baseline a score of 50.5 and a material at 101% of baseline a score of 49.5 — a 1% GWP difference producing a visually significant score gap. The new curve smooths this out. Materials near baseline are treated as equivalent.

### 1.2 Certification Score — EPD Weighted Higher (was: 20 pts, now: 25 pts)

**Before:** EPD = 20 pts, same weight as FSC.

**After:** EPD = 25 pts. FSC, C2C, HPD, GREENGUARD = 12–15 pts each.

**Why:** EPD is the foundational trust document. A material without an EPD cannot have a verified carbon score. Elevating EPD weight ensures the scoring system rewards the data quality that makes everything else reliable.

### 1.3 Cost Score — Grace Zone Added

**Before:** Any price above baseline immediately started losing points.

**After:** Materials within ±10% of baseline score in a "grace zone" (50–65 pts). The penalty curve only activates above 1.1x baseline.

**Why:** A 5% price premium for a certified sustainable material is commercially acceptable. The old formula penalized it as if it were a significant cost overrun.

### 1.4 Supply Chain Score — Regional Availability Reweighted

**Before:** US manufacturing = 30 pts, regional availability = 30 pts.

**After:** US manufacturing = 20 pts, regional availability = 40 pts.

**Why:** A US-manufactured material shipped from the opposite coast has worse supply chain performance than a locally manufactured product. Regional availability is more operationally relevant.

### 1.5 Health Score — Red List is Now an Active Penalty

**Before:** Being on the Red List simply meant you didn't get the "not on Red List" bonus.

**After:** `onRedList === true` deducts 30 points from the health score.

**Why:** Red List materials contain substances of concern (formaldehyde, phthalates, heavy metals). A material on the Red List should not be able to score well on health by compensating with other factors. The penalty is non-negotiable.

### 1.6 Persona Weight Presets — Five Archetypes

Five pre-tuned weight profiles now ship with the engine:

| Persona | Carbon | Compliance | Certification | Cost | Supply Chain | Health |
|---|---|---|---|---|---|---|
| **Architect** | 30% | 30% | 20% | 8% | 7% | 5% |
| **GC Project Manager** | 10% | 20% | 10% | 30% | 25% | 5% |
| **Procurement Officer** | 10% | 15% | 20% | 30% | 20% | 5% |
| **Sustainability Director** | 35% | 15% | 25% | 5% | 10% | 10% |
| **Owner/Developer** | 20% | 20% | 15% | 25% | 15% | 5% |

These replace the single default weight set. When a user's persona is known, use `PERSONA_WEIGHTS[persona]`. When unknown, fall back to `DEFAULT_WEIGHTS`.

---

## 2. The Valuation Disclaimer System

### 2.1 The Problem We Are Solving

GreenChainz publishes CCPS scores, carbon delta estimates, and swap recommendations. If a procurement officer uses a score to justify a $2M material substitution and the score was based on incomplete data, we have a liability problem — and more importantly, a trust problem. We cannot be the global trust layer and publish untrustworthy numbers.

### 2.2 Data Confidence Levels

Every CCPS calculation now returns a `DataQualityFlags` object with one of four confidence levels:

| Level | Condition | Score Cap | Required Action |
|---|---|---|---|
| **HIGH** | EPD verified + GWP data + baseline + price, ≤1 missing field | None (0–100) | Show standard disclaimer |
| **MEDIUM** | EPD verified + GWP data, ≤3 missing fields | None (0–100) | Show medium disclaimer |
| **LOW** | EPD or GWP present, but significant gaps | Capped at 65 | Show warning banner |
| **INSUFFICIENT** | No EPD, no verified GWP | Capped at 40 | Show blocking disclaimer |

**The score cap is non-negotiable.** A material with no EPD cannot score above 40. A material with low data quality cannot score above 65. This prevents greenwashing via incomplete data.

### 2.3 Mandatory Disclaimer Text

The following disclaimers are generated by the engine and **must be displayed** wherever a CCPS score or carbon delta is shown. Do not truncate or hide them behind a "learn more" link on primary score displays.

#### HIGH Confidence
> Score based on verified EPD data. Carbon values sourced from manufacturer-declared Environmental Product Declarations. GreenChainz scores are comparative rankings only and do not constitute regulatory compliance certification. Verify all specifications with the manufacturer before procurement.

#### MEDIUM Confidence
> Score based on partial data. EPD verified but some fields are estimated or missing: [list]. This score is an estimate. Do not use for LEED documentation, regulatory submissions, or contract specifications without independent verification.

#### LOW Confidence
> ⚠ LIMITED DATA — Score is an estimate based on incomplete information. Missing: [list]. This score should not be used for procurement decisions without obtaining complete manufacturer data. GreenChainz does not warrant the accuracy of scores derived from incomplete records.

#### INSUFFICIENT Data
> ⚠ INSUFFICIENT DATA — This material lacks an EPD and verified carbon data. The CCPS score cannot be reliably calculated. Missing: [list]. Do not use this score for any procurement, compliance, or sustainability reporting purpose. Contact the manufacturer to obtain an Environmental Product Declaration before proceeding.

### 2.4 Carbon Delta Disclaimer

Carbon delta values (e.g., "This swap saves 12.4 kg CO₂e per 1,000 sf") must always display:

**When both materials have EPDs:**
> Carbon reduction based on manufacturer-declared EPD values. Actual savings may vary based on quantity, installation, and regional grid factors. Not a certified carbon offset.

**When either material lacks an EPD:**
> ⚠ ESTIMATE — One or both materials lack a verified EPD. Carbon delta is calculated from estimated values and should not be used for LEED documentation, regulatory reporting, or carbon credit claims.

---

## 3. Swap Validation — Showstopper System

The swap validation service runs 12 technical checks before any swap is approved. These are the hard gates that prevent recommending a structurally incompatible material.

### 3.1 Showstopper Checks and Weights

| Check | Weight | What It Tests | Tolerance |
|---|---|---|---|
| ASTM Match | 15 | Shared ASTM standards | At least 1 shared code |
| Fire Rating | 15 | Fire resistance hours | Sustainable ≥ incumbent |
| Compressive Strength | 12 | Structural load capacity | Within ±15% |
| Tensile Strength | 10 | Tensile load capacity | Within ±15% |
| R-Value | 10 | Thermal resistance | Sustainable ≥ incumbent |
| STC Rating | 8 | Sound transmission class | Within ±3 STC |
| UL Listing | 8 | Safety certification | Must match if required |
| Modulus of Elasticity | 7 | Stiffness/deflection | Within ±20% |
| Perm Rating | 5 | Moisture vapor transmission | Within ±20% |
| IIC Rating | 5 | Impact sound insulation | Within ±3 IIC |
| ICC-ES Report | 3 | Code compliance report | Must exist if required |
| Labor Units | 2 | Installation hours | Within ±20% |

### 3.2 Validation Status Thresholds

| Status | Condition | Meaning |
|---|---|---|
| **APPROVED** | Score ≥ 90% AND 0 failed checks | Functionally equivalent — safe to substitute |
| **EXPERIMENTAL** | Score ≥ 70% AND ≤ 2 failed checks | Requires engineering review before substitution |
| **REJECTED** | Score < 70% OR > 2 failed checks | Not substitutable — significant functional differences |

### 3.3 Validation Expiry

All swap validations expire after **180 days**. After expiry, the validation must be re-run to confirm the material specs have not changed. This is enforced in the `revalidateSwap` mutation.

---

## 4. What You Should Never Do

These are the non-negotiables for GreenChainz as a trust layer:

1. **Never display a CCPS score without its confidence level and disclaimer.** Not on the materials page, not in RFQ summaries, not in exported PDFs.

2. **Never present a carbon delta as a certified or audited figure.** It is always an estimate based on EPD-declared values. Always say "based on EPD-declared values."

3. **Never allow a material with INSUFFICIENT data confidence to appear in a "Top Recommended" or "Best Swap" list.** Filter these out at the query level.

4. **Never let a supplier edit their own CCPS score.** Scores are calculated server-side from verified data only. Suppliers can update their material data, which triggers a score recalculation — but they cannot set a score directly.

5. **Never use TxDOT pricing data as a valuation for a specific project.** TxDOT data is regional bid pricing used only for cost score normalization. It is not a quote, not a market price, and not a contract value.

6. **Never present a swap recommendation without the swap validation status.** An EXPERIMENTAL or REJECTED validation must be visible before a user can act on a swap.

---

## 5. Admin Tuning Controls

### 5.1 Adjusting CCPS Baselines

Category baselines (the reference GWP and price values used for normalization) are stored in the `ccps_baselines` table. To update a baseline:

```sql
UPDATE ccps_baselines 
SET baseline_gwp_per_unit = 45.2, baseline_price_per_unit = 12.50
WHERE category = 'Concrete' AND region = 'US';
```

After updating a baseline, invalidate all cached CCPS scores for that category:

```sql
DELETE FROM ccps_scores WHERE material_id IN (
  SELECT id FROM materials WHERE category = 'Concrete'
);
```

The next API request for those materials will trigger a fresh calculation.

### 5.2 Adjusting Persona Weights

Persona weights are defined in `server/ccps-engine.ts` under `PERSONA_WEIGHTS`. To adjust:

1. Edit the weight values in the source file
2. Ensure all six weights sum to 1.0 (the engine normalizes, but be explicit)
3. Commit and push — CI/CD will deploy in ~3 minutes
4. Invalidate cached scores: `DELETE FROM ccps_scores;`

### 5.3 Monitoring Score Distribution

Run this monthly to check if the score distribution looks healthy (should be roughly bell-shaped, centered around 50–65):

```sql
SELECT 
  CASE 
    WHEN ccps_total < 20 THEN '0-19'
    WHEN ccps_total < 40 THEN '20-39'
    WHEN ccps_total < 60 THEN '40-59'
    WHEN ccps_total < 80 THEN '60-79'
    ELSE '80-100'
  END as score_range,
  COUNT(*) as count
FROM ccps_scores
GROUP BY score_range
ORDER BY score_range;
```

**Red flag:** If > 30% of materials score above 80, the baselines may be set too high (making everything look good). If > 30% score below 30, baselines may be too low.

---

*This document governs the scoring and disclaimer policy for all GreenChainz products. Any change to scoring logic, weights, or disclaimer text requires sign-off from the Founder. Store in the repo under `/docs/SWAP_ENGINE_GUIDE.md`.*
