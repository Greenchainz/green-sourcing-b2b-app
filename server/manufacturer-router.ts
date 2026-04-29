import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { manufacturers, materials } from "../drizzle/schema";
import { eq, asc, sql, desc } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

export const manufacturerRouter = router({
  getAll: publicProcedure
    .input(
      z.object({
        category: z.string().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const conditions: SQL<unknown>[] = [];
      if (input?.category) {
        conditions.push(eq(manufacturers.category, input.category));
      }

      // Count materials per manufacturer
      const materialCounts = db
        .select({
          manufacturerId: materials.manufacturerId,
          count: sql<number>`count(*)`.as("count"),
        })
        .from(materials)
        .groupBy(materials.manufacturerId)
        .as("materialCounts");

      const query = db
        .select({
          manufacturer: manufacturers,
          materialCount: sql<number>`COALESCE(${materialCounts.count}, 0)`,
        })
        .from(manufacturers)
        .leftJoin(materialCounts, eq(manufacturers.id, materialCounts.manufacturerId))
        .orderBy(desc(manufacturers.featured), asc(manufacturers.name));

      if (conditions.length > 0) {
        const rows = await query.where(conditions[0]);
        return rows.map((r) => ({
          ...r.manufacturer,
          materialCount: Number(r.materialCount),
        }));
      }

      const rows = await query;
      return rows.map((r) => ({
        ...r.manufacturer,
        materialCount: Number(r.materialCount),
      }));
    }),

  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const rows = await db
        .select()
        .from(manufacturers)
        .where(eq(manufacturers.id, input.id))
        .limit(1);

      if (rows.length === 0) return null;

      const mfgMaterials = await db
        .select()
        .from(materials)
        .where(eq(materials.manufacturerId, input.id))
        .orderBy(asc(materials.name));

      return {
        ...rows[0],
        materials: mfgMaterials,
      };
    }),

  incrementViews: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false };

      await db
        .update(manufacturers)
        .set({
          profileViews: sql`COALESCE(${manufacturers.profileViews}, 0) + 1`,
        })
        .where(eq(manufacturers.id, input.id));

      return { success: true };
    }),
});
