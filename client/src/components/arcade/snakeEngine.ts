/**
 * Supply Snake — pure engine (no DOM/React/canvas).
 *
 * The "our spin": the snake is a green supply chain that grows every time it
 * links a new order (food). Classic rules — hit a wall or your own chain and
 * the run ends. Fixed-tick movement; the renderer decides when to call
 * {@link stepSnake} based on `state.tickMs`.
 */
export interface Cell {
  x: number;
  y: number;
}

export interface Dir {
  x: number;
  y: number;
}

export type SnakePhase = "ready" | "playing" | "game_over";

export interface SnakeConfig {
  cols: number;
  rows: number;
  startLength: number;
  /** ms per move at the start */
  baseTickMs: number;
  minTickMs: number;
  /** speed up after this many orders */
  speedUpEvery: number;
  /** tick is multiplied by this each speed-up (smaller = faster) */
  speedUpFactor: number;
}

export const defaultSnakeConfig: SnakeConfig = {
  cols: 24,
  rows: 18,
  startLength: 4,
  baseTickMs: 130,
  minTickMs: 62,
  speedUpEvery: 4,
  speedUpFactor: 0.9,
};

export type SnakeEvent =
  | { type: "move" }
  | { type: "eat"; score: number; length: number }
  | { type: "death"; score: number };

export interface SnakeState {
  phase: SnakePhase;
  /** head is index 0 */
  snake: Cell[];
  dir: Dir;
  pendingDir: Dir;
  food: Cell;
  score: number;
  eaten: number;
  tickMs: number;
  config: SnakeConfig;
  events: SnakeEvent[];
  rng: () => number;
}

export function spawnFood(state: SnakeState): Cell {
  const { cols, rows } = state.config;
  const occupied = new Set(state.snake.map((c) => c.y * cols + c.x));
  const free: number[] = [];
  for (let i = 0; i < cols * rows; i++) {
    if (!occupied.has(i)) free.push(i);
  }
  if (free.length === 0) return { ...state.snake[0] };
  const idx = free[Math.floor(state.rng() * free.length)];
  return { x: idx % cols, y: Math.floor(idx / cols) };
}

export function createSnakeState(
  config: SnakeConfig = defaultSnakeConfig,
  rng: () => number = Math.random,
): SnakeState {
  const cy = Math.floor(config.rows / 2);
  const startX = Math.floor(config.cols / 2);
  const snake: Cell[] = [];
  for (let i = 0; i < config.startLength; i++) {
    snake.push({ x: startX - i, y: cy });
  }
  const state: SnakeState = {
    phase: "ready",
    snake,
    dir: { x: 1, y: 0 },
    pendingDir: { x: 1, y: 0 },
    food: { x: 0, y: 0 },
    score: 0,
    eaten: 0,
    tickMs: config.baseTickMs,
    config,
    events: [],
    rng,
  };
  state.food = spawnFood(state);
  return state;
}

export function startSnake(state: SnakeState): void {
  if (state.phase === "ready") state.phase = "playing";
}

/** Buffer a turn. Rejects non-cardinal input and 180° reversals. */
export function setDirection(state: SnakeState, dir: Dir): void {
  const cardinal = (dir.x === 0) !== (dir.y === 0);
  if (!cardinal) return;
  if (dir.x === -state.dir.x && dir.y === -state.dir.y) return;
  state.pendingDir = dir;
}

/** Advance the snake by exactly one grid step. */
export function stepSnake(state: SnakeState): SnakeState {
  state.events = [];
  if (state.phase !== "playing") return state;

  state.dir = state.pendingDir;
  const head = state.snake[0];
  const newHead: Cell = { x: head.x + state.dir.x, y: head.y + state.dir.y };
  const { cols, rows } = state.config;

  // wall collision
  if (newHead.x < 0 || newHead.x >= cols || newHead.y < 0 || newHead.y >= rows) {
    state.phase = "game_over";
    state.events.push({ type: "death", score: state.score });
    return state;
  }

  const willGrow = newHead.x === state.food.x && newHead.y === state.food.y;
  // when not growing the tail vacates, so the tail cell is a legal target
  const body = willGrow ? state.snake : state.snake.slice(0, state.snake.length - 1);
  if (body.some((c) => c.x === newHead.x && c.y === newHead.y)) {
    state.phase = "game_over";
    state.events.push({ type: "death", score: state.score });
    return state;
  }

  state.snake.unshift(newHead);
  if (willGrow) {
    state.eaten += 1;
    const points = 10 + Math.floor(state.eaten / state.config.speedUpEvery) * 5;
    state.score += points;
    if (state.eaten % state.config.speedUpEvery === 0) {
      state.tickMs = Math.max(
        state.config.minTickMs,
        Math.round(state.tickMs * state.config.speedUpFactor),
      );
    }
    state.food = spawnFood(state);
    state.events.push({ type: "eat", score: state.score, length: state.snake.length });
  } else {
    state.snake.pop();
    state.events.push({ type: "move" });
  }
  return state;
}
