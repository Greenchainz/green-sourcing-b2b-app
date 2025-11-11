/**
 * Error Monitoring Service
 * Sends notifications to admin for critical failures
 */

let pool = null;
let sendEmail = null;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || null;

function init(dbPool, emailService) {
    pool = dbPool;
    sendEmail = emailService;
}

async function notifyAdmin(errorType, errorDetails) {
    if (!ADMIN_EMAIL || !sendEmail) {
        console.warn('Admin notifications not configured');
        return;
    }

    const subject = `🚨 GreenChainz Alert: ${errorType}`;
    const text = `Critical error detected in GreenChainz platform:

Error Type: ${errorType}
Timestamp: ${new Date().toISOString()}

Details:
${JSON.stringify(errorDetails, null, 2)}

This is an automated alert from the GreenChainz monitoring system.
Please investigate immediately.

---
GreenChainz Platform Monitoring`;

    try {
        await sendEmail({
            to: ADMIN_EMAIL,
            subject,
            text,
            notificationType: 'error_alert_admin'
        });
    } catch (e) {
        console.error('Failed to send admin error notification:', e.message);
    }
}

// Specific error handlers
async function notifyDatabaseError(error, query) {
    await notifyAdmin('Database Error', {
        error: error.message,
        query: query || 'Unknown query',
        stack: error.stack
    });
}

async function notifyAPIError(endpoint, error, statusCode) {
    await notifyAdmin('API Error', {
        endpoint,
        error: error.message,
        statusCode,
        stack: error.stack
    });
}

async function notifyAuthenticationFailure(email, reason) {
    await notifyAdmin('Authentication Failure', {
        email,
        reason,
        timestamp: new Date().toISOString()
    });
}

async function notifyProviderSyncFailure(providerName, error) {
    await notifyAdmin('Provider Sync Failure', {
        provider: providerName,
        error: error.message,
        stack: error.stack
    });
}

module.exports = {
    init,
    notifyAdmin,
    notifyDatabaseError,
    notifyAPIError,
    notifyAuthenticationFailure,
    notifyProviderSyncFailure
};
