/**
 * Long Drive — pure tempo-swing engine (no DOM, no React, no canvas).
 *
 * Framework-agnostic so the physics + swing timing can be unit-tested in
 * isolation. The renderer (DriveGame.tsx) owns the canvas, the swing meter, and
 * the taps; this owns the rules.
 *
 * The signature mechanic is the classic golf *tempo swing*, deliberately unlike
 * the Green Approach putt (which is two separate meters). One continuous arc:
 *
 *   1. tap to start  -> the swing meter climbs the BACKSWING (0 -> 1)
 *   2. tap at the TOP -> locks POWER (how far up you let it go)
 *   3. the meter falls back down the DOWNSWING, past the bottom, then rises again
 *   4. tap at the BOTTOM (impact) -> locks ACCURACY. Dead-on the bottom = pure
 *      bomb; tapping early (still falling) fades it right, late (already rising
 *      on the other side) draws it left.
 *
 * A run is a fixed 6-ball set (World Long Drive format). Score = the SUM of
 * carry-yards across the set (+ pure-strike bonuses), so it slots straight into
 * the shared points leaderboard while the HUD speaks golf (yards, PURE!, OB).
 * Yards are the score, so a 320-yard bomb simply reads as "320".
 */

export type DrivePhase =
  | "ready"
  | "backswing"
  | "downswing"
  | "flying"
  | "landed"
  | "game_over";

/** Which side of dead-center the strike missed on (drives hook/slice curve). */
export type StrikeSide = "pure" | "fade" | "draw";

export interface DriveShot {
  /** carry distance in yards (already OB-adjusted) */
  carry: number;
  /** lateral landing offset in yards; + = right (fade), - = left (draw) */
  lateral: number;
  /** 0..1 strike purity (1 = flush) */
  strike: number;
  /** 0..1 power committed at the top of the backswing */
  power: number;
  side: StrikeSide;
  /** true when the ball landed outside the fairway corridor */
  ob: boolean;
  /** points banked for this ball (carry rounded + any pure bonus) */
  points: number;
  label: string;
}

export type DriveEvent =
  | { type: "tee"; ball: number }
  | { type: "top"; power: number }
  | { type: "impact"; shot: DriveShot }
  | { type: "land"; shot: DriveShot }
  | { type: "game_over"; score: number };

export interface DriveConfig {
  /** balls in a full run */
  ballsPerRun: number;
  /** ms for the backswing meter to climb 0 -> 1 */
  backswingMs: number;
  /** ms for the downswing to fall 1 -> 0 at full power (faster = harder) */
  downswingMsAtFull: number;
  /** ms for the downswing to fall 1 -> 0 at zero power (slower = easier) */
  downswingMsAtZero: number;
  /** carry (yards) floor added before power scaling */
  baseCarry: number;
  /** extra carry (yards) contributed by full power on a flush strike */
  powerCarry: number;
  /** fraction of carry retained by the worst (fully mishit) strike */
  strikeFloor: number;
  /** timing error (0..1) beyond which strike quality bottoms out */
  mishitErr: number;
  /** max lateral landing offset (yards) at a full-power full mishit */
  maxLateral: number;
  /** half-width (yards) of the fairway; land wider than this and it's OB */
  fairwayHalf: number;
  /** carry multiplier applied when a shot lands OB */
  obCarryMult: number;
  /** bonus points for a flush, near-full-power strike */
  pureBonus: number;
  /** ms the landing reveal holds before the next ball */
  landRevealMs: number;
  /** ms a drive spends in the air (visual only) */
  flightMs: number;
}

export interface DriveState {
  phase: DrivePhase;
  config: DriveConfig;
  /** 0-based index of the ball in play */
  ballIndex: number;
  score: number;
  /** longest legal carry so far, for the HUD */
  longest: number;
  /** swing meter value 0..1 (backswing rise / downswing fall) */
  meter: number;
  /** meter travel direction: +1 rising, -1 falling */
  meterDir: 1 | -1;
  /** power locked at the top of the backswing (0..1) */
  power: number;
  /** the shot resolved at impact, driving the flight + reveal */
  shot: DriveShot | null;
  /** elapsed flight time (ms) while phase === "flying" */
  flightMs: number;
  /** counts the landing reveal down before the next ball */
  revealTimer: number;
  events: DriveEvent[];
}

export const FIELD_WIDTH = 800;
export const FIELD_HEIGHT = 560;

/** yards shown from tee to the top of the range (for the renderer's mapping) */
export const VIEW_YARDS = 380;

export const defaultDriveConfig: DriveConfig = {
  ballsPerRun: 6,
  backswingMs: 850,
  downswingMsAtFull: 430,
  downswingMsAtZero: 720,
  baseCarry: 90,
  powerCarry: 270,
  strikeFloor: 0.3,
  mishitErr: 0.42,
  maxLateral: 70,
  fairwayHalf: 34,
  obCarryMult: 0.4,
  pureBonus: 40,
  landRevealMs: 1250,
  flightMs: 1150,
};

export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

/** Linear interpolate. */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** How long the downswing takes to fall — more power = faster = riskier timing. */
function downswingMs(power: number, c: DriveConfig): number {
  return lerp(c.downswingMsAtZero, c.downswingMsAtFull, clamp(power, 0, 1));
}

/**
 * Resolve a struck ball into a shot.
 *
 * `power` is 0..1 (top-of-backswing tap). `signedImpact` is the swing-meter
 * value at the impact tap, signed by which side of the bottom it happened:
 *   0    = flush, dead-center strike
 *   > 0  = tapped early (meter still falling)  -> fade right
 *   < 0  = tapped late  (meter rising again)   -> draw left
 * Its magnitude (0..1) is the timing error.
 */
export function computeShot(
  power: number,
  signedImpact: number,
  config: DriveConfig = defaultDriveConfig,
): DriveShot {
  const p = clamp(power, 0, 1);
  const err = clamp(Math.abs(signedImpact), 0, 1);
  const strike = clamp(1 - err / config.mishitErr, 0, 1);

  // Carry: a flush strike gets the full power-scaled distance; a mishit keeps
  // only strikeFloor..1 of it. Even a soft, flush tap carries a respectable ball.
  const full = config.baseCarry + p * config.powerCarry;
  let carry = full * (config.strikeFloor + (1 - config.strikeFloor) * strike);

  // Lateral: mishits curve, and more power exaggerates the curve.
  const side: StrikeSide =
    err < 0.02 ? "pure" : signedImpact > 0 ? "fade" : "draw";
  const lateral =
    Math.sign(signedImpact) *
    err *
    config.maxLateral *
    (0.5 + 0.5 * p);

  const ob = Math.abs(lateral) > config.fairwayHalf;
  if (ob) carry *= config.obCarryMult;

  const pure = strike >= 0.96 && p >= 0.9;
  const bonus = pure && !ob ? config.pureBonus : 0;
  const points = Math.max(0, Math.round(carry) + bonus);

  return {
    carry,
    lateral,
    strike,
    power: p,
    side,
    ob,
    points,
    label: labelFor({ carry, strike, side, ob, pure }),
  };
}

function labelFor(s: {
  carry: number;
  strike: number;
  side: StrikeSide;
  ob: boolean;
  pure: boolean;
}): string {
  if (s.ob) return "OB!";
  if (s.pure && s.carry >= 320) return "BOMB!";
  if (s.pure) return "PURE!";
  if (s.strike >= 0.75) {
    if (s.side === "pure") return "Striped it";
    return s.side === "fade" ? "Faded" : "Drew it";
  }
  if (s.strike >= 0.4) {
    return s.side === "fade" ? "Pushed" : "Pulled";
  }
  return "Chunked";
}

export function createDriveState(
  config: DriveConfig = defaultDriveConfig,
): DriveState {
  return {
    phase: "ready",
    config,
    ballIndex: 0,
    score: 0,
    longest: 0,
    meter: 0,
    meterDir: 1,
    power: 0,
    shot: null,
    flightMs: 0,
    revealTimer: 0,
    events: [{ type: "tee", ball: 1 }],
  };
}

/**
 * The single swing input. Behaviour depends on phase, mirroring the golf
 * `advanceMeter` pattern:
 *   ready      -> start the backswing
 *   backswing  -> lock power at the current meter height, begin the downswing
 *   downswing  -> strike the ball at the current meter position (impact)
 * Any other phase ignores the tap.
 */
export function swingTap(state: DriveState): void {
  switch (state.phase) {
    case "ready":
      state.phase = "backswing";
      state.meter = 0;
      state.meterDir = 1;
      break;
    case "backswing":
      lockPower(state, clamp(state.meter, 0.05, 1));
      break;
    case "downswing":
      strike(state);
      break;
    default:
      break;
  }
}

function lockPower(state: DriveState, power: number): void {
  state.power = power;
  state.phase = "downswing";
  // Downswing starts at the top we tapped and falls toward the bottom.
  state.meter = power;
  state.meterDir = -1;
  state.events.push({ type: "top", power });
}

function strike(state: DriveState): void {
  // Falling (dir -1) => tapped early => positive (fade). Rising again (dir +1)
  // after passing the bottom => tapped late => negative (draw).
  const signedImpact = state.meterDir === -1 ? state.meter : -state.meter;
  const shot = computeShot(state.power, signedImpact, state.config);
  state.shot = shot;
  state.phase = "flying";
  state.flightMs = 0;
  state.events.push({ type: "impact", shot });
}

function land(state: DriveState): void {
  const shot = state.shot;
  if (!shot) return;
  state.score += shot.points;
  if (!shot.ob) state.longest = Math.max(state.longest, Math.round(shot.carry));
  state.phase = "landed";
  state.revealTimer = state.config.landRevealMs;
  state.events.push({ type: "land", shot });
}

function nextBall(state: DriveState): void {
  const last = state.config.ballsPerRun - 1;
  if (state.ballIndex >= last) {
    state.phase = "game_over";
    state.events.push({ type: "game_over", score: state.score });
    return;
  }
  state.ballIndex += 1;
  state.phase = "ready";
  state.meter = 0;
  state.meterDir = 1;
  state.power = 0;
  state.shot = null;
  state.flightMs = 0;
  state.events.push({ type: "tee", ball: state.ballIndex + 1 });
}

/**
 * Advance the swing/flight simulation by `dtMs`. Repopulates `state.events`.
 *
 * backswing : meter climbs 0 -> 1; reaching the very top auto-locks max power
 *             (an overswing you didn't stop) so the swing can't stall.
 * downswing : meter falls power -> 0, then rebounds 0 -> 1 on the far side; if it
 *             tops out without an impact tap it counts as a whiffed late strike.
 * flying    : advances the flight timer; lands when it elapses.
 * landed    : counts the reveal down, then tees up the next ball or ends the run.
 */
export function stepDrive(state: DriveState, dtMs: number): DriveState {
  state.events = [];
  const dt = Math.max(0, dtMs);
  const c = state.config;

  switch (state.phase) {
    case "backswing": {
      const rate = 1 / c.backswingMs;
      state.meter += rate * dt;
      if (state.meter >= 1) {
        state.meter = 1;
        lockPower(state, 1); // overswing: full power, no control credit
      }
      break;
    }
    case "downswing": {
      const rate = 1 / downswingMs(state.power, c);
      state.meter += state.meterDir * rate * dt;
      if (state.meterDir === -1 && state.meter <= 0) {
        // Passed the bottom without an impact tap — rebound up the far side.
        state.meter = -state.meter;
        state.meterDir = 1;
      }
      if (state.meterDir === 1 && state.meter >= 1) {
        // Never struck it: a fully late whiff.
        state.meter = 1;
        strike(state);
      }
      break;
    }
    case "flying": {
      state.flightMs += dt;
      if (state.flightMs >= c.flightMs) land(state);
      break;
    }
    case "landed": {
      state.revealTimer -= dt;
      if (state.revealTimer <= 0) nextBall(state);
      break;
    }
    default:
      break;
  }

  return state;
}

/** Convenience for the HUD/renderer: the ball number (1-based) in play. */
export function currentBall(state: DriveState): number {
  return state.ballIndex + 1;
}
