import { describe, it, expect } from 'vitest';
import { sendEmail } from './email-service';

const hasZohoCredentials = !!(
  process.env.ZOHO_SMTP_HOST &&
  process.env.ZOHO_EMAIL_USER &&
  process.env.ZOHO_EMAIL_PASSWORD
);

describe('Email Service', () => {
  it.skipIf(!hasZohoCredentials)('should validate Zoho SMTP credentials', async () => {
    const result = await sendEmail({
      to: process.env.ZOHO_EMAIL_USER || 'test@example.com',
      subject: 'GreenChainz Email Service Test',
      html: '<p>This is a test email to validate Zoho SMTP configuration.</p>',
      text: 'This is a test email to validate Zoho SMTP configuration.',
    });

    expect(result).toBe(true);
  }, 30000);
});
