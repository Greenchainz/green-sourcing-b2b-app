const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const { pool } = require('./db');

// Load environment variables
dotenv.config();

// Initialize Express
const app = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ============================================
// MIDDLEWARE
// ============================================

// Security headers
app.use(helmet());

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Request logging
app.use(morgan(NODE_ENV === 'production' ? 'combined' : 'dev'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));



app.get('/health', async (req, res) => {
  try {
    // Test database connection
    const result = await pool.query('SELECT NOW()');
    res.status(200).json({
      status: 'ok',
      service: 'greenchainz-backend',
      environment: NODE_ENV,
      timestamp: new Date().toISOString(),
      database: result.rows[0] ? 'connected' : 'disconnected',
      uptime: process.uptime(),
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      service: 'greenchainz-backend',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Liveness probe (Kubernetes/Container Apps)
app.get('/live', (req, res) => {
  res.status(200).send('alive');
});

// Readiness probe (Kubernetes/Container Apps)
app.get('/ready', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).send('ready');
  } catch (error) {
    res.status(503).send('not ready');
  }
});

// ============================================
// API ROUTES
// ============================================

// Import route handlers
try {
  const authRoutes = require('./routes/auth');
  const uploadRoutes = require('./routes/uploads');
  const documentAIRoutes = require('./routes/documentAI');
  const rfqRoutes = require('./routes/rfqs');
  
  // Mount routes - auth is not nested under /v1 because login needs to be accessible
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/uploads', uploadRoutes);
  app.use('/api/v1/ai', documentAIRoutes);
  app.use('/api/v1/rfqs', rfqRoutes);
  
  console.log('✅ All route modules loaded successfully');
} catch (err) {
  console.warn('⚠️ Warning - some route modules failed to load:', err.message);
}

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
    method: req.method,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ============================================
// SERVER STARTUP
// ============================================

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`
🚀 GreenChainz Backend Started`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📍 Environment: ${NODE_ENV}`);
  console.log(`🔌 Port: ${PORT}`);
  console.log(`🗄️  Database: ${process.env.POSTGRES_HOST}`);
  console.log(`🌐 CORS Origin: ${process.env.FRONTEND_URL}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`✅ Ready to accept requests\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    pool.end(() => {
      console.log('Database pool closed');
      process.exit(0);
    });
  });
});

module.exports = { app, pool };
