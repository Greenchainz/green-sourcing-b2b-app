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
    // Common Azure examples include ?sslmode=require
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
        password: requireEnv('DB_PASSWORD', { minLength: 12 }),
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
// Priority:
// 1) Explicit opt-in via AZURE_POSTGRES_AAD=true or POSTGRES_AUTH=aad|azure_ad
// 2) Implicit when connecting to Azure Postgres and no password is configured
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

let passwordProvider;
if ((explicitAad || (isAzurePostgresHost && !hasExplicitPassword)) && process.env.NODE_ENV === 'production') {
    // Lazy import to avoid cost in local dev when not needed
    const { DefaultAzureCredential } = require('@azure/identity');
    const credential = new DefaultAzureCredential();
    const scope = 'https://ossrdbms-aad.database.windows.net/.default';
    passwordProvider = async () => {
        const token = await credential.getToken(scope);
        if (!token || !token.token) {
            throw new Error('Failed to acquire Azure AD access token for PostgreSQL');
        }
        return token.token;
    };
}

const config = {
    ...baseConfig,
    // If AAD is enabled, supply dynamic password function for token per-connection
    ...(passwordProvider ? { password: passwordProvider } : {}),
    // Optimized pool settings for better performance
    max: Number(process.env.PGPOOL_MAX || 20),
    min: Number(process.env.PGPOOL_MIN || 2),
    idleTimeoutMillis: Number(process.env.PGPOOL_IDLE || 30000),
    connectionTimeoutMillis: Number(process.env.PGPOOL_CONNECTION_TIMEOUT || 5000),
    // Statement timeout to prevent long-running queries from blocking
    statement_timeout: Number(process.env.PGPOOL_STATEMENT_TIMEOUT || 30000),
    // SSL is required for Azure Database for PostgreSQL in most environments.
    ssl: shouldUseSsl() ? { rejectUnauthorized: false } : false
};

// Log configuration (hide password)
if (process.env.NODE_ENV === 'development') {
    console.log('📊 Database Config:', {
        connectionString: connectionString ? '[set]' : '[not set]',
        host: config.host,
        port: config.port,
        user: config.user,
        database: config.database,
        ssl: config.ssl ? 'enabled' : 'disabled',
        poolMax: config.max,
        poolMin: config.min,
        auth: passwordProvider ? 'azure-ad-token' : (hasExplicitPassword ? 'password' : 'unspecified')
    });
}

const pool = new Pool(config);

pool.on('error', (err) => {
    console.error('❌ Unexpected PG client error', err);
});

pool.on('connect', () => {
    if (process.env.NODE_ENV === 'development') {
        console.log('✅ Connection to Postgres established');
    }
});

// Log pool statistics periodically for monitoring (development only)
if (process.env.NODE_ENV !== 'production') {
    setInterval(() => {
        console.log('📈 Pool stats:', {
            total: pool.totalCount,
            idle: pool.idleCount,
            waiting: pool.waitingCount
        });
    }, 60000); // Log every minute
}

module.exports = { pool };
