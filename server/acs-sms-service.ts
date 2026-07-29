/**
 * Azure Communication Services — SMS
 *
 * Sends SMS messages via ACS using the registered toll-free number.
 *
 * Env vars:
 *   AZURE_COMMUNICATION_SERVICES_ENDPOINT  (preferred, managed identity)
 *   AZURE_COMMUNICATION_SERVICES_CONNECTION_STRING  (local dev fallback)
 *   ACS_TOLL_FREE_NUMBER  e.g. +18332550000
 */

import { SmsClient } from '@azure/communication-sms';
import { getAzureCredential } from '../lib/azure/credentials';

let _smsClient: SmsClient | null = null;

function getAcsConnectionSettings(): { endpoint: string; connectionString?: string } {
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
    'ACS SMS is not configured. Set AZURE_COMMUNICATION_SERVICES_ENDPOINT or ' +
    'AZURE_COMMUNICATION_SERVICES_CONNECTION_STRING.',
  );
}

function getSmsClient(): SmsClient {
  if (!_smsClient) {
    const { endpoint, connectionString } = getAcsConnectionSettings();
    if (connectionString) {
      _smsClient = new SmsClient(connectionString);
    } else {
      _smsClient = new SmsClient(endpoint, getAzureCredential());
    }
  }
  return _smsClient;
}

export interface SmsSendResult {
  to: string;
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send a single SMS via ACS.
 * The `from` number defaults to ACS_TOLL_FREE_NUMBER env var.
 */
export async function sendSms(
  to: string,
  message: string,
  from?: string,
): Promise<SmsSendResult> {
  const fromNumber = from ?? process.env.ACS_TOLL_FREE_NUMBER ?? '';
  if (!fromNumber) {
    console.error('[ACS SMS] ACS_TOLL_FREE_NUMBER is not set');
    return { to, success: false, error: 'Sender number not configured' };
  }

  // Normalize to E.164 (add +1 if bare 10-digit US number)
  const normalizedTo = normalizePhone(to);
  if (!normalizedTo) {
    return { to, success: false, error: `Invalid phone number: ${to}` };
  }

  try {
    const client = getSmsClient();
    const [result] = await client.send(
      { from: fromNumber, to: [normalizedTo], message },
      { enableDeliveryReport: true },
    );

    if (result.successful) {
      console.log(`[ACS SMS] ✅ Sent to ${normalizedTo} — messageId: ${result.messageId}`);
      return { to: normalizedTo, success: true, messageId: result.messageId };
    }

    console.warn(`[ACS SMS] ⚠️ Failed to ${normalizedTo}: ${result.errorMessage}`);
    return { to: normalizedTo, success: false, error: result.errorMessage };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[ACS SMS] ❌ Exception sending to ${normalizedTo}:`, msg);
    return { to: normalizedTo, success: false, error: msg };
  }
}

/**
 * Send the same SMS to multiple recipients.
 * Returns per-number results so callers can log partial failures.
 */
export async function sendSmsBatch(
  recipients: string[],
  message: string,
  from?: string,
): Promise<SmsSendResult[]> {
  return Promise.all(recipients.map((to) => sendSms(to, message, from)));
}

/** Normalize a US phone number to E.164 (+1XXXXXXXXXX).  Returns null if invalid. */
function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (raw.startsWith('+') && digits.length >= 11) return `+${digits}`;
  return null;
}
