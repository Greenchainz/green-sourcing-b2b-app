/**
 * Spec Breaker — pure Breakout engine (no DOM, no React, no canvas).
 *
 * Framework-agnostic so the physics can be unit-tested in isolation. The
 * renderer (BreakoutGame.tsx) owns the canvas + input; this owns the rules.
 *
 * Logical field is FIELD_WIDTH x FIELD_HEIGHT with y growing DOWN.
 * Velocities are in px/ms. `step()` mutates and returns the same state object
 * (cheap, GC-friendly) and repopulates `state.events` each call.
 */

export type GamePhase = "ready" | "playing" | "game_over";

export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

export interface Paddle {
  /** center x */
  x: number;
  /** top y */
  y: number;
  width: number;
  height: number;
}

export interface Brick {
  /** top-left x */
  x: number;
  /** top-left y */
  y: number;
  width: number;
  height: number;
  row: number;
  col: number;
  hits: number;
  maxHits: number;
  color: string;
  alive: boolean;
  points: number;
}

export type GameEvent =
  | { type: "launch" }
  | { type: "wall" }
  | { type: "paddle" }
  | { type: "brick"; brick: Brick; combo: number; destroyed: boolean; gained: number }
  | { type: "life_lost"; livesLeft: number }
  | { type: "level_cleared"; level: number }
  | { type: "game_over"; score: number };

export interface InputState {
  left: boolean;
  right: boolean;
  /** absolute pointer x in field coords, or null when using keys */
  pointerX: number | null;
  launch: boolean;
}

export interface EngineConfig {
  /** baseline ball speed (px/ms) at level 1 */
  ballSpeed: number;
  /** paddle speed (px/ms) for keyboard control */
  paddleSpeed: number;
  lives: number;
}

export interface GameState {
  phase: GamePhase;
  ball: Ball;
  paddle: Paddle;
  bricks: Brick[];
  score: number;
  lives: number;
  level: number;
  /** consecutive brick hits since the last paddle touch */
  combo: number;
  events: GameEvent[];
}

export const FIELD_WIDTH = 800;
export const FIELD_HEIGHT = 600;

export const defaultConfig: EngineConfig = {
  ballSpeed: 0.42,
  paddleSpeed: 0.9,
  lives: 3,
};

const ROW_COLORS = ["#9FE870", "#6FD98A", "#43C6AC", "#2FB5C4", "#3E9BE0"];
const HARD_BRICK_COLOR = "#E7B75F";

const BRICK_ROWS = 5;
const BRICK_COLS = 10;
const BRICK_TOP = 72;
const BRICK_H = 26;
const BRICK_GAP = 6;
const FIELD_PAD = 24;

const PADDLE_W = 120;
const PADDLE_H = 16;
const PADDLE_Y = FIELD_HEIGHT - 42;
const BALL_RADIUS = 8;

const MIN_VY_FACTOR = 0.28;
const COMBO_STEP = 0.25;
const MAX_COMBO_MULT = 5.5;
const MAX_DT = 32;

export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

export function circleRectIntersect(
  cx: number,
  cy: number,
  r: number,
  rx: number,
  ry: number,
  rw: number,
  rh: number,
): boolean {
  const nearestX = clamp(cx, rx, rx + rw);
  const nearestY = clamp(cy, ry, ry + rh);
  const dx = cx - nearestX;
  const dy = cy - nearestY;
  return dx * dx + dy * dy <= r * r;
}

/**
 * Force the ball back to a constant speed and guarantee a minimum vertical
 * component, so it can never settle into an endless horizontal bounce.
 */
export function normalizeVelocity(ball: Ball, speed: number): void {
  let { vx, vy } = ball;
  const mag = Math.hypot(vx, vy) || speed;
  vx = (vx / mag) * speed;
  vy = (vy / mag) * speed;

  const minVy = speed * MIN_VY_FACTOR;
  if (Math.abs(vy) < minVy) {
    const signVy = vy === 0 ? -1 : Math.sign(vy);
    vy = signVy * minVy;
    const vxMag = Math.sqrt(Math.max(0, speed * speed - vy * vy));
    vx = (vx < 0 ? -1 : 1) * vxMag;
  }
  ball.vx = vx;
  ball.vy = vy;
}

export function comboMultiplier(combo: number): number {
  return Math.min(1 + Math.max(0, combo - 1) * COMBO_STEP, MAX_COMBO_MULT);
}

function ballSpeedForLevel(base: number, level: number): number {
  return base * (1 + (level - 1) * 0.08);
}

export function buildBricks(level: number): Brick[] {
  const bricks: Brick[] = [];
  const areaW = FIELD_WIDTH - FIELD_PAD * 2;
  const brickW = (areaW - BRICK_GAP * (BRICK_COLS - 1)) / BRICK_COLS;
  for (let row = 0; row < BRICK_ROWS; row++) {
    for (let col = 0; col < BRICK_COLS; col++) {
      const x = FIELD_PAD + col * (brickW + BRICK_GAP);
      const y = BRICK_TOP + row * (BRICK_H + BRICK_GAP);
      let maxHits = 1;
      if (level >= 5 && row < 2) maxHits = 2;
      else if (level >= 3 && row === 0) maxHits = 2;
      bricks.push({
        x,
        y,
        width: brickW,
        height: BRICK_H,
        row,
        col,
        hits: maxHits,
        maxHits,
        color: maxHits > 1 ? HARD_BRICK_COLOR : ROW_COLORS[row % ROW_COLORS.length],
        alive: true,
        points: (BRICK_ROWS - row) * 10,
      });
    }
  }
  return bricks;
}

export function createInitialState(config: EngineConfig = defaultConfig): GameState {
  const paddle: Paddle = {
    x: FIELD_WIDTH / 2,
    y: PADDLE_Y,
    width: PADDLE_W,
    height: PADDLE_H,
  };
  return {
    phase: "ready",
    ball: {
      x: paddle.x,
      y: paddle.y - BALL_RADIUS - 2,
      vx: 0,
      vy: 0,
      radius: BALL_RADIUS,
    },
    paddle,
    bricks: buildBricks(1),
    score: 0,
    lives: config.lives,
    level: 1,
    combo: 0,
    events: [],
  };
}

export function resetBallOnPaddle(state: GameState): void {
  state.ball.x = state.paddle.x;
  state.ball.y = state.paddle.y - state.ball.radius - 2;
  state.ball.vx = 0;
  state.ball.vy = 0;
  state.combo = 0;
  state.phase = "ready";
}

export function launchBall(
  state: GameState,
  config: EngineConfig = defaultConfig,
): void {
  if (state.phase !== "ready") return;
  const speed = ballSpeedForLevel(config.ballSpeed, state.level);
  const angle = -Math.PI / 2 + (Math.random() * 0.6 - 0.3);
  state.ball.vx = Math.cos(angle) * speed;
  state.ball.vy = Math.sin(angle) * speed;
  normalizeVelocity(state.ball, speed);
  state.phase = "playing";
  state.events.push({ type: "launch" });
}

function movePaddle(
  state: GameState,
  dt: number,
  input: InputState,
  config: EngineConfig,
): void {
  const half = state.paddle.width / 2;
  if (input.pointerX !== null) {
    state.paddle.x = clamp(input.pointerX, half, FIELD_WIDTH - half);
    return;
  }
  let dir = 0;
  if (input.left) dir -= 1;
  if (input.right) dir += 1;
  state.paddle.x = clamp(
    state.paddle.x + dir * config.paddleSpeed * dt,
    half,
    FIELD_WIDTH - half,
  );
}

function loseLife(state: GameState): void {
  state.lives -= 1;
  state.combo = 0;
  if (state.lives <= 0) {
    state.lives = 0;
    state.phase = "game_over";
    state.events.push({ type: "life_lost", livesLeft: 0 });
    state.events.push({ type: "game_over", score: state.score });
  } else {
    state.events.push({ type: "life_lost", livesLeft: state.lives });
    resetBallOnPaddle(state);
  }
}

function advanceLevel(state: GameState): void {
  const cleared = state.level;
  state.level += 1;
  state.bricks = buildBricks(state.level);
  state.events.push({ type: "level_cleared", level: cleared });
  resetBallOnPaddle(state);
}

function resolveBrick(state: GameState, brick: Brick, speed: number): void {
  const ball = state.ball;
  const bx = brick.x + brick.width / 2;
  const by = brick.y + brick.height / 2;
  const dx = (ball.x - bx) / (brick.width / 2);
  const dy = (ball.y - by) / (brick.height / 2);

  if (Math.abs(dx) > Math.abs(dy)) {
    ball.vx = dx > 0 ? Math.abs(ball.vx) : -Math.abs(ball.vx);
  } else {
    ball.vy = dy > 0 ? Math.abs(ball.vy) : -Math.abs(ball.vy);
  }
  normalizeVelocity(ball, speed);

  brick.hits -= 1;
  const destroyed = brick.hits <= 0;
  if (destroyed) {
    brick.alive = false;
  } else {
    brick.color = ROW_COLORS[brick.row % ROW_COLORS.length];
  }

  state.combo += 1;
  const gained = Math.round(brick.points * comboMultiplier(state.combo));
  state.score += gained;
  state.events.push({ type: "brick", brick, combo: state.combo, destroyed, gained });
}

function integrate(state: GameState, dt: number, speed: number): void {
  const ball = state.ball;
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;

  // side + top walls
  if (ball.x - ball.radius <= 0) {
    ball.x = ball.radius;
    ball.vx = Math.abs(ball.vx);
    state.events.push({ type: "wall" });
  } else if (ball.x + ball.radius >= FIELD_WIDTH) {
    ball.x = FIELD_WIDTH - ball.radius;
    ball.vx = -Math.abs(ball.vx);
    state.events.push({ type: "wall" });
  }
  if (ball.y - ball.radius <= 0) {
    ball.y = ball.radius;
    ball.vy = Math.abs(ball.vy);
    state.events.push({ type: "wall" });
  }

  // floor -> life lost
  if (ball.y - ball.radius > FIELD_HEIGHT) {
    loseLife(state);
    return;
  }

  // paddle (only when descending)
  const p = state.paddle;
  if (
    ball.vy > 0 &&
    circleRectIntersect(
      ball.x,
      ball.y,
      ball.radius,
      p.x - p.width / 2,
      p.y,
      p.width,
      p.height,
    )
  ) {
    ball.y = p.y - ball.radius;
    const rel = clamp((ball.x - p.x) / (p.width / 2), -1, 1);
    const angle = -Math.PI / 2 + rel * (Math.PI / 3);
    ball.vx = Math.cos(angle) * speed;
    ball.vy = Math.sin(angle) * speed;
    normalizeVelocity(ball, speed);
    state.combo = 0;
    state.events.push({ type: "paddle" });
  }

  // bricks — resolve at most one per substep for stability
  for (const brick of state.bricks) {
    if (!brick.alive) continue;
    if (
      circleRectIntersect(
        ball.x,
        ball.y,
        ball.radius,
        brick.x,
        brick.y,
        brick.width,
        brick.height,
      )
    ) {
      resolveBrick(state, brick, speed);
      break;
    }
  }

  if (state.bricks.every((b) => !b.alive)) {
    advanceLevel(state);
  }
}

/**
 * Advance the simulation by `dtMs`. Sub-steps fast balls so they can't tunnel
 * through bricks/paddle. Repopulates `state.events` for the renderer to react
 * to (sound, particles, shake).
 */
export function step(
  state: GameState,
  dtMs: number,
  input: InputState,
  config: EngineConfig = defaultConfig,
): GameState {
  state.events = [];
  const dt = Math.min(dtMs, MAX_DT);

  movePaddle(state, dt, input, config);

  if (state.phase === "ready") {
    state.ball.x = state.paddle.x;
    state.ball.y = state.paddle.y - state.ball.radius - 2;
    if (input.launch) launchBall(state, config);
    return state;
  }

  if (state.phase !== "playing") return state;

  const speed = ballSpeedForLevel(config.ballSpeed, state.level);
  const travel = Math.hypot(state.ball.vx, state.ball.vy) * dt;
  const substeps = clamp(Math.ceil(travel / state.ball.radius), 1, 8);
  const subDt = dt / substeps;

  for (let i = 0; i < substeps; i++) {
    integrate(state, subDt, speed);
    if (state.phase !== "playing") break;
  }

  return state;
}
