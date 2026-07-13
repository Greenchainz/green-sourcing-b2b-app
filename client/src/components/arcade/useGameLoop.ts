import { useEffect, useRef } from "react";

type LoopCallback = (dtMs: number) => void;

/**
 * Shared requestAnimationFrame harness for canvas games.
 *
 * Calls `callback(dtMs)` once per frame while `active` is true. `dtMs` is
 * clamped to `maxDtMs` so a backgrounded tab can't produce a huge time step
 * (which would tunnel the ball / teleport the snake on refocus).
 */
export function useGameLoop(
  callback: LoopCallback,
  active: boolean,
  maxDtMs = 32,
): void {
  const cb = useRef(callback);
  cb.current = callback;

  useEffect(() => {
    if (!active) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(now - last, maxDtMs);
      last = now;
      cb.current(dt);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, maxDtMs]);
}
