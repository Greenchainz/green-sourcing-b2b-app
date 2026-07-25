/**
 * Persona Seed — decision_maker_personas
 * ────────────────────────────────────────
 * Populates the decision_maker_personas table with the 5 GreenChainz buyer
 * personas and their CCPS scoring weights.
 *
 * The 6 DB columns (carbon/compliance/certification/cost/supplyChain/health)
 * are seeded here. The remaining 3 families (financial/regional/buyerFit) are
 * code-only defaults in composite-score.ts until schema migration adds columns.
 *
 * Called from:
 *   POST /api/admin/seed-personas   (admin-only, idempotent)
 *
 * Safe to re-run — checks for existing rows by personaKey and upserts in-place.
 */

import { getDb } from "./db";
import { decisionMakerPersonas } from "../drizzle/schema";

interface PersonaSeed {
  personaKey: string;
  title: string;
  description: string;
  carbonWeight: string;
  complianceWeight: string;
  certificationWeight: string;
  costWeight: string;
  supplyChainWeight: string;
  healthWeight: string; // DB column name for the "reliability" family
}

const PERSONAS: PersonaSeed[] = [
  {
    personaKey: "architect",
    title: "Architect / Specifier",
    description:
      "Design-lead stakeholder responsible for material selection and sustainability specs. " +
      "Prioritises embodied carbon, LEED credits, and certification transparency.",
    carbonWeight: "0.22",
    complianceWeight: "0.16",
    certificationWeight: "0.14",
    costWeight: "0.08",
    supplyChainWeight: "0.08",
    healthWeight: "0.06",
  },
  {
    personaKey: "gc_pm",
    title: "GC Project Manager",
    description:
      "Construction operations lead focused on on-time delivery, total landed cost, " +
      "and supply chain reliability. Carbon is a secondary metric.",
    carbonWeight: "0.10",
    complianceWeight: "0.12",
    certificationWeight: "0.08",
    costWeight: "0.22",
    supplyChainWeight: "0.18",
    healthWeight: "0.14",
  },
  {
    personaKey: "owner_esg",
    title: "Owner / ESG Officer",
    description:
      "Developer or institutional owner driven by ESG reporting, sustainability certifications, " +
      "and long-term asset value. Heaviest weight on carbon and compliance.",
    carbonWeight: "0.28",
    complianceWeight: "0.20",
    certificationWeight: "0.16",
    costWeight: "0.08",
    supplyChainWeight: "0.06",
    healthWeight: "0.06",
  },
  {
    personaKey: "procurement",
    title: "Procurement / Estimator",
    description:
      "Financial gatekeeper focused on unit price, total cost of ownership, " +
      "supplier financial stability, and delivery reliability.",
    carbonWeight: "0.08",
    complianceWeight: "0.14",
    certificationWeight: "0.08",
    costWeight: "0.26",
    supplyChainWeight: "0.18",
    healthWeight: "0.14",
  },
  {
    personaKey: "default",
    title: "General Buyer",
    description:
      "Balanced default persona when the buyer role has not been determined. " +
      "Equal-ish weighting across all dimensions.",
    carbonWeight: "0.15",
    complianceWeight: "0.14",
    certificationWeight: "0.12",
    costWeight: "0.14",
    supplyChainWeight: "0.13",
    healthWeight: "0.12",
  },
];

export interface PersonaSeedResult {
  inserted: number;
  updated: number;
  errors: string[];
}

export async function seedPersonas(): Promise<PersonaSeedResult> {
  const db = await getDb();
  if (!db) {
    return { inserted: 0, updated: 0, errors: ["Database connection unavailable"] };
  }

  let upserted = 0;
  const errors: string[] = [];

  for (const p of PERSONAS) {
    try {
      await db
        .insert(decisionMakerPersonas)
        .values({
          personaKey:          p.personaKey,
          title:               p.title,
          description:         p.description,
          carbonWeight:        p.carbonWeight,
          complianceWeight:    p.complianceWeight,
          certificationWeight: p.certificationWeight,
          costWeight:          p.costWeight,
          supplyChainWeight:   p.supplyChainWeight,
          healthWeight:        p.healthWeight,
        })
        .onConflictDoUpdate({
          target: decisionMakerPersonas.personaKey,
          set: {
            title:               p.title,
            description:         p.description,
            carbonWeight:        p.carbonWeight,
            complianceWeight:    p.complianceWeight,
            certificationWeight: p.certificationWeight,
            costWeight:          p.costWeight,
            supplyChainWeight:   p.supplyChainWeight,
            healthWeight:        p.healthWeight,
          },
        });
      upserted++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[seed-personas] Failed to upsert persona "${p.personaKey}":`, msg);
      errors.push(`${p.personaKey}: ${msg}`);
    }
  }

  console.log(`[seed-personas] Done — ${upserted} upserted, ${errors.length} errors`);
  return { inserted: upserted, updated: 0, errors };
}
