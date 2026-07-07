import { describe, expect, it } from "vitest";
import {
  BALL_RADIUS,
  FIELD_HEIGHT,
  FIELD_WIDTH,
  buildHole,
  clamp,
  createGolfState,
  defaultGolfConfig,
  launchGolf,
  nextHole,
  scoreHole,
  stepGolf,
  type GolfState,
} from "./golfEngine";

/** Small deterministic PRNG so hole layouts + physics are reproducible. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Roll the sim forward `ms` in ~16ms frames. */
function advance(state: GolfState, ms: number): void {
  let elapsed = 0;
  while (elapsed < ms) {
    stepGolf(state, 16);
    elapsed += 16;
  }
}

describe("clamp", () => {
  it("bounds values", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
  });
});

describe("createGolfState", () => {
  it("starts on hole 1 at rest on the tee", () => {
    const s = createGolfState(defaultGolfConfig, mulberry32(1));
    expect(s.phase).toBe("aim");
    expect(s.holeNumber).toBe(1);
    expect(s.strokes).toBe(0);
    expect(s.score).toBe(0);
    expect(s.ball.x).toBeCloseTo(s.tee.x);
    expect(s.ball.y).toBeCloseTo(s.tee.y);
    expect(s.ball.vx).toBe(0);
    expect(s.ball.vy).toBe(0);
    expect([3, 4]).toContain(s.par);
  });

  it("keeps the cup inside the field", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const s = createGolfState(defaultGolfConfig, mulberry32(seed));
      expect(s.hole.x).toBeGreaterThan(0);
      expect(s.hole.x).toBeLessThan(FIELD_WIDTH);
      expect(s.hole.y).toBeGreaterThan(0);
      expect(s.hole.y).toBeLessThan(FIELD_HEIGHT);
    }
  });
});

describe("buildHole", () => {
  it("adds more bumpers on later holes and keeps tee/cup clear", () => {
    const early = buildHole(1, mulberry32(7));
    const late = buildHole(6, mulberry32(7));
    expect(early.walls.length).toBe(0);
    expect(late.walls.length).toBeGreaterThan(0);

    // no bumper sits on top of the tee or the cup
    for (const w of late.walls) {
      const teeInside =
        late.tee.x >= w.x &&
        late.tee.x <= w.x + w.width &&
        late.tee.y >= w.y &&
        late.tee.y <= w.y + w.height;
      const cupInside =
        late.hole.x >= w.x &&
        late.hole.x <= w.x + w.width &&
        late.hole.y >= w.y &&
        late.hole.y <= w.y + w.height;
      expect(teeInside).toBe(false);
      expect(cupInside).toBe(false);
    }
  });
});

describe("scoreHole", () => {
  it("rewards fewer strokes and labels the result", () => {
    expect(scoreHole(4, 1, 1).label).toBe("Ace!");
    expect(scoreHole(4, 2, 1).label).toBe("Eagle");
    expect(scoreHole(4, 3, 1).label).toBe("Birdie");
    expect(scoreHole(4, 4, 1).label).toBe("Par");
    expect(scoreHole(4, 5, 1).label).toBe("Bogey");
    expect(scoreHole(4, 6, 1).label).toBe("Double Bogey");

    expect(scoreHole(4, 3, 1).points).toBeGreaterThan(scoreHole(4, 4, 1).points);
    expect(scoreHole(4, 4, 1).points).toBeGreaterThan(scoreHole(4, 5, 1).points);
  });

  it("gives an ace a bonus over a normal same-diff score", () => {
    // par 3, 1 stroke = Ace (diff -2) should beat par 4, 2 strokes (also Eagle diff -2)
    expect(scoreHole(3, 1, 1).points).toBeGreaterThan(scoreHole(4, 2, 1).points);
  });

  it("scales points up on later holes", () => {
    expect(scoreHole(4, 4, 10).points).toBeGreaterThan(scoreHole(4, 4, 1).points);
  });

  it("stays backward-compatible: the legacy 3-arg call earns no finesse bonus", () => {
    const r = scoreHole(4, 4, 1);
    expect(r.precision).toBe(0);
  });

  it("rewards softly draining the cup over rattling it in hot", () => {
    const cap = defaultGolfConfig.captureSpeed;
    const soft = scoreHole(4, 4, 1, 0.01, cap); // barely moving as it drops
    const hard = scoreHole(4, 4, 1, cap, cap); // arrives at the capture ceiling
    expect(soft.precision).toBeGreaterThan(hard.precision);
    expect(soft.points).toBeGreaterThan(hard.points);
    expect(hard.precision).toBe(0);
  });

  it("breaks ties: identical stroke lines diverge by approach finesse", () => {
    const cap = defaultGolfConfig.captureSpeed;
    const a = scoreHole(4, 4, 3, 0.02, cap);
    const b = scoreHole(4, 4, 3, 0.2, cap);
    expect(a.points).not.toBe(b.points);
  });
});

describe("launchGolf", () => {
  it("sends the ball moving and counts a stroke", () => {
    const s = createGolfState(defaultGolfConfig, mulberry32(3));
    launchGolf(s, 0, 1);
    expect(s.phase).toBe("rolling");
    expect(s.strokes).toBe(1);
    expect(Math.hypot(s.ball.vx, s.ball.vy)).toBeGreaterThan(0);
    expect(s.ball.vx).toBeGreaterThan(0);
  });

  it("is ignored unless resting (aim)", () => {
    const s = createGolfState(defaultGolfConfig, mulberry32(3));
    launchGolf(s, 0, 1);
    const strokesAfterFirst = s.strokes;
    launchGolf(s, Math.PI, 1); // ball is rolling; should no-op
    expect(s.strokes).toBe(strokesAfterFirst);
  });
});

describe("stepGolf physics", () => {
  it("does nothing while aiming", () => {
    const s = createGolfState(defaultGolfConfig, mulberry32(5));
    const { x, y } = s.ball;
    stepGolf(s, 16);
    expect(s.ball.x).toBe(x);
    expect(s.ball.y).toBe(y);
    expect(s.phase).toBe("aim");
  });

  it("decelerates and comes to rest, preserving stroke count", () => {
    const s = createGolfState(defaultGolfConfig, mulberry32(9));
    // aim straight up (away from the cup which is to the right) so it won't sink
    launchGolf(s, -Math.PI / 2, 0.5);
    advance(s, 6000);
    expect(["aim", "game_over"]).toContain(s.phase);
    expect(s.ball.vx).toBe(0);
    expect(s.ball.vy).toBe(0);
    expect(s.strokes).toBeGreaterThanOrEqual(1);
  });

  it("keeps the ball inside the field even on a hard bounce", () => {
    const s = createGolfState(defaultGolfConfig, mulberry32(11));
    launchGolf(s, 0.3, 1); // full power into the field
    for (let i = 0; i < 400; i++) {
      stepGolf(s, 16);
      expect(s.ball.x).toBeGreaterThanOrEqual(0);
      expect(s.ball.x).toBeLessThanOrEqual(FIELD_WIDTH);
      expect(s.ball.y).toBeGreaterThanOrEqual(0);
      expect(s.ball.y).toBeLessThanOrEqual(FIELD_HEIGHT);
    }
  });

  it("bounces off a border wall", () => {
    const s = createGolfState(defaultGolfConfig, mulberry32(13));
    // park the ball near the right wall moving right
    s.ball.x = FIELD_WIDTH - BALL_RADIUS - 1;
    s.ball.y = FIELD_HEIGHT / 2;
    s.ball.vx = 0.5;
    s.ball.vy = 0;
    s.strokes = 1;
    s.phase = "rolling";
    stepGolf(s, 16);
    expect(s.ball.vx).toBeLessThanOrEqual(0);
  });
});

describe("sinking a hole", () => {
  it("drops a slow ball at the cup, scores, then loads the next hole", () => {
    const s = createGolfState(defaultGolfConfig, mulberry32(2));
    // place the ball on the lip of the cup, crawling toward center
    s.ball.x = s.hole.x - 2;
    s.ball.y = s.hole.y;
    s.ball.vx = 0.05;
    s.ball.vy = 0;
    s.strokes = 2;
    s.phase = "rolling";

    stepGolf(s, 16);
    expect(s.phase).toBe("sunk");
    expect(s.score).toBeGreaterThan(0);
    expect(s.lastResult).not.toBeNull();
    expect(s.events.some((e) => e.type === "sunk")).toBe(true);

    // after the reveal timer, hole 2 loads fresh
    advance(s, 1500);
    expect(s.holeNumber).toBe(2);
    expect(s.phase).toBe("aim");
    expect(s.strokes).toBe(0);
  });

  it("does not drop a fast ball rolling over the cup", () => {
    const s = createGolfState(defaultGolfConfig, mulberry32(4));
    s.ball.x = s.hole.x;
    s.ball.y = s.hole.y;
    s.ball.vx = 0.9; // way over capture speed
    s.ball.vy = 0;
    s.strokes = 1;
    s.phase = "rolling";
    stepGolf(s, 16);
    expect(s.phase).toBe("rolling");
  });
});

describe("game over on stroke limit", () => {
  it("ends the run when the ball rests past par + maxOverPar", () => {
    const s = createGolfState({ ...defaultGolfConfig, maxOverPar: 0 }, mulberry32(6));
    s.par = 1; // limit = par + maxOverPar = 1, so the first rested shot ends it
    // one shot straight up (away from the cup) so it won't sink
    launchGolf(s, -Math.PI / 2, 0.4);

    // step until the ball rests, capturing the game_over event on that frame
    let sawGameOver = false;
    for (let i = 0; i < 400 && s.phase === "rolling"; i++) {
      stepGolf(s, 16);
      if (s.events.some((e) => e.type === "game_over")) sawGameOver = true;
    }
    expect(s.phase).toBe("game_over");
    expect(sawGameOver).toBe(true);
  });
});

describe("nextHole", () => {
  it("advances difficulty and resets the lie", () => {
    const s = createGolfState(defaultGolfConfig, mulberry32(8));
    const before = s.holeNumber;
    nextHole(s);
    expect(s.holeNumber).toBe(before + 1);
    expect(s.phase).toBe("aim");
    expect(s.strokes).toBe(0);
    expect(s.ball.x).toBeCloseTo(s.tee.x);
    expect(s.ball.y).toBeCloseTo(s.tee.y);
  });
});
