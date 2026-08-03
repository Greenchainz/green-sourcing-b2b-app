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

  // White-glove upgrade: emails the founder to invoice the user (wire, card,
  // or AppSource); an admin then activates the tier via updateUserTier.
  requestUpgrade: protectedProcedure
    .input(
      z.object({
        tier: z.enum(['standard', 'premium']),
        note: z.string().max(2000).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { requestTierUpgrade } = await import('../microsoft-subscription-service');
      return await requestTierUpgrade({
        userId: ctx.user.id,
        userName: ctx.user.name ?? null,
        userEmail: ctx.user.email ?? null,
        requestedTier: input.tier,
        note: input.note,
      });
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
