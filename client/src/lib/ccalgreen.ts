// CALGreen Title 24 Part 11 Prescriptive Pathway thresholds (175% of industry avg, kgCO2e per declared unit)
// Sources: EC3 industry averages as of 2025 data. Fallback = 500 kgCO2e.
export const CALGREEN_GWP_THRESHOLDS: Record<string, number> = {
  "Concrete":            350,
  "Steel":               1400,
  "Aluminum":            11_000,
  "Insulation":          175,
  "Glass":               700,
  "Gypsum":              350,
  "Wood":                350,
  "Flooring":            350,
  "Roofing":             525,
  "Cladding":            700,
  "Masonry":             280,
  "Composite":           525,
};

const CALGREEN_FALLBACK_GWP = 500;

export function isCalgreenCompliant(material: {
  hasEpd?: boolean | null;
  gwpValue?: string | number | null;
  category?: string | null;
}): boolean {
  if (!material.hasEpd) return false;
  if (material.gwpValue == null || material.gwpValue === "") return false;

  const gwp = Number(material.gwpValue);
  if (isNaN(gwp)) return false;

  const threshold =
    (material.category && CALGREEN_GWP_THRESHOLDS[material.category]) ??
    CALGREEN_FALLBACK_GWP;

  return gwp <= threshold;
}
