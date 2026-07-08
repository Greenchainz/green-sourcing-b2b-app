import { describe, it, expect } from "vitest";
import {
  FIELD_HEIGHT,
  FIELD_WIDTH,
  circleRectIntersect,
  comboMultiplier,
  createInitialState,
  defaultConfig,
  normalizeVelocity,
  step,
  type Ball,
  type InputState,
  type GameState,
} from "./breakoutEngine";

function idleInput(overrides: Partial<InputState> = {}): InputState {
  return { left: false, right: false, pointerX: null, launch: false, ...overrides };
}

function speed(state: GameState): number {
  return Math.hypot(state.ball.vx, state.ball.vy);
}

describe("geometry helpers", () => {
  it("circleRectIntersect detects overlap and clears misses", () => {
    // circle centered on the rect
    expect(circleRectIntersect(50, 50, 5, 40, 40, 20, 20)).toBe(true);
    // circle far away
    expect(circleRectIntersect(200, 200, 5, 40, 40, 20, 20)).toBe(false);
    // circle just grazing the left edge
    expect(circleRectIntersect(36, 50, 5, 40, 40, 20, 20)).toBe(true);
  });

  it("normalizeVelocity keeps constant speed and enforces vertical travel", () => {
    const ball: Ball = { x: 0, y: 0, vx: 1, vy: 0, radius: 8 };
    normalizeVelocity(ball, 0.42);
    expect(Math.hypot(ball.vx, ball.vy)).toBeCloseTo(0.42, 5);
    // must have a non-trivial vertical component (no endless horizontal bounce)
    expect(Math.abs(ball.vy)).toBeGreaterThan(0.42 * 0.27);
  });

  it("comboMultiplier grows then caps", () => {
    expect(comboMultiplier(1)).toBeCloseTo(1, 5);
    expect(comboMultiplier(3)).toBeCloseTo(1.5, 5);
    expect(comboMultiplier(999)).toBeCloseTo(5.5, 5);
  });
});

describe("wall + paddle collisions", () => {
  it("bounces off the left wall (flips vx positive)", () => {
    const s = createInitialState();
    s.phase = "playing";
    s.ball.x = s.ball.radius + 0.5;
    s.ball.y = 300;
    s.ball.vx = -0.42;
    s.ball.vy = 0;
    step(s, 16, idleInput(), defaultConfig);
    expect(s.ball.vx).toBeGreaterThan(0);
    expect(s.events.some((e) => e.type === "wall")).toBe(true);
  });

  it("paddle bounce sends the ball upward and resets combo", () => {
    const s = createInitialState();
    s.phase = "playing";
    s.combo = 5;
    s.ball.x = s.paddle.x;
    s.ball.y = s.paddle.y - s.ball.radius + 0.5; // already touching the paddle top
    s.ball.vx = 0;
    s.ball.vy = 0.3;
    step(s, 16, idleInput(), defaultConfig);
    expect(s.ball.vy).toBeLessThan(0);
    expect(s.combo).toBe(0);
    expect(s.events.some((e) => e.type === "paddle")).toBe(true);
    // speed is renormalised to the level-1 baseline
    expect(speed(s)).toBeCloseTo(defaultConfig.ballSpeed, 3);
  });
});

describe("bricks + scoring", () => {
  it("destroys a brick and adds score", () => {
    const s = createInitialState();
    s.phase = "playing";
    const brick = s.bricks[0];
    s.ball.x = brick.x + brick.width / 2;
    s.ball.y = brick.y + brick.height / 2;
    s.ball.vx = 0;
    s.ball.vy = -0.42; // moving up, away from the paddle
    step(s, 16, idleInput(), defaultConfig);
    expect(brick.alive).toBe(false);
    expect(s.score).toBeGreaterThan(0);
    expect(s.combo).toBe(1);
    expect(s.events.some((e) => e.type === "brick")).toBe(true);
  });
});

describe("lives + levels", () => {
  it("loses a life at the floor and re-arms on the paddle", () => {
    const s = createInitialState();
    s.phase = "playing";
    s.ball.x = 400;
    s.ball.y = FIELD_HEIGHT + s.ball.radius + 5;
    s.ball.vx = 0;
    s.ball.vy = 0.3;
    step(s, 16, idleInput(), defaultConfig);
    expect(s.lives).toBe(2);
    expect(s.phase).toBe("ready");
    expect(s.events.some((e) => e.type === "life_lost")).toBe(true);
  });

  it("ends the game when the last life is lost", () => {
    const s = createInitialState();
    s.phase = "playing";
    s.lives = 1;
    s.ball.x = 400;
    s.ball.y = FIELD_HEIGHT + s.ball.radius + 5;
    s.ball.vx = 0;
    s.ball.vy = 0.3;
    step(s, 16, idleInput(), defaultConfig);
    expect(s.lives).toBe(0);
    expect(s.phase).toBe("game_over");
    expect(s.events.some((e) => e.type === "game_over")).toBe(true);
  });

  it("clears the level, rebuilds bricks and increments the level", () => {
    const s = createInitialState();
    s.phase = "playing";
    for (const b of s.bricks) b.alive = false;
    s.ball.x = FIELD_WIDTH / 2;
    s.ball.y = FIELD_HEIGHT / 2;
    s.ball.vx = 0;
    s.ball.vy = -0.42;
    step(s, 16, idleInput(), defaultConfig);
    expect(s.level).toBe(2);
    expect(s.bricks.some((b) => b.alive)).toBe(true);
    expect(s.phase).toBe("ready");
    expect(s.events.some((e) => e.type === "level_cleared")).toBe(true);
  });
});

describe("ready phase", () => {
  it("keeps the ball glued to the paddle until launch", () => {
    const s = createInitialState();
    expect(s.phase).toBe("ready");
    step(s, 16, idleInput({ right: true }), defaultConfig);
    // ball tracks the paddle, stays parked
    expect(s.ball.y).toBeCloseTo(s.paddle.y - s.ball.radius - 2, 5);
    expect(s.phase).toBe("ready");
    // now launch
    step(s, 16, idleInput({ launch: true }), defaultConfig);
    expect(s.phase).toBe("playing");
    expect(s.ball.vy).toBeLessThan(0);
    expect(speed(s)).toBeCloseTo(defaultConfig.ballSpeed, 3);
  });
});
