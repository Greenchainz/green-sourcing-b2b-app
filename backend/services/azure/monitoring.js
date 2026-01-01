/**
 * Azure Application Insights Integration
 * Resource: greenchainz-platform (rg-greenchainz)
 * 
 * Features:
 * - Request tracking
 * - Exception logging
 * - Custom metrics
 * - Dependency tracking
 * - Live metrics stream
 */

let appInsights = null;
let client = null;
let isInitialized = false;

/**
 * Initialize Application Insights
 */
async function initialize() {
    if (isInitialized) return;

    const connectionString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
    
    if (!connectionString) {
        console.warn('Application Insights connection string not configured');
        return;
    }

    try {
        appInsights = require('applicationinsights');
        
        appInsights.setup(connectionString)
            .setAutoDependencyCorrelation(true)
            .setAutoCollectRequests(true)
            .setAutoCollectPerformance(true, true)
            .setAutoCollectExceptions(true)
            .setAutoCollectDependencies(true)
            .setAutoCollectConsole(true, true)
            .setUseDiskRetryCaching(true)
            .setSendLiveMetrics(true)
            .setDistributedTracingMode(appInsights.DistributedTracingModes.AI_AND_W3C)
            .start();

        client = appInsights.defaultClient;
        
        // Add cloud role for better identification
        client.context.tags[client.context.keys.cloudRole] = 'greenchainz-backend';
        
        isInitialized = true;
    } catch (e) {
        console.warn('Failed to initialize Application Insights:', e.message);
    }
}

/**
 * Track a custom event
 */
function trackEvent(name, properties = {}, measurements = {}) {
    if (!client) return;
    
    client.trackEvent({
        name,
        properties,
        measurements
    });
}

/**
 * Track an exception
 */
function trackException(error, properties = {}) {
    if (!client) {
        console.error('Untracked exception:', error);
        return;
    }
    
    client.trackException({
        exception: error,
        properties
    });
}

/**
 * Track a custom metric
 */
function trackMetric(name, value, properties = {}) {
    if (!client) return;
    
    client.trackMetric({
        name,
        value,
        properties
    });
}

/**
 * Track a dependency (external API call, database query, etc.)
 */
function trackDependency(name, commandName, duration, success, dependencyType = 'HTTP', data = '') {
    if (!client) return;
    
    client.trackDependency({
        name,
        dependencyTypeName: dependencyType,
        data,
        duration,
        resultCode: success ? 200 : 500,
        success,
        target: name
    });
}

/**
 * Track API request with timing
 */
function trackRequest(name, url, duration, statusCode, success) {
    if (!client) return;
    
    client.trackRequest({
        name,
        url,
        duration,
        resultCode: statusCode,
        success
    });
}

/**
 * Track a trace message
 */
function trackTrace(message, severity = 'Information', properties = {}) {
    if (!client) return;
    
    const severityLevel = {
        'Verbose': 0,
        'Information': 1,
        'Warning': 2,
        'Error': 3,
        'Critical': 4
    };
    
    client.trackTrace({
        message,
        severity: severityLevel[severity] || 1,
        properties
    });
}

/**
 * GreenChainz-specific tracking methods
 */

function trackSupplierRegistration(supplierId, companyName) {
    trackEvent('SupplierRegistered', {
        supplierId: String(supplierId),
        companyName
    });
}

function trackRFQCreated(rfqId, buyerId, supplierId) {
    trackEvent('RFQCreated', {
        rfqId: String(rfqId),
        buyerId: String(buyerId),
        supplierId: String(supplierId)
    });
}

function trackRFQResponse(rfqId, supplierId, quotedPrice) {
    trackEvent('RFQResponse', {
        rfqId: String(rfqId),
        supplierId: String(supplierId)
    }, {
        quotedPrice
    });
}

function trackCertificationVerified(supplierId, certificationType, score) {
    trackEvent('CertificationVerified', {
        supplierId: String(supplierId),
        certificationType
    }, {
        verificationScore: score
    });
}

function trackFSCSync(recordsProcessed, newRecords, updatedRecords) {
    trackEvent('FSCSyncCompleted', {}, {
        recordsProcessed,
        newRecords,
        updatedRecords
    });
    
    trackMetric('FSC.RecordsSynced', recordsProcessed);
}

function trackDatabaseQuery(queryName, duration, success) {
    trackDependency('PostgreSQL', queryName, duration, success, 'SQL');
}

function trackRedisOperation(operation, duration, success) {
    trackDependency('Redis', operation, duration, success, 'Redis');
}

function trackEmailSent(recipient, emailType, success) {
    trackEvent('EmailSent', {
        recipient,
        emailType,
        success: String(success)
    });
}

function trackAPIError(endpoint, statusCode, errorMessage) {
    trackEvent('APIError', {
        endpoint,
        statusCode: String(statusCode),
        errorMessage
    });
    
    trackMetric('API.Errors', 1, { endpoint });
}

/**
 * Flush all pending telemetry
 */
function flush() {
    if (client) {
        client.flush();
    }
}

/**
 * Express middleware for request tracking
 */
function expressMiddleware() {
    return (req, res, next) => {
        const startTime = Date.now();
        
        res.on('finish', () => {
            const duration = Date.now() - startTime;
            trackRequest(
                `${req.method} ${req.route?.path || req.path}`,
                req.originalUrl,
                duration,
                res.statusCode,
                res.statusCode < 400
            );
        });
        
        next();
    };
}

module.exports = {
    initialize,
    trackEvent,
    trackException,
    trackMetric,
    trackDependency,
    trackRequest,
    trackTrace,
    // GreenChainz-specific
    trackSupplierRegistration,
    trackRFQCreated,
    trackRFQResponse,
    trackCertificationVerified,
    trackFSCSync,
    trackDatabaseQuery,
    trackRedisOperation,
    trackEmailSent,
    trackAPIError,
    // Utilities
    flush,
    expressMiddleware,
    isInitialized: () => isInitialized
};
