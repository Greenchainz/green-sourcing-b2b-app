// server/routers/catalog-router.ts
import { z } from 'zod';
import { publicProcedure, router } from '../_core/trpc';
import { getDb } from '../db';
import { materials, manufacturers } from '../../drizzle/schema';
import { eq, and, sql, desc } from 'drizzle-orm';

const CATALOG_PER_PAGE = 24;

export const catalogRouter = router({
  publicSearch: publicProcedure
    .input(
      z.object({
        query: z.string().optional(),
        category: z.string().optional(),
        minGwp: z.number().optional(),
        maxGwp: z.number().optional(),
        hasEpd: z.boolean().optional(),
        sortBy: z.enum(['relevance', 'gwp', 'price', 'name', 'createdAt']).optional(),
        page: z.number().int().min(1).default(1),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { items: [], totalCount: 0, totalPages: 0 };

      const conditions = [eq(materials.verified, true)];

      if (input.query) {
        conditions.push(
          sql`to_tsvector('english', ${materials.name} || ' ' || COALESCE(${materials.productName}, '') || ' ' || COALESCE(${materials.description}, '')) @@ plainto_tsquery('english', ${input.query})`
        );
      }
      if (input.category) {
        conditions.push(eq(materials.category, input.category));
      }
      if (input.hasEpd) {
        conditions.push(eq(materials.hasEpd, true));
      }
      if (input.minGwp !== undefined) {
        conditions.push(sql`${materials.gwpValue} >= ${input.minGwp}`);
      }
      if (input.maxGwp !== undefined) {
        conditions.push(sql`${materials.gwpValue} <= ${input.maxGwp}`);
      }

      const where = and(...conditions);

      // Count
      const [countRow] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(materials)
        .where(where);
      const totalCount = countRow?.count ?? 0;

      // Sort
      const sort = input.sortBy ?? 'createdAt';
      const orderBy =
        sort === 'gwp'   ? materials.gwpValue :
        sort === 'price' ? materials.pricePerUnit :
        sort === 'name'  ? materials.name :
                           desc(materials.createdAt);

      // Page
      const offset = (input.page - 1) * CATALOG_PER_PAGE;

      const items = await db
        .select({
          id:               materials.id,
          name:             materials.name,
          productName:      materials.productName,
          description:      materials.description,
          category:         materials.category,
          subcategory:      materials.subcategory,
          gwpValue:         materials.gwpValue,
          gwpUnit:          materials.gwpUnit,
          pricePerUnit:     materials.pricePerUnit,
          priceUnit:        materials.priceUnit,
          hasEpd:           materials.hasEpd,
          epdNumber:        materials.epdNumber,
          imageUrl:         materials.imageUrl,
          verified:         materials.verified,
          createdAt:        materials.createdAt,
          manufacturerId:   manufacturers.id,
          manufacturerName: manufacturers.name,
          manufacturerLogo: manufacturers.logoUrl,
        })
        .from(materials)
        .leftJoin(
          manufacturers,
          eq(materials.manufacturerId, manufacturers.id)
        )
        .where(where)
        .orderBy(orderBy)
        .limit(CATALOG_PER_PAGE)
        .offset(offset);

      return {
        items,
        totalCount,
        totalPages: Math.ceil(totalCount / CATALOG_PER_PAGE),
      };
    }),
});
