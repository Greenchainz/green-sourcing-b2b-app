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
    // Zoho SMTP transporter
    const transporter = nodemailer.createTransport({
      host: 'smtp.zoho.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.ZOHO_EMAIL_USER,
        pass: process.env.ZOHO_EMAIL_PASSWORD,
      },
    });

    // Send email
    await transporter.sendMail({
      from: `"GreenChainz" <${process.env.ZOHO_EMAIL_USER}>`,
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


/**
 * Send bid received notification to buyer
 */
export async function sendBidReceivedEmail(data: {
  buyerEmail: string;
  buyerName: string;
  supplierName: string;
  projectName: string;
  bidAmount: string;
  rfqId: number;
}): Promise<boolean> {
  const dashboardUrl = `${process.env.FRONTEND_URL || 'https://greenchainz.com'}/buyer/rfqs/${data.rfqId}`;
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #3b82f6; color: white; padding: 20px; text-align: center; }
    .content { background: #f9fafb; padding: 30px; }
    .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .highlight { background: #fef3c7; padding: 15px; border-left: 4px solid #f59e0b; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📋 New Bid Received</h1>
    </div>
    <div class="content">
      <p>Hi ${data.buyerName},</p>
      <p>You've received a new bid for your RFQ: <strong>${data.projectName}</strong></p>
      <div class="highlight">
        <p><strong>Supplier:</strong> ${data.supplierName}</p>
        <p><strong>Bid Amount:</strong> ${data.bidAmount}</p>
      </div>
      <p>Review the full bid details, compare with other bids, and message the supplier directly if you have questions.</p>
      <center><a href="${dashboardUrl}" class="button">View Bid Details</a></center>
    </div>
    <div class="footer">
      <p>GreenChainz - Sustainable Building Materials Marketplace</p>
    </div>
  </div>
</body>
</html>
  `;

  return sendEmail({
    to: data.buyerEmail,
    subject: `New Bid Received: ${data.projectName}`,
    html,
    text: `Hi ${data.buyerName}, You've received a new bid from ${data.supplierName} for ${data.projectName}. Bid Amount: ${data.bidAmount}. View details: ${dashboardUrl}`,
  });
}

/**
 * Send new message notification
 */
export async function sendNewMessageEmail(data: {
  recipientEmail: string;
  recipientName: string;
  senderName: string;
  messagePreview: string;
  conversationId: number;
}): Promise<boolean> {
  const conversationUrl = `${process.env.FRONTEND_URL || 'https://greenchainz.com'}/messages?conversation=${data.conversationId}`;
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #8b5cf6; color: white; padding: 20px; text-align: center; }
    .content { background: #f9fafb; padding: 30px; }
    .message { background: white; border-left: 4px solid #8b5cf6; padding: 15px; margin: 20px 0; font-style: italic; }
    .button { display: inline-block; background: #8b5cf6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>💬 New Message</h1>
    </div>
    <div class="content">
      <p>Hi ${data.recipientName},</p>
      <p><strong>${data.senderName}</strong> sent you a message:</p>
      <div class="message">"${data.messagePreview}"</div>
      <center><a href="${conversationUrl}" class="button">Reply to Message</a></center>
    </div>
    <div class="footer">
      <p>GreenChainz - Sustainable Building Materials Marketplace</p>
    </div>
  </div>
</body>
</html>
  `;

  return sendEmail({
    to: data.recipientEmail,
    subject: `New message from ${data.senderName}`,
    html,
    text: `Hi ${data.recipientName}, ${data.senderName} sent you a message: "${data.messagePreview}". Reply: ${conversationUrl}`,
  });
}

/**
 * Send bid accepted notification to supplier
 */
export async function sendBidAcceptedEmail(data: {
  supplierEmail: string;
  supplierName: string;
  buyerName: string;
  projectName: string;
  bidAmount: string;
  rfqId: number;
}): Promise<boolean> {
  const dashboardUrl = `${process.env.FRONTEND_URL || 'https://greenchainz.com'}/supplier/rfqs/${data.rfqId}`;
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #10b981; color: white; padding: 20px; text-align: center; }
    .content { background: #f9fafb; padding: 30px; }
    .success { background: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; }
    .button { display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Congratulations!</h1>
    </div>
    <div class="content">
      <p>Hi ${data.supplierName},</p>
      <p>Great news! Your bid has been accepted by ${data.buyerName}.</p>
      <div class="success">
        <p><strong>Project:</strong> ${data.projectName}</p>
        <p><strong>Accepted Bid:</strong> ${data.bidAmount}</p>
      </div>
      <p>The buyer will reach out to you shortly to coordinate next steps. You can also message them directly through the platform.</p>
      <center><a href="${dashboardUrl}" class="button">View Project Details</a></center>
    </div>
    <div class="footer">
      <p>GreenChainz - Sustainable Building Materials Marketplace</p>
    </div>
  </div>
</body>
</html>
  `;

  return sendEmail({
    to: data.supplierEmail,
    subject: `🎉 Your bid was accepted: ${data.projectName}`,
    html,
    text: `Hi ${data.supplierName}, Congratulations! Your bid for ${data.projectName} has been accepted by ${data.buyerName}. Bid Amount: ${data.bidAmount}. View details: ${dashboardUrl}`,
  });
}

/**
 * Send bid rejected notification to supplier
 */
export async function sendBidRejectedEmail(data: {
  supplierEmail: string;
  supplierName: string;
  buyerName: string;
  projectName: string;
}): Promise<boolean> {
  const dashboardUrl = `${process.env.FRONTEND_URL || 'https://greenchainz.com'}/supplier/rfqs`;
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #6b7280; color: white; padding: 20px; text-align: center; }
    .content { background: #f9fafb; padding: 30px; }
    .button { display: inline-block; background: #6b7280; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Bid Update</h1>
    </div>
    <div class="content">
      <p>Hi ${data.supplierName},</p>
      <p>Thank you for submitting your bid for <strong>${data.projectName}</strong>.</p>
      <p>Unfortunately, ${data.buyerName} has decided to move forward with another supplier for this project.</p>
      <p>Don't be discouraged! There are many more opportunities on GreenChainz. Keep an eye out for new RFQ matches.</p>
      <center><a href="${dashboardUrl}" class="button">View New RFQs</a></center>
    </div>
    <div class="footer">
      <p>GreenChainz - Sustainable Building Materials Marketplace</p>
    </div>
  </div>
</body>
</html>
  `;

  return sendEmail({
    to: data.supplierEmail,
    subject: `Bid Update: ${data.projectName}`,
    html,
    text: `Hi ${data.supplierName}, Thank you for your bid on ${data.projectName}. ${data.buyerName} has decided to move forward with another supplier. View new RFQs: ${dashboardUrl}`,
  });
}
