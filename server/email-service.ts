import { Resend } from "resend";
import nodemailer from "nodemailer";

/**
 * Email Service
 * Primary:  Resend (RESEND_API_KEY)
 * Fallback: Zeptomail SMTP (ZEPTOMAIL_SMTP_USER / ZEPTOMAIL_SMTP_PASSWORD)
 * From:     noreply@updates.greenchainz.com (must be verified in both providers)
 */

const FROM_ADDRESS = "GreenChainz <noreply@updates.greenchainz.com>";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/** Send via Zeptomail SMTP. Returns true on success. */
async function sendViaZeptomail(options: EmailOptions): Promise<boolean> {
  const user = process.env.ZEPTOMAIL_SMTP_USER;
  const pass = process.env.ZEPTOMAIL_SMTP_PASSWORD;
  if (!user || !pass) {
    console.warn("[email/zeptomail] ZEPTOMAIL_SMTP_USER or ZEPTOMAIL_SMTP_PASSWORD not set");
    return false;
  }

  const transport = nodemailer.createTransport({
    host: "smtp.zeptomail.com",
    port: 587,
    secure: false,
    auth: { user, pass },
  });

  try {
    await transport.sendMail({
      from: FROM_ADDRESS,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
    console.log(`[email/zeptomail] Sent to ${options.to}: ${options.subject}`);
    return true;
  } catch (err) {
    console.error("[email/zeptomail] Failed:", err);
    return false;
  }
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  // ── Primary: Resend ──────────────────────────────────────────────────────
  const key = process.env.RESEND_API_KEY;
  if (key) {
    try {
      const resend = new Resend(key);
      const { error } = await resend.emails.send({
        from: FROM_ADDRESS,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      if (!error) {
        console.log(`[email/resend] Sent to ${options.to}: ${options.subject}`);
        return true;
      }
      console.error("[email/resend] Error:", error);
    } catch (err) {
      console.error("[email/resend] Exception:", err);
    }
    // Fall through to Zeptomail
    console.warn("[email] Resend failed — trying Zeptomail fallback");
  } else {
    console.warn("[email] RESEND_API_KEY not set — trying Zeptomail fallback");
  }

  // ── Fallback: Zeptomail SMTP ─────────────────────────────────────────────
  return sendViaZeptomail(options);
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
 * Send welcome email to a newly onboarded supplier
 */
export async function sendSupplierWelcomeEmail(data: {
  supplierEmail: string;
  contactName: string;
  companyName: string;
  supplierId: number;
}): Promise<boolean> {
  const profileUrl = `${process.env.FRONTEND_URL || "https://greenchainz.com"}/supplier/dashboard`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 32px 30px; border-radius: 8px 8px 0 0; text-align: center; }
    .content { background: #f9fafb; padding: 32px 30px; border-radius: 0 0 8px 8px; }
    .card { background: white; padding: 20px 24px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #10b981; }
    .step { display: flex; align-items: flex-start; margin: 12px 0; }
    .step-num { background: #10b981; color: white; border-radius: 50%; width: 24px; height: 24px; display: inline-flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; flex-shrink: 0; margin-right: 12px; margin-top: 2px; }
    .button { display: inline-block; background: #10b981; color: white; padding: 13px 32px; text-decoration: none; border-radius: 6px; margin: 24px 0; font-weight: 600; font-size: 15px; }
    .footer { text-align: center; color: #6b7280; font-size: 13px; margin-top: 28px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="header">
    <h1 style="margin:0;font-size:26px;">🌱 Welcome to GreenChainz</h1>
    <p style="margin:10px 0 0;opacity:.9;">Your supplier profile is under review</p>
  </div>
  <div class="content">
    <p>Hi ${data.contactName},</p>
    <p>Thanks for submitting <strong>${data.companyName}</strong> to GreenChainz! We've received your profile and our team will review it within <strong>48 hours</strong>.</p>

    <div class="card">
      <p style="margin:0 0 12px;font-weight:600;color:#059669;">What happens next</p>
      <div class="step"><span class="step-num">1</span><span>Our team reviews your submission for completeness and sustainability credentials.</span></div>
      <div class="step"><span class="step-num">2</span><span>You'll receive a confirmation email once your profile is approved and live in the catalog.</span></div>
      <div class="step"><span class="step-num">3</span><span>Architects and project managers can discover your materials and send you RFQs directly.</span></div>
    </div>

    <p>In the meantime, you can log in to view your profile status and add more details about your products.</p>

    <center><a href="${profileUrl}" class="button">View Your Profile</a></center>

    <p style="font-size:14px;color:#6b7280;">Questions? Reply to this email or reach us at <a href="mailto:founder@greenchainz.com" style="color:#10b981;">founder@greenchainz.com</a></p>
  </div>
  <div class="footer">
    <p>© ${new Date().getFullYear()} GreenChainz · <a href="https://greenchainz.com" style="color:#6b7280;">greenchainz.com</a></p>
  </div>
</body>
</html>
  `.trim();

  const text = `Hi ${data.contactName},

Thanks for submitting ${data.companyName} to GreenChainz!

We've received your profile and will review it within 48 hours.

What happens next:
1. Our team reviews your submission for completeness and sustainability credentials.
2. You'll get a confirmation email once your profile is live.
3. Architects can discover your materials and send you RFQs directly.

View your profile: ${profileUrl}

Questions? Email founder@greenchainz.com

© ${new Date().getFullYear()} GreenChainz`;

  return sendEmail({
    to: data.supplierEmail,
    subject: "Welcome to GreenChainz — your profile is under review",
    html,
    text,
  });
}

/**
 * Send new-supplier alert to the founder (replaces admin dashboard notifications)
 */
export async function sendFounderNewSupplierAlert(data: {
  companyName: string;
  contactName: string;
  supplierEmail: string;
  materialCategories: string[];
  supplierId: number;
}): Promise<boolean> {
  const adminUrl = `${process.env.FRONTEND_URL || "https://greenchainz.com"}/admin/suppliers`;
  const categories = data.materialCategories.join(", ") || "—";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height:1.6; color:#333; max-width:540px; margin:0 auto; padding:20px; }
    .header { background:#1e293b; color:white; padding:20px 24px; border-radius:8px 8px 0 0; }
    .content { background:#f8fafc; padding:24px; border-radius:0 0 8px 8px; }
    .field { margin:8px 0; }
    .label { font-size:12px; color:#64748b; text-transform:uppercase; letter-spacing:.05em; }
    .value { font-weight:600; color:#0f172a; }
    .button { display:inline-block; background:#10b981; color:white; padding:11px 28px; text-decoration:none; border-radius:6px; margin-top:20px; font-weight:600; }
  </style>
</head>
<body>
  <div class="header">
    <p style="margin:0;font-size:12px;opacity:.6;text-transform:uppercase;letter-spacing:.08em;">GreenChainz · New Supplier</p>
    <h2 style="margin:4px 0 0;font-size:22px;">${data.companyName}</h2>
  </div>
  <div class="content">
    <div class="field"><div class="label">Contact</div><div class="value">${data.contactName}</div></div>
    <div class="field"><div class="label">Email</div><div class="value"><a href="mailto:${data.supplierEmail}" style="color:#10b981;">${data.supplierEmail}</a></div></div>
    <div class="field"><div class="label">Material Categories</div><div class="value">${categories}</div></div>
    <div class="field"><div class="label">Supplier ID</div><div class="value">#${data.supplierId}</div></div>
    <a href="${adminUrl}" class="button">Review in Admin Dashboard</a>
  </div>
</body>
</html>
  `.trim();

  const text = `New supplier submitted: ${data.companyName}

Contact: ${data.contactName}
Email: ${data.supplierEmail}
Material Categories: ${categories}
Supplier ID: #${data.supplierId}

Review: ${adminUrl}`;

  return sendEmail({
    to: "founder@greenchainz.com",
    subject: `New supplier submitted: ${data.companyName}`,
    html,
    text,
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

/**
 * Send welcome email to a newly onboarded architect
 */
export async function sendArchitectWelcomeEmail(data: {
  architectEmail: string;
  firstName: string;
  firmName: string;
  architectId: number;
}): Promise<boolean> {
  const catalogUrl = `${process.env.FRONTEND_URL || "https://greenchainz.com"}/materials`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 32px 30px; border-radius: 8px 8px 0 0; text-align: center; }
    .content { background: #f9fafb; padding: 32px 30px; border-radius: 0 0 8px 8px; }
    .card { background: white; padding: 20px 24px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #10b981; }
    .feature { display: flex; align-items: flex-start; margin: 12px 0; }
    .icon { font-size: 20px; margin-right: 12px; flex-shrink: 0; margin-top: 2px; }
    .button { display: inline-block; background: #10b981; color: white; padding: 13px 32px; text-decoration: none; border-radius: 6px; margin: 24px 0; font-weight: 600; font-size: 15px; }
    .footer { text-align: center; color: #6b7280; font-size: 13px; margin-top: 28px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="header">
    <h1 style="margin:0;font-size:26px;">🌱 You're in, ${data.firstName}!</h1>
    <p style="margin:10px 0 0;opacity:.9;">Start sourcing verified sustainable materials</p>
  </div>
  <div class="content">
    <p>Hi ${data.firstName},</p>
    <p>Welcome to GreenChainz — your profile for <strong>${data.firmName}</strong> is live. You now have access to the full materials catalog, EPD data, and LEED/BREEAM compliance tools.</p>

    <div class="card">
      <p style="margin:0 0 14px;font-weight:600;color:#059669;">What you can do right now</p>
      <div class="feature"><span class="icon">🔍</span><span><strong>Browse the catalog</strong> — filter by carbon footprint, certifications, lead time, and project type</span></div>
      <div class="feature"><span class="icon">📊</span><span><strong>Compare materials</strong> — side-by-side GWP, cost, and compliance scores</span></div>
      <div class="feature"><span class="icon">📋</span><span><strong>Send an RFQ</strong> — request quotes from verified suppliers directly through the platform</span></div>
      <div class="feature"><span class="icon">🏅</span><span><strong>Track LEED credits</strong> — see which materials contribute to your certification goals</span></div>
    </div>

    <center><a href="${catalogUrl}" class="button">Start Finding Materials →</a></center>

    <p style="font-size:14px;color:#6b7280;">Questions? Reply to this email or reach us at <a href="mailto:founder@greenchainz.com" style="color:#10b981;">founder@greenchainz.com</a> — we respond same day.</p>
  </div>
  <div class="footer">
    <p>© ${new Date().getFullYear()} GreenChainz · <a href="https://greenchainz.com" style="color:#6b7280;">greenchainz.com</a></p>
  </div>
</body>
</html>
  `.trim();

  const text = `Hi ${data.firstName},

Welcome to GreenChainz! Your profile for ${data.firmName} is live.

Start sourcing: ${catalogUrl}

What you can do now:
- Browse EPD-verified materials filtered by carbon, certifications, and lead time
- Compare materials side-by-side
- Send RFQs to verified suppliers
- Track LEED credits

Questions? Email founder@greenchainz.com

© ${new Date().getFullYear()} GreenChainz`;

  return sendEmail({
    to: data.architectEmail,
    subject: "Welcome to GreenChainz — start sourcing",
    html,
    text,
  });
}

/**
 * Send new-architect alert to the founder
 */
export async function sendFounderNewArchitectAlert(data: {
  firmName: string;
  firstName: string;
  lastName: string;
  architectEmail: string;
  state: string;
  projectTypes: string[];
  architectId: number;
}): Promise<boolean> {
  const adminUrl = `${process.env.FRONTEND_URL || "https://greenchainz.com"}/admin/suppliers`;
  const types = data.projectTypes.join(", ") || "—";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height:1.6; color:#333; max-width:540px; margin:0 auto; padding:20px; }
    .header { background:#1e293b; color:white; padding:20px 24px; border-radius:8px 8px 0 0; }
    .content { background:#f8fafc; padding:24px; border-radius:0 0 8px 8px; }
    .field { margin:8px 0; }
    .label { font-size:12px; color:#64748b; text-transform:uppercase; letter-spacing:.05em; }
    .value { font-weight:600; color:#0f172a; }
    .button { display:inline-block; background:#10b981; color:white; padding:11px 28px; text-decoration:none; border-radius:6px; margin-top:20px; font-weight:600; }
  </style>
</head>
<body>
  <div class="header">
    <p style="margin:0;font-size:12px;opacity:.6;text-transform:uppercase;letter-spacing:.08em;">GreenChainz · New Architect</p>
    <h2 style="margin:4px 0 0;font-size:22px;">${data.firmName}</h2>
  </div>
  <div class="content">
    <div class="field"><div class="label">Name</div><div class="value">${data.firstName} ${data.lastName}</div></div>
    <div class="field"><div class="label">Email</div><div class="value"><a href="mailto:${data.architectEmail}" style="color:#10b981;">${data.architectEmail}</a></div></div>
    <div class="field"><div class="label">State</div><div class="value">${data.state}</div></div>
    <div class="field"><div class="label">Project Types</div><div class="value">${types}</div></div>
    <div class="field"><div class="label">Architect ID</div><div class="value">#${data.architectId}</div></div>
    <a href="${adminUrl}" class="button">View in Admin Dashboard</a>
  </div>
</body>
</html>
  `.trim();

  const text = `New architect: ${data.firmName}, ${data.state}

Name: ${data.firstName} ${data.lastName}
Email: ${data.architectEmail}
Project Types: ${types}
Architect ID: #${data.architectId}

Admin: ${adminUrl}`;

  return sendEmail({
    to: "founder@greenchainz.com",
    subject: `New architect: ${data.firmName}, ${data.state}`,
    html,
    text,
  });
}

/**
 * Notify a supplier of a new direct RFQ from an architect
 */
export async function sendDirectRfqAlert(data: {
  supplierEmail: string;
  supplierCompanyName: string;
  architectName: string;
  projectName: string;
  materialCategory: string;
  rfqId: number;
}): Promise<boolean> {
  const rfqUrl = `${process.env.FRONTEND_URL || "https://greenchainz.com"}/supplier/rfqs`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:0;background:#f4f7f6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7f6;padding:32px 0;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
        <tr><td style="background:#16a34a;padding:28px 32px;">
          <h1 style="margin:0;color:#ffffff;font-size:22px;">New Material Request</h1>
          <p style="margin:6px 0 0;color:#bbf7d0;font-size:14px;">GreenChainz Direct RFQ</p>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 16px;color:#374151;font-size:15px;">
            Hi <strong>${data.supplierCompanyName}</strong>,
          </p>
          <p style="margin:0 0 24px;color:#374151;font-size:15px;">
            <strong>${data.architectName}</strong> has sent you a direct Request for Quotation on GreenChainz.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border-radius:6px;padding:20px;margin-bottom:24px;">
            <tr><td>
              <p style="margin:0 0 8px;color:#166534;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Request Details</p>
              <p style="margin:0 0 6px;color:#374151;font-size:14px;"><strong>Project:</strong> ${data.projectName}</p>
              <p style="margin:0;color:#374151;font-size:14px;"><strong>Material Category:</strong> ${data.materialCategory}</p>
            </td></tr>
          </table>
          <p style="margin:0 0 24px;color:#6b7280;font-size:14px;">
            Log in to GreenChainz to view the full request details and respond.
          </p>
          <a href="${rfqUrl}" style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:6px;font-size:15px;font-weight:600;">
            View Request →
          </a>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #e5e7eb;text-align:center;">
          <p style="margin:0;color:#9ca3af;font-size:12px;">© ${new Date().getFullYear()} GreenChainz · Verified Sustainable Building Materials</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();

  const text = `Hi ${data.supplierCompanyName},

${data.architectName} has sent you a direct RFQ on GreenChainz.

Project: ${data.projectName}
Material Category: ${data.materialCategory}

View and respond: ${rfqUrl}

© ${new Date().getFullYear()} GreenChainz`;

  return sendEmail({
    to: data.supplierEmail,
    subject: `New RFQ from ${data.architectName} — ${data.materialCategory}`,
    html,
    text,
  });
}

/**
 * Send a personalized founder video share link to the recipient.
 */
export async function sendFounderVideoEmail(data: {
  recipientEmail: string;
  recipientName: string;
  subject: string;
  shareUrl: string;
  founderName: string;
}): Promise<boolean> {
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:0;background:#f4f7f6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7f6;padding:32px 0;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
        <tr><td style="background:linear-gradient(135deg,#10b981 0%,#059669 100%);padding:28px 32px;">
          <h1 style="margin:0;color:#ffffff;font-size:22px;">A personal video for you</h1>
          <p style="margin:6px 0 0;color:#bbf7d0;font-size:14px;">From ${data.founderName} · GreenChainz</p>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 16px;color:#374151;font-size:15px;">Hi ${data.recipientName},</p>
          <p style="margin:0 0 24px;color:#374151;font-size:15px;">
            I recorded a quick video for you — <strong>${data.subject}</strong>. Click below to watch (it's short).
          </p>
          <a href="${data.shareUrl}" style="display:inline-block;background:#10b981;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:6px;font-size:16px;font-weight:600;">
            ▶ Watch the video
          </a>
          <p style="margin:24px 0 0;color:#6b7280;font-size:13px;">
            Or paste this link in your browser:<br/>
            <span style="color:#059669;word-break:break-all;">${data.shareUrl}</span>
          </p>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #e5e7eb;text-align:center;">
          <p style="margin:0;color:#9ca3af;font-size:12px;">© ${new Date().getFullYear()} GreenChainz · Verified Sustainable Building Materials</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();

  const text = `Hi ${data.recipientName},

${data.founderName} recorded a personal video for you about: ${data.subject}

Watch it here: ${data.shareUrl}

© ${new Date().getFullYear()} GreenChainz`;

  return sendEmail({
    to: data.recipientEmail,
    subject: `${data.founderName} sent you a video — ${data.subject}`,
    html,
    text,
  });
}
