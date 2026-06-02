/**
 * Email Templates — GreenChainz engagement & notification emails.
 *
 * All templates return raw HTML strings with inline CSS for maximum
 * email-client compatibility (600px max-width, no external stylesheets).
 */

const BRAND_GREEN = "#15803d";
const BRAND_BG = "#f8faf8";
const TEXT_PRIMARY = "#1a1a1a";
const TEXT_MUTED = "#6b7280";
const BORDER = "#e5e7eb";
const BASE_URL = process.env.FRONTEND_URL || "https://greenchainz.com";

// ── Shared layout helpers ────────────────────────────────────────────────────

function emailWrapper(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GreenChainz</title>
</head>
<body style="margin:0;padding:0;background:${BRAND_BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:${TEXT_PRIMARY};line-height:1.6;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND_BG};">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:${BRAND_GREEN};padding:24px 32px;text-align:center;">
              <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:0.5px;">GreenChainz</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid ${BORDER};text-align:center;">
              <p style="margin:0 0 6px;font-size:12px;color:${TEXT_MUTED};">&copy; ${new Date().getFullYear()} GreenChainz. All rights reserved.</p>
              <p style="margin:0;font-size:12px;color:${TEXT_MUTED};">
                <a href="${BASE_URL}/unsubscribe" style="color:${TEXT_MUTED};text-decoration:underline;">Unsubscribe</a>
                &nbsp;|&nbsp;
                <a href="${BASE_URL}" style="color:${TEXT_MUTED};text-decoration:underline;">greenchainz.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function ctaButton(label: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px auto;">
  <tr>
    <td style="background:${BRAND_GREEN};border-radius:6px;">
      <a href="${href}" style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:6px;">${label}</a>
    </td>
  </tr>
</table>`;
}

function infoBox(content: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
  <tr>
    <td style="background:${BRAND_BG};border:1px solid ${BORDER};border-left:4px solid ${BRAND_GREEN};border-radius:6px;padding:16px 20px;">
      ${content}
    </td>
  </tr>
</table>`;
}

function progressBar(current: number, target: number): string {
  const pct = Math.min(Math.round((current / target) * 100), 100);
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:12px 0;">
  <tr>
    <td style="background:#e5e7eb;border-radius:4px;height:8px;padding:0;">
      <div style="width:${pct}%;max-width:100%;height:8px;background:${BRAND_GREEN};border-radius:4px;"></div>
    </td>
  </tr>
  <tr>
    <td style="padding-top:4px;font-size:11px;color:${TEXT_MUTED};">${current} / ${target} weeks</td>
  </tr>
</table>`;
}

// ── Templates ────────────────────────────────────────────────────────────────

export interface WeeklyDigestData {
  userName: string;
  streak: number;
  credits: number;
  tier: string;
  priceTrends: Array<{ category: string; direction: "up" | "down"; change: string }>;
  newMaterials: Array<{ name: string; manufacturer: string }>;
  nextMilestone: { name: string; weeksNeeded: number };
}

export function weeklyDigestEmail(data: WeeklyDigestData): { subject: string; html: string } {
  const topTrend = data.priceTrends[0];
  const trendLabel = topTrend
    ? `${topTrend.category} prices ${topTrend.direction === "up" ? "up" : "down"}`
    : "market update";
  const newCount = data.newMaterials.length;
  const subject = `Your GreenChainz Weekly — ${trendLabel}, ${newCount} new material${newCount !== 1 ? "s" : ""} added`;

  const tierLabel = data.tier === "founding" ? "Founding Architect" : data.tier === "pro" ? "Pro" : "Explorer";
  const weeksToGo = Math.max(0, data.nextMilestone.weeksNeeded - data.streak);

  const trendRows = data.priceTrends
    .map((t) => {
      const arrow = t.direction === "up" ? "↑" : "↓";
      const color = t.direction === "up" ? "#dc2626" : BRAND_GREEN;
      return `<tr>
        <td style="padding:6px 0;font-size:14px;color:${TEXT_PRIMARY};">${t.category}</td>
        <td style="padding:6px 0;font-size:14px;font-weight:600;color:${color};text-align:right;">${arrow} ${t.change} YoY</td>
      </tr>`;
    })
    .join("");

  const materialRows = data.newMaterials
    .map(
      (m) =>
        `<li style="margin-bottom:6px;font-size:14px;color:${TEXT_PRIMARY};"><strong>${m.name}</strong> by ${m.manufacturer}</li>`
    )
    .join("");

  const html = emailWrapper(`
    <p style="margin:0 0 16px;font-size:16px;">Hi ${data.userName},</p>
    <p style="margin:0 0 20px;font-size:14px;color:${TEXT_MUTED};">Here's your weekly update from the world of sustainable building materials.</p>

    ${infoBox(`
      <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:${TEXT_MUTED};text-transform:uppercase;letter-spacing:0.5px;">Your Insider Status</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="font-size:14px;"><strong>${data.streak}</strong>-week streak</td>
          <td style="font-size:14px;text-align:center;"><strong>${data.credits}</strong> credits</td>
          <td style="font-size:14px;text-align:right;"><span style="background:${BRAND_GREEN};color:#fff;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;">${tierLabel}</span></td>
        </tr>
      </table>
    `)}

    <h2 style="margin:24px 0 12px;font-size:16px;color:${TEXT_PRIMARY};">Market Pulse</h2>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      ${trendRows}
    </table>

    ${newCount > 0 ? `
    <h2 style="margin:24px 0 12px;font-size:16px;color:${TEXT_PRIMARY};">New on GreenChainz</h2>
    <ul style="padding-left:20px;margin:0;">${materialRows}</ul>
    ` : ""}

    <p style="margin:24px 0 8px;font-size:14px;color:${TEXT_PRIMARY};">Your streak is at <strong>${data.streak} weeks</strong> — ${weeksToGo > 0 ? `<strong>${weeksToGo} more</strong> to unlock <strong>${data.nextMilestone.name}</strong>` : `you've already unlocked <strong>${data.nextMilestone.name}</strong>!`}</p>
    ${progressBar(data.streak, data.nextMilestone.weeksNeeded)}

    ${ctaButton("Check In & Explore →", `${BASE_URL}/insider`)}
  `);

  return { subject, html };
}

// ─────────────────────────────────────────────────────────────────────────────

export interface StreakReminderData {
  userName: string;
  streak: number;
  nextMilestone: { name: string; weeksNeeded: number };
}

export function streakReminderEmail(data: StreakReminderData): { subject: string; html: string } {
  const subject = `Don't lose your ${data.streak}-week streak on GreenChainz`;
  const weeksToGo = Math.max(0, data.nextMilestone.weeksNeeded - data.streak);

  const html = emailWrapper(`
    <p style="margin:0 0 16px;font-size:16px;">Hi ${data.userName},</p>
    <p style="margin:0 0 20px;font-size:14px;color:${TEXT_PRIMARY};">You're <strong>${data.streak} weeks</strong> into your streak. Check in this week to keep it alive.</p>

    ${infoBox(`
      <p style="margin:0 0 8px;font-size:14px;color:${TEXT_PRIMARY};">
        ${weeksToGo > 0
          ? `<strong>${weeksToGo} more week${weeksToGo !== 1 ? "s" : ""}</strong> until you unlock <strong>${data.nextMilestone.name}</strong>`
          : `You've already unlocked <strong>${data.nextMilestone.name}</strong> — keep it going!`}
      </p>
      ${progressBar(data.streak, data.nextMilestone.weeksNeeded)}
    `)}

    <p style="margin:16px 0;font-size:14px;color:${TEXT_MUTED};">It only takes a few seconds. Don't let your progress slip.</p>

    ${ctaButton("Quick Check-In →", `${BASE_URL}/insider`)}
  `);

  return { subject, html };
}

// ─────────────────────────────────────────────────────────────────────────────

export interface NewMaterialAlertData {
  userName: string;
  materialName: string;
  manufacturer: string;
  category: string;
  gwpValue: string;
  carbonBelowMedian: number | null; // percentage, e.g. 42 for "42% below median"
  materialId: number;
}

export function newMaterialAlertEmail(data: NewMaterialAlertData): { subject: string; html: string } {
  const subject = `New EPD-verified ${data.category} material just added`;

  const carbonLine =
    data.carbonBelowMedian != null && data.carbonBelowMedian > 0
      ? `<p style="margin:8px 0 0;font-size:14px;color:${BRAND_GREEN};font-weight:600;">Carbon Score: ${data.carbonBelowMedian}% below industry median</p>`
      : "";

  const html = emailWrapper(`
    <p style="margin:0 0 16px;font-size:16px;">Hi ${data.userName},</p>
    <p style="margin:0 0 20px;font-size:14px;color:${TEXT_MUTED};">A new EPD-verified material matching your interests has been added to GreenChainz.</p>

    ${infoBox(`
      <p style="margin:0;font-size:16px;font-weight:600;color:${TEXT_PRIMARY};">${data.materialName}</p>
      <p style="margin:4px 0 0;font-size:13px;color:${TEXT_MUTED};">by ${data.manufacturer}</p>
      <p style="margin:8px 0 0;font-size:14px;color:${TEXT_PRIMARY};">GWP: <strong>${data.gwpValue}</strong> kg CO₂e/unit</p>
      ${carbonLine}
    `)}

    ${ctaButton("View Material →", `${BASE_URL}/materials/${data.materialId}`)}
  `);

  return { subject, html };
}

// ─────────────────────────────────────────────────────────────────────────────

export interface ClaimProfileData {
  companyName: string;
  category: string;
  productCount: number;
  manufacturerId: number;
}

export function claimProfileEmail(data: ClaimProfileData): { subject: string; html: string } {
  const subject = `Architects are searching for ${data.category} on GreenChainz — claim your profile`;

  const html = emailWrapper(`
    <p style="margin:0 0 16px;font-size:16px;">Hello,</p>
    <p style="margin:0 0 20px;font-size:14px;color:${TEXT_PRIMARY};"><strong>${data.companyName}</strong>'s products are being discovered by architects on GreenChainz.</p>
    <p style="margin:0 0 20px;font-size:14px;color:${TEXT_MUTED};">Your profile currently shows <strong>${data.productCount} product${data.productCount !== 1 ? "s" : ""}</strong> based on publicly available data.</p>

    <!-- Screenshot placeholder -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
      <tr>
        <td style="background:#f3f4f6;border:1px dashed ${BORDER};border-radius:6px;padding:32px;text-align:center;">
          <p style="margin:0;font-size:13px;color:${TEXT_MUTED};">[Profile preview screenshot]</p>
        </td>
      </tr>
    </table>

    <p style="margin:20px 0 12px;font-size:14px;font-weight:600;color:${TEXT_PRIMARY};">Claim your profile to:</p>
    <ul style="padding-left:20px;margin:0 0 20px;">
      <li style="margin-bottom:8px;font-size:14px;color:${TEXT_PRIMARY};">Manage and verify your product data & EPDs</li>
      <li style="margin-bottom:8px;font-size:14px;color:${TEXT_PRIMARY};">See analytics on who's viewing your materials</li>
      <li style="margin-bottom:8px;font-size:14px;color:${TEXT_PRIMARY};">Receive RFQ leads directly from architects</li>
      <li style="margin-bottom:8px;font-size:14px;color:${TEXT_PRIMARY};">Highlight sustainability certifications</li>
    </ul>

    ${ctaButton("Claim Your Profile →", `${BASE_URL}/manufacturers/${data.manufacturerId}`)}

    <p style="margin:0;font-size:12px;color:${TEXT_MUTED};text-align:center;">Free to claim. Premium features available.</p>
  `);

  return { subject, html };
}

// ── RFQ Marketplace Email Templates ─────────────────────────────────────────
// Use #2D6A4F brand green for RFQ-specific emails per marketplace branding.

const RFQ_GREEN = "#2D6A4F";

function rfqEmailWrapper(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GreenChainz</title>
</head>
<body style="margin:0;padding:0;background:${BRAND_BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:${TEXT_PRIMARY};line-height:1.6;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND_BG};">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:${RFQ_GREEN};padding:24px 32px;text-align:center;">
              <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:0.5px;">GreenChainz</h1>
              <p style="margin:4px 0 0;font-size:12px;color:rgba(255,255,255,0.8);letter-spacing:0.3px;">Sustainable Materials Marketplace</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid ${BORDER};text-align:center;">
              <p style="margin:0 0 6px;font-size:12px;color:${TEXT_MUTED};">&copy; ${new Date().getFullYear()} GreenChainz. All rights reserved.</p>
              <p style="margin:0;font-size:12px;color:${TEXT_MUTED};">
                <a href="${BASE_URL}/unsubscribe" style="color:${TEXT_MUTED};text-decoration:underline;">Unsubscribe</a>
                &nbsp;|&nbsp;
                <a href="${BASE_URL}" style="color:${TEXT_MUTED};text-decoration:underline;">greenchainz.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function rfqCtaButton(label: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px auto;">
  <tr>
    <td style="background:${RFQ_GREEN};border-radius:6px;">
      <a href="${href}" style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:6px;">${label}</a>
    </td>
  </tr>
</table>`;
}

function rfqInfoBox(content: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
  <tr>
    <td style="background:${BRAND_BG};border:1px solid ${BORDER};border-left:4px solid ${RFQ_GREEN};border-radius:6px;padding:16px 20px;">
      ${content}
    </td>
  </tr>
</table>`;
}

// ── New RFQ notification (sent to invited suppliers) ────────────────────────

export interface NewRfqNotificationData {
  supplierName: string;
  buyerCompany: string;
  rfqTitle: string;
  materialCategory: string;
  quantity: number;
  unit: string;
  deadline: string;
  rfqLink: string;
}

export function newRfqNotification(data: NewRfqNotificationData): { subject: string; html: string } {
  const subject = `New RFQ: ${data.rfqTitle}`;

  const deadlineDate = new Date(data.deadline);
  const formattedDeadline = deadlineDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const html = rfqEmailWrapper(`
    <p style="margin:0 0 16px;font-size:16px;">Hi ${data.supplierName},</p>
    <p style="margin:0 0 20px;font-size:14px;color:${TEXT_MUTED};">
      <strong>${data.buyerCompany}</strong> has invited you to submit a quote on a new Request for Quotation.
    </p>

    ${rfqInfoBox(`
      <p style="margin:0 0 8px;font-size:16px;font-weight:600;color:${TEXT_PRIMARY};">${data.rfqTitle}</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:4px 0;font-size:13px;color:${TEXT_MUTED};width:120px;">Category</td>
          <td style="padding:4px 0;font-size:14px;color:${TEXT_PRIMARY};">${data.materialCategory || "General"}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;font-size:13px;color:${TEXT_MUTED};">Quantity</td>
          <td style="padding:4px 0;font-size:14px;color:${TEXT_PRIMARY};">${data.quantity.toLocaleString()} ${data.unit}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;font-size:13px;color:${TEXT_MUTED};">Deadline</td>
          <td style="padding:4px 0;font-size:14px;font-weight:600;color:${RFQ_GREEN};">${formattedDeadline}</td>
        </tr>
      </table>
    `)}

    <p style="margin:16px 0;font-size:14px;color:${TEXT_MUTED};">Review the details and submit your quote before the deadline.</p>

    ${rfqCtaButton("View RFQ Details", data.rfqLink)}
  `);

  return { subject, html };
}

// ── Quote received notification (sent to buyer) ─────────────────────────────

export interface QuoteReceivedNotificationData {
  buyerName: string;
  supplierCompany: string;
  rfqTitle: string;
  pricePerUnit: number;
  totalPrice: number;
  leadTimeDays: number;
  rfqLink: string;
}

export function quoteReceivedNotification(data: QuoteReceivedNotificationData): { subject: string; html: string } {
  const subject = `New Quote on: ${data.rfqTitle}`;

  const html = rfqEmailWrapper(`
    <p style="margin:0 0 16px;font-size:16px;">Hi ${data.buyerName},</p>
    <p style="margin:0 0 20px;font-size:14px;color:${TEXT_MUTED};">
      <strong>${data.supplierCompany}</strong> has submitted a quote on your RFQ.
    </p>

    ${rfqInfoBox(`
      <p style="margin:0 0 8px;font-size:16px;font-weight:600;color:${TEXT_PRIMARY};">${data.rfqTitle}</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:4px 0;font-size:13px;color:${TEXT_MUTED};width:120px;">Price / Unit</td>
          <td style="padding:4px 0;font-size:14px;color:${TEXT_PRIMARY};">$${data.pricePerUnit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;font-size:13px;color:${TEXT_MUTED};">Total Price</td>
          <td style="padding:4px 0;font-size:14px;font-weight:600;color:${RFQ_GREEN};">$${data.totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;font-size:13px;color:${TEXT_MUTED};">Lead Time</td>
          <td style="padding:4px 0;font-size:14px;color:${TEXT_PRIMARY};">${data.leadTimeDays} day${data.leadTimeDays !== 1 ? "s" : ""}</td>
        </tr>
      </table>
    `)}

    <p style="margin:16px 0;font-size:14px;color:${TEXT_MUTED};">Log in to compare quotes and award the RFQ.</p>

    ${rfqCtaButton("Review Quote", data.rfqLink)}
  `);

  return { subject, html };
}

// ── RFQ awarded notification (sent to winning supplier) ─────────────────────

export interface RfqAwardedNotificationData {
  supplierName: string;
  buyerCompany: string;
  rfqTitle: string;
  totalPrice: number;
  rfqLink: string;
}

export function rfqAwardedNotification(data: RfqAwardedNotificationData): { subject: string; html: string } {
  const subject = `Congratulations! RFQ Awarded: ${data.rfqTitle}`;

  const html = rfqEmailWrapper(`
    <p style="margin:0 0 16px;font-size:16px;">Hi ${data.supplierName},</p>
    <p style="margin:0 0 20px;font-size:14px;color:${TEXT_PRIMARY};">
      Great news! <strong>${data.buyerCompany}</strong> has accepted your quote for the following RFQ.
    </p>

    ${rfqInfoBox(`
      <p style="margin:0 0 8px;font-size:16px;font-weight:600;color:${TEXT_PRIMARY};">${data.rfqTitle}</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:4px 0;font-size:13px;color:${TEXT_MUTED};width:120px;">Award Amount</td>
          <td style="padding:4px 0;font-size:18px;font-weight:700;color:${RFQ_GREEN};">$${data.totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>
      </table>
    `)}

    <p style="margin:16px 0;font-size:14px;color:${TEXT_MUTED};">Log in to view the full award details and next steps.</p>

    ${rfqCtaButton("View Award Details", data.rfqLink)}
  `);

  return { subject, html };
}
