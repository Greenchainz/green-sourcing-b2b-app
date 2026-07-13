/**
 * GreenChainz Verified — embeddable Material Credit Score badge (SVG).
 *
 * Rendered by the public route  GET /api/public/badge/material/:id.svg  and
 * pasted by suppliers onto their own product pages / websites. Self-contained
 * SVG (system fonts, no external assets) so it renders anywhere as an <img>.
 *
 * Two styles:
 *   flat  — compact shields-style pill (default)
 *   card  — larger card with an animated-look score ring
 *
 * Two themes: light | dark (controls the brand panel so it sits well on any site).
 */

import { mcsColor, mcsLabel } from './mcs-score';

export type BadgeStyle = 'flat' | 'card';
export type BadgeTheme = 'light' | 'dark';

export interface BadgeOptions {
  score: number;
  materialName: string;
  manufacturerName?: string | null;
  /** Whether the material carries a verified EPD (drives "Verified" vs "Rated"). */
  verified: boolean;
  /** When false, render a neutral/greyed badge (e.g. material not found). */
  found?: boolean;
  style?: BadgeStyle;
  theme?: BadgeTheme;
}

const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

const NEUTRAL = '#9ca3af'; // gray-400 — used for not-found / unrated

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function truncate(value: string, max: number): string {
  const v = value.trim();
  if (v.length <= max) return v;
  return v.slice(0, Math.max(0, max - 1)).trimEnd() + '…';
}

/** A small leaf mark (lucide-style), stroked. Positioned by the caller's <g>. */
function leaf(color: string, size = 16): string {
  const s = size / 24;
  return `<g transform="scale(${s.toFixed(4)})" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/>
    <path d="M2 21c0-3 1.85-5.36 5.08-6"/>
  </g>`;
}

// ── Flat pill ──────────────────────────────────────────────────────────────────

function renderFlat(opts: BadgeOptions): string {
  const found = opts.found !== false;
  const score = Math.max(0, Math.min(100, Math.round(opts.score)));
  const color = found ? mcsColor(score) : NEUTRAL;
  const word = !found ? 'Unrated' : opts.verified ? 'Verified' : 'Rated';

  const W = 252;
  const H = 40;
  const rightW = 84;
  const leftW = W - rightW;

  const dark = opts.theme === 'dark';
  const leftBg = dark ? '#111827' : '#ffffff';
  const brandColor = dark ? '#ffffff' : '#111827';
  const subColor = dark ? '#9ca3af' : '#6b7280';
  const leafColor = '#22c55e';
  const border = dark ? '#1f2937' : '#e5e7eb';

  const scoreText = found ? String(score) : '—';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="GreenChainz ${escapeXml(word)} — Material Credit Score ${scoreText} of 100">
  <title>GreenChainz ${escapeXml(word)} — MCS ${scoreText}/100</title>
  <defs>
    <clipPath id="r"><rect width="${W}" height="${H}" rx="9"/></clipPath>
  </defs>
  <g clip-path="url(#r)" font-family="${FONT}">
    <rect width="${W}" height="${H}" fill="${leftBg}"/>
    <rect x="${leftW}" width="${rightW}" height="${H}" fill="${color}"/>
    <g transform="translate(14 12)">${leaf(leafColor, 16)}</g>
    <text x="38" y="17" fill="${brandColor}" font-size="13" font-weight="700">GreenChainz</text>
    <text x="38" y="31" fill="${subColor}" font-size="10.5" font-weight="600" letter-spacing="0.5">${escapeXml(word.toUpperCase())} · MATERIAL CREDIT SCORE</text>
    <text x="${leftW + rightW / 2}" y="24" fill="#ffffff" font-size="20" font-weight="800" text-anchor="middle">${scoreText}</text>
    <text x="${leftW + rightW / 2}" y="34" fill="rgba(255,255,255,0.85)" font-size="8.5" font-weight="600" text-anchor="middle">/ 100</text>
    <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="8.5" fill="none" stroke="${border}"/>
  </g>
</svg>`;
}

// ── Card with score ring ─────────────────────────────────────────────────────────

function renderCard(opts: BadgeOptions): string {
  const found = opts.found !== false;
  const score = Math.max(0, Math.min(100, Math.round(opts.score)));
  const color = found ? mcsColor(score) : NEUTRAL;
  const label = found ? mcsLabel(score) : 'Not found';
  const word = !found ? 'Not listed' : opts.verified ? 'Verified' : 'Rated';

  const W = 328;
  const H = 132;

  const dark = opts.theme === 'dark';
  const bg = dark ? '#0b1220' : '#ffffff';
  const border = dark ? '#1f2937' : '#e5e7eb';
  const heading = dark ? '#ffffff' : '#111827';
  const sub = dark ? '#9ca3af' : '#6b7280';
  const track = dark ? '#1f2937' : '#e5e7eb';
  const leafColor = '#22c55e';

  const materialName = escapeXml(truncate(opts.materialName || 'Material', 30));
  const maker = opts.manufacturerName ? escapeXml(truncate(opts.manufacturerName, 32)) : '';

  // Ring geometry
  const cx = 64;
  const cy = 66;
  const r = 38;
  const circ = 2 * Math.PI * r;
  const offset = found ? circ * (1 - score / 100) : circ;
  const scoreText = found ? String(score) : '—';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="GreenChainz ${escapeXml(word)} — Material Credit Score ${scoreText} of 100">
  <title>GreenChainz ${escapeXml(word)} — MCS ${scoreText}/100</title>
  <defs>
    <clipPath id="rc"><rect width="${W}" height="${H}" rx="14"/></clipPath>
  </defs>
  <g clip-path="url(#rc)" font-family="${FONT}">
    <rect width="${W}" height="${H}" fill="${bg}"/>
    <!-- Score ring -->
    <g transform="rotate(-90 ${cx} ${cy})">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${track}" stroke-width="9"/>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="9" stroke-linecap="round"
        stroke-dasharray="${circ.toFixed(2)}" stroke-dashoffset="${offset.toFixed(2)}"/>
    </g>
    <text x="${cx}" y="${cy + 3}" fill="${color}" font-size="30" font-weight="800" text-anchor="middle">${scoreText}</text>
    <text x="${cx}" y="${cy + 20}" fill="${sub}" font-size="10" font-weight="600" text-anchor="middle">/ 100</text>
    <!-- Right column -->
    <g transform="translate(118 30)">${leaf(leafColor, 18)}</g>
    <text x="142" y="44" fill="${heading}" font-size="15" font-weight="800">GreenChainz ${escapeXml(word)}</text>
    <text x="118" y="70" fill="${heading}" font-size="13" font-weight="700">${materialName}</text>
    ${maker ? `<text x="118" y="87" fill="${sub}" font-size="11" font-weight="500">${maker}</text>` : ''}
    <text x="118" y="${maker ? 108 : 92}" fill="${color}" font-size="11" font-weight="700" letter-spacing="0.3">${escapeXml(label.toUpperCase())} · MATERIAL CREDIT SCORE</text>
    <text x="118" y="${maker ? 122 : 106}" fill="${sub}" font-size="9.5" font-weight="500">greenchainz.com — verified sustainable materials</text>
    <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="13.5" fill="none" stroke="${border}"/>
  </g>
</svg>`;
}

/** Render the GreenChainz Verified badge SVG string for the given options. */
export function renderMaterialBadgeSvg(opts: BadgeOptions): string {
  const style = opts.style === 'card' ? 'card' : 'flat';
  return style === 'card' ? renderCard(opts) : renderFlat(opts);
}
