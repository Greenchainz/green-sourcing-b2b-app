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
const rfqSimulatorRoutes = require('./routes/rfq-simulator');

// Middleware
const rateLimit = require('./middleware/rateLimit');

const app = express();
const PORT = process.env.PORT || 3001;

// Security & Basic Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000', // Default to Next.js port
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

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

// API Routes
app.use('/api/v1/uploads', uploadRoutes);
app.use('/api/v1/ai', documentAIRoutes);
app.use('/api/v1/auth', authSyncRoutes);
app.use('/api/v1/rfq-simulator', rfqSimulatorRoutes);

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

module.exports = app;
