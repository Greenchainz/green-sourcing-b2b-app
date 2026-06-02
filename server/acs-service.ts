/**
 * Azure Communication Services — Identity & Token Management
 *
 * Lazily creates an ACS identity for each GreenChainz user the first time
 * they join a call, then persists it in users.acs_user_id so subsequent
 * calls reuse the same identity (preserving display name history, etc.).
 *
 * Preferred env vars: AZURE_COMMUNICATION_SERVICES_ENDPOINT + AZURE_MI_CLIENT_ID
 * Fallback env var (dev/emergency): AZURE_COMMUNICATION_SERVICES_CONNECTION_STRING
 */

import { CommunicationIdentityClient } from '@azure/communication-identity';
import { getAzureCredential } from '../lib/azure/credentials';
import { getDb } from './db';
import { users } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

let _client: CommunicationIdentityClient | null = null;

function getAcsEndpointFromConnectionString(connectionString: string): string {
  const match = connectionString.match(/endpoint=([^;]+)/i);
  if (!match?.[1]) {
    throw new Error('Cannot parse ACS endpoint from connection string');
  }
  return match[1];
}

function getAcsSettings(): { endpoint: string; connectionString?: string } {
  const endpoint =
    process.env.AZURE_COMMUNICATION_SERVICES_ENDPOINT ||
    process.env.ACS_ENDPOINT_URL ||
    '';
  const connectionString = process.env.AZURE_COMMUNICATION_SERVICES_CONNECTION_STRING;
  const isProduction = process.env.NODE_ENV === 'production';
  const allowConnectionStringInProd =
    process.env.ALLOW_ACS_CONNECTION_STRING_IN_PROD === 'true';

  if (endpoint) {
    return { endpoint, connectionString };
  }

  if (connectionString) {
    if (isProduction && !allowConnectionStringInProd) {
      throw new Error(
        'ACS connection-string auth is blocked in production. ' +
        'Use AZURE_COMMUNICATION_SERVICES_ENDPOINT + managed identity or set ' +
        'ALLOW_ACS_CONNECTION_STRING_IN_PROD=true as an emergency override.'
      );
    }

    return {
      endpoint: getAcsEndpointFromConnectionString(connectionString),
      connectionString,
    };
  }

  throw new Error(
    'ACS is not configured. Set AZURE_COMMUNICATION_SERVICES_ENDPOINT for managed identity, ' +
    'or AZURE_COMMUNICATION_SERVICES_CONNECTION_STRING for local development.'
  );
}

function getClient(): CommunicationIdentityClient {
  if (!_client) {
    const { endpoint, connectionString } = getAcsSettings();

    if (connectionString) {
      _client = new CommunicationIdentityClient(connectionString);
      console.log('[ACS] Using connection-string authentication fallback');
    } else {
      _client = new CommunicationIdentityClient(endpoint, getAzureCredential());
      console.log('[ACS] Using managed identity authentication');
    }
  }
  return _client;
}

export interface AcsTokenResult {
  acsUserId: string;
  token: string;
  expiresOn: Date;
}

/**
 * Returns a fresh ACS voip token for the given GreenChainz user ID.
 * Creates an ACS identity on first call and persists it.
 */
export async function getAcsTokenForUser(userId: number): Promise<AcsTokenResult> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const [user] = await db
    .select({ id: users.id, acsUserId: users.acsUserId, name: users.name })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) throw new Error(`User ${userId} not found`);

  const client = getClient();
  let acsUserId = user.acsUserId;

  if (!acsUserId) {
    const identity = await client.createUser();
    acsUserId = identity.communicationUserId;
    await db.update(users).set({ acsUserId }).where(eq(users.id, userId));
  }

  const tokenResponse = await client.getToken(
    { communicationUserId: acsUserId },
    ['voip'],
  );

  return {
    acsUserId: acsUserId as string, // narrowed: either was non-null or was assigned in the if block above
    token: tokenResponse.token,
    expiresOn: tokenResponse.expiresOn,
  };
}

/**
 * ACS endpoint URL resolved from endpoint-first settings.
 * Required by the client SDK to know which region to connect to.
 */
export function getAcsEndpoint(): string {
  return getAcsSettings().endpoint;
}
