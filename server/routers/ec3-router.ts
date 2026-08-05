/**
 * EC3 (Building Transparency) tRPC Router
 * 
 * Provides endpoints for syncing EPD data from EC3 API to materials database
 * and querying materials by carbon footprint range.
 */

import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { fetchEC3EPDs, searchEC3EPDs } from "../ec3";
import { transformEC3Batch } from "../ec3-transform";
import { getDb } from "../db";
import { materials } from "../../drizzle/schema";
import { eq, and, gte, lte, inArray, sql, isNotNull, count } from "drizzle-orm";

export const ec3Router = router({
  /**
   * Sync materials from EC3 API by category
   * Fetches EPDs from EC3, transforms to materials schema, and bulk inserts/updates
   */
  syncByCategory: protectedProcedure
    .input(z.object({
      category: z.string().optional(),
      limit: z.number().min(1).max(500).default(100),
    }))
    .mutation(async ({ input }) => {
      // Fetch EPDs from EC3
      const epds = await fetchEC3EPDs(input.category, input.limit);

      if (epds.length === 0) {
        return {
          success: true,
          synced: 0,
          updated: 0,
          created: 0,
          message: "No EPDs found for this category",
        };
      }

      // Transform EPDs to materials (async — translates non-English content to English)
      const transformedMaterials = await transformEC3Batch(epds);

      // Check which materials already exist (by EC3 ID)
      const ec3Ids = epds.map(epd => epd.id);
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");
      
      const existingMaterials = await db
        .select()
        .from(materials)
        .where(inArray(materials.ec3Id, ec3Ids));

      const existingEc3Ids = new Set(existingMaterials.map((m) => m.ec3Id));

      // Separate into create vs update
      const toCreate = transformedMaterials.filter(m => !existingEc3Ids.has(m.ec3Id!));
      const toUpdate = transformedMaterials.filter(m => existingEc3Ids.has(m.ec3Id!));

      let created = 0;
      let updated = 0;

      // Bulk insert new materials
      if (toCreate.length > 0) {
        await db.insert(materials).values(toCreate as (typeof materials)["$inferInsert"][]);
        created = toCreate.length;
      }

      // Update existing materials
      for (const material of toUpdate) {
        await db
          .update(materials)
          .set({ ...material, updatedAt: new Date() })
          .where(eq(materials.ec3Id, material.ec3Id!));
        updated++;
      }

      return {
        success: true,
        synced: epds.length,
        created,
        updated,
        message: `Synced ${epds.length} EPDs: ${created} created, ${updated} updated`,
      };
    }),

  /**
   * Search EC3 EPDs and optionally sync to database
   */
  searchAndSync: protectedProcedure
    .input(z.object({
      query: z.string().min(1),
      limit: z.number().min(1).max(100).default(20),
      sync: z.boolean().default(false),
    }))
    .mutation(async ({ input }) => {
      // Search EC3
      const epds = await searchEC3EPDs(input.query, input.limit);

      if (epds.length === 0) {
        return {
          success: true,
          found: 0,
          synced: 0,
          results: [],
        };
      }

      let synced = 0;

      // Optionally sync to database
      if (input.sync) {
        const db = await getDb();
        if (!db) throw new Error("Database connection failed");
        
        const transformedMaterials = await transformEC3Batch(epds);

        if (transformedMaterials.length > 0) {
          const ec3Ids = transformedMaterials.map((m) => m.ec3Id!).filter(Boolean);

          let existingSet = new Set<string>();
          if (ec3Ids.length > 0) {
            const existingMaterials = await db
              .select({ ec3Id: materials.ec3Id })
              .from(materials)
              .where(inArray(materials.ec3Id, ec3Ids));

            existingSet = new Set(existingMaterials.map((m) => m.ec3Id as string));
          }

          const toInsert = transformedMaterials.filter((m) => m.ec3Id && !existingSet.has(m.ec3Id));

          for (const material of toInsert) {
            if (material.ec3Id && existingSet.has(material.ec3Id)) {
              continue; // Ensure intra-batch duplicates are not inserted
            }
            await db.insert(materials).values(material as (typeof materials)["$inferInsert"]);
            if (material.ec3Id) existingSet.add(material.ec3Id);
            synced++;
          }
        }
      }

      return {
        success: true,
        found: epds.length,
        synced,
        results: epds.map(epd => ({
          id: epd.id,
          name: epd.name,
          category: epd.category.display_name,
          gwp: epd.gwp,
          manufacturer: epd.manufacturer?.name,
          verified: epd.externally_verified,
        })),
      };
    }),

  /**
   * Query materials by carbon footprint range
   * Used by swap engine to find alternatives
   */
  searchByCarbon: publicProcedure
    .input(z.object({
      minGwp: z.number().optional(),
      maxGwp: z.number().optional(),
      category: z.string().optional(),
      limit: z.number().min(1).max(100).default(20),
    }))
    .query(async ({ input }) => {
      const conditions = [];

      // Filter by carbon range
      if (input.minGwp !== undefined) {
        conditions.push(gte(materials.embodiedCarbonPer1000sf, input.minGwp.toString()));
      }
      if (input.maxGwp !== undefined) {
        conditions.push(lte(materials.embodiedCarbonPer1000sf, input.maxGwp.toString()));
      }

      // Filter by category
      if (input.category) {
        conditions.push(eq(materials.category, input.category));
      }

      // Only return materials with EC3 data (ec3Id is not null)
      // Note: We check for non-null ec3Id after the query

      const db = await getDb();
      if (!db) throw new Error("Database connection failed");
      
      const query = conditions.length > 0
        ? db.select().from(materials).where(and(...conditions)).limit(input.limit)
        : db.select().from(materials).limit(input.limit);

      const allResults = await query;
      
      // Filter for materials with EC3 data
      const results = allResults.filter((m) => m.ec3Id !== null);

      return {
        success: true,
        count: results.length,
        materials: results,
      };
    }),

  /**
   * Get sync status and statistics
   */
  getSyncStatus: publicProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      // Single aggregate query instead of loading all rows into memory
      const [stats] = await db
        .select({
          totalMaterials: sql<number>`count(*)::int`,
          ec3Materials: sql<number>`count(${materials.ec3Id})::int`,
          lastSynced: sql<Date | null>`max(${materials.ec3SyncedAt}) filter (where ${isNotNull(materials.ec3Id)})`,
        })
        .from(materials);

      const total = stats.totalMaterials ?? 0;
      const ec3Count = stats.ec3Materials ?? 0;

      return {
        success: true,
        totalMaterials: total,
        ec3Materials: ec3Count,
        lastSynced: stats.lastSynced ?? null,
        syncPercentage: total > 0 ? Math.round((ec3Count / total) * 100) : 0,
      };
    }),
});
