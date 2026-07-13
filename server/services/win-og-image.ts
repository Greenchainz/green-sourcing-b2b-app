/**
 * win-og-image — server-side renderer for the Carbon Win share card.
 *
 * This is the production twin of `client/src/lib/winCanvas.ts`. It draws the
 * exact same 1200×630 branded card, but on the server via @napi-rs/canvas so
 * that social crawlers (LinkedIn / X / Slack / iMessage / WhatsApp), which do
 * not run JS, get a real per-win image in the link unfurl — naming the winning
 * supplier and the CO₂e avoided — instead of a generic static homepage JPG.
 *
 * Deterministic output: we bundle Inter (public/fonts) and register it
 * explicitly, so the card renders identically in dev (Windows) and in the
 * Debian slim container (which ships no system fonts). The ◆ and → glyphs are
 * drawn as vector paths so they never depend on font glyph coverage.
 */
import { existsSync } from "fs";
import path from "path";
import { createCanvas, GlobalFonts, type SKRSContext2D } from "@napi-rs/canvas";
import { carbonEquivalences, formatCo2, type CarbonWinData } from "@shared/carbonWin";

const W = 1200;
const H = 630;

const COLORS = {
  bgTop: "#0a1310",
  bgBottom: "#122a1c",
  lime: "#9FE870",
  limeSoft: "rgba(159, 232, 112, 0.14)",
  white: "#F4F8F4",
  muted: "#9FB0A4",
  frame: "rgba(159, 232, 112, 0.55)",
};

// Registered font families (see registerWinFonts). We map each design weight to
// a dedicated family so face selection never relies on numeric-weight matching.
const F = {
  regular: "InterOG",
  semibold: "InterOG SemiBold",
  bold: "InterOG Bold",
  extrabold: "InterOG ExtraBold",
};

// ── Font registration (once per process) ──────────────────────────────────────
// Anchor on locations the build actually ships. Fonts live in client/public
// (vite's publicDir) → copied to dist/public/fonts at build, which the Docker
// image ships under /app/dist. process.cwd() is the repo root in dev and /app
// in prod. import.meta.dirname is server/services in dev (tsx) and /app/dist in
// the prod bundle. We probe an ordered list and use the first that exists.
const FONT_DIR_CANDIDATES = [
  path.resolve(process.cwd(), "dist", "public", "fonts"),
  path.resolve(process.cwd(), "client", "public", "fonts"),
  path.resolve(process.cwd(), "public", "fonts"),
  path.resolve(import.meta.dirname, "public", "fonts"),
  path.resolve(import.meta.dirname, "..", "..", "client", "public", "fonts"),
];

let fontsRegistered = false;
let fontsAvailable = false;

function registerWinFonts(): boolean {
  if (fontsRegistered) return fontsAvailable;
  fontsRegistered = true;

  const dir = FONT_DIR_CANDIDATES.find((d) =>
    existsSync(path.join(d, "Inter-Regular.ttf")),
  );
  if (!dir) {
    console.warn(
      "[win-og-image] Inter fonts not found in any candidate dir; falling back to system fonts.",
      FONT_DIR_CANDIDATES,
    );
    return false;
  }

  const faces: Array<[string, string]> = [
    ["Inter-Regular.ttf", F.regular],
    ["Inter-SemiBold.ttf", F.semibold],
    ["Inter-Bold.ttf", F.bold],
    ["Inter-ExtraBold.ttf", F.extrabold],
  ];
  let ok = true;
  for (const [file, family] of faces) {
    const full = path.join(dir, file);
    if (!existsSync(full) || !GlobalFonts.registerFromPath(full, family)) {
      console.warn(`[win-og-image] failed to register font ${file}`);
      ok = false;
    }
  }
  fontsAvailable = ok;
  return ok;
}

// ── Drawing helpers ───────────────────────────────────────────────────────────

function roundRect(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function truncate(ctx: SKRSContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + "…").width > maxWidth) {
    t = t.slice(0, -1);
  }
  return t + "…";
}

function wrapText(
  ctx: SKRSContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): void {
  const words = text.split(" ");
  let line = "";
  let cursorY = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, cursorY);
      line = word;
      cursorY += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, cursorY);
}

/** Vector diamond (◆) so the eyebrow mark never depends on font coverage. */
function drawDiamond(
  ctx: SKRSContext2D,
  cx: number,
  cy: number,
  r: number,
  color: string,
): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx + r, cy);
  ctx.lineTo(cx, cy + r);
  ctx.lineTo(cx - r, cy);
  ctx.closePath();
  ctx.fill();
}

/** Vector right-arrow (→) centred in a fixed gap between the swap materials. */
function drawArrow(
  ctx: SKRSContext2D,
  x: number,
  cy: number,
  w: number,
  color: string,
): void {
  const head = 6;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(x, cy);
  ctx.lineTo(x + w - head, cy);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + w, cy);
  ctx.lineTo(x + w - head - 3, cy - head);
  ctx.lineTo(x + w - head - 3, cy + head);
  ctx.closePath();
  ctx.fill();
}

// ── Main render ───────────────────────────────────────────────────────────────

/**
 * Render a Carbon Win to a 1200×630 PNG buffer (the OG/Twitter card size).
 * Pure and synchronous — no I/O beyond the one-time font registration.
 */
export function renderWinOgPng(data: CarbonWinData): Buffer {
  registerWinFonts();

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, COLORS.bgTop);
  grad.addColorStop(1, COLORS.bgBottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Soft lime glow top-right
  const glow = ctx.createRadialGradient(W - 120, 120, 40, W - 120, 120, 460);
  glow.addColorStop(0, "rgba(159, 232, 112, 0.20)");
  glow.addColorStop(1, "rgba(159, 232, 112, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Frame
  ctx.strokeStyle = COLORS.frame;
  ctx.lineWidth = 2;
  roundRect(ctx, 28, 28, W - 56, H - 56, 28);
  ctx.stroke();

  const cx = 72;

  // Eyebrow / brand — diamond mark drawn as vector, then wordmark
  ctx.textBaseline = "alphabetic";
  drawDiamond(ctx, cx + 7, 92 - 7, 8, COLORS.lime);
  ctx.fillStyle = COLORS.lime;
  ctx.font = `700 22px "${F.bold}"`;
  ctx.fillText("GreenChainz", cx + 24, 92);

  ctx.fillStyle = COLORS.muted;
  ctx.font = `600 18px "${F.semibold}"`;
  ctx.textAlign = "right";
  ctx.fillText("CARBON WIN", W - cx, 92);
  ctx.textAlign = "left";

  // Headline number
  const co2 = formatCo2(data.co2SavedKg);
  ctx.fillStyle = COLORS.white;
  ctx.font = `800 128px "${F.extrabold}"`;
  const numY = 236;
  ctx.fillText(co2.value, cx, numY);
  const numWidth = ctx.measureText(co2.value).width;

  ctx.fillStyle = COLORS.lime;
  ctx.font = `800 40px "${F.extrabold}"`;
  ctx.fillText(co2.unit, cx + numWidth + 18, numY);

  ctx.fillStyle = COLORS.muted;
  ctx.font = `500 26px "${F.regular}"`;
  const perUnitSuffix = data.perUnit ? " (per declared unit)" : "";
  ctx.fillText(`of embodied carbon avoided${perUnitSuffix}`, cx, numY + 42);

  // Percentage pill
  if (data.savingsPct && data.savingsPct > 0) {
    ctx.font = `700 24px "${F.bold}"`;
    const pill = `−${data.savingsPct}% vs baseline`;
    const pw = ctx.measureText(pill).width + 40;
    ctx.fillStyle = COLORS.limeSoft;
    roundRect(ctx, cx, numY + 66, pw, 46, 23);
    ctx.fill();
    ctx.fillStyle = COLORS.lime;
    ctx.fillText(pill, cx + 20, numY + 96);
  }

  // Material swap line: from → to (arrow drawn as vector in a fixed gap)
  const swapY = 400;
  const GAP = 44;
  ctx.fillStyle = COLORS.muted;
  ctx.font = `500 22px "${F.regular}"`;
  const fromText = truncate(ctx, data.fromMaterial, 420);
  ctx.fillText(fromText, cx, swapY);
  const fromW = ctx.measureText(fromText).width;

  drawArrow(ctx, cx + fromW + 12, swapY - 7, GAP - 20, COLORS.lime);

  ctx.fillStyle = COLORS.white;
  ctx.font = `700 22px "${F.bold}"`;
  const toText = truncate(ctx, data.toMaterial, 420);
  ctx.fillText(toText, cx + fromW + GAP, swapY);

  if (data.supplier) {
    ctx.fillStyle = COLORS.muted;
    ctx.font = `500 20px "${F.regular}"`;
    ctx.fillText(
      truncate(ctx, `Supplier: ${data.supplier}`, W - cx * 2),
      cx,
      swapY + 34,
    );
  }

  // Equivalences row — only for absolute (whole-project) wins. Per-unit deltas
  // have no known project quantity, so absolute equivalences would mislead.
  if (!data.perUnit) {
    const eqs = carbonEquivalences(data.co2SavedKg).slice(0, 3);
    const rowY = 500;
    const colW = (W - cx * 2) / 3;
    eqs.forEach((eq, i) => {
      const x = cx + i * colW;
      ctx.fillStyle = COLORS.lime;
      ctx.font = `800 34px "${F.extrabold}"`;
      ctx.fillText(eq.display, x, rowY + 24);
      ctx.fillStyle = COLORS.muted;
      ctx.font = `500 17px "${F.regular}"`;
      wrapText(ctx, `≈ ${eq.label}`, x, rowY + 50, colW - 24, 22);
    });
  } else {
    ctx.fillStyle = COLORS.muted;
    ctx.font = `500 20px "${F.regular}"`;
    wrapText(
      ctx,
      "Per declared unit. Total project impact scales with the quantity specified.",
      cx,
      516,
      W - cx * 2,
      28,
    );
  }

  // Footer
  ctx.fillStyle = "rgba(159, 232, 112, 0.16)";
  ctx.fillRect(cx, H - 78, W - cx * 2, 1);
  ctx.fillStyle = COLORS.muted;
  ctx.font = `500 18px "${F.regular}"`;
  ctx.fillText("greenchainz.com — sustainable materials", cx, H - 46);

  const date = data.date ? new Date(data.date) : new Date();
  const dateStr = isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
  if (dateStr) {
    ctx.textAlign = "right";
    ctx.fillText(dateStr, W - cx, H - 46);
    ctx.textAlign = "left";
  }

  return canvas.toBuffer("image/png");
}

export const WIN_OG_WIDTH = W;
export const WIN_OG_HEIGHT = H;
