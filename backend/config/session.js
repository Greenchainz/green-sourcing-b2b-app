// backend/config/session.js

const session = require('express-session');
const RedisStore = require('connect-redis').default;
const { createClient } = require('redis');
const { COOKIE_NAMES, EXPIRATION, isProduction } = require('./cookieConfig');

// Initialize Redis client
// Using AZURE_REDIS_CONNECTION_STRING as requested.
// Note: Redis client usually expects a URL or config object.
// If connection string is a URL (rediss://...), createClient({ url: ... }) works.
const redisClient = createClient({
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

const sessionConfig = {
  store: new RedisStore({
    client: redisClient,
    prefix: 'gc_sess:',
  }),
  name: COOKIE_NAMES.SESSION,
  secret: process.env.COOKIE_SECRET || 'default-secret-change-me',
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

// Middleware wrapper to handle dynamic maxAge for "remember me" if needed,
// or just export the session middleware directly.
// The user prompt mentions "Max age: 7 days for 'remember me', 24 hours default".
// Standard express-session maxAge is static unless modified in the route.
// We'll export the configured session middleware.

module.exports = session(sessionConfig);
module.exports.redisClient = redisClient; // Export client if needed elsewhere
