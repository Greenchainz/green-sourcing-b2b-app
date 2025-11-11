// Simple email service for MVP - no Twilio/Zoho needed yet!
// Uses free SMTP (Gmail, Outlook, or any provider)

const nodemailer = require('nodemailer');

// Create reusable transporter
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER, // your email
        pass: process.env.SMTP_PASS  // app password (not your regular password!)
    }
});

// Verify connection on startup
transporter.verify(function (error, success) {
    if (error) {
        console.log('⚠️  Email service not configured:', error.message);
        console.log('💡 Add SMTP credentials to .env to enable email notifications');
    } else {
        console.log('✅ Email service ready');
    }
});

/**
 * Send welcome email when someone captures their email
 */
async function sendWelcomeEmail(toEmail, source) {
    const sourceNames = {
        'supplier-survey': 'Supplier',
        'buyer-survey': 'Buyer',
        'data-provider-survey': 'Data Provider'
    };

    const mailOptions = {
        from: `"GreenChainz" <${process.env.SMTP_USER}>`,
        to: toEmail,
        subject: `Welcome to GreenChainz - ${sourceNames[source] || 'Partner'} Early Access`,
        html: `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0ea5e9, #22d3ee); padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0;">🌿 Welcome to GreenChainz</h1>
        </div>
        
        <div style="padding: 32px; background: #f9fafb;">
          <h2 style="color: #0b1220;">Thanks for joining our early access program!</h2>
          
          <p style="color: #4b5563; line-height: 1.6;">
            We're building the global trust layer for sustainable commerce - a verified B2B marketplace 
            where ${sourceNames[source] || 'partners'} can connect with confidence.
          </p>
          
          <div style="background: white; border-left: 4px solid #10b981; padding: 16px; margin: 24px 0;">
            <strong style="color: #059669;">What happens next?</strong>
            <ul style="color: #4b5563; margin-top: 8px;">
              <li>We'll review your survey response within 48 hours</li>
              <li>If you're a good fit, we'll invite you to our Founding 50 program</li>
              <li>Get early access, premium features, and founding member badge</li>
            </ul>
          </div>
          
          <p style="color: #4b5563;">
            Questions? Just reply to this email - we read every message.
          </p>
          
          <p style="color: #9ca3af; font-size: 14px; margin-top: 32px;">
            Best regards,<br>
            The GreenChainz Team<br>
            <em>Sustainability without greenwashing</em>
          </p>
        </div>
        
        <div style="background: #0b1220; padding: 16px; text-align: center;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            © ${new Date().getFullYear()} GreenChainz • 
            <a href="https://greenchainz.com/privacy" style="color: #0ea5e9;">Privacy</a> • 
            <a href="https://greenchainz.com/terms" style="color: #0ea5e9;">Terms</a>
          </p>
        </div>
      </div>
    `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Welcome email sent to:', toEmail);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Failed to send welcome email:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Send notification to admin when new email captured
 */
async function notifyAdminNewLead(email, source, userType, companyName) {
    if (!process.env.ADMIN_EMAIL) {
        console.log('⚠️  No ADMIN_EMAIL set - skipping admin notification');
        return { success: false, error: 'No admin email configured' };
    }

    const mailOptions = {
        from: `"GreenChainz Alerts" <${process.env.SMTP_USER}>`,
        to: process.env.ADMIN_EMAIL,
        subject: `🎯 New ${source} Lead: ${email}`,
        html: `
      <div style="font-family: monospace; padding: 20px; background: #f3f4f6;">
        <h2 style="color: #0ea5e9;">New Lead Captured</h2>
        
        <table style="background: white; padding: 16px; border-radius: 8px;">
          <tr><td><strong>Email:</strong></td><td>${email}</td></tr>
          <tr><td><strong>Source:</strong></td><td>${source}</td></tr>
          <tr><td><strong>Type:</strong></td><td>${userType || 'Not specified'}</td></tr>
          <tr><td><strong>Company:</strong></td><td>${companyName || 'Not specified'}</td></tr>
          <tr><td><strong>Time:</strong></td><td>${new Date().toLocaleString()}</td></tr>
        </table>
        
        <p style="margin-top: 16px;">
          <a href="http://localhost:3001/admin" style="background: #0ea5e9; color: white; padding: 8px 16px; text-decoration: none; border-radius: 6px;">
            View in Admin Console
          </a>
        </p>
      </div>
    `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Admin notification sent');
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ Failed to send admin notification:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Test email configuration
 */
async function testEmailConfig() {
    try {
        await transporter.verify();
        console.log('✅ SMTP configuration is valid');

        // Send test email if admin email is set
        if (process.env.ADMIN_EMAIL) {
            await transporter.sendMail({
                from: process.env.SMTP_USER,
                to: process.env.ADMIN_EMAIL,
                subject: 'GreenChainz Email Service Test',
                text: 'If you receive this, your email configuration is working! 🎉'
            });
            console.log('✅ Test email sent to:', process.env.ADMIN_EMAIL);
        }

        return true;
    } catch (error) {
        console.error('❌ Email configuration test failed:', error.message);
        return false;
    }
}

module.exports = {
    sendWelcomeEmail,
    notifyAdminNewLead,
    testEmailConfig
};
