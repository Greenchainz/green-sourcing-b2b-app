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

module.exports = {
    authenticateRevitPlugin,
    requirePluginRegistration,
    requireActiveSession,
    verifyAzureToken
};
