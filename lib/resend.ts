import { Resend } from 'resend';

// Initialize Resend with the API key from environment variables
// Note: This requires RESEND_API_KEY to be set in your .env
export const resend = new Resend(process.env.RESEND_API_KEY);
