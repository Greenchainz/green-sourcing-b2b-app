/**
 * lib/db-managed-identity.ts
 *
 * Legacy compatibility shim. Managed-identity specific pooling has been
 * consolidated into the shared PostgreSQL pool module.
 */

import type { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import {
  getPool as _getPool,
  closePool,
  query,
  getClient,
  withTransaction,
} from './pg-pool';

export async function getPool(): Promise<Pool> {
  return _getPool();
}

export { closePool, query, getClient };

export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>,
): Promise<T> {
  return withTransaction(callback);
}

export type { QueryResult, QueryResultRow };
