/**
 * AI Gateway - Call Logger with Input Redaction
 * 
 * Logs all AI Gateway calls with sensitive data redacted.
 * Provides audit trail for compliance and debugging.
 */

const crypto = require('crypto');
const { pool } = require('../../db');
const monitoring = require('../azure/monitoring');

// Patterns to redact from inputs
const REDACTION_PATTERNS = [
    // Personal identifiable information
    { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, replacement: '[EMAIL]' },
    { pattern: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, replacement: '[PHONE]' },
    { pattern: /\b\d{3}[-]?\d{2}[-]?\d{4}\b/g, replacement: '[SSN]' },
    { pattern: /\b\d{16}\b/g, replacement: '[CARD_NUMBER]' },
    { pattern: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13})\b/g, replacement: '[CREDIT_CARD]' },
    
    // API keys and secrets
    { pattern: /\b[A-Za-z0-9]{32,}\b/g, replacement: '[API_KEY]' },
    { pattern: /Bearer\s+[A-Za-z0-9\-._~+\/]+=*/g, replacement: 'Bearer [TOKEN]' },
    { pattern: /sk[-_][a-zA-Z0-9]{20,}/g, replacement: '[SECRET_KEY]' },
    
    // Passwords
    { pattern: /"password"\s*:\s*"[^"]*"/gi, replacement: '"password": "[REDACTED]"' },
    { pattern: /"secret"\s*:\s*"[^"]*"/gi, replacement: '"secret": "[REDACTED]"' },
    { pattern: /"token"\s*:\s*"[^"]*"/gi, replacement: '"token": "[REDACTED]"' },
    
    // Company names (partial redaction for privacy)
    // Note: We keep first 3 chars for debugging context
];

// Fields that should be completely excluded from logging
const EXCLUDED_FIELDS = [
    'password', 'passwordHash', 'secret', 'apiKey', 'accessToken',
    'refreshToken', 'privateKey', 'creditCard', 'ssn', 'socialSecurityNumber'
];

/**
 * Hash input data for deduplication and cache lookup
 */
function hashInput(input) {
    const normalized = typeof input === 'string' ? input : JSON.stringify(input);
    return crypto.createHash('sha256').update(normalized).digest('hex');
}

/**
 * Redact sensitive data from input
 */
function redactInput(input) {
    if (!input) return '';
    
    let text = typeof input === 'string' ? input : JSON.stringify(input);
    
    // Apply redaction patterns
    for (const { pattern, replacement } of REDACTION_PATTERNS) {
        text = text.replace(pattern, replacement);
    }
    
    return text;
}

/**
 * Create a summary of the input (for logging)
 * Extracts key fields without sensitive data
 */
function summarizeInput(input, maxLength = 500) {
    if (!input) return null;
    
    let summary;
    
    if (typeof input === 'string') {
        summary = input.substring(0, maxLength);
    } else if (typeof input === 'object') {
        // Extract safe fields for summary
        const safeKeys = Object.keys(input).filter(k => !EXCLUDED_FIELDS.includes(k.toLowerCase()));
        const safeObj = {};
        
        for (const key of safeKeys.slice(0, 10)) { // Limit to 10 fields
            const value = input[key];
            if (typeof value === 'string') {
                safeObj[key] = value.substring(0, 100);
            } else if (typeof value === 'number' || typeof value === 'boolean') {
                safeObj[key] = value;
            } else if (Array.isArray(value)) {
                safeObj[key] = `[Array(${value.length})]`;
            } else if (typeof value === 'object' && value !== null) {
                safeObj[key] = '[Object]';
            }
        }
        
        summary = JSON.stringify(safeObj);
    } else {
        summary = String(input).substring(0, maxLength);
    }
    
    // Apply redaction to summary
    return redactInput(summary.substring(0, maxLength));
}

/**
 * Log an AI Gateway call
 */
async function logCall({
    workflowId,
    userId,
    input,
    output,
    latencyMs,
    tokensUsed,
    cacheHit,
    status,
    errorCode,
    errorMessage,
    sessionId,
    ipAddress,
    userAgent
}) {
    try {
        const inputHash = hashInput(input);
        const inputSummary = summarizeInput(input);
        const inputByteSize = input ? Buffer.byteLength(JSON.stringify(input)) : 0;
        
        const outputHash = output ? hashInput(output) : null;
        const outputSummary = output ? summarizeInput(output) : null;
        const outputByteSize = output ? Buffer.byteLength(JSON.stringify(output)) : 0;

        const result = await pool.query(`
            INSERT INTO AI_Gateway_Calls (
                WorkflowID, UserID, InputHash, InputSummary, InputByteSize,
                OutputHash, OutputSummary, OutputByteSize,
                LatencyMs, TokensUsed, CacheHit, Status,
                ErrorCode, ErrorMessage, SessionID, IPAddress, UserAgent
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
            RETURNING CallID
        `, [
            workflowId, userId, inputHash, inputSummary, inputByteSize,
            outputHash, outputSummary, outputByteSize,
            latencyMs, tokensUsed || 0, cacheHit || false, status,
            errorCode, errorMessage, sessionId, ipAddress, userAgent
        ]);

        // Track in Application Insights
        monitoring.trackEvent('AIGateway_Call', {
            workflowId: String(workflowId),
            userId: String(userId),
            status,
            cacheHit: String(cacheHit || false)
        }, {
            latencyMs: latencyMs || 0,
            tokensUsed: tokensUsed || 0,
            inputBytes: inputByteSize,
            outputBytes: outputByteSize
        });

        return result.rows[0]?.callid;
    } catch (error) {
        console.error('Error logging AI call:', error.message);
        monitoring.trackException(error, { context: 'logCall' });
        return null;
    }
}

/**
 * Get call history for a user (with pagination)
 */
async function getCallHistory(userId, { limit = 50, offset = 0, workflowId, status } = {}) {
    try {
        let query = `
            SELECT 
                gc.CallID, gc.WorkflowID, w.Name as WorkflowName,
                gc.InputSummary, gc.OutputSummary,
                gc.LatencyMs, gc.TokensUsed, gc.CacheHit, gc.Status,
                gc.ErrorCode, gc.CreatedAt
            FROM AI_Gateway_Calls gc
            LEFT JOIN AI_Workflows w ON gc.WorkflowID = w.WorkflowID
            WHERE gc.UserID = $1
        `;
        const params = [userId];
        let paramIndex = 2;

        if (workflowId) {
            query += ` AND gc.WorkflowID = $${paramIndex++}`;
            params.push(workflowId);
        }

        if (status) {
            query += ` AND gc.Status = $${paramIndex++}`;
            params.push(status);
        }

        query += ` ORDER BY gc.CreatedAt DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);
        return result.rows;
    } catch (error) {
        console.error('Error getting call history:', error.message);
        return [];
    }
}

/**
 * Get aggregated usage stats for a user
 */
async function getUsageStats(userId, days = 30) {
    try {
        const result = await pool.query(`
            SELECT 
                COUNT(*) as total_calls,
                SUM(CASE WHEN CacheHit THEN 1 ELSE 0 END) as cache_hits,
                SUM(TokensUsed) as total_tokens,
                AVG(LatencyMs) as avg_latency,
                SUM(CASE WHEN Status = 'success' THEN 1 ELSE 0 END) as successful_calls,
                SUM(CASE WHEN Status = 'error' THEN 1 ELSE 0 END) as failed_calls,
                SUM(CASE WHEN Status = 'rate_limited' THEN 1 ELSE 0 END) as rate_limited_calls
            FROM AI_Gateway_Calls
            WHERE UserID = $1 AND CreatedAt > NOW() - INTERVAL '${days} days'
        `, [userId]);

        return result.rows[0] || null;
    } catch (error) {
        console.error('Error getting usage stats:', error.message);
        return null;
    }
}

/**
 * Get workflow-level analytics (for admin dashboard)
 */
async function getWorkflowAnalytics(days = 7) {
    try {
        const result = await pool.query(`
            SELECT 
                w.Name as workflow_name,
                w.WorkflowType as workflow_type,
                COUNT(gc.CallID) as total_calls,
                SUM(CASE WHEN gc.CacheHit THEN 1 ELSE 0 END) as cache_hits,
                AVG(gc.LatencyMs) as avg_latency,
                SUM(gc.TokensUsed) as total_tokens,
                COUNT(DISTINCT gc.UserID) as unique_users
            FROM AI_Workflows w
            LEFT JOIN AI_Gateway_Calls gc ON w.WorkflowID = gc.WorkflowID 
                AND gc.CreatedAt > NOW() - INTERVAL '${days} days'
            GROUP BY w.WorkflowID, w.Name, w.WorkflowType
            ORDER BY total_calls DESC
        `);

        return result.rows;
    } catch (error) {
        console.error('Error getting workflow analytics:', error.message);
        return [];
    }
}

module.exports = {
    hashInput,
    redactInput,
    summarizeInput,
    logCall,
    getCallHistory,
    getUsageStats,
    getWorkflowAnalytics
};
