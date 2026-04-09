/**
 * CALGreen (California Green Building Standards Code) compliance helpers.
 *
 * A material is considered CALGreen-compliant if it has a verified EPD
 * and meets basic environmental thresholds. This is a simplified check —
 * full CALGreen compliance depends on product category, GWP limits, and
 * facility-specific EPD requirements that vary by material type.
 */

export interface CalgreenMaterial {
  hasEpd?: number | boolean | null;
  gwpValue?: string | number | null;
  recycledContentPct?: string | number | null;
  vocLevel?: string | null;
}

/**
 * Check if a material meets basic CALGreen compliance criteria:
 * 1. Must have a verified EPD (hasEpd = 1 or true)
 * 2. Must have a reported GWP value (not null/undefined)
 * 3. VOC level must not be "high" (if specified)
 */
export function isCalgreenCompliant(material: CalgreenMaterial): boolean {
  // Must have an EPD
  if (!material.hasEpd) return false;

  // Must have a GWP value reported
  const gwp = material.gwpValue != null ? Number(material.gwpValue) : null;
  if (gwp === null || isNaN(gwp)) return false;

  // VOC level must not be high
  if (material.vocLevel === 'high') return false;

  return true;
}
