/**
 * Azure PostgreSQL Connection Helpers
 * 
 * Connection pool management and query utilities for Azure Database for PostgreSQL
 * Flexible Server. This module provides enhanced connection handling with:
 * 
 * - Connection pooling with automatic reconnection
 * - Automatic retries with exponential backoff
 * - Query timeout handling
 * - Transaction support
 * - Prepared statement helpers
 * 
 * This complements the Azure SQL helpers in config.ts for applications
 * that use PostgreSQL as their primary database.
 */

import { Pool, PoolClient, QueryResult, QueryResultRow } from "pg";

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface PostgresConfig {
  /** Connection string (DATABASE_URL) */
  connectionString?: string;
  /** Host (alternative to connection string) */
  host?: string;
  /** Port (default: 5432) */
  port?: number;
  /** Database name */
  database?: string;
  /** Username */
  user?: string;
  /** Password */
  password?: string;
  /** SSL mode */
  ssl?: boolean | { rejectUnauthorized: boolean };
  /** Maximum pool size */
  maxConnections?: number;
  /** Connection timeout in ms */
  connectionTimeoutMs?: number;
  /** Idle timeout in ms */
  idleTimeoutMs?: number;
  /** Statement timeout in ms */
  statementTimeoutMs?: number;
}

export interface QueryOptions {
  /** Query timeout in ms (overrides default) */
  timeout?: number;
  /** Number of retry attempts */
  retries?: number;
  /** Custom retry delay in ms */
  retryDelay?: number;
}

export interface TransactionOptions {
  /** Isolation level */
  isolationLevel?: "READ COMMITTED" | "REPEATABLE READ" | "SERIALIZABLE";
  /** Read-only transaction */
  readOnly?: boolean;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

/** Default configuration values */
const DEFAULT_CONFIG: Required<Omit<PostgresConfig, "connectionString" | "host" | "database" | "user" | "password">> = {
  port: 5432,
  ssl: { rejectUnauthorized: false },
  maxConnections: 20,
  connectionTimeoutMs: 10000,
  idleTimeoutMs: 30000,
  statementTimeoutMs: 30000,
};

/** Retry configuration */
const DEFAULT_RETRIES = 3;
const DEFAULT_RETRY_DELAY_MS = 500;

// ============================================================================
// CONNECTION POOL SINGLETON
// ============================================================================

let pool: Pool | null = null;
let currentConnectionString: string | null = null;

/**
 * Build configuration from environment variables
 */
function getConfigFromEnv(): PostgresConfig {
  const connectionString = process.env.DATABASE_URL 
    || process.env.AZURE_POSTGRESQL_CONNECTION_STRING;

  if (connectionString) {
    return { connectionString };
  }

  // Fallback to individual environment variables
  const host = process.env.AZURE_POSTGRESQL_HOST || process.env.PGHOST;
  const port = parseInt(process.env.AZURE_POSTGRESQL_PORT || process.env.PGPORT || "5432", 10);
  const database = process.env.AZURE_POSTGRESQL_DATABASE || process.env.PGDATABASE;
  const user = process.env.AZURE_POSTGRESQL_USER || process.env.PGUSER;
  const password = process.env.AZURE_POSTGRESQL_PASSWORD || process.env.PGPASSWORD;

  if (!host || !database || !user) {
    throw new Error(
      "Missing PostgreSQL configuration. Set DATABASE_URL or individual " +
      "AZURE_POSTGRESQL_* environment variables."
    );
  }

  return { host, port, database, user, password };
}

/**
 * Get or create the PostgreSQL connection pool
 * 
 * @param config - Optional configuration (uses env vars if not provided)
 * @returns PostgreSQL connection pool
 */
export function getPostgresPool(config?: PostgresConfig): Pool {
  const envConfig = config || getConfigFromEnv();
  const connString = envConfig.connectionString 
    || `postgres://${envConfig.user}:${envConfig.password}@${envConfig.host}:${envConfig.port || 5432}/${envConfig.database}`;

  // Return existing pool if connection string unchanged
  if (pool && currentConnectionString === connString) {
    return pool;
  }

  // Close existing pool if connection changed
  if (pool) {
    pool.end().catch(console.error);
  }

  currentConnectionString = connString;
  const isProduction = process.env.NODE_ENV === "production";

  pool = new Pool({
    connectionString: envConfig.connectionString,
    host: envConfig.host,
    port: envConfig.port || DEFAULT_CONFIG.port,
    database: envConfig.database,
    user: envConfig.user,
    password: envConfig.password,
    ssl: isProduction 
      ? (envConfig.ssl ?? DEFAULT_CONFIG.ssl)
      : envConfig.ssl,
    max: envConfig.maxConnections || DEFAULT_CONFIG.maxConnections,
    connectionTimeoutMillis: envConfig.connectionTimeoutMs || DEFAULT_CONFIG.connectionTimeoutMs,
    idleTimeoutMillis: envConfig.idleTimeoutMs || DEFAULT_CONFIG.idleTimeoutMs,
    statement_timeout: envConfig.statementTimeoutMs || DEFAULT_CONFIG.statementTimeoutMs,
  });

  // Error handling for the pool
  pool.on("error", (err) => {
    console.error("❌ PostgreSQL pool error:", err);
  });

  pool.on("connect", () => {
    console.log("✅ PostgreSQL client connected");
  });

  console.log("✅ Azure PostgreSQL connection pool initialized");
  return pool;
}

/**
 * Check if PostgreSQL is configured
 */
export function isPostgresConfigured(): boolean {
  try {
    getConfigFromEnv();
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// QUERY UTILITIES
// ============================================================================

/**
 * Sleep utility for retry logic
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute a query with automatic retries
 * 
 * @param text - SQL query text with $1, $2, etc. placeholders
 * @param params - Query parameters
 * @param options - Query options
 * @returns Query result
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
  options: QueryOptions = {}
): Promise<QueryResult<T>> {
  const pgPool = getPostgresPool();
  const maxRetries = options.retries ?? DEFAULT_RETRIES;
  const retryDelay = options.retryDelay ?? DEFAULT_RETRY_DELAY_MS;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const startTime = Date.now();

    try {
      const result = await pgPool.query<T>(text, params);
      const duration = Date.now() - startTime;

      // Log slow queries
      if (duration > 1000) {
        console.warn(`⚠️ Slow PostgreSQL query (${duration}ms):`, text.substring(0, 100));
      }

      return result;
    } catch (error) {
      lastError = error as Error;
      const duration = Date.now() - startTime;

      console.warn(
        `⚠️ PostgreSQL query failed (attempt ${attempt}/${maxRetries}, ${duration}ms):`,
        (error as Error).message
      );

      // Don't retry on syntax errors or constraint violations
      const errorCode = (error as { code?: string }).code;
      if (errorCode === "42601" || errorCode === "42P01" || errorCode === "23505") {
        throw error;
      }

      if (attempt < maxRetries) {
        const delay = retryDelay * Math.pow(2, attempt - 1);
        await sleep(delay);
      }
    }
  }

  throw new Error(`PostgreSQL query failed after ${maxRetries} retries: ${lastError?.message}`);
}

/**
 * Execute a query and return the first row
 * 
 * @param text - SQL query text
 * @param params - Query parameters
 * @param options - Query options
 * @returns First row or null
 */
export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
  options: QueryOptions = {}
): Promise<T | null> {
  const result = await query<T>(text, params, options);
  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Execute a query and return all rows
 * 
 * @param text - SQL query text
 * @param params - Query parameters
 * @param options - Query options
 * @returns Array of rows
 */
export async function queryAll<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
  options: QueryOptions = {}
): Promise<T[]> {
  const result = await query<T>(text, params, options);
  return result.rows;
}

/**
 * Execute a query and return a scalar value
 * 
 * @param text - SQL query text
 * @param params - Query parameters
 * @param options - Query options
 * @returns Scalar value or null
 */
export async function queryScalar<T = unknown>(
  text: string,
  params?: unknown[],
  options: QueryOptions = {}
): Promise<T | null> {
  const row = await queryOne<Record<string, T>>(text, params, options);
  if (!row) return null;
  const firstValue = Object.values(row)[0];
  return firstValue as T;
}

// ============================================================================
// TRANSACTION SUPPORT
// ============================================================================

/**
 * Execute operations within a transaction
 * 
 * @param callback - Function to execute within the transaction
 * @param options - Transaction options
 * @returns Result of the callback
 */
export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>,
  options: TransactionOptions = {}
): Promise<T> {
  const pgPool = getPostgresPool();
  const client = await pgPool.connect();

  try {
    // Begin transaction with options
    let beginSQL = "BEGIN";
    if (options.isolationLevel) {
      beginSQL += ` ISOLATION LEVEL ${options.isolationLevel}`;
    }
    if (options.readOnly) {
      beginSQL += " READ ONLY";
    }

    await client.query(beginSQL);

    const result = await callback(client);

    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get a client from the pool (remember to release it!)
 * 
 * @returns PoolClient
 */
export async function getClient(): Promise<PoolClient> {
  const pgPool = getPostgresPool();
  return await pgPool.connect();
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * Execute multiple queries in a single transaction
 * 
 * @param queries - Array of { text, params } objects
 * @returns Array of query results
 */
export async function batchQuery<T extends QueryResultRow = QueryResultRow>(
  queries: Array<{ text: string; params?: unknown[] }>
): Promise<Array<QueryResult<T>>> {
  return withTransaction(async (client) => {
    const results: Array<QueryResult<T>> = [];

    for (const q of queries) {
      const result = await client.query<T>(q.text, q.params);
      results.push(result);
    }

    return results;
  });
}

/**
 * Bulk insert rows using unnest for efficiency
 * 
 * @param tableName - Target table name
 * @param columns - Column names
 * @param rows - Array of row values (must match column order)
 * @returns Number of inserted rows
 */
export async function bulkInsert(
  tableName: string,
  columns: string[],
  rows: unknown[][]
): Promise<number> {
  if (rows.length === 0) return 0;

  // Build the VALUES clause with proper parameterization
  const placeholders = rows.map((_, rowIdx) => {
    const rowPlaceholders = columns.map((_, colIdx) => `$${rowIdx * columns.length + colIdx + 1}`);
    return `(${rowPlaceholders.join(", ")})`;
  });

  const text = `
    INSERT INTO ${tableName} (${columns.join(", ")})
    VALUES ${placeholders.join(", ")}
  `;

  const params = rows.flat();
  const result = await query(text, params);

  console.log(`✅ Bulk inserted ${result.rowCount} rows into ${tableName}`);
  return result.rowCount || 0;
}

// ============================================================================
// HEALTH CHECK
// ============================================================================

/**
 * Check database connectivity
 * 
 * @returns Health check result
 */
export async function healthCheck(): Promise<{
  healthy: boolean;
  latencyMs: number;
  poolStats: {
    totalCount: number;
    idleCount: number;
    waitingCount: number;
  };
  error?: string;
}> {
  const startTime = Date.now();

  try {
    const pgPool = getPostgresPool();
    await pgPool.query("SELECT 1");

    return {
      healthy: true,
      latencyMs: Date.now() - startTime,
      poolStats: {
        totalCount: pgPool.totalCount,
        idleCount: pgPool.idleCount,
        waitingCount: pgPool.waitingCount,
      },
    };
  } catch (error) {
    return {
      healthy: false,
      latencyMs: Date.now() - startTime,
      poolStats: {
        totalCount: pool?.totalCount || 0,
        idleCount: pool?.idleCount || 0,
        waitingCount: pool?.waitingCount || 0,
      },
      error: (error as Error).message,
    };
  }
}

// ============================================================================
// CLEANUP
// ============================================================================

/**
 * Close the PostgreSQL connection pool
 * Call this on application shutdown
 */
export async function closePostgresPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    currentConnectionString = null;
    console.log("✅ Azure PostgreSQL pool closed");
  }
}

/**
 * Reset the pool (useful for testing)
 */
export function resetPostgresPool(): void {
  if (pool) {
    pool.end().catch(console.error);
    pool = null;
    currentConnectionString = null;
  }
  console.log("✅ Azure PostgreSQL pool reset");
}
