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

  // Upgrade to premium (placeholder - actual Stripe integration needed)
  upgradeToPremium: protectedProcedure
    .input(
      z.object({
        stripeSubscriptionId: z.string(),
        stripeCustomerId: z.string(),
        renewalDate: z.date(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const profile = await getSupplierProfile(ctx.user.id);
      if (!profile) throw new Error("Supplier profile not found");
      await upgradeToPremium(
        profile.id,
        input.stripeSubscriptionId,
        input.stripeCustomerId,
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
});
