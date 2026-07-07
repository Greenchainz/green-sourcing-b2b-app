import { useCallback, useEffect, useRef, useState } from "react";
import GreenChainzArcade from "./GreenChainzArcade";
import { useKonamiCode } from "./useKonamiCode";
import { onOpenArcade, onArcadeNudge, type ArcadeOpenDetail } from "./arcadeBus";
import { cn } from "@/lib/utils";

const LIME = "#9FE870";
const NUDGE_TIMEOUT_MS = 14_000;

/**
 * Mounts the whole GreenChainz Arcade experience:
 *   - a discreet floating launcher ("break room")
 *   - the Konami-code unlock (↑↑↓↓←→←→ B A)
 *   - the post-RFQ "play while you wait" nudge
 *
 * 100% client-side. Drop <ArcadeHost /> once near the app root.
 */
export default function ArcadeHost() {
  const [open, setOpen] = useState(false);
  const [initialGameId, setInitialGameId] = useState<string | undefined>(undefined);
  const [nudge, setNudge] = useState<ArcadeOpenDetail | null>(null);
  const nudgeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openArcade = useCallback((gameId?: string) => {
    setInitialGameId(gameId);
    setNudge(null);
    setOpen(true);
  }, []);

  useKonamiCode(() => openArcade());

  // External "open" requests (e.g. from anywhere via the bus).
  useEffect(() => onOpenArcade((detail) => openArcade(detail.gameId)), [openArcade]);

  // Post-RFQ (or other) nudge — non-blocking, auto-dismissing.
  useEffect(
    () =>
      onArcadeNudge((detail) => {
        setNudge(detail);
        if (nudgeTimer.current) clearTimeout(nudgeTimer.current);
        nudgeTimer.current = setTimeout(() => setNudge(null), NUDGE_TIMEOUT_MS);
      }),
    [],
  );

  useEffect(() => {
    return () => {
      if (nudgeTimer.current) clearTimeout(nudgeTimer.current);
    };
  }, []);

  const dismissNudge = useCallback(() => {
    if (nudgeTimer.current) clearTimeout(nudgeTimer.current);
    setNudge(null);
  }, []);

  return (
    <>
      {/* Discreet launcher — bottom-left so it never fights the chat widgets. */}
      <button
        type="button"
        onClick={() => openArcade()}
        aria-label="Open GreenChainz Arcade"
        title="GreenChainz Arcade"
        className={cn(
          "fixed bottom-4 left-4 z-[9990] flex h-10 w-10 items-center justify-center rounded-full",
          "border border-white/10 bg-black/40 text-lg opacity-40 shadow-lg backdrop-blur-sm",
          "transition-all hover:scale-110 hover:opacity-100",
          "focus:outline-none focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-white/40",
        )}
      >
        <span aria-hidden>🕹️</span>
      </button>

      {/* Post-RFQ nudge */}
      {nudge && !open && (
        <div className="fixed bottom-20 left-4 z-[9991] w-[300px] max-w-[calc(100vw-2rem)] animate-in fade-in slide-in-from-bottom-2">
          <div
            className="relative overflow-hidden rounded-xl border border-white/10 bg-[#0b1410] p-4 shadow-2xl"
            style={{ boxShadow: `0 20px 50px -15px ${LIME}44` }}
          >
            <button
              type="button"
              onClick={dismissNudge}
              aria-label="Dismiss"
              className="absolute right-2 top-2 text-white/30 transition hover:text-white"
            >
              ✕
            </button>
            <div className="mb-1 text-sm font-bold text-white">Request sent! 🎉</div>
            <p className="mb-3 text-xs leading-snug text-white/60">
              Suppliers are on it. Beat your high score while you wait.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => openArcade(nudge.gameId)}
                className="rounded-lg px-3 py-1.5 text-xs font-bold text-black transition hover:brightness-110"
                style={{ backgroundColor: LIME }}
              >
                🕹️ Play the arcade
              </button>
              <button
                type="button"
                onClick={dismissNudge}
                className="text-xs text-white/40 transition hover:text-white/70"
              >
                Maybe later
              </button>
            </div>
          </div>
        </div>
      )}

      {open && (
        <GreenChainzArcade onClose={() => setOpen(false)} initialGameId={initialGameId} />
      )}
    </>
  );
}
