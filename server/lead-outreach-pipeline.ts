/**
 * Lead Outreach Pipeline — Buyer-Side (Architects / GCs / Sustainability)
 *
 * After the lead scraper saves firms to `scraped_leads`, this pipeline:
 *   1. Picks unsent leads with valid emails
 *   2. Sends a cold outreach email inviting them to GreenChainz as buyers
 *   3. Respects suppression list and 72-hour re-contact window
 *   4. Rate-limits to 50 sends per run
 *
 * Gated behind LEAD_OUTREACH_ENABLED=true env var — disabled by default
 * until the product is ready for cold buyer outreach.
 *
 * Called from:
 *   - server/_core/index.ts (weekly, after lead scraper run)
 *   - POST /api/admin/trigger-lead-outreach (manual admin trigger)
 */

import { getDb } from "./db";
import { sql } from "drizzle-orm";
import { sendEmail } from "./email-service";
import { isEmailSuppressed } from "./zeptomail-webhook";
import { generateBuyerEmail } from "./personas";

const OUTREACH_RATE_LIMIT = 50;
const MIN_HOURS_BETWEEN_OUTREACH = 72;

const BASE_URL = process.env.FRONTEND_URL ?? "https://greenchainz.com";

interface LeadRow {
  id: number;
  full_name: string | null;
  title: string | null;
  email: string;
  company: string;
  city: string | null;
  state: string | null;
  role: string;
}

export async function runLeadOutreachPipeline(): Promise<{
  checked: number;
  sent: number;
  skipped: number;
  errors: number;
}> {
  if (process.env.LEAD_OUTREACH_ENABLED !== "true") {
    console.log("[lead-outreach] Disabled — set LEAD_OUTREACH_ENABLED=true to enable");
    return { checked: 0, sent: 0, skipped: 0, errors: 0 };
  }

  const db = await getDb();
  if (!db) {
    console.error("[lead-outreach] No DB connection");
    return { checked: 0, sent: 0, skipped: 0, errors: 0 };
  }

  console.log("[lead-outreach] Starting buyer lead outreach pipeline...");

  const leadsResult = await db.execute(sql`
    SELECT id, full_name, title, email, company, city, state, role
    FROM scraped_leads
    WHERE email IS NOT NULL
      AND email != ''
      AND (email_status IS NULL OR email_status NOT IN ('invalid', 'unsubscribed', 'bounced'))
      AND (
        outreach_sent_at IS NULL
        OR outreach_sent_at < NOW() - INTERVAL '${sql.raw(String(MIN_HOURS_BETWEEN_OUTREACH))} hours'
      )
    ORDER BY created_at DESC
    LIMIT ${sql.raw(String(OUTREACH_RATE_LIMIT * 2))}
  `);

  const leads: LeadRow[] = leadsResult.rows as unknown as LeadRow[];
  console.log(`[lead-outreach] ${leads.length} candidates`);

  let sent = 0;
  let skipped = 0;
  let errors = 0;

  for (const lead of leads) {
    if (sent >= OUTREACH_RATE_LIMIT) {
      console.log(`[lead-outreach] Rate limit reached (${OUTREACH_RATE_LIMIT}). Stopping.`);
      break;
    }

    const suppressed = await isEmailSuppressed(lead.email);
    if (suppressed) { skipped++; continue; }

    const getStartedUrl =
      `${BASE_URL}/get-started` +
      `?utm_source=lead_scraper&utm_medium=email&utm_campaign=buyer_outreach` +
      `&role=${encodeURIComponent(lead.role)}`;

    // 7-layer persona-aware email generation
    const personaEmail = await generateBuyerEmail(
      {
        full_name: lead.full_name,
        title: lead.title,
        company: lead.company,
        role: lead.role,
        city: lead.city,
        state: lead.state,
      },
      getStartedUrl
    );
    console.log(`[lead-outreach] persona=${personaEmail.personaDetected} driver=${personaEmail.driver} conf=${personaEmail.confidence.toFixed(2)} llm=${personaEmail.usedLLM}`);

    const success = await sendEmail({
      to: lead.email,
      subject: personaEmail.subject,
      html: personaEmail.html,
      text: personaEmail.text,
    });

    if (success) {
      await db.execute(sql`
        UPDATE scraped_leads
        SET outreach_sent_at = NOW(),
            email_status = COALESCE(email_status, 'outreach_sent')
        WHERE id = ${lead.id}
      `);
      sent++;
      console.log(`[lead-outreach] ✅ Sent to ${lead.email} (${lead.role}: ${lead.company})`);
    } else {
      errors++;
      console.error(`[lead-outreach] ❌ Failed to send to ${lead.email}`);
    }

    await new Promise((r) => setTimeout(r, 200));
  }

  console.log(`[lead-outreach] Done. sent=${sent} skipped=${skipped} errors=${errors}`);
  return { checked: leads.length, sent, skipped, errors };
}

// ── Subject line by role ───────────────────────────────────────────────────────

export function subjectLineForRole(role: string, company: string): string {
  switch (role) {
    case "architect":
      return `Stop chasing EPD data — GreenChainz does it in seconds`;
    case "general_contractor":
      return `${company}: your next sustainable materials bid, faster`;
    case "sustainability_director":
      return `The compliance shortcut your team is missing`;
    case "procurement":
      return `Cut your materials research time in half — GreenChainz`;
    default:
      return `Sustainable building materials, sourced instantly — GreenChainz`;
  }
}

// ── Plaintext fallback ────────────────────────────────────────────────────────

export function plaintextForRole(role: string, company: string, url: string): string {
  const opener =
    role === "architect"
      ? `Hi — if you're specifying sustainable materials, GreenChainz is the fastest way to get EPD data into your specs.`
      : role === "general_contractor"
      ? `Hi — GreenChainz connects contractors like ${company} with pre-verified sustainable material suppliers. No cold calling, no chasing quotes.`
      : `Hi — GreenChainz helps procurement and sustainability teams source compliant building materials in seconds, not days.`;

  return `${opener}

Search 50,000+ EPDs, run instant RFQs, and get compliant quotes before your next pre-con meeting.

Get started free: ${url}

— The GreenChainz Team

Unsubscribe: ${BASE_URL}/unsubscribe?email={{email}}`;
}

// ── HTML email ────────────────────────────────────────────────────────────────

export function generateBuyerOutreachEmail(data: {
  role: string;
  company: string;
  name: string | null;
  getStartedUrl: string;
}): string {
  const greeting = data.name ? `Hi ${data.name},` : `Hi,`;

  const { headline, body, bullets } = copyForRole(data.role, data.company);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #1a1a1a; margin: 0; padding: 0; background: #f5f5f5; }
    .wrapper { max-width: 600px; margin: 0 auto; background: white; }
    .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px 40px; }
    .header h1 { color: white; margin: 0; font-size: 22px; font-weight: 700; }
    .header p  { color: rgba(255,255,255,0.85); margin: 6px 0 0; font-size: 14px; }
    .body { padding: 36px 40px; }
    .headline { font-size: 22px; font-weight: 700; color: #065f46; margin: 0 0 16px; line-height: 1.3; }
    .features { background: #f0fdf4; border: 1px solid #bbf7d0; border-left: 4px solid #10b981; border-radius: 8px; padding: 20px 24px; margin: 24px 0; }
    .features ul { margin: 0; padding-left: 20px; }
    .features li { margin: 6px 0; font-size: 14px; color: #374151; }
    .cta { display: inline-block; background: #10b981; color: white; text-decoration: none; padding: 14px 36px; border-radius: 6px; font-weight: 700; font-size: 16px; margin: 8px 0; }
    .stats { display: flex; gap: 24px; margin: 24px 0; flex-wrap: wrap; }
    .stat { text-align: center; }
    .stat .num { font-size: 24px; font-weight: 800; color: #10b981; }
    .stat .lbl { font-size: 12px; color: #6b7280; }
    .footer { padding: 24px 40px; border-top: 1px solid #e5e7eb; text-align: center; }
    .footer p { color: #9ca3af; font-size: 12px; margin: 4px 0; }
    .footer a { color: #9ca3af; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>🌱 GreenChainz</h1>
      <p>The Digital Interceptor — Sustainable Materials Procurement</p>
    </div>
    <div class="body">
      <p>${greeting}</p>
      <p class="headline">${headline}</p>
      <p>${body}</p>

      <div class="features">
        <ul>
          ${bullets.map((b) => `<li>${b}</li>`).join("\n          ")}
        </ul>
      </div>

      <div class="stats">
        <div class="stat"><div class="num">50,000+</div><div class="lbl">EPDs searchable</div></div>
        <div class="stat"><div class="num">&lt;30s</div><div class="lbl">From search to spec</div></div>
        <div class="stat"><div class="num">Free</div><div class="lbl">To get started</div></div>
      </div>

      <p>
        <a href="${data.getStartedUrl}" class="cta">Get Bulletproof Specs Free →</a>
      </p>

      <p style="font-size: 13px; color: #6b7280; margin-top: 28px;">
        No credit card. No setup. Works inside Excel, Revit, and your browser.
      </p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} GreenChainz Inc. · Sustainable Building Materials Marketplace</p>
      <p>
        <a href="${BASE_URL}/unsubscribe?email={{email}}">Unsubscribe</a> ·
        <a href="${BASE_URL}">greenchainz.com</a>
      </p>
    </div>
  </div>
</body>
</html>`.trim();
}

function copyForRole(
  role: string,
  company: string
): { headline: string; body: string; bullets: string[] } {
  switch (role) {
    case "architect":
      return {
        headline: "Your EPD lookup just got 10x faster.",
        body: `Architects spend hours tracking down Environmental Product Declarations, cross-checking LEED compliance, and chasing supplier quotes. GreenChainz cuts all of that down to seconds — search 50,000+ EPDs, compare GWP values, and fire off an RFQ to verified suppliers without leaving your workflow.`,
        bullets: [
          "Instant EPD search across 50,000+ verified products",
          "Auto-generated LEED / Buy Clean / Title 24 compliance check",
          "One-click RFQ to multiple suppliers — quotes in hours, not days",
          "Works inside Revit, Excel, and your browser",
        ],
      };
    case "general_contractor":
      return {
        headline: `Verified sustainable materials. Faster quotes. No cold calls.`,
        body: `GreenChainz connects ${company} directly with pre-verified sustainable material suppliers. Search by EPD, compliance standard, or material type — then send RFQs to multiple suppliers at once. Your pre-con meeting won't wait.`,
        bullets: [
          "Search suppliers by material type, EPD verification, and location",
          "Multi-supplier RFQ in under a minute",
          "Real-time compliance scoring for LEED, Buy Clean, Title 24",
          "Bid comparisons with carbon data included",
        ],
      };
    case "sustainability_director":
      return {
        headline: "Compliance data your whole team can actually use.",
        body: `Getting Buy Clean, LEED, or internal carbon targets met requires data most teams spend weeks manually gathering. GreenChainz centralizes 50,000+ EPDs with live compliance scoring — so your team can answer "is this product compliant?" in seconds, not meetings.`,
        bullets: [
          "Live LEED / Buy Clean / Title 24 compliance scoring",
          "GWP comparison across equivalent products",
          "Audit trail for every spec decision",
          "Exportable compliance reports for submittals",
        ],
      };
    case "procurement":
      return {
        headline: "Cut sustainable materials sourcing time in half.",
        body: `Procurement teams lose hours to manual EPD lookups, supplier follow-ups, and compliance verification. GreenChainz automates the data layer — so you spend time negotiating, not searching.`,
        bullets: [
          "Centralized EPD database — no more individual supplier portals",
          "Automated RFQ routing to verified suppliers",
          "Price benchmarks from real bid data",
          "Compliance scoring baked into every search result",
        ],
      };
    default:
      return {
        headline: "Sustainable materials. Verified data. Instant quotes.",
        body: `GreenChainz is the B2B procurement platform built for teams sourcing sustainable building materials. Search EPDs, check compliance, and issue RFQs — all in one place.`,
        bullets: [
          "50,000+ searchable EPDs",
          "LEED / Buy Clean / Title 24 compliance scoring",
          "Multi-supplier RFQ in under a minute",
          "Free to start",
        ],
      };
  }
}
