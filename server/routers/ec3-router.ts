/**
 * EC3 (Building Transparency) tRPC Router
 * 
 * Provides endpoints for syncing EPD data from EC3 API to materials database
 * and querying materials by carbon footprint range.
 */

import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { fetchEC3EPDs, searchEC3EPDs } from "../ec3";
import { transformEC3ToMaterial, transformEC3Batch } from "../ec3-transform";
import { getDb } from "../db";
import { materials } from "../../drizzle/schema";
import { eq, and, gte, lte, isNull } from "drizzle-orm";

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

      // Transform EPDs to materials
      const transformedMaterials = transformEC3Batch(epds);

      // Check which materials already exist (by EC3 ID)
      const ec3Ids = epds.map(epd => epd.id);
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");
      
      const existingMaterials = await db
        .select()
        .from(materials)
        .where(
          and(
            ...ec3Ids.map(id => eq(materials.ec3Id, id))
          )
        );

      const existingEc3Ids = new Set(existingMaterials.map((m: any) => m.ec3Id));

      // Separate into create vs update
      const toCreate = transformedMaterials.filter(m => !existingEc3Ids.has(m.ec3Id!));
      const toUpdate = transformedMaterials.filter(m => existingEc3Ids.has(m.ec3Id!));

      let created = 0;
      let updated = 0;

      // Bulk insert new materials
      if (toCreate.length > 0) {
        await db.insert(materials).values(toCreate as any);
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
        
        const transformedMaterials = transformEC3Batch(epds);
        
        for (const material of transformedMaterials) {
          // Check if exists
          const existing = await db
            .select()
            .from(materials)
            .where(eq(materials.ec3Id, material.ec3Id!))
            .limit(1);

          if (existing.length === 0) {
            await db.insert(materials).values(material as any);
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
      const results = allResults.filter((m: any) => m.ec3Id !== null);

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
      // Count materials by data source
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");
      
      const allMaterials = await db.select().from(materials);
      const ec3Materials = allMaterials.filter((m: any) => m.ec3Id !== null);

      const totalMaterials = await db.select().from(materials);

      // Get last sync time
      const lastSynced = ec3Materials.length > 0
        ? Math.max(...ec3Materials.map((m: any) => m.ec3SyncedAt?.getTime() || 0))
        : null;

      return {
        success: true,
        totalMaterials: totalMaterials.length,
        ec3Materials: ec3Materials.length,
        lastSynced: lastSynced ? new Date(lastSynced) : null,
        syncPercentage: totalMaterials.length > 0
          ? Math.round((ec3Materials.length / totalMaterials.length) * 100)
          : 0,
      };
    }),
});
