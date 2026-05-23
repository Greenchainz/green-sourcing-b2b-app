/**
 * Azure Communication Services — Identity & Token Management
 *
 * Lazily creates an ACS identity for each GreenChainz user the first time
 * they join a call, then persists it in users.acs_user_id so subsequent
 * calls reuse the same identity (preserving display name history, etc.).
 *
 * Required env var: AZURE_COMMUNICATION_SERVICES_CONNECTION_STRING
 */

import { CommunicationIdentityClient } from '@azure/communication-identity';
import { getDb } from './db';
import { users } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

let _client: CommunicationIdentityClient | null = null;

function getClient(): CommunicationIdentityClient {
  if (!_client) {
    const cs = process.env.AZURE_COMMUNICATION_SERVICES_CONNECTION_STRING;
    if (!cs) throw new Error('AZURE_COMMUNICATION_SERVICES_CONNECTION_STRING is not set');
    _client = new CommunicationIdentityClient(cs);
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
 * ACS endpoint URL derived from the connection string.
 * Required by the client SDK to know which region to connect to.
 */
export function getAcsEndpoint(): string {
  const cs = process.env.AZURE_COMMUNICATION_SERVICES_CONNECTION_STRING ?? '';
  // Connection string format: endpoint=https://<resource>.communication.azure.com/;accesskey=...
  const match = cs.match(/endpoint=([^;]+)/i);
  if (!match) throw new Error('Cannot parse ACS endpoint from connection string');
  return match[1];
}
