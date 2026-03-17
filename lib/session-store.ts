/**
 * Redis Session Store for Next.js
 * 
 * This module provides session storage using Azure Redis Cache with managed identity.
 * Sessions are stored in Redis instead of memory, enabling:
 * - Persistence across server restarts
 * - Horizontal scaling (multiple server instances share sessions)
 * - Automatic session expiration
 * 
 * Usage:
 * Import this in your Next.js API routes or middleware to store user sessions.
 */

import RedisStore from 'connect-redis';
import { getRedisClient } from './redis-managed-identity';

/**
 * Create Redis session store instance
 * 
 * @param ttl - Session TTL in seconds (default: 24 hours)
 * @returns RedisStore instance for use with express-session or similar
 */
export async function createRedisSessionStore(ttl: number = 86400) {
  const redisClient = await getRedisClient();
  
  return new RedisStore({
    client: redisClient as any, // Type compatibility
    prefix: 'greenchainz:session:',
    ttl, // Session expiration time in seconds
  });
}

/**
 * Session configuration for Next.js API routes
 */
export const sessionConfig = {
  name: 'greenchainz.sid',
  secret: process.env.NEXTAUTH_SECRET || 'fallback-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true, // Prevent XSS attacks
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax' as const,
  },
};

/**
 * Helper: Get session data by session ID
 */
export async function getSession(sessionId: string): Promise<any | null> {
  const redisClient = await getRedisClient();
  const sessionKey = `greenchainz:session:${sessionId}`;
  
  const sessionData = await redisClient.get(sessionKey);
  return sessionData ? JSON.parse(sessionData) : null;
}

/**
 * Helper: Set session data
 */
export async function setSession(
  sessionId: string,
  data: any,
  ttl: number = 86400
): Promise<void> {
  const redisClient = await getRedisClient();
  const sessionKey = `greenchainz:session:${sessionId}`;
  
  await redisClient.setEx(sessionKey, ttl, JSON.parse(data));
}

/**
 * Helper: Delete session
 */
export async function deleteSession(sessionId: string): Promise<void> {
  const redisClient = await getRedisClient();
  const sessionKey = `greenchainz:session:${sessionId}`;
  
  await redisClient.del(sessionKey);
}

/**
 * Helper: Get all active session IDs for a user
 */
export async function getUserSessions(userId: string): Promise<string[]> {
  const redisClient = await getRedisClient();
  const pattern = `greenchainz:session:*`;
  
  const keys = await redisClient.keys(pattern);
  const sessions: string[] = [];
  
  for (const key of keys) {
    const sessionData = await redisClient.get(key);
    if (sessionData) {
      const parsed = JSON.parse(sessionData);
      if (parsed.userId === userId) {
        sessions.push(key.replace('greenchainz:session:', ''));
      }
    }
  }
  
  return sessions;
}

/**
 * Helper: Invalidate all sessions for a user (e.g., on password change)
 */
export async function invalidateUserSessions(userId: string): Promise<number> {
  const sessionIds = await getUserSessions(userId);
  
  for (const sessionId of sessionIds) {
    await deleteSession(sessionId);
  }
  
  return sessionIds.length;
}
