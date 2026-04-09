/**
 * server/pg-db.ts
 *
 * Backward-compatibility re-export shim.
 * All connection-pool logic now lives in lib/pg-pool.ts.
 * Import directly from lib/pg-pool.ts in new code.
 */
export {
  // constants
  DEFAULT_QUERY_TIMEOUT_MS,
  MAX_POOL_SIZE,
  IDLE_TIMEOUT_MS,
  CONNECTION_TIMEOUT_MS,
  // connection string
  parseConnectionString,
  resolveConnectionString,
  type ConnectionConfig,
  // pool lifecycle
  getPool,
  closePool,
  // query helpers
  query,
  queryOne,
  queryMany,
  type QueryOptions,
  // transaction helpers
  getClient,
  withTransaction,
  executeTransaction,
  type TransactionCallback,
} from '../lib/pg-pool';
