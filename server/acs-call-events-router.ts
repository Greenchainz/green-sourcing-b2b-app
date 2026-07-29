/**
 * ACS Call Automation webhook handler.
 *
 * ACS posts call lifecycle events (CallConnected, CallDisconnected, etc.) to
 * /api/acs/call-events. When a call we placed connects, we immediately play
 * the queued TTS SSML, then hang up when it finishes.
 *
 * Route: POST /api/acs/call-events
 * Auth: none (ACS events are unsigned — we guard via obscure callback path only).
 */

import { Router } from 'express';
import { CallAutomationClient, TextSource, SsmlSource } from '@azure/communication-call-automation';
import { getAzureCredential } from '../lib/azure/credentials';
import { getPendingTts, deletePendingTts, buildSsml, DEFAULT_VOICE } from './acs-tts-service';

let _callClient: CallAutomationClient | null = null;

function getCallClient(): CallAutomationClient {
  if (!_callClient) {
    const endpoint =
      process.env.AZURE_COMMUNICATION_SERVICES_ENDPOINT ||
      process.env.ACS_ENDPOINT_URL ||
      '';
    const connectionString = process.env.AZURE_COMMUNICATION_SERVICES_CONNECTION_STRING;

    if (connectionString) {
      _callClient = new CallAutomationClient(connectionString);
    } else if (endpoint) {
      _callClient = new CallAutomationClient(endpoint, getAzureCredential());
    } else {
      throw new Error('ACS not configured for call events handler');
    }
  }
  return _callClient;
}

export const acsCallEventsRouter = Router();

acsCallEventsRouter.post('/api/acs/call-events', async (req, res) => {
  // Respond 200 immediately so ACS doesn't retry
  res.status(200).json({ received: true });

  const events: Array<{ type: string; data: Record<string, unknown> }> = Array.isArray(req.body)
    ? req.body
    : [req.body];

  for (const event of events) {
    const eventType: string = (event.type as string) ?? (event as unknown as Record<string, string>).eventType ?? '';
    const callConnectionId: string =
      (event.data?.callConnectionId as string) ?? '';

    console.log(`[ACS CallEvents] ${eventType} — connectionId: ${callConnectionId}`);

    if (eventType === 'Microsoft.Communication.CallConnected' && callConnectionId) {
      const pending = getPendingTts(callConnectionId);
      if (!pending) {
        console.warn(`[ACS CallEvents] No pending TTS for ${callConnectionId} — hanging up`);
        try {
          const client = getCallClient();
          const conn = client.getCallConnection(callConnectionId);
          await conn.hangUp(true);
        } catch (e) {
          console.error('[ACS CallEvents] hangup error:', e);
        }
        continue;
      }

      try {
        const client = getCallClient();
        const conn = client.getCallConnection(callConnectionId);
        const media = conn.getCallMedia();

        const ssml = buildSsml(pending.text, pending.voice ?? DEFAULT_VOICE);
        const source: SsmlSource = { ssmlText: ssml, kind: 'ssmlSource' };

        await media.playToAll([source], {
          operationContext: `tts-${callConnectionId}`,
        });

        deletePendingTts(callConnectionId);
        console.log(`[ACS CallEvents] ▶ Playing TTS on ${callConnectionId}`);
      } catch (e) {
        console.error(`[ACS CallEvents] ❌ play failed on ${callConnectionId}:`, e);
      }
    }

    // Hang up cleanly after playback completes
    if (
      (eventType === 'Microsoft.Communication.PlayCompleted' ||
        eventType === 'Microsoft.Communication.PlayFailed') &&
      callConnectionId
    ) {
      try {
        const client = getCallClient();
        const conn = client.getCallConnection(callConnectionId);
        await conn.hangUp(true);
        console.log(`[ACS CallEvents] 📵 Hung up ${callConnectionId} after TTS`);
      } catch (e) {
        console.error('[ACS CallEvents] hangup error:', e);
      }
    }
  }
});
