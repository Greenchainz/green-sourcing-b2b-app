/**
 * Azure Communication Services Video Calling Service
 * Enterprise-grade video for Premium tier subscribers
 *
 * Features:
 * - HD video quality
 * - Call recording capability
 * - Group video calls
 * - Better reliability and global infrastructure
 *
 * Note: Requires Azure Communication Services credentials
 * Set these environment variables:
 * - Preferred: AZURE_COMMUNICATION_SERVICES_ENDPOINT (+ managed identity)
 * - Fallback: AZURE_COMMUNICATION_SERVICES_CONNECTION_STRING
 */

import { randomBytes } from "node:crypto";
import { broadcastNotification } from "./webpubsub-manager";
import { createDistributedCallSessionStore } from "./services/distributed-call-session-store";

export interface ACSVideoCallSession {
  callId: string;
  acsCallId?: string; // Azure Communication Services call ID
  callerId: number;
  calleeId: number;
  conversationId: number;
  startedAt: Date;
  endedAt?: Date;
  durationMinutes?: number;
  status: "ringing" | "active" | "ended" | "rejected";
  recordingEnabled?: boolean;
}

const acsCallSessionStore =
  createDistributedCallSessionStore<ACSVideoCallSession>("acs-video");

/**
 * Check if Azure Communication Services is configured
 */
export function isACSConfigured(): boolean {
  const endpoint =
    process.env.AZURE_COMMUNICATION_SERVICES_ENDPOINT ||
    process.env.ACS_ENDPOINT_URL;
  const connectionString =
    process.env.AZURE_COMMUNICATION_SERVICES_CONNECTION_STRING;
  const isProduction = process.env.NODE_ENV === "production";
  const allowConnectionStringInProd =
    process.env.ALLOW_ACS_CONNECTION_STRING_IN_PROD === "true";

  if (endpoint) return true;
  if (connectionString) {
    return !isProduction || allowConnectionStringInProd;
  }
  return false;
}

/**
 * Get ACS user access token
 * This token is used by the client to connect to Azure Communication Services
 */
export async function getACSUserToken(
  _userId: number
): Promise<
  { token: string; userId: string } | { success: false; error: string }
> {
  if (!isACSConfigured()) {
    return {
      success: false,
      error:
        "Video calling is launching soon. Contact support@greenchainz.com to be notified.",
    };
  }

  // ACS token generation requires @azure/communication-identity.
  // Install it and implement this before enabling video calling.
  return {
    success: false,
    error:
      "Video calling is launching soon. Contact support@greenchainz.com to be notified.",
  };
}

export type ACSVideoCallResult =
  | ACSVideoCallSession
  | { success: false; error: string };

/**
 * Initiate an ACS video call.
 * Returns a structured error instead of throwing when ACS is not yet configured,
 * so callers always get a usable response rather than a 500.
 */
export async function initiateACSVideoCall(params: {
  callerId: number;
  calleeId: number;
  conversationId: number;
  recordingEnabled?: boolean;
}): Promise<ACSVideoCallResult> {
  const {
    callerId,
    calleeId,
    conversationId,
    recordingEnabled = false,
  } = params;

  if (!isACSConfigured()) {
    return {
      success: false,
      error:
        "Video calling is launching soon. Contact support@greenchainz.com to be notified.",
    };
  }

  const callId = `acs-call-${Date.now()}-${randomBytes(4).toString("hex")}`;

  const session: ACSVideoCallSession = {
    callId,
    callerId,
    calleeId,
    conversationId,
    startedAt: new Date(),
    status: "ringing",
    recordingEnabled,
  };

  await acsCallSessionStore.set(callId, session, [callerId, calleeId]);

  // Notify callee via Web PubSub
  await broadcastNotification(calleeId, {
    type: "acs_video_call_incoming",
    callId,
    callerId,
    conversationId,
    isPremium: true,
    recordingEnabled,
  });

  return session;
}

/**
 * Accept an ACS video call
 */
export async function acceptACSVideoCall(
  callId: string
): Promise<ACSVideoCallSession | null> {
  const session = await acsCallSessionStore.get(callId);
  if (!session) return null;

  session.status = "active";
  await acsCallSessionStore.set(callId, session, [
    session.callerId,
    session.calleeId,
  ]);

  // Notify caller that call was accepted
  await broadcastNotification(session.callerId, {
    type: "acs_video_call_accepted",
    callId,
    calleeId: session.calleeId,
  });

  return session;
}

/**
 * End an ACS video call and track duration
 */
export async function endACSVideoCall(params: {
  callId: string;
  userId: number;
}): Promise<{ durationMinutes: number } | null> {
  const { callId, userId } = params;
  const session = await acsCallSessionStore.get(callId);

  if (!session) return null;

  session.status = "ended";
  session.endedAt = new Date();

  // Calculate duration in minutes
  const durationMs = session.endedAt.getTime() - session.startedAt.getTime();
  const durationMinutes = Math.ceil(durationMs / 60000); // Round up to nearest minute
  session.durationMinutes = durationMinutes;

  await acsCallSessionStore.set(
    callId,
    session,
    [session.callerId, session.calleeId],
    60
  );

  // Notify other participant
  const otherUserId =
    userId === session.callerId ? session.calleeId : session.callerId;
  await broadcastNotification(otherUserId, {
    type: "acs_video_call_ended",
    callId,
    durationMinutes,
  });

  // Track usage for paywall (only for the caller, not callee)
  if (userId === session.callerId) {
    const { trackVideoUsage } = await import("./messaging-paywall");
    await trackVideoUsage(userId, durationMinutes);
  }

  await acsCallSessionStore.delete(callId);

  return { durationMinutes };
}

/**
 * Get active ACS call session
 */
export async function getACSCallSession(
  callId: string
): Promise<ACSVideoCallSession | null> {
  return await acsCallSessionStore.get(callId);
}

/**
 * Start call recording (Premium feature)
 */
export async function startCallRecording(
  callId: string
): Promise<{ recordingId: string } | { success: false; error: string }> {
  const session = await acsCallSessionStore.get(callId);
  if (!session) {
    return {
      success: false,
      error:
        "Video calling is launching soon. Contact support@greenchainz.com to be notified.",
    };
  }

  // ACS call recording requires @azure/communication-call-automation.
  // Install it and implement this before enabling recording.
  return {
    success: false,
    error:
      "Video calling is launching soon. Contact support@greenchainz.com to be notified.",
  };
}

/**
 * Stop call recording
 */
export async function stopCallRecording(
  callId: string,
  _recordingId: string
): Promise<void | { success: false; error: string }> {
  const session = await acsCallSessionStore.get(callId);
  if (!session) {
    return {
      success: false,
      error:
        "Video calling is launching soon. Contact support@greenchainz.com to be notified.",
    };
  }

  // ACS call recording stop requires @azure/communication-call-automation.
  return {
    success: false,
    error:
      "Video calling is launching soon. Contact support@greenchainz.com to be notified.",
  };
}
