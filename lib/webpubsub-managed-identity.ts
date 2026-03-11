/**
 * Azure Web PubSub Client with Managed Identity Authentication
 * 
 * Uses DefaultAzureCredential to generate client access URLs
 * Eliminates the need for AZURE_WEBPUBSUB_CONNECTION_STRING in environment variables
 */
import { DefaultAzureCredential } from '@azure/identity';
import { WebPubSubServiceClient } from '@azure/web-pubsub';

// ============================================================================
// CONFIGURATION
// ============================================================================

const WEB_PUBSUB_ENDPOINT = process.env.AZURE_WEBPUBSUB_ENDPOINT || 'https://GreenChainz.webpubsub.azure.com';
const WEB_PUBSUB_HUB = process.env.AZURE_WEBPUBSUB_HUB || 'greenchainzhub';

// ============================================================================
// MANAGED IDENTITY CLIENT
// ============================================================================

/**
 * Create Web PubSub service client with managed identity authentication
 */
function createServiceClient(hubName: string = WEB_PUBSUB_HUB): WebPubSubServiceClient {
  const credential = new DefaultAzureCredential();
  
  return new WebPubSubServiceClient(
    WEB_PUBSUB_ENDPOINT,
    credential,
    hubName
  );
}

/**
 * Generate client access URL for WebSocket connection
 * 
 * @param userId - Unique user identifier
 * @param hubName - Hub name (defaults to configured hub)
 * @param roles - Optional roles for the connection (e.g., ['webpubsub.sendToGroup', 'webpubsub.joinLeaveGroup'])
 * @param groups - Optional groups to join automatically
 * @param expirationMinutes - Token expiration in minutes (default: 60)
 * @returns WebSocket URL with access token
 */
export async function getClientAccessUrl(
  userId: string,
  hubName: string = WEB_PUBSUB_HUB,
  roles?: string[],
  groups?: string[],
  expirationMinutes: number = 60
): Promise<string> {
  const serviceClient = createServiceClient(hubName);
  
  const token = await serviceClient.getClientAccessToken({
    userId,
    roles,
    groups,
    expirationTimeInMinutes: expirationMinutes,
  });
  
  return token.url;
}

/**
 * Send message to all connections in a hub
 */
export async function sendToAll(
  message: any,
  hubName: string = WEB_PUBSUB_HUB
): Promise<void> {
  const serviceClient = createServiceClient(hubName);
  await serviceClient.sendToAll(message);
}

/**
 * Send message to a specific user
 */
export async function sendToUser(
  userId: string,
  message: any,
  hubName: string = WEB_PUBSUB_HUB
): Promise<void> {
  const serviceClient = createServiceClient(hubName);
  await serviceClient.sendToUser(userId, message);
}

/**
 * Send message to a specific group
 */
export async function sendToGroup(
  groupName: string,
  message: any,
  hubName: string = WEB_PUBSUB_HUB
): Promise<void> {
  const serviceClient = createServiceClient(hubName);
  await serviceClient.sendToGroup(groupName, message);
}

/**
 * Add user to a group
 */
export async function addUserToGroup(
  groupName: string,
  userId: string,
  hubName: string = WEB_PUBSUB_HUB
): Promise<void> {
  const serviceClient = createServiceClient(hubName);
  await serviceClient.group(groupName).addUser(userId);
}

/**
 * Remove user from a group
 */
export async function removeUserFromGroup(
  groupName: string,
  userId: string,
  hubName: string = WEB_PUBSUB_HUB
): Promise<void> {
  const serviceClient = createServiceClient(hubName);
  await serviceClient.group(groupName).removeUser(userId);
}

/**
 * Check if user exists in a group
 */
export async function userExistsInGroup(
  groupName: string,
  userId: string,
  hubName: string = WEB_PUBSUB_HUB
): Promise<boolean> {
  const serviceClient = createServiceClient(hubName);
  return await serviceClient.group(groupName).hasUser(userId);
}

/**
 * Close a specific connection
 */
export async function closeConnection(
  connectionId: string,
  reason?: string,
  hubName: string = WEB_PUBSUB_HUB
): Promise<void> {
  const serviceClient = createServiceClient(hubName);
  await serviceClient.closeConnection(connectionId, { reason });
}
