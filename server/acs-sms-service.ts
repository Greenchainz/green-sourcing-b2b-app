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
import { getAcsConnectionSettings, normalizePhoneE164 } from './acs-config';

let _smsClient: SmsClient | null = null;
const SEND_CONCURRENCY = 10;

function maskPhoneForLogs(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 4 ? `***${digits.slice(-4)}` : '***';
}

function getSmsClient(): SmsClient {
  if (!_smsClient) {
    const { endpoint, connectionString } = getAcsConnectionSettings('ACS SMS');
    if (endpoint && !connectionString) {
      _smsClient = new SmsClient(endpoint, getAzureCredential());
    } else if (connectionString) {
      _smsClient = new SmsClient(connectionString);
    } else {
      throw new Error('ACS SMS is not configured.');
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
  const configuredFrom = from ?? process.env.ACS_TOLL_FREE_NUMBER ?? '';
  const fromNumber = normalizePhoneE164(configuredFrom);
  if (!fromNumber) {
    console.error('[ACS SMS] ACS_TOLL_FREE_NUMBER is not set');
    return { to, success: false, error: 'Sender number not configured' };
  }

  // Normalize to E.164 (add +1 if bare 10-digit US number)
  const normalizedTo = normalizePhoneE164(to);
  if (!normalizedTo) {
    return { to, success: false, error: `Invalid phone number: ${to}` };
  }

  try {
    const client = getSmsClient();
    const [result] = await client.send(
      { from: fromNumber, to: [normalizedTo], message },
      { enableDeliveryReport: true },
    );

    const maskedTo = maskPhoneForLogs(normalizedTo);

    if (result.successful) {
      console.log(`[ACS SMS] ✅ Sent to ${maskedTo} — messageId: ${result.messageId}`);
      return { to: normalizedTo, success: true, messageId: result.messageId };
    }

    console.warn(`[ACS SMS] ⚠️ Failed to ${maskedTo}: ${result.errorMessage}`);
    return { to: normalizedTo, success: false, error: result.errorMessage };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[ACS SMS] ❌ Exception sending to ${maskPhoneForLogs(normalizedTo)}:`, msg);
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
  const results: SmsSendResult[] = [];

  for (let i = 0; i < recipients.length; i += SEND_CONCURRENCY) {
    const chunk = recipients.slice(i, i + SEND_CONCURRENCY);
    const settled = await Promise.allSettled(chunk.map((to) => sendSms(to, message, from)));
    for (let idx = 0; idx < settled.length; idx += 1) {
      const result = settled[idx];
      if (result.status === 'fulfilled') {
        results.push(result.value);
        continue;
      }

      const to = chunk[idx] ?? '';
      const msg = result.reason instanceof Error ? result.reason.message : String(result.reason);
      results.push({ to, success: false, error: msg });
    }
  }

  return results;
}
