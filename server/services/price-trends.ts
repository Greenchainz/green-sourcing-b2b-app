/**
 * BLS/FRED PPI price trend data for material categories.
 *
 * Hardcoded seed data for initial launch (Q1 2026 approximate values).
 * Structure is ready to be replaced by live FRED API calls later.
 */

export interface PriceTrend {
  yoyChange: number;
  direction: "up" | "down" | "flat";
  lastUpdated: string;
  seriesId: string;
}

const PRICE_TRENDS: Record<string, PriceTrend> = {
  // BLS PPI series — approximate real YoY % changes
  "Concrete": { yoyChange: 3.2, direction: "up", lastUpdated: "2026-01", seriesId: "WPU133" },
  "Concrete / Cement": { yoyChange: 3.2, direction: "up", lastUpdated: "2026-01", seriesId: "WPU133" },
  "Cement": { yoyChange: 3.2, direction: "up", lastUpdated: "2026-01", seriesId: "WPU133" },
  "PrecastConcrete": { yoyChange: 3.2, direction: "up", lastUpdated: "2026-01", seriesId: "WPU133" },
  "Steel": { yoyChange: 12.4, direction: "up", lastUpdated: "2026-01", seriesId: "WPU1017" },
  "RebarSteel": { yoyChange: 12.4, direction: "up", lastUpdated: "2026-01", seriesId: "WPU1017" },
  "HotRolledSections": { yoyChange: 12.4, direction: "up", lastUpdated: "2026-01", seriesId: "WPU1017" },
  "ColdFormedFraming": { yoyChange: 12.4, direction: "up", lastUpdated: "2026-01", seriesId: "WPU1017" },
  "Insulation": { yoyChange: 5.1, direction: "up", lastUpdated: "2026-01", seriesId: "WPU0723" },
  "BoardInsulation": { yoyChange: 5.1, direction: "up", lastUpdated: "2026-01", seriesId: "WPU0723" },
  "BlanketInsulation": { yoyChange: 5.1, direction: "up", lastUpdated: "2026-01", seriesId: "WPU0723" },
  "InsulatedWallPanels": { yoyChange: 5.1, direction: "up", lastUpdated: "2026-01", seriesId: "WPU0723" },
  "Gypsum": { yoyChange: -2.3, direction: "down", lastUpdated: "2026-01", seriesId: "WPU1392" },
  "Gypsum Board": { yoyChange: -2.3, direction: "down", lastUpdated: "2026-01", seriesId: "WPU1392" },
  "Glass": { yoyChange: 1.8, direction: "up", lastUpdated: "2026-01", seriesId: "WPU0741" },
  "CurtainWalls": { yoyChange: 1.8, direction: "up", lastUpdated: "2026-01", seriesId: "WPU0741" },
  "Windows": { yoyChange: 1.8, direction: "up", lastUpdated: "2026-01", seriesId: "WPU0741" },
  "Aluminium": { yoyChange: 26.0, direction: "up", lastUpdated: "2026-01", seriesId: "WPU1023" },
  "Aluminum": { yoyChange: 26.0, direction: "up", lastUpdated: "2026-01", seriesId: "WPU1023" },
  "Masonry": { yoyChange: 4.5, direction: "up", lastUpdated: "2026-01", seriesId: "WPU1331" },
  "CeramicTile": { yoyChange: 4.5, direction: "up", lastUpdated: "2026-01", seriesId: "WPU1331" },
  "NonStructuralWood": { yoyChange: -8.2, direction: "down", lastUpdated: "2026-01", seriesId: "WPU0811" },
  "WoodFlooring": { yoyChange: -8.2, direction: "down", lastUpdated: "2026-01", seriesId: "WPU0811" },
  "Mass Timber": { yoyChange: -8.2, direction: "down", lastUpdated: "2026-01", seriesId: "WPU0811" },
  "MembraneRoofing": { yoyChange: 2.1, direction: "up", lastUpdated: "2026-01", seriesId: "WPU0732" },
  "StoneCladding": { yoyChange: 3.8, direction: "up", lastUpdated: "2026-01", seriesId: "WPU1332" },
};

/**
 * Get price trend for a specific category. Falls back to fuzzy matching
 * on partial category names (e.g., "Concrete / Cement" matches "Concrete").
 */
export function getPriceTrend(category: string): PriceTrend | null {
  // Exact match first
  if (PRICE_TRENDS[category]) return PRICE_TRENDS[category];

  // Fuzzy: check if any key is contained in the category or vice-versa
  const lowerCat = category.toLowerCase();
  for (const [key, trend] of Object.entries(PRICE_TRENDS)) {
    const lowerKey = key.toLowerCase();
    if (lowerCat.includes(lowerKey) || lowerKey.includes(lowerCat)) {
      return trend;
    }
  }

  return null;
}

/**
 * Get all price trends. Used by the frontend to fetch once and cache.
 */
export function getAllPriceTrends(): Record<string, PriceTrend> {
  return { ...PRICE_TRENDS };
}
