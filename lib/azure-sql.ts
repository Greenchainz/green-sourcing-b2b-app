/**
 * lib/azure-sql.ts
 *
 * Legacy compatibility shim kept for old imports. Connection handling has been
 * consolidated to the shared PostgreSQL pool module.
 */

import type { Pool } from 'pg';
import { getPool, closePool } from './pg-pool';

/** @deprecated Legacy name retained for compatibility; returns the shared PostgreSQL pool. */
export async function getAzureSqlConnection(): Promise<Pool> {
  return getPool();
}

export async function closeConnection(): Promise<void> {
  return closePool();
}
