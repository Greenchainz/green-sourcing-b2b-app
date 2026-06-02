import { broadcastNotification } from "./webpubsub-manager";
import { createDistributedCallSessionStore } from "./services/distributed-call-session-store";

/**
 * WebRTC Video Calling Service
 * Uses Web PubSub for signaling and WebRTC for peer-to-peer video
 */

export interface VideoCallSession {
  callId: string;
  callerId: number;
  calleeId: number;
  conversationId: number;
  startedAt: Date;
  endedAt?: Date;
  durationMinutes?: number;
  status: "ringing" | "active" | "ended" | "rejected";
}

const callSessionStore = createDistributedCallSessionStore<VideoCallSession>("webrtc-video");

/**
 * Initiate a video call
 */
export async function initiateVideoCall(params: {
  callerId: number;
  callerName: string;
  calleeId: number;
  conversationId: number;
}): Promise<VideoCallSession> {
  const { callerId, callerName, calleeId, conversationId } = params;

  const callId = `call-${Date.now()}-${Math.random().toString(36).substring(7)}`;

  const session: VideoCallSession = {
    callId,
    callerId,
    calleeId,
    conversationId,
    startedAt: new Date(),
    status: "ringing",
  };

  await callSessionStore.set(callId, session, [callerId, calleeId]);

  // Notify callee via Web PubSub
  await broadcastNotification(calleeId, {
    type: "video_call_incoming",
    callId,
    callerId,
    callerName,
    conversationId,
  });

  return session;
}

/**
 * Accept a video call
 */
export async function acceptVideoCall(callId: string): Promise<VideoCallSession | null> {
  const session = await callSessionStore.get(callId);
  if (!session) return null;

  session.status = "active";
  await callSessionStore.set(callId, session, [session.callerId, session.calleeId]);

  // Notify caller that call was accepted
  await broadcastNotification(session.callerId, {
    type: "video_call_accepted",
    callId,
    calleeId: session.calleeId,
  });

  return session;
}

/**
 * Reject a video call
 */
export async function rejectVideoCall(callId: string): Promise<void> {
  const session = await callSessionStore.get(callId);
  if (!session) return;

  session.status = "rejected";
  session.endedAt = new Date();
  await callSessionStore.set(callId, session, [session.callerId, session.calleeId], 60);

  // Notify caller that call was rejected
  await broadcastNotification(session.callerId, {
    type: "video_call_rejected",
    callId,
  });

  await callSessionStore.delete(callId);
}

/**
 * End a video call and track duration
 */
export async function endVideoCall(params: {
  callId: string;
  userId: number;
}): Promise<{ durationMinutes: number } | null> {
  const { callId, userId } = params;
  const session = await callSessionStore.get(callId);

  if (!session) return null;

  session.status = "ended";
  session.endedAt = new Date();

  // Calculate duration in minutes
  const durationMs = session.endedAt.getTime() - session.startedAt.getTime();
  const durationMinutes = Math.ceil(durationMs / 60000); // Round up to nearest minute
  session.durationMinutes = durationMinutes;

  await callSessionStore.set(callId, session, [session.callerId, session.calleeId], 60);

  // Notify other participant
  const otherUserId = userId === session.callerId ? session.calleeId : session.callerId;
  await broadcastNotification(otherUserId, {
    type: "video_call_ended",
    callId,
    durationMinutes,
  });

  // Track usage for paywall (only for the caller, not callee)
  if (userId === session.callerId) {
    const { trackVideoUsage } = await import("./messaging-paywall");
    await trackVideoUsage(userId, durationMinutes);
  }

  await callSessionStore.delete(callId);

  return { durationMinutes };
}

/**
 * Get active call session
 */
export async function getCallSession(callId: string): Promise<VideoCallSession | null> {
  return await callSessionStore.get(callId);
}

/**
 * Send WebRTC signaling data (offer, answer, ICE candidates)
 */
export async function sendSignalingData(params: {
  callId: string;
  senderId: number;
  recipientId: number;
  type: "offer" | "answer" | "ice-candidate";
  data: any;
}): Promise<void> {
  const { callId, senderId, recipientId, type, data } = params;

  await broadcastNotification(recipientId, {
    type: "webrtc_signaling",
    callId,
    senderId,
    signalType: type,
    signalData: data,
  });
}
