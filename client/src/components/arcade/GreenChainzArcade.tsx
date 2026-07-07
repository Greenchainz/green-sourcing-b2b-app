import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ARCADE_GAMES, getGameById } from "./registry";
import {
  addHighScore,
  getHighScores,
  isHighScore,
  normalizeInitials,
  type HighScore,
} from "./highScores";
import { cn } from "@/lib/utils";

type View = "picker" | "playing" | "gameover";

interface Props {
  onClose: () => void;
  /** Optional game to jump straight into (used by the post-RFQ nudge). */
  initialGameId?: string;
}

const LIME = "#9FE870";

export default function GreenChainzArcade({ onClose, initialGameId }: Props) {
  const [view, setView] = useState<View>(initialGameId ? "playing" : "picker");
  const [gameId, setGameId] = useState<string | null>(initialGameId ?? null);
  const [gameKey, setGameKey] = useState(0);
  const [hidden, setHidden] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [madeBoard, setMadeBoard] = useState(false);
  const [initials, setInitials] = useState("");
  const [board, setBoard] = useState<HighScore[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const panelRef = useRef<HTMLDivElement | null>(null);
  const initialsRef = useRef<HTMLInputElement | null>(null);

  const game = gameId ? getGameById(gameId) : undefined;

  // Escape closes the arcade from anywhere.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Pause the running game when the tab is hidden.
  useEffect(() => {
    function onVis() {
      setHidden(document.visibilityState === "hidden");
    }
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // Lock body scroll while the arcade is open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    panelRef.current?.focus();
  }, [view]);

  useEffect(() => {
    if (view === "gameover" && madeBoard) {
      initialsRef.current?.focus();
    }
  }, [view, madeBoard]);

  const startGame = useCallback((id: string) => {
    setGameId(id);
    setGameKey((k) => k + 1);
    setFinalScore(0);
    setView("playing");
  }, []);

  const handleGameOver = useCallback(
    (score: number) => {
      if (!gameId) return;
      setFinalScore(score);
      const qualifies = isHighScore(gameId, score);
      setMadeBoard(qualifies);
      setSubmitted(false);
      setInitials("");
      setBoard(getHighScores(gameId));
      setView("gameover");
    },
    [gameId],
  );

  const submitInitials = useCallback(() => {
    if (!gameId || submitted) return;
    const next = addHighScore(gameId, normalizeInitials(initials || "AAA"), finalScore);
    setBoard(next);
    setSubmitted(true);
    setMadeBoard(false);
  }, [finalScore, gameId, initials, submitted]);

  const playAgain = useCallback(() => {
    if (!gameId) return;
    setGameKey((k) => k + 1);
    setFinalScore(0);
    setView("playing");
  }, [gameId]);

  const backToPicker = useCallback(() => {
    setView("picker");
    setGameId(null);
  }, []);

  const paused = view !== "playing" || hidden;

  const GameComponent = game?.Component;

  const accent = game?.accent ?? LIME;

  const rankedBoard = useMemo(() => board.slice(0, 10), [board]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="GreenChainz Arcade"
      onMouseDown={(e) => {
        // Click on the backdrop (not the panel) closes.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0b1410] shadow-2xl outline-none"
        style={{ boxShadow: `0 0 0 1px rgba(255,255,255,0.04), 0 30px 80px -20px ${accent}33` }}
      >
        {/* Header */}
        <header className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-3">
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 animate-pulse rounded-full"
              style={{ backgroundColor: accent }}
            />
            <h2 className="text-sm font-bold tracking-[0.2em] text-white">
              GREENCHAINZ <span style={{ color: accent }}>ARCADE</span>
            </h2>
            {view === "playing" && game && (
              <span className="ml-2 hidden text-xs text-white/40 sm:inline">
                {game.name} · <span className="italic">{game.classic}</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {view !== "picker" && (
              <button
                type="button"
                onClick={backToPicker}
                className="rounded-md px-2 py-1 text-xs text-white/60 transition hover:bg-white/10 hover:text-white"
              >
                ← Games
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close arcade"
              className="rounded-md px-2 py-1 text-sm text-white/60 transition hover:bg-white/10 hover:text-white"
            >
              ✕
            </button>
          </div>
        </header>

        {/* Body */}
        <div className="flex min-h-[420px] flex-1 items-center justify-center overflow-auto p-5">
          {view === "picker" && (
            <div className="w-full">
              <p className="mb-5 text-center text-sm text-white/50">
                Beat your best while you wait. Pick a machine. 🕹️
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {ARCADE_GAMES.map((g) => {
                  const best = getHighScores(g.id)[0]?.score ?? 0;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => startGame(g.id)}
                      className="group flex flex-col items-start gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left transition-all hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/[0.06]"
                    >
                      <span
                        className="rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-black"
                        style={{ backgroundColor: g.accent }}
                      >
                        {g.classic}
                      </span>
                      <span className="text-lg font-bold text-white">{g.name}</span>
                      <span className="text-xs leading-snug text-white/50">{g.tagline}</span>
                      <span className="mt-1 text-[11px] text-white/30">
                        {best > 0 ? `Best ${best.toLocaleString()}` : "No high score yet"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {view === "playing" && GameComponent && (
            <div className="flex w-full items-center justify-center">
              <GameComponent key={gameKey} paused={paused} onGameOver={handleGameOver} />
            </div>
          )}

          {view === "gameover" && game && (
            <div className="w-full max-w-md">
              <div className="mb-4 text-center">
                <div className="text-xs uppercase tracking-[0.3em] text-white/40">Game Over</div>
                <div className="mt-1 text-4xl font-black tabular-nums" style={{ color: accent }}>
                  {finalScore.toLocaleString()}
                </div>
                <div className="text-xs text-white/40">{game.name}</div>
              </div>

              {madeBoard && !submitted ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    submitInitials();
                  }}
                  className="mb-5 flex flex-col items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4"
                >
                  <div className="text-sm font-semibold text-white">
                    🏆 New high score! Enter your initials
                  </div>
                  <input
                    ref={initialsRef}
                    value={initials}
                    onChange={(e) =>
                      setInitials(e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3))
                    }
                    placeholder="AAA"
                    maxLength={3}
                    className="w-28 rounded-lg border border-white/20 bg-black/40 px-3 py-2 text-center text-2xl font-black uppercase tracking-[0.4em] text-white outline-none focus:border-white/60"
                    aria-label="Your initials"
                  />
                  <button
                    type="submit"
                    className="rounded-lg px-5 py-2 text-sm font-bold text-black transition hover:brightness-110"
                    style={{ backgroundColor: accent }}
                  >
                    Save score
                  </button>
                </form>
              ) : null}

              {/* Leaderboard */}
              <div className="mb-5 rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-white/40">
                  Top scores
                </div>
                {rankedBoard.length === 0 ? (
                  <div className="py-3 text-center text-sm text-white/40">
                    Be the first on the board.
                  </div>
                ) : (
                  <ol className="flex flex-col gap-1">
                    {rankedBoard.map((entry, i) => (
                      <li
                        key={`${entry.initials}-${entry.at}-${i}`}
                        className={cn(
                          "flex items-center justify-between rounded-md px-2 py-1 text-sm tabular-nums",
                          submitted && entry.at && i === rankedBoard.findIndex((x) => x.score === finalScore)
                            ? "bg-white/[0.06]"
                            : "",
                        )}
                      >
                        <span className="flex items-center gap-3">
                          <span className="w-5 text-right text-white/30">{i + 1}</span>
                          <span className="font-bold tracking-widest text-white">
                            {entry.initials}
                          </span>
                        </span>
                        <span className="font-semibold" style={{ color: accent }}>
                          {entry.score.toLocaleString()}
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>

              <div className="flex justify-center gap-3">
                <button
                  type="button"
                  onClick={playAgain}
                  className="rounded-lg px-5 py-2 text-sm font-bold text-black transition hover:brightness-110"
                  style={{ backgroundColor: accent }}
                >
                  Play again
                </button>
                <button
                  type="button"
                  onClick={backToPicker}
                  className="rounded-lg border border-white/20 px-5 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10"
                >
                  Other games
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="border-t border-white/10 px-5 py-2 text-center text-[10px] text-white/25">
          Press <kbd className="rounded bg-white/10 px-1">Esc</kbd> to close · a little something from
          the GreenChainz team
        </footer>
      </div>
    </div>
  );
}
