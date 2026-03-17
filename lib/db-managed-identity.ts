/**
 * PostgreSQL Database Client with Azure Managed Identity Authentication
 * 
 * Uses DefaultAzureCredential for passwordless authentication to Azure PostgreSQL
 * Eliminates the need for DATABASE_URL with passwords in environment variables
 */
import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { DefaultAzureCredential } from '@azure/identity';

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
// AZURE MANAGED IDENTITY AUTHENTICATION
// ============================================================================

/**
 * Get PostgreSQL access token using Azure Managed Identity
 * This eliminates the need for passwords in connection strings
 */
async function getPostgresAccessToken(): Promise<string> {
  const credential = new DefaultAzureCredential();
  
  // Azure Database for PostgreSQL resource scope
  const scope = 'https://ossrdbms-aad.database.windows.net/.default';
  
  const tokenResponse = await credential.getToken(scope);
  return tokenResponse.token;
}

// ============================================================================
// CONNECTION POOL WITH MANAGED IDENTITY
// ============================================================================

/**
 * Database configuration from environment variables
 */
const dbConfig = {
  host: process.env.POSTGRES_HOST || 'greenchainz-db-prod.postgres.database.azure.com',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  database: process.env.POSTGRES_DATABASE || 'greenchainz',
  user: process.env.POSTGRES_USER || 'greenchainz-frontend', // Managed identity name
  ssl: process.env.NODE_ENV === 'production',
};

/**
 * Create connection pool with managed identity authentication
 */
async function createManagedIdentityPool(): Promise<Pool> {
  const pool = new Pool({
    host: dbConfig.host,
    port: dbConfig.port,
    database: dbConfig.database,
    user: dbConfig.user,
    password: await getPostgresAccessToken(), // Use managed identity token as password
    ssl: dbConfig.ssl ? { rejectUnauthorized: false } : undefined,
    max: MAX_POOL_SIZE,
    idleTimeoutMillis: IDLE_TIMEOUT_MS,
    connectionTimeoutMillis: CONNECTION_TIMEOUT_MS,
    statement_timeout: DEFAULT_QUERY_TIMEOUT_MS,
  });

  // Refresh token before it expires (tokens are valid for 1 hour)
  setInterval(async () => {
    try {
      const newToken = await getPostgresAccessToken();
      // Close existing pool and create new one with fresh token
      await pool.end();
      Object.assign(pool, await createManagedIdentityPool());
    } catch (error) {
      console.error('Failed to refresh PostgreSQL access token:', error);
    }
  }, 50 * 60 * 1000); // Refresh every 50 minutes (tokens valid for 60 minutes)

  return pool;
}

/**
 * Singleton connection pool instance
 */
let pool: Pool | null = null;

/**
 * Get the connection pool instance with managed identity authentication
 * Lazy initialization on first call
 */
export async function getPool(): Promise<Pool> {
  if (!pool) {
    pool = await createManagedIdentityPool();
  }
  return pool;
}

/**
 * Close the connection pool
 * Call this on application shutdown
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('✅ PostgreSQL connection pool closed');
  }
}

// ============================================================================
// QUERY HELPERS
// ============================================================================

/**
 * Execute a parameterized query with automatic connection management
 */
export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const poolInstance = await getPool();
  return poolInstance.query<T>(text, params);
}

/**
 * Execute a query within a transaction
 */
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const poolInstance = await getPool();
  const client = await poolInstance.connect();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get a client from the pool for manual connection management
 */
export async function getClient(): Promise<PoolClient> {
  const poolInstance = await getPool();
  return poolInstance.connect();
}
