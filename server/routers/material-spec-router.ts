import { z } from "zod";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { materialSpecs, materials, suppliers } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

/**
 * Material Specification Submission Router
 * Handles supplier-submitted specs with all CCPS metrics
 */

// Validation schema for material spec submission
const submitSpecSchema = z.object({
  materialId: z.number().int().positive(),
  supplierId: z.number().int().positive(),
  
  // Compliance metrics
  fireRating: z.string().optional(),
  fireRatingStandard: z.string().optional(),
  rValue: z.number().optional(),
  thermalUValue: z.number().optional(),
  compressiveStrength: z.string().optional(),
  tensileStrength: z.string().optional(),
  astmStandards: z.array(z.string()).optional(),
  meetsTitle24: z.boolean().optional(),
  meetsIecc: z.boolean().optional(),
  buildingCodes: z.array(z.string()).optional(),
  
  // Cost metrics
  pricePerUnit: z.number().optional(),
  priceUnit: z.string().optional(),
  minimumOrderQuantity: z.number().int().optional(),
  moqUnit: z.string().optional(),
  bulkDiscountAvailable: z.boolean().optional(),
  
  // Supply chain metrics
  leadTimeDays: z.number().int().optional(),
  manufacturingLocation: z.string().optional(),
  usManufactured: z.boolean().optional(),
  regionalAvailabilityMiles: z.number().int().optional(),
  shippingRegions: z.array(z.string()).optional(),
  inStock: z.boolean().optional(),
  stockQuantity: z.number().int().optional(),
  
  // Health metrics
  vocLevel: z.string().optional(),
  vocCertification: z.string().optional(),
  onRedList: z.boolean().optional(),
  toxicityRating: z.string().optional(),
  indoorAirQualityRating: z.string().optional(),
  
  // Certifications
  hasEpd: z.boolean().optional(),
  hasHpd: z.boolean().optional(),
  hasFsc: z.boolean().optional(),
  hasC2c: z.boolean().optional(),
  hasGreenguard: z.boolean().optional(),
  hasDeclare: z.boolean().optional(),
  certificationUrls: z.record(z.string(), z.string()).optional(), // {EPD: "url", HPD: "url"}
  
  // Supporting documents
  datasheetUrl: z.string().url().optional(),
  specSheetUrl: z.string().url().optional(),
  testReportUrls: z.array(z.string().url()).optional(),
  
  // Additional info
  notes: z.string().optional(),
  recycledContentPct: z.number().min(0).max(100).optional(),
  warrantyYears: z.number().int().optional(),
  expectedLifecycleYears: z.number().int().optional(),
});

export const materialSpecRouter = router({
  /**
   * Submit a new material specification
   * Requires authentication (supplier role)
   */
  submit: protectedProcedure
    .input(submitSpecSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Convert arrays/objects to JSON strings for storage
      const specData = {
        ...input,
        submittedBy: ctx.user.id,
        status: "pending" as const,
        astmStandards: input.astmStandards ? JSON.stringify(input.astmStandards) : null,
        buildingCodes: input.buildingCodes ? JSON.stringify(input.buildingCodes) : null,
        shippingRegions: input.shippingRegions ? JSON.stringify(input.shippingRegions) : null,
        certificationUrls: input.certificationUrls ? JSON.stringify(input.certificationUrls) : null,
        testReportUrls: input.testReportUrls ? JSON.stringify(input.testReportUrls) : null,
        meetsTitle24: input.meetsTitle24 ? 1 : 0,
        meetsIecc: input.meetsIecc ? 1 : 0,
        bulkDiscountAvailable: input.bulkDiscountAvailable ? 1 : 0,
        usManufactured: input.usManufactured ? 1 : 0,
        inStock: input.inStock !== false ? 1 : 0, // Default to in stock
        onRedList: input.onRedList ? 1 : 0,
        hasEpd: input.hasEpd ? 1 : 0,
        hasHpd: input.hasHpd ? 1 : 0,
        hasFsc: input.hasFsc ? 1 : 0,
        hasC2c: input.hasC2c ? 1 : 0,
        hasGreenguard: input.hasGreenguard ? 1 : 0,
        hasDeclare: input.hasDeclare ? 1 : 0,
      };
      
      const [result] = await db.insert(materialSpecs).values(specData as any);
      
      return {
        success: true,
        message: "Specification submitted successfully. Pending admin review.",
      };
    }),

  /**
   * Update an existing material specification
   * Only the submitter or admin can update
   */
  update: protectedProcedure
    .input(z.object({
      specId: z.number().int().positive(),
      updates: submitSpecSchema.partial(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Check if user owns this spec or is admin
      const [existing] = await db
        .select()
        .from(materialSpecs)
        .where(eq(materialSpecs.id, input.specId))
        .limit(1);
      
      if (!existing) {
        throw new Error("Specification not found");
      }
      
      if (existing.submittedBy !== ctx.user.id && ctx.user.role !== "admin") {
        throw new Error("Unauthorized to update this specification");
      }
      
      // Convert arrays/objects to JSON strings
      const updates = {
        ...input.updates,
        astmStandards: input.updates.astmStandards ? JSON.stringify(input.updates.astmStandards) : undefined,
        buildingCodes: input.updates.buildingCodes ? JSON.stringify(input.updates.buildingCodes) : undefined,
        shippingRegions: input.updates.shippingRegions ? JSON.stringify(input.updates.shippingRegions) : undefined,
        certificationUrls: input.updates.certificationUrls ? JSON.stringify(input.updates.certificationUrls) : undefined,
        testReportUrls: input.updates.testReportUrls ? JSON.stringify(input.updates.testReportUrls) : undefined,
        meetsTitle24: input.updates.meetsTitle24 !== undefined ? (input.updates.meetsTitle24 ? 1 : 0) : undefined,
        meetsIecc: input.updates.meetsIecc !== undefined ? (input.updates.meetsIecc ? 1 : 0) : undefined,
        bulkDiscountAvailable: input.updates.bulkDiscountAvailable !== undefined ? (input.updates.bulkDiscountAvailable ? 1 : 0) : undefined,
        usManufactured: input.updates.usManufactured !== undefined ? (input.updates.usManufactured ? 1 : 0) : undefined,
        inStock: input.updates.inStock !== undefined ? (input.updates.inStock ? 1 : 0) : undefined,
        onRedList: input.updates.onRedList !== undefined ? (input.updates.onRedList ? 1 : 0) : undefined,
        hasEpd: input.updates.hasEpd !== undefined ? (input.updates.hasEpd ? 1 : 0) : undefined,
        hasHpd: input.updates.hasHpd !== undefined ? (input.updates.hasHpd ? 1 : 0) : undefined,
        hasFsc: input.updates.hasFsc !== undefined ? (input.updates.hasFsc ? 1 : 0) : undefined,
        hasC2c: input.updates.hasC2c !== undefined ? (input.updates.hasC2c ? 1 : 0) : undefined,
        hasGreenguard: input.updates.hasGreenguard !== undefined ? (input.updates.hasGreenguard ? 1 : 0) : undefined,
        hasDeclare: input.updates.hasDeclare !== undefined ? (input.updates.hasDeclare ? 1 : 0) : undefined,
      };
      
      await db
        .update(materialSpecs)
        .set(updates as any)
        .where(eq(materialSpecs.id, input.specId));
      
      return {
        success: true,
        message: "Specification updated successfully",
      };
    }),

  /**
   * Get specs for a specific material
   * Returns all approved specs by default, or all if user is admin
   */
  getByMaterial: publicProcedure
    .input(z.object({
      materialId: z.number().int().positive(),
      includeAll: z.boolean().optional(), // Admin only: include pending/rejected
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const isAdmin = ctx.user?.role === "admin";
      const showAll = input.includeAll && isAdmin;
      
      const specs = await db
        .select()
        .from(materialSpecs)
        .where(
          showAll
            ? eq(materialSpecs.materialId, input.materialId)
            : and(
                eq(materialSpecs.materialId, input.materialId),
                eq(materialSpecs.status, "approved")
              )
        )
        .orderBy(desc(materialSpecs.createdAt));
      
      // Parse JSON fields back to objects/arrays
      return specs.map((spec: any) => ({
        ...spec,
        astmStandards: spec.astmStandards ? JSON.parse(spec.astmStandards) : null,
        buildingCodes: spec.buildingCodes ? JSON.parse(spec.buildingCodes) : null,
        shippingRegions: spec.shippingRegions ? JSON.parse(spec.shippingRegions) : null,
        certificationUrls: spec.certificationUrls ? JSON.parse(spec.certificationUrls) : null,
        testReportUrls: spec.testReportUrls ? JSON.parse(spec.testReportUrls) : null,
      }));
    }),

  /**
   * Get specs submitted by a specific supplier
   */
  getBySupplier: protectedProcedure
    .input(z.object({
      supplierId: z.number().int().positive(),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Only allow supplier to see their own specs, or admin to see all
      if (ctx.user.role !== "admin" && ctx.user.id !== input.supplierId) {
        throw new Error("Unauthorized to view these specifications");
      }
      
      const specs = await db
        .select()
        .from(materialSpecs)
        .where(eq(materialSpecs.supplierId, input.supplierId))
        .orderBy(desc(materialSpecs.createdAt));
      
      return specs.map((spec: any) => ({
        ...spec,
        astmStandards: spec.astmStandards ? JSON.parse(spec.astmStandards) : null,
        buildingCodes: spec.buildingCodes ? JSON.parse(spec.buildingCodes) : null,
        shippingRegions: spec.shippingRegions ? JSON.parse(spec.shippingRegions) : null,
        certificationUrls: spec.certificationUrls ? JSON.parse(spec.certificationUrls) : null,
        testReportUrls: spec.testReportUrls ? JSON.parse(spec.testReportUrls) : null,
      }));
    }),

  /**
   * Admin: Approve or reject a spec
   */
  review: adminProcedure
    .input(z.object({
      specId: z.number().int().positive(),
      status: z.enum(["approved", "rejected"]),
      rejectionReason: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db
        .update(materialSpecs)
        .set({
          status: input.status,
          reviewedBy: ctx.user.id,
          reviewedAt: new Date(),
          rejectionReason: input.rejectionReason || null,
        })
        .where(eq(materialSpecs.id, input.specId));
      
      return {
        success: true,
        message: `Specification ${input.status}`,
      };
    }),

  /**
   * Get pending specs for admin review
   */
  getPending: adminProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const specs = await db
        .select()
        .from(materialSpecs)
        .where(eq(materialSpecs.status, "pending"))
        .orderBy(desc(materialSpecs.createdAt));
      
      return specs.map((spec: any) => ({
        ...spec,
        astmStandards: spec.astmStandards ? JSON.parse(spec.astmStandards) : null,
        buildingCodes: spec.buildingCodes ? JSON.parse(spec.buildingCodes) : null,
        shippingRegions: spec.shippingRegions ? JSON.parse(spec.shippingRegions) : null,
        certificationUrls: spec.certificationUrls ? JSON.parse(spec.certificationUrls) : null,
        testReportUrls: spec.testReportUrls ? JSON.parse(spec.testReportUrls) : null,
      }));
    }),
});
