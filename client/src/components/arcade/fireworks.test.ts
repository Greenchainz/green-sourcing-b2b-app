import { describe, it, expect } from "vitest";
import { createCelebrationFx } from "./fireworks";

/** deterministic PRNG so spark counts/positions are stable in tests */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** advance the show in realistic ~16ms frames */
function advance(fx: ReturnType<typeof createCelebrationFx>, ms: number): void {
  let elapsed = 0;
  while (elapsed < ms) {
    fx.update(16);
    elapsed += 16;
  }
}

/** minimal 2D context stub — swallows draws, returns a gradient where needed */
function stubCtx(): CanvasRenderingContext2D {
  const grad = { addColorStop() {} };
  return new Proxy(
    {},
    {
      get: (_t, prop) =>
        prop === "createRadialGradient" || prop === "createLinearGradient"
          ? () => grad
          : () => {},
      set: () => true,
    },
  ) as unknown as CanvasRenderingContext2D;
}

describe("celebration fireworks", () => {
  it("is active immediately after celebrate (emblem pops) and throws sparks", () => {
    const fx = createCelebrationFx();
    fx.celebrate(400, 280, { accent: "#FFCC33", intensity: 1, rng: mulberry32(1) });
    expect(fx.active()).toBe(true);
    expect(fx.particleCount()).toBe(0); // main burst is scheduled, not instant

    advance(fx, 500); // past the ~420ms main blow-apart
    // intensity 1 -> round(54 + 46) = 100 sparks in the main burst
    expect(fx.particleCount()).toBe(100);
  });

  it("fires all three staggered bursts as the show plays out", () => {
    const fx = createCelebrationFx();
    fx.celebrate(400, 280, { accent: "#FFCC33", intensity: 1, rng: mulberry32(2) });
    advance(fx, 900); // past main (420) + both secondary pops (620, 840)
    // 100 + round(100*0.5)=50 + round(100*0.55)=55, minus none decayed yet
    expect(fx.particleCount()).toBe(205);
  });

  it("burns out completely — no leaked particles or rings", () => {
    const fx = createCelebrationFx();
    fx.celebrate(400, 280, { accent: "#EC6A5E", intensity: 0.8, rng: mulberry32(3) });
    advance(fx, 4000);
    expect(fx.particleCount()).toBe(0);
    expect(fx.active()).toBe(false);
  });

  it("reduced motion keeps a quiet emblem + ring but no flying sparks", () => {
    const fx = createCelebrationFx();
    fx.celebrate(400, 280, { accent: "#FFCC33", reduced: true, rng: mulberry32(4) });
    advance(fx, 300);
    expect(fx.particleCount()).toBe(0);
    expect(fx.active()).toBe(true); // emblem still animating
    advance(fx, 1200); // past emblem (720) and ring (520)
    expect(fx.active()).toBe(false);
  });

  it("draws without throwing, with and without a loaded logo image", () => {
    const fx = createCelebrationFx();
    fx.celebrate(400, 280, { accent: "#FFCC33", intensity: 1, rng: mulberry32(5) });
    advance(fx, 500);
    const ctx = stubCtx();
    expect(() => fx.draw(ctx, null)).not.toThrow();
    const fakeLogo = { complete: true, naturalWidth: 64, naturalHeight: 64 } as HTMLImageElement;
    expect(() => fx.draw(ctx, fakeLogo)).not.toThrow();
  });

  it("supports lightweight burst pops for in-hole events", () => {
    const fx = createCelebrationFx();
    fx.burst(320, 200, { accent: "#FFCC33", intensity: 0.7, rng: mulberry32(6) });
    expect(fx.active()).toBe(true);
    expect(fx.particleCount()).toBeGreaterThan(0);
    advance(fx, 1500);
    expect(fx.particleCount()).toBe(0);
  });
});
