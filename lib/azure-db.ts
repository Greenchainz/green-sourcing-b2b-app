/**
 * Azure PostgreSQL Direct Connection
 * 
 * Direct connection to Azure Database for PostgreSQL Flexible Server
 * for viability profile data storage and retrieval.
 * 
 * This module provides a dedicated connection pool for the Architecture of
 * Equivalence engine, ensuring separation from the main app database operations.
 */

import { Pool, PoolClient, QueryResult } from 'pg';
import {
  ASTMStandard,
  LaborUnits,
  MaterialViabilityProfile,
  OTIFMetrics,
  UserPersona,
  ViabilityScore,
} from '../types/schema';

// Connection pool for Azure PostgreSQL
let azurePool: Pool | null = null;

/**
 * Get or create Azure PostgreSQL connection pool
 * 
 * Uses DATABASE_URL environment variable which should point to
 * Azure Database for PostgreSQL Flexible Server.
 */
export function getAzureDBPool(): Pool {
  if (!azurePool) {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    azurePool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false }
        : undefined,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      statement_timeout: 30000,
    });

    console.log('✅ Azure PostgreSQL pool created for viability profiles');
  }

  return azurePool;
}

/**
 * Execute a query against Azure PostgreSQL
 */
export async function azureQuery<T extends Record<string, unknown> = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const pool = getAzureDBPool();
  const start = Date.now();

  try {
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;

    if (duration > 1000) {
      console.warn(`⚠️ Slow Azure DB query (${duration}ms):`, text.substring(0, 100));
    }

    return result;
  } catch (error) {
    console.error('❌ Azure DB Query Error:', error);
    console.error('Query:', text);
    console.error('Params:', params);
    throw error;
  }
}

/**
 * Get a client from the pool for transactions
 */
export async function getAzureDBClient(): Promise<PoolClient> {
  const pool = getAzureDBPool();
  return await pool.connect();
}

/**
 * Close the Azure PostgreSQL connection pool
 * Call this on application shutdown
 */
export async function closeAzureDBPool(): Promise<void> {
  if (azurePool) {
    await azurePool.end();
    azurePool = null;
    console.log('✅ Azure PostgreSQL pool closed');
  }
}

// ============================================================================
// VIABILITY PROFILE DATABASE OPERATIONS
// ============================================================================

/**
 * Initialize the viability_profiles table if it doesn't exist
 */
export async function initializeViabilityProfilesTable(): Promise<void> {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS viability_profiles (
      id BIGSERIAL PRIMARY KEY,
      product_id BIGINT UNIQUE, -- Unique constraint for UPSERT
      product_name VARCHAR(255) NOT NULL,
      manufacturer VARCHAR(255) NOT NULL,
      sku VARCHAR(100),
      
      -- JSON columns for complex data
      astm_standards JSONB NOT NULL DEFAULT '[]'::jsonb,
      labor_units JSONB NOT NULL,
      otif_metrics JSONB NOT NULL,
      environmental_metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
      health_metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
      cost_metrics JSONB NOT NULL,
      viability_scores JSONB DEFAULT '{}'::jsonb,
      data_quality JSONB NOT NULL,
      
      -- Metadata
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_by BIGINT
    );

    -- Foreign key to Products table if it exists (safe to fail)
    DO $$
    BEGIN
      IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'products'
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

    -- Indexes for common queries
    CREATE INDEX IF NOT EXISTS idx_viability_product_id 
      ON viability_profiles(product_id);
    
    CREATE INDEX IF NOT EXISTS idx_viability_product_name 
      ON viability_profiles(product_name);
    
    CREATE INDEX IF NOT EXISTS idx_viability_manufacturer 
      ON viability_profiles(manufacturer);
    
    -- GIN index for JSONB queries
    CREATE INDEX IF NOT EXISTS idx_viability_scores 
      ON viability_profiles USING GIN (viability_scores);
    
    CREATE INDEX IF NOT EXISTS idx_viability_astm 
      ON viability_profiles USING GIN (astm_standards);
  `;

  try {
    await azureQuery(createTableSQL);
    console.log('✅ Viability profiles table initialized');
  } catch (error) {
    console.error('❌ Failed to initialize viability_profiles table:', error);
    throw error;
  }
}

/**
 * Save a viability profile to the database
 */
export async function saveViabilityProfile(
  profile: MaterialViabilityProfile
): Promise<number> {
  const sql = `
    INSERT INTO viability_profiles (
      product_id, product_name, manufacturer, sku,
      astm_standards, labor_units, otif_metrics,
      environmental_metrics, health_metrics, cost_metrics,
      viability_scores, data_quality, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    ON CONFLICT (product_id) 
    DO UPDATE SET
      product_name = EXCLUDED.product_name,
      manufacturer = EXCLUDED.manufacturer,
      sku = EXCLUDED.sku,
      astm_standards = EXCLUDED.astm_standards,
      labor_units = EXCLUDED.labor_units,
      otif_metrics = EXCLUDED.otif_metrics,
      environmental_metrics = EXCLUDED.environmental_metrics,
      health_metrics = EXCLUDED.health_metrics,
      cost_metrics = EXCLUDED.cost_metrics,
      viability_scores = EXCLUDED.viability_scores,
      data_quality = EXCLUDED.data_quality,
      updated_at = CURRENT_TIMESTAMP
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
    JSON.stringify(profile.viabilityScores || {}),
    JSON.stringify(profile.dataQuality),
    profile.createdBy,
  ]);

  return result.rows[0].id;
}

/**
 * Get a viability profile by product ID
 */
export async function getViabilityProfileByProductId(
  productId: number | string
): Promise<MaterialViabilityProfile | null> {
  const sql = `
    SELECT * FROM viability_profiles 
    WHERE product_id = $1
    ORDER BY updated_at DESC
    LIMIT 1;
  `;

  const result = await azureQuery(sql, [productId]);

  if (result.rows.length === 0) {
    return null;
  }

  return mapRowToProfile(result.rows[0]);
}

/**
 * Get a viability profile by profile ID
 */
export async function getViabilityProfileById(
  id: number | string
): Promise<MaterialViabilityProfile | null> {
  const sql = 'SELECT * FROM viability_profiles WHERE id = $1;';
  const result = await azureQuery(sql, [id]);

  if (result.rows.length === 0) {
    return null;
  }

  return mapRowToProfile(result.rows[0]);
}

/**
 * Search viability profiles by product name or manufacturer
 */
export async function searchViabilityProfiles(
  searchTerm: string,
  limit: number = 20
): Promise<MaterialViabilityProfile[]> {
  const sql = `
    SELECT * FROM viability_profiles 
    WHERE 
      product_name ILIKE $1 OR 
      manufacturer ILIKE $1
    ORDER BY updated_at DESC
    LIMIT $2;
  `;

  const result = await azureQuery(sql, [`%${searchTerm}%`, limit]);
  return result.rows.map(mapRowToProfile);
}

/**
 * Get all viability profiles for a manufacturer
 */
export async function getViabilityProfilesByManufacturer(
  manufacturer: string
): Promise<MaterialViabilityProfile[]> {
  const sql = `
    SELECT * FROM viability_profiles 
    WHERE manufacturer = $1
    ORDER BY product_name;
  `;

  const result = await azureQuery(sql, [manufacturer]);
  return result.rows.map(mapRowToProfile);
}

/**
 * Delete a viability profile
 */
export async function deleteViabilityProfile(id: number | string): Promise<boolean> {
  const sql = 'DELETE FROM viability_profiles WHERE id = $1;';
  const result = await azureQuery(sql, [id]);
  return (result.rowCount ?? 0) > 0;
}

/**
 * Map database row to MaterialViabilityProfile
 */
function mapRowToProfile(row: Record<string, unknown>): MaterialViabilityProfile {
  const parseJson = <T>(value: unknown, fallback: T): T => {
    if (value === null || value === undefined) return fallback;
    if (typeof value === 'string') {
      try {
        return JSON.parse(value) as T;
      } catch {
        return fallback;
      }
    }
    return value as T;
  };

  const astmStandards = parseJson<ASTMStandard[]>(row.astm_standards, []);
  const laborUnits = parseJson<LaborUnits>(row.labor_units, {
    installationHoursPerUnit: 0,
    maintenanceHoursPerYear: 0,
    unit: 'unit',
    skillLevelRequired: 0,
  });
  const otifMetrics = parseJson<OTIFMetrics>(row.otif_metrics, {
    onTimePercentage: 0,
    inFullPercentage: 0,
    otifScore: 0,
    averageLeadTimeDays: 0,
    sampleSize: 0,
    dataFrom: new Date(),
    dataTo: new Date(),
  });
  const environmentalMetrics = parseJson<MaterialViabilityProfile['environmentalMetrics']>(row.environmental_metrics, {});
  const healthMetrics = parseJson<MaterialViabilityProfile['healthMetrics']>(row.health_metrics, {});
  const costMetrics = parseJson<MaterialViabilityProfile['costMetrics']>(row.cost_metrics, {
    unitPrice: 0,
    currency: 'USD',
  });
  const viabilityScores = parseJson<Record<UserPersona, ViabilityScore> | undefined>(row.viability_scores, undefined);
  const dataQuality = parseJson<MaterialViabilityProfile['dataQuality']>(row.data_quality, {
    completeness: 0,
    freshnessInDays: 0,
    sources: [],
    lastUpdated: new Date(),
  });

  return {
    id: row.id as string,
    productId: row.product_id as string,
    productName: row.product_name as string,
    manufacturer: row.manufacturer as string,
    sku: (row.sku as string) ?? undefined,
    astmStandards,
    laborUnits,
    otifMetrics,
    environmentalMetrics,
    healthMetrics,
    costMetrics,
    viabilityScores,
    dataQuality,
    createdAt: row.created_at ? new Date(row.created_at as string) : undefined,
    updatedAt: row.updated_at ? new Date(row.updated_at as string) : undefined,
    createdBy: row.created_by as string | number | undefined,
  };
}
