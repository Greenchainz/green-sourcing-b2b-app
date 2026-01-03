const nodemailer = require('nodemailer');
let pool = null; // Injected pool reference for logging

const notificationsEnabled = (process.env.NOTIFICATIONS_ENABLED || 'false').toLowerCase() === 'true';

let transporter = null;

function setPool(dbPool) {
    pool = dbPool;
}

function buildTransporter() {
    if (!notificationsEnabled) return null;

    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
        console.warn('Notifications enabled but SMTP config missing. Emails will be skipped.');
        return null;
    }

    return nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass }
    });
}

function ensureTransporter() {
    if (!transporter) {
        transporter = buildTransporter();
    }
    return transporter;
}

async function sendEmail({ to, subject, text, html, notificationType }) {
    const type = notificationType || 'generic';
    const body = text || html || '';

    if (!notificationsEnabled) {
        await logNotification(type, to, subject, body, 'skipped', 'Notifications disabled');
        return { sent: false, reason: 'disabled' };
    }

    const tx = ensureTransporter();
    if (!tx) {
        await logNotification(type, to, subject, body, 'skipped', 'SMTP not configured');
        return { sent: false, reason: 'no-transporter' };
    }

    const from = process.env.FROM_EMAIL || 'no-reply@greenchainz.local';

    try {
        const info = await tx.sendMail({ from, to, subject, text, html: html || text });
        await logNotification(type, to, subject, body, 'sent', null);
        return { sent: true, messageId: info.messageId };
    } catch (e) {
        console.error('Email send failed:', e.message);
        await logNotification(type, to, subject, body, 'failed', e.message);
        return { sent: false, error: e.message };
    }
}

async function logNotification(type, recipient, subject, body, status, error) {
    if (!pool) return; // No logging if pool not set
    try {
        // Uses lowercase table name and column names per canonical schema
        // (azure_postgres_rfq_simulator.sql)
        await pool.query(
            `INSERT INTO notification_log (notificationtype, recipient, subject, messagebody, status, errormessage)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [type, recipient, subject, body, status, error]
        );
    } catch (e) {
        console.error('Failed to log notification:', e.message);
    }
}

module.exports = {
    setPool,
    sendEmail,
    notificationsEnabled
};
