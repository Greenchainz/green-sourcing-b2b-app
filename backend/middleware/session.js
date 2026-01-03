const session = require('express-session');
const RedisStore = require('connect-redis').default;
const { COOKIE_NAMES, EXPIRATION, isProduction } = require('../config/cookieConfig');
const { requireEnv } = require('../config/validateEnv');

/**
 * Build exactly one session middleware.
 *
 * - In production: requires Redis + SESSION_SECRET
 * - In non-prod: falls back to MemoryStore if Redis not configured
 */
function buildSessionMiddleware({ redisClient }) {
  const sessionSecret = isProduction ? requireEnv('SESSION_SECRET', { minLength: 32 }) : process.env.SESSION_SECRET;

  if (isProduction && !redisClient) {
    throw new Error('Redis is required for sessions in production (REDIS_* not configured or not reachable)');
  }

  const store = redisClient
    ? new RedisStore({ client: redisClient, prefix: 'gc_sess:' })
    : undefined; // MemoryStore

  return session({
    store,
    name: COOKIE_NAMES.SESSION,
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: EXPIRATION.DEFAULT,
      secure: isProduction,
      sameSite: 'lax',
      httpOnly: true,
      domain: process.env.COOKIE_DOMAIN,
    },
  });
}

module.exports = { buildSessionMiddleware };

