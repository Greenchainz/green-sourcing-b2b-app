import { describe, it, expect } from 'vitest';
import { sendEmail } from './email-service';

describe('Email Service', () => {
  it('should validate Zoho SMTP credentials', async () => {
    // Test email sending with Zoho credentials
    const result = await sendEmail({
      to: process.env.ZOHO_EMAIL_USER || 'test@example.com',
      subject: 'GreenChainz Email Service Test',
      html: '<p>This is a test email to validate Zoho SMTP configuration.</p>',
      text: 'This is a test email to validate Zoho SMTP configuration.',
    });

    // Should return true if credentials are valid
    expect(result).toBe(true);
  }, 30000); // 30 second timeout for email sending
});
