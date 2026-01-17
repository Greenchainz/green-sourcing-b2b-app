const morgan = require('morgan');

/**
 * Logger Middleware
 * Uses morgan for HTTP request logging
 */

// Define custom format or use standard 'dev'/'combined'
const logFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';

// Skip health checks to keep logs clean
const skip = (req, res) => {
    return req.path === '/health' || req.path === '/ready' || req.path === '/diagnose';
};

const requestLogger = morgan(logFormat, { skip });

module.exports = requestLogger;
