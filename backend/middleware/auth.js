const jwt = require('jsonwebtoken');

const { requireEnv } = require('../config/validateEnv');

function getJwtSecret() {
    return process.env.NODE_ENV === 'production'
        ? requireEnv('JWT_SECRET', { minLength: 32 })
        : requireEnv('JWT_SECRET', { minLength: 16 });
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

    try {
        const decoded = jwt.verify(token, getJwtSecret());
        req.user = decoded;
        next();
    } catch (err) {
        // Return 403 (Forbidden) for invalid tokens, but don't crash
        const message = err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
        return res.status(403).json({ error: message });
    }
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

        // Check if user has one of the required roles
        if (!roles.includes(req.user.role)) {
            // Log unauthorized access attempt for security auditing
            console.warn(`[Auth] Access denied for user ${req.user.userId || 'unknown'} (Role: ${req.user.role}) to ${req.originalUrl}. Required: ${roles.join(', ')}`);

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
