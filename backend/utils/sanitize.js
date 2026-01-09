/**
 * Input Sanitization Utilities
 * 
 * Provides safe sanitization functions to prevent format string vulnerabilities
 * and other injection attacks.
 */

/**
 * Sanitize a string for safe logging and display
 * Removes format specifiers and control characters
 * 
 * @param {*} input - Input to sanitize
 * @returns {string} - Sanitized string safe for logging
 */
function sanitizeForLog(input) {
    // Handle null/undefined
    if (input === null || input === undefined) {
        return 'null';
    }
    
    // Convert to string
    let str = String(input);
    
    // Truncate very long strings (prevent log flooding)
    if (str.length > 1000) {
        str = str.substring(0, 1000) + '... (truncated)';
    }
    
    // Remove format specifiers that could be exploited
    // %s, %d, %x, %n, etc.
    str = str.replace(/%[sdxnifgpoec]/gi, '');
    
    // Remove control characters (except newline and tab for readability)
    str = str.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
    
    return str;
}

/**
 * Sanitize an object for safe logging
 * Recursively sanitizes all string values
 * 
 * @param {*} obj - Object to sanitize
 * @param {number} depth - Current recursion depth
 * @returns {*} - Sanitized object
 */
function sanitizeObjectForLog(obj, depth = 0) {
    // Prevent infinite recursion
    if (depth > 5) {
        return '[Max Depth Reached]';
    }
    
    // Handle primitives
    if (obj === null || obj === undefined) {
        return obj;
    }
    
    if (typeof obj === 'string') {
        return sanitizeForLog(obj);
    }
    
    if (typeof obj !== 'object') {
        return obj;
    }
    
    // Handle arrays
    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObjectForLog(item, depth + 1));
    }
    
    // Handle objects
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitizeObjectForLog(value, depth + 1);
    }
    
    return sanitized;
}

/**
 * Sanitize user input for database queries
 * Basic validation and type checking
 * 
 * @param {string} input - Input string
 * @param {object} options - Validation options
 * @returns {string} - Sanitized input
 */
function sanitizeForDB(input, options = {}) {
    const {
        maxLength = 255,
        allowedPattern = null,
        trim = true
    } = options;
    
    if (typeof input !== 'string') {
        throw new Error('Input must be a string');
    }
    
    let sanitized = trim ? input.trim() : input;
    
    // Check max length
    if (sanitized.length > maxLength) {
        throw new Error(`Input exceeds maximum length of ${maxLength}`);
    }
    
    // Check pattern if provided
    if (allowedPattern && !allowedPattern.test(sanitized)) {
        throw new Error('Input contains invalid characters');
    }
    
    return sanitized;
}

/**
 * Validate and sanitize UUID
 * 
 * @param {string} input - UUID string
 * @returns {string} - Validated UUID
 * @throws {Error} - If invalid UUID
 */
function sanitizeUUID(input) {
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    if (typeof input !== 'string') {
        throw new Error('UUID must be a string');
    }
    
    const trimmed = input.trim();
    
    if (!uuidPattern.test(trimmed)) {
        throw new Error('Invalid UUID format');
    }
    
    return trimmed.toLowerCase();
}

/**
 * Validate and sanitize email address
 * 
 * @param {string} input - Email string
 * @returns {string} - Validated email
 * @throws {Error} - If invalid email
 */
function sanitizeEmail(input) {
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    
    if (typeof input !== 'string') {
        throw new Error('Email must be a string');
    }
    
    const trimmed = input.trim().toLowerCase();
    
    if (trimmed.length > 254) {
        throw new Error('Email too long');
    }
    
    if (!emailPattern.test(trimmed)) {
        throw new Error('Invalid email format');
    }
    
    return trimmed;
}

/**
 * Create a safe logger that automatically sanitizes all inputs
 * 
 * @returns {object} - Logger with sanitized methods
 */
function createSafeLogger() {
    return {
        log: (...args) => {
            const sanitized = args.map(arg => 
                typeof arg === 'object' ? sanitizeObjectForLog(arg) : sanitizeForLog(arg)
            );
            console.log(...sanitized);
        },
        error: (...args) => {
            const sanitized = args.map(arg => 
                typeof arg === 'object' ? sanitizeObjectForLog(arg) : sanitizeForLog(arg)
            );
            console.error(...sanitized);
        },
        warn: (...args) => {
            const sanitized = args.map(arg => 
                typeof arg === 'object' ? sanitizeObjectForLog(arg) : sanitizeForLog(arg)
            );
            console.warn(...sanitized);
        },
        info: (...args) => {
            const sanitized = args.map(arg => 
                typeof arg === 'object' ? sanitizeObjectForLog(arg) : sanitizeForLog(arg)
            );
            console.info(...sanitized);
        }
    };
}

module.exports = {
    sanitizeForLog,
    sanitizeObjectForLog,
    sanitizeForDB,
    sanitizeUUID,
    sanitizeEmail,
    createSafeLogger
};
