/**
 * Price Trends Service
 *
 * Provides price trend analysis, category-level trends, and volatility metrics.
 * Uses raw SQL via pg pool (parameterized queries only).
 *
 * Expected schema:
 *
 * -- CREATE TABLE price_history (
 * --   id SERIAL PRIMARY KEY,
 * --   "materialId" INTEGER NOT NULL REFERENCES materials(id),
 * --   "avgPrice" DECIMAL(12,2) NOT NULL,
 * --   "recordDate" DATE NOT NULL,
 * --   "priceUnit" VARCHAR(50) DEFAULT 'USD',
 * --   "createdAt" TIMESTAMP DEFAULT NOW()
 * -- );
 * --
 * -- CREATE INDEX idx_price_history_material_date ON price_history("materialId", "recordDate");
 * -- CREATE INDEX idx_price_history_date ON price_history("recordDate");
 */

import { queryOne, queryMany } from '../../lib/pg-pool';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PriceTrendDataPoint {
  date: string;
  avgPrice: number;
}

export interface PriceTrend {
  materialId: number;
  period: string;
  direction: 'up' | 'down' | 'stable';
  percentChange: number;
  dataPoints: PriceTrendDataPoint[];
  movingAvg7d: PriceTrendDataPoint[];
  movingAvg30d: PriceTrendDataPoint[];
}

export interface CategoryTrend {
  category: string;
  period: string;
  avgPriceMovement: number;
  direction: 'up' | 'down' | 'stable';
  topMovers: {
    materialId: number;
    materialName: string;
    percentChange: number;
    direction: 'up' | 'down' | 'stable';
  }[];
}

export interface VolatilityData {
  materialId: number;
  volatility: 'low' | 'medium' | 'high';
  cv: number;
  stdDev: number;
}

// ─── Row Types ──────────────────────────────────────────────────────────────

interface PriceHistoryRow {
  materialId: number;
  avgPrice: string;
  recordDate: string;
}

interface MovingAvgRow {
  recordDate: string;
  moving_avg: string;
}

interface VolatilityRow {
  std_dev: string | null;
  avg_price: string | null;
}

interface CategoryMaterialRow {
  materialId: number;
  materialName: string;
  first_price: string | null;
  last_price: string | null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function periodToInterval(period: '30d' | '90d' | '1y' | 'all'): string {
  switch (period) {
    case '30d': return '30 days';
    case '90d': return '90 days';
    case '1y': return '1 year';
    case 'all': return '100 years'; // effectively no limit
  }
}

function classifyDirection(pctChange: number): 'up' | 'down' | 'stable' {
  if (pctChange > 1) return 'up';
  if (pctChange < -1) return 'down';
  return 'stable';
}

// ─── Service Functions ──────────────────────────────────────────────────────

/**
 * Get price trend for a material over a given period.
 * Returns data points, direction, percent change, and moving averages.
 *
 * Overload 1 (legacy): getPriceTrend(category: string) — returns hardcoded seed data
 * Overload 2 (new):    getPriceTrend(materialId: number, period: string) — returns DB data
 */
export function getPriceTrend(category: string): LegacyPriceTrend | null;
export function getPriceTrend(materialId: number, period: '30d' | '90d' | '1y' | 'all'): Promise<PriceTrend>;
export function getPriceTrend(
  materialIdOrCategory: number | string,
  period?: '30d' | '90d' | '1y' | 'all'
): Promise<PriceTrend> | LegacyPriceTrend | null {
  // Legacy path: called with a string category (from routers.ts)
  if (typeof materialIdOrCategory === 'string') {
    return getLegacyPriceTrend(materialIdOrCategory);
  }
  return getPriceTrendFromDb(materialIdOrCategory, period ?? '90d');
}

async function getPriceTrendFromDb(
  materialId: number,
  period: '30d' | '90d' | '1y' | 'all'
): Promise<PriceTrend> {
  const interval = periodToInterval(period);
  const emptyResult: PriceTrend = {
    materialId, period, direction: 'stable', percentChange: 0,
    dataPoints: [], movingAvg7d: [], movingAvg30d: [],
  };

  let rows: PriceHistoryRow[];
  try {
    rows = await queryMany<PriceHistoryRow>(
      `SELECT "materialId", "avgPrice"::TEXT AS "avgPrice", "recordDate"::TEXT AS "recordDate"
       FROM price_history
       WHERE "materialId" = $1
         AND "recordDate" >= CURRENT_DATE - $2::INTERVAL
       ORDER BY "recordDate" ASC`,
      [materialId, interval]
    );
  } catch {
    // price_history table may not exist yet
    return emptyResult;
  }

  const dataPoints: PriceTrendDataPoint[] = rows.map(r => ({
    date: r.recordDate,
    avgPrice: parseFloat(r.avgPrice),
  }));

  // Calculate percent change
  let percentChange = 0;
  if (dataPoints.length >= 2) {
    const first = dataPoints[0].avgPrice;
    const last = dataPoints[dataPoints.length - 1].avgPrice;
    if (first > 0) {
      percentChange = parseFloat((((last - first) / first) * 100).toFixed(2));
    }
  }

  // 7-day moving average
  const ma7rows = await queryMany<MovingAvgRow>(
    `SELECT "recordDate"::TEXT AS "recordDate",
            AVG("avgPrice") OVER (ORDER BY "recordDate" ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)::TEXT AS moving_avg
     FROM price_history
     WHERE "materialId" = $1
       AND "recordDate" >= CURRENT_DATE - $2::INTERVAL
     ORDER BY "recordDate" ASC`,
    [materialId, interval]
  );

  const movingAvg7d: PriceTrendDataPoint[] = ma7rows.map(r => ({
    date: r.recordDate,
    avgPrice: Math.round(parseFloat(r.moving_avg) * 100) / 100,
  }));

  // 30-day moving average
  const ma30rows = await queryMany<MovingAvgRow>(
    `SELECT "recordDate"::TEXT AS "recordDate",
            AVG("avgPrice") OVER (ORDER BY "recordDate" ROWS BETWEEN 29 PRECEDING AND CURRENT ROW)::TEXT AS moving_avg
     FROM price_history
     WHERE "materialId" = $1
       AND "recordDate" >= CURRENT_DATE - $2::INTERVAL
     ORDER BY "recordDate" ASC`,
    [materialId, interval]
  );

  const movingAvg30d: PriceTrendDataPoint[] = ma30rows.map(r => ({
    date: r.recordDate,
    avgPrice: Math.round(parseFloat(r.moving_avg) * 100) / 100,
  }));

  return {
    materialId,
    period,
    direction: classifyDirection(percentChange),
    percentChange,
    dataPoints,
    movingAvg7d,
    movingAvg30d,
  };
}

/**
 * Get aggregated price trends across all materials in a category.
 * Returns average price movement and top movers.
 */
export async function getCategoryTrends(
  category: string,
  period: '30d' | '90d' | '1y'
): Promise<CategoryTrend> {
  const interval = periodToInterval(period);
  const emptyResult: CategoryTrend = {
    category, period, avgPriceMovement: 0, direction: 'stable', topMovers: [],
  };

  let materialRows: CategoryMaterialRow[];
  try {
    materialRows = await queryMany<CategoryMaterialRow>(
      `SELECT
         m.id AS "materialId",
         m.name AS "materialName",
         (SELECT ph."avgPrice"::TEXT FROM price_history ph
          WHERE ph."materialId" = m.id AND ph."recordDate" >= CURRENT_DATE - $2::INTERVAL
          ORDER BY ph."recordDate" ASC LIMIT 1) AS first_price,
         (SELECT ph."avgPrice"::TEXT FROM price_history ph
          WHERE ph."materialId" = m.id AND ph."recordDate" >= CURRENT_DATE - $2::INTERVAL
          ORDER BY ph."recordDate" DESC LIMIT 1) AS last_price
       FROM materials m
       WHERE m.category = $1`,
      [category, interval]
    );
  } catch {
    // price_history table may not exist yet
    return emptyResult;
  }

  const movers: {
    materialId: number;
    materialName: string;
    percentChange: number;
    direction: 'up' | 'down' | 'stable';
  }[] = [];

  let totalPctChange = 0;
  let count = 0;

  for (const row of materialRows) {
    if (row.first_price == null || row.last_price == null) continue;
    const first = parseFloat(row.first_price);
    const last = parseFloat(row.last_price);
    if (first <= 0) continue;

    const pctChange = parseFloat((((last - first) / first) * 100).toFixed(2));
    totalPctChange += pctChange;
    count++;

    movers.push({
      materialId: row.materialId,
      materialName: row.materialName,
      percentChange: pctChange,
      direction: classifyDirection(pctChange),
    });
  }

  // Sort by absolute percent change descending for top movers
  movers.sort((a, b) => Math.abs(b.percentChange) - Math.abs(a.percentChange));

  const avgPriceMovement = count > 0
    ? parseFloat((totalPctChange / count).toFixed(2))
    : 0;

  return {
    category,
    period,
    avgPriceMovement,
    direction: classifyDirection(avgPriceMovement),
    topMovers: movers.slice(0, 10),
  };
}

/**
 * Calculate price volatility for a material.
 * Uses standard deviation and coefficient of variation over the last 90 days.
 * CV > 0.15 = high, 0.08-0.15 = medium, < 0.08 = low.
 */
export async function getPriceVolatility(materialId: number): Promise<VolatilityData> {
  const emptyResult: VolatilityData = { materialId, volatility: 'low', cv: 0, stdDev: 0 };

  let row: VolatilityRow | null;
  try {
    row = await queryOne<VolatilityRow>(
      `SELECT
         STDDEV("avgPrice")::TEXT AS std_dev,
         AVG("avgPrice")::TEXT AS avg_price
       FROM price_history
       WHERE "materialId" = $1
         AND "recordDate" >= CURRENT_DATE - INTERVAL '90 days'`,
      [materialId]
    );
  } catch {
    // price_history table may not exist yet
    return emptyResult;
  }

  if (!row || row.std_dev == null || row.avg_price == null) {
    return emptyResult;
  }

  const stdDev = parseFloat(parseFloat(row.std_dev).toFixed(4));
  const avgPrice = parseFloat(row.avg_price);
  const cv = avgPrice > 0 ? parseFloat((stdDev / avgPrice).toFixed(4)) : 0;

  let volatility: 'low' | 'medium' | 'high';
  if (cv > 0.15) {
    volatility = 'high';
  } else if (cv >= 0.08) {
    volatility = 'medium';
  } else {
    volatility = 'low';
  }

  return {
    materialId,
    volatility,
    cv,
    stdDev,
  };
}

// ─── Legacy Exports (backward-compat for server/routers.ts) ─────────────────
// The main routers.ts imports these names with the old synchronous signature.
// Kept here so existing code continues to compile without modification.

export interface LegacyPriceTrend {
  yoyChange: number;
  direction: 'up' | 'down' | 'flat';
  lastUpdated: string;
  seriesId: string;
}

const PRICE_TRENDS: Record<string, LegacyPriceTrend> = {
  'Concrete': { yoyChange: 3.2, direction: 'up', lastUpdated: '2026-01', seriesId: 'WPU133' },
  'Concrete / Cement': { yoyChange: 3.2, direction: 'up', lastUpdated: '2026-01', seriesId: 'WPU133' },
  'Cement': { yoyChange: 3.2, direction: 'up', lastUpdated: '2026-01', seriesId: 'WPU133' },
  'Steel': { yoyChange: 12.4, direction: 'up', lastUpdated: '2026-01', seriesId: 'WPU1017' },
  'Insulation': { yoyChange: 5.1, direction: 'up', lastUpdated: '2026-01', seriesId: 'WPU0723' },
  'Gypsum': { yoyChange: -2.3, direction: 'down', lastUpdated: '2026-01', seriesId: 'WPU1392' },
  'Glass': { yoyChange: 1.8, direction: 'up', lastUpdated: '2026-01', seriesId: 'WPU0741' },
  'Aluminium': { yoyChange: 26.0, direction: 'up', lastUpdated: '2026-01', seriesId: 'WPU1023' },
  'Aluminum': { yoyChange: 26.0, direction: 'up', lastUpdated: '2026-01', seriesId: 'WPU1023' },
  'Masonry': { yoyChange: 4.5, direction: 'up', lastUpdated: '2026-01', seriesId: 'WPU1331' },
  'Mass Timber': { yoyChange: -8.2, direction: 'down', lastUpdated: '2026-01', seriesId: 'WPU0811' },
};

/**
 * Legacy: get price trend by category name (synchronous, hardcoded seed data).
 * Used by server/routers.ts inline procedures.
 */
export function getLegacyPriceTrend(category: string): LegacyPriceTrend | null {
  if (PRICE_TRENDS[category]) return PRICE_TRENDS[category];
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
 * Legacy: get all hardcoded price trends.
 * Used by server/routers.ts inline procedures.
 */
export function getAllPriceTrends(): Record<string, LegacyPriceTrend> {
  return { ...PRICE_TRENDS };
}

// ─── DB-backed category trend queries ────────────────────────────────────────

/**
 * Compute YoY price change per category from price_history + materials.
 * Falls back to seed data for categories with insufficient DB history.
 */
export async function getAllPriceTrendsFromDb(): Promise<Record<string, LegacyPriceTrend>> {
  type Row = { category: string; first_price: string; last_price: string; last_date: string };
  let rows: Row[];
  try {
    rows = await queryMany<Row>(
      `WITH ranked AS (
         SELECT
           m.category,
           ph."avgPrice",
           ph."recordDate",
           ROW_NUMBER() OVER (
             PARTITION BY m.category
             ORDER BY ph."recordDate" ASC, ph.id ASC
           ) AS rn_first,
           ROW_NUMBER() OVER (
             PARTITION BY m.category
             ORDER BY ph."recordDate" DESC, ph.id DESC
           ) AS rn_last
         FROM price_history ph
         JOIN materials m ON m.id = ph."materialId"
         WHERE ph."recordDate" >= CURRENT_DATE - INTERVAL '1 year'
           AND m.category IS NOT NULL
       )
       SELECT
         category,
         MAX(CASE WHEN rn_first = 1 THEN "avgPrice" END)::TEXT AS first_price,
         MAX(CASE WHEN rn_last = 1 THEN "avgPrice" END)::TEXT AS last_price,
         MAX("recordDate")::TEXT AS last_date
       FROM ranked
       GROUP BY category
       HAVING COUNT(*) >= 2`,
      []
    );
  } catch {
    // price_history table may not exist yet — fall back to seed data
    return getAllPriceTrends();
  }

  // If DB has no data yet, return seed
  if (rows.length === 0) return getAllPriceTrends();

  const result: Record<string, LegacyPriceTrend> = {};
  for (const row of rows) {
    const first = parseFloat(row.first_price);
    const last = parseFloat(row.last_price);
    const yoyChange = first > 0 ? parseFloat((((last - first) / first) * 100).toFixed(1)) : 0;
    const direction: 'up' | 'down' | 'flat' = yoyChange > 1 ? 'up' : yoyChange < -1 ? 'down' : 'flat';
    const lastUpdated = row.last_date.slice(0, 7);
    const seed = getLegacyPriceTrend(row.category);
    result[row.category] = { yoyChange, direction, lastUpdated, seriesId: seed?.seriesId ?? '' };
  }

  // Merge seed data for categories not represented in DB
  for (const [cat, trend] of Object.entries(PRICE_TRENDS)) {
    if (!result[cat]) result[cat] = trend;
  }

  return result;
}

/**
 * Compute YoY price change for a single category from price_history.
 * Falls back to seed data when DB has no history for that category.
 */
export async function getPriceTrendByCategory(category: string): Promise<LegacyPriceTrend | null> {
  type Row = { first_price: string; last_price: string; last_date: string };
  let rows: Row[];
  try {
    rows = await queryMany<Row>(
      `WITH filtered AS (
         SELECT ph.id, ph."avgPrice", ph."recordDate"
           FROM price_history ph
           JOIN materials m ON m.id = ph."materialId"
          WHERE ph."recordDate" >= CURRENT_DATE - INTERVAL '1 year'
            AND LOWER(m.category) = LOWER($1)
       )
       SELECT
         (
           SELECT f."avgPrice"::TEXT
             FROM filtered f
            ORDER BY f."recordDate" ASC, f.id ASC
            LIMIT 1
         ) AS first_price,
         (
           SELECT f."avgPrice"::TEXT
             FROM filtered f
            ORDER BY f."recordDate" DESC, f.id DESC
            LIMIT 1
         ) AS last_price,
         (
           SELECT f."recordDate"::TEXT
             FROM filtered f
            ORDER BY f."recordDate" DESC, f.id DESC
            LIMIT 1
         ) AS last_date
       WHERE EXISTS (SELECT 1 FROM filtered OFFSET 1)`,
      [category]
    );
  } catch {
    // price_history table may not exist yet — fall back to seed data
    return getLegacyPriceTrend(category);
  }

  if (rows.length === 0) return getLegacyPriceTrend(category);

  const row = rows[0];
  const first = parseFloat(row.first_price);
  const last = parseFloat(row.last_price);
  const yoyChange = first > 0 ? parseFloat((((last - first) / first) * 100).toFixed(1)) : 0;
  const direction: 'up' | 'down' | 'flat' = yoyChange > 1 ? 'up' : yoyChange < -1 ? 'down' : 'flat';
  const lastUpdated = row.last_date.slice(0, 7);
  const seed = getLegacyPriceTrend(category);
  return { yoyChange, direction, lastUpdated, seriesId: seed?.seriesId ?? '' };
}
