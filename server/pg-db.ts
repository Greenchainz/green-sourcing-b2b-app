/**
 * PostgreSQL Database Client Library
 * 
 * Connection pool for Azure Database for PostgreSQL
 * with parameterized queries, transaction support, and timeout handling.
 */

import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

// Force pg to use pure JavaScript implementation (no native bindings)
// This prevents "Module not found: Can't resolve 'pg-native'" errors
// in Node.js Alpine containers and Next.js Edge Runtime
delete process.env.NODE_PG_FORCE_NATIVE;

// ============================================================================
// CONFIGURATION
// ============================================================================

/** Default query timeout in milliseconds (30 seconds) */
const DEFAULT_QUERY_TIMEOUT_MS = 30000;

/** Maximum connections in the pool */
const MAX_POOL_SIZE = 20;

/** Idle timeout before connection is closed (30 seconds) */
const IDLE_TIMEOUT_MS = 30000;

/** Connection timeout (5 seconds) */
const CONNECTION_TIMEOUT_MS = 5000;

// ============================================================================
// CONNECTION STRING PARSING
// ============================================================================

/**
 * Parse Azure PostgreSQL connection string components
 * Supports both DATABASE_URL format and individual Azure Service Connector variables
 */
export interface ConnectionConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl: boolean;
}

/**
 * Parse a PostgreSQL connection string into its components
 * Handles Azure Database for PostgreSQL connection string format
 */
export function parseConnectionString(connectionString: string): ConnectionConfig {
  // Parse postgres:// or postgresql:// URLs
  const regex = /^postgres(?:ql)?:\/\/([^:]+):([^@]+)@([^:/]+):?(\d+)?\/([^?]+)(?:\?(.*))?$/;
  const match = connectionString.match(regex);

  if (!match) {
    throw new Error('Invalid PostgreSQL connection string format');
  }

  const [, user, password, host, port, database, queryParams] = match;

  // Parse SSL mode from query parameters
  let ssl = true; // Default to SSL for Azure
  if (queryParams) {
    const params = new URLSearchParams(queryParams);
    const sslMode = params.get('sslmode');
    ssl = sslMode !== 'disable';
  }

  return {
    host,
    port: port ? parseInt(port, 10) : 5432,
    database,
    user: decodeURIComponent(user),
    password: decodeURIComponent(password),
    ssl,
  };
}

/**
 * Build connection string from environment variables
 * Supports Azure Service Connector format and direct DATABASE_URL
 */
function buildConnectionString(): string | undefined {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  // Support Azure Service Connector variables if present
  const host = process.env.AZURE_POSTGRESQL_HOST;
  const user = process.env.AZURE_POSTGRESQL_USER;
  const db = process.env.AZURE_POSTGRESQL_DATABASE;
  const port = process.env.AZURE_POSTGRESQL_PORT || '5432';
  const password = process.env.AZURE_POSTGRESQL_PASSWORD || process.env.DB_PASSWORD;
  const sslMode = process.env.AZURE_POSTGRESQL_SSL || 'require';

  if (host && user && db) {
    // Build connection string with proper URL encoding for special characters
    const encodedUser = encodeURIComponent(user);
    // Note: Empty password may cause auth issues - Azure typically requires a password
    const encodedPassword = password ? encodeURIComponent(password) : '';
    return `postgres://${encodedUser}:${encodedPassword}@${host}:${port}/${db}?sslmode=${sslMode}`;
  }

  return undefined;
}

// ============================================================================
// CONNECTION POOL
// ============================================================================

/**
 * Singleton connection pool instance
 */
const pool = new Pool({
  connectionString: buildConnectionString(),
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
  max: MAX_POOL_SIZE,
  idleTimeoutMillis: IDLE_TIMEOUT_MS,
  connectionTimeoutMillis: CONNECTION_TIMEOUT_MS,
  statement_timeout: DEFAULT_QUERY_TIMEOUT_MS,
});

/**
 * Get the connection pool instance
 * Useful for advanced operations or pool management
 */
export function getPool(): Pool {
  return pool;
}

/**
 * Close the connection pool
 * Call this on application shutdown
 */
export async function closePool(): Promise<void> {
  await pool.end();
  console.log('✅ PostgreSQL connection pool closed');
}

// ============================================================================
// QUERY EXECUTION
// ============================================================================

/**
 * Query options for customizing execution
 */
export interface QueryOptions {
  /** Query timeout in milliseconds (overrides default) */
  timeout?: number;
}

/**
 * Execute a parameterized query against the database
 * Uses connection pool for automatic connection management
 * 
 * @param text - SQL query text with $1, $2, etc. placeholders
 * @param params - Array of parameter values (prevents SQL injection)
 * @param options - Optional query configuration
 * @returns Query result with rows and metadata
 * 
 * @example
 * const result = await query(
 *   'SELECT * FROM users WHERE email = $1 AND status = $2',
 *   ['user@example.com', 'active']
 * );
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
  options?: QueryOptions
): Promise<QueryResult<T>> {
  const start = Date.now();

  try {
    // Build query config with optional timeout
    // Note: query_timeout is a supported pg library option for per-query timeouts
    const queryConfig: { text: string; values?: unknown[]; query_timeout?: number } = {
      text,
      values: params,
    };

    if (options?.timeout) {
      queryConfig.query_timeout = options.timeout;
    }

    const result = await pool.query<T>(queryConfig);
    const duration = Date.now() - start;

    // Log slow queries for monitoring
    if (duration > 1000) {
      console.warn(`⚠️ Slow query (${duration}ms):`, text.substring(0, 100));
    }

    return result;
  } catch (error) {
    const duration = Date.now() - start;
    console.error('❌ Query execution error:', {
      text: text.substring(0, 200),
      duration,
      error: error instanceof Error ? error.message : error,
    });
    throw error;
  }
}

/**
 * Execute a query and return a single row or null
 * Useful for lookups by ID or unique constraints
 * 
 * @example
 * const user = await queryOne<User>(
 *   'SELECT * FROM users WHERE id = $1',
 *   [userId]
 * );
 */
export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
  options?: QueryOptions
): Promise<T | null> {
  const result = await query<T>(text, params, options);
  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Execute a query and return all rows
 * 
 * @example
 * const users = await queryMany<User>(
 *   'SELECT * FROM users WHERE status = $1',
 *   ['active']
 * );
 */
export async function queryMany<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
  options?: QueryOptions
): Promise<T[]> {
  const result = await query<T>(text, params, options);
  return result.rows;
}

// ============================================================================
// CLIENT MANAGEMENT (for transactions)
// ============================================================================

/**
 * Get a client from the pool for manual transaction management
 * Remember to release the client after use!
 * 
 * @example
 * const client = await getClient();
 * try {
 *   await client.query('BEGIN');
 *   // ... your queries ...
 *   await client.query('COMMIT');
 * } catch (e) {
 *   await client.query('ROLLBACK');
 *   throw e;
 * } finally {
 *   client.release();
 * }
 */
export async function getClient(): Promise<PoolClient> {
  const client = await pool.connect();
  return client;
}

// ============================================================================
// TRANSACTION SUPPORT
// ============================================================================

/**
 * Transaction callback function type
 */
export type TransactionCallback<T> = (client: PoolClient) => Promise<T>;

/**
 * Execute a function within a database transaction
 * Automatically handles BEGIN, COMMIT, and ROLLBACK
 * 
 * @param callback - Function to execute within the transaction
 * @returns The result of the callback function
 * 
 * @example
 * const result = await withTransaction(async (client) => {
 *   const user = await client.query('INSERT INTO users (email) VALUES ($1) RETURNING *', [email]);
 *   await client.query('INSERT INTO user_settings (user_id) VALUES ($1)', [user.rows[0].id]);
 *   return user.rows[0];
 * });
 */
export async function withTransaction<T>(callback: TransactionCallback<T>): Promise<T> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Transaction rolled back:', error instanceof Error ? error.message : error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Execute multiple queries within a single transaction
 * All queries succeed or all are rolled back
 * 
 * @param queries - Array of query objects with text and optional params
 * @returns Array of query results
 * 
 * @example
 * const results = await executeTransaction([
 *   { text: 'INSERT INTO users (email) VALUES ($1) RETURNING id', params: ['user@example.com'] },
 *   { text: 'UPDATE counters SET count = count + 1 WHERE name = $1', params: ['user_count'] },
 * ]);
 */
export async function executeTransaction(
  queries: Array<{ text: string; params?: unknown[] }>
): Promise<QueryResult[]> {
  return withTransaction(async (client) => {
    const results: QueryResult[] = [];
    for (const q of queries) {
      const result = await client.query(q.text, q.params);
      results.push(result);
    }
    return results;
  });
}
