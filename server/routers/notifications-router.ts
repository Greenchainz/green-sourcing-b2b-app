import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';

export const notificationsRouter = router({
  getUnread: protectedProcedure.query(async ({ ctx }) => {
    const { getUnreadNotifications } = await import('../notification-service');
    return getUnreadNotifications(ctx.user.id);
  }),

  getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
    const { getUnreadNotificationCount } = await import('../notification-service');
    return getUnreadNotificationCount(ctx.user.id);
  }),

  markAsRead: protectedProcedure
    .input(z.object({ notificationId: z.number() }))
    .mutation(async ({ input }) => {
      const { markNotificationAsRead } = await import('../notification-service');
      return markNotificationAsRead(input.notificationId);
    }),

  markAllAsRead: protectedProcedure
    .mutation(async ({ ctx }) => {
      const { markAllNotificationsAsRead } = await import('../notification-service');
      return markAllNotificationsAsRead(ctx.user.id);
    }),

  send: protectedProcedure
    .input(z.object({
      type: z.enum(['rfq_match', 'new_message', 'bid_accepted', 'bid_rejected', 'rfq_closed']),
      title: z.string(),
      content: z.string(),
      relatedId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { sendNotification } = await import('../notification-service');
      return sendNotification({
        ...input,
        userId: ctx.user.id,
        email: ctx.user.email ?? undefined,
      });
    }),
});
