/**
 * GreenChainz — Persona Detection Engine
 *
 * Classifies any contact or company into one of the 7 procurement layers
 * and the most specific sub-persona, based on scraped signals.
 *
 * Usage:
 *   const result = detectPersona({ jobTitle: "LEED AP", company: "Gensler", sector: "architecture" });
 *   // => { layerId: "DESIGN_AUTHORITY", subPersonaId: "LEED_AP_CONSULTANT", confidence: 0.92, ... }
 */

import {
  PERSONA_LAYERS,
  type PersonaId,
  type SubPersonaId,
  type SubPersona,
} from "./persona-intelligence";

// ---------------------------------------------------------------------------
// Input / Output Types
// ---------------------------------------------------------------------------

export interface PersonaDetectionInput {
  /** Raw job title from LinkedIn, website scrape, or form field */
  jobTitle?: string;
  /** Company name */
  company?: string;
  /** Industry/sector tag from scrape or enrichment */
  sector?: string;
  /** Free-text bio or about section */
  bio?: string;
  /** Any certifications mentioned (LEED AP, WELL AP, AIA, RICS, etc.) */
  certifications?: string[];
  /** Company size hint */
  companySize?: "solo" | "small" | "mid" | "large" | "enterprise";
}

export interface PersonaDetectionResult {
  /** The matched layer */
  layerId: PersonaId;
  layerName: string;
  /** The most specific sub-persona */
  subPersonaId: SubPersonaId;
  subPersonaTitle: string;
  /** 0–1 confidence score */
  confidence: number;
  /** The financial driver to lead with in all copy */
  driver: string;
  /** The core pain to address */
  pain: string;
  /** The GreenChainz solution to pitch */
  keySolution: string;
  /** Exact language to use in outreach */
  resonantLanguage: string[];
  /** Language to avoid */
  avoidLanguage: string[];
  /** All signals that contributed to this match */
  matchedSignals: string[];
  /** Whether confidence is high enough to auto-send outreach without human review */
  autoApproved: boolean;
}

// ---------------------------------------------------------------------------
// Scoring Engine
// ---------------------------------------------------------------------------

interface ScoredSubPersona {
  subPersona: SubPersona;
  score: number;
  matchedSignals: string[];
}

function normalise(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").trim();
}

function scoreSubPersona(
  sp: SubPersona,
  inputs: {
    titleNorm: string;
    companyNorm: string;
    sectorNorm: string;
    bioNorm: string;
    certsNorm: string;
  }
): ScoredSubPersona {
  let score = 0;
  const matchedSignals: string[] = [];

  const { titleNorm, companyNorm, sectorNorm, bioNorm, certsNorm } = inputs;
  const allText = `${titleNorm} ${companyNorm} ${sectorNorm} ${bioNorm} ${certsNorm}`;

  // Title signals are the strongest signal — 3 points each
  for (const signal of sp.titleSignals) {
    const norm = normalise(signal);
    if (titleNorm.includes(norm)) {
      score += 3;
      matchedSignals.push(`title:"${signal}"`);
    } else if (allText.includes(norm)) {
      score += 1;
      matchedSignals.push(`context:"${signal}"`);
    }
  }

  // Company signals — 2 points each
  for (const signal of sp.companySignals) {
    const norm = normalise(signal);
    if (companyNorm.includes(norm) || sectorNorm.includes(norm)) {
      score += 2;
      matchedSignals.push(`company:"${signal}"`);
    } else if (allText.includes(norm)) {
      score += 1;
      matchedSignals.push(`context:"${signal}"`);
    }
  }

  // Resonant language in bio — 1 point each (shows they already speak the language)
  for (const lang of sp.resonantLanguage) {
    const norm = normalise(lang);
    if (bioNorm.includes(norm) || certsNorm.includes(norm)) {
      score += 1;
      matchedSignals.push(`resonance:"${lang}"`);
    }
  }

  return { subPersona: sp, score, matchedSignals };
}

// ---------------------------------------------------------------------------
// Main Detector
// ---------------------------------------------------------------------------

export function detectPersona(
  input: PersonaDetectionInput
): PersonaDetectionResult | null {
  const titleNorm = normalise(input.jobTitle ?? "");
  const companyNorm = normalise(input.company ?? "");
  const sectorNorm = normalise(input.sector ?? "");
  const bioNorm = normalise(input.bio ?? "");
  const certsNorm = normalise((input.certifications ?? []).join(" "));

  const normInputs = { titleNorm, companyNorm, sectorNorm, bioNorm, certsNorm };

  // Score every sub-persona
  const scored: ScoredSubPersona[] = [];
  for (const layer of PERSONA_LAYERS) {
    for (const sp of layer.subPersonas) {
      scored.push(scoreSubPersona(sp, normInputs));
    }
  }

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  const best = scored[0];

  // If no signals matched at all, return null (unknown persona)
  if (best.score === 0) return null;

  // Confidence: normalise against a theoretical max of ~15 points
  // (5 title signals × 3 + 5 company signals × 2 + 5 resonance × 1 = 30 max, but real max ~12)
  const confidence = Math.min(best.score / 12, 1);

  const sp = best.subPersona;
  const layer = PERSONA_LAYERS.find((l) => l.id === sp.layer)!;

  return {
    layerId: sp.layer,
    layerName: layer.name,
    subPersonaId: sp.id,
    subPersonaTitle: sp.title,
    confidence,
    driver: sp.driver,
    pain: sp.pain,
    keySolution: sp.keySolution,
    resonantLanguage: sp.resonantLanguage,
    avoidLanguage: sp.avoidLanguage,
    matchedSignals: best.matchedSignals,
    // Auto-approve outreach if confidence >= 0.5 and at least one title signal matched
    autoApproved:
      confidence >= 0.5 &&
      best.matchedSignals.some((s) => s.startsWith("title:")),
  };
}

// ---------------------------------------------------------------------------
// Batch Detector — for processing scraped contact lists
// ---------------------------------------------------------------------------

export interface BatchDetectionInput extends PersonaDetectionInput {
  /** External ID from your CRM or scrape job */
  externalId?: string;
  email?: string;
  name?: string;
}

export interface BatchDetectionOutput extends BatchDetectionInput {
  persona: PersonaDetectionResult | null;
  /** ISO timestamp of classification */
  classifiedAt: string;
}

export function detectPersonaBatch(
  contacts: BatchDetectionInput[]
): BatchDetectionOutput[] {
  return contacts.map((contact) => ({
    ...contact,
    persona: detectPersona(contact),
    classifiedAt: new Date().toISOString(),
  }));
}

// ---------------------------------------------------------------------------
// Utility: get the top N sub-personas for a contact (for ambiguous cases)
// ---------------------------------------------------------------------------

export function getTopPersonas(
  input: PersonaDetectionInput,
  topN = 3
): Array<{ subPersonaId: SubPersonaId; score: number; matchedSignals: string[] }> {
  const titleNorm = normalise(input.jobTitle ?? "");
  const companyNorm = normalise(input.company ?? "");
  const sectorNorm = normalise(input.sector ?? "");
  const bioNorm = normalise(input.bio ?? "");
  const certsNorm = normalise((input.certifications ?? []).join(" "));

  const normInputs = { titleNorm, companyNorm, sectorNorm, bioNorm, certsNorm };

  const scored: ScoredSubPersona[] = [];
  for (const layer of PERSONA_LAYERS) {
    for (const sp of layer.subPersonas) {
      scored.push(scoreSubPersona(sp, normInputs));
    }
  }

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, topN).map((s) => ({
    subPersonaId: s.subPersona.id,
    score: s.score,
    matchedSignals: s.matchedSignals,
  }));
}
