/**
 * In-memory cache for material categories.
 * The materials.categories endpoint is queried on 5+ client pages but
 * categories rarely change (only when new materials are added).
 * This cache holds the rows for 10 minutes, saving a DB round-trip per request.
 */
import { getDb } from '../db';
import { materials } from '../../drizzle/schema';
import { sql } from 'drizzle-orm';

interface CategoryRow {
  category: string | null;
  count: number;
}

let cachedCategories: CategoryRow[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export async function getCachedCategories(): Promise<CategoryRow[]> {
  const now = Date.now();
  if (cachedCategories && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedCategories;
  }

  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select({
      category: materials.category,
      count: sql<number>`count(*)`,
    })
    .from(materials)
    .groupBy(materials.category);

  cachedCategories = rows;
  cacheTimestamp = now;
  return rows;
}

export function invalidateCategoriesCache(): void {
  cachedCategories = null;
  cacheTimestamp = 0;
}
