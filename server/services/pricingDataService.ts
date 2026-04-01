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

import { query, queryOne, queryMany } from '../pg-db';

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
