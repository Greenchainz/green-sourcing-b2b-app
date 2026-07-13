import { describe, it, expect } from "vitest";
import {
  createSnakeState,
  defaultSnakeConfig,
  setDirection,
  startSnake,
  stepSnake,
  type SnakeState,
} from "./snakeEngine";

function fresh(): SnakeState {
  // deterministic rng so food placement is stable in tests
  const s = createSnakeState(defaultSnakeConfig, () => 0);
  startSnake(s);
  return s;
}

describe("createSnakeState", () => {
  it("builds a snake of the configured length with food off-body", () => {
    const s = createSnakeState();
    expect(s.snake.length).toBe(defaultSnakeConfig.startLength);
    expect(s.phase).toBe("ready");
    const onBody = s.snake.some((c) => c.x === s.food.x && c.y === s.food.y);
    expect(onBody).toBe(false);
  });
});

describe("setDirection", () => {
  it("rejects a 180° reversal", () => {
    const s = fresh(); // moving right
    setDirection(s, { x: -1, y: 0 });
    expect(s.pendingDir).toEqual({ x: 1, y: 0 });
  });

  it("accepts a perpendicular turn", () => {
    const s = fresh();
    setDirection(s, { x: 0, y: -1 });
    expect(s.pendingDir).toEqual({ x: 0, y: -1 });
  });

  it("ignores non-cardinal input", () => {
    const s = fresh();
    setDirection(s, { x: 1, y: 1 });
    expect(s.pendingDir).toEqual({ x: 1, y: 0 });
  });
});

describe("stepSnake movement", () => {
  it("advances the head and keeps length when not eating", () => {
    const s = fresh();
    s.food = { x: 0, y: 0 }; // out of the way
    const head0 = { ...s.snake[0] };
    const len0 = s.snake.length;
    stepSnake(s);
    expect(s.snake[0]).toEqual({ x: head0.x + 1, y: head0.y });
    expect(s.snake.length).toBe(len0);
    expect(s.events.some((e) => e.type === "move")).toBe(true);
  });

  it("grows and scores when eating, and respawns food off-body", () => {
    const s = fresh();
    const head = s.snake[0];
    s.food = { x: head.x + 1, y: head.y }; // directly ahead
    const len0 = s.snake.length;
    stepSnake(s);
    expect(s.snake.length).toBe(len0 + 1);
    expect(s.score).toBeGreaterThan(0);
    expect(s.eaten).toBe(1);
    const onBody = s.snake.some((c) => c.x === s.food.x && c.y === s.food.y);
    expect(onBody).toBe(false);
    expect(s.events.some((e) => e.type === "eat")).toBe(true);
  });
});

describe("stepSnake death", () => {
  it("ends when hitting a wall", () => {
    const s = fresh();
    // park the head at the right edge, still moving right
    const y = s.snake[0].y;
    s.snake = [
      { x: s.config.cols - 1, y },
      { x: s.config.cols - 2, y },
      { x: s.config.cols - 3, y },
    ];
    s.food = { x: 0, y: 0 };
    stepSnake(s);
    expect(s.phase).toBe("game_over");
    expect(s.events.some((e) => e.type === "death")).toBe(true);
  });

  it("ends when running into its own chain", () => {
    const s = fresh();
    // head at (2,2) having arrived moving down; body loops so a right turn hits it
    s.snake = [
      { x: 2, y: 2 },
      { x: 2, y: 1 },
      { x: 3, y: 1 },
      { x: 3, y: 2 },
      { x: 3, y: 3 },
    ];
    s.dir = { x: 0, y: 1 };
    s.pendingDir = { x: 0, y: 1 };
    s.food = { x: 10, y: 10 };
    setDirection(s, { x: 1, y: 0 }); // turn right into (3,2), a body cell
    stepSnake(s);
    expect(s.phase).toBe("game_over");
  });
});
