/**
 * Shared Azure Communication Services configuration helpers.
 */

const ACS_TOKEN_QUERY_PARAM = 'acsToken';

export function getAcsConnectionSettings(serviceName: string): {
  endpoint: string;
  connectionString?: string;
} {
  const endpoint =
    process.env.AZURE_COMMUNICATION_SERVICES_ENDPOINT ||
    process.env.ACS_ENDPOINT_URL ||
    '';
  const connectionString = process.env.AZURE_COMMUNICATION_SERVICES_CONNECTION_STRING;

  // Endpoint + managed identity is preferred whenever endpoint is configured.
  if (endpoint) return { endpoint };

  if (connectionString) {
    const match = connectionString.match(/endpoint=([^;]+)/i);
    if (!match?.[1]) throw new Error('Cannot parse ACS endpoint from connection string');
    return { endpoint: match[1], connectionString };
  }

  throw new Error(
    `${serviceName} is not configured. Set AZURE_COMMUNICATION_SERVICES_ENDPOINT or ` +
      'AZURE_COMMUNICATION_SERVICES_CONNECTION_STRING.',
  );
}

/** Normalize a US phone number to E.164 (+1XXXXXXXXXX). Returns null if invalid. */
export function normalizePhoneE164(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (raw.startsWith('+') && digits.length >= 11) return `+${digits}`;
  return null;
}

export function getAcsCallbackAuthSecret(): string {
  const secret = process.env.ACS_CALLBACK_AUTH_SECRET ?? '';
  if (!secret) {
    throw new Error('ACS_CALLBACK_AUTH_SECRET is not set');
  }
  return secret;
}

export function buildAcsCallEventsCallbackUri(callbackBase: string): string {
  const secret = getAcsCallbackAuthSecret();
  const url = new URL('/api/acs/call-events', callbackBase);
  url.searchParams.set(ACS_TOKEN_QUERY_PARAM, secret);
  return url.toString();
}

export function isValidAcsCallbackToken(
  queryToken: unknown,
  headerToken: string | string[] | undefined,
): boolean {
  const expected = process.env.ACS_CALLBACK_AUTH_SECRET ?? '';
  if (!expected) return false;

  const q = typeof queryToken === 'string' ? queryToken : '';
  const h = typeof headerToken === 'string' ? headerToken : '';
  return q === expected || h === expected;
}
