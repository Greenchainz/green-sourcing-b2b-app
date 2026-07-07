import { useCallback, useEffect, useRef, useState } from "react";
import { useGameLoop } from "./useGameLoop";
import {
  FIELD_HEIGHT,
  FIELD_WIDTH,
  VIEW_YARDS,
  clamp,
  createDriveState,
  currentBall,
  stepDrive,
  swingTap,
  type DrivePhase,
  type DriveShot,
  type DriveState,
} from "./driveEngine";
import type { ArcadeGameProps } from "./types";

const ACCENT = "#FFCC33";

// --- down-the-range layout (screen space) ---
const TEE_Y = FIELD_HEIGHT - 46;
const RANGE_TOP_Y = 54;
const CENTER_X = (FIELD_WIDTH - 72) / 2; // leave a gutter on the right for the meter
const NEAR_HALF = 150; // fairway half-width at the tee (px)
const FAR_HALF = 52; // fairway half-width at the far end (px, perspective)

// --- vertical swing meter layout ---
const METER_X = FIELD_WIDTH - 44;
const METER_W = 26;
const METER_TOP = 64;
const METER_BOTTOM = FIELD_HEIGHT - 64;
const METER_H = METER_BOTTOM - METER_TOP;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    !!window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** yards down-range -> screen Y (tee at the bottom, range receding upward) */
function yardsToY(yards: number): number {
  const t = clamp(yards / VIEW_YARDS, 0, 1);
  return TEE_Y - t * (TEE_Y - RANGE_TOP_Y);
}

/** fairway half-width (px) at a given distance, narrowing with perspective */
function corridorHalf(yards: number): number {
  const t = clamp(yards / VIEW_YARDS, 0, 1);
  return NEAR_HALF + (FAR_HALF - NEAR_HALF) * t;
}

function powerColor(v: number): string {
  if (v < 0.5) return "#7BD86B";
  if (v < 0.8) return ACCENT;
  return "#EC6A5E";
}

export default function DriveGame({ paused, onScore, onGameOver }: ArcadeGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<DriveState>(createDriveState());
  const dprRef = useRef(1);
  const reducedRef = useRef(false);
  const prevScoreRef = useRef(0);
  const gameOverSentRef = useRef(false);
  const lastShotRef = useRef<DriveShot | null>(null);

  const [hud, setHud] = useState({
    ball: 1,
    balls: stateRef.current.config.ballsPerRun,
    score: 0,
    longest: 0,
    phase: "ready" as DrivePhase,
    lastCarry: 0,
    reveal: null as { label: string; points: number; carry: number; ob: boolean } | null,
  });

  useEffect(() => {
    reducedRef.current = prefersReducedMotion();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    dprRef.current = dpr;
    canvas.width = FIELD_WIDTH * dpr;
    canvas.height = FIELD_HEIGHT * dpr;
  }, []);

  // one tap drives the whole tempo swing (start -> lock power -> strike)
  const swing = useCallback(() => {
    swingTap(stateRef.current);
  }, []);

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") {
        swing();
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", onDown);
    return () => window.removeEventListener("keydown", onDown);
  }, [swing]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      swing();
    },
    [swing],
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;
    const s = stateRef.current;
    const dpr = dprRef.current;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // sky -> turf backdrop
    const sky = ctx.createLinearGradient(0, 0, 0, FIELD_HEIGHT);
    sky.addColorStop(0, "#0b1f3a");
    sky.addColorStop(0.42, "#123a24");
    sky.addColorStop(1, "#0a2011");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);

    // out-of-bounds rough (everything outside the corridor reads darker)
    ctx.fillStyle = "rgba(0,0,0,0.16)";
    ctx.fillRect(0, RANGE_TOP_Y, FIELD_WIDTH, TEE_Y - RANGE_TOP_Y);

    // fairway corridor (perspective trapezoid)
    ctx.beginPath();
    ctx.moveTo(CENTER_X - NEAR_HALF, TEE_Y);
    ctx.lineTo(CENTER_X - FAR_HALF, RANGE_TOP_Y);
    ctx.lineTo(CENTER_X + FAR_HALF, RANGE_TOP_Y);
    ctx.lineTo(CENTER_X + NEAR_HALF, TEE_Y);
    ctx.closePath();
    const fair = ctx.createLinearGradient(0, RANGE_TOP_Y, 0, TEE_Y);
    fair.addColorStop(0, "#155e32");
    fair.addColorStop(1, "#1c7a41");
    ctx.fillStyle = fair;
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.10)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // yardage markers
    ctx.textAlign = "center";
    ctx.font = "600 11px ui-monospace, monospace";
    for (const yd of [100, 200, 300]) {
      const y = yardsToY(yd);
      const half = corridorHalf(yd);
      ctx.strokeStyle = "rgba(255,255,255,0.16)";
      ctx.setLineDash([6, 8]);
      ctx.beginPath();
      ctx.moveTo(CENTER_X - half, y);
      ctx.lineTo(CENTER_X + half, y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.fillText(`${yd}`, CENTER_X + half + 16, y + 4);
    }

    // tee marker
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.beginPath();
    ctx.arc(CENTER_X, TEE_Y, 3, 0, Math.PI * 2);
    ctx.fill();

    // ball: in flight, resting, or teed up
    const shot = s.shot;
    if (s.phase === "flying" && shot) {
      const progress = clamp(s.flightMs / s.config.flightMs, 0, 1);
      const dist = shot.carry * progress;
      const latNow = shot.lateral * progress;
      const y = yardsToY(dist);
      const x = CENTER_X + (latNow / s.config.fairwayHalf) * corridorHalf(dist);
      const arc = Math.sin(progress * Math.PI) * (26 + 46 * shot.power);
      // shadow on the turf
      ctx.fillStyle = "rgba(0,0,0,0.30)";
      ctx.beginPath();
      ctx.ellipse(x, y, 5, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
      // ball lofted above its shadow
      drawBall(ctx, x, y - arc);
    } else if ((s.phase === "landed" || s.phase === "game_over") && shot) {
      const y = yardsToY(shot.carry);
      const x = CENTER_X + (shot.lateral / s.config.fairwayHalf) * corridorHalf(shot.carry);
      ctx.fillStyle = "rgba(0,0,0,0.30)";
      ctx.beginPath();
      ctx.ellipse(x, y, 5, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
      drawBall(ctx, x, y);
      // divot line from tee to landing for a sense of shape
      ctx.strokeStyle = shot.ob ? "rgba(236,106,94,0.5)" : "rgba(255,204,51,0.35)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 6]);
      ctx.beginPath();
      ctx.moveTo(CENTER_X, TEE_Y);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      drawBall(ctx, CENTER_X, TEE_Y - 4);
    }

    drawMeter(ctx, s);
  }, []);

  useGameLoop(
    (dt) => {
      const s = stateRef.current;
      const prevPhase = s.phase;
      stepDrive(s, dt);

      // capture the shot the moment it lands, for the HUD "last carry"
      if (prevPhase === "flying" && s.phase === "landed" && s.shot) {
        lastShotRef.current = s.shot;
      }

      draw();

      if (s.score !== prevScoreRef.current) {
        prevScoreRef.current = s.score;
        onScore?.(s.score);
      }

      const revealShot = s.phase === "landed" ? s.shot : null;
      const reveal = revealShot
        ? {
            label: revealShot.label,
            points: revealShot.points,
            carry: Math.round(revealShot.carry),
            ob: revealShot.ob,
          }
        : null;
      const lastCarry = lastShotRef.current ? Math.round(lastShotRef.current.carry) : 0;

      setHud((h) =>
        h.ball === currentBall(s) &&
        h.score === s.score &&
        h.longest === s.longest &&
        h.phase === s.phase &&
        h.lastCarry === lastCarry &&
        h.reveal?.label === (reveal?.label ?? null) &&
        h.reveal?.points === (reveal?.points ?? null)
          ? h
          : {
              ball: currentBall(s),
              balls: s.config.ballsPerRun,
              score: s.score,
              longest: s.longest,
              phase: s.phase,
              lastCarry,
              reveal,
            },
      );

      if (s.phase === "game_over" && !gameOverSentRef.current) {
        gameOverSentRef.current = true;
        onGameOver(s.score);
      }
    },
    !paused,
  );

  const swingHint =
    hud.phase === "backswing"
      ? "TAP AT THE TOP — set power"
      : hud.phase === "downswing"
        ? "TAP AT THE BOTTOM — strike"
        : null;

  return (
    <div className="relative mx-auto w-full max-w-[720px] select-none">
      <div className="mb-2 flex items-center justify-between font-mono text-xs uppercase tracking-widest text-[#FFCC33]/85">
        <span>
          Ball {Math.min(hud.ball, hud.balls)}/{hud.balls}
        </span>
        <span className="text-white/80">
          Last {hud.lastCarry ? `${hud.lastCarry} yds` : "—"}
        </span>
        <span>
          Longest <span className="text-[#FFCC33]">{hud.longest || "—"}</span>
        </span>
        <span>Score {hud.score.toLocaleString()}</span>
      </div>
      <div className="relative overflow-hidden rounded-lg ring-1 ring-[#FFCC33]/25">
        <canvas
          ref={canvasRef}
          onPointerDown={onPointerDown}
          className="block h-auto w-full touch-none"
          style={{ aspectRatio: `${FIELD_WIDTH} / ${FIELD_HEIGHT}` }}
        />

        {hud.phase === "ready" && (
          <div className="pointer-events-none absolute inset-x-0 bottom-5 flex flex-col items-center text-center">
            <p className="animate-pulse font-mono text-sm font-semibold uppercase tracking-widest text-white/90">
              Tap / Space to swing
            </p>
            <p className="mt-1 font-mono text-[11px] text-white/50">
              Tap at the top for power, tap at the bottom to strike. Bomb it.
            </p>
          </div>
        )}

        {swingHint && (
          <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center text-center">
            <p className="animate-pulse font-mono text-xs font-semibold uppercase tracking-widest text-[#FFCC33]">
              {swingHint}
            </p>
          </div>
        )}

        {hud.reveal && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <p
              className="font-mono text-4xl font-black uppercase tracking-tight drop-shadow-lg"
              style={{ color: hud.reveal.ob ? "#EC6A5E" : ACCENT }}
            >
              {hud.reveal.label}
            </p>
            <p className="mt-1 font-mono text-lg font-bold text-white/90">
              {hud.reveal.carry} yds · +{hud.reveal.points.toLocaleString()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function drawBall(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = "#f8fff4";
  ctx.beginPath();
  ctx.arc(x, y, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Vertical tempo meter: backswing rises, power caps, impact strikes at the bottom. */
function drawMeter(ctx: CanvasRenderingContext2D, s: DriveState): void {
  const active =
    s.phase === "backswing" || s.phase === "downswing";
  // track
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(METER_X - 5, METER_TOP - 8, METER_W + 10, METER_H + 16);
  ctx.fillStyle = "rgba(255,255,255,0.10)";
  ctx.fillRect(METER_X, METER_TOP, METER_W, METER_H);

  // sweet zone (impact) band at the very bottom = dead-center strike
  const zoneH = METER_H * 0.06;
  ctx.fillStyle = "rgba(123,216,107,0.55)";
  ctx.fillRect(METER_X, METER_BOTTOM - zoneH, METER_W, zoneH);

  if (!active) return;

  const markerY = METER_BOTTOM - clamp(s.meter, 0, 1) * METER_H;

  if (s.phase === "backswing") {
    // fill from the bottom up to the marker, colored by committed power/risk
    ctx.fillStyle = powerColor(s.meter);
    ctx.fillRect(METER_X, markerY, METER_W, METER_BOTTOM - markerY);
  } else {
    // downswing: show the locked power as a dim cap, marker falls to the zone
    const powerY = METER_BOTTOM - clamp(s.power, 0, 1) * METER_H;
    ctx.fillStyle = "rgba(255,255,255,0.16)";
    ctx.fillRect(METER_X, powerY, METER_W, METER_BOTTOM - powerY);
  }

  // marker line
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(METER_X - 4, markerY - 2, METER_W + 8, 4);
}
