import { protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  registerSupplier,
  getSupplierProfile,
  updateSupplierProfile,
  getSubscriptionTier,
  upgradeToPremium,
  downgradeToFree,
} from "./supplier-service";
import { getDb } from "./db";
import { suppliers, supplierFilters } from "../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Supplier Portal Router
 * Handles supplier registration, profile management, and subscription tiers
 */

export const supplierRouter = router({
  // Register a new supplier
  register: protectedProcedure
    .input(
      z.object({
        companyName: z.string().min(1),
        email: z.string().email(),
        phone: z.string().optional(),
        address: z.string().optional(),
        city: z.string().min(1),
        state: z.string().min(1),
        zipCode: z.string().min(1),
        country: z.string().min(1),
        website: z.string().url().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return registerSupplier({
        userId: ctx.user.id,
        ...input,
      });
    }),

  // Get supplier profile
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    return getSupplierProfile(ctx.user.id);
  }),

  // Update supplier profile
  updateProfile: protectedProcedure
    .input(
      z.object({
        companyName: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zipCode: z.string().optional(),
        country: z.string().optional(),
        website: z.string().url().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return updateSupplierProfile(ctx.user.id, input);
    }),

  // Get subscription tier
  getSubscriptionTier: protectedProcedure.query(async ({ ctx }) => {
    const profile = await getSupplierProfile(ctx.user.id);
    if (!profile) return "free";
    return getSubscriptionTier(profile.id);
  }),

  // Microsoft AppSource subscription upgrade — MSSubscriptionId from webhook
  upgradeToPremium: protectedProcedure
    .input(
      z.object({
        msSubscriptionId: z.string(),
        msPlanId: z.string(),
        renewalDate: z.date(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const profile = await getSupplierProfile(ctx.user.id);
      if (!profile) throw new Error("Supplier profile not found");
      await upgradeToPremium(
        profile.id,
        input.msSubscriptionId,
        input.msPlanId,
        input.renewalDate
      );
      return { success: true };
    }),

  // Downgrade to free
  downgradeToFree: protectedProcedure.mutation(async ({ ctx }) => {
    const profile = await getSupplierProfile(ctx.user.id);
    if (!profile) throw new Error("Supplier profile not found");
    await downgradeToFree(profile.id);
    return { success: true };
  }),

  // Search suppliers for direct messaging
  searchSuppliers: protectedProcedure
    .input(
      z.object({
        query: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const { getDb } = await import("./db");
      const { suppliers } = await import("../drizzle/schema");
      const { like, or } = await import("drizzle-orm");
      
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      let query = db.select().from(suppliers);

      // Filter by search query if provided
      if (input.query && input.query.trim()) {
        const searchTerm = `%${input.query.trim()}%`;
        query = query.where(
          or(
            like(suppliers.companyName, searchTerm),
            like(suppliers.city, searchTerm),
            like(suppliers.state, searchTerm)
          )
        ) as any;
      }

      const results = await query.limit(20).execute();
      return results;
    }),

  /**
   * Get the current supplier's RFQ matching filter settings
   */
  getMyFilters: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");

    const [supplier] = await db
      .select({ id: suppliers.id })
      .from(suppliers)
      .where(eq(suppliers.userId, ctx.user.id))
      .limit(1);

    if (!supplier) return null;

    const [filter] = await db
      .select()
      .from(supplierFilters)
      .where(eq(supplierFilters.supplierId, supplier.id))
      .limit(1);

    return filter ?? null;
  }),

  /**
   * Create or update the current supplier's RFQ matching filter settings
   */
  saveFilters: protectedProcedure
    .input(
      z.object({
        materialTypePreferences: z.array(z.string()).default([]),
        serviceRadius: z.number().int().min(0).max(2000).nullable().default(null),
        acceptedLocations: z.string().max(500).default(""),
        minPrice: z.number().positive().nullable().default(null),
        maxPrice: z.number().positive().nullable().default(null),
        minLeadDays: z.number().int().positive().nullable().default(null),
        maxLeadDays: z.number().int().positive().nullable().default(null),
        minOrderQuantity: z.number().positive().nullable().default(null),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      const [supplier] = await db
        .select({ id: suppliers.id })
        .from(suppliers)
        .where(eq(suppliers.userId, ctx.user.id))
        .limit(1);

      if (!supplier) throw new Error("Supplier profile not found");

      const [existing] = await db
        .select({ id: supplierFilters.id })
        .from(supplierFilters)
        .where(eq(supplierFilters.supplierId, supplier.id))
        .limit(1);

      const values = {
        supplierId: supplier.id,
        materialTypePreferences: input.materialTypePreferences,
        serviceRadius: input.serviceRadius,
        acceptedLocations: input.acceptedLocations || null,
        minPrice: input.minPrice !== null ? String(input.minPrice) : null,
        maxPrice: input.maxPrice !== null ? String(input.maxPrice) : null,
        minLeadDays: input.minLeadDays,
        maxLeadDays: input.maxLeadDays,
        minOrderQuantity: input.minOrderQuantity !== null ? String(input.minOrderQuantity) : null,
        updatedAt: new Date(),
      };

      if (existing) {
        await db
          .update(supplierFilters)
          .set(values)
          .where(eq(supplierFilters.id, existing.id));
      } else {
        await db.insert(supplierFilters).values({ ...values, createdAt: new Date() });
      }

      return { success: true };
    }),
});
