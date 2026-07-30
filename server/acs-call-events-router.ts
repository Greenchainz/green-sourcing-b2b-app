/**
 * ACS Call Automation webhook handler.
 *
 * ACS posts call lifecycle events (CallConnected, CallDisconnected, etc.) to
 * /api/acs/call-events. When a call we placed connects, we immediately play
 * the queued TTS SSML, then hang up when it finishes.
 *
 * Route: POST /api/acs/call-events
 * Auth: shared callback secret (query/header token check).
 */

import { Router } from 'express';
import { CallAutomationClient, SsmlSource } from '@azure/communication-call-automation';
import { getAzureCredential } from '../lib/azure/credentials';
import { getAcsConnectionSettings, isValidAcsCallbackToken } from './acs-config';
import { getPendingTts, deletePendingTts, buildSsml, DEFAULT_VOICE } from './acs-tts-service';

let _callClient: CallAutomationClient | null = null;

function getCallClient(): CallAutomationClient {
  if (!_callClient) {
    const { endpoint, connectionString } = getAcsConnectionSettings('ACS Call Events');
    if (endpoint && !connectionString) {
      _callClient = new CallAutomationClient(endpoint, getAzureCredential());
    } else if (connectionString) {
      _callClient = new CallAutomationClient(connectionString);
    } else {
      throw new Error('ACS Call Events is not configured.');
    }
  }
  return _callClient;
}

export const acsCallEventsRouter = Router();

acsCallEventsRouter.post('/api/acs/call-events', async (req, res) => {
  if (!isValidAcsCallbackToken(req.query.acsToken, req.header('x-acs-callback-token'))) {
    res.status(401).json({ error: 'Unauthorized callback' });
    return;
  }

  const events: Array<{ type: string; data: Record<string, unknown> }> = Array.isArray(req.body)
    ? req.body
    : [req.body];
  let hadProcessingFailure = false;

  for (const event of events) {
    if (!event || typeof event !== 'object') {
      continue;
    }

    const eventType: string = (event.type as string) ?? (event as unknown as Record<string, string>).eventType ?? '';
    const callConnectionId: string =
      (event.data?.callConnectionId as string) ?? '';
    const operationContext: string = (event.data?.operationContext as string) ?? '';
    const pendingTtsKey = operationContext || callConnectionId;

    console.log(`[ACS CallEvents] ${eventType} — connectionId: ${callConnectionId} — operationContext: ${operationContext}`);

    if (eventType === 'Microsoft.Communication.CallConnected' && callConnectionId) {
      const pending = pendingTtsKey ? await getPendingTts(pendingTtsKey) : null;
      if (!pending) {
        console.warn(`[ACS CallEvents] No pending TTS for ${callConnectionId} — hanging up`);
        try {
          const client = getCallClient();
          const conn = client.getCallConnection(callConnectionId);
          await conn.hangUp(true);
        } catch (e) {
          hadProcessingFailure = true;
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

        if (pendingTtsKey) {
          await deletePendingTts(pendingTtsKey);
        }
        console.log(`[ACS CallEvents] ▶ Playing TTS on ${callConnectionId}`);
      } catch (e) {
        hadProcessingFailure = true;
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
        hadProcessingFailure = true;
        console.error('[ACS CallEvents] hangup error:', e);
      }
    }
  }

  if (hadProcessingFailure) {
    res.status(500).json({ error: 'Failed to process one or more ACS events' });
    return;
  }

  res.status(200).json({ ok: true });
});
