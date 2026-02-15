import { videoCalls } from '../drizzle/schema';
import { eq } from 'drizzle-orm';
import type { MySql2Database } from 'drizzle-orm/mysql2';

let db: MySql2Database<Record<string, unknown>> | null = null;

// Initialize db connection
export function setDb(database: MySql2Database<Record<string, unknown>>) {
  db = database;
}

export interface VideoCallSignal {
  type: 'offer' | 'answer' | 'ice-candidate';
  from: string;
  to: string;
  data: any;
  timestamp: number;
}

// Store active video calls in memory
const activeCallsMap = new Map<string, {
  callerId: number;
  calleeId: number;
  startedAt: number;
  status: 'initiated' | 'ringing' | 'connected' | 'ended' | 'failed';
}>();

/**
 * Initiate a video call
 */
export async function initiateVideoCall(callerId: number, calleeId: number, conversationId: number) {
  const callId = `${callerId}-${calleeId}-${Date.now()}`;

  activeCallsMap.set(callId, {
    callerId,
    calleeId,
    startedAt: Date.now(),
    status: 'initiated',
  });

  // Store in database
  if (db) {
    try {
      await (db as any).insert(videoCalls).values({
        callId,
        callerId,
        calleeId,
        conversationId,
        status: 'initiated',
        startedAt: new Date(),
      });
    } catch (err: any) {
      console.error('[VideoCall] DB insert error:', err);
    }
  }

  return {
    callId,
    callerId,
    calleeId,
    status: 'initiated',
  };
}

/**
 * Ring a video call (notify recipient)
 */
export async function ringVideoCall(callId: string) {
  const call = activeCallsMap.get(callId);
  if (!call) {
    throw new Error('Call not found');
  }

  call.status = 'ringing';

  if (db) {
    try {
      await (db as any).update(videoCalls)
        .set({ status: 'ringing' })
        .where(eq(videoCalls.callId, callId));
    } catch (err: any) {
      console.error('[VideoCall] DB update error:', err);
    }
  }

  return { callId, status: 'ringing' };
}

/**
 * Accept a video call
 */
export async function acceptVideoCall(callId: string) {
  const call = activeCallsMap.get(callId);
  if (!call) {
    throw new Error('Call not found');
  }

  call.status = 'connected';

  if (db) {
    try {
      await (db as any).update(videoCalls)
        .set({ status: 'connected' })
        .where(eq(videoCalls.callId, callId));
    } catch (err: any) {
      console.error('[VideoCall] DB update error:', err);
    }
  }

  return { callId, status: 'connected' };
}

/**
 * End a video call
 */
export async function endVideoCall(callId: string) {
  const call = activeCallsMap.get(callId);
  if (!call) {
    throw new Error('Call not found');
  }

  const duration = Date.now() - call.startedAt;
  activeCallsMap.delete(callId);

  if (db) {
    try {
      await (db as any).update(videoCalls)
        .set({ 
          status: 'ended', 
          endedAt: new Date(),
          durationSeconds: Math.floor(duration / 1000),
        })
        .where(eq(videoCalls.callId, callId));
    } catch (err: any) {
      console.error('[VideoCall] DB update error:', err);
    }
  }

  return { callId, status: 'ended', durationSeconds: Math.floor(duration / 1000) };
}

/**
 * Fail a video call
 */
export async function failVideoCall(callId: string) {
  activeCallsMap.delete(callId);

  if (db) {
    try {
      await (db as any).update(videoCalls)
        .set({ status: 'failed', endedAt: new Date() })
        .where(eq(videoCalls.callId, callId));
    } catch (err: any) {
      console.error('[VideoCall] DB update error:', err);
    }
  }

  return { callId, status: 'failed' };
}

/**
 * Get active call status
 */
export function getCallStatus(callId: string) {
  return activeCallsMap.get(callId) || null;
}

/**
 * Get all active calls for a user
 */
export function getUserActiveCalls(userId: number) {
  const calls = Array.from(activeCallsMap.entries())
    .filter(([, call]) => call.callerId === userId || call.calleeId === userId)
    .map(([callId, call]) => ({ callId, ...call }));

  return calls;
}

/**
 * Store ICE candidate for WebRTC signaling
 */
export async function storeIceCandidate(callId: string, from: number, candidate: any) {
  console.log(`[VideoCall] ICE candidate from ${from} for call ${callId}:`, candidate);
  
  // TODO: Implement proper signaling server or use WebPubSub to broadcast
  return { callId, stored: true };
}

/**
 * Store SDP offer for WebRTC signaling
 */
export async function storeSdpOffer(callId: string, from: number, offer: any) {
  console.log(`[VideoCall] SDP offer from ${from} for call ${callId}:`, offer);
  
  // TODO: Implement proper signaling server or use WebPubSub to broadcast
  return { callId, stored: true };
}

/**
 * Store SDP answer for WebRTC signaling
 */
export async function storeSdpAnswer(callId: string, from: number, answer: any) {
  console.log(`[VideoCall] SDP answer from ${from} for call ${callId}:`, answer);
  
  // TODO: Implement proper signaling server or use WebPubSub to broadcast
  return { callId, stored: true };
}
