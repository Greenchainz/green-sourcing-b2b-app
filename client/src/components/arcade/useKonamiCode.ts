import { useEffect, useRef } from "react";

/** ↑ ↑ ↓ ↓ ← → ← → B A */
const SEQUENCE = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a",
];

/**
 * Fires `onUnlock` when the Konami code is entered. Ignores keystrokes while
 * the user is typing in a field so it never interferes with real input.
 */
export function useKonamiCode(onUnlock: () => void): void {
  const idx = useRef(0);
  const cb = useRef(onUnlock);
  cb.current = onUnlock;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        idx.current = 0;
        return;
      }
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (key === SEQUENCE[idx.current]) {
        idx.current += 1;
        if (idx.current === SEQUENCE.length) {
          idx.current = 0;
          cb.current();
        }
      } else {
        idx.current = key === SEQUENCE[0] ? 1 : 0;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
