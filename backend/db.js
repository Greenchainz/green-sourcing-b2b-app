
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });
const { requireEnv } = require('./config/validateEnv');

const connectionString =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_CONNECTION_STRING;

function shouldUseSsl() {
    const envFlag = (process.env.POSTGRES_SSL || '').toLowerCase() === 'true';
    const prod = process.env.NODE_ENV === 'production';
    const url = connectionString || '';
    const sslModeRequire = /sslmode=require/i.test(url);
    const sslTrue = /ssl=true/i.test(url);
    return envFlag || prod || sslModeRequire || sslTrue;
}

// Prefer a single Azure-style DATABASE_URL / connection string when provided.
// Otherwise fall back to individual host/port/user/password/database variables.
let baseConfig;
if (connectionString) {
    baseConfig = { connectionString };
} else if (process.env.NODE_ENV === 'production') {
    baseConfig = {
        host: requireEnv('POSTGRES_HOST'),
        port: Number(process.env.POSTGRES_PORT || 5432),
        user: requireEnv('DB_USER'),
        password: process.env.DB_PASSWORD, // Don't require if using Entra ID
        database: requireEnv('DB_NAME')
    };
} else {
    baseConfig = {
        host: process.env.POSTGRES_HOST || process.env.DATABASE_HOST || 'localhost',
        port: Number(process.env.POSTGRES_PORT || process.env.DATABASE_PORT || 5432),
        user: process.env.DB_USER || process.env.POSTGRES_USER || process.env.DATABASE_USER || 'user',
        password: process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD || process.env.DATABASE_PASSWORD,
        database: process.env.DB_NAME || process.env.POSTGRES_DB || process.env.DATABASE_NAME || 'greenchainz_dev'
    };
}

// Determine if we should use Azure AD (Entra) token authentication.
const isAzurePostgresHost = (() => {
    try {
        if (baseConfig && baseConfig.host) return /postgres\.database\.azure\.com/i.test(baseConfig.host);
        if (connectionString) return /postgres\.database\.azure\.com/i.test(connectionString);
        return false;
    } catch (_) { return false; }
})();

const explicitAad = (process.env.AZURE_POSTGRES_AAD || '').toLowerCase() === 'true'
    || (process.env.POSTGRES_AUTH || '').toLowerCase() === 'aad'
    || (process.env.POSTGRES_AUTH || '').toLowerCase() === 'azure_ad';

const hasExplicitPassword = !!(
    (baseConfig && baseConfig.password)
    || process.env.DB_PASSWORD
    || process.env.POSTGRES_PASSWORD
);

const shouldUseEntraId = explicitAad || (isAzurePostgresHost && !hasExplicitPassword);

// Initialize password provider for Azure AD authentication
let passwordProvider;
if (shouldUseEntraId) {
    console.log('🔐 Using Azure Entra ID authentication for PostgreSQL');
    const { DefaultAzureCredential } = require('@azure/identity');
    const credential = new DefaultAzureCredential();
    const scope = 'https://ossrdbms-aad.database.windows.net/.default';
    
    passwordProvider = async () => {
        try {
            const token = await credential.getToken(scope);
            if (!token || !token.token) {
                throw new Error('Failed to acquire Azure AD access token for PostgreSQL');
            }
            console.log('✅ Azure AD token acquired for PostgreSQL');
            return token.token;
        } catch (error) {
            console.error('❌ Failed to get Azure AD token:', error.message);
            throw error;
        }
    };
}

// Build final config
const config = {
    ...baseConfig,
    ssl: shouldUseSsl() ? { rejectUnauthorized: true } : false,
    max: Number(process.env.POSTGRES_MAX_CONNECTIONS || 20),
    idleTimeoutMillis: Number(process.env.POSTGRES_IDLE_TIMEOUT_MS || 30000),
    connectionTimeoutMillis: Number(process.env.POSTGRES_CONNECTION_TIMEOUT_MS || 10000),
};

// Create pool with async password provider if using Entra ID
let pool;
if (passwordProvider) {
    // For Azure AD, we need to create a custom pool that refreshes tokens
    pool = new Pool({
        ...config,
        password: async () => {
            return await passwordProvider();
        }
    });
} else {
    pool = new Pool(config);
}

// Log connection info (redact sensitive data)
console.log('📊 PostgreSQL Pool Configuration:');
console.log(`   Host: ${baseConfig.host || 'from connection string'}`);
console.log(`   Database: ${baseConfig.database || 'from connection string'}`);
console.log(`   User: ${baseConfig.user || 'from connection string'}`);
console.log(`   SSL: ${shouldUseSsl()}`);
console.log(`   Auth: ${shouldUseEntraId ? 'Azure Entra ID' : 'Password'}`);

// Test connection on startup
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('❌ Database connection test failed:', err.message);
    } else {
        console.log('✅ Database connected successfully at', res.rows[0].now);
    }
});

module.exports = { pool };
