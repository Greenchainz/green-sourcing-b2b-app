/**
 * Azure Key Vault Integration
 * Resource: greenchianz-vault (greenchainz-production)
 * 
 * Use this to securely retrieve secrets instead of environment variables
 * in production. Supports Managed Identity for secure access.
 */

const { SecretClient } = require('@azure/keyvault-secrets');
const { DefaultAzureCredential, ManagedIdentityCredential } = require('@azure/identity');

let client = null;
let isInitialized = false;
const secretCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Initialize Key Vault client
 */
async function initialize() {
    if (isInitialized) return;

    const vaultUrl = process.env.AZURE_KEY_VAULT_URL;
    
    if (!vaultUrl) {
        console.warn('Azure Key Vault URL not configured');
        return;
    }

    try {
        // Use Managed Identity in Azure, DefaultCredential for local dev
        const credential = process.env.AZURE_USE_MANAGED_IDENTITY === 'true'
            ? new ManagedIdentityCredential()
            : new DefaultAzureCredential();

        client = new SecretClient(vaultUrl, credential);
        
        // Test connection
        await client.getSecret('test-connection').catch(() => {});
        
        isInitialized = true;
    } catch (e) {
        console.warn('Failed to initialize Key Vault:', e.message);
    }
}

/**
 * Get a secret value (with caching)
 */
async function getSecret(name, useCache = true) {
    // Check environment variable first (for local dev)
    const envName = name.replace(/-/g, '_').toUpperCase();
    const envValue = process.env[envName];
    if (envValue && process.env.NODE_ENV !== 'production') {
        return envValue;
    }

    // Check cache
    if (useCache) {
        const cached = secretCache.get(name);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            return cached.value;
        }
    }

    if (!client) {
        console.warn(`Key Vault not initialized, cannot retrieve secret: ${name}`);
        return null;
    }

    try {
        const secret = await client.getSecret(name);
        
        // Cache the result
        secretCache.set(name, {
            value: secret.value,
            timestamp: Date.now()
        });
        
        return secret.value;
    } catch (e) {
        console.error(`Failed to retrieve secret ${name}:`, e.message);
        return null;
    }
}

/**
 * Get multiple secrets at once
 */
async function getSecrets(names) {
    const results = {};
    
    await Promise.all(names.map(async (name) => {
        results[name] = await getSecret(name);
    }));
    
    return results;
}

/**
 * Set a secret (for deployment automation)
 */
async function setSecret(name, value) {
    if (!client) {
        throw new Error('Key Vault not initialized');
    }

    try {
        await client.setSecret(name, value);
        
        // Update cache
        secretCache.set(name, {
            value,
            timestamp: Date.now()
        });
        
        return true;
    } catch (e) {
        console.error(`Failed to set secret ${name}:`, e.message);
        return false;
    }
}

/**
 * Clear secret cache
 */
function clearCache() {
    secretCache.clear();
}

/**
 * Get database connection string from Key Vault
 */
async function getDatabaseConnectionString() {
    const host = await getSecret('postgres-host') || process.env.POSTGRES_HOST;
    const port = await getSecret('postgres-port') || process.env.POSTGRES_PORT || '5432';
    const user = await getSecret('postgres-user') || process.env.DB_USER;
    const password = await getSecret('postgres-password') || process.env.DB_PASSWORD;
    const database = await getSecret('postgres-database') || process.env.DB_NAME;
    
    return {
        host,
        port: parseInt(port),
        user,
        password,
        database,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    };
}

/**
 * Get Redis connection from Key Vault
 */
async function getRedisConnection() {
    return {
        host: await getSecret('redis-host') || process.env.REDIS_HOST,
        port: parseInt(await getSecret('redis-port') || process.env.REDIS_PORT || '6380'),
        password: await getSecret('redis-password') || process.env.REDIS_PASSWORD,
        tls: true
    };
}

/**
 * Get all OAuth secrets
 */
async function getOAuthSecrets() {
    return {
        google: {
            clientId: await getSecret('google-client-id'),
            clientSecret: await getSecret('google-client-secret')
        },
        github: {
            clientId: await getSecret('github-client-id'),
            clientSecret: await getSecret('github-client-secret')
        },
        linkedin: {
            clientId: await getSecret('linkedin-client-id'),
            clientSecret: await getSecret('linkedin-client-secret')
        },
        microsoft: {
            clientId: await getSecret('microsoft-client-id'),
            clientSecret: await getSecret('microsoft-client-secret')
        }
    };
}

module.exports = {
    initialize,
    getSecret,
    getSecrets,
    setSecret,
    clearCache,
    getDatabaseConnectionString,
    getRedisConnection,
    getOAuthSecrets,
    isInitialized: () => isInitialized
};
