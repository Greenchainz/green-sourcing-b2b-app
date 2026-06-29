/**
 * GreenChainz Outreach Email Service — 7-Layer Procurement Edition
 *
 * Inspired by: "The Anatomy of Strategic Procurement — Sustainable Built Environment"
 * Core principle: Stop selling the planet. Sell the financial lever.
 *
 * Each supplier contact is auto-mapped to the procurement layer whose
 * buyers purchase their type of product. Every subject line and body
 * leads with that layer's specific financial driver — never sustainability fluff.
 *
 * Layer mapping (category → primary buyer persona):
 *   L1 Design Authority   → Concrete, Steel, Glazing, Insulation (code/spec/liability)
 *   L2 Financial Gatekeeper → Windows, HVAC-adjacent, high-premium materials (WLC/ROI)
 *   L3 Execution Tier     → Gypsum, Drywall, Wood Framing, Cold-Formed Steel (sub productivity)
 *   L4 Operational Steward → Flooring, Roofing, Ceiling (TCO/FM)
 *   L5 Strategic C-Suite  → Mass Timber, CLT, high recycled-content (Scope 3 / ESG)
 *   L6 Sector Vertical    → Seamless/antimicrobial/healthcare-grade (infection control)
 *   L7 Supply Chain       → Distributors, multi-SKU, LEED-doc-ready (availability)
 */

import { Resend } from "resend";
import { getDb } from "../db";
import {
  crmContacts,
  crmEvents,
  crmEmailSequences,
} from "../../drizzle/schema";
import { eq, and, isNull, lte } from "drizzle-orm";

const FROM = "noreply@updates.greenchainz.com";
const REPLY_TO = "hello@greenchainz.com";
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://greenchainz.com";

// ─── Procurement Layer Definition ────────────────────────────────────────────

type ProcurementLayer = "L1" | "L2" | "L3" | "L4" | "L5" | "L6" | "L7";

interface LayerProfile {
  layer: ProcurementLayer;
  buyerRole: string;
  financialDriver: string;
  coldCalculus: string; // the "or else" cost — why they MUST act
}

const LAYER_PROFILES: Record<ProcurementLayer, LayerProfile> = {
  L1: {
    layer: "L1",
    buyerRole: "Architect of Record",
    financialDriver: "Liability & Code Compliance",
    coldCalculus: "Non-compliant specs create toxic tort exposure — architects require verified EPD data to protect themselves legally.",
  },
  L2: {
    layer: "L2",
    buyerRole: "Quantity Surveyor / Cost Manager",
    financialDriver: "Whole Life Cost & ROI Validation",
    coldCalculus: "A 20% material premium is approved when it reduces HVAC tonnage enough to pay back in 7 years. They need your energy performance data.",
  },
  L3: {
    layer: "L3",
    buyerRole: "General Contractor / Subcontractor",
    financialDriver: "Schedule, Labor Productivity & Logistics",
    coldCalculus: "Labor is the highest cost on any job. A lighter board, a low-VOC product, or a take-back program directly reduces crew fatigue, site shutdowns, and dumpster fees.",
  },
  L4: {
    layer: "L4",
    buyerRole: "Facility Manager / Energy Manager",
    financialDriver: "Total Cost of Ownership",
    coldCalculus: "Facility managers hate waxing, stripping, and callbacks. A product that eliminates those costs justifies any premium — it's pure OpEx reduction.",
  },
  L5: {
    layer: "L5",
    buyerRole: "Chief Sustainability Officer / C-Suite",
    financialDriver: "Scope 3 Emissions & ESG Reporting",
    coldCalculus: "Institutional investors now require Scope 3 disclosure. Low-carbon materials reduce the corporate footprint that appears in annual reports and ESG ratings.",
  },
  L6: {
    layer: "L6",
    buyerRole: "Healthcare Infection Control / Campus Planner",
    financialDriver: "Infection Control & 100-Year Durability",
    coldCalculus: "Porous materials harbor pathogens and fail bleach protocols — they create Hospital Acquired Infection liability. Seamless, bleach-resistant surfaces are the only acceptable specification.",
  },
  L7: {
    layer: "L7",
    buyerRole: "Distributor / Municipal Procurement",
    financialDriver: "LEED Documentation Readiness & Cooperative Purchasing",
    coldCalculus: "Procurement officers fear audits. Products without ready-to-go LEED docs don't make it onto cooperative purchasing contracts (Sourcewell, OMNIA) — they get cut before the bid.",
  },
};

// ─── Category → Layer Mapping ─────────────────────────────────────────────────
// Derived from the procurement framework — maps material category keywords
// to the primary procurement layer whose buyers specify those materials.

const CATEGORY_LAYER_MAP: Array<{ keywords: string[]; layer: ProcurementLayer }> = [
  // L5 first — mass timber / CLT has strong Scope 3 story
  { keywords: ["mass timber", "clt", "cross laminated", "glulam", "nail laminated"], layer: "L5" },
  // L6 — healthcare / seamless / antimicrobial
  { keywords: ["seamless", "antimicrobial", "infection", "hospital", "healthcare", "epoxy terrazzo"], layer: "L6" },
  // L1 — architects specify these in structural / envelope specs
  { keywords: ["concrete", "cement", "masonry", "cmu", "precast", "brick", "steel", "rebar", "structural", "glazing", "curtain wall", "glass", "insulation", "air barrier", "vapor barrier", "waterproof", "cladding", "facade", "fireproof", "fire protect", "spray applied", "intumescent"], layer: "L1" },
  // L2 — products with strong energy / WLC payback story
  { keywords: ["window", "fenestration", "phase change", "pcm", "hvac", "mechanical", "photovoltaic", "solar", "radiant", "vrf", "geothermal"], layer: "L2" },
  // L3 — trades use these daily (sub productivity driver)
  { keywords: ["gypsum", "drywall", "gwb", "sheathing", "stud", "framing", "lumber", "plywood", "osb", "composite wood", "lvl", "i-joist", "deck", "scaffold", "fastener", "sealant", "joint compound", "tape", "paint", "coating"], layer: "L3" },
  // L4 — FM buys or approves these for operations
  { keywords: ["flooring", "carpet", "tile", "luxury vinyl", "lvt", "lvp", "polished concrete", "resilient", "roofing", "tpo", "epdm", "modified bitumen", "sbs", "ceiling", "acoustical", "lighting", "led", "lamp"], layer: "L4" },
  // L7 — distributors / multi-product catalogs
  { keywords: ["distribut", "supply", "wholesale", "hardware", "fastener", "adhesive", "grout", "mortar", "caulk", "sealant"], layer: "L7" },
];

function detectLayer(category: string, subcategory?: string | null, keyProduct?: string | null): ProcurementLayer {
  const haystack = [category, subcategory, keyProduct].filter(Boolean).join(" ").toLowerCase();
  for (const { keywords, layer } of CATEGORY_LAYER_MAP) {
    if (keywords.some((kw) => haystack.includes(kw))) return layer;
  }
  return "L1"; // default: assume architect-spec product
}

// ─── Email HTML builder ────────────────────────────────────────────────────────

function emailShell(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8faf8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#1a1a1a;line-height:1.6;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8faf8;">
    <tr><td align="center" style="padding:24px 16px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        <tr><td style="background:#15803d;padding:20px 32px;text-align:center;">
          <span style="font-size:20px;font-weight:700;color:#fff;letter-spacing:0.5px;">GreenChainz</span>
        </td></tr>
        <tr><td style="padding:32px;">${body}</td></tr>
        <tr><td style="padding:16px 32px;border-top:1px solid #e5e7eb;text-align:center;">
          <p style="margin:0;font-size:11px;color:#9ca3af;">
            &copy; ${new Date().getFullYear()} GreenChainz &nbsp;·&nbsp;
            <a href="${BASE_URL}/unsubscribe?email={{email}}" style="color:#9ca3af;">Unsubscribe</a>
            &nbsp;·&nbsp;
            <a href="${BASE_URL}" style="color:#9ca3af;">greenchainz.com</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function cta(label: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
    <tr><td style="background:#15803d;border-radius:6px;">
      <a href="${href}" style="display:inline-block;padding:12px 28px;color:#fff;font-size:14px;font-weight:600;text-decoration:none;border-radius:6px;">${label}</a>
    </td></tr></table>`;
}

function layerBadge(profile: LayerProfile): string {
  return `<p style="margin:0 0 20px;font-size:11px;font-weight:600;color:#15803d;letter-spacing:0.8px;text-transform:uppercase;">
    Procurement Layer ${profile.layer} · ${profile.buyerRole}
  </p>`;
}

function coldCalculus(text: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
    <tr><td style="background:#f0fdf4;border-left:4px solid #15803d;border-radius:0 6px 6px 0;padding:14px 18px;">
      <p style="margin:0;font-size:13px;color:#166534;font-style:italic;">${text}</p>
    </td></tr></table>`;
}

// ─── Layer-specific Step 1 templates ─────────────────────────────────────────

function step1_L1(c: { companyName: string; category: string; keyProduct?: string | null }, claimUrl: string): { subject: string; html: string } {
  const product = c.keyProduct ?? c.category;
  return {
    subject: `Your ${product} EPD data is what architects use to avoid specification liability`,
    html: emailShell(`
      ${layerBadge(LAYER_PROFILES.L1)}
      <h2 style="margin:0 0 12px;font-size:20px;font-weight:700;">Specification writers are actively sourcing ${c.category} with verified EPD data</h2>
      <p style="color:#374151;">The Architects of Record using GreenChainz aren't searching for sustainable materials because they care about the environment — they're searching because <strong>non-compliant specifications create toxic tort exposure.</strong></p>
      <p style="color:#374151;">Your ${c.companyName} ${product} data is already in our catalog. But unclaimed profiles can't display verified EPD documentation — the single data point architects require before they'll spec a product.</p>
      ${coldCalculus(LAYER_PROFILES.L1.coldCalculus)}
      <p style="color:#374151;"><strong>Claiming your profile lets you:</strong></p>
      <ul style="color:#374151;padding-left:20px;line-height:1.9;">
        <li>Upload or link your EPD, HPD, and CDPH v1.2 documentation</li>
        <li>Display fire rating, VOC level, and code compliance data</li>
        <li>Get found when AORs search for spec-defensible alternatives</li>
        <li>Receive RFQ leads from active project specifications</li>
      </ul>
      ${cta("Claim Your Profile & Upload EPD Data →", claimUrl)}
      <p style="font-size:12px;color:#9ca3af;">GreenChainz is used by LEED APs, specification writers, and AORs sourcing verified materials for active projects.</p>
    `),
  };
}

function step1_L2(c: { companyName: string; category: string; keyProduct?: string | null }, claimUrl: string): { subject: string; html: string } {
  const product = c.keyProduct ?? c.category;
  return {
    subject: `Quantity Surveyors need your ${product} whole-life cost data — not your sustainability story`,
    html: emailShell(`
      ${layerBadge(LAYER_PROFILES.L2)}
      <h2 style="margin:0 0 12px;font-size:20px;font-weight:700;">Your product's energy savings data is worth more than your marketing</h2>
      <p style="color:#374151;">Cost managers and quantity surveyors don't approve green premiums because of sustainability — they approve them because the numbers work. A 20% premium on ${c.category} is signed off the moment it can be shown to reduce HVAC tonnage and pay back in under 7 years.</p>
      <p style="color:#374151;"><strong>${c.companyName}</strong> has a profile on GreenChainz. Claiming it lets you publish the energy performance data that QSs use to justify your price to developers.</p>
      ${coldCalculus(LAYER_PROFILES.L2.coldCalculus)}
      <p style="color:#374151;"><strong>What to add to your profile:</strong></p>
      <ul style="color:#374151;padding-left:20px;line-height:1.9;">
        <li>R-value / U-value / thermal performance specs</li>
        <li>Estimated HVAC reduction or energy savings %</li>
        <li>Payback period data (if available)</li>
        <li>ASHRAE compliance and lifecycle cost data</li>
      </ul>
      ${cta("Claim Your Profile & Add Performance Data →", claimUrl)}
    `),
  };
}

function step1_L3(c: { companyName: string; category: string; keyProduct?: string | null }, claimUrl: string): { subject: string; html: string } {
  const product = c.keyProduct ?? c.category;
  return {
    subject: `GCs are specifying ${product} based on weight, VOC, and take-back — not sustainability`,
    html: emailShell(`
      ${layerBadge(LAYER_PROFILES.L3)}
      <h2 style="margin:0 0 12px;font-size:20px;font-weight:700;">Labor is the biggest line item. Your product's installation specs are what GCs care about.</h2>
      <p style="color:#374151;">General contractors and subcontractors buying ${c.category} aren't making a sustainability decision — they're making a <strong>productivity decision.</strong> A lighter board means crews hang more square feet per day with less fatigue. A low-VOC product means no site shutdown for ventilation. A take-back program means no dumpster overages.</p>
      <p style="color:#374151;"><strong>${c.companyName}</strong> is already in our catalog. Claiming your profile lets you surface the specs that drive GC purchasing.</p>
      ${coldCalculus(LAYER_PROFILES.L3.coldCalculus)}
      <p style="color:#374151;"><strong>Data that drives L3 purchasing decisions:</strong></p>
      <ul style="color:#374151;padding-left:20px;line-height:1.9;">
        <li>Weight per SF (critical for drywall subs — less fatigue = more output)</li>
        <li>VOC content / low-VOC certification (prevents site shutdowns)</li>
        <li>Take-back / recycling program availability</li>
        <li>Lead time and regional distribution points</li>
        <li>Consistency data (does it warp? shrink? fail inspection?)</li>
      </ul>
      ${cta("Claim Your Profile & Add Installation Specs →", claimUrl)}
    `),
  };
}

function step1_L4(c: { companyName: string; category: string; keyProduct?: string | null }, claimUrl: string): { subject: string; html: string } {
  const product = c.keyProduct ?? c.category;
  return {
    subject: `Facility managers are replacing ${product} based on maintenance cost — your OpEx data is missing`,
    html: emailShell(`
      ${layerBadge(LAYER_PROFILES.L4)}
      <h2 style="margin:0 0 12px;font-size:20px;font-weight:700;">The FM doesn't care about embodied carbon. They care about waxing, stripping, and callbacks.</h2>
      <p style="color:#374151;">Facility managers replacing ${c.category} have one decision driver: <strong>total cost of ownership.</strong> The product that eliminates waxing labor, survives heavy cleaning chemicals, and lasts 20 years without replacement wins every time — regardless of first cost.</p>
      <p style="color:#374151;"><strong>${c.companyName}</strong> has a profile on GreenChainz. Add the operational data that FMs actually use to build replacement budgets.</p>
      ${coldCalculus(LAYER_PROFILES.L4.coldCalculus)}
      <p style="color:#374151;"><strong>FM decision data your profile should show:</strong></p>
      <ul style="color:#374151;padding-left:20px;line-height:1.9;">
        <li>Cleaning protocol (water only? chemical resistant?)</li>
        <li>Estimated annual maintenance cost per SF</li>
        <li>Expected lifecycle / replacement cycle</li>
        <li>Seamless installation (no grout joints = no pathogen reservoirs)</li>
        <li>Warranty terms</li>
      </ul>
      ${cta("Claim Your Profile & Add TCO Data →", claimUrl)}
    `),
  };
}

function step1_L5(c: { companyName: string; category: string; keyProduct?: string | null }, claimUrl: string): { subject: string; html: string } {
  const product = c.keyProduct ?? c.category;
  return {
    subject: `Your ${product}'s embodied carbon data belongs in their ESG annual report`,
    html: emailShell(`
      ${layerBadge(LAYER_PROFILES.L5)}
      <h2 style="margin:0 0 12px;font-size:20px;font-weight:700;">Institutional investors now require Scope 3 disclosure. Your carbon data is their compliance data.</h2>
      <p style="color:#374151;">Chief Sustainability Officers specifying ${c.category} are under investor pressure to document Scope 3 supply chain emissions. Your product's embodied carbon data — if published — flows directly into their annual ESG report. Products without verified EPD data don't get specified for corporate campuses and institutional projects.</p>
      <p style="color:#374151;"><strong>${c.companyName}</strong> is listed on GreenChainz. Claim your profile to publish the carbon documentation that C-suites require.</p>
      ${coldCalculus(LAYER_PROFILES.L5.coldCalculus)}
      <p style="color:#374151;"><strong>ESG-critical data for your profile:</strong></p>
      <ul style="color:#374151;padding-left:20px;line-height:1.9;">
        <li>EPD with verified GWP (kgCO₂e) — the Scope 3 input number</li>
        <li>Recycled content % (for corporate circular economy targets)</li>
        <li>Biogenic carbon storage (if mass timber / bio-based)</li>
        <li>Regional sourcing radius (Scope 3 transport emissions)</li>
        <li>Cradle-to-Cradle or Declare certifications</li>
      </ul>
      ${cta("Claim Your Profile & Publish Carbon Data →", claimUrl)}
    `),
  };
}

function step1_L6(c: { companyName: string; category: string; keyProduct?: string | null }, claimUrl: string): { subject: string; html: string } {
  const product = c.keyProduct ?? c.category;
  return {
    subject: `Healthcare infection control officers reject porous ${product} — your spec data prevents that`,
    html: emailShell(`
      ${layerBadge(LAYER_PROFILES.L6)}
      <h2 style="margin:0 0 12px;font-size:20px;font-weight:700;">Pathogen reservoirs are a legal liability. Seamless and bleach-resistant specs eliminate the risk.</h2>
      <p style="color:#374151;">Healthcare infection control officers reject materials that harbor pathogens or degrade under UV-C / bleach cleaning protocols. The buying decision for ${c.category} in hospital and clinical environments is driven entirely by infection control outcomes — not aesthetics, not cost, not sustainability.</p>
      <p style="color:#374151;"><strong>${c.companyName}</strong> has a profile on GreenChainz. If your ${product} withstands hospital-grade cleaning, that data needs to be front and center.</p>
      ${coldCalculus(LAYER_PROFILES.L6.coldCalculus)}
      <p style="color:#374151;"><strong>Healthcare buyer data your profile needs:</strong></p>
      <ul style="color:#374151;padding-left:20px;line-height:1.9;">
        <li>Bleach resistance (10% sodium hypochlorite tested)</li>
        <li>Seamless or grout-free installation capability</li>
        <li>GREENGUARD Gold or equivalent low-VOC certification</li>
        <li>Antimicrobial treatment (if applicable)</li>
        <li>UV-C radiation resistance (for disinfection robot compatibility)</li>
        <li>FGI Guidelines compliance for healthcare environments</li>
      </ul>
      ${cta("Claim Your Profile & Add Healthcare Specs →", claimUrl)}
    `),
  };
}

function step1_L7(c: { companyName: string; category: string; keyProduct?: string | null }, claimUrl: string): { subject: string; html: string } {
  const product = c.keyProduct ?? c.category;
  return {
    subject: `Municipal procurement officers can't buy your ${product} without ready-to-go LEED documentation`,
    html: emailShell(`
      ${layerBadge(LAYER_PROFILES.L7)}
      <h2 style="margin:0 0 12px;font-size:20px;font-weight:700;">Procurement officers fear audits. Your LEED documentation eliminates their risk.</h2>
      <p style="color:#374151;">Municipal procurement and institutional purchasing officers buy ${c.category} through cooperative contracts (Sourcewell, OMNIA Partners, TIPS). Products that don't come with pre-compiled LEED submittal documentation don't make it through procurement review — they're cut before the bid closes.</p>
      <p style="color:#374151;"><strong>${c.companyName}</strong> is in our catalog. Claim your profile so your documentation is audit-ready and searchable by cooperative purchasing agents.</p>
      ${coldCalculus(LAYER_PROFILES.L7.coldCalculus)}
      <p style="color:#374151;"><strong>What cooperative purchasers need from your profile:</strong></p>
      <ul style="color:#374151;padding-left:20px;line-height:1.9;">
        <li>Ready-to-submit LEED documentation package</li>
        <li>Sourcewell or other cooperative purchasing contract listing</li>
        <li>SDS (Safety Data Sheets) current and accessible</li>
        <li>Multi-SKU / multi-product catalog for single-vendor efficiency</li>
        <li>Regional distribution points and lead times</li>
      </ul>
      ${cta("Claim Your Profile & Upload LEED Docs →", claimUrl)}
    `),
  };
}

// ─── Layer-specific Step 2 (Day 4 — views follow-up) ─────────────────────────

function step2Html(c: { companyName: string; category: string }, layer: ProcurementLayer, claimUrl: string): { subject: string; html: string } {
  const profile = LAYER_PROFILES[layer];
  const layerHooks: Record<ProcurementLayer, { subject: string; hook: string }> = {
    L1: {
      subject: `Architects are filtering ${c.category} by EPD — your profile doesn't show one`,
      hook: `When architects search GreenChainz for ${c.category} alternatives, they filter immediately by EPD availability. An unclaimed profile with missing EPD data is invisible to the specification writers who matter most.`,
    },
    L2: {
      subject: `A QS firm just searched for ${c.category} cost-performance data — your profile had gaps`,
      hook: `Cost managers are searching GreenChainz for ${c.category} products with whole-life cost backing. Profiles without energy performance or lifecycle data are skipped — the QS moves to the next product with documented ROI.`,
    },
    L3: {
      subject: `A GC searched for low-VOC ${c.category} this week — your product wasn't complete`,
      hook: `Superintendents and subs are searching GreenChainz by VOC content and weight per SF. Your ${c.companyName} profile is missing the installation data they use to select products before a project goes out to bid.`,
    },
    L4: {
      subject: `A facility manager is replacing ${c.category} — your maintenance data isn't visible`,
      hook: `FMs on GreenChainz search by lifecycle cost and cleaning protocol. If your ${c.companyName} profile doesn't show expected lifecycle and maintenance cost, you're not in the conversation when replacement decisions are made.`,
    },
    L5: {
      subject: `A CSO team searched for low-Scope-3 ${c.category} — your carbon data is incomplete`,
      hook: `Corporate sustainability teams are using GreenChainz to document Scope 3 material emissions for annual reports. Your ${c.companyName} profile needs verified GWP data to be included in their carbon accounting.`,
    },
    L6: {
      subject: `A healthcare planner searched for bleach-resistant ${c.category} — your specs were missing`,
      hook: `Healthcare procurement requires very specific data: seamless installation, bleach resistance, GREENGUARD Gold. Your ${c.companyName} profile doesn't currently surface those specs — which means you're invisible to this high-value buyer segment.`,
    },
    L7: {
      subject: `A cooperative purchasing agent searched for ${c.category} with LEED docs — yours weren't there`,
      hook: `Municipal procurement officers need ready-to-go LEED documentation packages. Your ${c.companyName} profile is missing the submittal documentation that enables cooperative purchasing contracts.`,
    },
  };
  const { subject, hook } = layerHooks[layer];
  return {
    subject,
    html: emailShell(`
      ${layerBadge(profile)}
      <h2 style="margin:0 0 12px;font-size:20px;font-weight:700;">Your ${c.companyName} profile is getting attention — but missing key data</h2>
      <p style="color:#374151;">${hook}</p>
      <p style="color:#374151;">Claiming your profile takes about 10 minutes. Once claimed, your ${c.category} data is visible to the procurement layer that buys it — sourced to their specific financial driver, not a generic sustainability message.</p>
      ${coldCalculus(profile.coldCalculus)}
      ${cta(`Complete Your Profile — Add ${profile.financialDriver} Data →`, claimUrl)}
      <p style="font-size:12px;color:#9ca3af;">This is a follow-up to our email from a few days ago. One more check-in coming if we don't hear from you.</p>
    `),
  };
}

// ─── Layer-specific Step 3 (Day 10 — last touch) ─────────────────────────────

function step3Html(c: { companyName: string; category: string }, layer: ProcurementLayer, claimUrl: string): { subject: string; html: string } {
  const profile = LAYER_PROFILES[layer];
  return {
    subject: `Last note — ${c.companyName}'s ${c.category} profile on GreenChainz`,
    html: emailShell(`
      ${layerBadge(profile)}
      <h2 style="margin:0 0 12px;font-size:20px;font-weight:700;">We'll leave this with you</h2>
      <p style="color:#374151;">We reached out twice about your unclaimed <strong>${c.companyName}</strong> profile. We know inboxes are noisy — this is our last note.</p>
      <p style="color:#374151;">The buyers who purchase ${c.category} are on GreenChainz. Their decision driver is <strong>${profile.financialDriver}</strong> — not sustainability. Your profile is the place to make that case with real data.</p>
      <p style="color:#374151;">If you'd like to control how your products appear to <strong>${profile.buyerRole}s</strong> sourcing ${c.category}, the profile is yours to claim at any time.</p>
      ${cta("Claim Your Free Profile", claimUrl)}
      <p style="font-size:12px;color:#9ca3af;">No further emails from us on this unless you reach out. You can always claim later at greenchainz.com/suppliers/claim</p>
    `),
  };
}

// ─── Sequence step builder ────────────────────────────────────────────────────

function buildSequenceStep(
  step: 1 | 2 | 3,
  contact: { companyName: string; category: string; keyProduct?: string | null },
  layer: ProcurementLayer,
  claimToken: string
): { subject: string; html: string } {
  const claimUrl = `${BASE_URL}/suppliers/claim?token=${claimToken}&utm_source=outreach&utm_medium=email&utm_campaign=claim_profile&utm_content=step${step}`;

  if (step === 1) {
    const builders: Record<ProcurementLayer, () => { subject: string; html: string }> = {
      L1: () => step1_L1(contact, claimUrl),
      L2: () => step1_L2(contact, claimUrl),
      L3: () => step1_L3(contact, claimUrl),
      L4: () => step1_L4(contact, claimUrl),
      L5: () => step1_L5(contact, claimUrl),
      L6: () => step1_L6(contact, claimUrl),
      L7: () => step1_L7(contact, claimUrl),
    };
    return builders[layer]();
  }
  if (step === 2) return step2Html(contact, layer, claimUrl);
  return step3Html(contact, layer, claimUrl);
}

// ─── Enroll a contact in the claim-profile sequence ───────────────────────────

export async function enrollInClaimSequence(contactId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const [contact] = await db
    .select()
    .from(crmContacts)
    .where(eq(crmContacts.id, contactId))
    .limit(1);
  if (!contact) return;

  const now = new Date();
  const scheduleStep = (delayDays: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() + delayDays);
    return d;
  };

  // Auto-detect procurement layer from category
  const layer = detectLayer(contact.category ?? "", contact.subcategory, contact.keyProduct);

  // Generate a secure claim token if one doesn't exist yet (expires in 90 days)
  const tokenExpiry = new Date(now);
  tokenExpiry.setDate(tokenExpiry.getDate() + 90);

  const [updatedContact] = await db
    .update(crmContacts)
    .set({
      pitchAngle: contact.pitchAngle ?? `Layer ${layer}: ${LAYER_PROFILES[layer].financialDriver}`,
      claimTokenExpiresAt: tokenExpiry,
      updatedAt: new Date(),
    })
    .where(eq(crmContacts.id, contactId))
    .returning();

  const claimToken = updatedContact?.claimToken ?? contact.claimToken ?? contactId.toString();

  await db.insert(crmEmailSequences).values([
    { contactId, sequenceName: "default", step: 1, scheduledAt: scheduleStep(0), sentAt: null },
    { contactId, sequenceName: "default", step: 2, scheduledAt: scheduleStep(4), sentAt: null },
    { contactId, sequenceName: "default", step: 3, scheduledAt: scheduleStep(10), sentAt: null },
  ]);

  // Store the claim token on the sequence rows isn't needed — it lives on crmContacts
  void claimToken; // referenced in processDueSequenceSteps via contact lookup
}

// ─── Process due sequence steps ───────────────────────────────────────────────

export async function processDueSequenceSteps(): Promise<{ sent: number; errors: number }> {
  const db = await getDb();
  if (!db) return { sent: 0, errors: 0 };

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[outreach] RESEND_API_KEY not set — skipping");
    return { sent: 0, errors: 0 };
  }

  const now = new Date();
  const dueSteps = await db
    .select()
    .from(crmEmailSequences)
    .where(and(isNull(crmEmailSequences.sentAt), lte(crmEmailSequences.scheduledAt, now)));

  const resend = new Resend(apiKey);
  let sent = 0;
  let errors = 0;
  let noEmailSkipped = 0;

  for (const seq of dueSteps) {
    const [contact] = await db
      .select()
      .from(crmContacts)
      .where(eq(crmContacts.id, seq.contactId))
      .limit(1);

    if (!contact?.email) {
      noEmailSkipped++;
      errors++;
      continue;
    }

    // Detect layer (or re-read from pitchAngle if already set)
    let layer: ProcurementLayer = "L1";
    if (contact.pitchAngle) {
      const match = contact.pitchAngle.match(/Layer (L\d)/);
      if (match) layer = match[1] as ProcurementLayer;
    } else {
      layer = detectLayer(contact.category ?? "", contact.subcategory, contact.keyProduct);
    }

    const { subject, html } = buildSequenceStep(
      seq.step as 1 | 2 | 3,
      { companyName: contact.companyName, category: contact.category ?? "sustainable materials", keyProduct: contact.keyProduct },
      layer,
      contact.claimToken ?? contact.id.toString()
    );

    try {
      const { data, error } = await resend.emails.send({
        from: FROM,
        replyTo: REPLY_TO,
        to: contact.email,
        subject,
        html,
      });

      if (error || !data) {
        console.error(`[outreach] Resend error for contact ${seq.contactId} step ${seq.step}:`, error);
        errors++;
        continue;
      }

      // Mark sent
      await db
        .update(crmEmailSequences)
        .set({ sentAt: new Date() })
        .where(eq(crmEmailSequences.id, seq.id));

      await db.insert(crmEvents).values({
        contactId: seq.contactId,
        eventType: "email_sent",
        subject,
        performedBy: "system",
        metadata: { step: seq.step, layer, resendId: data.id },
      });

      await db
        .update(crmContacts)
        .set({ lastContactedAt: new Date(), updatedAt: new Date() })
        .where(eq(crmContacts.id, seq.contactId));

      console.log(`[outreach] Sent Layer ${layer} Step ${seq.step} to ${contact.email} (${contact.companyName})`);
      sent++;
    } catch (err) {
      console.error(`[outreach] Exception sending to ${contact.email}:`, err);
      errors++;
    }
  }

  if (noEmailSkipped > 0) {
    console.warn(`[outreach] Skipped ${noEmailSkipped} contacts with no email (use Apollo enrichment to fix)`);
  }
  console.log(`[outreach] processDueSequenceSteps complete — sent: ${sent}, errors: ${errors}`);
  return { sent, errors };
}

// ─── Manual send ─────────────────────────────────────────────────────────────

export async function sendManualEmail(
  contactId: number,
  subject: string,
  html: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const db = await getDb();
  if (!db) return { success: false, error: "DB unavailable" };

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { success: false, error: "RESEND_API_KEY not set" };

  const [contact] = await db
    .select()
    .from(crmContacts)
    .where(eq(crmContacts.id, contactId))
    .limit(1);

  if (!contact?.email) return { success: false, error: "Contact has no email" };

  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from: FROM,
    replyTo: REPLY_TO,
    to: contact.email,
    subject,
    html,
  });

  if (error || !data) {
    return { success: false, error: error?.message ?? "Unknown Resend error" };
  }

  await db.insert(crmEvents).values({
    contactId,
    eventType: "email_sent",
    subject,
    performedBy: "admin",
    metadata: { manual: true, resendId: data.id },
  });

  await db
    .update(crmContacts)
    .set({ lastContactedAt: new Date(), updatedAt: new Date() })
    .where(eq(crmContacts.id, contactId));

  return { success: true, messageId: data.id };
}

/**
 * Preview a layer-specific email without sending.
 * Useful for admin review before sending a sequence.
 */
export function previewLayerEmail(
  step: 1 | 2 | 3,
  layer: ProcurementLayer,
  contact: { companyName: string; category: string; keyProduct?: string | null }
): { subject: string; html: string; layer: ProcurementLayer; driver: string } {
  const { subject, html } = buildSequenceStep(step, contact, layer, "preview");
  return { subject, html, layer, driver: LAYER_PROFILES[layer].financialDriver };
}

/** Exported for admin preview/testing */
export { detectLayer, LAYER_PROFILES, type ProcurementLayer };