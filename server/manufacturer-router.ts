import { z } from "zod";
import { publicProcedure, adminProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { manufacturers, materials } from "../drizzle/schema";
import { eq, asc, sql, desc } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { SUPPLIERS, SupplierCategory } from "../lib/research/supplierCategories";

// Map research-library SupplierCategory → human-readable display category
const CATEGORY_LABELS: Record<SupplierCategory, string> = {
  [SupplierCategory.LowCarbonConcrete]: "Concrete",
  [SupplierCategory.MassTimber]: "Mass Timber",
  [SupplierCategory.ModifiedWood]: "Wood",
  [SupplierCategory.BioInsulation]: "Insulation",
  [SupplierCategory.Mycelium]: "Mycelium",
  [SupplierCategory.WasteValorization]: "Waste Valorization",
  [SupplierCategory.AdvancedTech]: "Advanced Tech",
};

/** Shape that both DB rows and the fallback list share */
interface ManufacturerRow {
  id: number;
  name: string;
  companyName: string;
  website: string | null;
  logoUrl: string | null;
  description: string | null;
  category: string | null;
  subcategory: string | null;
  location: string | null;
  keyProduct: string | null;
  pitchAngle: string | null;
  hasEpd: boolean | null;
  readinessLevel: string | null;
  verified: boolean | null;
  claimed: boolean | null;
  featured: boolean | null;
  profileViews: number | null;
  dataSource: string | null;
  materialCount: number;
}

/** Research-library supplier list mapped to ManufacturerRow shape */
function researchFallback(categoryFilter?: string): ManufacturerRow[] {
  return SUPPLIERS
    .filter((s) =>
      !categoryFilter ||
      CATEGORY_LABELS[s.category].toLowerCase().includes(categoryFilter.toLowerCase())
    )
    .map((s, idx) => ({
      id: -(idx + 1),          // negative IDs flag "not in DB"
      name: s.company,
      companyName: s.company,
      website: null,
      logoUrl: null,
      description: s.sustainabilityAngle,
      category: CATEGORY_LABELS[s.category],
      subcategory: null,
      location: null,
      keyProduct: s.product,
      pitchAngle: s.pitchAngle,
      hasEpd: null,
      readinessLevel: s.readiness,
      verified: false,
      claimed: false,
      featured: s.foundingFiftyCandidate ?? false,
      profileViews: 0,
      dataSource: "research-library",
      materialCount: 0,
    }));
}

export const manufacturerRouter = router({
  getAll: publicProcedure
    .input(
      z.object({
        category: z.string().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return researchFallback(input?.category);

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

      const rows = conditions.length > 0
        ? await query.where(conditions[0])
        : await query;

      const dbResults = rows.map((r) => ({
        ...r.manufacturer,
        companyName: r.manufacturer.name,
        materialCount: Number(r.materialCount),
      }));

      // If the DB table has no rows yet, surface the research library
      if (dbResults.length === 0) {
        return researchFallback(input?.category);
      }

      return dbResults;
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

  /**
   * Curated editorial spotlight for the /manufacturers page.
   * Returns ONLY featured suppliers (never the full inventory) so the moat
   * stays server-side. The most-recently-featured row is the "Supplier of the
   * Week" hero; the remainder are the "Emerging / New & Noteworthy" set.
   */
  getSpotlight: publicProcedure
    .input(z.object({ limit: z.number().int().min(1).max(12).optional() }).optional())
    .query(async ({ input }) => {
      const limit = input?.limit ?? 7;
      const db = await getDb();
      if (!db) {
        return researchFallback().filter((m) => m.featured).slice(0, limit);
      }

      const materialCounts = db
        .select({
          manufacturerId: materials.manufacturerId,
          count: sql<number>`count(*)`.as("count"),
        })
        .from(materials)
        .groupBy(materials.manufacturerId)
        .as("materialCounts");

      const rows = await db
        .select({
          manufacturer: manufacturers,
          materialCount: sql<number>`COALESCE(${materialCounts.count}, 0)`,
        })
        .from(manufacturers)
        .leftJoin(materialCounts, eq(manufacturers.id, materialCounts.manufacturerId))
        .where(eq(manufacturers.featured, true))
        .orderBy(desc(manufacturers.updatedAt))
        .limit(limit);

      const dbResults = rows.map((r) => ({
        ...r.manufacturer,
        companyName: r.manufacturer.name,
        materialCount: Number(r.materialCount),
      }));

      // Nothing curated yet → surface featured research-library candidates.
      if (dbResults.length === 0) {
        return researchFallback().filter((m) => m.featured).slice(0, limit);
      }

      return dbResults;
    }),

  /**
   * Admin-only: feature / un-feature a supplier. Stamping updatedAt makes the
   * newest pick the "Supplier of the Week" hero (getSpotlight orders by it).
   * No schema migration — reuses the existing `featured` flag.
   */
  setFeatured: adminProcedure
    .input(z.object({ id: z.number().int().positive(), featured: z.boolean() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false as const };

      await db
        .update(manufacturers)
        .set({ featured: input.featured, updatedAt: new Date() })
        .where(eq(manufacturers.id, input.id));

      return { success: true as const, id: input.id, featured: input.featured };
    }),
});
