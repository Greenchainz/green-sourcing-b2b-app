import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ARCADE_GAMES, getGameById } from "./registry";
import {
  addHighScore,
  getHighScores,
  isHighScore,
  normalizeInitials,
  type HighScore,
} from "./highScores";
import { trpc } from "@/lib/trpc";
import type { ArcadeGameId } from "@shared/arcadeScoring";
import type { BoardPeriod } from "@shared/arcadePeriods";
import { getShowtimeStatus, recordShowtime, type ShowtimeStatus } from "./showtime";
import { cn } from "@/lib/utils";

type View = "picker" | "playing" | "gameover";
type LeaderboardView = "global" | "global-empty" | "local";

interface Props {
  onClose: () => void;
  /** Optional game to jump straight into (used by the post-RFQ nudge). */
  initialGameId?: string;
}

const LIME = "#9FE870";
// The Round is the daily "main show" - the only game gated by Showtime + streaks.
const THE_ROUND = "green-round";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function getLeaderboardView({
  hasGlobalScores,
  globalBoardSucceeded,
}: {
  hasGlobalScores: boolean;
  globalBoardSucceeded: boolean;
}): LeaderboardView {
  if (hasGlobalScores) return "global";
  if (globalBoardSucceeded) return "global-empty";
  return "local";
}

export default function GreenChainzArcade({ onClose, initialGameId }: Props) {
  const [view, setView] = useState<View>(initialGameId ? "playing" : "picker");
  const [gameId, setGameId] = useState<string | null>(initialGameId ?? null);
  const [gameKey, setGameKey] = useState(0);
  const [hidden, setHidden] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [madeBoard, setMadeBoard] = useState(false);

  // Identity is intentionally kept across rounds so repeat players never retype.
  const [initials, setInitials] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [showClaim, setShowClaim] = useState(false);

  const [localBoard, setLocalBoard] = useState<HighScore[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [submitRank, setSubmitRank] = useState<number | null>(null);
  const [submitOffline, setSubmitOffline] = useState(false);

  // The Round's daily board tab + Showtime gate. `boardPeriod` picks which window
  // the leaderboard shows; `roundShowtime` (captured when a round starts) says
  // whether the round the player is in counts on today's board. `recordedStreak`
  // holds the streak locked in the moment a Showtime run completes.
  const [boardPeriod, setBoardPeriod] = useState<BoardPeriod>(
    initialGameId === THE_ROUND ? "day" : "all",
  );
  const [roundShowtime, setRoundShowtime] = useState<ShowtimeStatus | null>(
    initialGameId === THE_ROUND ? getShowtimeStatus(THE_ROUND) : null,
  );
  const [recordedStreak, setRecordedStreak] = useState<number | null>(null);

  const panelRef = useRef<HTMLDivElement | null>(null);
  const initialsRef = useRef<HTMLInputElement | null>(null);

  const game = gameId ? getGameById(gameId) : undefined;

  // Global leaderboard for the current game. Warms up while the player is still
  // playing so the board is ready the moment the run ends. Fails quietly when
  // there is no backend (e.g. static/offline) - localStorage is the fallback.
  const globalBoard = trpc.arcade.topScores.useQuery(
    { gameId: (gameId ?? "spec-breaker") as ArcadeGameId, limit: 10, period: boardPeriod },
    {
      enabled: !!gameId,
      retry: 0,
      meta: { suppressGlobalErrorLogging: true },
    },
  );

  const submitMutation = trpc.arcade.submitScore.useMutation({
    meta: { suppressGlobalErrorLogging: true },
  });

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
    if (view === "gameover" && !submitted) {
      initialsRef.current?.focus();
    }
  }, [view, submitted]);

  // Arm (or clear) the Showtime gate for a fresh round of `id`. The Round reads
  // today's status; every other game is ungated free-play.
  const armShowtime = useCallback((id: string) => {
    setRecordedStreak(null);
    setRoundShowtime(id === THE_ROUND ? getShowtimeStatus(id) : null);
  }, []);

  const startGame = useCallback(
    (id: string) => {
      setGameId(id);
      setGameKey((k) => k + 1);
      setFinalScore(0);
      setBoardPeriod(id === THE_ROUND ? "day" : "all");
      armShowtime(id);
      setView("playing");
    },
    [armShowtime],
  );

  const handleGameOver = useCallback(
    (score: number) => {
      if (!gameId) return;
      setFinalScore(score);
      setMadeBoard(isHighScore(gameId, score));
      setSubmitted(false);
      setSubmitRank(null);
      setSubmitOffline(false);
      setLocalBoard(getHighScores(gameId));
      // The Round's first run of the UTC day is "Showtime" - completing it is the
      // daily check-in that locks the streak, whether or not initials get posted.
      if (gameId === THE_ROUND && roundShowtime?.mode === "showtime") {
        setRecordedStreak(recordShowtime(gameId).streak);
      }
      setView("gameover");
    },
    [gameId, roundShowtime],
  );

  const emailTrimmed = email.trim();
  const emailValid = EMAIL_RE.test(emailTrimmed);

  const submitScore = useCallback(() => {
    if (!gameId || submitted) return;
    // Practice runs (The Round, after today's Showtime) never touch the board.
    if (gameId === THE_ROUND && roundShowtime?.mode === "practice") return;
    const ini = normalizeInitials(initials || "AAA");
    const roundedScore = Math.round(finalScore);

    // Always save locally first - the board must work offline no matter what.
    setLocalBoard(addHighScore(gameId, ini, roundedScore));
    setSubmitted(true);
    setMadeBoard(false);

    const emailToSend = emailValid ? emailTrimmed : undefined;
    // A Showtime run posts to TODAY's board (the returned rank is today's);
    // everything else posts to the all-time board.
    const period: BoardPeriod =
      gameId === THE_ROUND && roundShowtime?.mode === "showtime" ? "day" : "all";

    submitMutation.mutate(
      {
        gameId: gameId as ArcadeGameId,
        score: roundedScore,
        initials: ini,
        playerName: playerName.trim() || undefined,
        company: company.trim() || undefined,
        email: emailToSend,
        period,
      },
      {
        onSuccess: (data) => {
          setSubmitRank(data.rank);
          setSubmitOffline(!data.persisted);
          if (data.persisted) void globalBoard.refetch();
        },
        onError: () => {
          setSubmitOffline(true);
        },
      },
    );
  }, [
    gameId,
    submitted,
    roundShowtime,
    initials,
    finalScore,
    playerName,
    company,
    emailTrimmed,
    emailValid,
    submitMutation,
    globalBoard,
  ]);

  const playAgain = useCallback(() => {
    if (!gameId) return;
    setGameKey((k) => k + 1);
    setFinalScore(0);
    armShowtime(gameId);
    setView("playing");
  }, [gameId, armShowtime]);

  const backToPicker = useCallback(() => {
    setView("picker");
    setGameId(null);
  }, []);

  const paused = view !== "playing" || hidden;

  const GameComponent = game?.Component;

  const accent = game?.accent ?? LIME;

  const localRanked = useMemo(() => localBoard.slice(0, 10), [localBoard]);

  // Prefer the live global board; fall back to the local board when the backend
  // is unreachable. A reachable-but-empty global board gets its own empty state.
  const globalScores = globalBoard.data?.scores ?? [];
  const leaderboardView = getLeaderboardView({
    hasGlobalScores: globalScores.length > 0,
    globalBoardSucceeded: globalBoard.isSuccess,
  });
  const showingGlobal = leaderboardView !== "local";

  // The Round's Showtime state for the run just finished.
  const isRoundGame = gameId === THE_ROUND;
  const isShowtimeRound = isRoundGame && roundShowtime?.mode === "showtime";
  const isPracticeRound = isRoundGame && roundShowtime?.mode === "practice";
  const shownStreak = recordedStreak ?? roundShowtime?.streak ?? 0;

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
                  // The Round wears its daily hook right on the shelf: is today's
                  // Showtime still up for grabs, and what's the live streak?
                  const gate = g.id === THE_ROUND ? getShowtimeStatus(g.id) : null;
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
                      {gate ? (
                        <span className="mt-1 flex items-center gap-1.5 text-[11px] font-bold">
                          {gate.mode === "showtime" ? (
                            <span style={{ color: g.accent }}>▶ SHOWTIME READY</span>
                          ) : (
                            <span className="text-white/40">Showtime done · back tomorrow</span>
                          )}
                          {gate.streak > 0 && (
                            <span className="text-white/50">· 🔥 {gate.streak}</span>
                          )}
                        </span>
                      ) : (
                        <span className="mt-1 text-[11px] text-white/30">
                          {best > 0 ? `Best ${best.toLocaleString()}` : "No high score yet"}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Coming-soon hype: tease the stakes now, launch them later. */}
              <div className="mx-auto mt-6 max-w-2xl rounded-xl border border-[#FFCC33]/25 bg-[#FFCC33]/[0.04] p-4 text-center">
                <div className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#FFCC33]">
                  🔥 Coming soon
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                  <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-semibold text-white">
                    💵 Cash prizes
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-semibold text-white">
                    👕 Merch drops
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-semibold text-white">
                    🏆 Monthly showdown
                  </span>
                </div>
                <div className="mt-2.5 text-xs leading-snug text-white/50">
                  The board is live. The stakes are next. Play The Round daily now —
                  founding players get remembered.
                </div>
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
                  {Math.round(finalScore).toLocaleString()}
                </div>
                <div className="text-xs text-white/40">{game.name}</div>
              </div>

              {/* Post-to-leaderboard flow */}
              {isPracticeRound ? (
                <div className="mb-5 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-center">
                  <div className="text-sm font-semibold text-white">🎯 Practice round</div>
                  <div className="mt-1 text-xs leading-snug text-white/50">
                    Your Showtime is done for today — practice runs don&apos;t hit the board.
                  </div>
                  {shownStreak > 0 && (
                    <div className="mt-2 text-sm font-black" style={{ color: accent }}>
                      🔥 {shownStreak}-day streak
                    </div>
                  )}
                  <div className="mt-1 text-xs text-white/40">
                    Come back tomorrow to keep it alive.
                  </div>
                </div>
              ) : !submitted ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    submitScore();
                  }}
                  className="mb-5 flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4"
                >
                  {isShowtimeRound && (
                    <div
                      className="text-center text-xs font-black uppercase tracking-wider"
                      style={{ color: accent }}
                    >
                      ▶ Showtime — this one counts on today&apos;s board
                    </div>
                  )}
                  <div className="text-center text-sm font-semibold text-white">
                    {madeBoard ? "🏆 New personal best!" : "📮 Post your score"}
                    <span className="ml-1 font-normal text-white/50">
                      {isShowtimeRound ? "to today’s board" : "to the global board"}
                    </span>
                  </div>

                  <div className="flex items-center justify-center gap-3">
                    <input
                      ref={initialsRef}
                      value={initials}
                      onChange={(e) =>
                        setInitials(
                          e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3),
                        )
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
                      Post score
                    </button>
                  </div>

                  {!showClaim ? (
                    <button
                      type="button"
                      onClick={() => setShowClaim(true)}
                      className="text-center text-xs text-white/45 underline-offset-2 transition hover:text-white/80 hover:underline"
                    >
                      🏢 Rep your company &amp; claim your rank
                    </button>
                  ) : (
                    <div className="flex flex-col gap-2 border-t border-white/10 pt-3">
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <input
                          value={playerName}
                          onChange={(e) => setPlayerName(e.target.value)}
                          placeholder="Your name"
                          maxLength={120}
                          className="rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/50"
                          aria-label="Your name"
                        />
                        <input
                          value={company}
                          onChange={(e) => setCompany(e.target.value)}
                          placeholder="Company"
                          maxLength={160}
                          className="rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/50"
                          aria-label="Company"
                        />
                      </div>
                      <input
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@company.com"
                        type="email"
                        maxLength={320}
                        className="rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/50"
                        aria-label="Email"
                      />
                      <p className="text-[11px] leading-snug text-white/35">
                        {emailTrimmed && !emailValid
                          ? "Enter a valid email to claim your rank."
                          : "Rep your company on the board. Drop an email to claim your rank and get founding-player perks."}
                      </p>
                    </div>
                  )}
                </form>
              ) : (
                <div className="mb-5 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-center">
                  {submitOffline ? (
                    <div className="text-sm text-white/70">
                      Saved to your local board. Global board is offline right now.
                    </div>
                  ) : submitRank != null ? (
                    <div className="text-sm font-semibold text-white">
                      {isShowtimeRound ? "🏆 You’re " : "🌍 You’re "}
                      <span style={{ color: accent }}>#{submitRank}</span>
                      {isShowtimeRound ? " on today’s board" : " in the world"}
                      {company.trim() ? (
                        <>
                          {" "}
                          for <span className="text-white/80">{company.trim()}</span>
                        </>
                      ) : null}
                      !
                      {isShowtimeRound && shownStreak > 0 && (
                        <div className="mt-1 text-xs font-black" style={{ color: accent }}>
                          🔥 {shownStreak}-day streak — see you tomorrow.
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-white/70">Posting your score…</div>
                  )}
                </div>
              )}

              {/* Leaderboard */}
              <div className="mb-5 rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <div className="mb-2 flex items-center justify-between">
                  {isRoundGame ? (
                    <div className="flex items-center gap-1">
                      {(["day", "all"] as const).map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setBoardPeriod(p)}
                          className={cn(
                            "rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider transition",
                            boardPeriod === p
                              ? "text-black"
                              : "text-white/40 hover:text-white/70",
                          )}
                          style={boardPeriod === p ? { backgroundColor: accent } : undefined}
                        >
                          {p === "day" ? "🏆 Today" : "🌍 All-Time"}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[11px] font-bold uppercase tracking-wider text-white/40">
                      {showingGlobal ? "🌍 Global Top 10" : "Your scores"}
                    </div>
                  )}
                  {globalBoard.isFetching && (
                    <div className="text-[10px] text-white/30">syncing…</div>
                  )}
                  {!showingGlobal && !globalBoard.isFetching && globalBoard.isError && (
                    <div className="text-[10px] text-white/30">global offline</div>
                  )}
                </div>

                {leaderboardView === "global" ? (
                  <ol className="flex flex-col gap-1">
                    {globalScores.map((entry) => {
                      const isYou =
                        submitted && !submitOffline && entry.score === Math.round(finalScore);
                      return (
                        <li
                          key={`${entry.rank}-${entry.initials}-${entry.score}`}
                          className={cn(
                            "flex items-center justify-between rounded-md px-2 py-1 text-sm tabular-nums",
                            isYou ? "bg-white/[0.06]" : "",
                          )}
                        >
                          <span className="flex min-w-0 items-center gap-3">
                            <span className="w-5 text-right text-white/30">{entry.rank}</span>
                            <span className="font-bold tracking-widest text-white">
                              {entry.initials}
                            </span>
                            {entry.company ? (
                              <span className="truncate text-xs text-white/40">
                                {entry.company}
                              </span>
                            ) : null}
                          </span>
                          <span className="font-semibold" style={{ color: accent }}>
                            {entry.score.toLocaleString()}
                          </span>
                        </li>
                      );
                    })}
                  </ol>
                ) : leaderboardView === "global-empty" ? (
                  <div className="py-3 text-center text-sm text-white/40">
                    {isRoundGame && boardPeriod === "day"
                      ? "No one's posted today. Take the top spot."
                      : "Be the first in the world."}
                  </div>
                ) : localRanked.length === 0 ? (
                  <div className="py-3 text-center text-sm text-white/40">
                    Be the first on the board.
                  </div>
                ) : (
                  <ol className="flex flex-col gap-1">
                    {localRanked.map((entry, i) => (
                      <li
                        key={`${entry.initials}-${entry.at}-${i}`}
                        className={cn(
                          "flex items-center justify-between rounded-md px-2 py-1 text-sm tabular-nums",
                          submitted && entry.score === Math.round(finalScore)
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

              {/* Reinforce the coming-soon stakes right after they see their rank. */}
              <div className="mb-5 rounded-lg border border-[#FFCC33]/20 bg-[#FFCC33]/[0.04] px-4 py-2.5 text-center text-xs text-white/60">
                <span className="font-bold text-[#FFCC33]">Coming soon:</span>{" "}
                💵 cash prizes · 👕 merch · 🏆 monthly showdown. Keep your streak alive.
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
