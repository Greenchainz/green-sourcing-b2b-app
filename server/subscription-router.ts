import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import {
  getBuyerSubscription,
  createBuyerSubscription,
  upgradeBuyerSubscription,
  cancelBuyerSubscription,
  getSupplierSubscription,
  createSupplierSubscription,
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
  getSupplierSubscription: protectedProcedure
    .input(z.object({ supplierId: z.number() }))
    .query(async ({ input }) => {
      return await getSupplierSubscription(input.supplierId);
    }),

  getSupplierTierLimits: protectedProcedure
    .input(z.object({ supplierId: z.number() }))
    .query(async ({ input }) => {
      return await getSupplierTierLimits(input.supplierId);
    }),

  checkSupplierFeatureAccess: protectedProcedure
    .input(z.object({ supplierId: z.number(), feature: z.string() }))
    .query(async ({ input }) => {
      return await checkSupplierFeatureAccess(input.supplierId, input.feature as keyof typeof TIER_LIMITS["supplier"]["free"]["features"]);
    }),

  upgradeSupplierSubscription: protectedProcedure
    .input(
      z.object({
        supplierId: z.number(),
        tier: z.enum(["premium"]),
        msSubscriptionId: z.string().optional(),
        msPlanId: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await upgradeSupplierSubscription(
        input.supplierId,
        input.tier,
        input.msSubscriptionId
      );
    }),

  cancelSupplierSubscription: protectedProcedure
    .input(z.object({ supplierId: z.number() }))
    .mutation(async ({ input }) => {
      return await cancelSupplierSubscription(input.supplierId);
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
        supplierId: z.number(),
        dimension: supplierDimensionEnum,
        period: z.enum(["month", "all"]).default("month"),
      })
    )
    .query(async ({ input }) => {
      return await getSupplierUsage(input.supplierId);
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
          supplierId: z.number(),
          dimension: supplierDimensionEnum,
        }),
      ])
    )
    .query(async ({ ctx, input }) => {
      if (input.userType === "buyer") {
        return await checkBuyerUsageLimit(ctx.user.id, input.dimension);
      } else {
        return await checkSupplierUsageLimit(input.supplierId, input.dimension);
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
        supplierId: z.number(),
        dimension: supplierDimensionEnum,
        quantity: z.number().default(1),
      })
    )
    .mutation(async ({ input }) => {
      return await trackSupplierUsage(input.supplierId, input.dimension, input.quantity);
    }),
});
