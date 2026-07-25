import { z } from 'zod';
import { router, publicProcedure, adminProcedure } from './_core/trpc';
import { getDb } from './db';
import { materials, suppliers } from '../drizzle/schema';
import { eq, and, or, isNull, gt } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

const setFeaturedMaterialInput = z.object({
  materialId: z.number().int().positive(),
  featured: z.boolean(),
  featuredUntil: z.string().datetime().optional(),
});

const setFeaturedSupplierInput = z.object({
  supplierId: z.number().int().positive(),
  featured: z.boolean(),
  featuredUntil: z.string().datetime().optional(),
});

const getFeaturedInput = z.object({
  category: z.string().optional(),
  limit: z.number().int().min(1).max(10).default(4),
});

export const featuredRouter = router({
  setFeaturedMaterial: adminProcedure
    .input(setFeaturedMaterialInput)
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DB unavailable' });

      const until = input.featuredUntil
        ? new Date(input.featuredUntil)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      await db
        .update(materials)
        .set({ isFeatured: input.featured, featuredUntil: input.featured ? until : null } as any)
        .where(eq(materials.id, input.materialId));

      return { success: true, materialId: input.materialId, featured: input.featured, featuredUntil: input.featured ? until : null };
    }),

  setFeaturedSupplier: adminProcedure
    .input(setFeaturedSupplierInput)
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DB unavailable' });

      const until = input.featuredUntil
        ? new Date(input.featuredUntil)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      await db
        .update(suppliers)
        .set({ isFeatured: input.featured, featuredUntil: input.featured ? until : null } as any)
        .where(eq(suppliers.id, input.supplierId));

      return { success: true, supplierId: input.supplierId, featured: input.featured, featuredUntil: input.featured ? until : null };
    }),

  getFeaturedMaterials: publicProcedure
    .input(getFeaturedInput)
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DB unavailable' });

      const now = new Date();

      const results = await db
        .select({
          id: materials.id,
          name: materials.name,
          productName: materials.productName,
          category: materials.category,
          subcategory: materials.subcategory,
          description: materials.description,
          gwpValue: materials.gwpValue,
          gwpUnit: materials.gwpUnit,
          hasEpd: materials.hasEpd,
          imageUrl: (materials as any).imageUrl,
          isFeatured: (materials as any).isFeatured,
          featuredUntil: (materials as any).featuredUntil,
          manufacturerId: materials.manufacturerId,
        })
        .from(materials)
        .where(
          and(
            eq((materials as any).isFeatured, true),
            or(
              isNull((materials as any).featuredUntil),
              gt((materials as any).featuredUntil, now)
            ),
            input.category ? eq(materials.category, input.category) : undefined
          )
        )
        .limit(input.limit);

      return results;
    }),

  listFeaturedPlacements: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DB unavailable' });

    const now = new Date();

    const featuredMaterials = await db
      .select({
        id: materials.id,
        name: materials.name,
        category: materials.category,
        isFeatured: (materials as any).isFeatured,
        featuredUntil: (materials as any).featuredUntil,
      })
      .from(materials)
      .where(
        or(
          isNull((materials as any).featuredUntil),
          gt((materials as any).featuredUntil, now)
        )
      );

    const featuredSuppliers = await db
      .select({
        id: suppliers.id,
        companyName: suppliers.companyName,
        isFeatured: (suppliers as any).isFeatured,
        featuredUntil: (suppliers as any).featuredUntil,
      })
      .from(suppliers)
      .where(
        or(
          isNull((suppliers as any).featuredUntil),
          gt((suppliers as any).featuredUntil, now)
        )
      );

    return {
      materials: featuredMaterials.filter((m) => m.isFeatured),
      suppliers: featuredSuppliers.filter((s) => s.isFeatured),
    };
  }),
});
