/**
 * lib/azure-db.ts — Azure PostgreSQL connection + viability-profile operations
 *
 * Generic pool/query infrastructure is delegated to lib/pg-pool.ts.
 * This file re-exports those helpers under their legacy "Azure" names for
 * backward compatibility, then adds the domain-specific viability-profile
 * CRUD that belongs exclusively to this module.
 */

import { Pool, PoolClient, QueryResult } from 'pg';
import {
  getPool,
  closePool,
  query      as _query,
  queryOne   as _queryOne,
  queryMany  as _queryMany,
  withTransaction as _withTransaction,
  executeTransaction as _executeTransaction,
  type QueryOptions,
  type TransactionCallback,
} from './pg-pool';

import {
  ASTMStandard,
  LaborUnits,
  MaterialViabilityProfile,
  OTIFMetrics,
  UserPersona,
  ViabilityScore,
} from '../types/schema';

// ============================================================================
// LEGACY TYPE ALIASES (kept for backward compatibility)
// ============================================================================

/** @deprecated Import ConnectionConfig from lib/pg-pool instead */
export type AzureConnectionConfig = {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl: boolean;
};

/** @deprecated Import QueryOptions from lib/pg-pool instead */
export type AzureQueryOptions = QueryOptions;

/** @deprecated Import TransactionCallback from lib/pg-pool instead */
export type AzureTransactionCallback<T> = TransactionCallback<T>;

// ============================================================================
// LEGACY FUNCTION ALIASES  (delegated to lib/pg-pool)
// ============================================================================

/**
 * @deprecated Use parseConnectionString from lib/pg-pool.
 * Kept for callers that import parseAzureConnectionString by name.
 */
export { parseConnectionString as parseAzureConnectionString } from './pg-pool';

/** Return the shared pool (previously created a dedicated azure pool). */
export function getAzureDBPool(): Pool {
  return getPool();
}

/** Close the shared pool. */
export async function closeAzureDBPool(): Promise<void> {
  return closePool();
}

/** Parameterized query helper — delegates to lib/pg-pool#query. */
export async function azureQuery<T extends Record<string, unknown> = Record<string, unknown>>(
  text: string,
  params?: unknown[],
  options?: AzureQueryOptions,
): Promise<QueryResult<T>> {
  return _query<T>(text, params, options);
}

/** Single-row query — delegates to lib/pg-pool#queryOne. */
export async function azureQueryOne<T extends Record<string, unknown> = Record<string, unknown>>(
  text: string,
  params?: unknown[],
  options?: AzureQueryOptions,
): Promise<T | null> {
  return _queryOne<T>(text, params, options);
}

/** All-rows query — delegates to lib/pg-pool#queryMany. */
export async function azureQueryMany<T extends Record<string, unknown> = Record<string, unknown>>(
  text: string,
  params?: unknown[],
  options?: AzureQueryOptions,
): Promise<T[]> {
  return _queryMany<T>(text, params, options);
}

/** Acquire a PoolClient for manual transactions. */
export async function getAzureDBClient(): Promise<PoolClient> {
  return getPool().connect();
}

/** BEGIN / COMMIT / ROLLBACK wrapper — delegates to lib/pg-pool#withTransaction. */
export async function withAzureTransaction<T>(
  callback: AzureTransactionCallback<T>,
): Promise<T> {
  return _withTransaction(callback);
}

/** Batch-query transaction — delegates to lib/pg-pool#executeTransaction. */
export async function executeAzureTransaction(
  queries: Array<{ text: string; params?: unknown[] }>,
): Promise<QueryResult[]> {
  return _executeTransaction(queries);
}

// ============================================================================
// VIABILITY PROFILE — domain operations (unchanged)
// ============================================================================

/**
 * Create the viability_profiles table + indexes if they don't exist.
 */
export async function initializeViabilityProfilesTable(): Promise<void> {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS viability_profiles (
      id BIGSERIAL PRIMARY KEY,
      product_id BIGINT UNIQUE,
      product_name VARCHAR(255) NOT NULL,
      manufacturer VARCHAR(255) NOT NULL,
      sku VARCHAR(100),
      astm_standards JSONB NOT NULL DEFAULT '[]'::jsonb,
      labor_units JSONB NOT NULL,
      otif_metrics JSONB NOT NULL,
      environmental_metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
      health_metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
      cost_metrics JSONB NOT NULL,
      viability_scores JSONB DEFAULT '{}'::jsonb,
      data_quality JSONB NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_by BIGINT
    );

    DO $$
    BEGIN
      IF EXISTS (
        SELECT FROM information_schema.tables WHERE table_name = 'products'
      ) THEN
        ALTER TABLE viability_profiles
          DROP CONSTRAINT IF EXISTS fk_viability_product;
        ALTER TABLE viability_profiles
          ADD CONSTRAINT fk_viability_product
          FOREIGN KEY (product_id)
          REFERENCES Products(ProductID)
          ON DELETE CASCADE
          DEFERRABLE INITIALLY DEFERRED;
      END IF;
    END $$;

    CREATE INDEX IF NOT EXISTS idx_viability_product_id  ON viability_profiles(product_id);
    CREATE INDEX IF NOT EXISTS idx_viability_product_name ON viability_profiles(product_name);
    CREATE INDEX IF NOT EXISTS idx_viability_manufacturer ON viability_profiles(manufacturer);
    CREATE INDEX IF NOT EXISTS idx_viability_scores ON viability_profiles USING GIN (viability_scores);
    CREATE INDEX IF NOT EXISTS idx_viability_astm   ON viability_profiles USING GIN (astm_standards);
  `;

  try {
    await azureQuery(createTableSQL);
    console.log('✅ Viability profiles table initialized');
  } catch (error) {
    console.error('❌ Failed to initialize viability_profiles table:', error);
    throw error;
  }
}

/** Upsert a viability profile; returns the row id. */
export async function saveViabilityProfile(
  profile: MaterialViabilityProfile,
): Promise<number> {
  const sql = `
    INSERT INTO viability_profiles (
      product_id, product_name, manufacturer, sku,
      astm_standards, labor_units, otif_metrics,
      environmental_metrics, health_metrics, cost_metrics,
      viability_scores, data_quality, created_by
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
    ON CONFLICT (product_id) DO UPDATE SET
      product_name          = EXCLUDED.product_name,
      manufacturer          = EXCLUDED.manufacturer,
      sku                   = EXCLUDED.sku,
      astm_standards        = EXCLUDED.astm_standards,
      labor_units           = EXCLUDED.labor_units,
      otif_metrics          = EXCLUDED.otif_metrics,
      environmental_metrics = EXCLUDED.environmental_metrics,
      health_metrics        = EXCLUDED.health_metrics,
      cost_metrics          = EXCLUDED.cost_metrics,
      viability_scores      = EXCLUDED.viability_scores,
      data_quality          = EXCLUDED.data_quality,
      updated_at            = CURRENT_TIMESTAMP
    RETURNING id;
  `;

  const result = await azureQuery<{ id: number }>(sql, [
    profile.productId,
    profile.productName,
    profile.manufacturer,
    profile.sku,
    JSON.stringify(profile.astmStandards),
    JSON.stringify(profile.laborUnits),
    JSON.stringify(profile.otifMetrics),
    JSON.stringify(profile.environmentalMetrics),
    JSON.stringify(profile.healthMetrics),
    JSON.stringify(profile.costMetrics),
    JSON.stringify(profile.viabilityScores ?? {}),
    JSON.stringify(profile.dataQuality),
    profile.createdBy,
  ]);

  return result.rows[0].id;
}

/** Fetch viability profile by product_id. */
export async function getViabilityProfileByProductId(
  productId: number | string,
): Promise<MaterialViabilityProfile | null> {
  const result = await azureQuery(
    'SELECT * FROM viability_profiles WHERE product_id = $1 ORDER BY updated_at DESC LIMIT 1',
    [productId],
  );
  return result.rows.length > 0 ? mapRowToProfile(result.rows[0]) : null;
}

/** Fetch viability profile by primary key id. */
export async function getViabilityProfileById(
  id: number | string,
): Promise<MaterialViabilityProfile | null> {
  const result = await azureQuery(
    'SELECT * FROM viability_profiles WHERE id = $1',
    [id],
  );
  return result.rows.length > 0 ? mapRowToProfile(result.rows[0]) : null;
}

/** Full-text search across product_name and manufacturer. */
export async function searchViabilityProfiles(
  searchTerm: string,
  limit = 20,
): Promise<MaterialViabilityProfile[]> {
  const result = await azureQuery(
    `SELECT * FROM viability_profiles
     WHERE product_name ILIKE $1 OR manufacturer ILIKE $1
     ORDER BY updated_at DESC LIMIT $2`,
    [`%${searchTerm}%`, limit],
  );
  return result.rows.map(mapRowToProfile);
}

/** Fetch all profiles for a given manufacturer. */
export async function getViabilityProfilesByManufacturer(
  manufacturer: string,
): Promise<MaterialViabilityProfile[]> {
  const result = await azureQuery(
    'SELECT * FROM viability_profiles WHERE manufacturer = $1 ORDER BY product_name',
    [manufacturer],
  );
  return result.rows.map(mapRowToProfile);
}

/** Hard-delete a viability profile. Returns true if a row was deleted. */
export async function deleteViabilityProfile(id: number | string): Promise<boolean> {
  const result = await azureQuery('DELETE FROM viability_profiles WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
}

// ============================================================================
// INTERNAL — row mapper
// ============================================================================

function mapRowToProfile(row: Record<string, unknown>): MaterialViabilityProfile {
  const parseJson = <T>(value: unknown, fallback: T): T => {
    if (value == null) return fallback;
    if (typeof value === 'string') {
      try { return JSON.parse(value) as T; } catch { return fallback; }
    }
    return value as T;
  };

  return {
    id:           row.id as string,
    productId:    row.product_id as string,
    productName:  row.product_name as string,
    manufacturer: row.manufacturer as string,
    sku:          (row.sku as string) ?? undefined,
    astmStandards: parseJson<ASTMStandard[]>(row.astm_standards, []),
    laborUnits:    parseJson<LaborUnits>(row.labor_units, {
      installationHoursPerUnit: 0,
      maintenanceHoursPerYear: 0,
      unit: 'unit',
      skillLevelRequired: 0,
    }),
    otifMetrics: parseJson<OTIFMetrics>(row.otif_metrics, {
      onTimePercentage: 0,
      inFullPercentage: 0,
      otifScore: 0,
      averageLeadTimeDays: 0,
      sampleSize: 0,
      dataFrom: new Date(),
      dataTo:   new Date(),
    }),
    environmentalMetrics: parseJson<MaterialViabilityProfile['environmentalMetrics']>(
      row.environmental_metrics, {},
    ),
    healthMetrics: parseJson<MaterialViabilityProfile['healthMetrics']>(
      row.health_metrics, {},
    ),
    costMetrics: parseJson<MaterialViabilityProfile['costMetrics']>(row.cost_metrics, {
      unitPrice: 0,
      currency: 'USD',
    }),
    viabilityScores: parseJson<Record<UserPersona, ViabilityScore> | undefined>(
      row.viability_scores, undefined,
    ),
    dataQuality: parseJson<MaterialViabilityProfile['dataQuality']>(row.data_quality, {
      completeness:  0,
      freshnessInDays: 0,
      sources:       [],
      lastUpdated:   new Date(),
    }),
    createdAt:  row.created_at  ? new Date(row.created_at as string)  : undefined,
    updatedAt:  row.updated_at  ? new Date(row.updated_at as string)  : undefined,
    createdBy:  row.created_by as string | number | undefined,
  };
}
