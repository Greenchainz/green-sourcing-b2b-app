import { z } from 'zod';
import { publicProcedure, protectedProcedure, router } from '../_core/trpc';
import { getDb } from '../db';
import {
  materials,
  assemblies,
  assemblyComponents,
  materialAssemblySpecs,
  ewsCarbonComponents,
} from '../../drizzle/schema';
import { eq, and, asc, inArray } from 'drizzle-orm';

export const assemblySpecsRouter = router({
  list: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db
      .select()
      .from(materialAssemblySpecs)
      .orderBy(asc(materialAssemblySpecs.gwpPer1000sf));
  }),

  listWithComponents: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    const specs = await db
      .select()
      .from(materialAssemblySpecs)
      .orderBy(asc(materialAssemblySpecs.gwpPer1000sf));

    const components = await db
      .select()
      .from(ewsCarbonComponents)
      .orderBy(asc(ewsCarbonComponents.assemblySpecId), asc(ewsCarbonComponents.layerOrder));

    const componentMap = new Map<number, typeof components>();
    for (const c of components) {
      const arr = componentMap.get(c.assemblySpecId) || [];
      arr.push(c);
      componentMap.set(c.assemblySpecId, arr);
    }

    return specs.map((spec) => ({
      ...spec,
      components: componentMap.get(spec.id) || [],
    }));
  }),
});

export const assembliesRouter = router({
  list: publicProcedure
    .input(
      z.object({
        assemblyType: z.string().optional(),
        tier: z.enum(['good', 'better', 'best']).optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const conditions: any[] = [];
      if (input?.assemblyType) conditions.push(eq(assemblies.assemblyType, input.assemblyType));
      if (input?.tier) conditions.push(eq(assemblies.sustainabilityTier, input.tier));

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      return db
        .select()
        .from(assemblies)
        .where(whereClause)
        .orderBy(asc(assemblies.totalGwpPer1000Sqft));
    }),

  getById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) return null;

    const rows = await db.select().from(assemblies).where(eq(assemblies.id, input.id)).limit(1);
    if (rows.length === 0) return null;

    const components = await db
      .select({
        component: assemblyComponents,
        materialName: materials.name,
        materialProductName: materials.productName,
        materialRValue: materials.rValue,
        materialEmbodiedCarbonPer1000sf: materials.embodiedCarbonPer1000sf,
        materialPricePerUnit: materials.pricePerUnit,
        materialPriceUnit: materials.priceUnit,
        materialFireRating: materials.fireRating,
      })
      .from(assemblyComponents)
      .leftJoin(materials, eq(assemblyComponents.materialId, materials.id))
      .where(eq(assemblyComponents.assemblyId, input.id))
      .orderBy(asc(assemblyComponents.layerOrder));

    return { ...rows[0], components };
  }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(255),
        code: z.string().max(50).nullable().optional(),
        description: z.string().nullable().optional(),
        sustainabilityTier: z.enum(['good', 'better', 'best']).nullable().optional(),
        fireRating: z.string().max(50).nullable().optional(),
        components: z.array(
          z.object({
            materialId: z.number().nullable().optional(),
            layerOrder: z.number().int().min(1),
            layerName: z.string().min(1).max(255),
            thickness: z.string().max(50).nullable().optional(),
            gwpContribution: z.number().nullable().optional(),
            notes: z.string().nullable().optional(),
          })
        ).min(1),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const existing = await db
        .select({ id: assemblies.id })
        .from(assemblies)
        .where(eq(assemblies.id, input.id))
        .limit(1);
      if (existing.length === 0) {
        throw new Error('Assembly not found');
      }

      const materialIds = Array.from(
        new Set(
          input.components
            .map((component) => component.materialId)
            .filter((value): value is number => typeof value === 'number')
        )
      );

      const linkedMaterials = materialIds.length > 0
        ? await db
            .select({
              id: materials.id,
              embodiedCarbonPer1000sf: materials.embodiedCarbonPer1000sf,
              rValue: materials.rValue,
              pricePerUnit: materials.pricePerUnit,
            })
            .from(materials)
            .where(inArray(materials.id, materialIds))
        : [];

      const materialMap = new Map(linkedMaterials.map((material) => [material.id, material]));

      const totalGwp = input.components.reduce((sum, component) => {
        const material = component.materialId ? materialMap.get(component.materialId) : undefined;
        const componentGwp = component.gwpContribution ?? Number(material?.embodiedCarbonPer1000sf ?? 0);
        return sum + (Number.isFinite(componentGwp) ? componentGwp : 0);
      }, 0);

      const totalRValue = input.components.reduce((sum, component) => {
        const material = component.materialId ? materialMap.get(component.materialId) : undefined;
        return sum + Number(material?.rValue ?? 0);
      }, 0);

      const estimatedCostPer1000Sqft = input.components.reduce((sum, component) => {
        const material = component.materialId ? materialMap.get(component.materialId) : undefined;
        return sum + Number(material?.pricePerUnit ?? 0);
      }, 0);

      await db
        .update(assemblies)
        .set({
          name: input.name,
          code: input.code ?? null,
          description: input.description ?? null,
          sustainabilityTier: input.sustainabilityTier ?? 'good',
          fireRating: input.fireRating ?? null,
          totalGwpPer1000Sqft: totalGwp.toFixed(2),
          totalRValue: totalRValue.toFixed(2),
          estimatedCostPer1000Sqft: estimatedCostPer1000Sqft.toFixed(2),
        })
        .where(eq(assemblies.id, input.id));

      await db.delete(assemblyComponents).where(eq(assemblyComponents.assemblyId, input.id));
      await db.insert(assemblyComponents).values(
        input.components.map((component, index) => ({
          assemblyId: input.id,
          materialId: component.materialId ?? null,
          layerOrder: component.layerOrder || index + 1,
          layerName: component.layerName,
          thickness: component.thickness ?? null,
          gwpContribution:
            component.gwpContribution === null || component.gwpContribution === undefined
              ? null
              : Number(component.gwpContribution).toFixed(4),
          notes: component.notes ?? null,
        }))
      );

      return {
        id: input.id,
        totalGwpPer1000Sqft: totalGwp.toFixed(2),
        totalRValue: totalRValue.toFixed(2),
        estimatedCostPer1000Sqft: estimatedCostPer1000Sqft.toFixed(2),
      };
    }),
});
