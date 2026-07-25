/**
 * EPD Integration Wrapper
 *
 * Thin layer over server/services/epd-ingestion.ts that adds:
 *   - Typed error class with a `field` hint for validation failures
 *   - Safe wrappers that convert thrown generic errors into EPDIntegrationError
 *   - Re-exports all public types so callers only need one import path
 *
 * Callers should import from here, not from server/services/epd-ingestion.ts.
 */

import {
  normaliseGwp as _normaliseGwp,
  normaliseEpdPayload as _normaliseEpdPayload,
} from "../../services/epd-ingestion";

import type { GwpUnit, EpdPayload, NormalisedEpd } from "../../services/epd-ingestion";

// Re-export types for callers who import from this module only
export type { GwpUnit, EpdPayload, NormalisedEpd };

// ─── Error class ─────────────────────────────────────────────────────────────

export class EPDIntegrationError extends Error {
  constructor(
    message: string,
    /** The input field that triggered the validation error, if applicable */
    public readonly field?: string
  ) {
    super(message);
    this.name = "EPDIntegrationError";
  }
}

// ─── Error mapping ────────────────────────────────────────────────────────────

/**
 * Extract the field name from a validation error message produced by
 * epd-ingestion.ts, so callers can surface a precise error to the user.
 *
 * Examples:
 *   "massKgPer1000sf is required..." → "massKgPer1000sf"
 *   "msfFactor is required..."       → "msfFactor"
 *   "productName is required"        → "productName"
 *   "gwpValue must be..."            → "gwpValue"
 *   "Unsupported gwpUnit: ..."       → "gwpUnit"
 */
function extractField(message: string): string | undefined {
  const known = [
    "massKgPer1000sf",
    "msfFactor",
    "productName",
    "gwpValue",
    "gwpUnit",
  ] as const;

  return known.find((f) => message.includes(f));
}

function toIntegrationError(err: unknown): EPDIntegrationError {
  if (err instanceof EPDIntegrationError) return err;
  const message = err instanceof Error ? err.message : String(err);
  return new EPDIntegrationError(message, extractField(message));
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Normalise a raw GWP value to kgCO2e per 1,000 SF.
 * Throws EPDIntegrationError (with field hint) on invalid inputs.
 */
export function normaliseGwp(payload: EpdPayload): number {
  try {
    return _normaliseGwp(payload);
  } catch (err) {
    throw toIntegrationError(err);
  }
}

/**
 * Validate and normalise an EPD payload.
 * Returns the payload enriched with `gwpPer1000sf`.
 * Throws EPDIntegrationError (with field hint) on validation failure.
 */
export function normaliseEpdPayload(payload: EpdPayload): NormalisedEpd {
  try {
    return _normaliseEpdPayload(payload);
  } catch (err) {
    throw toIntegrationError(err);
  }
}

/**
 * Returns true if the provided value is a structurally valid EpdPayload.
 * Does not normalise units — useful for UI pre-validation and feature flags.
 */
export function isEPDPayloadValid(payload: unknown): payload is EpdPayload {
  if (!payload || typeof payload !== "object") return false;
  const p = payload as Record<string, unknown>;

  if (typeof p.productName !== "string" || !p.productName.trim()) return false;
  if (typeof p.gwpValue !== "number" || p.gwpValue < 0) return false;

  const validUnits: GwpUnit[] = ["per m2", "per kg", "per metric ton", "per 1000 sqft"];
  if (!validUnits.includes(p.gwpUnit as GwpUnit)) return false;

  return true;
}
