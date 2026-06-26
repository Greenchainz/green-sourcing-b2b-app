/**
 * In-memory cache for CCPS baselines.
 * The ccpsBaselines table is queried on every materials.list call but rarely changes.
 * This cache holds the rows for 10 minutes, saving a DB round-trip per request.
 */
import { getDb } from '../db';
import { ccpsBaselines } from '../../drizzle/schema';

type BaselineRow = typeof ccpsBaselines.$inferSelect;

let cachedBaselines: BaselineRow[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export async function getCachedBaselines(): Promise<BaselineRow[]> {
  const now = Date.now();
  if (cachedBaselines && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedBaselines;
  }

  const db = await getDb();
  if (!db) return [];

  const rows = await db.select().from(ccpsBaselines);
  cachedBaselines = rows;
  cacheTimestamp = now;
  return rows;
}

export function invalidateBaselinesCache(): void {
  cachedBaselines = null;
  cacheTimestamp = 0;
}
