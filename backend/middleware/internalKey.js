const crypto = require('crypto');

/**
 * Middleware to validate INTERNAL_API_KEY
 * Uses timing-safe comparison.
 * Supports headers: 'x-internal-api-key' and 'x-internal-key'
 */
function requireInternalKey(req, res, next) {
    const apiKey = req.headers['x-internal-api-key'] || req.headers['x-internal-key'];
    const expectedKey = process.env.INTERNAL_API_KEY;

    // In production, strictly require the key to be set on server
    if (process.env.NODE_ENV === 'production' && !expectedKey) {
        console.error('FATAL: INTERNAL_API_KEY is not set in production');
        return res.status(500).json({ error: 'Server configuration error' });
    }

    // In dev, warn but allow if not set
    if (!expectedKey) {
        if (process.env.NODE_ENV !== 'test') {
             console.warn('WARNING: INTERNAL_API_KEY not set. Internal endpoints unprotected.');
        }
        return next();
    }

    if (!apiKey) {
        return res.status(401).json({ error: 'Unauthorized: Missing internal key' });
    }

    try {
        const expectedBuffer = Buffer.from(expectedKey);
        const providedBuffer = Buffer.from(apiKey);

        if (expectedBuffer.length !== providedBuffer.length) {
             return res.status(401).json({ error: 'Unauthorized: Invalid internal key' });
        }

        if (!crypto.timingSafeEqual(expectedBuffer, providedBuffer)) {
             return res.status(401).json({ error: 'Unauthorized: Invalid internal key' });
        }
    } catch (e) {
        // Catch Buffer.from errors or other crypto errors
        return res.status(401).json({ error: 'Unauthorized: Invalid internal key' });
    }

    next();
}

module.exports = requireInternalKey;
