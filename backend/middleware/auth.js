const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

const { requireEnv } = require('../config/validateEnv');

function getJwtSecret() {
    return process.env.NODE_ENV === 'production'
        ? requireEnv('JWT_SECRET', { minLength: 32 })
        : requireEnv('JWT_SECRET', { minLength: 16 });
}

function getAzureConfig() {
    const tenantId = process.env.AZURE_TENANT_ID || 'common';
    const clientId = process.env.AZURE_CLIENT_ID || process.env.AZURE_REVIT_CLIENT_ID;
    return {
        tenantId,
        clientId,
        issuer: `https://login.microsoftonline.com/${tenantId}/v2.0`,
        jwksUri: `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`
    };
}

const jwks = jwksClient({
    jwksUri: getAzureConfig().jwksUri,
    cache: true,
    cacheMaxAge: 600000,
    rateLimit: true,
    jwksRequestsPerMinute: 10
});

function getSigningKey(header, callback) {
    jwks.getSigningKey(header.kid, (err, key) => {
        if (err) return callback(err);
        callback(null, key.getPublicKey());
    });
}

function mapAzureClaimsToUser(claims) {
    const userId = claims.oid || claims.sub;
    return {
        userId,
        azureObjectId: userId,
        tenantId: claims.tid,
        email: claims.preferred_username || claims.email || claims.upn || null,
        name: claims.name || null,
        firstName: claims.given_name || null,
        lastName: claims.family_name || null,
        roles: Array.isArray(claims.roles) ? claims.roles : [],
        role: Array.isArray(claims.roles) && claims.roles.length ? claims.roles[0] : (claims.role || null),
        claims
    };
}

async function verifyAzureBearer(token) {
    const { issuer, clientId } = getAzureConfig();
    if (!clientId) {
        const err = new Error('AZURE_CLIENT_ID is required to validate Entra tokens');
        err.name = 'AzureClientIdMissing';
        throw err;
    }

    return await new Promise((resolve, reject) => {
        jwt.verify(
            token,
            getSigningKey,
            {
                algorithms: ['RS256'],
                issuer: [issuer, `https://sts.windows.net/${process.env.AZURE_TENANT_ID || 'common'}/`],
                audience: clientId
            },
            (err, decoded) => {
                if (err) return reject(err);
                resolve(decoded);
            }
        );
    });
}

/**
 * Middleware to authenticate JWT token from Authorization header
 * Sets req.user with decoded token payload
 */
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    // First attempt: validate as Azure Entra ID bearer token (RS256 + JWKS)
    verifyAzureBearer(token)
        .then((claims) => {
            req.user = mapAzureClaimsToUser(claims);
            next();
        })
        .catch(() => {
            // Fallback: validate as app-issued JWT (HS* secret)
            try {
                const decoded = jwt.verify(token, getJwtSecret());
                req.user = decoded;
                next();
            } catch (err) {
                // Return 403 (Forbidden) for invalid tokens, but don't crash
                const message = err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
                return res.status(403).json({ error: message });
            }
        });
}

/**
 * Role-Based Authorization Middleware
 * Verifies that the authenticated user has one of the required roles.
 * Must be used after authenticateToken middleware.
 *
 * @param {...string} roles - List of allowed roles (e.g., 'Admin', 'Supplier', 'Buyer')
 * @returns {Function} Express middleware function
 */
/**
 * Role-Based Authorization Middleware
 * Verifies that the authenticated user has one of the required roles.
 */
function authorizeRoles(...roles) {
    return (req, res, next) => {
        // Ensure user is authenticated
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const userRole = req.user.role;
        const userRoles = Array.isArray(req.user.roles) ? req.user.roles : [];
        const allowed = roles.includes(userRole) || roles.some((r) => userRoles.includes(r));

        // Check if user has one of the required roles
        if (!allowed) {
            // Log unauthorized access attempt for security auditing
            console.warn(`[Auth] Access denied for user ${req.user.userId || 'unknown'} (Role: ${userRole}) to ${req.originalUrl}. Required: ${roles.join(', ')}`);

            return res.status(403).json({
                error: `Access denied. Required roles: ${roles.join(', ')}`
            });
        }

        next();
    };
}

module.exports = {
    authenticateToken,
    authorizeRoles,
    getJwtSecret
};
