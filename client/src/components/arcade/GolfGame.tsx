import { useCallback, useEffect, useRef, useState } from "react";
import { useGameLoop } from "./useGameLoop";
import {
  FIELD_HEIGHT,
  FIELD_WIDTH,
  clamp,
  createGolfState,
  launchGolf,
  stepGolf,
  type GolfPhase,
  type GolfState,
} from "./golfEngine";
import type { ArcadeGameProps } from "./types";
import { createCelebrationFx } from "./fireworks";

const ACCENT = "#EC6A5E";

interface GolfGameProps extends ArcadeGameProps {
  /**
   * Builds the initial state. Defaults to {@link createGolfState} (the endless
   * "Green Approach" run); "The Round" injects {@link createRoundState} for a
   * single long championship hole. Read once on mount.
   */
  stateFactory?: () => GolfState;
  /** In-game accent (hex) for the flag, HUD and result flash. */
  accent?: string;
}

/** radians the aim swings per ms while a turn key is held */
const AIM_SPEED = 0.0021;
/** meter fill fraction per ms (one full sweep ~ 620ms) */
const METER_SPEED = 0.0016;
/** max angular error (radians) a fully mishit accuracy adds */
const MAX_ACC_ERR = 0.26;

type MeterPhase = "idle" | "power" | "accuracy";

interface MeterState {
  phase: MeterPhase;
  value: number;
  dir: number;
  power: number;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    !!window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function powerColor(v: number): string {
  // green (low) -> amber -> red (high), like a classic power gauge
  if (v < 0.5) return "#7BD86B";
  if (v < 0.8) return "#F2C14E";
  return "#EC6A5E";
}

export default function GolfGame({
  paused,
  onScore,
  onGameOver,
  stateFactory,
  accent = ACCENT,
}: GolfGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<GolfState>(stateFactory ? stateFactory() : createGolfState());
  const accentRef = useRef(accent);
  const dprRef = useRef(1);
  const reducedRef = useRef(false);
  const prevScoreRef = useRef(0);
  const gameOverSentRef = useRef(false);

  // celebration fireworks that fire the moment a putt drops
  const fxRef = useRef(createCelebrationFx());
  const logoRef = useRef<HTMLImageElement | null>(null);
  const sunkFxRef = useRef(false);

  const aimRef = useRef(0);
  const inputRef = useRef({ left: false, right: false });
  const meterRef = useRef<MeterState>({ phase: "idle", value: 0, dir: 1, power: 0 });
  const prevPhaseRef = useRef<GolfPhase>("aim");
  const trailRef = useRef<{ x: number; y: number }[]>([]);

  const [hud, setHud] = useState({
    holeNumber: 1,
    par: stateRef.current.par,
    strokes: 0,
    score: 0,
    phase: "aim" as GolfPhase,
    meterPhase: "idle" as MeterPhase,
    resultLabel: null as string | null,
    resultPoints: 0,
    resultPrecision: 0,
  });

  // aim the ball at the cup to start
  useEffect(() => {
    const s = stateRef.current;
    aimRef.current = Math.atan2(s.hole.y - s.ball.y, s.hole.x - s.ball.x);
  }, []);

  useEffect(() => {
    reducedRef.current = prefersReducedMotion();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    dprRef.current = dpr;
    canvas.width = FIELD_WIDTH * dpr;
    canvas.height = FIELD_HEIGHT * dpr;
  }, []);

  // preload the GreenChainz mark so the win burst can blow up the real logo
  useEffect(() => {
    if (typeof Image === "undefined") return;
    const img = new Image();
    img.onload = () => {
      logoRef.current = img;
    };
    img.src = "/brand/greenchainz-icon.webp";
  }, []);

  const advanceMeter = useCallback(() => {
    const s = stateRef.current;
    if (s.phase !== "aim") return;
    const m = meterRef.current;
    if (m.phase === "idle") {
      m.phase = "power";
      m.value = 0;
      m.dir = 1;
    } else if (m.phase === "power") {
      m.power = clamp(m.value, 0.05, 1);
      m.phase = "accuracy";
      m.value = 0;
      m.dir = 1;
    } else {
      const dev = m.value - 0.5; // 0 = dead center = pure strike
      const angleErr = dev * MAX_ACC_ERR;
      launchGolf(s, aimRef.current + angleErr, m.power);
      trailRef.current = [];
      m.phase = "idle";
      m.value = 0;
      m.power = 0;
    }
  }, []);

  // keyboard: arrows/AD aim, Space drives the swing meter
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowLeft":
        case "a":
        case "A":
          inputRef.current.left = true;
          break;
        case "ArrowRight":
        case "d":
        case "D":
          inputRef.current.right = true;
          break;
        case " ":
        case "Enter":
          advanceMeter();
          e.preventDefault();
          break;
      }
    };
    const onUp = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowLeft":
        case "a":
        case "A":
          inputRef.current.left = false;
          break;
        case "ArrowRight":
        case "d":
        case "D":
          inputRef.current.right = false;
          break;
      }
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, [advanceMeter]);

  const pointToField = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return null;
      return {
        x: ((clientX - rect.left) / rect.width) * FIELD_WIDTH,
        y: ((clientY - rect.top) / rect.height) * FIELD_HEIGHT,
      };
    },
    [],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      const s = stateRef.current;
      // idle + aiming -> click sets the aim direction; otherwise click swings
      if (s.phase === "aim" && meterRef.current.phase === "idle") {
        const p = pointToField(e.clientX, e.clientY);
        if (p) aimRef.current = Math.atan2(p.y - s.ball.y, p.x - s.ball.x);
      } else {
        advanceMeter();
      }
    },
    [advanceMeter, pointToField],
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;
    const s = stateRef.current;
    const m = meterRef.current;
    const dpr = dprRef.current;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // fairway felt
    const grad = ctx.createLinearGradient(0, 0, 0, FIELD_HEIGHT);
    grad.addColorStop(0, "#0e2a17");
    grad.addColorStop(1, "#0a2011");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);
    // mow stripes
    ctx.fillStyle = "rgba(255,255,255,0.018)";
    for (let x = 0; x < FIELD_WIDTH; x += 96) {
      ctx.fillRect(x, 0, 48, FIELD_HEIGHT);
    }

    // bumpers (mini-golf rails)
    for (const w of s.walls) {
      ctx.fillStyle = "#6b4a32";
      ctx.fillRect(w.x, w.y, w.width, w.height);
      ctx.fillStyle = "rgba(255,255,255,0.14)";
      ctx.fillRect(w.x, w.y, w.width, 3);
    }

    // cup + flag
    ctx.save();
    ctx.beginPath();
    ctx.arc(s.hole.x, s.hole.y, s.hole.radius, 0, Math.PI * 2);
    ctx.fillStyle = "#05130c";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
    // pin
    ctx.strokeStyle = "#e9e9e9";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(s.hole.x, s.hole.y);
    ctx.lineTo(s.hole.x, s.hole.y - 42);
    ctx.stroke();
    ctx.fillStyle = accentRef.current;
    ctx.beginPath();
    ctx.moveTo(s.hole.x, s.hole.y - 42);
    ctx.lineTo(s.hole.x + 22, s.hole.y - 35);
    ctx.lineTo(s.hole.x, s.hole.y - 28);
    ctx.closePath();
    ctx.fill();

    // tee marker
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.beginPath();
    ctx.arc(s.tee.x, s.tee.y, 4, 0, Math.PI * 2);
    ctx.fill();

    // green break — chevrons by the cup point downhill so players can read the putt
    const slopeMag = Math.hypot(s.slope.x, s.slope.y);
    if (slopeMag > 1e-6) {
      const ang = Math.atan2(s.slope.y, s.slope.x);
      ctx.save();
      ctx.translate(s.hole.x, s.hole.y);
      ctx.rotate(ang);
      ctx.strokeStyle = "rgba(255,255,255,0.3)";
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        const ox = s.hole.radius + 12 + i * 9;
        ctx.beginPath();
        ctx.moveTo(ox - 5, -5);
        ctx.lineTo(ox, 0);
        ctx.lineTo(ox - 5, 5);
        ctx.stroke();
      }
      ctx.restore();
    }

    // aim guide (dotted) while lining up a shot
    if (s.phase === "aim" && m.phase !== "idle") {
      // during the swing meter keep the committed aim visible
      drawAim(ctx, s.ball.x, s.ball.y, aimRef.current, true, accentRef.current);
    } else if (s.phase === "aim") {
      drawAim(ctx, s.ball.x, s.ball.y, aimRef.current, false, accentRef.current);
    }

    // motion trail
    if (!reducedRef.current) {
      const trail = trailRef.current;
      for (let i = 0; i < trail.length; i++) {
        // eslint-disable-next-line security/detect-object-injection -- bounded loop index
        const t = trail[i];
        const a = (i / trail.length) * 0.35;
        ctx.globalAlpha = a;
        ctx.fillStyle = "#f8fff4";
        ctx.beginPath();
        ctx.arc(t.x, t.y, s.ball.radius * 0.7, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // ball
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = "#f8fff4";
    ctx.beginPath();
    ctx.arc(s.ball.x, s.ball.y, s.ball.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // celebration fireworks (draws its own additive-glow layer, self-contained)
    fxRef.current.draw(ctx, logoRef.current);

    // swing meter
    if (m.phase !== "idle") {
      const barW = 320;
      const barH = 14;
      const bx = (FIELD_WIDTH - barW) / 2;
      const by = FIELD_HEIGHT - 34;
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(bx - 6, by - 20, barW + 12, barH + 30);
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.fillRect(bx, by, barW, barH);

      ctx.font = "600 11px ui-monospace, monospace";
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.textBaseline = "alphabetic";
      if (m.phase === "power") {
        ctx.fillText("POWER — tap to set", bx, by - 6);
        ctx.fillStyle = powerColor(m.value);
        ctx.fillRect(bx, by, barW * m.value, barH);
      } else {
        ctx.fillText("ACCURACY — stop at center", bx, by - 6);
        // committed power (dim)
        ctx.fillStyle = "rgba(255,255,255,0.18)";
        ctx.fillRect(bx, by, barW * m.power, barH);
        // sweet zone
        ctx.fillStyle = "rgba(123,216,107,0.5)";
        ctx.fillRect(bx + barW * 0.46, by, barW * 0.08, barH);
        // marker
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(bx + barW * m.value - 2, by - 3, 4, barH + 6);
      }
    }
  }, []);

  useGameLoop(
    (dt) => {
      const s = stateRef.current;
      const m = meterRef.current;

      // aim while resting and not mid-meter
      if (s.phase === "aim" && m.phase === "idle") {
        let d = 0;
        if (inputRef.current.left) d -= 1;
        if (inputRef.current.right) d += 1;
        if (d !== 0) aimRef.current += d * AIM_SPEED * dt;
      }

      // drive the swing meter
      if (m.phase === "power" || m.phase === "accuracy") {
        m.value += m.dir * METER_SPEED * dt;
        if (m.value >= 1) {
          m.value = 1;
          m.dir = -1;
        } else if (m.value <= 0) {
          m.value = 0;
          m.dir = 1;
        }
      }

      stepGolf(s, dt);

      // re-aim at the cup whenever a fresh lie begins
      if (prevPhaseRef.current !== "aim" && s.phase === "aim") {
        aimRef.current = Math.atan2(s.hole.y - s.ball.y, s.hole.x - s.ball.x);
      }
      prevPhaseRef.current = s.phase;

      // motion trail sampling
      if (s.phase === "rolling" && !reducedRef.current) {
        const trail = trailRef.current;
        trail.push({ x: s.ball.x, y: s.ball.y });
        if (trail.length > 12) trail.shift();
      } else if (s.phase !== "rolling" && trailRef.current.length) {
        trailRef.current = [];
      }

      // fire the win celebration once, on the frame the putt drops
      if (s.phase === "sunk") {
        if (!sunkFxRef.current) {
          sunkFxRef.current = true;
          const points = s.lastResult ? s.lastResult.points : 0;
          fxRef.current.celebrate(s.hole.x, s.hole.y, {
            accent: accentRef.current,
            reduced: reducedRef.current,
            intensity: clamp(points / 1200, 0.35, 1),
          });
        }
      } else {
        sunkFxRef.current = false;
      }
      fxRef.current.update(dt);

      draw();

      if (s.score !== prevScoreRef.current) {
        prevScoreRef.current = s.score;
        onScore?.(s.score);
      }

      const resultLabel = s.phase === "sunk" && s.lastResult ? s.lastResult.label : null;
      const resultPoints = s.phase === "sunk" && s.lastResult ? s.lastResult.points : 0;
      const resultPrecision = s.phase === "sunk" && s.lastResult ? s.lastResult.precision : 0;
      setHud((h) =>
        h.holeNumber === s.holeNumber &&
        h.par === s.par &&
        h.strokes === s.strokes &&
        h.score === s.score &&
        h.phase === s.phase &&
        h.meterPhase === m.phase &&
        h.resultLabel === resultLabel &&
        h.resultPoints === resultPoints &&
        h.resultPrecision === resultPrecision
          ? h
          : {
              holeNumber: s.holeNumber,
              par: s.par,
              strokes: s.strokes,
              score: s.score,
              phase: s.phase,
              meterPhase: m.phase,
              resultLabel,
              resultPoints,
              resultPrecision,
            },
      );

      if (s.phase === "game_over" && !gameOverSentRef.current) {
        gameOverSentRef.current = true;
        onGameOver(s.score);
      }
    },
    !paused,
  );

  const strokeLimit = hud.par + stateRef.current.config.maxOverPar;

  return (
    <div className="relative mx-auto w-full max-w-[720px] select-none">
      <div
        className="mb-2 flex items-center justify-between font-mono text-xs uppercase tracking-widest"
        style={{ color: accent }}
      >
        <span>
          Hole {hud.holeNumber} · Par {hud.par}
        </span>
        <span className={hud.strokes >= strokeLimit ? "text-red-400" : "text-white/80"}>
          Strokes {hud.strokes}/{strokeLimit}
        </span>
        <span>Score {hud.score.toLocaleString()}</span>
      </div>
      <div className="relative overflow-hidden rounded-lg ring-1 ring-[#EC6A5E]/20">
        <canvas
          ref={canvasRef}
          onPointerDown={onPointerDown}
          className="block h-auto w-full touch-none"
          style={{ aspectRatio: `${FIELD_WIDTH} / ${FIELD_HEIGHT}` }}
        />

        {hud.phase === "aim" && hud.meterPhase === "idle" && hud.strokes === 0 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-4 flex flex-col items-center text-center">
            <p className="animate-pulse font-mono text-sm font-semibold uppercase tracking-widest text-white/90">
              ← → aim · Space / click to swing
            </p>
            <p className="mt-1 font-mono text-[11px] text-white/50">
              Bank it off the rails — get on the green.
            </p>
          </div>
        )}

        {hud.phase === "sunk" && hud.resultLabel && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <p
              className="font-mono text-4xl font-black uppercase tracking-tight drop-shadow-lg"
              style={{ color: accent }}
            >
              {hud.resultLabel}
            </p>
            <p className="mt-1 font-mono text-lg font-bold text-white/90">
              +{hud.resultPoints.toLocaleString()}
            </p>
            {hud.resultPrecision > 0 && (
              <p className="mt-0.5 font-mono text-xs font-semibold uppercase tracking-wide text-white/70">
                finesse +{hud.resultPrecision.toLocaleString()}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function drawAim(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  committed: boolean,
  accent: string,
): void {
  const dots = 7;
  const gap = 15;
  ctx.save();
  for (let i = 1; i <= dots; i++) {
    const dx = x + Math.cos(angle) * gap * i;
    const dy = y + Math.sin(angle) * gap * i;
    ctx.globalAlpha = (1 - i / (dots + 1)) * (committed ? 0.9 : 0.55);
    ctx.fillStyle = committed ? "#ffffff" : accent;
    ctx.beginPath();
    ctx.arc(dx, dy, committed ? 2.6 : 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
