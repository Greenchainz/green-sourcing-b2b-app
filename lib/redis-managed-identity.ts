/**
 * Azure Redis Cache Client with Managed Identity Authentication
 * 
 * This module provides a Redis client that authenticates using Azure Managed Identity
 * instead of passwords, following enterprise security best practices.
 * 
 * Features:
 * - Passwordless authentication via Azure AD
 * - Automatic token refresh
 * - Connection pooling
 * - Error handling and retry logic
 * 
 * Environment Variables Required:
 * - REDIS_HOST: Redis hostname (e.g., greenchainz.redis.cache.windows.net)
 * - REDIS_PORT: Redis port (default: 6380)
 * - REDIS_SSL: Enable SSL (default: true)
 */

import { createClient, RedisClientType } from 'redis';
import { DefaultAzureCredential } from '@azure/identity';

// Redis client singleton
let redisClient: RedisClientType | null = null;
let tokenRefreshInterval: NodeJS.Timeout | null = null;

/**
 * Get Azure AD access token for Redis using Managed Identity
 */
async function getRedisAccessToken(): Promise<string> {
  const credential = new DefaultAzureCredential();
  
  // Request token for Azure Redis Cache scope
  const tokenResponse = await credential.getToken(
    'https://redis.azure.com/.default'
  );
  
  return tokenResponse.token;
}

/**
 * Get or create Redis client with managed identity authentication
 */
export async function getRedisClient(): Promise<RedisClientType> {
  if (redisClient && redisClient.isOpen) {
    return redisClient;
  }

  const host = process.env.REDIS_HOST;
  const port = parseInt(process.env.REDIS_PORT || '6380');
  const useSsl = process.env.REDIS_SSL !== 'false';

  if (!host) {
    throw new Error('REDIS_HOST environment variable is required');
  }

  // Get initial access token
  const accessToken = await getRedisAccessToken();

  // Create Redis client with managed identity auth
  redisClient = createClient({
    socket: {
      host,
      port,
      tls: useSsl,
      rejectUnauthorized: false,
    },
    username: 'default', // Azure Redis requires 'default' username for Entra ID auth
    password: accessToken, // Use access token as password
  });

  // Error handling
  redisClient.on('error', (err) => {
    console.error('[Redis] Connection error:', err);
  });

  redisClient.on('connect', () => {
    console.log('[Redis] Connected successfully');
  });

  redisClient.on('reconnecting', () => {
    console.log('[Redis] Reconnecting...');
  });

  // Connect to Redis
  await redisClient.connect();

  // Set up automatic token refresh (tokens expire after 1 hour, refresh every 45 minutes)
  if (tokenRefreshInterval) {
    clearInterval(tokenRefreshInterval);
  }

  tokenRefreshInterval = setInterval(async () => {
    try {
      console.log('[Redis] Refreshing access token...');
      const newToken = await getRedisAccessToken();
      
      // Authenticate with new token
      await redisClient!.auth({
        username: 'default',
        password: newToken,
      });
      
      console.log('[Redis] Access token refreshed successfully');
    } catch (error) {
      console.error('[Redis] Failed to refresh access token:', error);
    }
  }, 45 * 60 * 1000); // 45 minutes

  return redisClient;
}

/**
 * Close Redis connection gracefully
 */
export async function closeRedis(): Promise<void> {
  if (tokenRefreshInterval) {
    clearInterval(tokenRefreshInterval);
    tokenRefreshInterval = null;
  }

  if (redisClient && redisClient.isOpen) {
    await redisClient.quit();
    redisClient = null;
    console.log('[Redis] Connection closed');
  }
}

/**
 * Cache helper functions
 */

/**
 * Get cached value by key
 */
export async function getCache(key: string): Promise<string | null> {
  const client = await getRedisClient();
  return await client.get(key);
}

/**
 * Set cached value with optional TTL (in seconds)
 */
export async function setCache(
  key: string,
  value: string,
  ttl?: number
): Promise<void> {
  const client = await getRedisClient();
  
  if (ttl) {
    await client.setEx(key, ttl, value);
  } else {
    await client.set(key, value);
  }
}

/**
 * Delete cached value by key
 */
export async function deleteCache(key: string): Promise<void> {
  const client = await getRedisClient();
  await client.del(key);
}

/**
 * Check if key exists in cache
 */
export async function existsCache(key: string): Promise<boolean> {
  const client = await getRedisClient();
  const result = await client.exists(key);
  return result === 1;
}

/**
 * Get multiple cached values by keys
 */
export async function getCacheMulti(keys: string[]): Promise<(string | null)[]> {
  const client = await getRedisClient();
  return await client.mGet(keys);
}

/**
 * Increment counter (for rate limiting)
 */
export async function incrementCounter(
  key: string,
  ttl?: number
): Promise<number> {
  const client = await getRedisClient();
  const count = await client.incr(key);
  
  if (ttl && count === 1) {
    // Set expiry only on first increment
    await client.expire(key, ttl);
  }
  
  return count;
}

/**
 * Get TTL (time to live) for a key in seconds
 */
export async function getTTL(key: string): Promise<number> {
  const client = await getRedisClient();
  return await client.ttl(key);
}
