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
} from "./subscription-service";
import {
  trackBuyerUsage,
  trackSupplierUsage,
  getBuyerUsage,
  getSupplierUsage,
  checkBuyerUsageLimit,
  checkSupplierUsageLimit,
} from "./usage-tracking-service";

export const subscriptionRouter = router({
  // Buyer subscription procedures
  getBuyerSubscription: protectedProcedure.query(async ({ ctx }: { ctx: any }) => {
    return await getBuyerSubscription(ctx.user.id);
  }),

  getBuyerTierLimits: protectedProcedure.query(async ({ ctx }: { ctx: any }) => {
    return await getBuyerTierLimits(ctx.user.id);
  }),

  checkBuyerFeatureAccess: protectedProcedure
    .input(z.object({ feature: z.string() }))
    .query(async ({ ctx, input }: { ctx: any; input: any }) => {
      return await checkBuyerFeatureAccess(ctx.user.id, input.feature);
    }),
  upgradeBuyerSubscription: protectedProcedure
    .input(
      z.object({
        tier: z.enum(["standard", "premium"]),
        msSubscriptionId: z.string().optional(),
        msPlanId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }: { ctx: { user: { id: number } }; input: any }) => {
      return await upgradeBuyerSubscription(
        ctx.user.id,
        input.tier,
        input.msSubscriptionId,
        input.msPlanId
      );
    }),

  cancelBuyerSubscription: protectedProcedure.mutation(async ({ ctx }: { ctx: any }) => {
    return await cancelBuyerSubscription(ctx.user.id);
  }),

  // Supplier subscription procedures
  getSupplierSubscription: protectedProcedure
    .input(z.object({ supplierId: z.number() }))
    .query(async ({ input }: { input: { supplierId: number } }) => {
      return await getSupplierSubscription(input.supplierId);
    }),

  getSupplierTierLimits: protectedProcedure
    .input(z.object({ supplierId: z.number() }))
    .query(async ({ input }: { input: { supplierId: number } }) => {
      return await getSupplierTierLimits(input.supplierId);
    }),

  checkSupplierFeatureAccess: protectedProcedure
    .input(z.object({ supplierId: z.number(), feature: z.string() }))
    .query(async ({ input }: { input: any }) => {
      return await checkSupplierFeatureAccess(input.supplierId, input.feature);
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
    .mutation(async ({ input }: { input: any }) => {
      return await upgradeSupplierSubscription(
        input.supplierId,
        input.tier,
        input.msSubscriptionId
      );
    }),

  cancelSupplierSubscription: protectedProcedure
    .input(z.object({ supplierId: z.number() }))
    .mutation(async ({ input }: { input: any }) => {
      return await cancelSupplierSubscription(input.supplierId);
    }),

  // Usage tracking procedures
  getBuyerUsage: protectedProcedure
    .input(
      z.object({
        dimension: z.enum([
          "rfq_submissions",
          "ai_queries",
          "swap_analyses",
          "ccps_exports",
          "material_comparisons",
        ]),
        period: z.enum(["month", "all"]).default("month"),
      })
    )
    .query(async ({ ctx }: { ctx: any }) => {
      return await getBuyerUsage(ctx.user.id);
    }),

  getSupplierUsage: protectedProcedure
    .input(
      z.object({
        supplierId: z.number(),
        dimension: z.enum(["bids_submitted", "message_threads"]),
        period: z.enum(["month", "all"]).default("month"),
      })
    )
    .query(async ({ input }: { input: any }) => {
      return await getSupplierUsage(input.supplierId);
    }),

  checkUsageLimit: protectedProcedure
    .input(
      z.object({
        userType: z.enum(["buyer", "supplier"]),
        dimension: z.string(),
        supplierId: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }: { ctx: any; input: any }) => {
      if (input.userType === "buyer") {
        return await checkBuyerUsageLimit(
          ctx.user.id,
          input.dimension as any
        );
      } else {
        if (!input.supplierId) {
          throw new Error("supplierId required for supplier usage check");
        }
        return await checkSupplierUsageLimit(
          input.supplierId,
          input.dimension as any
        );
      }
    }),
  trackBuyerUsage: protectedProcedure
    .input(
      z.object({
        dimension: z.enum([
          "rfq_submissions",
          "ai_queries",
          "swap_analyses",
          "ccps_exports",
          "material_comparisons",
        ]),
        quantity: z.number().default(1),
      })
    )
    .mutation(async ({ ctx, input }: { ctx: { user: { id: number } }; input: any }) => {
      return await trackBuyerUsage(
        ctx.user.id,
        input.dimension,
        input.quantity
      );
    }),

  trackSupplierUsage: protectedProcedure
    .input(
      z.object({
        supplierId: z.number(),
        dimension: z.enum(["bids_submitted", "message_threads"]),
        quantity: z.number().default(1),
      })
    )
    .mutation(async ({ input }: { input: any }) => {
      return await trackSupplierUsage(
        input.supplierId,
        input.dimension,
        input.quantity
      );
    }),
});
