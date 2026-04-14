import { z } from 'zod';
import { protectedProcedure, adminProcedure, router } from '../_core/trpc';

export const microsoftSubscriptionRouter = router({
  getMySubscription: protectedProcedure.query(async ({ ctx }) => {
    const { getUserSubscription } = await import('../microsoft-subscription-service');
    return await getUserSubscription(ctx.user.id);
  }),

  getMyTier: protectedProcedure.query(async ({ ctx }) => {
    const { getUserTier } = await import('../microsoft-subscription-service');
    return await getUserTier(ctx.user.id);
  }),

  checkAccess: protectedProcedure
    .input(z.object({ requiredTier: z.enum(['free', 'standard', 'premium']) }))
    .query(async ({ input, ctx }) => {
      const { userHasAccess } = await import('../microsoft-subscription-service');
      return await userHasAccess(ctx.user.id, input.requiredTier);
    }),

  getAllSubscriptions: adminProcedure.query(async () => {
    const { getAllSubscriptions } = await import('../microsoft-subscription-service');
    return await getAllSubscriptions();
  }),

  updateUserTier: adminProcedure
    .input(
      z.object({
        userId: z.number(),
        tier: z.enum(['free', 'standard', 'premium']),
      })
    )
    .mutation(async ({ input }) => {
      const { updateUserTier } = await import('../microsoft-subscription-service');
      return await updateUserTier(input.userId, input.tier);
    }),
});
