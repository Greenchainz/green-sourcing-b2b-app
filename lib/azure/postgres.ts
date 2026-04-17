/**
 * lib/azure/postgres.ts
 * Adapts lib/pg-pool.ts to the interface expected by lib/azure/index.ts.
 */
import { QueryResultRow } from 'pg';
import {
  getPool, closePool, resolveConnectionString,
  query, queryOne, queryMany, getClient, withTransaction,
  type QueryOptions, type TransactionCallback,
} from '../pg-pool';

export { getClient };
export const getPostgresPool = getPool;
export const closePostgresPool = closePool;
export async function resetPostgresPool(): Promise<void> { await closePool(); }
export function isPostgresConfigured(): boolean { return !!resolveConnectionString(); }
export type { QueryOptions };
export interface TransactionOptions { callback: TransactionCallback<unknown>; }
export interface PostgresConfig { connectionString?: string; host?: string; port?: number; database?: string; user?: string; password?: string; ssl?: boolean; }
export { query, queryOne };
export const queryAll = queryMany;
export async function queryScalar<T = unknown>(text: string, params?: unknown[], options?: QueryOptions): Promise<T | null> {
  const row = await queryOne<QueryResultRow>(text, params, options);
  if (!row) return null;
  const k = Object.keys(row)[0];
  return k !== undefined ? (row[k] as T) : null;
}
export { withTransaction };
export async function batchQuery(queries: Array<{ text: string; params?: unknown[] }>): Promise<void> {
  for (const q of queries) { await query(q.text, q.params); }
}
export async function bulkInsert(table: string, columns: string[], rows: unknown[][]): Promise<void> {
  if (rows.length === 0) return;
  const ph = rows.map((_, ri) => `(${columns.map((_, ci) => `$${ri * columns.length + ci + 1}`).join(', ')})`).join(', ');
  await query(`INSERT INTO ${table} (${columns.join(', ')}) VALUES ${ph}`, rows.flat());
}
export async function healthCheck(): Promise<boolean> {
  try { await getPostgresPool().query('SELECT 1'); return true; } catch { return false; }
}
