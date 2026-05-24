/**
 * Emissions Calculator
 *
 * SME-friendly Scope 1 + Scope 2 calculator for supplier sustainability profiles.
 * Accepts plain utility-bill numbers — no engineering degree required.
 *
 * Sources:
 *   Scope 1 (natural gas):  US EPA CH4/N2O factors, 2023  — 53.06 kgCO2e/MMBtu
 *   Scope 1 (diesel):       US EPA mobile combustion, 2023 — 10.21 kgCO2e/gallon
 *   Scope 2 (electricity):  US average eGrid 2022          —  0.386 kgCO2e/kWh
 *   Spend-based fallback:   US EEIO manufacturing average  —  0.15  kgCO2e/$
 *                           (stored on profile as L0, upgradeable later)
 *
 * Results in tCO2e (metric tonnes). All inputs optional — missing values
 * treated as zero for that source, not as an error.
 */

import {
  type DataQualityLevel,
  type DataSourceType,
  inferBidDataQualityLevel,
} from "../lib/sustainability-data-quality";

// ─── Emission factors (2023 US averages) ─────────────────────────────────────

const EF = {
  /** kgCO2e per kWh (US average grid, eGrid 2022) */
  ELECTRICITY_KWH: 0.386,
  /** kgCO2e per MMBtu of natural gas (EPA 2023) */
  NATURAL_GAS_MMBTU: 53.06,
  /** kgCO2e per gallon of diesel (EPA 2023) */
  DIESEL_GALLON: 10.21,
  /** kgCO2e per USD of revenue (US EEIO manufacturing average, conservative) */
  SPEND_BASED_PER_USD: 0.15,
} as const;

// ─── Public types ─────────────────────────────────────────────────────────────

export interface EmissionsCalculatorInput {
  /** Annual electricity consumption in kWh (from utility bill) */
  electricityKwh?: number | null;
  /** Annual natural gas consumption in MMBtu (from utility bill) */
  naturalGasMmbtu?: number | null;
  /** Annual diesel consumption in gallons (vehicles + equipment) */
  dieselGallons?: number | null;
  /** Annual revenue in USD — used only if no energy data is available */
  annualRevenue?: number | null;
}

export interface EmissionsCalculatorResult {
  /** Scope 1 emissions (natural gas + diesel) in tCO2e */
  scope1Emissions: number;
  /** Scope 2 emissions (electricity) in tCO2e */
  scope2Emissions: number;
  /** Total Scope 1 + 2 emissions in tCO2e */
  totalEmissions: number;
  /** Data quality level inferred from what inputs were provided */
  dataQualityLevel: DataQualityLevel;
  /** How the calculation was performed */
  calculationMethod: string;
  /** Human-readable breakdown for the supplier UI */
  breakdown: {
    electricity:  { kwh: number; kgCO2e: number } | null;
    naturalGas:   { mmbtu: number; kgCO2e: number } | null;
    diesel:       { gallons: number; kgCO2e: number } | null;
    spendBased:   { revenue: number; kgCO2e: number } | null;
  };
}

// ─── Calculator ───────────────────────────────────────────────────────────────

/**
 * Calculate Scope 1 + 2 emissions from SME-friendly utility bill inputs.
 *
 * Returns tCO2e values and the inferred data quality level.
 * Never throws — missing inputs are treated as zero for their source.
 */
export function calculateEmissions(
  input: EmissionsCalculatorInput,
): EmissionsCalculatorResult {
  const electricityKwh  = clampPositive(input.electricityKwh);
  const naturalGasMmbtu = clampPositive(input.naturalGasMmbtu);
  const dieselGallons   = clampPositive(input.dieselGallons);
  const annualRevenue   = clampPositive(input.annualRevenue);

  const hasEnergyData = electricityKwh > 0 || naturalGasMmbtu > 0 || dieselGallons > 0;

  // ── Scope 1 (combustion) ────────────────────────────────────────────────────
  const gasKgCO2e    = naturalGasMmbtu * EF.NATURAL_GAS_MMBTU;
  const dieselKgCO2e = dieselGallons   * EF.DIESEL_GALLON;
  const scope1KgCO2e = gasKgCO2e + dieselKgCO2e;

  // ── Scope 2 (purchased electricity) ─────────────────────────────────────────
  const electricityKgCO2e = electricityKwh * EF.ELECTRICITY_KWH;
  const scope2KgCO2e      = electricityKgCO2e;

  // ── Spend-based fallback (L0, only used when no energy data) ────────────────
  let spendKgCO2e = 0;
  let useSpendBased = false;
  if (!hasEnergyData && annualRevenue > 0) {
    spendKgCO2e   = annualRevenue * EF.SPEND_BASED_PER_USD;
    useSpendBased = true;
  }

  // ── Totals (convert kg → t) ───────────────────────────────────────────────
  const scope1Emissions = round4(scope1KgCO2e / 1000);
  const scope2Emissions = round4(scope2KgCO2e / 1000);
  const spendTotal      = round4(spendKgCO2e  / 1000);

  const totalEmissions = useSpendBased
    ? spendTotal
    : round4((scope1KgCO2e + scope2KgCO2e) / 1000);

  // ── Quality level inference ───────────────────────────────────────────────
  const dataQualityLevel: DataQualityLevel = hasEnergyData ? "L1" : (useSpendBased ? "L0" : "L0");
  const calculationMethod = useSpendBased
    ? "spend_based"
    : hasEnergyData
      ? "energy_bill"
      : "none";

  return {
    scope1Emissions,
    scope2Emissions,
    totalEmissions,
    dataQualityLevel,
    calculationMethod,
    breakdown: {
      electricity: electricityKwh > 0
        ? { kwh: electricityKwh, kgCO2e: round2(electricityKgCO2e) }
        : null,
      naturalGas: naturalGasMmbtu > 0
        ? { mmbtu: naturalGasMmbtu, kgCO2e: round2(gasKgCO2e) }
        : null,
      diesel: dieselGallons > 0
        ? { gallons: dieselGallons, kgCO2e: round2(dieselKgCO2e) }
        : null,
      spendBased: useSpendBased && annualRevenue > 0
        ? { revenue: annualRevenue, kgCO2e: round2(spendKgCO2e) }
        : null,
    },
  };
}

/**
 * Produce a human-readable summary string from a calculator result.
 * Suitable for display in the supplier onboarding UI.
 */
export function formatEmissionsResult(result: EmissionsCalculatorResult): string {
  const t = result.totalEmissions;
  if (t === 0) return "No emissions data";
  if (t < 1)   return `${(t * 1000).toFixed(0)} kgCO₂e/year`;
  return `${t.toLocaleString(undefined, { maximumFractionDigits: 1 })} tCO₂e/year`;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function clampPositive(v: number | null | undefined): number {
  if (v == null || isNaN(v) || v < 0) return 0;
  return v;
}

function round2(n: number): number { return Math.round(n * 100) / 100; }
function round4(n: number): number { return Math.round(n * 10000) / 10000; }
