/**
 * GreenChainz — Persona Pipeline Integration
 *
 * Drop-in replacement for the role-based copy functions in:
 *   - lead-outreach-pipeline.ts  (buyer-side: architects, GCs, sustainability)
 *   - scraper-outreach-pipeline.ts (supplier-side: manufacturers, distributors)
 *
 * BEFORE (old system):
 *   switch(role) { case "architect": return hardcoded generic copy; }
 *
 * AFTER (this system):
 *   detectPersona({ jobTitle, company, sector }) → 27 sub-personas
 *   → generatePersonaCopy() → LLM-generated, financially-driven copy
 *   → fallback to static persona template if LLM unavailable
 *
 * The LLM path is async and costs ~$0.001/email at gpt-4.1-mini rates.
 * The static fallback path is synchronous and costs $0.
 * Both paths produce persona-tailored copy — the LLM path is just more specific.
 */

import { detectPersona, type PersonaDetectionInput } from "./persona-detector";
import { generatePersonaCopy, type CopyType } from "./persona-copy-generator";
import { type PersonaDetectionResult } from "./persona-detector";

// ---------------------------------------------------------------------------
// Static Fallback Templates
// One template per sub-persona, pre-written with the correct financial lever.
// Used when LLM is unavailable or for high-volume batch sends.
// ---------------------------------------------------------------------------

interface StaticTemplate {
  subject: string;
  bodyText: string; // Plain text version
  bodyHtml: string; // HTML version
}

function getStaticTemplate(
  persona: PersonaDetectionResult,
  recipientName: string | null,
  recipientCompany: string,
  ctaUrl: string
): StaticTemplate {
  const greeting = recipientName ? `Hi ${recipientName},` : "Hi,";
  const sp = persona.subPersonaId;

  // Each template leads with the financial driver, uses resonant language,
  // and avoids green/eco/sustainable messaging.
  const templates: Partial<Record<typeof sp, StaticTemplate>> = {
    ARCHITECT_OF_RECORD: {
      subject: "EPD verification that holds up in court",
      bodyText: `${greeting}

Spec liability on sustainable materials is real — and growing. GreenChainz gives you third-party verified EPD data and fire-rated assembly specs that are defensible under CDPH v1.2 and IBC.

Every product in our catalog is verified. Every spec is traceable. Green = Legal Safety.

${ctaUrl}

— Jerit, GreenChainz`,
      bodyHtml: `<p>${greeting}</p><p>Spec liability on sustainable materials is real — and growing. GreenChainz gives you <strong>third-party verified EPD data</strong> and fire-rated assembly specs that are defensible under CDPH v1.2 and IBC.</p><p>Every product is verified. Every spec is traceable. <strong>Green = Legal Safety.</strong></p><p><a href="${ctaUrl}">See verified specs →</a></p>`,
    },
    LEED_AP_CONSULTANT: {
      subject: "1,500+ EPDs pre-mapped to LEED MRc4",
      bodyText: `${greeting}

Products without EPDs are useless for LEED credit documentation — you already know that. GreenChainz has 1,500+ verified EPDs pre-mapped to LEED MRc4 and WELL credits, with EC3 integration built in.

Third-party verified. Credit documentation ready to export.

${ctaUrl}

— Jerit, GreenChainz`,
      bodyHtml: `<p>${greeting}</p><p>Products without EPDs are useless for LEED credit documentation. GreenChainz has <strong>1,500+ verified EPDs pre-mapped to LEED MRc4 and WELL credits</strong>, with EC3 integration built in.</p><p>Third-party verified. Credit documentation ready to export.</p><p><a href="${ctaUrl}">Search EPDs →</a></p>`,
    },
    QUANTITY_SURVEYOR: {
      subject: "WLC data that justifies the green premium",
      bodyText: `${greeting}

First-cost objections kill green specs. GreenChainz gives you whole-life cost data showing exactly when the premium pays back — HVAC tonnage reduction, maintenance savings, carbon accounting included.

The QS who brings WLC data wins the argument.

${ctaUrl}

— Jerit, GreenChainz`,
      bodyHtml: `<p>${greeting}</p><p>First-cost objections kill green specs. GreenChainz gives you <strong>whole-life cost data</strong> showing exactly when the premium pays back — HVAC tonnage reduction, maintenance savings, carbon accounting included.</p><p>The QS who brings WLC data wins the argument.</p><p><a href="${ctaUrl}">Run a WLC comparison →</a></p>`,
    },
    PROJECT_MANAGER_GC: {
      subject: "No site shutdowns. No landfill fines.",
      bodyText: `${greeting}

Low-VOC water-based products that don't trigger ventilation shutdowns. Suppliers with Take-Back Programs that solve your landfill diversion mandates. GreenChainz pre-screens for both.

Schedule protection built into every spec.

${ctaUrl}

— Jerit, GreenChainz`,
      bodyHtml: `<p>${greeting}</p><p>Low-VOC water-based products that don't trigger ventilation shutdowns. Suppliers with Take-Back Programs that solve your landfill diversion mandates. GreenChainz pre-screens for both.</p><p><strong>Schedule protection built into every spec.</strong></p><p><a href="${ctaUrl}">Find compliant suppliers →</a></p>`,
    },
    FACILITY_MANAGER: {
      subject: "No more waxing. No more stripping.",
      bodyText: `${greeting}

VCT is an OpEx trap. GreenChainz helps you spec polished concrete and durable finishes that need nothing but water. Lower maintenance labor. No overtime. No stripping crews.

Green = less overtime labor.

${ctaUrl}

— Jerit, GreenChainz`,
      bodyHtml: `<p>${greeting}</p><p>VCT is an OpEx trap. GreenChainz helps you spec polished concrete and durable finishes that need nothing but water. <strong>Lower maintenance labor. No overtime. No stripping crews.</strong></p><p>Green = less overtime labor.</p><p><a href="${ctaUrl}">See durable specs →</a></p>`,
    },
    CHIEF_SUSTAINABILITY_OFFICER: {
      subject: "Scope 3 supply chain data for your Annual Report",
      bodyText: `${greeting}

Investor-grade Scope 3 reporting requires verified supply chain carbon data — not manufacturer claims. GreenChainz gives you verified EPD data mapped to GHG Protocol Scope 3 categories, ready for your Annual Report.

SBTi-aligned. Buy Clean compatible.

${ctaUrl}

— Jerit, GreenChainz`,
      bodyHtml: `<p>${greeting}</p><p>Investor-grade Scope 3 reporting requires verified supply chain carbon data — not manufacturer claims. GreenChainz gives you <strong>verified EPD data mapped to GHG Protocol Scope 3 categories</strong>, ready for your Annual Report.</p><p>SBTi-aligned. Buy Clean compatible.</p><p><a href="${ctaUrl}">See Scope 3 data →</a></p>`,
    },
    DISTRIBUTOR: {
      subject: "Ready-to-go LEED docs. Zero dead stock.",
      bodyText: `${greeting}

Multi-functional SKUs with complete LEED documentation packages reduce your admin burden and keep inventory turning. GreenChainz connects you directly with buyers who are specifying your product categories right now.

No dead stock. No documentation scramble.

${ctaUrl}

— Jerit, GreenChainz`,
      bodyHtml: `<p>${greeting}</p><p>Multi-functional SKUs with complete LEED documentation packages reduce your admin burden and keep inventory turning. GreenChainz connects you directly with buyers specifying your product categories right now.</p><p><strong>No dead stock. No documentation scramble.</strong></p><p><a href="${ctaUrl}">List your products →</a></p>`,
    },
    MUNICIPAL_PROCUREMENT: {
      subject: "Audit-safe sustainable materials on cooperative contracts",
      bodyText: `${greeting}

Municipal procurement needs audit-safe sourcing. GreenChainz lists materials on cooperative purchasing contracts and provides complete Buy Clean compliance documentation — so every purchase is legally defensible.

Sourcewell-compatible. Zero audit exposure.

${ctaUrl}

— Jerit, GreenChainz`,
      bodyHtml: `<p>${greeting}</p><p>Municipal procurement needs audit-safe sourcing. GreenChainz lists materials on cooperative purchasing contracts and provides complete Buy Clean compliance documentation — so every purchase is <strong>legally defensible.</strong></p><p>Sourcewell-compatible. Zero audit exposure.</p><p><a href="${ctaUrl}">See compliant materials →</a></p>`,
    },
  };

  // Use specific template if available, otherwise build a generic one from persona data
  if (templates[sp]) {
    return templates[sp]!;
  }

  // Generic fallback using persona intelligence
  return {
    subject: `${persona.driver.split("/")[0].trim().toLowerCase()} — GreenChainz`,
    bodyText: `${greeting}

${persona.pain}

GreenChainz solves this directly: ${persona.keySolution}

${ctaUrl}

— Jerit, GreenChainz`,
    bodyHtml: `<p>${greeting}</p><p>${persona.pain}</p><p><strong>GreenChainz solves this directly:</strong> ${persona.keySolution}</p><p><a href="${ctaUrl}">Learn more →</a></p>`,
  };
}

// ---------------------------------------------------------------------------
// Main Integration Functions
// These are called from lead-outreach-pipeline.ts and scraper-outreach-pipeline.ts
// ---------------------------------------------------------------------------

export interface PersonaEmailResult {
  subject: string;
  html: string;
  text: string;
  personaDetected: string;
  driver: string;
  confidence: number;
  usedLLM: boolean;
}

/**
 * Generate persona-tailored email for a buyer lead.
 * Replaces the role-switch logic in lead-outreach-pipeline.ts
 *
 * @param lead - Contact data from scraped_leads table
 * @param ctaUrl - The CTA URL to include in the email
 * @param useLLM - Whether to use LLM generation (default: true if OUTREACH_LLM_ENABLED=true)
 */
export async function generateBuyerEmail(
  lead: {
    full_name: string | null;
    title: string | null;
    company: string;
    role: string;
    city?: string | null;
    state?: string | null;
  },
  ctaUrl: string,
  useLLM?: boolean
): Promise<PersonaEmailResult> {
  const shouldUseLLM =
    useLLM ?? process.env.OUTREACH_LLM_ENABLED === "true";

  // Detect persona from scraped signals
  const detectionInput: PersonaDetectionInput = {
    jobTitle: lead.title ?? lead.role,
    company: lead.company,
    sector: lead.role, // role field from scraper is a sector hint
  };

  const persona = detectPersona(detectionInput);

  // If no persona detected, fall back to role-based generic copy
  if (!persona) {
    return generateFallbackBuyerEmail(lead, ctaUrl);
  }

  const recipientName = lead.full_name ?? null;
  const recipientCompany = lead.company;

  // LLM path
  if (shouldUseLLM && persona.autoApproved) {
    try {
      const generated = await generatePersonaCopy({
        copyType: "cold_outreach_email",
        persona,
        recipientName: recipientName ?? undefined,
        recipientCompany,
        senderName: "Jerit",
        includeCta: true,
      });

      return {
        subject: generated.subject ?? `${persona.driver} — GreenChainz`,
        html: wrapInEmailTemplate(generated.body, ctaUrl),
        text: `${generated.body}\n\n${ctaUrl}\n\n— Jerit, GreenChainz\n\nUnsubscribe: ${process.env.FRONTEND_URL ?? "https://greenchainz.com"}/unsubscribe?email={{email}}`,
        personaDetected: persona.subPersonaTitle,
        driver: persona.driver,
        confidence: persona.confidence,
        usedLLM: true,
      };
    } catch (err) {
      console.warn(`[persona] LLM copy generation failed, using static template: ${err}`);
    }
  }

  // Static template path
  const template = getStaticTemplate(persona, recipientName, recipientCompany, ctaUrl);

  return {
    subject: template.subject,
    html: wrapInEmailTemplate(template.bodyHtml, ctaUrl),
    text: template.bodyText,
    personaDetected: persona.subPersonaTitle,
    driver: persona.driver,
    confidence: persona.confidence,
    usedLLM: false,
  };
}

/**
 * Generate persona-tailored email for a scraped supplier.
 * Replaces the generic supplier outreach in scraper-outreach-pipeline.ts
 */
export async function generateSupplierEmail(
  supplier: {
    company_name: string;
    email: string;
    city?: string | null;
    state?: string | null;
    source?: string;
    product_category?: string | null;
  },
  ctaUrl: string,
  useLLM?: boolean
): Promise<PersonaEmailResult> {
  const shouldUseLLM =
    useLLM ?? process.env.OUTREACH_LLM_ENABLED === "true";

  const detectionInput: PersonaDetectionInput = {
    company: supplier.company_name,
    sector: supplier.product_category ?? supplier.source ?? "manufacturer",
  };

  const persona = detectPersona(detectionInput);

  if (!persona) {
    return generateFallbackSupplierEmail(supplier, ctaUrl);
  }

  if (shouldUseLLM && persona.autoApproved) {
    try {
      const generated = await generatePersonaCopy({
        copyType: "supplier_pitch",
        persona,
        recipientCompany: supplier.company_name,
        materialCategory: supplier.product_category ?? undefined,
        senderName: "Jerit",
        includeCta: true,
      });

      return {
        subject: generated.subject ?? "GreenChainz — verified supplier network",
        html: wrapInEmailTemplate(generated.body, ctaUrl),
        text: `${generated.body}\n\n${ctaUrl}\n\n— Jerit, GreenChainz`,
        personaDetected: persona.subPersonaTitle,
        driver: persona.driver,
        confidence: persona.confidence,
        usedLLM: true,
      };
    } catch (err) {
      console.warn(`[persona] LLM supplier copy failed, using static: ${err}`);
    }
  }

  const template = getStaticTemplate(persona, null, supplier.company_name, ctaUrl);

  return {
    subject: template.subject,
    html: wrapInEmailTemplate(template.bodyHtml, ctaUrl),
    text: template.bodyText,
    personaDetected: persona.subPersonaTitle,
    driver: persona.driver,
    confidence: persona.confidence,
    usedLLM: false,
  };
}

// ---------------------------------------------------------------------------
// Fallback generators (when no persona is detected)
// ---------------------------------------------------------------------------

function generateFallbackBuyerEmail(
  lead: { full_name: string | null; title: string | null; company: string; role: string },
  ctaUrl: string
): PersonaEmailResult {
  const greeting = lead.full_name ? `Hi ${lead.full_name},` : "Hi,";
  const body = `${greeting}

GreenChainz gives ${lead.company} instant access to 1,500+ verified sustainable building materials with EPD data — searchable by compliance standard, material type, and performance spec.

Submit RFQs to multiple verified suppliers in under a minute.

${ctaUrl}

— Jerit, GreenChainz`;

  return {
    subject: "Verified sustainable materials — GreenChainz",
    html: wrapInEmailTemplate(`<p>${greeting}</p><p>GreenChainz gives <strong>${lead.company}</strong> instant access to 1,500+ verified sustainable building materials with EPD data — searchable by compliance standard, material type, and performance spec.</p><p>Submit RFQs to multiple verified suppliers in under a minute.</p>`, ctaUrl),
    text: body,
    personaDetected: "unknown",
    driver: "EFFICIENCY",
    confidence: 0,
    usedLLM: false,
  };
}

function generateFallbackSupplierEmail(
  supplier: { company_name: string },
  ctaUrl: string
): PersonaEmailResult {
  const body = `Hi,

GreenChainz connects verified sustainable material suppliers with architects, GCs, and procurement teams who are actively specifying your product categories.

Get a verified supplier profile and start receiving RFQs.

${ctaUrl}

— Jerit, GreenChainz`;

  return {
    subject: "Verified supplier profile — GreenChainz",
    html: wrapInEmailTemplate(`<p>GreenChainz connects verified sustainable material suppliers with architects, GCs, and procurement teams actively specifying your product categories.</p><p>Get a verified supplier profile and start receiving RFQs.</p>`, ctaUrl),
    text: body,
    personaDetected: "unknown",
    driver: "REVENUE",
    confidence: 0,
    usedLLM: false,
  };
}

// ---------------------------------------------------------------------------
// HTML Email Wrapper
// ---------------------------------------------------------------------------

function wrapInEmailTemplate(bodyHtml: string, ctaUrl: string): string {
  const BASE_URL = process.env.FRONTEND_URL ?? "https://greenchainz.com";
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #1a1a1a; margin: 0; padding: 0; background: #f5f5f5; }
    .wrapper { max-width: 600px; margin: 0 auto; background: white; }
    .header { background: #0f172a; padding: 28px 40px; }
    .header h1 { color: white; margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.3px; }
    .header p { color: rgba(255,255,255,0.6); margin: 4px 0 0; font-size: 13px; }
    .body { padding: 36px 40px; }
    .body p { margin: 0 0 16px; font-size: 15px; }
    .body strong { color: #0f172a; }
    .body a { color: #10b981; }
    .cta-block { margin: 28px 0; }
    .cta { display: inline-block; background: #10b981; color: white !important; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 700; font-size: 15px; }
    .footer { padding: 20px 40px; border-top: 1px solid #e5e7eb; }
    .footer p { color: #9ca3af; font-size: 12px; margin: 4px 0; }
    .footer a { color: #9ca3af; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>GreenChainz</h1>
      <p>Verified Sustainable Building Materials</p>
    </div>
    <div class="body">
      ${bodyHtml}
      <div class="cta-block">
        <a href="${ctaUrl}" class="cta">Get Started Free →</a>
      </div>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} GreenChainz Inc. · Danville, Virginia</p>
      <p><a href="${BASE_URL}/unsubscribe?email={{email}}">Unsubscribe</a> · <a href="${BASE_URL}">greenchainz.com</a></p>
    </div>
  </div>
</body>
</html>`.trim();
}
