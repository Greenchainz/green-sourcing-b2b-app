/**
 * Celebration FX for the golf games — a canvas firework show that fires the
 * moment a putt drops. The GreenChainz logo pops in over the cup and then
 * blows apart into a brand-coloured firework (with a drawn badge fallback if
 * the logo image has not loaded yet).
 *
 * Pure and dependency-free: it owns a small particle system, a couple of
 * shockwave rings, and one emblem transform. `update(dt)` advances it and
 * `draw(ctx, logo)` renders it in the same field-space transform the golf
 * renderer already uses. Deterministic when you pass an `rng` (used by tests).
 */

export interface FxParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** ms of life remaining */
  life: number;
  /** ms of total life (for alpha falloff) */
  maxLife: number;
  /** px radius */
  size: number;
  color: string;
  /** per-ms velocity retention (air drag), raised to dt each step */
  drag: number;
  /** px/ms^2 pulling the spark down */
  gravity: number;
  twinkle: boolean;
}

interface FxRing {
  x: number;
  y: number;
  t: number;
  dur: number;
  color: string;
  maxRadius: number;
}

interface FxEmblem {
  x: number;
  y: number;
  t: number;
  rise: number;
  hold: number;
  blow: number;
  peak: number;
  color: string;
}

interface QueuedBurst {
  delay: number;
  x: number;
  y: number;
  colors: string[];
  count: number;
  speed: number;
  rng: () => number;
}

export interface CelebrateOpts {
  /** Game accent (hex) — folded into the brand palette. */
  accent: string;
  /** Honour prefers-reduced-motion: a quiet emblem + one soft ring, no sparks. */
  reduced?: boolean;
  /** 0..1 — better shots (ace / great) throw a bigger show. */
  intensity?: number;
  /** Injectable RNG for deterministic tests. Defaults to Math.random. */
  rng?: () => number;
}

export interface BurstOpts {
  /** Game accent (hex) — folded into the burst palette. */
  accent: string;
  /** Honour prefers-reduced-motion: skip transient spark bursts. */
  reduced?: boolean;
  /** 0..1 — higher values throw denser, faster sparks. */
  intensity?: number;
  /** Injectable RNG for deterministic tests. Defaults to Math.random. */
  rng?: () => number;
}

export interface CelebrationFx {
  celebrate(x: number, y: number, opts: CelebrateOpts): void;
  burst(x: number, y: number, opts: BurstOpts): void;
  update(dt: number): void;
  draw(ctx: CanvasRenderingContext2D, logo: HTMLImageElement | null): void;
  /** true while anything is still animating */
  active(): boolean;
  /** test hook */
  particleCount(): number;
}

const BRAND_GREENS = ["#34D399", "#10B981", "#6EE7B7"];
const SPARKLE = "#FFFFFF";

/** classic easeOutBack for a punchy overshoot on the logo pop-in */
function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  const p = t - 1;
  return 1 + c3 * p * p * p + c1 * p * p;
}

export function createCelebrationFx(): CelebrationFx {
  const particles: FxParticle[] = [];
  const rings: FxRing[] = [];
  const queue: QueuedBurst[] = [];
  let emblem: FxEmblem | null = null;
  let clock = 0;

  function spawnBurst(
    x: number,
    y: number,
    colors: string[],
    count: number,
    speed: number,
    rng: () => number,
  ): void {
    for (let i = 0; i < count; i++) {
      // even angular spread + jitter so rings look organic, not mechanical
      const angle = (i / count) * Math.PI * 2 + (rng() - 0.5) * 0.5;
      const s = speed * (0.45 + rng() * 0.55);
      const life = 620 + rng() * 640;
      // eslint-disable-next-line security/detect-object-injection -- fixed-length palette
      const color = colors[Math.floor(rng() * colors.length)] ?? SPARKLE;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * s,
        vy: Math.sin(angle) * s - speed * 0.25, // slight upward bias = "launch"
        life,
        maxLife: life,
        size: 1.4 + rng() * 2.2,
        color,
        drag: 0.9986,
        gravity: 0.00034,
        twinkle: rng() < 0.35,
      });
    }
  }

  function celebrate(x: number, y: number, opts: CelebrateOpts): void {
    const rng = opts.rng ?? Math.random;
    const accent = opts.accent;
    const palette = [accent, ...BRAND_GREENS, SPARKLE];
    const intensity = Math.max(0.35, Math.min(1, opts.intensity ?? 0.7));

    emblem = {
      x,
      y,
      t: 0,
      rise: 340,
      hold: 120,
      blow: 260,
      peak: 84 + intensity * 26,
      color: accent,
    };

    // one shockwave ring under the pop
    rings.push({ x, y, t: 0, dur: 520, color: accent, maxRadius: 70 + intensity * 40 });

    if (opts.reduced) {
      // reduced motion: keep the emblem + ring, skip the flying sparks
      return;
    }

    const big = Math.round(54 + intensity * 46);
    const speed = 0.26 + intensity * 0.16;
    // main blow-apart lands as the logo reaches full size and shatters
    queue.push({ delay: emblem.rise + emblem.hold - 40, x, y, colors: palette, count: big, speed, rng });
    // a couple of staggered secondary pops above the green for a "show"
    queue.push({ delay: 620, x: x - 96, y: y - 74, colors: palette, count: Math.round(big * 0.5), speed: speed * 0.85, rng });
    queue.push({ delay: 840, x: x + 86, y: y - 104, colors: palette, count: Math.round(big * 0.55), speed: speed * 0.9, rng });
    rings.push({ x: x - 96, y: y - 74, t: -620, dur: 460, color: BRAND_GREENS[0], maxRadius: 58 });
    rings.push({ x: x + 86, y: y - 104, t: -840, dur: 460, color: accent, maxRadius: 58 });
  }

  function burst(x: number, y: number, opts: BurstOpts): void {
    if (opts.reduced) return;
    const rng = opts.rng ?? Math.random;
    const intensity = Math.max(0.2, Math.min(1, opts.intensity ?? 0.55));
    const palette = [opts.accent, ...BRAND_GREENS, SPARKLE];
    const count = Math.round(16 + intensity * 26);
    const speed = 0.18 + intensity * 0.14;
    spawnBurst(x, y, palette, count, speed, rng);
    rings.push({
      x,
      y,
      t: 0,
      dur: 320,
      color: opts.accent,
      maxRadius: 24 + intensity * 22,
    });
  }

  function update(dt: number): void {
    // clamp so a stalled tab / breakpoint doesn't teleport particles
    const step = Math.min(dt, 50);
    clock += step;

    // fire due bursts (rng captured per burst below via Math.random; the visual
    // jitter here need not be deterministic once the show is running)
    for (let i = queue.length - 1; i >= 0; i--) {
      // eslint-disable-next-line security/detect-object-injection -- reverse index
      const q = queue[i];
      if (clock >= q.delay) {
        spawnBurst(q.x, q.y, q.colors, q.count, q.speed, q.rng);
        queue.splice(i, 1);
      }
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      // eslint-disable-next-line security/detect-object-injection -- reverse index
      const p = particles[i];
      const d = Math.pow(p.drag, step);
      p.vx *= d;
      p.vy = p.vy * d + p.gravity * step;
      p.x += p.vx * step;
      p.y += p.vy * step;
      p.life -= step;
      if (p.life <= 0) particles.splice(i, 1);
    }

    for (let i = rings.length - 1; i >= 0; i--) {
      // eslint-disable-next-line security/detect-object-injection -- reverse index
      const r = rings[i];
      r.t += step;
      if (r.t >= r.dur) rings.splice(i, 1);
    }

    if (emblem) {
      emblem.t += step;
      if (emblem.t >= emblem.rise + emblem.hold + emblem.blow) emblem = null;
    }
  }

  function draw(ctx: CanvasRenderingContext2D, logo: HTMLImageElement | null): void {
    ctx.save();

    // shockwave rings (normal blend)
    for (const r of rings) {
      if (r.t < 0) continue;
      const k = r.t / r.dur;
      const radius = r.maxRadius * (0.2 + k * 0.8);
      ctx.globalAlpha = Math.max(0, 1 - k) * 0.55;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 3 * (1 - k) + 0.5;
      ctx.beginPath();
      ctx.arc(r.x, r.y, radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // sparks with additive glow
    ctx.globalCompositeOperation = "lighter";
    for (const p of particles) {
      const a = Math.max(0, p.life / p.maxLife);
      const flick = p.twinkle ? 0.55 + 0.45 * Math.sin(p.life * 0.05) : 1;
      ctx.globalAlpha = a * flick;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.4 + a * 0.6), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;

    if (emblem) drawEmblem(ctx, emblem, logo);

    ctx.restore();
  }

  function drawEmblem(
    ctx: CanvasRenderingContext2D,
    e: FxEmblem,
    logo: HTMLImageElement | null,
  ): void {
    let scale: number;
    let alpha: number;
    let spin = 0;
    if (e.t < e.rise) {
      const k = easeOutBack(e.t / e.rise);
      scale = e.peak * k;
      alpha = Math.min(1, (e.t / e.rise) * 1.5);
    } else if (e.t < e.rise + e.hold) {
      scale = e.peak;
      alpha = 1;
    } else {
      const bt = (e.t - e.rise - e.hold) / e.blow;
      scale = e.peak * (1 + 1.7 * bt); // burst outward
      alpha = Math.max(0, 1 - bt);
      spin = bt * 0.5;
    }
    if (scale <= 0 || alpha <= 0) return;

    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(spin);
    ctx.globalAlpha = alpha;

    // soft glow halo behind the mark
    const halo = ctx.createRadialGradient(0, 0, scale * 0.1, 0, 0, scale * 0.95);
    halo.addColorStop(0, hexToRgba(e.color, 0.55));
    halo.addColorStop(1, hexToRgba(e.color, 0));
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(0, 0, scale * 0.95, 0, Math.PI * 2);
    ctx.fill();

    const half = scale / 2;
    const usable =
      !!logo && logo.complete && logo.naturalWidth > 0 && logo.naturalHeight > 0;
    if (usable) {
      ctx.drawImage(logo, -half, -half, scale, scale);
    } else {
      drawFallbackBadge(ctx, scale, e.color);
    }
    ctx.restore();
  }

  return {
    celebrate,
    burst,
    update,
    draw,
    active: () => particles.length > 0 || rings.length > 0 || emblem !== null || queue.length > 0,
    particleCount: () => particles.length,
  };
}

/** A clean brand-y badge used only if the logo image has not loaded. */
function drawFallbackBadge(ctx: CanvasRenderingContext2D, scale: number, accent: string): void {
  const r = scale / 2;
  ctx.fillStyle = "#0b3a24";
  roundRect(ctx, -r, -r, scale, scale, scale * 0.24);
  ctx.fill();
  ctx.lineWidth = Math.max(2, scale * 0.06);
  ctx.strokeStyle = accent;
  roundRect(ctx, -r, -r, scale, scale, scale * 0.24);
  ctx.stroke();
  ctx.fillStyle = "#ECFDF5";
  ctx.font = `700 ${Math.round(scale * 0.5)}px ui-sans-serif, system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("G", 0, scale * 0.03);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
): void {
  const rr = Math.min(radius, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
