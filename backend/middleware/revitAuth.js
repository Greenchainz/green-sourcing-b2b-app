/**
 * Azure Entra ID Authentication Middleware for Revit Plugin
 * 
 * This middleware validates Azure Entra ID tokens from the Revit add-in.
 * The Revit plugin authenticates via MSAL and sends the access token.
 * 
 * Flow:
 * 1. Revit plugin authenticates user via Azure Entra ID (MSAL)
 * 2. Plugin sends access token in Authorization header
 * 3. This middleware validates the token against Azure Entra ID
 * 4. If valid, attaches user info to request and continues
 */

const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const { pool } = require('../db');
const redis = require('../services/azure/redis');

// Azure Entra ID configuration
const AZURE_TENANT_ID = process.env.AZURE_TENANT_ID || 'common';
const AZURE_CLIENT_ID = process.env.AZURE_REVIT_CLIENT_ID || process.env.AZURE_CLIENT_ID;
const AZURE_ISSUER = `https://login.microsoftonline.com/${AZURE_TENANT_ID}/v2.0`;
const AZURE_JWKS_URI = `https://login.microsoftonline.com/${AZURE_TENANT_ID}/discovery/v2.0/keys`;

// JWKS client for fetching Azure signing keys
const jwks = jwksClient({
    jwksUri: AZURE_JWKS_URI,
    cache: true,
    cacheMaxAge: 600000, // 10 minutes
    rateLimit: true,
    jwksRequestsPerMinute: 10
});

/**
 * Get signing key from Azure JWKS
 */
function getSigningKey(header, callback) {
    jwks.getSigningKey(header.kid, (err, key) => {
        if (err) {
            return callback(err);
        }
        const signingKey = key.getPublicKey();
        callback(null, signingKey);
    });
}

/**
 * Verify Azure Entra ID token
 * @param {string} token - The access token from Revit plugin
 * @returns {Promise<object>} - Decoded token claims
 */
async function verifyAzureToken(token) {
    return new Promise((resolve, reject) => {
        jwt.verify(
            token,
            getSigningKey,
            {
                algorithms: ['RS256'],
                issuer: [AZURE_ISSUER, `https://sts.windows.net/${AZURE_TENANT_ID}/`],
                audience: AZURE_CLIENT_ID
            },
            (err, decoded) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(decoded);
                }
            }
        );
    });
}

/**
 * Middleware: Authenticate Revit Plugin requests via Azure Entra ID
 * 
 * Expected headers:
 * - Authorization: Bearer <azure_access_token>
 * - X-Plugin-Instance-ID: <unique_plugin_id> (optional, for registration)
 * - X-Revit-Version: <revit_version> (optional)
 * - X-Plugin-Version: <plugin_version> (optional)
 */
async function authenticateRevitPlugin(req, res, next) {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                error: 'ACCESS_TOKEN_REQUIRED',
                message: 'Azure Entra ID access token required',
                code: 'REVIT_AUTH_001'
            });
        }

        // Verify Azure Entra ID token
        let claims;
        try {
            claims = await verifyAzureToken(token);
        } catch (tokenError) {
            console.error('[RevitAuth] Token verification failed:', tokenError.message);
            return res.status(401).json({
                error: 'INVALID_TOKEN',
                message: 'Invalid or expired Azure Entra ID token',
                code: 'REVIT_AUTH_002',
                details: process.env.NODE_ENV === 'development' ? tokenError.message : undefined
            });
        }

        // Extract user info from token claims
        const azureObjectId = claims.oid || claims.sub;
        const azureTenantId = claims.tid;
        const email = claims.preferred_username || claims.email || claims.upn;
        const name = claims.name;
        const firstName = claims.given_name;
        const lastName = claims.family_name;

        if (!azureObjectId) {
            return res.status(401).json({
                error: 'INVALID_TOKEN_CLAIMS',
                message: 'Token missing required claims (oid/sub)',
                code: 'REVIT_AUTH_003'
            });
        }

        // Look up or create user in database
        let user = await findOrCreateRevitUser({
            azureObjectId,
            azureTenantId,
            email,
            name,
            firstName,
            lastName
        });

        // Attach to request
        req.revitAuth = {
            claims,
            azureObjectId,
            azureTenantId,
            email,
            user,
            pluginInstanceId: req.headers['x-plugin-instance-id'],
            revitVersion: req.headers['x-revit-version'],
            pluginVersion: req.headers['x-plugin-version']
        };

        next();
    } catch (error) {
        console.error('[RevitAuth] Authentication error:', error);
        return res.status(500).json({
            error: 'AUTH_ERROR',
            message: 'Authentication failed',
            code: 'REVIT_AUTH_500'
        });
    }
}

/**
 * Find or create user based on Azure Entra ID
 */
async function findOrCreateRevitUser({ azureObjectId, azureTenantId, email, name, firstName, lastName }) {
    const client = await pool.connect();
    try {
        // Try to find existing user by Azure ID or email
        let result = await client.query(
            `SELECT UserID, Email, FirstName, LastName, Role, CompanyID 
             FROM Users 
             WHERE OAuthID = $1 OR (Email = $2 AND Email IS NOT NULL)
             LIMIT 1`,
            [azureObjectId, email]
        );

        if (result.rows.length > 0) {
            const user = result.rows[0];
            
            // Update Azure ID if not set
            if (!user.OAuthID) {
                await client.query(
                    `UPDATE Users 
                     SET OAuthProvider = 'azure', OAuthID = $1, LastLogin = NOW(), UpdatedAt = NOW()
                     WHERE UserID = $2`,
                    [azureObjectId, user.userid]
                );
            } else {
                // Just update last login
                await client.query(
                    `UPDATE Users SET LastLogin = NOW(), UpdatedAt = NOW() WHERE UserID = $1`,
                    [user.userid]
                );
            }

            return {
                id: user.userid,
                email: user.email,
                firstName: user.firstname,
                lastName: user.lastname,
                role: user.role,
                companyId: user.companyid
            };
        }

        // Create new user
        result = await client.query(
            `INSERT INTO Users (Email, FirstName, LastName, FullName, Role, OAuthProvider, OAuthID, LastLogin, CreatedAt, UpdatedAt)
             VALUES ($1, $2, $3, $4, 'Buyer', 'azure', $5, NOW(), NOW(), NOW())
             RETURNING UserID, Email, FirstName, LastName, Role`,
            [email, firstName, lastName, name, azureObjectId]
        );

        const newUser = result.rows[0];
        return {
            id: newUser.userid,
            email: newUser.email,
            firstName: newUser.firstname,
            lastName: newUser.lastname,
            role: newUser.role,
            companyId: null
        };
    } finally {
        client.release();
    }
}

/**
 * Middleware: Validate plugin registration
 * Must be used after authenticateRevitPlugin
 */
async function requirePluginRegistration(req, res, next) {
    try {
        if (!req.revitAuth) {
            return res.status(401).json({
                error: 'AUTH_REQUIRED',
                message: 'Authentication required',
                code: 'REVIT_REG_001'
            });
        }

        const pluginInstanceId = req.revitAuth.pluginInstanceId;
        if (!pluginInstanceId) {
            return res.status(400).json({
                error: 'PLUGIN_ID_REQUIRED',
                message: 'X-Plugin-Instance-ID header required',
                code: 'REVIT_REG_002'
            });
        }

        // Check if plugin is registered and active
        const result = await pool.query(
            `SELECT RegistrationID, IsActive, RevitVersion, PluginVersion
             FROM Revit_Plugin_Registrations
             WHERE PluginInstanceID = $1 AND AzureEntraObjectID = $2`,
            [pluginInstanceId, req.revitAuth.azureObjectId]
        );

        if (result.rows.length === 0) {
            return res.status(403).json({
                error: 'PLUGIN_NOT_REGISTERED',
                message: 'Plugin not registered. Call POST /integrations/revit/v1/register first.',
                code: 'REVIT_REG_003'
            });
        }

        const registration = result.rows[0];
        if (!registration.isactive) {
            return res.status(403).json({
                error: 'PLUGIN_DEACTIVATED',
                message: 'Plugin registration has been deactivated',
                code: 'REVIT_REG_004'
            });
        }

        req.revitAuth.registration = {
            id: registration.registrationid,
            revitVersion: registration.revitversion,
            pluginVersion: registration.pluginversion
        };

        // Update heartbeat
        pool.query(
            `UPDATE Revit_Plugin_Registrations SET LastHeartbeatAt = NOW() WHERE RegistrationID = $1`,
            [registration.registrationid]
        ).catch(err => console.error('[RevitAuth] Heartbeat update failed:', err.message));

        next();
    } catch (error) {
        console.error('[RevitAuth] Registration check error:', error);
        return res.status(500).json({
            error: 'REGISTRATION_CHECK_ERROR',
            message: 'Failed to verify plugin registration',
            code: 'REVIT_REG_500'
        });
    }
}

/**
 * Middleware: Require active session
 * Must be used after requirePluginRegistration
 */
async function requireActiveSession(req, res, next) {
    try {
        const sessionToken = req.headers['x-session-token'];
        if (!sessionToken) {
            return res.status(400).json({
                error: 'SESSION_TOKEN_REQUIRED',
                message: 'X-Session-Token header required',
                code: 'REVIT_SESSION_001'
            });
        }

        const result = await pool.query(
            `SELECT SessionID, ProjectID, Status, ProjectName
             FROM Revit_Sessions
             WHERE SessionToken = $1 AND RegistrationID = $2 AND Status = 'active'`,
            [sessionToken, req.revitAuth.registration.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'SESSION_NOT_FOUND',
                message: 'Active session not found. Start a new session.',
                code: 'REVIT_SESSION_002'
            });
        }

        const session = result.rows[0];
        req.revitAuth.session = {
            id: session.sessionid,
            projectId: session.projectid,
            projectName: session.projectname,
            status: session.status
        };

        // Update activity timestamp
        pool.query(
            `UPDATE Revit_Sessions SET LastActivityAt = NOW() WHERE SessionID = $1`,
            [session.sessionid]
        ).catch(err => console.error('[RevitAuth] Session activity update failed:', err.message));

        next();
    } catch (error) {
        console.error('[RevitAuth] Session check error:', error);
        return res.status(500).json({
            error: 'SESSION_CHECK_ERROR',
            message: 'Failed to verify session',
            code: 'REVIT_SESSION_500'
        });
    }
}

/**
 * Revit API Rate Limiting Configuration
 * 100 requests per minute per session
 */
const REVIT_RATE_LIMIT = {
    windowSeconds: 60,
    maxRequests: 100
};

/**
 * Middleware: Revit-specific rate limiting
 * Rate limits based on session token (100 req/min per session)
 * Falls back to plugin instance ID if no session
 */
async function revitRateLimit(req, res, next) {
    // Skip if Redis not connected (fail open)
    if (!redis.isConnected()) {
        return next();
    }

    try {
        // Determine the rate limit key - prefer session token, fallback to plugin instance
        let identifier;
        
        if (req.revitAuth?.session?.id) {
            identifier = `revit:session:${req.revitAuth.session.id}`;
        } else if (req.headers['x-session-token']) {
            identifier = `revit:session:${req.headers['x-session-token']}`;
        } else if (req.revitAuth?.registration?.id) {
            identifier = `revit:reg:${req.revitAuth.registration.id}`;
        } else if (req.headers['x-plugin-instance-id']) {
            identifier = `revit:plugin:${req.headers['x-plugin-instance-id']}`;
        } else {
            // Fallback to IP
            identifier = `revit:ip:${req.ip || req.connection?.remoteAddress}`;
        }

        const result = await redis.rateLimit(
            identifier, 
            REVIT_RATE_LIMIT.maxRequests, 
            REVIT_RATE_LIMIT.windowSeconds
        );

        // Set rate limit headers
        res.set('X-RateLimit-Limit', REVIT_RATE_LIMIT.maxRequests);
        res.set('X-RateLimit-Remaining', result.remaining);
        res.set('X-RateLimit-Reset', Math.ceil(Date.now() / 1000) + result.resetIn);

        if (!result.allowed) {
            res.set('Retry-After', result.resetIn);
            return res.status(429).json({
                error: 'RATE_LIMIT_EXCEEDED',
                message: 'Revit API rate limit exceeded (100 requests/minute)',
                code: 'REVIT_RATE_429',
                retryAfter: result.resetIn
            });
        }

        next();
    } catch (error) {
        // Fail open on errors
        console.warn('[RevitAuth] Rate limit check failed:', error.message);
        next();
    }
}

/**
 * Create rate limiter with custom configuration
 * @param {Object} options - Custom rate limit options
 * @param {number} options.maxRequests - Max requests per window (default: 100)
 * @param {number} options.windowSeconds - Window size in seconds (default: 60)
 */
function createRevitRateLimiter(options = {}) {
    const config = {
        windowSeconds: options.windowSeconds || REVIT_RATE_LIMIT.windowSeconds,
        maxRequests: options.maxRequests || REVIT_RATE_LIMIT.maxRequests
    };

    return async (req, res, next) => {
        if (!redis.isConnected()) {
            return next();
        }

        try {
            const identifier = req.revitAuth?.session?.id 
                ? `revit:session:${req.revitAuth.session.id}`
                : `revit:plugin:${req.headers['x-plugin-instance-id'] || req.ip}`;

            const result = await redis.rateLimit(identifier, config.maxRequests, config.windowSeconds);

            res.set('X-RateLimit-Limit', config.maxRequests);
            res.set('X-RateLimit-Remaining', result.remaining);
            res.set('X-RateLimit-Reset', Math.ceil(Date.now() / 1000) + result.resetIn);

            if (!result.allowed) {
                res.set('Retry-After', result.resetIn);
                return res.status(429).json({
                    error: 'RATE_LIMIT_EXCEEDED',
                    message: `Rate limit exceeded (${config.maxRequests} requests/${config.windowSeconds}s)`,
                    code: 'REVIT_RATE_429',
                    retryAfter: result.resetIn
                });
            }

            next();
        } catch (error) {
            console.warn('[RevitAuth] Rate limit check failed:', error.message);
            next();
        }
    };
}

module.exports = {
    authenticateRevitPlugin,
    requirePluginRegistration,
    requireActiveSession,
    verifyAzureToken,
    revitRateLimit,
    createRevitRateLimiter,
    REVIT_RATE_LIMIT
};
