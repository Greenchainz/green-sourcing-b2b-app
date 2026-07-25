import { useCallback, useEffect, useRef, useState } from "react";
import { useGameLoop } from "./useGameLoop";
import { TRIVIA_QUESTIONS } from "./triviaQuestions";
import {
  createDeck,
  nextQuestion,
  prepareQuestion,
  scoreAnswer,
  comboMultiplier,
  QUESTION_TIME_MS,
  MAX_STRIKES,
  REVEAL_MS,
  type TriviaDeck,
  type PreparedQuestion,
} from "./triviaEngine";
import type { ArcadeGameProps } from "./types";
import { cn } from "@/lib/utils";

const ACCENT = "#FFC24B";
const OPTION_KEYS = ["1", "2", "3", "4"];

type Phase = "playing" | "revealed" | "game_over";

export default function TriviaGame({ paused, onScore, onGameOver }: ArcadeGameProps) {
  const deckRef = useRef<TriviaDeck | null>(null);
  const timeLeftRef = useRef(QUESTION_TIME_MS);
  const barRef = useRef<HTMLDivElement | null>(null);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gameOverSentRef = useRef(false);

  // Refs mirror state values read inside the RAF loop / timers.
  const phaseRef = useRef<Phase>("playing");
  const scoreRef = useRef(0);
  const streakRef = useRef(0);
  const strikesRef = useRef(0);

  const [current, setCurrent] = useState<PreparedQuestion | null>(null);
  const [phase, setPhase] = useState<Phase>("playing");
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [strikes, setStrikes] = useState(0);
  const [lastGain, setLastGain] = useState<number | null>(null);

  const setPhaseBoth = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  const loadNext = useCallback(() => {
    const deck = deckRef.current;
    if (!deck) return;
    const q = nextQuestion(deck);
    setCurrent(prepareQuestion(q));
    setSelected(null);
    setLastGain(null);
    timeLeftRef.current = QUESTION_TIME_MS;
    if (barRef.current) barRef.current.style.width = "100%";
    setPhaseBoth("playing");
  }, [setPhaseBoth]);

  // Initialise the deck + first question once.
  useEffect(() => {
    deckRef.current = createDeck(TRIVIA_QUESTIONS);
    loadNext();
    return () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    };
  }, [loadNext]);

  const endGame = useCallback(() => {
    setPhaseBoth("game_over");
    if (!gameOverSentRef.current) {
      gameOverSentRef.current = true;
      onGameOver(scoreRef.current);
    }
  }, [onGameOver, setPhaseBoth]);

  const scheduleAdvance = useCallback(() => {
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    advanceTimerRef.current = setTimeout(() => {
      if (strikesRef.current >= MAX_STRIKES) {
        endGame();
      } else {
        loadNext();
      }
    }, REVEAL_MS);
  }, [endGame, loadNext]);

  const answer = useCallback(
    (choice: number | null) => {
      if (phaseRef.current !== "playing" || !current) return;

      const isCorrect = choice !== null && choice === current.correctIndex;
      setSelected(choice);
      setPhaseBoth("revealed");

      if (isCorrect) {
        const newStreak = streakRef.current + 1;
        streakRef.current = newStreak;
        setStreak(newStreak);
        const gain = scoreAnswer(timeLeftRef.current, newStreak);
        scoreRef.current += gain;
        setScore(scoreRef.current);
        setLastGain(gain);
        onScore?.(scoreRef.current);
      } else {
        streakRef.current = 0;
        setStreak(0);
        strikesRef.current += 1;
        setStrikes(strikesRef.current);
        setLastGain(null);
      }
      scheduleAdvance();
    },
    [current, onScore, scheduleAdvance, setPhaseBoth],
  );

  // Countdown clock — drives the timer bar and triggers a timeout "strike".
  const active = !paused && phase === "playing" && current !== null;
  useGameLoop(
    (dtMs) => {
      timeLeftRef.current = Math.max(0, timeLeftRef.current - dtMs);
      if (barRef.current) {
        const pct = (timeLeftRef.current / QUESTION_TIME_MS) * 100;
        barRef.current.style.width = `${pct}%`;
      }
      if (timeLeftRef.current <= 0) {
        answer(null); // out of time = strike
      }
    },
    active,
  );

  // Keyboard: 1-4 to answer, Space/Enter to advance early on reveal.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (paused) return;
      if (phaseRef.current === "playing") {
        const idx = OPTION_KEYS.indexOf(e.key);
        if (idx !== -1) {
          e.preventDefault();
          answer(idx);
        }
      } else if (phaseRef.current === "revealed" && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
        if (strikesRef.current >= MAX_STRIKES) endGame();
        else loadNext();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [answer, endGame, loadNext, paused]);

  const mult = comboMultiplier(Math.max(1, streak));

  return (
    <div className="flex w-full max-w-[760px] flex-col gap-4 px-2 text-white">
      {/* HUD */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <span className="tabular-nums">
            <span className="text-white/50">SCORE </span>
            <span className="font-bold" style={{ color: ACCENT }}>
              {score.toLocaleString()}
            </span>
          </span>
          {streak > 1 && (
            <span className="tabular-nums text-white/70">
              🔥 {streak} <span className="text-white/40">×{mult.toFixed(2)}</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-1" aria-label={`${strikes} of ${MAX_STRIKES} strikes`}>
          {Array.from({ length: MAX_STRIKES }).map((_, i) => (
            <span key={i} className={cn("text-lg leading-none", i < strikes ? "opacity-100" : "opacity-25")}>
              {i < strikes ? "❌" : "⭕"}
            </span>
          ))}
        </div>
      </div>

      {/* Timer bar */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div
          ref={barRef}
          className="h-full rounded-full transition-[background-color] duration-300"
          style={{ width: "100%", backgroundColor: ACCENT }}
        />
      </div>

      {current && phase !== "game_over" && (
        <div className="flex flex-col gap-4">
          <div className="min-h-[64px] text-balance text-center text-xl font-semibold sm:text-2xl">
            {current.question.prompt}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {current.options.map((opt, i) => {
              const isCorrect = i === current.correctIndex;
              const isChosen = i === selected;
              const revealed = phase === "revealed";
              return (
                <button
                  key={i}
                  type="button"
                  disabled={revealed}
                  onClick={() => answer(i)}
                  className={cn(
                    "group flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all",
                    "border-white/15 bg-white/[0.04] hover:border-white/40 hover:bg-white/[0.08]",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60",
                    revealed && isCorrect && "border-emerald-400 bg-emerald-400/15",
                    revealed && isChosen && !isCorrect && "border-red-400 bg-red-400/15",
                    revealed && !isCorrect && !isChosen && "opacity-40",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-7 w-7 flex-none items-center justify-center rounded-md text-xs font-bold",
                      "bg-white/10 text-white/70 group-hover:bg-white/20",
                      revealed && isCorrect && "bg-emerald-400 text-black",
                      revealed && isChosen && !isCorrect && "bg-red-400 text-black",
                    )}
                  >
                    {revealed && isCorrect ? "✓" : revealed && isChosen ? "✕" : i + 1}
                  </span>
                  <span className="text-sm sm:text-base">{opt}</span>
                </button>
              );
            })}
          </div>

          {/* Reveal fact + points */}
          <div className="min-h-[60px]">
            {phase === "revealed" && (
              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/80">
                {lastGain !== null && (
                  <span className="mr-2 font-bold" style={{ color: ACCENT }}>
                    +{lastGain}
                  </span>
                )}
                <span className="text-white/50">Did you know? </span>
                {current.question.fact}
              </div>
            )}
          </div>
        </div>
      )}

      {phase === "playing" && (
        <p className="text-center text-xs text-white/30">
          Tap an answer or press 1–4 · faster answers + streaks score more
        </p>
      )}
    </div>
  );
}
