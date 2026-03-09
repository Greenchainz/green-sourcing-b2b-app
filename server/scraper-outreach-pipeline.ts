/**
 * Scraper → Outreach Pipeline
 *
 * After the scraper saves new suppliers to `scraped_suppliers`, this pipeline:
 *   1. Finds all open RFQs
 *   2. For each new supplier with a valid email, checks if their materials/location
 *      match any open RFQ
 *   3. Sends a cold outreach email via Zeptomail inviting them to bid
 *   4. Respects the suppression list (bounces, unsubscribes, spam reports)
 *   5. Rate-limits sends to avoid spam classification (max 50/hour)
 *
 * Called from:
 *   - azure-functions/scraper-timer/index.ts (daily at 2 AM UTC)
 *   - POST /api/admin/trigger-outreach (manual trigger from admin panel)
 *
 * Flow:
 *   scraper saves suppliers → runScraperOutreachPipeline() → match to RFQs
 *   → check suppression → send email → update scraped_suppliers.outreach_sent_at
 */

import { getDb } from "../lib/db";
import { sql } from "drizzle-orm";
import { sendEmail } from "./email-service";
import { isEmailSuppressed } from "./zeptomail-webhook";

const OUTREACH_RATE_LIMIT = 50; // max emails per pipeline run
const MIN_HOURS_BETWEEN_OUTREACH = 72; // don't re-email same supplier within 3 days

interface ScrapedSupplierRow {
  id: number;
  company_name: string;
  email: string;
  city: string | null;
  state: string | null;
  source: string;
}

interface OpenRfq {
  id: number;
  project_name: string;
  project_location: string;
  due_date: string | null;
  material_count: number;
}

/**
 * Main pipeline entry point — call this after each scraper run
 */
export async function runScraperOutreachPipeline(): Promise<{
  checked: number;
  sent: number;
  skipped: number;
  errors: number;
}> {
  const db = await getDb();
  if (!db) {
    console.error("[outreach] No DB connection");
    return { checked: 0, sent: 0, skipped: 0, errors: 0 };
  }

  console.log("[outreach] Starting scraper outreach pipeline...");

  // 1. Get newly scraped suppliers with emails that haven't been contacted yet
  //    or haven't been contacted in MIN_HOURS_BETWEEN_OUTREACH hours
  const suppliersResult = await db.execute(sql`
    SELECT id, company_name, email, city, state, source
    FROM scraped_suppliers
    WHERE email IS NOT NULL
      AND email != ''
      AND (email_status IS NULL OR email_status NOT IN ('invalid', 'unsubscribed', 'bounced'))
      AND (
        outreach_sent_at IS NULL
        OR outreach_sent_at < NOW() - INTERVAL '${sql.raw(String(MIN_HOURS_BETWEEN_OUTREACH))} hours'
      )
    ORDER BY created_at DESC
    LIMIT ${OUTREACH_RATE_LIMIT * 2}
  `);

  const scraped: ScrapedSupplierRow[] = suppliersResult.rows as ScrapedSupplierRow[];
  console.log(`[outreach] Found ${scraped.length} candidate suppliers`);

  // 2. Get all open RFQs (status = 'open' or 'active', not expired)
  const rfqResult = await db.execute(sql`
    SELECT 
      r.id,
      r.project_name,
      r.project_location,
      r.due_date,
      COUNT(ri.id) as material_count
    FROM rfqs r
    LEFT JOIN rfq_items ri ON ri.rfq_id = r.id
    WHERE r.status IN ('open', 'active', 'published')
      AND (r.due_date IS NULL OR r.due_date > NOW())
    GROUP BY r.id, r.project_name, r.project_location, r.due_date
    ORDER BY r.created_at DESC
    LIMIT 10
  `);

  const openRfqs: OpenRfq[] = rfqResult.rows as OpenRfq[];
  console.log(`[outreach] Found ${openRfqs.length} open RFQs`);

  if (openRfqs.length === 0) {
    console.log("[outreach] No open RFQs — skipping outreach");
    return { checked: scraped.length, sent: 0, skipped: scraped.length, errors: 0 };
  }

  let sent = 0;
  let skipped = 0;
  let errors = 0;

  for (const supplier of scraped) {
    if (sent >= OUTREACH_RATE_LIMIT) {
      console.log(`[outreach] Rate limit reached (${OUTREACH_RATE_LIMIT}). Stopping.`);
      break;
    }

    // 3. Check suppression list
    const suppressed = await isEmailSuppressed(supplier.email);
    if (suppressed) {
      skipped++;
      continue;
    }

    // 4. Pick the best matching RFQ for this supplier
    //    Simple heuristic: prefer RFQs in the same state, then any open RFQ
    const bestRfq = openRfqs.find((rfq) => {
      if (!supplier.state) return false;
      return rfq.project_location
        .toLowerCase()
        .includes(supplier.state.toLowerCase());
    }) || openRfqs[0];

    // 5. Send outreach email
    const signupUrl = `${process.env.FRONTEND_URL || "https://greenchainz.com"}/supplier/register?utm_source=scraper&utm_medium=email&utm_campaign=outreach&rfq=${bestRfq.id}`;
    const rfqUrl = `${process.env.FRONTEND_URL || "https://greenchainz.com"}/rfqs/${bestRfq.id}?utm_source=scraper&utm_medium=email`;

    const html = generateOutreachEmail({
      companyName: supplier.company_name,
      projectName: bestRfq.project_name,
      projectLocation: bestRfq.project_location,
      materialCount: Number(bestRfq.material_count),
      dueDate: bestRfq.due_date,
      rfqUrl,
      signupUrl,
    });

    const success = await sendEmail({
      to: supplier.email,
      subject: `New RFQ opportunity: ${bestRfq.project_name} — GreenChainz`,
      html,
      text: `Hi ${supplier.company_name},\n\nA buyer on GreenChainz is looking for sustainable building materials for their project: ${bestRfq.project_name} (${bestRfq.project_location}).\n\nView the RFQ and submit your bid: ${rfqUrl}\n\nNot on GreenChainz yet? Sign up free: ${signupUrl}\n\n— The GreenChainz Team\n\nUnsubscribe: https://greenchainz.com/unsubscribe?email=${encodeURIComponent(supplier.email)}`,
    });

    if (success) {
      // 6. Mark as contacted so we don't re-email too soon
      await db.execute(sql`
        UPDATE scraped_suppliers
        SET outreach_sent_at = NOW(),
            outreach_rfq_id = ${bestRfq.id},
            email_status = COALESCE(email_status, 'outreach_sent')
        WHERE id = ${supplier.id}
      `);
      sent++;
      console.log(`[outreach] ✅ Sent to ${supplier.email} (RFQ: ${bestRfq.project_name})`);
    } else {
      errors++;
      console.error(`[outreach] ❌ Failed to send to ${supplier.email}`);
    }

    // Small delay between sends to avoid burst detection
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log(`[outreach] Done. sent=${sent} skipped=${skipped} errors=${errors}`);
  return { checked: scraped.length, sent, skipped, errors };
}

/**
 * Generate the cold outreach email HTML
 */
function generateOutreachEmail(data: {
  companyName: string;
  projectName: string;
  projectLocation: string;
  materialCount: number;
  dueDate: string | null;
  rfqUrl: string;
  signupUrl: string;
}): string {
  const dueDateStr = data.dueDate
    ? new Date(data.dueDate).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

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
    .header p { color: rgba(255,255,255,0.85); margin: 6px 0 0 0; font-size: 14px; }
    .body { padding: 36px 40px; }
    .rfq-card { background: #f0fdf4; border: 1px solid #bbf7d0; border-left: 4px solid #10b981; border-radius: 8px; padding: 20px 24px; margin: 24px 0; }
    .rfq-card h2 { margin: 0 0 12px 0; color: #065f46; font-size: 18px; }
    .rfq-card p { margin: 4px 0; font-size: 14px; color: #374151; }
    .rfq-card .label { font-weight: 600; color: #1a1a1a; }
    .cta-primary { display: inline-block; background: #10b981; color: white; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 700; font-size: 15px; margin: 8px 8px 8px 0; }
    .cta-secondary { display: inline-block; background: white; color: #10b981; text-decoration: none; padding: 13px 32px; border-radius: 6px; font-weight: 600; font-size: 15px; border: 2px solid #10b981; margin: 8px 0; }
    .footer { padding: 24px 40px; border-top: 1px solid #e5e7eb; text-align: center; }
    .footer p { color: #9ca3af; font-size: 12px; margin: 4px 0; }
    .footer a { color: #9ca3af; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>🌱 GreenChainz</h1>
      <p>Sustainable Building Materials Marketplace</p>
    </div>
    <div class="body">
      <p>Hi ${data.companyName},</p>
      <p>A buyer on <strong>GreenChainz</strong> is sourcing sustainable building materials for a project in your area and we think you'd be a great fit.</p>

      <div class="rfq-card">
        <h2>${data.projectName}</h2>
        <p><span class="label">Location:</span> ${data.projectLocation}</p>
        <p><span class="label">Materials needed:</span> ${data.materialCount} item${data.materialCount !== 1 ? "s" : ""}</p>
        ${dueDateStr ? `<p><span class="label">Bid deadline:</span> ${dueDateStr}</p>` : ""}
      </div>

      <p>GreenChainz connects verified sustainable material suppliers directly with architects, contractors, and procurement teams — no middlemen, no cold calls.</p>

      <p>
        <a href="${data.rfqUrl}" class="cta-primary">View RFQ &amp; Submit Bid</a>
      </p>
      <p>
        <a href="${data.signupUrl}" class="cta-secondary">Create Free Supplier Account</a>
      </p>

      <p style="font-size: 13px; color: #6b7280; margin-top: 28px;">
        Once you're on the platform, you'll receive automatic alerts for every RFQ that matches your materials and location — no manual searching required.
      </p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} GreenChainz Inc. · Sustainable Building Materials Marketplace</p>
      <p>
        <a href="https://greenchainz.com/unsubscribe?email=${encodeURIComponent("{{email}}")}">Unsubscribe</a> ·
        <a href="https://greenchainz.com">greenchainz.com</a>
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}
