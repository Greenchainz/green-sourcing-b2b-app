/**
 * Green Approach — pure mini-golf engine (no DOM, no React, no canvas).
 *
 * Framework-agnostic so the physics can be unit-tested in isolation. The
 * renderer (GolfGame.tsx) owns the canvas, the aim + swing-meter input, and
 * calls {@link launchGolf} with a final angle + power; this owns the rules.
 *
 * Top-down field of FIELD_WIDTH x FIELD_HEIGHT, y growing DOWN. Velocities are
 * in px/ms. The ball rolls with exponential friction and bounces off rectangular
 * bumpers + the borders (geometry: reflect velocity about the surface normal).
 *
 * Scoring is POINTS (higher is better) so it slots straight into the shared
 * high-score board, while the HUD still speaks golf (par, strokes, birdie…).
 * It is an *endless* arcade run: sink holes to bank points; blow past the
 * stroke limit on any hole and the run ends.
 */

export type GolfPhase = "aim" | "rolling" | "sunk" | "game_over";

export interface Vec2 {
  x: number;
  y: number;
}

export interface GolfBall {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

export interface Hole {
  x: number;
  y: number;
  radius: number;
}

/** Axis-aligned rectangular bumper. */
export interface Wall {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface HoleLayout {
  tee: Vec2;
  hole: Hole;
  walls: Wall[];
  par: number;
}

export interface HoleResult {
  holeNumber: number;
  par: number;
  strokes: number;
  label: string;
  points: number;
}

export type GolfEvent =
  | { type: "swing"; power: number; strokes: number }
  | { type: "wall" }
  | { type: "rest"; strokes: number }
  | { type: "sunk"; result: HoleResult }
  | { type: "game_over"; score: number };

export interface GolfConfig {
  /** strokes allowed beyond par before the run ends on that hole */
  maxOverPar: number;
  /** velocity retained per ms of rolling (exponential drag); <1 */
  frictionPerMs: number;
  /** energy retained on a bounce (0..1) */
  wallRestitution: number;
  /** launch speed (px/ms) at full power */
  maxLaunchSpeed: number;
  /** below this speed (px/ms) the ball is considered stopped */
  stopSpeed: number;
  /** ball only drops if it reaches the cup at/under this speed (px/ms) */
  captureSpeed: number;
}

export interface GolfState {
  phase: GolfPhase;
  ball: GolfBall;
  tee: Vec2;
  hole: Hole;
  walls: Wall[];
  par: number;
  strokes: number;
  holeNumber: number;
  score: number;
  /** result of the hole just sunk, drives the reveal flash + board */
  lastResult: HoleResult | null;
  /** counts down the sink celebration before the next hole loads */
  sinkTimer: number;
  config: GolfConfig;
  events: GolfEvent[];
  rng: () => number;
}

export const FIELD_WIDTH = 800;
export const FIELD_HEIGHT = 560;

export const BALL_RADIUS = 7;
export const HOLE_RADIUS = 13;

const MARGIN = 42;
const MAX_DT = 32;
const SINK_REVEAL_MS = 1300;
const MAX_OBSTACLES = 4;

export const defaultGolfConfig: GolfConfig = {
  maxOverPar: 3,
  frictionPerMs: 0.9982,
  wallRestitution: 0.72,
  maxLaunchSpeed: 1.1,
  stopSpeed: 0.02,
  captureSpeed: 0.3,
};

export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

/** True if rect (grown by `pad`) contains point p — used to keep tee/cup clear. */
function rectHasPoint(w: Wall, p: Vec2, pad: number): boolean {
  return (
    p.x >= w.x - pad &&
    p.x <= w.x + w.width + pad &&
    p.y >= w.y - pad &&
    p.y <= w.y + w.height + pad
  );
}

/**
 * Points + label for finishing a hole. Higher = better so it fits the shared
 * leaderboard; later holes are worth slightly more to reward endurance.
 */
export function scoreHole(
  par: number,
  strokes: number,
  holeNumber: number,
): { points: number; label: string } {
  const diff = strokes - par;
  let base: number;
  let label: string;
  if (diff <= -3) {
    base = 1000;
    label = "Albatross";
  } else if (diff === -2) {
    base = 700;
    label = "Eagle";
  } else if (diff === -1) {
    base = 500;
    label = "Birdie";
  } else if (diff === 0) {
    base = 300;
    label = "Par";
  } else if (diff === 1) {
    base = 150;
    label = "Bogey";
  } else if (diff === 2) {
    base = 70;
    label = "Double Bogey";
  } else {
    base = 30;
    label = `+${diff}`;
  }

  const aceBonus = strokes === 1 ? 400 : 0;
  if (strokes === 1) label = "Ace!";

  const scale = 1 + (holeNumber - 1) * 0.05;
  const points = Math.round((base + aceBonus) * scale);
  return { points, label };
}

/**
 * Build a hole. Difficulty scales with `holeNumber`: the cup drifts farther
 * from the tee and more bumpers appear. Bumpers never spawn on top of the tee
 * or cup, so every hole stays completable (borders + bounces open a path).
 */
export function buildHole(
  holeNumber: number,
  rng: () => number = Math.random,
): HoleLayout {
  const tee: Vec2 = {
    x: MARGIN + 30,
    y: MARGIN + rng() * (FIELD_HEIGHT - MARGIN * 2),
  };

  // Cup starts mid-field and pushes toward the far edge on later holes.
  const spread = Math.min(0.45 + holeNumber * 0.04, 0.72);
  const hole: Hole = {
    x: FIELD_WIDTH * (0.55 + rng() * spread * 0.5),
    y: MARGIN + rng() * (FIELD_HEIGHT - MARGIN * 2),
    radius: HOLE_RADIUS,
  };
  hole.x = clamp(hole.x, FIELD_WIDTH * 0.5, FIELD_WIDTH - MARGIN - 20);
  hole.y = clamp(hole.y, MARGIN + 20, FIELD_HEIGHT - MARGIN - 20);

  const dist = Math.hypot(hole.x - tee.x, hole.y - tee.y);
  const par = dist > 430 ? 4 : 3;

  const obstacleCount = Math.min(Math.max(holeNumber - 1, 0), MAX_OBSTACLES);
  const walls: Wall[] = [];
  let attempts = 0;
  while (walls.length < obstacleCount && attempts < obstacleCount * 6) {
    attempts += 1;
    const vertical = rng() > 0.5;
    const w: Wall = vertical
      ? {
          x: FIELD_WIDTH * (0.3 + rng() * 0.45),
          y: MARGIN + rng() * (FIELD_HEIGHT - MARGIN * 2 - 120),
          width: 20,
          height: 70 + rng() * 90,
        }
      : {
          x: FIELD_WIDTH * (0.28 + rng() * 0.42),
          y: MARGIN + rng() * (FIELD_HEIGHT - MARGIN * 2 - 30),
          width: 80 + rng() * 90,
          height: 20,
        };
    const clearTee = !rectHasPoint(w, tee, 70);
    const clearHole = !rectHasPoint(w, hole, 70);
    if (clearTee && clearHole) walls.push(w);
  }

  return { tee, hole, walls, par };
}

function ballAtTee(tee: Vec2): GolfBall {
  return { x: tee.x, y: tee.y, vx: 0, vy: 0, radius: BALL_RADIUS };
}

export function createGolfState(
  config: GolfConfig = defaultGolfConfig,
  rng: () => number = Math.random,
): GolfState {
  const layout = buildHole(1, rng);
  return {
    phase: "aim",
    ball: ballAtTee(layout.tee),
    tee: layout.tee,
    hole: layout.hole,
    walls: layout.walls,
    par: layout.par,
    strokes: 0,
    holeNumber: 1,
    score: 0,
    lastResult: null,
    sinkTimer: 0,
    config,
    events: [],
    rng,
  };
}

export function nextHole(state: GolfState): void {
  const layout = buildHole(state.holeNumber + 1, state.rng);
  state.holeNumber += 1;
  state.tee = layout.tee;
  state.hole = layout.hole;
  state.walls = layout.walls;
  state.par = layout.par;
  state.ball = ballAtTee(layout.tee);
  state.strokes = 0;
  state.sinkTimer = 0;
  state.phase = "aim";
}

/**
 * Take a shot. `angle` is radians (0 = +x, clockwise since y grows down),
 * `power` is 0..1. Only valid while resting on the tee/lie ("aim").
 */
export function launchGolf(
  state: GolfState,
  angle: number,
  power: number,
): void {
  if (state.phase !== "aim") return;
  const speed = clamp(power, 0, 1) * state.config.maxLaunchSpeed;
  state.ball.vx = Math.cos(angle) * speed;
  state.ball.vy = Math.sin(angle) * speed;
  state.strokes += 1;
  state.phase = "rolling";
  state.events.push({ type: "swing", power: clamp(power, 0, 1), strokes: state.strokes });
}

function reflectBorders(ball: GolfBall, e: number, events: GolfEvent[]): void {
  const r = ball.radius;
  let hit = false;
  if (ball.x - r < 0) {
    ball.x = r;
    ball.vx = Math.abs(ball.vx) * e;
    hit = true;
  } else if (ball.x + r > FIELD_WIDTH) {
    ball.x = FIELD_WIDTH - r;
    ball.vx = -Math.abs(ball.vx) * e;
    hit = true;
  }
  if (ball.y - r < 0) {
    ball.y = r;
    ball.vy = Math.abs(ball.vy) * e;
    hit = true;
  } else if (ball.y + r > FIELD_HEIGHT) {
    ball.y = FIELD_HEIGHT - r;
    ball.vy = -Math.abs(ball.vy) * e;
    hit = true;
  }
  if (hit) events.push({ type: "wall" });
}

/** Circle-vs-AABB: push the ball to the surface and reflect about the normal. */
function reflectWall(
  ball: GolfBall,
  w: Wall,
  e: number,
  events: GolfEvent[],
): boolean {
  const nearestX = clamp(ball.x, w.x, w.x + w.width);
  const nearestY = clamp(ball.y, w.y, w.y + w.height);
  const dx = ball.x - nearestX;
  const dy = ball.y - nearestY;
  if (dx * dx + dy * dy > ball.radius * ball.radius) return false;

  if (dx === 0 && dy === 0) {
    // Center is inside the rect — eject along the shallowest axis.
    const left = ball.x - w.x;
    const right = w.x + w.width - ball.x;
    const top = ball.y - w.y;
    const bottom = w.y + w.height - ball.y;
    const m = Math.min(left, right, top, bottom);
    if (m === left) {
      ball.x = w.x - ball.radius;
      ball.vx = -Math.abs(ball.vx) * e;
    } else if (m === right) {
      ball.x = w.x + w.width + ball.radius;
      ball.vx = Math.abs(ball.vx) * e;
    } else if (m === top) {
      ball.y = w.y - ball.radius;
      ball.vy = -Math.abs(ball.vy) * e;
    } else {
      ball.y = w.y + w.height + ball.radius;
      ball.vy = Math.abs(ball.vy) * e;
    }
  } else {
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = dx / d;
    const ny = dy / d;
    ball.x = nearestX + nx * ball.radius;
    ball.y = nearestY + ny * ball.radius;
    const vdot = ball.vx * nx + ball.vy * ny;
    ball.vx = (ball.vx - 2 * vdot * nx) * e;
    ball.vy = (ball.vy - 2 * vdot * ny) * e;
  }
  events.push({ type: "wall" });
  return true;
}

function sink(state: GolfState): void {
  const res = scoreHole(state.par, state.strokes, state.holeNumber);
  state.score += res.points;
  state.ball.x = state.hole.x;
  state.ball.y = state.hole.y;
  state.ball.vx = 0;
  state.ball.vy = 0;
  state.lastResult = {
    holeNumber: state.holeNumber,
    par: state.par,
    strokes: state.strokes,
    label: res.label,
    points: res.points,
  };
  state.phase = "sunk";
  state.sinkTimer = SINK_REVEAL_MS;
  state.events.push({ type: "sunk", result: state.lastResult });
}

function integrate(state: GolfState, subDt: number): void {
  const ball = state.ball;
  const c = state.config;

  const damp = Math.pow(c.frictionPerMs, subDt);
  ball.vx *= damp;
  ball.vy *= damp;
  ball.x += ball.vx * subDt;
  ball.y += ball.vy * subDt;

  reflectBorders(ball, c.wallRestitution, state.events);
  for (const w of state.walls) {
    if (reflectWall(ball, w, c.wallRestitution, state.events)) break;
  }

  const dx = ball.x - state.hole.x;
  const dy = ball.y - state.hole.y;
  const speed = Math.hypot(ball.vx, ball.vy);
  if (Math.hypot(dx, dy) <= state.hole.radius && speed <= c.captureSpeed) {
    sink(state);
  }
}

/**
 * Advance the simulation by `dtMs`. Handles the sink celebration timer, then
 * sub-steps the rolling ball (so fast shots can't tunnel through a bumper),
 * and finally resolves the ball coming to rest — either a new lie ("aim") or,
 * once the stroke limit is blown, "game_over". Repopulates `state.events`.
 */
export function stepGolf(state: GolfState, dtMs: number): GolfState {
  state.events = [];
  const dt = Math.min(dtMs, MAX_DT);

  if (state.phase === "sunk") {
    state.sinkTimer -= dt;
    if (state.sinkTimer <= 0) nextHole(state);
    return state;
  }

  if (state.phase !== "rolling") return state;

  const speed = Math.hypot(state.ball.vx, state.ball.vy);
  const travel = speed * dt;
  const substeps = clamp(Math.ceil(travel / state.ball.radius), 1, 8);
  const subDt = dt / substeps;

  for (let i = 0; i < substeps; i++) {
    integrate(state, subDt);
    if (state.phase !== "rolling") break;
  }

  if (state.phase === "rolling") {
    const sp = Math.hypot(state.ball.vx, state.ball.vy);
    if (sp <= state.config.stopSpeed) {
      state.ball.vx = 0;
      state.ball.vy = 0;
      if (state.strokes >= state.par + state.config.maxOverPar) {
        state.phase = "game_over";
        state.events.push({ type: "game_over", score: state.score });
      } else {
        state.phase = "aim";
        state.events.push({ type: "rest", strokes: state.strokes });
      }
    }
  }

  return state;
}
