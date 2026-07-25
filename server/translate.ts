/**
 * Translation utility for EC3 EPD data.
 *
 * Primary:  Azure Cognitive Services Translator (REST API — no extra npm package).
 *           Free F0 tier: 2 million characters/month.
 *           Set AZURE_TRANSLATOR_KEY (and optionally AZURE_TRANSLATOR_REGION) in .env.
 *
 * Fallback: Google Translate free endpoint (no key, rate-limited — dev/ci only).
 *           Used automatically when AZURE_TRANSLATOR_KEY is not set.
 *
 * Both paths are fire-and-forget safe: any failure returns the original text
 * so a translation outage never blocks an EC3 sync.
 */

import { ENV } from "./_core/env";

const AZURE_ENDPOINT = "https://api.cognitive.microsofttranslator.com/translate";
const GOOGLE_ENDPOINT = "https://translate.googleapis.com/translate_a/single";

// ---------------------------------------------------------------------------
// Language detection
// ---------------------------------------------------------------------------

/**
 * Returns true if the string is likely NOT English and should be translated.
 * Heuristic: non-Latin scripts, European diacritics, and common building-
 * materials keywords from German / French / Spanish / Nordic EPD sources.
 */
export function isLikelyNonEnglish(text: string): boolean {
  if (!text || text.trim().length < 4) return false;

  // Non-Latin scripts (Cyrillic, CJK, Arabic, etc.)
  if (/[Ѐ-ӿ؀-ۿ一-鿿぀-ヿ]/.test(text)) return true;

  // European diacritics absent from English
  const diacritics = text.match(/[äöüßéèêàâçñøåæœÄÖÜÉÈÊÀÂÇÑØÅÆŒ]/g);
  if (diacritics && diacritics.length >= 2) return true;

  // Common non-English building-materials keywords
  const foreignKeywords = [
    // German
    "und", "oder", "für", "mit", "aus", "bei", "nach", "durch",
    "Beton", "Stahl", "Holz", "Glas", "Dämmung", "Dach",
    // French
    "béton", "acier", "bois", "verre", "isolation", "toiture",
    "avec", "pour", "dans", "sur",
    // Norwegian / Swedish / Danish
    "betong", "stål", "tre", "glass", "isolasjon", "tak",
    "och", "eller", "med", "för", "av",
    // Spanish
    "hormigón", "acero", "madera", "vidrio", "aislamiento",
    "con", "para", "por",
  ];

  const lower = text.toLowerCase();
  if (lower.split(/\s+/).length < 3) return false; // too short to detect reliably

  const hits = foreignKeywords.filter((kw) => lower.includes(kw.toLowerCase())).length;
  return hits >= 2;
}

// ---------------------------------------------------------------------------
// Azure Cognitive Services Translator (primary)
// ---------------------------------------------------------------------------

/**
 * Translate text using Azure Cognitive Services Translator.
 * Returns null if the key is not configured or the request fails.
 */
async function translateViaAzure(text: string): Promise<string | null> {
  const key = ENV.azureTranslatorKey;
  if (!key) return null;

  const url = `${AZURE_ENDPOINT}?api-version=3.0&to=en`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": key,
        "Ocp-Apim-Subscription-Region": ENV.azureTranslatorRegion,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([{ Text: text }]),
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) {
      console.error(`[translate] Azure Translator error ${res.status}: ${await res.text()}`);
      return null;
    }

    // Shape: [{ detectedLanguage: {language, score}, translations: [{text, to}] }]
    const data = (await res.json()) as Array<{
      detectedLanguage?: { language: string; score: number };
      translations: Array<{ text: string; to: string }>;
    }>;

    const detected = data[0]?.detectedLanguage?.language;
    // Skip translation if Azure already detected English
    if (detected === "en") return text;

    const translated = data[0]?.translations?.[0]?.text;
    return translated?.trim() || null;
  } catch (err) {
    console.error("[translate] Azure Translator request failed:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Google Translate free endpoint (fallback / dev)
// ---------------------------------------------------------------------------

/**
 * Translate text using the unofficial Google Translate endpoint.
 * No key required. Rate-limited — dev and low-volume CI only.
 * Returns null on any failure.
 */
async function translateViaGoogle(text: string): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      client: "gtx",
      sl: "auto",
      tl: "en",
      dt: "t",
      q: text,
    });

    const res = await fetch(`${GOOGLE_ENDPOINT}?${params.toString()}`, {
      headers: { "User-Agent": "GreenChainz-EC3-Sync/1.0" },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return null;

    // Shape: [[[translatedChunk, originalChunk, ...], ...], ...]
    const data = (await res.json()) as Array<unknown>;
    if (!Array.isArray(data) || !Array.isArray(data[0])) return null;

    const translated = (data[0] as Array<[string]>)
      .map((chunk) => chunk[0])
      .join("")
      .trim();

    return translated || null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Translate a single string to English.
 * Uses Azure Translator if AZURE_TRANSLATOR_KEY is set; falls back to Google.
 * Returns the original text if translation is not needed or fails.
 */
export async function translateToEnglish(text: string): Promise<string> {
  if (!text || !isLikelyNonEnglish(text)) return text;

  // Try Azure first (production-grade, rate-limit safe)
  const azureResult = await translateViaAzure(text);
  if (azureResult) return azureResult;

  // Fall back to Google free endpoint (dev / no key configured)
  const googleResult = await translateViaGoogle(text);
  return googleResult ?? text;
}

/**
 * Translate specified string fields of an object to English in parallel.
 */
export async function translateFields<T extends Record<string, unknown>>(
  obj: T,
  keys: (keyof T)[]
): Promise<T> {
  const result = { ...obj };
  await Promise.all(
    keys.map(async (key) => {
      const val = result[key];
      if (typeof val === "string" && val.trim().length > 0) {
        (result as Record<string, unknown>)[key as string] =
          await translateToEnglish(val);
      }
    })
  );
  return result;
}
