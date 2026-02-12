import nodemailer from "nodemailer";

/**
 * Email Service — Handles sending transactional emails
 * 
 * Uses nodemailer with SMTP configuration from environment variables.
 * For production, configure Azure Communication Services or SendGrid.
 */

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send an email using configured SMTP transport
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    // Create transporter (configure with your SMTP details)
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Send email
    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"GreenChainz" <noreply@greenchainz.com>',
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });

    console.log(`Email sent successfully to ${options.to}`);
    return true;
  } catch (error) {
    console.error("Failed to send email:", error);
    return false;
  }
}

/**
 * Generate HTML email template for RFQ notification
 */
export function generateRfqEmailTemplate(data: {
  supplierName: string;
  projectName: string;
  materialCount: number;
  matchScore: number;
  rfqUrl: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New RFQ Available</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      padding: 30px;
      border-radius: 8px 8px 0 0;
      text-align: center;
    }
    .content {
      background: #f9fafb;
      padding: 30px;
      border-radius: 0 0 8px 8px;
    }
    .card {
      background: white;
      padding: 20px;
      border-radius: 6px;
      margin: 20px 0;
      border-left: 4px solid #10b981;
    }
    .button {
      display: inline-block;
      background: #10b981;
      color: white;
      padding: 12px 30px;
      text-decoration: none;
      border-radius: 6px;
      margin: 20px 0;
      font-weight: 600;
    }
    .button:hover {
      background: #059669;
    }
    .footer {
      text-align: center;
      color: #6b7280;
      font-size: 14px;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
    }
    .match-score {
      display: inline-block;
      background: #10b981;
      color: white;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1 style="margin: 0; font-size: 28px;">🌱 New RFQ Available</h1>
    <p style="margin: 10px 0 0 0; opacity: 0.9;">You've been matched to a new project</p>
  </div>
  
  <div class="content">
    <p>Hi ${data.supplierName},</p>
    
    <p>Great news! A new Request for Quotation (RFQ) has been posted that matches your company's capabilities.</p>
    
    <div class="card">
      <h2 style="margin-top: 0; color: #10b981;">${data.projectName}</h2>
      <p><strong>Materials Requested:</strong> ${data.materialCount} item${data.materialCount > 1 ? 's' : ''}</p>
      <p><strong>Match Score:</strong> <span class="match-score">${data.matchScore}% Match</span></p>
    </div>
    
    <p>This project aligns well with your expertise. Review the full requirements and submit your bid to win this opportunity.</p>
    
    <center>
      <a href="${data.rfqUrl}" class="button">View RFQ & Submit Bid</a>
    </center>
    
    <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
      <strong>💡 Tip:</strong> Respond quickly to increase your chances of winning. Premium suppliers get 24-hour exclusive access.
    </p>
  </div>
  
  <div class="footer">
    <p>© ${new Date().getFullYear()} GreenChainz. All rights reserved.</p>
    <p>
      <a href="https://greenchainz.com/unsubscribe" style="color: #6b7280;">Unsubscribe</a> | 
      <a href="https://greenchainz.com/preferences" style="color: #6b7280;">Email Preferences</a>
    </p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Send RFQ notification email to supplier
 */
export async function sendRfqNotificationEmail(data: {
  supplierEmail: string;
  supplierName: string;
  projectName: string;
  materialCount: number;
  matchScore: number;
  rfqId: number;
}): Promise<boolean> {
  const rfqUrl = `${process.env.FRONTEND_URL || 'https://greenchainz.com'}/supplier/rfqs/${data.rfqId}`;
  
  const html = generateRfqEmailTemplate({
    supplierName: data.supplierName,
    projectName: data.projectName,
    materialCount: data.materialCount,
    matchScore: data.matchScore,
    rfqUrl,
  });

  const text = `
Hi ${data.supplierName},

A new RFQ has been posted that matches your company: ${data.projectName}

Materials Requested: ${data.materialCount} item${data.materialCount > 1 ? 's' : ''}
Match Score: ${data.matchScore}%

View and submit your bid: ${rfqUrl}

© ${new Date().getFullYear()} GreenChainz
  `.trim();

  return sendEmail({
    to: data.supplierEmail,
    subject: `New RFQ: ${data.projectName}`,
    html,
    text,
  });
}
