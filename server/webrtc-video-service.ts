import { broadcastNotification } from "./webpubsub-manager";

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

// In-memory store for active video call sessions
// In production, this should be in Redis or database
const activeCalls = new Map<string, VideoCallSession>();

/**
 * Initiate a video call
 */
export async function initiateVideoCall(params: {
  callerId: number;
  calleeId: number;
  conversationId: number;
}): Promise<VideoCallSession> {
  const { callerId, calleeId, conversationId } = params;

  const callId = `call-${Date.now()}-${Math.random().toString(36).substring(7)}`;

  const session: VideoCallSession = {
    callId,
    callerId,
    calleeId,
    conversationId,
    startedAt: new Date(),
    status: "ringing",
  };

  activeCalls.set(callId, session);

  // Notify callee via Web PubSub
  await broadcastNotification(calleeId, {
    type: "video_call_incoming",
    callId,
    callerId,
    conversationId,
  });

  return session;
}

/**
 * Accept a video call
 */
export async function acceptVideoCall(callId: string): Promise<VideoCallSession | null> {
  const session = activeCalls.get(callId);
  if (!session) return null;

  session.status = "active";
  activeCalls.set(callId, session);

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
  const session = activeCalls.get(callId);
  if (!session) return;

  session.status = "rejected";
  session.endedAt = new Date();
  activeCalls.set(callId, session);

  // Notify caller that call was rejected
  await broadcastNotification(session.callerId, {
    type: "video_call_rejected",
    callId,
  });

  // Clean up after 1 minute
  setTimeout(() => activeCalls.delete(callId), 60000);
}

/**
 * End a video call and track duration
 */
export async function endVideoCall(params: {
  callId: string;
  userId: number;
}): Promise<{ durationMinutes: number } | null> {
  const { callId, userId } = params;
  const session = activeCalls.get(callId);
  
  if (!session) return null;

  session.status = "ended";
  session.endedAt = new Date();

  // Calculate duration in minutes
  const durationMs = session.endedAt.getTime() - session.startedAt.getTime();
  const durationMinutes = Math.ceil(durationMs / 60000); // Round up to nearest minute
  session.durationMinutes = durationMinutes;

  activeCalls.set(callId, session);

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

  // Clean up after 1 minute
  setTimeout(() => activeCalls.delete(callId), 60000);

  return { durationMinutes };
}

/**
 * Get active call session
 */
export function getCallSession(callId: string): VideoCallSession | null {
  return activeCalls.get(callId) || null;
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
