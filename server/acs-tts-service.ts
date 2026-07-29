/**
 * Azure Communication Services — Text-to-Speech outbound calls (Call Automation)
 *
 * Places an outbound call from the registered toll-free number to any E.164
 * phone, then reads a TTS message using Azure Neural voices. The call is
 * terminated automatically when the message finishes playing.
 *
 * Env vars required:
 *   AZURE_COMMUNICATION_SERVICES_ENDPOINT  (preferred, managed identity)
 *   AZURE_COMMUNICATION_SERVICES_CONNECTION_STRING  (local dev fallback)
 *   ACS_TOLL_FREE_NUMBER   e.g. +18332550000
 *   APP_BASE_URL           e.g. https://greenchainz.com  (callback base URL)
 *
 * Voice options for the GreenChainz agent persona:
 *   en-US-AriaNeural     — warm, conversational female (recommended default)
 *   en-US-GuyNeural      — clear, professional male
 *   en-US-JennyNeural    — friendly, approachable female
 *   en-US-DavisNeural    — confident, energetic male
 */

import { CallAutomationClient, CallInvite, SsmlSource } from '@azure/communication-call-automation';
import { PhoneNumberIdentifier } from '@azure/communication-common';
import { getAzureCredential } from '../lib/azure/credentials';

let _client: CallAutomationClient | null = null;

function getConnectionSettings(): { endpoint: string; connectionString?: string } {
  const endpoint =
    process.env.AZURE_COMMUNICATION_SERVICES_ENDPOINT ||
    process.env.ACS_ENDPOINT_URL ||
    '';
  const connectionString = process.env.AZURE_COMMUNICATION_SERVICES_CONNECTION_STRING;

  if (endpoint) return { endpoint, connectionString };

  if (connectionString) {
    const match = connectionString.match(/endpoint=([^;]+)/i);
    if (!match?.[1]) throw new Error('Cannot parse ACS endpoint from connection string');
    return { endpoint: match[1], connectionString };
  }

  throw new Error(
    'ACS Call Automation is not configured. Set AZURE_COMMUNICATION_SERVICES_ENDPOINT or ' +
    'AZURE_COMMUNICATION_SERVICES_CONNECTION_STRING.',
  );
}

function getClient(): CallAutomationClient {
  if (!_client) {
    const { endpoint, connectionString } = getConnectionSettings();
    if (connectionString) {
      _client = new CallAutomationClient(connectionString);
    } else {
      _client = new CallAutomationClient(endpoint, getAzureCredential());
    }
  }
  return _client;
}

export type AcsVoiceName =
  | 'en-US-AriaNeural'     // warm, conversational — default GreenChainz agent voice
  | 'en-US-GuyNeural'
  | 'en-US-JennyNeural'
  | 'en-US-DavisNeural'
  | 'en-US-NancyNeural'
  | 'en-US-TonyNeural';

export const DEFAULT_VOICE: AcsVoiceName = 'en-US-AriaNeural';

export interface TtsCallOptions {
  /** E.164 destination number, e.g. +14343592460 */
  to: string;
  /** Text to speak */
  text: string;
  /** Azure Neural voice name — defaults to en-US-AriaNeural */
  voice?: AcsVoiceName;
}

export interface TtsCallResult {
  success: boolean;
  callConnectionId?: string;
  error?: string;
}

/** Normalize a US phone number to E.164 (+1XXXXXXXXXX). Returns null if invalid. */
function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (raw.startsWith('+') && digits.length >= 11) return `+${digits}`;
  return null;
}

/**
 * Place an outbound TTS call. ACS dials `to`, waits for answer, then plays
 * `text` using the selected neural voice. The call disconnects automatically
 * after the message completes.
 */
export async function sendTtsCall(options: TtsCallOptions): Promise<TtsCallResult> {
  // Outbound calls use the local number (+14175014967); SMS uses toll-free (+18333236128)
  const fromNumber = process.env.ACS_LOCAL_NUMBER ?? process.env.ACS_TOLL_FREE_NUMBER ?? '';
  if (!fromNumber) {
    return { success: false, error: 'ACS_LOCAL_NUMBER (or ACS_TOLL_FREE_NUMBER) is not set' };
  }

  const normalizedTo = normalizePhone(options.to);
  if (!normalizedTo) {
    return { success: false, error: `Invalid phone number: ${options.to}` };
  }

  // ACS Call Automation requires a public callback URL even for fire-and-forget
  // TTS calls. We register a lightweight handler on /api/acs/call-events below.
  const callbackBase = process.env.APP_BASE_URL ?? 'https://greenchainz.com';
  const callbackUri = `${callbackBase}/api/acs/call-events`;

  try {
    const client = getClient();
    const voice = options.voice ?? DEFAULT_VOICE;

    const target: PhoneNumberIdentifier = { phoneNumber: normalizedTo };
    const caller: PhoneNumberIdentifier = { phoneNumber: fromNumber };

    const invite: CallInvite = {
      targetParticipant: target,
      sourceCallIdNumber: caller,
    };

    const result = await client.createCall(invite, callbackUri);
    const callId = result.callConnectionProperties.callConnectionId;

    if (!callId) {
      throw new Error('ACS createCall returned no callConnectionId');
    }

    console.log(`[ACS TTS] ✅ Call placed to ${normalizedTo} — connectionId: ${callId}`);

    // Kick off the "play TTS and hang up" sequence once ACS fires CallConnected.
    // We do this asynchronously — the webhook handler at /api/acs/call-events
    // will play the SSML when the call connects, then terminate.
    // Store the pending TTS job so the webhook can pick it up.
    storePendingTts(callId, options.text, voice);

    return { success: true, callConnectionId: callId };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[ACS TTS] ❌ Failed to place call to ${normalizedTo}:`, msg);
    return { success: false, error: msg };
  }
}

// ─── In-memory pending TTS store (per-process, adequate for low-volume admin calls) ─

interface PendingTts {
  text: string;
  voice: AcsVoiceName;
  createdAt: number;
}

const _pendingTts = new Map<string, PendingTts>();

function storePendingTts(callConnectionId: string, text: string, voice: AcsVoiceName) {
  _pendingTts.set(callConnectionId, { text, voice, createdAt: Date.now() });

  // Clean up stale entries after 10 minutes
  setTimeout(() => _pendingTts.delete(callConnectionId), 10 * 60 * 1000);
}

export function getPendingTts(callConnectionId: string): PendingTts | undefined {
  return _pendingTts.get(callConnectionId);
}

export function deletePendingTts(callConnectionId: string) {
  _pendingTts.delete(callConnectionId);
}

/**
 * Build SSML that wraps plain text in the chosen neural voice.
 * Used by the webhook handler to pass to CallMedia.playToAll.
 */
export function buildSsml(text: string, voice: AcsVoiceName): string {
  // Escape any XML special chars in the text
  const safe = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  return (
    `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" ` +
    `xml:lang="en-US">` +
    `<voice name="${voice}">${safe}</voice>` +
    `</speak>`
  );
}
