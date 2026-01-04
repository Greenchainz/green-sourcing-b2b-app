/**
 * Central env validation (Azure-only).
 *
 * Goals:
 * - Fail fast if required secrets/config are missing in production
 * - Block known placeholder values from being deployed
 * - Provide clear error messages for missing configuration
 *
 * Classification:
 * - SECRET: Cryptographic keys, passwords, API tokens (must use Key Vault in prod)
 * - SERVER: Environment-specific config (URLs, hosts, identifiers)
 * - PUBLIC: Feature flags, tuning parameters (safe to commit)
 *
 * See docs/AZURE_SECRETS_AND_CONFIG.md for complete inventory.
 */

// ============================================
// REQUIRED SECRETS (Production will refuse to start without these)
// ============================================
const REQUIRED_SECRETS = [
  { name: 'JWT_SECRET', minLength: 32, description: 'JWT signing key for auth tokens' },
  { name: 'SESSION_SECRET', minLength: 32, description: 'Express session signing key' },
  { name: 'COOKIE_SECRET', minLength: 32, description: 'Cookie encryption key' },
  { name: 'DB_PASSWORD', minLength: 12, description: 'PostgreSQL database password' },
  { name: 'STRIPE_SECRET_KEY', minLength: 20, description: 'Stripe API secret key for payments' },
];

// ============================================
// REQUIRED SERVER CONFIG (Production will refuse to start without these)
// ============================================
const REQUIRED_SERVER_CONFIG = [
  { name: 'FRONTEND_URL', description: 'Frontend URL for CORS and redirects' },
  { name: 'POSTGRES_HOST', description: 'PostgreSQL database host' },
  { name: 'DB_USER', description: 'PostgreSQL database username' },
  { name: 'DB_NAME', description: 'PostgreSQL database name' },
];

// ============================================
// CONDITIONAL REQUIREMENTS (Required if feature is enabled)
// ============================================
const CONDITIONAL_REQUIREMENTS = [
  // Redis required if FEATURE_REDIS_CACHING is enabled or if REDIS_HOST is set
  {
    condition: () => process.env.FEATURE_REDIS_CACHING === 'true' || !!process.env.REDIS_HOST,
    requirements: [
      { name: 'REDIS_HOST', description: 'Redis cache host' },
      { name: 'REDIS_PASSWORD', minLength: 10, description: 'Redis access key' },
    ],
  },
  // Azure AD required if AZURE_CLIENT_ID is set (indicates Azure auth is configured)
  {
    condition: () => !!process.env.AZURE_CLIENT_ID,
    requirements: [
      { name: 'AZURE_TENANT_ID', description: 'Azure AD tenant ID' },
      { name: 'AZURE_CLIENT_ID', description: 'Azure AD application ID' },
      { name: 'AZURE_CLIENT_SECRET', minLength: 10, description: 'Azure AD client secret' },
    ],
  },
  // Document Intelligence required if feature is enabled
  {
    condition: () => process.env.FEATURE_AI_DOCUMENT_ANALYSIS === 'true',
    requirements: [
      { name: 'AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT', description: 'Azure AI endpoint URL' },
      { name: 'AZURE_DOCUMENT_INTELLIGENCE_KEY', minLength: 10, description: 'Azure AI key' },
    ],
  },
  // Email config required if notifications enabled
  {
    condition: () => process.env.NOTIFICATIONS_ENABLED === 'true',
    requirements: [
      { name: 'SMTP_HOST', description: 'SMTP server host' },
      { name: 'SMTP_USER', description: 'SMTP username' },
      { name: 'SMTP_PASS', minLength: 8, description: 'SMTP password' },
    ],
  },
  // LinkedIn OAuth required if LinkedIn verification feature is enabled
  {
    condition: () => process.env.FEATURE_LINKEDIN_VERIFICATION === 'true',
    requirements: [
      { name: 'LINKEDIN_CLIENT_ID', description: 'LinkedIn OAuth application ID' },
      { name: 'LINKEDIN_CLIENT_SECRET', minLength: 10, description: 'LinkedIn OAuth secret' },
      { name: 'LINKEDIN_REDIRECT_URI', description: 'LinkedIn OAuth redirect URI' },
    ],
  },
];

// ============================================
// PLACEHOLDER DETECTION (Block insecure default values)
// ============================================
const PLACEHOLDER_PATTERNS = [
  /default-secret/i,
  /change-?me/i,
  /^your[-_]/i,
  /replace[-_]?me/i,
  /^example$/i,
  /^xxx+$/i,
  /^placeholder/i,
  /^todo/i,
  /super-secret/i,
  /min-\d+-chars/i,
  /^password$/i,
  /^secret$/i,
];

/**
 * Check if a value looks like a placeholder that should not be used in production
 */
function isPlaceholder(value) {
  if (!value) return false;
  const trimmed = String(value).trim();
  return PLACEHOLDER_PATTERNS.some((re) => re.test(trimmed));
}

/**
 * Require an environment variable with validation
 * @param {string} name - Environment variable name
 * @param {object} opts - Options: minLength, description
 * @returns {string} The environment variable value
 * @throws {Error} If validation fails
 */
function requireEnv(name, opts = {}) {
  const value = process.env[name];
  const desc = opts.description ? ` (${opts.description})` : '';

  if (value === undefined || value === null || String(value).trim() === '') {
    throw new Error(`Missing required environment variable: ${name}${desc}`);
  }

  if (opts.minLength && String(value).length < opts.minLength) {
    throw new Error(
      `${name} must be at least ${opts.minLength} characters (got ${String(value).length})${desc}`
    );
  }

  if (isPlaceholder(value)) {
    throw new Error(
      `${name} is set to a placeholder value; production refuses to start with insecure defaults${desc}`
    );
  }

  return value;
}

/**
 * Get an environment variable with a fallback (only for non-production)
 * In production, this will throw if the variable is not set
 * @param {string} name - Environment variable name
 * @param {string} fallback - Fallback value for non-production
 * @param {object} opts - Options: minLength, description
 * @returns {string} The environment variable value or fallback
 */
function getEnvOrFallback(name, fallback, opts = {}) {
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    return requireEnv(name, opts);
  }

  const value = process.env[name];
  if (value !== undefined && value !== null && String(value).trim() !== '') {
    return value;
  }

  return fallback;
}

/**
 * Validate all required environment variables for production
 * Call this at application startup before any other initialization
 */
function validateRequiredEnv() {
  const isProduction = process.env.NODE_ENV === 'production';

  // In development, just log warnings for missing variables
  if (!isProduction) {
    const missing = [];

    for (const item of [...REQUIRED_SECRETS, ...REQUIRED_SERVER_CONFIG]) {
      const value = process.env[item.name];
      if (!value || String(value).trim() === '') {
        missing.push(item.name);
      }
    }

    if (missing.length > 0) {
      console.warn('⚠️  Missing environment variables (OK for development):', missing.join(', '));
    }

    return;
  }

  // Production: strict validation
  const errors = [];

  // Validate required secrets
  console.log('🔐 Validating required secrets...');
  for (const item of REQUIRED_SECRETS) {
    try {
      requireEnv(item.name, item);
    } catch (e) {
      errors.push(e.message);
    }
  }

  // Validate required server config
  console.log('⚙️  Validating required server config...');
  for (const item of REQUIRED_SERVER_CONFIG) {
    try {
      requireEnv(item.name, item);
    } catch (e) {
      errors.push(e.message);
    }
  }

  // Validate conditional requirements
  console.log('🔍 Validating conditional requirements...');
  for (const conditional of CONDITIONAL_REQUIREMENTS) {
    if (conditional.condition()) {
      for (const item of conditional.requirements) {
        try {
          requireEnv(item.name, item);
        } catch (e) {
          errors.push(e.message);
        }
      }
    }
  }

  // If any errors, fail fast with clear message
  if (errors.length > 0) {
    console.error('\n❌ FATAL: Production startup blocked due to missing/invalid configuration:\n');
    errors.forEach((err, i) => console.error(`  ${i + 1}. ${err}`));
    console.error('\n📖 See docs/AZURE_SECRETS_AND_CONFIG.md for setup instructions.\n');
    throw new Error(`Production startup blocked: ${errors.length} configuration error(s)`);
  }

  console.log('✅ All required environment variables validated');
}

/**
 * Print configuration status (for debugging)
 */
function printConfigStatus() {
  const isProduction = process.env.NODE_ENV === 'production';

  console.log('\n📋 Configuration Status:');
  console.log(`   Environment: ${isProduction ? 'PRODUCTION' : 'development'}`);

  // Check secrets (don't print values!)
  console.log('\n   Secrets:');
  for (const item of REQUIRED_SECRETS) {
    const hasValue = !!process.env[item.name];
    const status = hasValue ? '✅' : '❌';
    console.log(`     ${status} ${item.name}`);
  }

  // Check server config
  console.log('\n   Server Config:');
  for (const item of REQUIRED_SERVER_CONFIG) {
    const hasValue = !!process.env[item.name];
    const status = hasValue ? '✅' : '❌';
    const value = hasValue ? process.env[item.name] : '(not set)';
    // Only show non-sensitive values
    console.log(`     ${status} ${item.name}: ${value}`);
  }

  console.log('');
}

module.exports = {
  validateRequiredEnv,
  requireEnv,
  getEnvOrFallback,
  isPlaceholder,
  printConfigStatus,
  // Export for testing
  REQUIRED_SECRETS,
  REQUIRED_SERVER_CONFIG,
  CONDITIONAL_REQUIREMENTS,
};

