// backend/config/session.js
//
// IMPORTANT: This file is now DEPRECATED for direct import.
// Use middleware/session.js instead, which properly handles Redis connection
// and validates secrets in production.
//
// This file is kept for backwards compatibility but should not be used directly.

const session = require('express-session');
const RedisStore = require('connect-redis').default;
const { createClient } = require('redis');
const { COOKIE_NAMES, EXPIRATION, isProduction } = require('./cookieConfig');
const { requireEnv, getEnvOrFallback } = require('./validateEnv');

// ============================================
// COOKIE_SECRET: Required in production, fallback only for dev
// ============================================
// SECURITY: No fallback in production - will throw if missing
const cookieSecret = isProduction
  ? requireEnv('COOKIE_SECRET', { minLength: 32, description: 'Cookie encryption key' })
  : getEnvOrFallback('COOKIE_SECRET', 'dev-only-cookie-secret-not-for-production', { minLength: 16 });

// ============================================
// Redis Client (Optional - only if connection string provided)
// ============================================
let redisClient = null;

// Only initialize Redis if connection string is provided
if (process.env.AZURE_REDIS_CONNECTION_STRING) {
  redisClient = createClient({
    url: process.env.AZURE_REDIS_CONNECTION_STRING,
    socket: {
      tls: isProduction, // Azure Redis typically requires TLS
      rejectUnauthorized: isProduction // In production we should verify certs
    }
  });

  redisClient.on('error', (err) => console.error('Redis Client Error', err));
  redisClient.on('connect', () => console.log('Redis Client Connected'));

  // Connect to Redis (async)
  redisClient.connect().catch(console.error);
}

// ============================================
// Session Configuration
// ============================================
const sessionConfig = {
  store: redisClient
    ? new RedisStore({
        client: redisClient,
        prefix: 'gc_sess:',
      })
    : undefined, // Falls back to MemoryStore if no Redis
  name: COOKIE_NAMES.SESSION,
  secret: cookieSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: EXPIRATION.DEFAULT, // Default to 24 hours
    secure: isProduction,
    sameSite: 'lax',
    httpOnly: true,
    domain: process.env.COOKIE_DOMAIN,
  },
};

// Log warning if MemoryStore is used
if (!redisClient && isProduction) {
  console.warn('⚠️  WARNING: Using MemoryStore for sessions in production. This is not recommended.');
  console.warn('   Configure AZURE_REDIS_CONNECTION_STRING for production-ready sessions.');
}

// Middleware wrapper to handle dynamic maxAge for "remember me" if needed,
// or just export the session middleware directly.
// The user prompt mentions "Max age: 7 days for 'remember me', 24 hours default".
// Standard express-session maxAge is static unless modified in the route.
// We'll export the configured session middleware.

module.exports = session(sessionConfig);
module.exports.redisClient = redisClient; // Export client if needed elsewhere
