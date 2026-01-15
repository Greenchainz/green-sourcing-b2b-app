const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');

// ============================================
// RATE LIMITING
// ============================================
// Prevent spam: 3 requests per hour per IP
const contactRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 requests per hour
  message: {
    error: 'Too many contact form submissions. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Validate email format
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Sanitize string to prevent XSS in email content
 */
function sanitizeString(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Create Nodemailer transporter for Zoho Mail
 */
function createTransporter() {
  const zohoEmail = process.env.ZOHO_EMAIL || process.env.SMTP_USER;
  const zohoPassword = process.env.ZOHO_PASSWORD || process.env.SMTP_PASS;

  if (!zohoEmail || !zohoPassword) {
    throw new Error('Zoho email credentials not configured');
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.zoho.com',
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: true, // SSL
    auth: {
      user: zohoEmail,
      pass: zohoPassword,
    },
  });
}

// ============================================
// ROUTES
// ============================================

/**
 * POST /api/v1/contact/send
 * Send contact form message via Zoho Mail
 */
router.post('/send', contactRateLimiter, async (req, res) => {
  try {
    const { name, email, message } = req.body;

    // ============================================
    // VALIDATION
    // ============================================

    // Check required fields
    if (!name || !email || !message) {
      return res.status(400).json({
        error: 'All fields are required',
        details: {
          name: !name ? 'Name is required' : undefined,
          email: !email ? 'Email is required' : undefined,
          message: !message ? 'Message is required' : undefined,
        },
      });
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return res.status(400).json({
        error: 'Invalid email format',
      });
    }

    // Validate message length
    const messageLength = message.trim().length;
    if (messageLength < 10) {
      return res.status(400).json({
        error: 'Message too short. Minimum 10 characters required.',
      });
    }
    if (messageLength > 5000) {
      return res.status(400).json({
        error: 'Message too long. Maximum 5000 characters allowed.',
      });
    }

    // Sanitize inputs
    const sanitizedName = sanitizeString(name.trim());
    const sanitizedEmail = sanitizeString(email.trim());
    const sanitizedMessage = sanitizeString(message.trim());

    // ============================================
    // SEND EMAIL
    // ============================================

    const transporter = createTransporter();
    const timestamp = new Date().toISOString();

    const mailOptions = {
      from: process.env.ZOHO_EMAIL || process.env.SMTP_USER || 'noreply@greenchainz.com',
      to: process.env.ADMIN_EMAIL || 'founder@greenchainz.com',
      replyTo: sanitizedEmail,
      subject: `Contact Form: ${sanitizedName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              line-height: 1.6;
              color: #334155;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: linear-gradient(135deg, #059669 0%, #0d9488 100%);
              color: white;
              padding: 30px;
              border-radius: 8px 8px 0 0;
              text-align: center;
            }
            .header h2 {
              margin: 0;
              font-size: 24px;
              font-weight: 700;
            }
            .content {
              background: white;
              border: 1px solid #e2e8f0;
              border-top: none;
              border-radius: 0 0 8px 8px;
              padding: 30px;
            }
            .field {
              margin-bottom: 20px;
            }
            .field-label {
              font-weight: 700;
              color: #1e293b;
              margin-bottom: 5px;
            }
            .field-value {
              color: #475569;
              padding: 10px;
              background: #f8fafc;
              border-radius: 4px;
              border-left: 3px solid #059669;
            }
            .message-box {
              background: #f8fafc;
              padding: 15px;
              border-radius: 4px;
              border-left: 3px solid #059669;
              white-space: pre-wrap;
              word-wrap: break-word;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e2e8f0;
              color: #94a3b8;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>New Contact Form Submission</h2>
          </div>
          <div class="content">
            <div class="field">
              <div class="field-label">From:</div>
              <div class="field-value">${sanitizedName}</div>
            </div>
            <div class="field">
              <div class="field-label">Email:</div>
              <div class="field-value">
                <a href="mailto:${sanitizedEmail}" style="color: #059669; text-decoration: none;">
                  ${sanitizedEmail}
                </a>
              </div>
            </div>
            <div class="field">
              <div class="field-label">Time:</div>
              <div class="field-value">${timestamp}</div>
            </div>
            <div class="field">
              <div class="field-label">Message:</div>
              <div class="message-box">${sanitizedMessage}</div>
            </div>
          </div>
          <div class="footer">
            <p>This message was sent via the GreenChainz contact form.</p>
            <p>Reply directly to this email to respond to ${sanitizedName}.</p>
          </div>
        </body>
        </html>
      `,
      text: `
New Contact Form Submission

From: ${sanitizedName}
Email: ${sanitizedEmail}
Time: ${timestamp}

Message:
${sanitizedMessage}

---
This message was sent via the GreenChainz contact form.
Reply to ${sanitizedEmail} to respond.
      `,
    };

    await transporter.sendMail(mailOptions);

    console.log('[Contact Form] Email sent successfully:', {
      from: sanitizedEmail,
      name: sanitizedName,
      timestamp,
    });

    // ============================================
    // SUCCESS RESPONSE
    // ============================================

    return res.json({
      success: true,
      message: 'Message sent successfully',
    });

  } catch (error) {
    console.error('[Contact Form] Error:', error);

    // Log to Application Insights if available
    if (global.appInsights) {
      global.appInsights.defaultClient.trackException({
        exception: error,
        properties: {
          component: 'contact-form',
          route: '/api/v1/contact/send',
        },
      });
    }

    // Determine error type
    if (error.message && error.message.includes('credentials')) {
      return res.status(500).json({
        error: 'Email service not configured. Please try again later.',
      });
    }

    return res.status(500).json({
      error: 'Failed to send message. Please try again later.',
    });
  }
});

module.exports = router;
