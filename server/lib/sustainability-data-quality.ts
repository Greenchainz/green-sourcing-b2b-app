/**
 * Sustainability Data Quality
 *
 * Implements the GreenChainz "Data Ladder" for supplier emissions data.
 *
 * Ladder levels (L0–L3):
 *   L0  — Proxy / no data (spend-based, industry average)        multiplier: 0.50
 *   L1  — Supplier self-reported (energy bills, spreadsheet)     multiplier: 0.70
 *   L2  — Third-party calculated (audited, not EPD-verified)     multiplier: 0.90
 *   L3  — EPD-verified / activity-based                          multiplier: 1.00
 *
 * Used in rfx-response-scorer to discount the carbonScore dimension
 * based on how trustworthy the supplier's emissions data is.
 *
 * SME principle: suppliers never see "L0/L1/L2/L3" jargon.
 * Buyers see the badge. Suppliers see "upload EPD → score improves."
 */

// ─── Core types ───────────────────────────────────────────────────────────────

export type DataQualityLevel = "L0" | "L1" | "L2" | "L3";

export type DataSourceType =
  | "none"
  | "industry_average"
  | "spend_based"
  | "energy_bill"
  | "supplier_self_reported"
  | "third_party_verified"
  | "epd";

/** Controls how a field is presented in the supplier onboarding UI. */
export type RequirementLevel =
  | "mandatory"      // Required to appear in RFQ comparison scoring
  | "score_booster"  // Optional — visible to buyers, improves score
  | "optional";      // Nice to have, no scoring impact

// ─── Label maps (for UI display) ─────────────────────────────────────────────

export const DATA_QUALITY_LABELS: Record<DataQualityLevel, string> = {
  L0: "Proxy data",
  L1: "Self-reported",
  L2: "Third-party verified",
  L3: "EPD verified",
};

export const DATA_QUALITY_DESCRIPTIONS: Record<DataQualityLevel, string> = {
  L0: "Industry average or spend-based estimate — least accurate",
  L1: "Supplier-provided energy bills or activity data",
  L2: "Third-party calculated or audited emissions data",
  L3: "Product EPD with verified activity-based data — most accurate",
};

export const DATA_SOURCE_LABELS: Record<DataSourceType, string> = {
  none:                 "No data",
  industry_average:     "Industry average",
  spend_based:          "Spend-based estimate",
  energy_bill:          "Energy bills",
  supplier_self_reported: "Supplier self-reported",
  third_party_verified: "Third-party verified",
  epd:                  "Product EPD",
};

// ─── Quality multiplier ───────────────────────────────────────────────────────

/**
 * Returns a 0–1 multiplier applied to the carbon scoring dimension.
 * Higher-quality data yields a higher multiplier (less penalised).
 * L3 (EPD) is the gold standard at 1.0 — no penalty.
 *
 * These multipliers reflect the degree of trust in the data, not
 * a punishment for small suppliers. L1 (energy bills) is still a
 * real 70% of full score — much better than no data.
 */
export function sustainabilityWeightMultiplier(level: DataQualityLevel): number {
  switch (level) {
    case "L3": return 1.0;
    case "L2": return 0.9;
    case "L1": return 0.7;
    case "L0":
    default:   return 0.5;
  }
}

// ─── Source-type → quality-level inference ────────────────────────────────────

/**
 * Infers a DataQualityLevel from a DataSourceType.
 * Used when an explicit level has not been persisted on the record.
 */
export function inferDataQualityLevel(
  source: DataSourceType | null | undefined,
): DataQualityLevel {
  switch (source) {
    case "epd":                  return "L3";
    case "third_party_verified": return "L2";
    case "energy_bill":
    case "supplier_self_reported": return "L1";
    case "spend_based":
    case "industry_average":
    case "none":
    default:                     return "L0";
  }
}

// ─── Bid-level quality inference ─────────────────────────────────────────────

/**
 * Infers the data quality level for a single RFQ bid response.
 *
 * Priority:
 *   1. Explicit persisted level (most reliable)
 *   2. EPD present → L3 (activity-based, verified)
 *   3. GWP value without EPD → L1 (self-reported)
 *   4. Nothing → L0
 *
 * Used in the scoring pipeline when a stored quality level needs
 * to be combined with real-time bid data.
 */
export function inferBidDataQualityLevel(
  persistedLevel: DataQualityLevel | string | null | undefined,
  hasEpd: boolean,
  hasGwp: boolean,
): DataQualityLevel {
  // Validate stored value — reject unknown strings
  if (persistedLevel === "L3" || persistedLevel === "L2" ||
      persistedLevel === "L1" || persistedLevel === "L0") {
    return persistedLevel as DataQualityLevel;
  }
  if (hasEpd) return "L3";
  if (hasGwp) return "L1";
  return "L0";
}

// ─── FIELD REQUIREMENT CATALOGUE ─────────────────────────────────────────────

/**
 * Describes a single sustainability data field from the buyer's perspective.
 * Used to render the "Data completeness" panel on the supplier profile.
 */
export interface SustainabilityFieldSpec {
  key: string;
  label: string;
  requirementLevel: RequirementLevel;
  /** Which data ladder level this field unlocks/improves */
  unlocksLevel?: DataQualityLevel;
  helpText: string;
}

export const SUSTAINABILITY_FIELD_SPECS: SustainabilityFieldSpec[] = [
  {
    key: "has_epd",
    label: "Has product EPD",
    requirementLevel: "score_booster",
    unlocksLevel: "L3",
    helpText: "An Environmental Product Declaration verified by a third party. Highest-quality carbon data.",
  },
  {
    key: "epd_reference",
    label: "EPD reference / URL",
    requirementLevel: "score_booster",
    unlocksLevel: "L3",
    helpText: "Link to your published EPD or document number (e.g. from EC3, EPD International).",
  },
  {
    key: "electricity_kwh",
    label: "Annual electricity usage (kWh)",
    requirementLevel: "score_booster",
    unlocksLevel: "L1",
    helpText: "From your utility bill. We calculate your Scope 2 emissions automatically.",
  },
  {
    key: "natural_gas_mmbtu",
    label: "Annual natural gas usage (MMBtu)",
    requirementLevel: "score_booster",
    unlocksLevel: "L1",
    helpText: "From your gas bill. We calculate Scope 1 emissions automatically.",
  },
  {
    key: "diesel_gallons",
    label: "Annual diesel usage (gallons)",
    requirementLevel: "optional",
    unlocksLevel: "L1",
    helpText: "Diesel used in equipment or vehicles. Counts toward Scope 1.",
  },
  {
    key: "certifications",
    label: "Sustainability certifications",
    requirementLevel: "score_booster",
    helpText: "e.g. LEED, FSC, ISO 14001, GREENGUARD Gold, Declare Label, Buy Clean.",
  },
  {
    key: "annual_revenue",
    label: "Annual revenue (USD)",
    requirementLevel: "optional",
    unlocksLevel: "L0",
    helpText: "Used for spend-based emissions estimate when no energy data is available.",
  },
];
