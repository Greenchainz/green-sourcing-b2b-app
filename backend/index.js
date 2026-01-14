const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const lusca = require("lusca");
const cookieParser = require("cookie-parser");
const path = require("path");
require("dotenv").config();

// Routes
const uploadRoutes = require("./routes/uploads");
const documentAIRoutes = require("./routes/documentAI");
// const authSyncRoutes = require('./routes/auth-sync'); // TODO: Implement auth-sync routes
const rfqSimulatorRoutes = require("./routes/rfq-simulator");
const authRoutes = require("./routes/auth");
const oauthRoutes = require("./routes/oauth");
const rfqRoutes = require("./routes/rfqs");
const rfqApiRoutes = require("./routes/rfq-api");
const shadowSupplierRoutes = require("./routes/shadow-suppliers");
const aiGatewayRoutes = require("./routes/ai-gateway");
const buyerVerificationRoutes = require("./routes/buyerVerification");
const materialsRoutes = require("./routes/materials");
const aiAgentsRoutes = require("./routes/ai-agents");
const supplierRoutes = require("./routes/suppliers");

// AI Gateway
const aiGateway = require("./services/ai-gateway");
const revitRoutes = require("./routes/revit");
const scoringRoutes = require("./routes/scoring");
const subscriptionRoutes = require("./routes/subscriptions");

// Middleware
const rateLimit = require("./middleware/rateLimit");
const { validateRequiredEnv } = require("./config/validateEnv");
const { buildSessionMiddleware } = require("./middleware/session");
const redisCache = require("./services/azure/redis");
const { pool } = require("./db");
const passport = require("./config/passport");

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
  const defaultAllowedOrigins = ["http://localhost:3000"];
  const configuredOriginsRaw =
    process.env.FRONTEND_URLS || process.env.FRONTEND_URL || "";
  const configuredAllowedOrigins = configuredOriginsRaw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  
  // Add Azure Container Apps frontend URL pattern (dynamic subdomains)
  const azureContainerAppsPattern = /^https:\/\/.*\.azurecontainerapps\.io$/;
  const greenchainzDomains = [
    "https://greenchainz.com",
    "https://www.greenchainz.com",
  ];
  
  const allowedOrigins = new Set([
    ...defaultAllowedOrigins,
    ...configuredAllowedOrigins,
    ...greenchainzDomains,
  ]);

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow same-origin, server-to-server, and health checks with no Origin header
        if (!origin) return callback(null, true);

        // Check exact match first
        if (allowedOrigins.has(origin)) return callback(null, true);

        // Allow Azure Container Apps subdomains (for frontend container app)
        if (azureContainerAppsPattern.test(origin)) {
          return callback(null, true);
        }

        return callback(new Error(`CORS blocked for origin: ${origin}`));
      },
      credentials: true,
    })
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));
  app.use(cookieParser());
  app.use(sessionMiddleware);

  // Initialize Passport for OAuth
  app.use(passport.initialize());
  app.use(passport.session());

  // Security Headers (Helmet + Lusca)
  // Configure CSP to allow required third-party scripts (Stripe only)
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            "'unsafe-inline'",
            "'unsafe-eval'", // Required for some third-party scripts
            "https://js.stripe.com",
            "https://m.stripe.network",
          ],
          styleSrc: [
            "'self'",
            "'unsafe-inline'",
            "https://fonts.googleapis.com",
          ],
          fontSrc: [
            "'self'",
            "https://fonts.gstatic.com",
          ],
          imgSrc: [
            "'self'",
            "data:",
            "https:",
          ],
          connectSrc: [
            "'self'",
            "https://api.stripe.com",
          ],
          frameSrc: [
            "'self'",
            "https://js.stripe.com",
            "https://hooks.stripe.com",
          ],
        },
      },
      crossOriginEmbedderPolicy: false, // Disable CEP to allow third-party widgets
    })
  );
  app.use(lusca.xframe("SAMEORIGIN"));
  app.use(lusca.xssProtection(true));
  
  // CSRF protection - API routes use JWT tokens (not session-based), so CSRF not needed
  // NOTE: lusca 1.7.0 does NOT support excludePathPrefixes option - must exclude manually
  // Apply CSRF conditionally: skip for API routes, auth routes, health checks, and GET requests
  const csrfMiddleware = lusca.csrf({
    cookie: {
      name: '_csrf',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'strict'
    }
  });
  
  app.use((req, res, next) => {
    // Define paths that should NOT have CSRF protection
    // NOTE: Most API routes use JWT authentication, so CSRF not needed
    // EXCEPTION: /api/v1/csrf-token needs CSRF middleware to generate tokens
    const excludedPaths = [
      '/api/v1/auth',     // Auth routes (use JWT)
      '/api/v1/ai',       // AI routes (use JWT)
      '/api/v1/rfqs',     // RFQ routes (use JWT)
      '/api/v1/uploads',  // Upload routes (use JWT)
      '/api/v1/verification', // Verification routes (use JWT)
      '/api/v1/subscriptions', // Subscription routes (use JWT)
      '/api/v1/scoring',  // Scoring routes (use JWT)
      '/api/internal',    // Internal API routes (use INTERNAL_API_KEY)
      '/api/integrations', // Integration routes (use JWT)
      '/api/webhooks',    // Webhook routes (use webhook signatures)
      '/auth/',           // OAuth callbacks (use OAuth flow)
      '/health',          // Health checks (no auth)
      '/ready',           // Readiness checks (no auth)
      '/diagnose'         // Diagnostics (no auth)
    ];
    
    // Special case: /api/v1/csrf-token NEEDS CSRF middleware to generate tokens
    // This endpoint is handled separately with explicit CSRF middleware application
    // So we skip it here to avoid double-application
    if (req.path === '/api/v1/csrf-token') {
      return next();
    }
    
    // Check if current path should be excluded (exact match or starts with)
    const isExcluded = excludedPaths.some(path => req.path.startsWith(path));
    
    // Skip CSRF for excluded paths
    if (isExcluded) {
      return next();
    }
    
    // For GET/OPTIONS/HEAD requests to non-excluded paths, skip CSRF check
    // CSRF tokens are typically needed for state-changing methods only
    if (req.method === 'GET' || req.method === 'OPTIONS' || req.method === 'HEAD') {
      return next();
    }
    
    // Apply CSRF protection only to state-changing methods (POST, PUT, DELETE, PATCH)
    // on non-excluded paths
    return csrfMiddleware(req, res, next);
  });



  // Rate Limiting
  if (rateLimit && rateLimit.general) {
    app.use("/api/", rateLimit.general);
  }

  // ============================================
  // HEALTH & READINESS ENDPOINTS
  // ============================================

  // Root route: browsers hitting the API app should be redirected to the frontend
  app.get("/", (req, res) => {
    const configuredOriginsRaw =
      process.env.FRONTEND_URLS || process.env.FRONTEND_URL || "";
    const preferredFrontendUrl = configuredOriginsRaw
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)[0];

    if (preferredFrontendUrl) {
      return res.redirect(302, preferredFrontendUrl.replace(/\/$/, ""));
    }

    return res.status(200).json({
      status: "ok",
      service: "greenchainz-backend",
      message: "API server is running. Use /api/v1/* endpoints.",
    });
  });

  /**
   * Health Check - Basic liveness probe with full diagnostics
   * Returns 200 if the server is running, 503 if critical services unavailable
   * Includes diagnostic info to help troubleshoot deployment issues
   */
  app.get("/health", rateLimit.health, async (req, res) => {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      nodeVersion: process.version,
      environment: process.env.NODE_ENV,
      services: {},
      envVars: {
        required: {},
        conditional: {},
      },
      errors: [],
    };

    try {
      // Check critical environment variables
      const requiredEnvVars = ['JWT_SECRET', 'SESSION_SECRET', 'COOKIE_SECRET', 'FRONTEND_URL', 'DATABASE_URL'];
      for (const envVar of requiredEnvVars) {
        diagnostics.envVars.required[envVar] = {
          set: !!process.env[envVar],
          length: process.env[envVar]?.length || 0,
        };
        if (!process.env[envVar]) {
          diagnostics.errors.push(`Missing required env var: ${envVar}`);
        }
      }

      // Check optional/conditional env vars
      const conditionalEnvVars = ['REDIS_HOST', 'REDIS_PASSWORD', 'AZURE_CLIENT_ID', 'DATABASE_URL'];
      for (const envVar of conditionalEnvVars) {
        diagnostics.envVars.conditional[envVar] = !!process.env[envVar];
      }

      // Check database connection
      try {
        const dbResult = await pool.query("SELECT 1");
        diagnostics.services.database = {
          status: "connected",
          timestamp: new Date().toISOString(),
        };
      } catch (dbErr) {
        diagnostics.services.database = {
          status: "failed",
          error: dbErr.message,
          code: dbErr.code,
        };
        diagnostics.errors.push(`Database connection failed: ${dbErr.message}`);
      }

      // Check Redis if configured
      if (redisClient) {
        try {
          const redisPing = await redisCache.pingSafe();
          diagnostics.services.redis = {
            status: "connected",
            ping: redisPing,
          };
        } catch (redisErr) {
          diagnostics.services.redis = {
            status: "failed",
            error: redisErr.message,
          };
          diagnostics.errors.push(`Redis connection failed: ${redisErr.message}`);
        }
      } else {
        diagnostics.services.redis = { status: "not_configured" };
      }

      // Determine overall health
      const hasCriticalErrors = diagnostics.errors.filter(e =>
        e.includes('Database') || e.includes('required env var')
      ).length > 0;

      res.status(hasCriticalErrors ? 503 : 200).json({
        status: hasCriticalErrors ? "unhealthy" : "healthy",
        ...diagnostics,
      });
    } catch (e) {
      diagnostics.errors.push(`Health check error: ${e.message}`);
      res.status(503).json({
        status: "unhealthy",
        ...diagnostics,
      });
    }
  });

  /**
   * Diagnostic endpoint - Simple text output for quick troubleshooting
   * Shows what's missing in plain English
   */
  app.get("/diagnose", rateLimit.health, async (req, res) => {
    const lines = [];
    lines.push("=== GreenChainz Backend Diagnostics ===");
    lines.push(`Timestamp: ${new Date().toISOString()}`);
    lines.push(`Node.js: ${process.version}`);
    lines.push(`Environment: ${process.env.NODE_ENV}`);
    lines.push(`Uptime: ${Math.round(process.uptime())}s`);
    lines.push("");

    lines.push("REQUIRED ENVIRONMENT VARIABLES:");
    const requiredVars = ['JWT_SECRET', 'SESSION_SECRET', 'COOKIE_SECRET', 'FRONTEND_URL', 'DATABASE_URL'];
    for (const v of requiredVars) {
      const isSet = !!process.env[v];
      lines.push(`  ${isSet ? '✅' : '❌'} ${v}`);
    }
    lines.push("");

    lines.push("OPTIONAL ENVIRONMENT VARIABLES:");
    const optionalVars = ['REDIS_HOST', 'REDIS_PASSWORD', 'AZURE_CLIENT_ID', 'AZURE_TENANT_ID'];
    for (const v of optionalVars) {
      const isSet = !!process.env[v];
      lines.push(`  ${isSet ? '✅' : '⚫'} ${v}`);
    }
    lines.push("");

    lines.push("SERVICES:");
    // Test database
    try {
      await pool.query("SELECT 1");
      lines.push("  ✅ Database (PostgreSQL): Connected");
    } catch (e) {
      lines.push(`  ❌ Database (PostgreSQL): ${e.message}`);
      lines.push(`     Connection string: ${process.env.DATABASE_URL ? 'SET' : 'NOT SET'}`);
    }

    // Test Redis
    if (redisClient) {
      try {
        await redisCache.pingSafe();
        lines.push("  ✅ Redis Cache: Connected");
      } catch (e) {
        lines.push(`  ❌ Redis Cache: ${e.message}`);
      }
    } else {
      lines.push("  ⚫ Redis Cache: Not configured");
    }

    lines.push("");
    lines.push("KEY VAULT SECRETS STATUS:");
    const secrets = ['AzureAD-ClientId', 'AzureAD-ClientSecret', 'AzureAD-TenantId', 'jwt-secret', 'cookie-secret', 'session-secret', 'Database-URL', 'Redis-ConnectionString'];
    for (const s of secrets) {
      // We can't actually check Key Vault from here, but we can check if derived env var exists
      const envVarName = s.replace('AzureAD-', 'AZURE_').replace(/-/g, '_').toUpperCase();
      const isSet = !!process.env[envVarName];
      lines.push(`  ${isSet ? '✅' : '❌'} ${s} → ${envVarName}`);
    }

    res.type('text/plain').send(lines.join('\n'));
  });

  /**
   * Readiness Check - Full dependency check
   * Returns 200 only if all critical dependencies are available
   * Used by orchestrators (K8s, Azure Container Apps) for traffic routing
   */
  app.get("/ready", rateLimit.health, async (req, res) => {
    const checks = {
      server: serverReady,
      database: false,
      redis: !redisClient || false, // Only required if configured
    };

    try {
      // Check database connection
      const dbResult = await pool.query("SELECT 1");
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
          status: "ready",
          timestamp: new Date().toISOString(),
          checks,
        });
      } else {
        res.status(503).json({
          status: "not_ready",
          timestamp: new Date().toISOString(),
          checks,
        });
      }
    } catch (e) {
      res.status(503).json({
        status: "not_ready",
        timestamp: new Date().toISOString(),
        checks,
        error: e.message,
      });
    }
  });

  // ============================================
  // CSRF TOKEN ENDPOINT
  // ============================================
  
  /**
   * GET /api/v1/csrf-token
   * Get CSRF token for authenticated users
   * This token must be included in state-changing requests (POST, PUT, DELETE)
   * 
   * CRITICAL: This endpoint MUST have CSRF middleware applied to generate tokens.
   * The conditional CSRF middleware at lines 169-214 should allow this through,
   * but we explicitly apply it here as well to ensure tokens are always populated.
   * For GET requests, lusca.csrf() generates and populates tokens without validating.
   */
  const { authenticateToken } = require("./middleware/auth");
  app.get("/api/v1/csrf-token", rateLimit.general, authenticateToken, (req, res, next) => {
    // CRITICAL: Ensure session exists for CSRF token generation
    // With saveUninitialized: false, we need to explicitly initialize the session
    // by touching it before CSRF middleware runs
    if (!req.session) {
      req.session = {};
    }
    // Touch session to ensure it's saved (required for saveUninitialized: false)
    req.session.csrfTokenRequested = true;
    
    // Explicitly apply CSRF middleware for this endpoint to ensure token generation
    // For GET requests, lusca.csrf() generates the token without validation
    // It stores the token in the session and populates res.locals._csrf
    return csrfMiddleware(req, res, (err) => {
      if (err) {
        // CSRF validation error - shouldn't happen for GET requests
        console.error('[CSRF Token] CSRF middleware error:', err.message);
        return res.status(500).json({ error: 'Failed to generate CSRF token', details: err.message });
      }
      
      // CSRF middleware should have populated res.locals._csrf for GET requests
      // Also check req.csrfToken() function which lusca provides
      let token = res.locals._csrf;
      
      if (!token && typeof req.csrfToken === 'function') {
        try {
          token = req.csrfToken();
        } catch (tokenErr) {
          console.warn('[CSRF Token] req.csrfToken() failed:', tokenErr.message);
        }
      }
      
      if (!token) {
        console.warn('[CSRF Token] Warning: CSRF token not populated by middleware');
        console.warn('[CSRF Token] Session ID:', req.sessionID);
        console.warn('[CSRF Token] Session exists:', !!req.session);
      }
      
      res.json({ 
        csrfToken: token || 'token-unavailable'
      });
    });
  });

  // ============================================
  // API ROUTES
  // ============================================

  // Public API routes
  app.use("/api/v1/uploads", uploadRoutes);
  app.use("/api/v1/ai", documentAIRoutes);
  app.use("/api/v1/auth", authRoutes);
  app.use("/auth", oauthRoutes);
  app.use("/api/v1/rfqs", rfqRoutes);
  app.use("/api/v2/rfq", rfqApiRoutes);
  app.use("/api/v1/verification", buyerVerificationRoutes);
  app.use("/api/v1/ai-gateway", aiGatewayRoutes);
  app.use("/api/v1/subscriptions", subscriptionRoutes);
  app.use("/api/v1/materials", materialsRoutes);
  app.use("/api/v1/ai-agents", aiAgentsRoutes);
  app.use("/api/v1/suppliers", supplierRoutes);

  // Initialize AI Gateway
  aiGateway.initialize().catch((err) => {
    console.warn("⚠️  AI Gateway initialization warning:", err.message);
  });
  app.use("/api/v1/scoring", scoringRoutes);

  // Integration APIs
  // Revit Integration - Azure Entra ID auth, project/material sync
  app.use("/api/integrations/revit/v1", revitRoutes);

  // Internal API routes (protected by INTERNAL_API_KEY)
  // RFQ Simulator - distribution engine, queue management, metrics
  app.use("/api/internal/simulator", rfqSimulatorRoutes);

  // Shadow Supplier routes - claim flow, ingestion, catalog
  app.use("/api/internal/shadow", shadowSupplierRoutes);

  // ============================================
  // ERROR HANDLING
  // ============================================

  // 404 handler
  app.use((req, res, next) => {
    res.status(404).json({
      error: "Not Found",
      path: req.path,
    });
  });

  // Global error handler
  app.use((err, req, res, next) => {
    console.error("Unhandled error:", err.stack);

    // Don't leak error details in production
    const isDev = process.env.NODE_ENV === "development";

    res.status(err.status || 500).json({
      error: err.status === 400 ? "Bad Request" : "Internal Server Error",
      message: isDev ? err.message : undefined,
      ...(isDev && { stack: err.stack }),
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
  console.error("❌ Backend failed to start:", e.message);
  process.exit(1);
});

module.exports = app;
