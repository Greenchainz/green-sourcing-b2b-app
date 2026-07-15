import { z } from 'zod';
import { router, publicProcedure } from './_core/trpc';
import { getDb } from './db';
import { materials, manufacturers } from '../drizzle/schema';
import { ilike, sql, eq } from 'drizzle-orm';

export const manufacturerSearchRouter = router({
  search: publicProcedure
    .input(z.object({ q: z.string().min(2).max(100) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      // Single query with LEFT JOIN + GROUP BY replaces the previous N+1 pattern
      // (1 query for manufacturers + up to 8 individual stats queries).
      const rows = await db
        .select({
          name: manufacturers.name,
          verified: manufacturers.verified,
          claimed: manufacturers.claimed,
          productCount: sql<number>`count(${materials.id})`.as('productCount'),
          hasImages: sql<boolean>`bool_or(${materials.imageUrl} is not null)`.as('hasImages'),
          hasEpds: sql<boolean>`bool_or(${materials.hasEpd})`.as('hasEpds'),
          categories: sql<string[]>`array_agg(distinct ${materials.category})`.as('categories'),
        })
        .from(manufacturers)
        .leftJoin(materials, eq(materials.manufacturerId, manufacturers.id))
        .where(ilike(manufacturers.name, `%${input.q}%`))
        .groupBy(manufacturers.id, manufacturers.name, manufacturers.verified, manufacturers.claimed)
        .limit(8);

      if (rows.length === 0) return [];

      return rows.map((row) => ({
        manufacturer: row.name,
        productCount: Number(row.productCount ?? 0),
        hasImages: Boolean(row.hasImages),
        hasEpds: Boolean(row.hasEpds),
        isVerified: row.verified ?? false,
        isClaimed: row.claimed ?? false,
        categories: (row.categories ?? []).filter(Boolean).slice(0, 3),
      }));
    }),
});
