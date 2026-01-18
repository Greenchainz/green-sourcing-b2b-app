/**
 * Error Handling Middleware
 */

/**
 * 404 Not Found Middleware
 * Catch 404 and forward to error handler
 */
function notFound(req, res, next) {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    res.status(404);
    next(error);
}

/**
 * Global Error Handler Middleware
 */
function errorHandler(err, req, res, next) {
    // Set default status code if not set
    let statusCode = res.statusCode === 200 ? 500 : res.statusCode;

    // Check if error object has status code
    if (err.status) statusCode = err.status;
    if (err.statusCode) statusCode = err.statusCode;

    // Log the error
    console.error(`[Error] ${statusCode} - ${err.message}`);
    if (process.env.NODE_ENV !== 'production') {
        console.error(err.stack);
    }

    res.status(statusCode);

    // Structure the error response
    const isProduction = process.env.NODE_ENV === 'production';

    res.json({
        error: statusCode === 500 ? 'Internal Server Error' : err.message,
        message: isProduction && statusCode === 500 ? 'An unexpected error occurred' : err.message,
        stack: isProduction ? undefined : err.stack,
    });
}

module.exports = {
    notFound,
    errorHandler
};
