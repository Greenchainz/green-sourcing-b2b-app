/**
 * EPD Ingestion Service
 *
 * Accepts a JSON payload representing an Environmental Product Declaration,
 * normalises the GWP value to kgCO2e per 1,000 SF, and writes the record to
 * the epd_materials table.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type GwpUnit =
  | "per m2"
  | "per kg"
  | "per metric ton"
  | "per 1000 sqft";

export interface EpdPayload {
  manufacturerName?: string;
  productName: string;
  epdNumber?: string;
  gwpValue: number;
  gwpUnit: GwpUnit;
  declaredUnit?: string;
  dimension?: string;
  assemblyType?: string;
  /** 1 | 2 | 3 — null when not applicable */
  coreOption?: 1 | 2 | 3 | null;
  notes?: string;
  /**
   * Required when gwpUnit === "per kg".
   * Represents the declared mass assumption in kg per 1,000 SF.
   */
  massKgPer1000sf?: number;
  /**
   * Required when gwpUnit === "per metric ton".
   * MSF (thousand square feet) factor.
   */
  msfFactor?: number;
}

export interface NormalisedEpd extends EpdPayload {
  gwpPer1000sf: number;
}

// ─── Normalisation ────────────────────────────────────────────────────────────

const M2_TO_1000SF = 92.903; // 1,000 SF ÷ m² per 1,000 SF = 92.903 m²

/**
 * Normalise a raw GWP value to kgCO2e per 1,000 SF.
 *
 * Conversion factors:
 *   per m²          → × 92.903
 *   per kg          → × massKgPer1000sf (declared mass assumption)
 *   per metric ton  → × msfFactor       (MSF factor from payload)
 *   per 1000 sqft   → × 1 (already normalised)
 */
export function normaliseGwp(payload: EpdPayload): number {
  const { gwpValue, gwpUnit } = payload;

  switch (gwpUnit) {
    case "per m2":
      return gwpValue * M2_TO_1000SF;

    case "per kg": {
      const mass = payload.massKgPer1000sf;
      if (!mass || mass <= 0) {
        throw new Error(
          'massKgPer1000sf is required and must be > 0 when gwpUnit is "per kg"'
        );
      }
      return gwpValue * mass;
    }

    case "per metric ton": {
      const msf = payload.msfFactor;
      if (!msf || msf <= 0) {
        throw new Error(
          'msfFactor is required and must be > 0 when gwpUnit is "per metric ton"'
        );
      }
      return gwpValue * msf;
    }

    case "per 1000 sqft":
      return gwpValue;

    default: {
      // Exhaustive check — TypeScript will warn if a new GwpUnit variant is added.
      const _: never = gwpUnit;
      throw new Error(`Unsupported gwpUnit: ${_}`);
    }
  }
}

/**
 * Validate and normalise an EPD payload.
 * Returns the payload enriched with `gwpPer1000sf`.
 */
export function normaliseEpdPayload(payload: EpdPayload): NormalisedEpd {
  if (!payload.productName?.trim()) {
    throw new Error("productName is required");
  }
  if (typeof payload.gwpValue !== "number" || payload.gwpValue < 0) {
    throw new Error("gwpValue must be a non-negative number");
  }

  const gwpPer1000sf = normaliseGwp(payload);

  return {
    ...payload,
    gwpPer1000sf,
  };
}
