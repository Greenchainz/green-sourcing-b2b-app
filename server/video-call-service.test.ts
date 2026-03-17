import { describe, it, expect, beforeEach } from 'vitest';
import {
  initiateVideoCall,
  ringVideoCall,
  acceptVideoCall,
  endVideoCall,
  failVideoCall,
  getCallStatus,
  getUserActiveCalls,
} from './video-call-service';

describe('VideoCallService', () => {
  const callerId = 1;
  const calleeId = 2;
  const conversationId = 100;

  describe('initiateVideoCall', () => {
    it('should create a new video call', async () => {
      const result = await initiateVideoCall(callerId, calleeId, conversationId);

      expect(result.callId).toBeDefined();
      expect(result.callerId).toBe(callerId);
      expect(result.calleeId).toBe(calleeId);
      expect(result.status).toBe('initiated');
    });

    it('should store call in active calls map', async () => {
      const result = await initiateVideoCall(callerId, calleeId, conversationId);
      const status = getCallStatus(result.callId);

      expect(status).toBeDefined();
      expect(status?.callerId).toBe(callerId);
      expect(status?.calleeId).toBe(calleeId);
      expect(status?.status).toBe('initiated');
    });
  });

  describe('ringVideoCall', () => {
    it('should update call status to ringing', async () => {
      const initResult = await initiateVideoCall(callerId, calleeId, conversationId);
      const ringResult = await ringVideoCall(initResult.callId);

      expect(ringResult.status).toBe('ringing');
      expect(getCallStatus(initResult.callId)?.status).toBe('ringing');
    });

    it('should throw error for non-existent call', async () => {
      await expect(ringVideoCall('non-existent-call')).rejects.toThrow('Call not found');
    });
  });

  describe('acceptVideoCall', () => {
    it('should update call status to connected', async () => {
      const initResult = await initiateVideoCall(callerId, calleeId, conversationId);
      const acceptResult = await acceptVideoCall(initResult.callId);

      expect(acceptResult.status).toBe('connected');
      expect(getCallStatus(initResult.callId)?.status).toBe('connected');
    });

    it('should throw error for non-existent call', async () => {
      await expect(acceptVideoCall('non-existent-call')).rejects.toThrow('Call not found');
    });
  });

  describe('endVideoCall', () => {
    it('should end call and calculate duration', async () => {
      const initResult = await initiateVideoCall(callerId, calleeId, conversationId);
      
      // Wait a bit to get measurable duration
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const endResult = await endVideoCall(initResult.callId);

      expect(endResult.status).toBe('ended');
      expect(endResult.durationSeconds).toBeGreaterThanOrEqual(0);
      expect(getCallStatus(initResult.callId)).toBeNull();
    });

    it('should throw error for non-existent call', async () => {
      await expect(endVideoCall('non-existent-call')).rejects.toThrow('Call not found');
    });
  });

  describe('failVideoCall', () => {
    it('should mark call as failed', async () => {
      const initResult = await initiateVideoCall(callerId, calleeId, conversationId);
      const failResult = await failVideoCall(initResult.callId);

      expect(failResult.status).toBe('failed');
      expect(getCallStatus(initResult.callId)).toBeNull();
    });
  });

  describe('getUserActiveCalls', () => {
    it('should return active calls for a user', async () => {
      const call1 = await initiateVideoCall(callerId, calleeId, conversationId);
      const call2 = await initiateVideoCall(callerId, 3, conversationId);

      const activeCalls = getUserActiveCalls(callerId);

      expect(activeCalls.length).toBeGreaterThanOrEqual(2);
      expect(activeCalls.some((c: any) => c.callId === call1.callId)).toBe(true);
      expect(activeCalls.some((c: any) => c.callId === call2.callId)).toBe(true);
    });

    it('should return empty array for user with no active calls', () => {
      const activeCalls = getUserActiveCalls(999);
      expect(activeCalls.length).toBe(0);
    });

    it('should include calls where user is callee', async () => {
      const call = await initiateVideoCall(callerId, calleeId, conversationId);
      const activeCalls = getUserActiveCalls(calleeId);

      expect(activeCalls.length).toBeGreaterThanOrEqual(1);
      expect(activeCalls.some((c: any) => c.callId === call.callId)).toBe(true);
    });
  });

  describe('call state transitions', () => {
    it('should handle full call lifecycle', async () => {
      // Initiate
      const initResult = await initiateVideoCall(callerId, calleeId, conversationId);
      expect(getCallStatus(initResult.callId)?.status).toBe('initiated');

      // Ring
      await ringVideoCall(initResult.callId);
      expect(getCallStatus(initResult.callId)?.status).toBe('ringing');

      // Accept
      await acceptVideoCall(initResult.callId);
      expect(getCallStatus(initResult.callId)?.status).toBe('connected');

      // End
      const endResult = await endVideoCall(initResult.callId);
      expect(endResult.status).toBe('ended');
      expect(getCallStatus(initResult.callId)).toBeNull();
    });
  });
});
