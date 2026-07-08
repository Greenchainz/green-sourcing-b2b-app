import { describe, it, expect } from "vitest";
import {
  shuffle,
  createDeck,
  nextQuestion,
  prepareQuestion,
  comboMultiplier,
  scoreAnswer,
  QUESTION_TIME_MS,
  BASE_POINTS,
  SPEED_BONUS,
  MAX_STREAK_MULT,
} from "./triviaEngine";
import type { TriviaQuestion } from "./triviaQuestions";

function makeQuestions(n: number): TriviaQuestion[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `q${i}`,
    prompt: `Question ${i}?`,
    options: [`a${i}`, `b${i}`, `c${i}`, `d${i}`] as [string, string, string, string],
    correct: i % 4,
    fact: `fact ${i}`,
    category: "materials" as const,
  }));
}

/** Deterministic RNG cycling through a fixed list of values in [0,1). */
function seededRng(values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length];
}

describe("shuffle", () => {
  it("returns a permutation with the same elements", () => {
    const input = [1, 2, 3, 4, 5];
    const out = shuffle(input, seededRng([0.1, 0.5, 0.9, 0.3, 0.7]));
    expect(out).toHaveLength(input.length);
    expect([...out].sort((a, b) => a - b)).toEqual(input);
  });

  it("does not mutate the input array", () => {
    const input = [1, 2, 3];
    const copy = [...input];
    shuffle(input, seededRng([0.2, 0.8]));
    expect(input).toEqual(copy);
  });
});

describe("createDeck / nextQuestion", () => {
  it("orders is a permutation of question indices", () => {
    const qs = makeQuestions(6);
    const deck = createDeck(qs);
    expect([...deck.order].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("returns every question exactly once over a full pass", () => {
    const qs = makeQuestions(5);
    const deck = createDeck(qs);
    const seen = new Set<string>();
    for (let i = 0; i < 5; i++) {
      seen.add(nextQuestion(deck).id);
    }
    expect(seen.size).toBe(5);
  });

  it("cycles endlessly past the deck length", () => {
    const qs = makeQuestions(3);
    const deck = createDeck(qs);
    const ids: string[] = [];
    for (let i = 0; i < 9; i++) ids.push(nextQuestion(deck).id);
    // 9 draws over a 3-card deck — all valid ids, no crash.
    expect(ids).toHaveLength(9);
    ids.forEach((id) => expect(qs.some((q) => q.id === id)).toBe(true));
  });

  it("avoids immediately repeating the last question when reshuffling", () => {
    // Force reshuffle to reproduce the previous order (all zeros => reverse),
    // then assert the anti-repeat swap kicked in.
    const qs = makeQuestions(4);
    const deck = createDeck(qs, seededRng([0]));
    let last = "";
    for (let i = 0; i < deck.order.length; i++) last = nextQuestion(deck).id;
    const first = nextQuestion(deck).id; // first of the reshuffled deck
    expect(first).not.toBe(last);
  });
});

describe("prepareQuestion", () => {
  it("keeps correctIndex pointing at the correct option text", () => {
    const q = makeQuestions(1)[0]; // correct = 0 => "a0"
    const prepared = prepareQuestion(q, seededRng([0.9, 0.1, 0.6, 0.3]));
    expect(prepared.options).toHaveLength(4);
    expect(prepared.options[prepared.correctIndex]).toBe("a0");
    expect([...prepared.options].sort()).toEqual(["a0", "b0", "c0", "d0"]);
  });
});

describe("comboMultiplier", () => {
  it("first correct answer is 1x", () => {
    expect(comboMultiplier(1)).toBe(1);
  });

  it("adds 25% per additional consecutive correct", () => {
    expect(comboMultiplier(2)).toBeCloseTo(1.25);
    expect(comboMultiplier(3)).toBeCloseTo(1.5);
  });

  it("caps at MAX_STREAK_MULT", () => {
    expect(comboMultiplier(100)).toBe(MAX_STREAK_MULT);
  });

  it("treats zero / negative streaks as 1x", () => {
    expect(comboMultiplier(0)).toBe(1);
    expect(comboMultiplier(-5)).toBe(1);
  });
});

describe("scoreAnswer", () => {
  it("instant answer on first streak = base + full speed bonus", () => {
    expect(scoreAnswer(QUESTION_TIME_MS, 1)).toBe(BASE_POINTS + SPEED_BONUS); // 200
  });

  it("answering at the buzzer scores only base points", () => {
    expect(scoreAnswer(0, 1)).toBe(BASE_POINTS); // 100
  });

  it("applies the streak multiplier", () => {
    // instant + streak 3 => 200 * 1.5 = 300
    expect(scoreAnswer(QUESTION_TIME_MS, 3)).toBe(300);
  });

  it("clamps out-of-range time remaining", () => {
    expect(scoreAnswer(QUESTION_TIME_MS * 5, 1)).toBe(BASE_POINTS + SPEED_BONUS);
    expect(scoreAnswer(-1000, 1)).toBe(BASE_POINTS);
  });
});
