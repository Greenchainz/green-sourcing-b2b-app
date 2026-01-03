const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const lusca = require('lusca');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

// Routes
const uploadRoutes = require('./routes/uploads');
const documentAIRoutes = require('./routes/documentAI');
const authSyncRoutes = require('./routes/auth-sync');

// Middleware
const rateLimit = require('./middleware/rateLimit');
const azure = require('./services/azure');
const { pool } = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

// Security & Basic Middleware
app.use(helmet());
app.use(cors((req, callback) => {
    const configured = process.env.FRONTEND_URL || process.env.FRONTEND_URLS || 'http://localhost:3000';
    const allowedOrigins = configured.split(',').map((s) => s.trim()).filter(Boolean);
    const requestOrigin = req.header('Origin');

    // If no Origin (e.g. server-to-server), allow.
    if (!requestOrigin) {
        return callback(null, { origin: false, credentials: true });
    }

    // Exact-match allowlist to support credentials=true.
    const isAllowed = allowedOrigins.includes(requestOrigin);
    return callback(null, { origin: isAllowed, credentials: true });
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Application Insights request tracking (no-op until initialized)
if (process.env.FEATURE_AZURE_MONITORING === 'true') {
    app.use(azure.monitoring.expressMiddleware());
}

// Session (if needed for passport/auth)
app.use(session({
    secret: process.env.SESSION_SECRET || 'dev-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true
    }
}));

// Lusca (Security)
app.use(lusca.xframe('SAMEORIGIN'));
app.use(lusca.xssProtection(true));

// Rate Limiting
if (rateLimit && rateLimit.general) {
    app.use('/api/', rateLimit.general);
}

// Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

let azureInitPromise = null;
let azureInitResults = null;

async function checkDatabase() {
    try {
        await pool.query('SELECT 1');
        return true;
    } catch (e) {
        return false;
    }
}

// Readiness (used by Azure Container Apps probes)
app.get('/ready', async (req, res) => {
    if (azureInitPromise) {
        try {
            await azureInitPromise;
        } catch (e) {
            // Ignore; we report per-service readiness below.
        }
    }

    const featureRedis = process.env.FEATURE_REDIS_CACHING === 'true';
    const featureAI = process.env.FEATURE_AI_DOCUMENT_ANALYSIS === 'true';
    const featureMonitoring = process.env.FEATURE_AZURE_MONITORING === 'true';
    const storageConfigured = Boolean(process.env.AZURE_STORAGE_CONNECTION_STRING || process.env.AZURE_STORAGE_ACCOUNT_NAME);

    const checks = {
        database: await checkDatabase(),
        azure: {
            monitoring: !featureMonitoring ? 'disabled' : azure.monitoring.isInitialized(),
            redis: !featureRedis ? 'disabled' : azure.redis.isConnected(),
            keyVault: azure.keyVault.isInitialized(),
            storage: azure.storage.isInitialized(),
            documentIntelligence: !featureAI ? 'disabled' : azure.documentIntelligence.isInitialized()
        },
        startup: {
            azureInitialized: Boolean(azureInitResults),
            azureInitResults: azureInitResults || null
        }
    };

    const isReady = checks.database === true
        && (!storageConfigured || checks.azure.storage === true)
        && (checks.azure.redis === true || checks.azure.redis === 'disabled')
        && (checks.azure.monitoring === true || checks.azure.monitoring === 'disabled')
        && (checks.azure.documentIntelligence === true || checks.azure.documentIntelligence === 'disabled');

    res.status(isReady ? 200 : 503).json({
        status: isReady ? 'ready' : 'not_ready',
        timestamp: new Date(),
        checks
    });
});

// API Routes
app.use('/api/v1/uploads', uploadRoutes);
app.use('/api/v1/ai', documentAIRoutes);
app.use('/api/v1/auth', authSyncRoutes);

// Error Handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Start Server
if (require.main === module) {
    // Initialize Azure services (non-fatal; readiness endpoint will surface status)
    azureInitPromise = azure.initializeAll()
        .then((results) => {
            azureInitResults = results;
            return results;
        })
        .catch((e) => {
            console.warn('Azure services initialization failed:', e.message);
            azureInitResults = { error: e.message };
            throw e;
        });

    const server = app.listen(PORT, () => {
        console.log(`🚀 Backend running on port ${PORT}`);
    });

    const shutdown = async () => {
        try {
            await azure.shutdownAll();
        } catch (e) {
            // ignore
        }
        server.close(() => process.exit(0));
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
}

module.exports = app;
