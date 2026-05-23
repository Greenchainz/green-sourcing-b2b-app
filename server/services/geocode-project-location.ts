/**
 * Geocode an RFQ project location.
 *
 * Inputs: any combination of city, state (2-char), zip.
 * Output: lat/lng + best-effort ASHRAE climate zone + source.
 *
 * Designed so swap engine can compute real distance to suppliers.
 * Falls back to state-only climate zone when Azure Maps is unavailable
 * or returns no result.
 */

import { geocodeAddress } from "../azure-maps-service";

export interface ProjectGeocodeInput {
  city?: string;
  state?: string;
  zip?: string;
}

export interface ProjectGeocodeResult {
  latitude: number | null;
  longitude: number | null;
  climateZone: string | null;
  source: "azure_maps" | "fallback" | "none";
}

/**
 * Approximate ASHRAE / IECC climate zone by US state.
 * Coarse mapping (states crossing zones get the dominant zone).
 * Good enough as a default; per-zip refinement can come later.
 */
const STATE_CLIMATE_ZONE: Readonly<Record<string, string>> = {
  AK: "7", AL: "3A", AR: "3A", AZ: "2B", CA: "3C", CO: "5B",
  CT: "5A", DC: "4A", DE: "4A", FL: "2A", GA: "3A", HI: "1A",
  IA: "5A", ID: "6B", IL: "5A", IN: "5A", KS: "4A", KY: "4A",
  LA: "2A", MA: "5A", MD: "4A", ME: "6A", MI: "5A", MN: "6A",
  MO: "4A", MS: "3A", MT: "6B", NC: "4A", ND: "6A", NE: "5A",
  NH: "6A", NJ: "4A", NM: "4B", NV: "3B", NY: "5A", OH: "5A",
  OK: "3A", OR: "4C", PA: "5A", RI: "5A", SC: "3A", SD: "5A",
  TN: "4A", TX: "2A", UT: "5B", VA: "4A", VT: "6A", WA: "4C",
  WI: "6A", WV: "5A", WY: "6B",
};

function resolveClimateZone(state: string | undefined): string | null {
  if (!state) return null;
  return STATE_CLIMATE_ZONE[state.toUpperCase()] ?? null;
}

function buildQuery(input: ProjectGeocodeInput): string | null {
  const parts: string[] = [];
  if (input.zip) parts.push(input.zip);
  if (input.city) parts.push(input.city);
  if (input.state) parts.push(input.state);
  if (parts.length === 0) return null;
  return parts.join(", ") + ", USA";
}

export async function geocodeProjectLocation(
  input: ProjectGeocodeInput,
): Promise<ProjectGeocodeResult> {
  const climateZone = resolveClimateZone(input.state);
  const query = buildQuery(input);

  if (!query) {
    return { latitude: null, longitude: null, climateZone: null, source: "none" };
  }

  try {
    const coords = await geocodeAddress(query);
    if (coords) {
      return {
        latitude: coords.latitude,
        longitude: coords.longitude,
        climateZone,
        source: "azure_maps",
      };
    }
  } catch (err) {
    console.error("[geocodeProjectLocation] Azure Maps failed:", err);
  }

  return {
    latitude: null,
    longitude: null,
    climateZone,
    source: "fallback",
  };
}
