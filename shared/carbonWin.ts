/**
 * Carbon Win — isomorphic core logic (browser + Node).
 *
 * A "Carbon Win" turns a lower-carbon material choice into a shareable,
 * branded trophy. Share links are STATELESS: the win is encoded into the URL
 * (?d=<base64url json>), so no database row is needed to render or unfurl one.
 *
 * IMPORTANT: keep this file free of browser- or Node-only globals at module
 * scope so it can be imported by both the Vite client and the esbuild server
 * bundle (used for crawler-facing OpenGraph injection).
 */

export interface CarbonWinData {
  /** Absolute CO2e avoided, in kilograms. */
  co2SavedKg: number;
  /** The original / baseline material. */
  fromMaterial: string;
  /** The chosen lower-carbon material. */
  toMaterial: string;
  /** The supplier who wins the spec (the money lane). */
  supplier?: string;
  /** Optional project name. */
  project?: string;
  /** Percentage reduction vs baseline (0-100). */
  savingsPct?: number;
  /** ISO date string (defaults to render time). */
  date?: string;
  /**
   * When true, co2SavedKg is a per-declared-unit GWP delta, not a total
   * project saving. Omit absolute real-world equivalences in this case.
   */
  perUnit?: boolean;
}

/** Guard against absurd/abusive share strings. */
export const MAX_WIN_PARAM_LENGTH = 2000;
const MAX_TEXT_LENGTH = 120;

// ── Encode / decode (isomorphic base64url of JSON) ──────────────────────────

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return globalThis.btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = globalThis.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function toBase64Url(base64: string): string {
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(input: string): string {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = normalized.length % 4;
  return pad ? normalized + "=".repeat(4 - pad) : normalized;
}

function clampText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, MAX_TEXT_LENGTH);
}

/** Serialize a win into a compact, URL-safe token. */
export function encodeWin(data: CarbonWinData): string {
  const compact = {
    c: Math.max(0, Math.round(Number(data.co2SavedKg) || 0)),
    f: clampText(data.fromMaterial),
    t: clampText(data.toMaterial),
    s: data.supplier ? clampText(data.supplier) : undefined,
    p: data.project ? clampText(data.project) : undefined,
    r: typeof data.savingsPct === "number" ? Math.round(data.savingsPct) : undefined,
    d: data.date,
    u: data.perUnit ? true : undefined,
  };
  const json = JSON.stringify(compact);
  const bytes = new TextEncoder().encode(json);
  return toBase64Url(bytesToBase64(bytes));
}

/** Parse a win token back into data. Returns null on anything malformed. */
export function decodeWin(token: string | null | undefined): CarbonWinData | null {
  if (!token || token.length > MAX_WIN_PARAM_LENGTH) return null;
  try {
    const bytes = base64ToBytes(fromBase64Url(token));
    const json = new TextDecoder().decode(bytes);
    const raw = JSON.parse(json) as Record<string, unknown>;
    const co2SavedKg = Math.max(0, Math.round(Number(raw.c) || 0));
    const fromMaterial = clampText(raw.f);
    const toMaterial = clampText(raw.t);
    if (!fromMaterial || !toMaterial) return null;
    return {
      co2SavedKg,
      fromMaterial,
      toMaterial,
      supplier: raw.s ? clampText(raw.s) : undefined,
      project: raw.p ? clampText(raw.p) : undefined,
      savingsPct:
        typeof raw.r === "number" && isFinite(raw.r)
          ? Math.max(0, Math.min(100, Math.round(raw.r)))
          : undefined,
      date: typeof raw.d === "string" ? raw.d.slice(0, 32) : undefined,
      perUnit: raw.u === true ? true : undefined,
    };
  } catch {
    return null;
  }
}

// ── Formatting ──────────────────────────────────────────────────────────────

/** Human-friendly CO2 amount: switches to tonnes at scale. */
export function formatCo2(kgCo2e: number): { value: string; unit: string } {
  const kg = Math.max(0, kgCo2e || 0);
  if (kg >= 1000) {
    const tonnes = kg / 1000;
    return {
      value: tonnes >= 100 ? Math.round(tonnes).toLocaleString() : trim(tonnes, 1),
      unit: "tonnes CO₂e",
    };
  }
  return { value: Math.round(kg).toLocaleString(), unit: "kg CO₂e" };
}

function trim(n: number, decimals: number): string {
  const factor = Math.pow(10, decimals);
  const rounded = Math.round(n * factor) / factor;
  return rounded.toLocaleString(undefined, { maximumFractionDigits: decimals });
}

function formatCount(n: number): string {
  if (n >= 10) return Math.round(n).toLocaleString();
  return trim(n, 1);
}

// ── Real-world equivalences (US EPA GHG Equivalencies factors) ───────────────

export type EquivalenceKey = "cars" | "trees" | "homes" | "gas";

export interface CarbonEquivalence {
  key: EquivalenceKey;
  value: number;
  display: string;
  label: string;
}

/**
 * Convert kg CO2e into relatable comparisons.
 * Factors (metric tons CO2e): car/yr 4.6, tree-seedling/10yr 0.060,
 * home energy/yr 7.09 (EPA GHG Equivalencies Calculator, 2024),
 * gallon of gasoline 0.008887.
 *
 * Source: https://www.epa.gov/energy/greenhouse-gas-equivalencies-calculator
 */
export function carbonEquivalences(kgCo2e: number): CarbonEquivalence[] {
  const tonnes = Math.max(0, kgCo2e || 0) / 1000;
  const cars = tonnes / 4.6;
  const trees = tonnes / 0.06;
  const homes = tonnes / 7.09;
  const gas = tonnes / 0.008887;
  return [
    {
      key: "cars",
      value: cars,
      display: formatCount(cars),
      label: "cars off the road for a year",
    },
    {
      key: "trees",
      value: trees,
      display: formatCount(trees),
      label: "tree seedlings grown for 10 years",
    },
    {
      key: "homes",
      value: homes,
      display: formatCount(homes),
      label: "homes powered for a year",
    },
    {
      key: "gas",
      value: gas,
      display: formatCount(gas),
      label: "gallons of gasoline burned",
    },
  ];
}

// ── URLs + share text ─────────────────────────────────────────────────────────

/** Strip trailing forward-slashes without a regex so static analysis doesn't
 *  flag it as a potential ReDoS sink when the input is user-provided. */
function trimTrailingSlashes(url: string): string {
  let end = url.length;
  while (end > 0 && url[end - 1] === "/") end--;
  return end === url.length ? url : url.slice(0, end);
}

/** Relative path (/win?d=…) for a win. */
export function buildWinPath(data: CarbonWinData): string {
  return `/win?d=${encodeWin(data)}`;
}

/** Absolute share URL for a win. */
export function buildWinUrl(origin: string, data: CarbonWinData): string {
  const clean = trimTrailingSlashes(origin);
  return `${clean}${buildWinPath(data)}`;
}

/** One-line headline used across the card, OG tags and share text. */
export function winHeadline(data: CarbonWinData): string {
  const co2 = formatCo2(data.co2SavedKg);
  const pct = data.savingsPct ? ` (−${data.savingsPct}%)` : "";
  return `${co2.value} ${co2.unit} of embodied carbon avoided${pct}`;
}

/** Suggested social copy for share intents. */
export function winShareText(data: CarbonWinData): string {
  const co2 = formatCo2(data.co2SavedKg);
  const supplier = data.supplier ? ` with ${data.supplier}` : "";
  const perUnit = data.perUnit ? " (per declared unit)" : "";
  return `🌱 Carbon Win: ${co2.value} ${co2.unit} avoided${perUnit} by specifying ${data.toMaterial}${supplier} — tracked on GreenChainz.`;
}

// ── OpenGraph meta (server-injected for crawler-facing unfurls) ──────────────

export interface WinMeta {
  title: string;
  description: string;
  url: string;
  image: string;
}

export function buildWinMeta(origin: string, data: CarbonWinData): WinMeta {
  const clean = trimTrailingSlashes(origin);
  const co2 = formatCo2(data.co2SavedKg);
  const supplier = data.supplier ? ` · Supplier: ${data.supplier}` : "";
  const perUnitNote = data.perUnit ? " (per declared unit)" : "";
  const eq = data.perUnit ? null : carbonEquivalences(data.co2SavedKg)[0];
  const eqText = eq ? ` Like taking ${eq.display} ${eq.label}.` : "";
  return {
    title: `${co2.value} ${co2.unit} avoided${perUnitNote} — a GreenChainz Carbon Win`,
    description: `${data.toMaterial} beats ${data.fromMaterial} by ${
      data.savingsPct ? `${data.savingsPct}% ` : ""
    }embodied carbon${perUnitNote}.${eqText}${supplier} Tracked on GreenChainz.`,
    url: buildWinUrl(clean, data),
    image: `${clean}/images/og-image-homepage.jpg`,
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Render the OpenGraph/Twitter meta block for server-side HTML injection. */
export function renderWinMetaTags(meta: WinMeta): string {
  const t = escapeHtml(meta.title);
  const d = escapeHtml(meta.description);
  const u = escapeHtml(meta.url);
  const img = escapeHtml(meta.image);
  return [
    `<title>${t}</title>`,
    `<meta name="description" content="${d}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="GreenChainz" />`,
    `<meta property="og:title" content="${t}" />`,
    `<meta property="og:description" content="${d}" />`,
    `<meta property="og:url" content="${u}" />`,
    `<meta property="og:image" content="${img}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${t}" />`,
    `<meta name="twitter:description" content="${d}" />`,
    `<meta name="twitter:image" content="${img}" />`,
  ].join("\n    ");
}
