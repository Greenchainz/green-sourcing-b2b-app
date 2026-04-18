/**
 * GreenChainz — Personas Module
 *
 * Public API for the 7-layer procurement persona system.
 *
 * Quick start:
 *
 *   import { detectPersona, generateBuyerEmail } from "./personas";
 *
 *   // 1. Classify a contact from scraped data
 *   const persona = detectPersona({
 *     jobTitle: "LEED AP",
 *     company: "Gensler",
 *     sector: "architecture",
 *   });
 *   // => { subPersonaId: "LEED_AP_CONSULTANT", driver: "THE POINT SYSTEM", confidence: 0.83, ... }
 *
 *   // 2. Generate a tailored outreach email
 *   const email = await generateBuyerEmail(lead, ctaUrl);
 *   // => { subject: "1,500+ EPDs pre-mapped to LEED MRc4", html: "...", ... }
 *
 *   // 3. Generate LLM copy for a specific persona
 *   const copy = await generatePersonaCopy({
 *     copyType: "cold_outreach_email",
 *     persona,
 *     recipientName: "Sarah",
 *     recipientCompany: "Gensler",
 *   });
 */

export { detectPersona, detectPersonaBatch, getTopPersonas } from "./persona-detector";
export type { PersonaDetectionInput, PersonaDetectionResult, BatchDetectionInput, BatchDetectionOutput } from "./persona-detector";

export { generatePersonaCopy, generatePersonaCopyBatch } from "./persona-copy-generator";
export type { CopyRequest, CopyType, GeneratedCopy, BatchCopyRequest, BatchCopyOutput } from "./persona-copy-generator";

export { generateBuyerEmail, generateSupplierEmail } from "./persona-pipeline-integration";
export type { PersonaEmailResult } from "./persona-pipeline-integration";

export { PERSONA_LAYERS, ALL_SUB_PERSONAS } from "./persona-intelligence";
export type { PersonaId, SubPersonaId, SubPersona, PersonaLayer } from "./persona-intelligence";
