import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';

export const videoCallingRouter = router({
  // WebRTC procedures (Standard tier)
  initiateWebRTCCall: protectedProcedure
    .input(
      z.object({
        calleeId: z.number(),
        conversationId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { checkVideoLimit, checkOutboundCallPermission } = await import('../messaging-paywall');

      // Suppliers on free plan cannot initiate — inbound only
      const outboundCheck = await checkOutboundCallPermission(ctx.user.id);
      if (!outboundCheck.canCall) {
        throw new Error(outboundCheck.reason || 'Outbound calls require Professional plan');
      }

      // Check monthly minute limit
      const limitCheck = await checkVideoLimit(ctx.user.id);
      if (!limitCheck.canCall) {
        throw new Error(limitCheck.reason || 'Video calling limit reached');
      }

      const { initiateVideoCall } = await import('../webrtc-video-service');
      return await initiateVideoCall({
        callerId: ctx.user.id,
        calleeId: input.calleeId,
        conversationId: input.conversationId,
      });
    }),

  acceptWebRTCCall: protectedProcedure
    .input(z.object({ callId: z.string() }))
    .mutation(async ({ input }) => {
      const { acceptVideoCall } = await import('../webrtc-video-service');
      return await acceptVideoCall(input.callId);
    }),

  rejectWebRTCCall: protectedProcedure
    .input(z.object({ callId: z.string() }))
    .mutation(async ({ input }) => {
      const { rejectVideoCall } = await import('../webrtc-video-service');
      return await rejectVideoCall(input.callId);
    }),

  endWebRTCCall: protectedProcedure
    .input(z.object({ callId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { endVideoCall } = await import('../webrtc-video-service');
      return await endVideoCall({
        callId: input.callId,
        userId: ctx.user.id,
      });
    }),

  sendWebRTCSignal: protectedProcedure
    .input(
      z.object({
        callId: z.string(),
        recipientId: z.number(),
        type: z.enum(['offer', 'answer', 'ice-candidate']),
        data: z.any(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { sendSignalingData } = await import('../webrtc-video-service');
      return await sendSignalingData({
        callId: input.callId,
        senderId: ctx.user.id,
        recipientId: input.recipientId,
        type: input.type,
        data: input.data,
      });
    }),

  // Azure Communication Services procedures (Premium tier)
  getACSToken: protectedProcedure.query(async ({ ctx }) => {
    const { getACSUserToken } = await import('../acs-video-service');
    return await getACSUserToken(ctx.user.id);
  }),

  initiateACSCall: protectedProcedure
    .input(
      z.object({
        calleeId: z.number(),
        conversationId: z.number(),
        recordingEnabled: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { checkVideoLimit } = await import('../messaging-paywall');
      const limitCheck = await checkVideoLimit(ctx.user.id);

      if (!limitCheck.canCall) {
        throw new Error(limitCheck.reason || 'Video calling limit reached');
      }

      if (limitCheck.tier !== 'premium') {
        throw new Error('Azure Communication Services video calling is only available for Premium tier subscribers');
      }

      const { initiateACSVideoCall } = await import('../acs-video-service');
      return await initiateACSVideoCall({
        callerId: ctx.user.id,
        calleeId: input.calleeId,
        conversationId: input.conversationId,
        recordingEnabled: input.recordingEnabled,
      });
    }),

  acceptACSCall: protectedProcedure
    .input(z.object({ callId: z.string() }))
    .mutation(async ({ input }) => {
      const { acceptACSVideoCall } = await import('../acs-video-service');
      return await acceptACSVideoCall(input.callId);
    }),

  endACSCall: protectedProcedure
    .input(z.object({ callId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const { endACSVideoCall } = await import('../acs-video-service');
      return await endACSVideoCall({
        callId: input.callId,
        userId: ctx.user.id,
      });
    }),

  startRecording: protectedProcedure
    .input(z.object({ callId: z.string() }))
    .mutation(async ({ input }) => {
      const { startCallRecording } = await import('../acs-video-service');
      return await startCallRecording(input.callId);
    }),

  stopRecording: protectedProcedure
    .input(
      z.object({
        callId: z.string(),
        recordingId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const { stopCallRecording } = await import('../acs-video-service');
      return await stopCallRecording(input.callId, input.recordingId);
    }),
});
