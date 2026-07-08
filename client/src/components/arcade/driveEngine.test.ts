import { describe, expect, it } from "vitest";
import {
  clamp,
  computeShot,
  createDriveState,
  currentBall,
  defaultDriveConfig,
  stepDrive,
  swingTap,
  type DriveEvent,
  type DriveState,
} from "./driveEngine";

const C = defaultDriveConfig;

/**
 * Roll the sim forward `ms` in ~16ms frames. `stepDrive` drains its event queue
 * every frame (the renderer consumes events per frame), so an optional `sink`
 * collects them the way a real consumer would.
 */
function advance(state: DriveState, ms: number, sink?: DriveEvent[]): void {
  let elapsed = 0;
  while (elapsed < ms) {
    stepDrive(state, 16);
    if (sink) sink.push(...state.events);
    elapsed += 16;
  }
}

/**
 * Deterministically play one ball from the "ready" lie with an exact power and
 * signed impact, bypassing the real-time meter by setting it directly before
 * each tap. Leaves the state teed up for the next ball (or game over).
 */
function playBall(
  state: DriveState,
  power: number,
  signedImpact: number,
  sink?: DriveEvent[],
): void {
  swingTap(state); // ready -> backswing
  state.meter = power;
  state.meterDir = 1;
  swingTap(state); // lock power -> downswing
  state.meter = Math.abs(signedImpact);
  state.meterDir = signedImpact >= 0 ? -1 : 1;
  swingTap(state); // strike -> flying
  advance(state, C.flightMs + C.landRevealMs + 100, sink); // flying -> landed -> next
}

describe("clamp", () => {
  it("bounds values", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
  });
});

describe("computeShot", () => {
  it("a flush, full-power strike carries the maximum with a pure bonus", () => {
    const shot = computeShot(1, 0);
    expect(shot.carry).toBeCloseTo(C.baseCarry + C.powerCarry, 5); // 360
    expect(shot.side).toBe("pure");
    expect(shot.lateral).toBe(0);
    expect(shot.ob).toBe(false);
    expect(shot.points).toBe(Math.round(shot.carry) + C.pureBonus);
    expect(shot.label).toBe("BOMB!");
  });

  it("a flush but low-power strike carries less and earns no bomb", () => {
    const soft = computeShot(0.3, 0);
    const full = computeShot(1, 0);
    expect(soft.carry).toBeLessThan(full.carry);
    expect(soft.strike).toBeCloseTo(1, 5);
    expect(soft.label).not.toBe("BOMB!");
  });

  it("mishits curve to a signed side and lose distance", () => {
    const fade = computeShot(1, 0.2); // tapped early
    const draw = computeShot(1, -0.2); // tapped late
    expect(fade.side).toBe("fade");
    expect(fade.lateral).toBeGreaterThan(0);
    expect(draw.side).toBe("draw");
    expect(draw.lateral).toBeLessThan(0);
    // symmetric magnitude, both shorter than a flush strike
    expect(Math.abs(fade.lateral)).toBeCloseTo(Math.abs(draw.lateral), 5);
    expect(fade.carry).toBeLessThan(computeShot(1, 0).carry);
  });

  it("a big miss flies out of bounds and is heavily penalised", () => {
    const wild = computeShot(1, -0.8);
    expect(wild.ob).toBe(true);
    expect(Math.abs(wild.lateral)).toBeGreaterThan(C.fairwayHalf);
    expect(wild.label).toBe("OB!");
    // OB caps carry to the OB multiplier of the (already mishit) distance.
    expect(wild.carry).toBeLessThan(computeShot(1, 0).carry * C.obCarryMult + 1);
  });

  it("never returns negative points", () => {
    expect(computeShot(0, 1).points).toBeGreaterThanOrEqual(0);
  });
});

describe("swing state machine", () => {
  it("starts ready with the first ball teed up", () => {
    const s = createDriveState();
    expect(s.phase).toBe("ready");
    expect(currentBall(s)).toBe(1);
    expect(s.events.some((e) => e.type === "tee")).toBe(true);
  });

  it("tap sequence walks ready -> backswing -> downswing -> flying", () => {
    const s = createDriveState();
    swingTap(s);
    expect(s.phase).toBe("backswing");
    s.meter = 0.7;
    swingTap(s);
    expect(s.phase).toBe("downswing");
    expect(s.power).toBeCloseTo(0.7, 5);
    s.meter = 0;
    s.meterDir = -1;
    swingTap(s);
    expect(s.phase).toBe("flying");
    expect(s.shot).not.toBeNull();
  });

  it("backswing that reaches the top auto-locks full power (overswing)", () => {
    const s = createDriveState();
    swingTap(s); // -> backswing
    advance(s, C.backswingMs + 100);
    expect(s.phase).toBe("downswing");
    expect(s.power).toBe(1);
  });

  it("a downswing left untapped whiffs late instead of stalling", () => {
    const s = createDriveState();
    swingTap(s);
    s.meter = 0.8;
    swingTap(s); // -> downswing
    advance(s, 4000); // never strike
    // it must have struck the ball (late whiff) and moved on to flight/landing
    expect(s.phase === "flying" || s.phase === "landed" || s.phase === "ready").toBe(
      true,
    );
  });

  it("flight lands, banks points, and tracks the longest legal carry", () => {
    const s = createDriveState();
    playBall(s, 1, 0); // flush bomb
    expect(s.score).toBeGreaterThan(0);
    expect(s.longest).toBeGreaterThanOrEqual(300);
    expect(currentBall(s)).toBe(2);
    expect(s.phase).toBe("ready");
  });

  it("an OB ball still banks its reduced points but not a longest", () => {
    const s = createDriveState();
    playBall(s, 1, -0.8); // wild OB
    expect(s.longest).toBe(0);
    expect(s.score).toBeGreaterThanOrEqual(0);
  });

  it("a full 6-ball run ends in game_over with the summed score", () => {
    const s = createDriveState();
    const per = computeShot(1, 0).points;
    const events: DriveEvent[] = [];
    for (let i = 0; i < C.ballsPerRun; i++) {
      playBall(s, 1, 0, events);
    }
    expect(s.phase).toBe("game_over");
    expect(s.score).toBe(per * C.ballsPerRun);
    expect(events.some((e) => e.type === "game_over")).toBe(true);
  });
});
