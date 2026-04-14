/**
 * lib/db.ts — Compatibility layer over the shared PostgreSQL client.
 *
 * Canonical raw-pg pool/query/transaction logic lives in lib/pg-pool.ts.
 * This module re-exports those helpers and keeps a lazily-created Drizzle
 * instance for legacy callers that import getDb() from lib/db.
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { getPool } from './pg-pool';

// Re-exported from lib/pg-pool for backwards compatibility.
export {
  DEFAULT_QUERY_TIMEOUT_MS,
  MAX_POOL_SIZE,
  IDLE_TIMEOUT_MS,
  CONNECTION_TIMEOUT_MS,
  parseConnectionString,
  resolveConnectionString,
  type ConnectionConfig,
  getPool,
  closePool,
  query,
  queryOne,
  queryMany,
  type QueryOptions,
  getClient,
  withTransaction,
  executeTransaction,
  type TransactionCallback,
} from './pg-pool';

let _drizzleDb: NodePgDatabase | null = null;

/**
 * Legacy Drizzle getter used across server + library code.
 * Returns null when connection settings are unavailable.
 */
export async function getDb(): Promise<NodePgDatabase | null> {
  if (_drizzleDb) return _drizzleDb;

  try {
    _drizzleDb = drizzle(getPool());
    return _drizzleDb;
  } catch (error) {
    console.warn('[lib/db] Failed to create Drizzle instance:', error);
    return null;
  }
}
