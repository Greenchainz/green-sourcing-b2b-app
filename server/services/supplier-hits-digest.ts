import { getDb } from "../db";
import { suppliers } from "../../drizzle/schema";
import { eq, sql } from "drizzle-orm";
import { getSupplierHits } from "./supplier-profile-views";
import { checkSupplierFeatureAccess } from "../subscription-service";
import { sendSupplierHitsDigestEmail } from "../email-service";
import { isEmailSuppressed } from "../resend-webhook";

/**
 * Weekly "you got X profile views" digest to suppliers who had architect
 * activity in the trailing 7 days.
 *
 * Free suppliers get an upgrade CTA to unlock viewer identities; premium
 * suppliers get the top viewing firms inline. Throttled to one email per
 * supplier per ~week via suppliers.hits_digest_last_sent_at, and respects the
 * email suppression list. Killable via SUPPLIER_HITS_DIGEST_ENABLED=false.
 */
export async function runSupplierHitsDigest(): Promise<void> {
  if (process.env.SUPPLIER_HITS_DIGEST_ENABLED === "false") {
    console.log("[Hits Digest] disabled via SUPPLIER_HITS_DIGEST_ENABLED=false");
    return;
  }

  const db = await getDb();
  if (!db) {
    console.error("[Hits Digest] no DB connection");
    return;
  }

  // Suppliers with ≥1 hit in the last 7 days, not emailed in the last 6 days.
  const due = await db.execute(sql`
    SELECT s.id,
           s.email,
           s."contactName"  AS contact_name,
           s."companyName"  AS company_name,
           count(spv.*)::int AS hits_week
    FROM "suppliers" s
    JOIN "supplier_profile_views" spv
      ON spv."supplier_id" = s.id
     AND spv."view_date" >= (CURRENT_DATE - INTERVAL '6 days')
    WHERE s.email IS NOT NULL
      AND (s."hits_digest_last_sent_at" IS NULL
           OR s."hits_digest_last_sent_at" < (now() - INTERVAL '6 days'))
    GROUP BY s.id
    HAVING count(spv.*) > 0
  `);

  const rows = due.rows as Array<{
    id: number;
    email: string;
    contact_name: string | null;
    company_name: string;
    hits_week: number;
  }>;

  if (rows.length === 0) {
    return;
  }

  let sent = 0;
  for (const row of rows) {
    try {
      if (await isEmailSuppressed(row.email)) continue;

      const unlocked = await checkSupplierFeatureAccess(row.id, "viewerIdentities");
      const hits = await getSupplierHits(row.id, { includeViewers: unlocked });

      const ok = await sendSupplierHitsDigestEmail({
        supplierEmail: row.email,
        contactName: row.contact_name,
        companyName: row.company_name,
        hitsThisWeek: Number(row.hits_week),
        totalHits: hits.totalHits,
        isPremium: unlocked,
        topViewers: unlocked
          ? hits.viewers.map((v) => ({
            firmName: v.firmName,
            location: [v.city, v.state].filter(Boolean).join(", ") || null,
          }))
          : undefined,
      });

      if (ok) {
        sent++;
        await db
          .update(suppliers)
          .set({ hitsDigestLastSentAt: new Date() })
          .where(eq(suppliers.id, row.id));
      }
    } catch (err) {
      console.error(`[Hits Digest] supplier ${row.id} failed:`, err);
    }
  }

  console.log(`[Hits Digest] ${sent}/${rows.length} sent`);
}
