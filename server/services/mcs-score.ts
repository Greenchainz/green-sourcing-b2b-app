/**
 * Material Credit Score (MCS) — shared scoring helper.
 *
 * This is the SINGLE SOURCE OF TRUTH for how a material's 0–100 Material Credit
 * Score is computed. It is consumed by:
 *   - materials-router.getScore   (the in-app score page / PDF)
 *   - the public embeddable badge  (/api/public/badge/material/:id.svg)
 *
 * Keeping the math here guarantees the number a supplier shows on their own
 * website in the GreenChainz Verified badge is identical to the number an
 * architect sees inside the app.
 *
 * Weighting (max 100):
 *   EPD ............. 30
 *   Carbon (GWP) .... 25
 *   Certifications .. 20
 *   Local sourcing .. 15
 *   Transparency .... 10
 */

export interface McsMaterialInput {
  hasEpd?: boolean | null;
  epdNumber?: string | null;
  gwpValue?: string | number | null;
  ec3IndustryMedian?: string | number | null;
  ec3BestPractice?: string | number | null;
  ec3ConservativeEstimate?: string | number | null;
  hasHpd?: boolean | null;
  hasFsc?: boolean | null;
  hasC2c?: boolean | null;
  hasGreenguard?: boolean | null;
  hasDeclare?: boolean | null;
  regionalAvailabilityMiles?: number | null;
  usManufactured?: boolean | null;
  description?: string | null;
  pricePerUnit?: string | number | null;
  leadTimeDays?: number | null;
  epdUrl?: string | null;
  specSheetUrl?: string | null;
  manufacturerId?: number | null;
  recycledContentPct?: string | number | null;
  category?: string | null;
}

export interface McsCertInput {
  certificationName?: string | null;
}

export interface McsBreakdown {
  epd: { score: number; max: number; hasEpd: boolean; hasEpdNumber: boolean };
  carbon: { score: number; max: number; gwp: number | null; median: number | null; bestPractice: number | null };
  certifications: { score: number; max: number; certNames: string[] };
  localSourcing: { score: number; max: number; miles: number | null; usManufactured: boolean };
  transparency: { score: number; max: number; filledFields: number; totalFields: number };
}

export interface McsResult {
  total: number;
  breakdown: McsBreakdown;
}

/**
 * Compute the Material Credit Score for a material row + its certifications.
 * Pure and deterministic — no DB access, no side effects.
 */
export function computeMcs(material: McsMaterialInput, certs: McsCertInput[] = []): McsResult {
  // ── EPD (max 30) ────────────────────────────────────────────────────────────
  const hasEpdFlag = !!material.hasEpd;
  const hasEpdNumber = !!material.epdNumber;
  const epdScore = hasEpdFlag ? 30 : hasEpdNumber ? 15 : 0;

  // ── Carbon / GWP (max 25) ─────────────────────────────────────────────────────
  const gwp = material.gwpValue ? Number(material.gwpValue) : null;
  const median = material.ec3IndustryMedian ? Number(material.ec3IndustryMedian) : null;
  const bestPractice = material.ec3BestPractice ? Number(material.ec3BestPractice) : null;
  const conservative = material.ec3ConservativeEstimate ? Number(material.ec3ConservativeEstimate) : null;

  let carbonScore = 0;
  if (gwp !== null && median !== null && median > 0) {
    if (bestPractice !== null && gwp <= bestPractice) {
      carbonScore = 25;
    } else if (conservative !== null && gwp >= conservative) {
      carbonScore = 0;
    } else if (conservative !== null && bestPractice !== null && conservative > bestPractice) {
      carbonScore = Math.max(0, Math.min(25, Math.round((25 * (conservative - gwp)) / (conservative - bestPractice))));
    } else {
      const ratio = gwp / median;
      carbonScore = Math.max(0, Math.min(25, Math.round((1 - ratio) * 50)));
    }
  }

  // ── Certifications (max 20) ───────────────────────────────────────────────────
  const certSet = new Set<string>();
  if (material.hasEpd) certSet.add('EPD');
  if (material.hasHpd) certSet.add('HPD');
  if (material.hasFsc) certSet.add('FSC');
  if (material.hasC2c) certSet.add('Cradle to Cradle');
  if (material.hasGreenguard) certSet.add('GREENGUARD');
  if (material.hasDeclare) certSet.add('Declare');
  for (const c of certs) if (c.certificationName) certSet.add(c.certificationName);
  const certificationScore = Math.min(20, certSet.size * 4);
  const certNames = Array.from(certSet);

  // ── Local sourcing (max 15) ───────────────────────────────────────────────────
  const miles = material.regionalAvailabilityMiles ?? null;
  const baseLocal =
    miles === null ? 8 : miles === 0 ? 15 : Math.max(0, Math.min(15, Math.round((1 - miles / 500) * 15)));
  const localSourcingScore = material.usManufactured ? Math.min(15, baseLocal + 3) : baseLocal;

  // ── Transparency / completeness (max 10) ──────────────────────────────────────
  const transparencyFields = [
    material.description,
    material.gwpValue,
    material.pricePerUnit,
    material.leadTimeDays,
    material.epdUrl || material.epdNumber,
    material.specSheetUrl,
    material.manufacturerId,
    material.recycledContentPct,
    material.ec3IndustryMedian,
    material.category,
  ];
  const filledCount = transparencyFields.filter(
    (f) => f !== null && f !== undefined && String(f).trim() !== ''
  ).length;
  const transparencyScore = Math.round((filledCount / transparencyFields.length) * 10);

  const total = Math.min(100, epdScore + carbonScore + certificationScore + localSourcingScore + transparencyScore);

  return {
    total,
    breakdown: {
      epd: { score: epdScore, max: 30, hasEpd: hasEpdFlag, hasEpdNumber },
      carbon: { score: carbonScore, max: 25, gwp, median, bestPractice },
      certifications: { score: certificationScore, max: 20, certNames },
      localSourcing: { score: localSourcingScore, max: 15, miles, usManufactured: !!material.usManufactured },
      transparency: { score: transparencyScore, max: 10, filledFields: filledCount, totalFields: transparencyFields.length },
    },
  };
}

/** Score → hex color, matching the in-app ScoreRing thresholds. */
export function mcsColor(score: number): string {
  if (score >= 71) return '#22c55e'; // green-500
  if (score >= 41) return '#f59e0b'; // amber-500
  return '#ef4444'; // red-500
}

/** Score → short human label, matching the in-app ScoreRing labels. */
export function mcsLabel(score: number): string {
  if (score >= 85) return 'Excellent';
  if (score >= 71) return 'Good';
  if (score >= 55) return 'Fair';
  if (score >= 41) return 'Below Average';
  return 'Needs Work';
}
