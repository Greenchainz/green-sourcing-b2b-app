/**
 * Central env validation (Azure-only).
 *
 * Goals:
 * - Fail fast if required secrets/config are missing in production
 * - Block known placeholder values from being deployed
 */

const REQUIRED_IN_PROD = [
  // Secrets
  { name: 'JWT_SECRET', minLength: 32, secret: true },
  { name: 'SESSION_SECRET', minLength: 32, secret: true },
  { name: 'COOKIE_SECRET', minLength: 32, secret: true },
  { name: 'DB_PASSWORD', minLength: 12, secret: true },
  { name: 'REDIS_PASSWORD', minLength: 10, secret: true },
  { name: 'AZURE_DOCUMENT_INTELLIGENCE_KEY', minLength: 10, secret: true },

  // Server config
  { name: 'FRONTEND_URL' },
  { name: 'POSTGRES_HOST' },
  { name: 'DB_USER' },
  { name: 'DB_NAME' },
  { name: 'REDIS_HOST' },
];

const PLACEHOLDER_PATTERNS = [
  /default-secret/i,
  /change-?me/i,
  /^your[-_]/i,
  /replace[-_]?me/i,
  /^example$/i,
];

function isPlaceholder(value) {
  return PLACEHOLDER_PATTERNS.some((re) => re.test(String(value).trim()));
}

function requireEnv(name, opts = {}) {
  const value = process.env[name];
  if (value === undefined || value === null || String(value).trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  if (opts.minLength && String(value).length < opts.minLength) {
    throw new Error(`${name} must be at least ${opts.minLength} characters`);
  }
  if (isPlaceholder(value)) {
    throw new Error(`${name} is set to a placeholder value; refuse to start`);
  }
  return value;
}

function validateRequiredEnv() {
  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) return;

  for (const item of REQUIRED_IN_PROD) {
    requireEnv(item.name, item);
  }
}

module.exports = {
  validateRequiredEnv,
  requireEnv,
};

