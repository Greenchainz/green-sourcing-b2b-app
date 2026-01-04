const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const lusca = require('lusca');
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config();

// Routes
const uploadRoutes = require('./routes/uploads');
const documentAIRoutes = require('./routes/documentAI');
const authSyncRoutes = require('./routes/auth-sync');
const rfqSimulatorRoutes = require('./routes/rfq-simulator');
const authRoutes = require('./routes/auth');
const rfqRoutes = require('./routes/rfqs');
const revitRoutes = require('./routes/revit');
const scoringRoutes = require('./routes/scoring');

// Middleware
const rateLimit = require('./middleware/rateLimit');
const { validateRequiredEnv } = require('./config/validateEnv');
const { buildSessionMiddleware } = require('./middleware/session');
const redisCache = require('./services/azure/redis');
const { pool } = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

// Track server readiness for health checks
let serverReady = false;

async function start() {
    // Fail fast before wiring anything
    validateRequiredEnv();

    // If Redis is configured, connect once and share for sessions/caching
    const redisClient = await redisCache.connectIfConfigured();

    const sessionMiddleware = buildSessionMiddleware({ redisClient });

    // Security & Basic Middleware
    app.use(cors({
        origin: process.env.FRONTEND_URL || 'http://localhost:3000', // Default to Next.js port
        credentials: true
    }));
    app.use(express.json({ limit: '1mb' }));
    app.use(express.urlencoded({ extended: true, limit: '1mb' }));
    app.use(cookieParser());
    app.use(sessionMiddleware);

    // Lusca (Security)
    app.use(lusca.xframe('SAMEORIGIN'));
    app.use(lusca.xssProtection(true));

    // Rate Limiting
    if (rateLimit && rateLimit.general) {
        app.use('/api/', rateLimit.general);
    }

    // ============================================
    // HEALTH & READINESS ENDPOINTS
    // ============================================

    /**
     * Health Check - Basic liveness probe
     * Returns 200 if the server is running
     */
    app.get('/health', async (req, res) => {
        try {
            const redisStatus = redisClient ? (await redisCache.pingSafe()) : 'not_configured';
            res.json({
                status: 'ok',
                timestamp: new Date().toISOString(),
                redis: redisStatus,
                uptime: process.uptime()
            });
        } catch (e) {
            res.status(503).json({
                status: 'degraded',
                timestamp: new Date().toISOString(),
                error: e.message
            });
        }
    });

    /**
     * Readiness Check - Full dependency check
     * Returns 200 only if all critical dependencies are available
     * Used by orchestrators (K8s, Azure Container Apps) for traffic routing
     */
    app.get('/ready', async (req, res) => {
        const checks = {
            server: serverReady,
            database: false,
            redis: !redisClient || false // Only required if configured
        };

        try {
            // Check database connection
            const dbResult = await pool.query('SELECT 1');
            checks.database = dbResult.rows.length > 0;

            // Check Redis if configured
            if (redisClient) {
                checks.redis = await redisCache.pingSafe();
            } else {
                checks.redis = true; // Not required
            }

            const allReady = checks.server && checks.database && checks.redis;

            if (allReady) {
                res.json({
                    status: 'ready',
                    timestamp: new Date().toISOString(),
                    checks
                });
            } else {
                res.status(503).json({
                    status: 'not_ready',
                    timestamp: new Date().toISOString(),
                    checks
                });
            }
        } catch (e) {
            res.status(503).json({
                status: 'not_ready',
                timestamp: new Date().toISOString(),
                checks,
                error: e.message
            });
        }
    });

    // ============================================
    // API ROUTES
    // ============================================

    // Public API routes
    app.use('/api/v1/uploads', uploadRoutes);
    app.use('/api/v1/ai', documentAIRoutes);
    app.use('/api/v1/auth', authRoutes);
    app.use('/api/v1/rfqs', rfqRoutes);
    app.use('/api/v1/scoring', scoringRoutes);

    // Integration APIs
    // Revit Integration - Azure Entra ID auth, project/material sync
    app.use('/api/integrations/revit/v1', revitRoutes);

    // Internal API routes (protected by INTERNAL_API_KEY)
    // RFQ Simulator - distribution engine, queue management, metrics
    app.use('/api/internal/simulator', rfqSimulatorRoutes);

    // ============================================
    // ERROR HANDLING
    // ============================================

    // 404 handler
    app.use((req, res, next) => {
        res.status(404).json({
            error: 'Not Found',
            path: req.path
        });
    });

    // Global error handler
    app.use((err, req, res, next) => {
        console.error('Unhandled error:', err.stack);
        
        // Don't leak error details in production
        const isDev = process.env.NODE_ENV === 'development';
        
        res.status(err.status || 500).json({
            error: err.status === 400 ? 'Bad Request' : 'Internal Server Error',
            message: isDev ? err.message : undefined,
            ...(isDev && { stack: err.stack })
        });
    });

    // Mark server as ready
    serverReady = true;

    // Start Server
    if (require.main === module) {
        app.listen(PORT, () => {
            console.log(`🚀 Backend running on port ${PORT}`);
            console.log(`   Health: http://localhost:${PORT}/health`);
            console.log(`   Ready:  http://localhost:${PORT}/ready`);
        });
    }
}

start().catch((e) => {
    console.error('❌ Backend failed to start:', e.message);
    process.exit(1);
});

module.exports = app;
