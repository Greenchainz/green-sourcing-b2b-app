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

function getSmsClient(): SmsClient {
  if (!_smsClient) {
    const { endpoint, connectionString } = getAcsConnectionSettings('ACS SMS');
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
  const settled = await Promise.allSettled(recipients.map((to) => sendSms(to, message, from)));
  return settled.map((result, index) => {
    if (result.status === 'fulfilled') return result.value;
    const to = recipients[index] ?? '';
    const msg = result.reason instanceof Error ? result.reason.message : String(result.reason);
    return { to, success: false, error: msg };
  });
}
