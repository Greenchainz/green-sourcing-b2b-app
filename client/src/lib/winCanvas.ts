/**
 * winCanvas — renders a Carbon Win as a crisp 1200×630 PNG entirely on an
 * HTML5 canvas. Zero dependencies, deterministic output, and the 1.91:1 ratio
 * is exactly what LinkedIn / X / Slack want for a link preview image.
 */
import {
  carbonEquivalences,
  formatCo2,
  type CarbonWinData,
} from "@shared/carbonWin";

const W = 1200;
const H = 630;
const SCALE = 2; // retina-crisp export

const COLORS = {
  bgTop: "#0a1310",
  bgBottom: "#122a1c",
  lime: "#9FE870",
  limeSoft: "rgba(159, 232, 112, 0.14)",
  white: "#F4F8F4",
  muted: "#9FB0A4",
  frame: "rgba(159, 232, 112, 0.55)",
};

const FONT = `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`;

function roundRect(
  ctx: CanvasRenderingContext2D,
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

function truncate(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + "…").width > maxWidth) {
    t = t.slice(0, -1);
  }
  return t + "…";
}

/** Draw the win onto a fresh canvas element and return it. */
export function renderWinCanvas(data: CarbonWinData): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = W * SCALE;
  canvas.height = H * SCALE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  ctx.scale(SCALE, SCALE);

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

  // Eyebrow / brand
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = COLORS.lime;
  ctx.font = `700 22px ${FONT}`;
  ctx.fillText("◆ GreenChainz", cx, 92);

  ctx.fillStyle = COLORS.muted;
  ctx.font = `600 18px ${FONT}`;
  ctx.textAlign = "right";
  ctx.fillText("VERIFIED CARBON WIN", W - cx, 92);
  ctx.textAlign = "left";

  // Headline number
  const co2 = formatCo2(data.co2SavedKg);
  ctx.fillStyle = COLORS.white;
  ctx.font = `800 128px ${FONT}`;
  const numY = 236;
  ctx.fillText(co2.value, cx, numY);
  const numWidth = ctx.measureText(co2.value).width;

  ctx.fillStyle = COLORS.lime;
  ctx.font = `800 40px ${FONT}`;
  ctx.fillText(co2.unit, cx + numWidth + 18, numY);

  ctx.fillStyle = COLORS.muted;
  ctx.font = `500 26px ${FONT}`;
  ctx.fillText("of embodied carbon avoided", cx, numY + 42);

  // Percentage pill
  if (data.savingsPct && data.savingsPct > 0) {
    ctx.font = `700 24px ${FONT}`;
    const pill = `−${data.savingsPct}% vs baseline`;
    const pw = ctx.measureText(pill).width + 40;
    ctx.fillStyle = COLORS.limeSoft;
    roundRect(ctx, cx, numY + 66, pw, 46, 23);
    ctx.fill();
    ctx.fillStyle = COLORS.lime;
    ctx.fillText(pill, cx + 20, numY + 96);
  }

  // Material swap line
  const swapY = 400;
  ctx.font = `500 22px ${FONT}`;
  ctx.fillStyle = COLORS.muted;
  ctx.fillText(
    truncate(ctx, data.fromMaterial, 420),
    cx,
    swapY,
  );
  const fromW = ctx.measureText(truncate(ctx, data.fromMaterial, 420)).width;
  ctx.fillStyle = COLORS.lime;
  ctx.font = `700 22px ${FONT}`;
  ctx.fillText("  →  ", cx + fromW, swapY);
  const arrowW = ctx.measureText("  →  ").width;
  ctx.fillStyle = COLORS.white;
  ctx.font = `700 22px ${FONT}`;
  ctx.fillText(
    truncate(ctx, data.toMaterial, 420),
    cx + fromW + arrowW,
    swapY,
  );

  if (data.supplier) {
    ctx.fillStyle = COLORS.muted;
    ctx.font = `500 20px ${FONT}`;
    ctx.fillText(
      truncate(ctx, `Supplier: ${data.supplier}`, W - cx * 2),
      cx,
      swapY + 34,
    );
  }

  // Equivalences row
  const eqs = carbonEquivalences(data.co2SavedKg).slice(0, 3);
  const rowY = 500;
  const colW = (W - cx * 2) / 3;
  eqs.forEach((eq, i) => {
    const x = cx + i * colW;
    ctx.fillStyle = COLORS.lime;
    ctx.font = `800 34px ${FONT}`;
    ctx.fillText(eq.display, x, rowY + 24);
    ctx.fillStyle = COLORS.muted;
    ctx.font = `500 17px ${FONT}`;
    // wrap label to two lines within the column
    wrapText(ctx, `≈ ${eq.label}`, x, rowY + 50, colW - 24, 22);
  });

  // Footer
  ctx.fillStyle = "rgba(159, 232, 112, 0.16)";
  ctx.fillRect(cx, H - 78, W - cx * 2, 1);
  ctx.fillStyle = COLORS.muted;
  ctx.font = `500 18px ${FONT}`;
  ctx.fillText("greenchainz.com — verified sustainable materials", cx, H - 46);

  const date = data.date ? new Date(data.date) : new Date();
  const dateStr = isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
  if (dateStr) {
    ctx.textAlign = "right";
    ctx.fillText(dateStr, W - cx, H - 46);
    ctx.textAlign = "left";
  }

  return canvas;
}

function wrapText(
  ctx: CanvasRenderingContext2D,
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

/** Render the win to a PNG Blob. */
export function renderWinPng(data: CarbonWinData): Promise<Blob> {
  const canvas = renderWinCanvas(data);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Failed to render Carbon Win image"));
    }, "image/png");
  });
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}

/** Render and trigger a browser download of the PNG. */
export async function downloadWinPng(
  data: CarbonWinData,
  filename?: string,
): Promise<void> {
  const blob = await renderWinPng(data);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download =
    filename ?? `greenchainz-carbon-win-${slugify(data.toMaterial) || "share"}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
