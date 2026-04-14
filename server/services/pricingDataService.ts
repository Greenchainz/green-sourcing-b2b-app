/**
 * Pricing Data Service
 *
 * Aggregates supplier quote data for materials.
 * Uses raw SQL via pg pool (parameterized queries only).
 *
 * Expected schema:
 *
 * -- CREATE TABLE supplier_quotes (
 * --   id SERIAL PRIMARY KEY,
 * --   "materialId" INTEGER NOT NULL REFERENCES materials(id),
 * --   "supplierId" INTEGER REFERENCES suppliers(id),
 * --   "supplierName" VARCHAR(255),
 * --   "pricePerUnit" DECIMAL(12,2) NOT NULL,
 * --   "priceUnit" VARCHAR(50) DEFAULT 'USD',
 * --   quantity INTEGER,
 * --   "leadTimeDays" INTEGER,
 * --   "quoteDate" TIMESTAMP DEFAULT NOW(),
 * --   "isActive" BOOLEAN DEFAULT TRUE,
 * --   "createdAt" TIMESTAMP DEFAULT NOW(),
 * --   "updatedAt" TIMESTAMP DEFAULT NOW()
 * -- );
 */

import { query, queryOne, queryMany } from '../../lib/pg-pool';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PricingData {
  materialId: number;
  avgPrice: number;
  medianPrice: number;
  minPrice: number;
  maxPrice: number;
  supplierCount: number;
  lastUpdated: string | null;
  priceUnit: string;
}

export interface PricingComparison {
  materialId: number;
  avgPrice: number;
  medianPrice: number;
  minPrice: number;
  maxPrice: number;
  supplierCount: number;
  lastUpdated: string | null;
  priceUnit: string;
}

export interface SupplierQuote {
  id: number;
  materialId: number;
  supplierId: number | null;
  supplierName: string | null;
  pricePerUnit: number;
  priceUnit: string;
  quantity: number | null;
  quoteDate: string | null;
  leadTimeDays: number | null;
}

// ─── Row Types ──────────────────────────────────────────────────────────────

interface AggregatedPricingRow {
  avg_price: string;
  min_price: string;
  max_price: string;
  supplier_count: string;
  last_updated: string | null;
  price_unit: string | null;
  all_prices: string; // comma-separated
}

interface SupplierQuoteRow {
  id: number;
  materialId: number;
  supplierId: number | null;
  supplierName: string | null;
  pricePerUnit: string;
  priceUnit: string | null;
  quantity: number | null;
  quoteDate: string | null;
  leadTimeDays: number | null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

// ─── Service Functions ──────────────────────────────────────────────────────

/**
 * Get aggregated pricing data for a single material.
 * Calculates min, max, average, and median from active supplier quotes.
 */
export async function getAggregatedPricing(materialId: number): Promise<PricingData> {
  const row = await queryOne<AggregatedPricingRow>(
    `SELECT
       AVG("pricePerUnit") AS avg_price,
       MIN("pricePerUnit") AS min_price,
       MAX("pricePerUnit") AS max_price,
       COUNT(DISTINCT "supplierId") AS supplier_count,
       MAX("quoteDate")::TEXT AS last_updated,
       MODE() WITHIN GROUP (ORDER BY "priceUnit") AS price_unit,
       STRING_AGG("pricePerUnit"::TEXT, ',' ORDER BY "pricePerUnit") AS all_prices
     FROM supplier_quotes
     WHERE "materialId" = $1 AND "isActive" = TRUE`,
    [materialId]
  );

  if (!row || row.avg_price == null) {
    return {
      materialId,
      avgPrice: 0,
      medianPrice: 0,
      minPrice: 0,
      maxPrice: 0,
      supplierCount: 0,
      lastUpdated: null,
      priceUnit: 'USD',
    };
  }

  const allPrices = row.all_prices
    ? row.all_prices.split(',').map(Number).filter(n => !isNaN(n))
    : [];

  return {
    materialId,
    avgPrice: parseFloat(parseFloat(row.avg_price).toFixed(2)),
    medianPrice: parseFloat(calculateMedian(allPrices).toFixed(2)),
    minPrice: parseFloat(parseFloat(row.min_price).toFixed(2)),
    maxPrice: parseFloat(parseFloat(row.max_price).toFixed(2)),
    supplierCount: parseInt(row.supplier_count, 10),
    lastUpdated: row.last_updated,
    priceUnit: row.price_unit ?? 'USD',
  };
}

/**
 * Get pricing comparison for multiple materials at once.
 */
export async function getPricingComparison(materialIds: number[]): Promise<PricingComparison[]> {
  if (materialIds.length === 0) return [];

  const results: PricingComparison[] = [];
  for (const id of materialIds) {
    const pricing = await getAggregatedPricing(id);
    results.push(pricing);
  }
  return results;
}

// ─── TxDOT Scraper Integration ──────────────────────────────────────────────

export interface ScrapedPricingDataInput {
  materialCategory: string;
  pricePerUnit: number;
  unit: string;
  state: string;
  county: string;
  source: string;
  sourceDate: Date;
  sourceUrl: string;
  projectName: string;
  contractNumber: string;
  dataConfidence: number;
}

export interface StorePricingDataResult {
  success: boolean;
  recordsInserted: number;
  recordsSkipped: number;
  errors: string[];
}

export interface RegionalPricingResult {
  state: string;
  county: string | null;
  materialCategory: string;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  recordCount: number;
  priceUnit: string;
  lastUpdated: string | null;
}

interface MaterialLookupRow {
  id: number;
  name: string;
}

interface PricingAggRow {
  material_id: string;
  material_category: string;
  avg_price: string;
  min_price: string;
  max_price: string;
  record_count: string;
  price_unit: string | null;
  last_updated: string | null;
}

/**
 * Store an array of scraped TxDOT pricing records.
 * Looks up matching materials by category and inserts into pricing_data.
 */
export async function storePricingData(
  scrapedData: ScrapedPricingDataInput[]
): Promise<StorePricingDataResult> {
  const result: StorePricingDataResult = {
    success: true,
    recordsInserted: 0,
    recordsSkipped: 0,
    errors: [],
  };

  for (const record of scrapedData) {
    try {
      // Find a material that matches this category
      const materialRow = await queryOne<MaterialLookupRow>(
        `SELECT id, name FROM materials
         WHERE category ILIKE $1
            OR name ILIKE $1
         LIMIT 1`,
        [`%${record.materialCategory}%`]
      );

      if (!materialRow) {
        result.recordsSkipped++;
        continue;
      }

      await query(
        `INSERT INTO pricing_data (
           material_id, price_per_unit, unit, state, county, source,
           source_date, source_url, project_name, contract_number,
           data_confidence, is_active, created_at, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, TRUE, NOW(), NOW())
         ON CONFLICT DO NOTHING`,
        [
          materialRow.id,
          record.pricePerUnit.toString(),
          record.unit,
          record.state,
          record.county,
          record.source,
          record.sourceDate.toISOString(),
          record.sourceUrl,
          record.projectName,
          record.contractNumber,
          record.dataConfidence,
        ]
      );

      result.recordsInserted++;
    } catch (err) {
      result.errors.push(
        err instanceof Error ? err.message : String(err)
      );
      result.success = false;
    }
  }

  return result;
}

/**
 * Update the pricePerUnit field on all materials based on the average
 * of active pricing_data rows for that material.
 */
export async function updateAllMaterialAveragePricing(): Promise<void> {
  await query(
    `UPDATE materials m
     SET "pricePerUnit" = sub.avg_price,
         "updatedAt"    = NOW()
     FROM (
       SELECT material_id,
              AVG(price_per_unit)::DECIMAL(10,2) AS avg_price
       FROM pricing_data
       WHERE is_active = TRUE
       GROUP BY material_id
     ) sub
     WHERE m.id = sub.material_id`
  );
}

/**
 * Retrieve aggregated pricing data for a given US state (and optional county).
 */
export async function getRegionalPricing(
  state: string,
  county?: string
): Promise<RegionalPricingResult[]> {
  const params: unknown[] = [state.toUpperCase()];
  let countyClause = '';
  if (county) {
    params.push(county);
    countyClause = `AND UPPER(pd.county) = UPPER($${params.length})`;
  }

  const rows = await queryMany<PricingAggRow>(
    `SELECT
       pd.material_id::TEXT               AS material_id,
       m.category                         AS material_category,
       AVG(pd.price_per_unit)::TEXT       AS avg_price,
       MIN(pd.price_per_unit)::TEXT       AS min_price,
       MAX(pd.price_per_unit)::TEXT       AS max_price,
       COUNT(*)::TEXT                     AS record_count,
       MODE() WITHIN GROUP
         (ORDER BY pd.unit)               AS price_unit,
       MAX(pd.source_date)::TEXT          AS last_updated
     FROM pricing_data pd
     JOIN materials m ON m.id = pd.material_id
     WHERE UPPER(pd.state) = $1
       ${countyClause}
       AND pd.is_active = TRUE
     GROUP BY pd.material_id, m.category`,
    params
  );

  return rows.map(r => ({
    state: state.toUpperCase(),
    county: county ?? null,
    materialCategory: r.material_category,
    avgPrice: parseFloat(parseFloat(r.avg_price).toFixed(2)),
    minPrice: parseFloat(parseFloat(r.min_price).toFixed(2)),
    maxPrice: parseFloat(parseFloat(r.max_price).toFixed(2)),
    recordCount: parseInt(r.record_count, 10),
    priceUnit: r.price_unit ?? 'USD',
    lastUpdated: r.last_updated,
  }));
}

/**
 * Get individual supplier quotes for a material.
 */
export async function getSupplierQuotes(
  materialId: number,
  options?: { limit?: number; sortBy?: 'price' | 'date' }
): Promise<SupplierQuote[]> {
  const limit = options?.limit ?? 50;
  const orderBy = options?.sortBy === 'date'
    ? '"quoteDate" DESC NULLS LAST'
    : '"pricePerUnit" ASC';

  const rows = await queryMany<SupplierQuoteRow>(
    `SELECT
       id,
       "materialId",
       "supplierId",
       "supplierName",
       "pricePerUnit",
       "priceUnit",
       quantity,
       "quoteDate"::TEXT AS "quoteDate",
       "leadTimeDays"
     FROM supplier_quotes
     WHERE "materialId" = $1 AND "isActive" = TRUE
     ORDER BY ${orderBy}
     LIMIT $2`,
    [materialId, limit]
  );

  return rows.map(r => ({
    id: r.id,
    materialId: r.materialId,
    supplierId: r.supplierId,
    supplierName: r.supplierName,
    pricePerUnit: parseFloat(r.pricePerUnit),
    priceUnit: r.priceUnit ?? 'USD',
    quantity: r.quantity,
    quoteDate: r.quoteDate,
    leadTimeDays: r.leadTimeDays,
  }));
}
