/**
 * Buy Clean California Act — GWP Compliance Engine
 * ─────────────────────────────────────────────────
 * BCCA sets hard GWP limits for eligible materials on California public projects.
 * Contracts executed on or after July 1 2022 require EPD submission;
 * by 2026 GWP threshold enforcement is universal.
 *
 * Sources: DGS ca.gov BCCA page, April 2026 threshold update.
 *
 * GWP unit note:
 *   - Steel & glass limits are in kgCO₂e per METRIC TON → divide by 1000 for kgCO₂e/kg
 *   - Mineral wool limits are in kgCO₂e per m² at RSI=1 (functional unit, not per-kg)
 *     — we cannot compare directly to a per-kg gwpValue without density + thickness;
 *       these are flagged as NEEDS_FUNCTIONAL_UNIT.
 *
 * The `gwpValue` stored in the materials table is assumed to be in kgCO₂e/kg
 * (the standard EPD declaration unit per ISO 21930 / EN 15804).
 */

// ─── BCCA Threshold Table ───────────────────────────────────────────────────

export type BccaEligibleMaterial =
  | "structural_steel"
  | "rebar"
  | "flat_glass"
  | "mineral_wool_light"
  | "mineral_wool_heavy";

export type BccaUnit = "kgCO2e_per_kg" | "kgCO2e_per_m2_RSI1";

export interface BccaThreshold {
  label:         string;
  /** Maximum GWP — modules A1–A3 (cradle to gate) */
  maxGwp:        number;
  unit:          BccaUnit;
  /** If unit is per_m2_RSI1, we cannot compare to a per-kg gwpValue */
  canCompareToGwpPerKg: boolean;
  /** Human note for architect/supplier display */
  note:          string;
}

export const BCCA_THRESHOLDS: Record<BccaEligibleMaterial, BccaThreshold> = {
  structural_steel: {
    label:   "Structural Steel (Plate)",
    maxGwp:  1.490,                // 1,490 kgCO₂e/metric ton ÷ 1000
    unit:    "kgCO2e_per_kg",
    canCompareToGwpPerKg: true,
    note:    "Max 1,490 kgCO₂e/metric ton — modules A1–A3 (unfabricated)",
  },
  rebar: {
    label:   "Concrete Reinforcing Steel (Rebar)",
    maxGwp:  0.755,                // 755 kgCO₂e/metric ton ÷ 1000
    unit:    "kgCO2e_per_kg",
    canCompareToGwpPerKg: true,
    note:    "Max 755 kgCO₂e/metric ton — modules A1–A3 (unfabricated). Fabricated limit: 778 kgCO₂e/metric ton.",
  },
  flat_glass: {
    label:   "Flat Glass",
    maxGwp:  1.430,                // 1,430 kgCO₂e/metric ton ÷ 1000
    unit:    "kgCO2e_per_kg",
    canCompareToGwpPerKg: true,
    note:    "Max 1,430 kgCO₂e/metric ton — modules A1–A3 (unfabricated)",
  },
  mineral_wool_light: {
    label:   "Light-density Mineral Wool Board Insulation",
    maxGwp:  2.68,
    unit:    "kgCO2e_per_m2_RSI1",
    canCompareToGwpPerKg: false,
    note:    "Max 2.68 kgCO₂e per m² at RSI=1 — functional unit comparison required",
  },
  mineral_wool_heavy: {
    label:   "Heavy-density Mineral Wool Board Insulation",
    maxGwp:  6.82,
    unit:    "kgCO2e_per_m2_RSI1",
    canCompareToGwpPerKg: false,
    note:    "Max 6.82 kgCO₂e per m² at RSI=1 — functional unit comparison required",
  },
};

// ─── Category → BCCA mapping ────────────────────────────────────────────────
// Maps materials table category strings (case-insensitive) to BCCA material types.

const CATEGORY_TO_BCCA: Array<{ pattern: RegExp; type: BccaEligibleMaterial }> = [
  { pattern: /structural\s*steel|steel\s*plate|wide[\s-]?flange|HSS|W[\s-]?section/i, type: "structural_steel" },
  { pattern: /rebar|reinforcing\s*steel|concrete\s*reinforc/i,                          type: "rebar" },
  { pattern: /flat\s*glass|glazing|curtain[\s-]?wall|vision\s*glass|spandrel/i,         type: "flat_glass" },
  { pattern: /light[\s-]?density\s*mineral\s*wool|light\s*mineral\s*wool/i,             type: "mineral_wool_light" },
  { pattern: /mineral\s*wool|rock\s*wool|stone\s*wool/i,                                type: "mineral_wool_heavy" },
];

/**
 * Detect which BCCA material type (if any) a category string maps to.
 * Returns null if the material is not BCCA-eligible.
 */
export function detectBccaMaterial(
  category: string,
  name?: string,
): BccaEligibleMaterial | null {
  const haystack = `${category} ${name ?? ""}`;
  for (const { pattern, type } of CATEGORY_TO_BCCA) {
    if (pattern.test(haystack)) return type;
  }
  return null;
}

// ─── Compliance result ───────────────────────────────────────────────────────

export type BccaStatus =
  | "compliant"            // gwpValue ≤ BCCA limit
  | "non_compliant"        // gwpValue > BCCA limit
  | "needs_functional_unit"// mineral wool — can't compare per-kg
  | "no_gwp_data"          // gwpValue is null — cannot determine
  | "not_applicable";      // category is not BCCA-eligible

export interface BccaComplianceResult {
  status:        BccaStatus;
  materialType:  BccaEligibleMaterial | null;
  threshold:     BccaThreshold | null;
  gwpValue:      number | null;
  /** margin = threshold.maxGwp - gwpValue; positive = headroom, negative = over limit */
  gwpMargin:     number | null;
  /** Percentage headroom (positive) or overage (negative) */
  gwpMarginPct:  number | null;
  message:       string;
}

/**
 * Check whether a material's GWP complies with BCCA limits.
 *
 * @param category  materials.category
 * @param gwpValue  materials.gwpValue (kgCO₂e/kg) — null if unknown
 * @param name      Optional materials.name for finer pattern matching
 */
export function checkBccaCompliance(
  category: string,
  gwpValue: number | null,
  name?: string,
): BccaComplianceResult {
  const materialType = detectBccaMaterial(category, name);

  if (!materialType) {
    return {
      status:       "not_applicable",
      materialType: null,
      threshold:    null,
      gwpValue,
      gwpMargin:    null,
      gwpMarginPct: null,
      message:      "Material is not subject to BCCA GWP limits",
    };
  }

  const threshold = BCCA_THRESHOLDS[materialType];

  if (!threshold.canCompareToGwpPerKg) {
    return {
      status:       "needs_functional_unit",
      materialType,
      threshold,
      gwpValue,
      gwpMargin:    null,
      gwpMarginPct: null,
      message:      `${threshold.label}: BCCA limit is per m²/RSI — functional unit data required for compliance check. ${threshold.note}`,
    };
  }

  if (gwpValue === null) {
    return {
      status:       "no_gwp_data",
      materialType,
      threshold,
      gwpValue:     null,
      gwpMargin:    null,
      gwpMarginPct: null,
      message:      `${threshold.label}: GWP data missing — cannot verify BCCA compliance. EPD required.`,
    };
  }

  const margin    = parseFloat((threshold.maxGwp - gwpValue).toFixed(4));
  const marginPct = parseFloat(((margin / threshold.maxGwp) * 100).toFixed(2));
  const compliant = gwpValue <= threshold.maxGwp;

  return {
    status:       compliant ? "compliant" : "non_compliant",
    materialType,
    threshold,
    gwpValue,
    gwpMargin:    margin,
    gwpMarginPct: marginPct,
    message:      compliant
      ? `BCCA compliant — GWP ${gwpValue} kgCO₂e/kg is ${Math.abs(marginPct).toFixed(1)}% below the ${threshold.maxGwp} kgCO₂e/kg limit`
      : `BCCA NON-COMPLIANT — GWP ${gwpValue} kgCO₂e/kg exceeds the ${threshold.maxGwp} kgCO₂e/kg limit by ${Math.abs(marginPct).toFixed(1)}%`,
  };
}
