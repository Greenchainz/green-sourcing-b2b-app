import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { suppliers } from "../drizzle/schema";
import {
  getBuyerSubscription,
  upgradeBuyerSubscription,
  cancelBuyerSubscription,
  getSupplierSubscription,
  upgradeSupplierSubscription,
  cancelSupplierSubscription,
  checkBuyerFeatureAccess,
  checkSupplierFeatureAccess,
  getBuyerTierLimits,
  getSupplierTierLimits,
  TIER_LIMITS,
} from "./subscription-service";
import {
  trackBuyerUsage,
  trackSupplierUsage,
  getBuyerUsage,
  getSupplierUsage,
  checkBuyerUsageLimit,
  checkSupplierUsageLimit,
} from "./usage-tracking-service";

// ─── Dimension enums — must match usage-tracking-service.ts exactly ────────────
const buyerDimensionEnum = z.enum([
  "rfq_submission",
  "ai_query",
  "swap_analysis",
  "ccps_export",
  "material_comparison",
]);

const supplierDimensionEnum = z.enum(["bid_submission", "message_thread"]);

// Resolve the supplier record owned by the authenticated user.
// Object-level authZ: callers may only act on their OWN supplier subscription;
// client-supplied supplierId is never trusted (mirrors supplier-router.ts).
async function resolveOwnSupplierId(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const [supplier] = await db
    .select({ id: suppliers.id })
    .from(suppliers)
    .where(eq(suppliers.userId, userId))
    .limit(1);

  if (!supplier) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "No supplier profile is associated with this account",
    });
  }

  return supplier.id;
}

// ─── Router ─────────────────────────────────────────────────────────────────────
export const subscriptionRouter = router({
  // Buyer subscription procedures
  getBuyerSubscription: protectedProcedure.query(async ({ ctx }) => {
    return await getBuyerSubscription(ctx.user.id);
  }),

  getBuyerTierLimits: protectedProcedure.query(async ({ ctx }) => {
    return await getBuyerTierLimits(ctx.user.id);
  }),

  checkBuyerFeatureAccess: protectedProcedure
    .input(z.object({ feature: z.string() }))
    .query(async ({ ctx, input }) => {
      return await checkBuyerFeatureAccess(ctx.user.id, input.feature as keyof typeof TIER_LIMITS["buyer"]["free"]["features"]);
    }),

  upgradeBuyerSubscription: protectedProcedure
    .input(
      z.object({
        tier: z.enum(["standard", "premium"]),
        msSubscriptionId: z.string().optional(),
        msPlanId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await upgradeBuyerSubscription(
        ctx.user.id,
        input.tier,
        input.msSubscriptionId,
        input.msPlanId
      );
    }),

  cancelBuyerSubscription: protectedProcedure.mutation(async ({ ctx }) => {
    return await cancelBuyerSubscription(ctx.user.id);
  }),

  // Supplier subscription procedures
  // supplierId is ALWAYS resolved from ctx.user.id — never trust client input.
  getSupplierSubscription: protectedProcedure
    .query(async ({ ctx }) => {
      const supplierId = await resolveOwnSupplierId(ctx.user.id);
      return await getSupplierSubscription(supplierId);
    }),

  getSupplierTierLimits: protectedProcedure
    .query(async ({ ctx }) => {
      const supplierId = await resolveOwnSupplierId(ctx.user.id);
      return await getSupplierTierLimits(supplierId);
    }),

  checkSupplierFeatureAccess: protectedProcedure
    .input(z.object({ feature: z.string() }))
    .query(async ({ ctx, input }) => {
      const supplierId = await resolveOwnSupplierId(ctx.user.id);
      return await checkSupplierFeatureAccess(supplierId, input.feature as keyof typeof TIER_LIMITS["supplier"]["free"]["features"]);
    }),

  upgradeSupplierSubscription: protectedProcedure
    .input(
      z.object({
        tier: z.enum(["premium"]),
        msSubscriptionId: z.string().optional(),
        msPlanId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const supplierId = await resolveOwnSupplierId(ctx.user.id);
      return await upgradeSupplierSubscription(
        supplierId,
        input.tier,
        input.msSubscriptionId
      );
    }),

  cancelSupplierSubscription: protectedProcedure
    .mutation(async ({ ctx }) => {
      const supplierId = await resolveOwnSupplierId(ctx.user.id);
      return await cancelSupplierSubscription(supplierId);
    }),

  // Usage tracking procedures
  getBuyerUsage: protectedProcedure
    .input(
      z.object({
        dimension: buyerDimensionEnum,
        period: z.enum(["month", "all"]).default("month"),
      })
    )
    .query(async ({ ctx }) => {
      return await getBuyerUsage(ctx.user.id);
    }),

  getSupplierUsage: protectedProcedure
    .input(
      z.object({
        dimension: supplierDimensionEnum,
        period: z.enum(["month", "all"]).default("month"),
      })
    )
    .query(async ({ ctx }) => {
      const supplierId = await resolveOwnSupplierId(ctx.user.id);
      return await getSupplierUsage(supplierId);
    }),

  checkUsageLimit: protectedProcedure
    .input(
      z.discriminatedUnion("userType", [
        z.object({
          userType: z.literal("buyer"),
          dimension: buyerDimensionEnum,
        }),
        z.object({
          userType: z.literal("supplier"),
          dimension: supplierDimensionEnum,
        }),
      ])
    )
    .query(async ({ ctx, input }) => {
      if (input.userType === "buyer") {
        return await checkBuyerUsageLimit(ctx.user.id, input.dimension);
      } else {
        const supplierId = await resolveOwnSupplierId(ctx.user.id);
        return await checkSupplierUsageLimit(supplierId, input.dimension);
      }
    }),

  trackBuyerUsage: protectedProcedure
    .input(
      z.object({
        dimension: buyerDimensionEnum,
        quantity: z.number().default(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await trackBuyerUsage(ctx.user.id, input.dimension, input.quantity);
    }),

  trackSupplierUsage: protectedProcedure
    .input(
      z.object({
        dimension: supplierDimensionEnum,
        quantity: z.number().default(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const supplierId = await resolveOwnSupplierId(ctx.user.id);
      return await trackSupplierUsage(supplierId, input.dimension, input.quantity);
    }),
});
