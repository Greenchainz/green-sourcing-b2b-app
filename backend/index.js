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
const authRoutes = require('./routes/auth');
const rfqRoutes = require('./routes/rfqs');

// Middleware
const rateLimit = require('./middleware/rateLimit');
const { validateRequiredEnv } = require('./config/validateEnv');
const { buildSessionMiddleware } = require('./middleware/session');
const redisCache = require('./services/azure/redis');

const app = express();
const PORT = process.env.PORT || 3001;

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
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(cookieParser());
    app.use(sessionMiddleware);

    // Lusca (Security)
    app.use(lusca.xframe('SAMEORIGIN'));
    app.use(lusca.xssProtection(true));

    // Rate Limiting
    if (rateLimit && rateLimit.general) {
        app.use('/api/', rateLimit.general);
    }

    // Health Check
    app.get('/health', async (req, res) => {
        res.json({
            status: 'ok',
            timestamp: new Date(),
            redis: redisClient ? (await redisCache.pingSafe()) : 'not_configured'
        });
    });

    // API Routes
    app.use('/api/v1/uploads', uploadRoutes);
    app.use('/api/v1/ai', documentAIRoutes);
    app.use('/api/v1/auth', authRoutes);
    app.use('/api/v1/rfqs', rfqRoutes);

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
        app.listen(PORT, () => {
            console.log(`🚀 Backend running on port ${PORT}`);
        });
    }
}

start().catch((e) => {
    console.error('❌ Backend failed to start:', e.message);
    process.exit(1);
});

module.exports = app;
