// SDA API was shut down April 2026. This stub satisfies imports until routes are removed.

export interface SDAMaterialSeedResult {
  category: string;
  fetched: number;
}

export async function fetchSDAMaterialsForSeed(): Promise<SDAMaterialSeedResult[]> {
  // SDA shutdown — returns empty so admin seed route responds gracefully
  return [];
}

export interface SDAProductEpd {
  id: string;
  name: string;
  gwp: number;
  category: string;
  manufacturer: string;
  declaredUnit: string;
  validUntil: string;
  pcrName?: string;
  [key: string]: unknown;
}

export async function searchEpds(_query: string, _category?: string, _limit?: number): Promise<SDAProductEpd[]> {
  return [];
}

export async function getEpdDetail(_id: string): Promise<SDAProductEpd | null> {
  // SDA shutdown — returns null so callers degrade gracefully.
  // Callers (epd-sync-scheduler, tests) check `if (!detail)`, so null is the safe contract.
  return null;
}

export async function findBestEpd(
  _query: string,
  _category?: string,
): Promise<SDAProductEpd | null> {
  // SDA shutdown — no EPD data available, returns null.
  return null;
}
