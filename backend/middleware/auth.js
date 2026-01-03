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
        console.error('Token verification failed:', err.message);
        return res.status(403).json({ error: 'Invalid or expired token' });
    }
}

/**
 * Middleware to authorize specific roles
 * Must be used after authenticateToken
 * @param {...string} roles - Allowed roles (e.g., 'Admin', 'Supplier')
 */
function authorizeRoles(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        if (!roles.includes(req.user.role)) {
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
