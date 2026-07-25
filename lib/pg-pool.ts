/**
 * lib/pg-pool.ts — Shared PostgreSQL connection pool
 *
 * Single source of truth for raw-pg pool configuration, connection-string
 * parsing, and query/transaction helpers.  Both server/pg-db.ts and
 * lib/azure-db.ts re-export from here; every other caller should import
 * directly from this module.
 */

import { Pool, PoolClient, QueryResult, QueryResultRow, PoolConfig } from 'pg';
import { DefaultAzureCredential, ManagedIdentityCredential, type TokenCredential } from '@azure/identity';

// Force pg to use pure-JS implementation (no native bindings).
// Prevents "Can't resolve 'pg-native'" in Alpine containers / Edge Runtime.
delete process.env.NODE_PG_FORCE_NATIVE;

// ============================================================================
// AAD TOKEN AUTH (Entra-only Postgres Flexible Server)
// ============================================================================

/**
 * Lazily-initialized Azure credential for fetching AAD tokens.
 * - Production:  ManagedIdentityCredential bound to MANAGED_IDENTITY_CLIENT_ID
 * - Local dev:   DefaultAzureCredential (uses az CLI / env / VS code creds)
 */
let _aadCredential: TokenCredential | null = null;
function getAadCredential(): TokenCredential {
  if (_aadCredential) return _aadCredential;
  const miClientId = process.env.MANAGED_IDENTITY_CLIENT_ID;
  // The DB lives in a different tenant than the app — override here.
  const dbTenant = process.env.POSTGRES_AAD_TENANT_ID;
  if (process.env.NODE_ENV === 'production' && miClientId) {
    _aadCredential = new ManagedIdentityCredential(miClientId);
  } else {
    _aadCredential = new DefaultAzureCredential(dbTenant ? { tenantId: dbTenant } : undefined);
  }
  return _aadCredential;
}

const AAD_DB_SCOPE = 'https://ossrdbms-aad.database.windows.net/.default';

/** Fetch a fresh AAD access token for Postgres. Called per pg connection. */
async function fetchAadDbToken(): Promise<string> {
  const credential = getAadCredential();
  const token = await credential.getToken(AAD_DB_SCOPE);
  if (!token) throw new Error('Failed to acquire AAD token for PostgreSQL');
  return token.token;
}

/**
 * Whether to use AAD token auth instead of password auth.
 * Set POSTGRES_AUTH_MODE=aad to enable.
 */
function shouldUseAadAuth(): boolean {
  return (process.env.POSTGRES_AUTH_MODE ?? '').toLowerCase() === 'aad';
}

// ============================================================================
// POOL CONSTANTS
// ============================================================================

/** Default per-query timeout (ms) */
export const DEFAULT_QUERY_TIMEOUT_MS = 30_000;

/** Maximum connections in the pool */
export const MAX_POOL_SIZE = 20;

/** Idle connection timeout (ms) */
export const IDLE_TIMEOUT_MS = 30_000;

/** Acquire-connection timeout (ms) */
export const CONNECTION_TIMEOUT_MS = 5_000;

// ============================================================================
// CONNECTION STRING PARSING
// ============================================================================

export interface ConnectionConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl: boolean;
}

/**
 * Parse a postgres[ql]:// connection string.
 * Handles Azure Service Connector URL format; defaults ssl=true for Azure.
 */
export function parseConnectionString(connectionString: string): ConnectionConfig {
  const regex =
    /^postgres(?:ql)?:\/\/([^:]+):([^@]+)@([^:/]+):?(\d+)?\/([^?]+)(?:\?(.*))?$/;
  const match = connectionString.match(regex);

  if (!match) {
    throw new Error(`Invalid PostgreSQL connection string: "${connectionString.slice(0, 40)}…"`);
  }

  const [, user, password, host, port, database, queryParams] = match;

  let ssl = true; // Azure always requires SSL
  if (queryParams) {
    ssl = new URLSearchParams(queryParams).get('sslmode') !== 'disable';
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
 * Resolve the DATABASE_URL connection string.
 * Falls back to assembling one from AZURE_POSTGRESQL_* Service Connector vars.
 */
export function resolveConnectionString(): string | undefined {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const host = process.env.AZURE_POSTGRESQL_HOST;
  const user = process.env.AZURE_POSTGRESQL_USER;
  const db   = process.env.AZURE_POSTGRESQL_DATABASE;
  const port = process.env.AZURE_POSTGRESQL_PORT || '5432';
  const sslMode  = process.env.AZURE_POSTGRESQL_SSL || 'require';

  if (host && user && db) {
    // Production: POSTGRES_AUTH_MODE=aad — password omitted; Postgres AAD auth
    // exchanges a managed-identity token (fetchAadDbToken) instead of a password.
    // Never use AZURE_POSTGRESQL_PASSWORD or DB_PASSWORD — those are banned in prod.
    // Local dev: use DATABASE_URL from .env.local (set above); this branch is for
    // Service Connector override only and should never carry a password in prod.
    const u = encodeURIComponent(user);
    return `postgres://${u}@${host}:${port}/${db}?sslmode=${sslMode}`;
  }

  return undefined;
}

// ============================================================================
// CONNECTION POOL — singleton
// ============================================================================

let _pool: Pool | null = null;

/**
 * Return (or lazily create) the shared connection pool.
 *
 * The pool is a module-level singleton; calling this function multiple times
 * is safe and returns the same instance.
 */
export function getPool(): Pool {
  if (!_pool) {
    const connectionString = resolveConnectionString();

    if (!connectionString) {
      throw new Error(
        'No PostgreSQL connection string found. ' +
        'Set DATABASE_URL or AZURE_POSTGRESQL_* environment variables.',
      );
    }

    const baseConfig: PoolConfig = {
      max: MAX_POOL_SIZE,
      idleTimeoutMillis: IDLE_TIMEOUT_MS,
      connectionTimeoutMillis: CONNECTION_TIMEOUT_MS,
      statement_timeout: DEFAULT_QUERY_TIMEOUT_MS,
    };

    if (shouldUseAadAuth()) {
      // AAD token mode: parse host/port/db from URL, override user, fetch token per connection.
      const parsed = parseConnectionString(connectionString);
      const aadUser = process.env.POSTGRES_AAD_USER ?? parsed.user;
      console.log(`[pg-pool] Using AAD token auth (user="${aadUser}")`);
      _pool = new Pool({
        ...baseConfig,
        host: parsed.host,
        port: parsed.port,
        database: parsed.database,
        user: aadUser,
        password: fetchAadDbToken,
        ssl: { rejectUnauthorized: false },
      });
    } else {
      _pool = new Pool({
        ...baseConfig,
        connectionString,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
      });
    }
  }

  return _pool;
}

/**
 * Gracefully drain and destroy the pool.
 * Call on application shutdown / SIGTERM.
 */
export async function closePool(): Promise<void> {
  if (_pool) {
    await _pool.end();
    _pool = null;
    console.log('✅ PostgreSQL connection pool closed');
  }
}

// ============================================================================
// QUERY HELPERS
// ============================================================================

export interface QueryOptions {
  /** Override the default 30 s per-query timeout. */
  timeout?: number;
}

/**
 * Execute a parameterized query and return the full pg QueryResult.
 *
 * @example
 * const result = await query<UserRow>(
 *   'SELECT * FROM users WHERE email = $1',
 *   ['user@example.com'],
 * );
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
  options?: QueryOptions,
): Promise<QueryResult<T>> {
  const pool  = getPool();
  const start = Date.now();

  try {
    const cfg: { text: string; values?: unknown[]; query_timeout?: number } = {
      text,
      values: params,
    };
    if (options?.timeout) cfg.query_timeout = options.timeout;

    const result   = await pool.query<T>(cfg);
    const duration = Date.now() - start;

    if (duration > 1_000) {
      console.warn(`⚠️ Slow query (${duration}ms):`, text.slice(0, 100));
    }

    return result;
  } catch (error) {
    const duration = Date.now() - start;
    console.error('❌ Query error:', {
      text:  text.slice(0, 200),
      duration,
      error: error instanceof Error ? error.message : error,
    });
    throw error;
  }
}

/**
 * Execute a query and return the first row, or `null` if no rows matched.
 *
 * @example
 * const user = await queryOne<UserRow>('SELECT * FROM users WHERE id = $1', [id]);
 */
export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
  options?: QueryOptions,
): Promise<T | null> {
  const result = await query<T>(text, params, options);
  return result.rows[0] ?? null;
}

/**
 * Execute a query and return all rows as an array.
 *
 * @example
 * const rows = await queryMany<UserRow>('SELECT * FROM users WHERE status = $1', ['active']);
 */
export async function queryMany<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
  options?: QueryOptions,
): Promise<T[]> {
  const result = await query<T>(text, params, options);
  return result.rows;
}

// ============================================================================
// CLIENT / TRANSACTION HELPERS
// ============================================================================

/**
 * Acquire a raw PoolClient for manual transaction management.
 * You **must** call `client.release()` in a `finally` block.
 */
export async function getClient(): Promise<PoolClient> {
  return getPool().connect();
}

export type TransactionCallback<T> = (client: PoolClient) => Promise<T>;

/**
 * Execute `callback` inside a BEGIN / COMMIT / ROLLBACK transaction.
 * The pool client is acquired and released automatically.
 *
 * @example
 * const user = await withTransaction(async (client) => {
 *   const { rows } = await client.query(
 *     'INSERT INTO users (email) VALUES ($1) RETURNING *',
 *     [email],
 *   );
 *   await client.query('INSERT INTO user_settings (user_id) VALUES ($1)', [rows[0].id]);
 *   return rows[0];
 * });
 */
export async function withTransaction<T>(callback: TransactionCallback<T>): Promise<T> {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(
      '❌ Transaction rolled back:',
      error instanceof Error ? error.message : error,
    );
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Execute an ordered list of queries as a single atomic transaction.
 * Returns results in the same order as the input array.
 *
 * @example
 * const [insertResult, updateResult] = await executeTransaction([
 *   { text: 'INSERT INTO users (email) VALUES ($1) RETURNING id', params: ['a@b.com'] },
 *   { text: 'UPDATE counters SET count = count + 1 WHERE name = $1', params: ['users'] },
 * ]);
 */
export async function executeTransaction(
  queries: Array<{ text: string; params?: unknown[] }>,
): Promise<QueryResult[]> {
  return withTransaction(async (client) => {
    const results: QueryResult[] = [];
    for (const q of queries) {
      results.push(await client.query(q.text, q.params));
    }
    return results;
  });
}
