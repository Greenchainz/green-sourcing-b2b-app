"use server";

import { resend } from "@/lib/resend";
import WelcomeEmail from "@/components/emails/WelcomeEmail";
import RFQNotificationEmail from "@/components/emails/RFQNotificationEmail";
import PasswordResetEmail from "@/components/emails/PasswordResetEmail";
import { ReactElement } from "react";

export type EmailTemplateType = 'welcome' | 'rfq_notification' | 'password_reset';

interface WelcomeEmailData {
  firstName: string;
  loginUrl?: string;
}

interface RFQNotificationData {
  supplierName: string;
  projectName: string;
  materialName: string;
  quantity: string;
  rfqLink?: string;
}

interface PasswordResetData {
  userEmail: string;
  resetLink?: string;
}

type EmailData = WelcomeEmailData | RFQNotificationData | PasswordResetData;

interface SendEmailParams {
  to: string;
  subject: string;
  template: EmailTemplateType;
  data: EmailData;
}

export async function sendEmail({ to, subject, template, data }: SendEmailParams) {
  try {
    let react: ReactElement;

    switch (template) {
      case 'welcome':
        const welcomeData = data as WelcomeEmailData;
        react = WelcomeEmail({
          firstName: welcomeData.firstName,
          loginUrl: welcomeData.loginUrl
        });
        break;
      case 'rfq_notification':
        const rfqData = data as RFQNotificationData;
        react = RFQNotificationEmail({
          supplierName: rfqData.supplierName,
          projectName: rfqData.projectName,
          materialName: rfqData.materialName,
          quantity: rfqData.quantity,
          rfqLink: rfqData.rfqLink
        });
        break;
      case 'password_reset':
        const resetData = data as PasswordResetData;
        react = PasswordResetEmail({
            userEmail: resetData.userEmail,
            resetLink: resetData.resetLink
        });
        break;
      default:
        throw new Error('Invalid email template');
    }

    // Default sender: ensure this email is verified in Resend dashboard
    const from = process.env.EMAIL_FROM || 'GreenChainz <noreply@greenchainz.com>';

    const { data: emailData, error } = await resend.emails.send({
      from,
      to: [to],
      subject: subject,
      react: react,
    });

    if (error) {
      console.error('Error sending email:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: emailData };
  } catch (error) {
    console.error('Unexpected error sending email:', error);
    return { success: false, error: 'Failed to send email' };
  }
}
