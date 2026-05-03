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

      const results = await db
        .select({
          id: manufacturers.id,
          name: manufacturers.name,
          website: manufacturers.website,
          verified: manufacturers.verified,
          logoUrl: manufacturers.logoUrl,
          claimed: manufacturers.claimed,
        })
        .from(manufacturers)
        .where(ilike(manufacturers.name, `%${input.q}%`))
        .limit(8);

      if (results.length === 0) return [];

      const enriched = await Promise.all(
        results.map(async (mfr) => {
          const stats = await db
            .select({
              productCount: sql<number>`count(*)`.as('productCount'),
              hasImages: sql<boolean>`bool_or(${(materials as any).imageUrl} is not null)`.as('hasImages'),
              hasEpds: sql<boolean>`bool_or(${materials.hasEpd})`.as('hasEpds'),
              categories: sql<string[]>`array_agg(distinct ${materials.category})`.as('categories'),
            })
            .from(materials)
            .where(eq(materials.manufacturerId, mfr.id));

          return {
            manufacturer: mfr.name,
            productCount: Number(stats[0]?.productCount ?? 0),
            hasImages: Boolean(stats[0]?.hasImages),
            hasEpds: Boolean(stats[0]?.hasEpds),
            isVerified: mfr.verified ?? false,
            isClaimed: mfr.claimed ?? false,
            categories: (stats[0]?.categories ?? []).filter(Boolean).slice(0, 3),
          };
        })
      );

      return enriched;
    }),
});
