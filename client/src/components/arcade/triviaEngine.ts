// Green IQ — pure trivia engine (framework-free, fully unit-testable).
//
// Responsibilities:
//   - Shuffle a deck of questions and cycle endlessly without an immediate repeat.
//   - Shuffle each question's answer options (so the correct slot moves around).
//   - Score answers by speed + streak.
//
// All randomness is injectable so tests stay deterministic.

/* eslint-disable security/detect-object-injection --
   This module is pure array math (Fisher-Yates shuffle + index maps). Every
   computed index is a bounded loop counter, never user input, so the
   object-injection rule is a false positive here. */
import type { TriviaQuestion } from "./triviaQuestions";

export const QUESTION_TIME_MS = 15_000;
export const MAX_STRIKES = 3;
export const BASE_POINTS = 100;
export const SPEED_BONUS = 100; // up to +100 for an instant correct answer
export const STREAK_STEP = 0.25; // +25% per consecutive correct answer
export const MAX_STREAK_MULT = 4;
/** How long the correct/incorrect reveal is shown before advancing (ms). */
export const REVEAL_MS = 1_800;

export type Rng = () => number;

/** Fisher–Yates shuffle. Returns a new array; does not mutate the input. */
export function shuffle<T>(arr: readonly T[], rng: Rng = Math.random): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = a[i];
    a[i] = a[j];
    a[j] = tmp;
  }
  return a;
}

export interface TriviaDeck {
  questions: TriviaQuestion[];
  order: number[]; // shuffled indices into `questions`
  pos: number;
  rng: Rng;
}

export function createDeck(questions: TriviaQuestion[], rng: Rng = Math.random): TriviaDeck {
  const indices = questions.map((_, i) => i);
  return { questions, order: shuffle(indices, rng), pos: 0, rng };
}

/**
 * Returns the next question, cycling endlessly. When the deck is exhausted it
 * reshuffles, taking care not to immediately repeat the question that just played.
 */
export function nextQuestion(deck: TriviaDeck): TriviaQuestion {
  if (deck.pos >= deck.order.length) {
    const last = deck.order[deck.order.length - 1];
    const reshuffled = shuffle(
      deck.questions.map((_, i) => i),
      deck.rng,
    );
    if (reshuffled.length > 1 && reshuffled[0] === last) {
      const tmp = reshuffled[0];
      reshuffled[0] = reshuffled[1];
      reshuffled[1] = tmp;
    }
    deck.order = reshuffled;
    deck.pos = 0;
  }
  const q = deck.questions[deck.order[deck.pos]];
  deck.pos += 1;
  return q;
}

export interface PreparedQuestion {
  question: TriviaQuestion;
  /** Options in shuffled display order. */
  options: string[];
  /** Index into `options` of the correct answer. */
  correctIndex: number;
}

/** Shuffles a question's options so the correct answer isn't always in the same slot. */
export function prepareQuestion(q: TriviaQuestion, rng: Rng = Math.random): PreparedQuestion {
  const order = shuffle(
    q.options.map((_, i) => i),
    rng,
  );
  const options = order.map((i) => q.options[i]);
  const correctIndex = order.indexOf(q.correct);
  return { question: q, options, correctIndex };
}

/**
 * Streak multiplier. First correct answer (streak 1) is 1×; each additional
 * consecutive correct answer adds STREAK_STEP, capped at MAX_STREAK_MULT.
 */
export function comboMultiplier(streak: number): number {
  const steps = Math.max(0, streak - 1);
  return Math.min(1 + steps * STREAK_STEP, MAX_STREAK_MULT);
}

/**
 * Points for a correct answer.
 * @param msRemaining time left on the clock when answered (more = faster = more points)
 * @param streak the new consecutive-correct count including this answer (>= 1)
 */
export function scoreAnswer(msRemaining: number, streak: number): number {
  const clamped = Math.max(0, Math.min(QUESTION_TIME_MS, msRemaining));
  const speed = Math.round((clamped / QUESTION_TIME_MS) * SPEED_BONUS);
  return Math.round((BASE_POINTS + speed) * comboMultiplier(streak));
}
