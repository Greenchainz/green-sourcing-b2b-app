import { useCallback, useEffect, useRef, useState } from "react";
import { useGameLoop } from "./useGameLoop";
import {
  FIELD_HEIGHT,
  FIELD_WIDTH,
  createInitialState,
  defaultConfig,
  step,
  type Brick,
  type GameState,
  type InputState,
} from "./breakoutEngine";
import type { ArcadeGameProps } from "./types";

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    !!window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
}

function spawnParticles(list: Particle[], brick: Brick): void {
  const cx = brick.x + brick.width / 2;
  const cy = brick.y + brick.height / 2;
  for (let i = 0; i < 8; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 0.05 + Math.random() * 0.13;
    list.push({
      x: cx,
      y: cy,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      life: 0,
      maxLife: 240 + Math.random() * 220,
      color: brick.color,
    });
  }
  if (list.length > 300) list.splice(0, list.length - 300);
}

function updateParticles(list: Particle[], dt: number): void {
  for (let i = list.length - 1; i >= 0; i--) {
    // eslint-disable-next-line security/detect-object-injection -- bounded loop index
    const p = list[i];
    p.life += dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 0.0004 * dt;
    if (p.life >= p.maxLife) list.splice(i, 1);
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export default function BreakoutGame({ paused, onScore, onGameOver }: ArcadeGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<GameState>(createInitialState());
  const inputRef = useRef<InputState>({
    left: false,
    right: false,
    pointerX: null,
    launch: false,
  });
  const particlesRef = useRef<Particle[]>([]);
  const shakeRef = useRef(0);
  const dprRef = useRef(1);
  const reducedRef = useRef(false);
  const prevScoreRef = useRef(0);
  const gameOverSentRef = useRef(false);

  const [hud, setHud] = useState({
    score: 0,
    lives: defaultConfig.lives,
    level: 1,
    combo: 0,
    phase: "ready" as GameState["phase"],
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

  // keyboard
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
        case "ArrowUp":
        case "Enter":
          inputRef.current.launch = true;
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
        case " ":
        case "ArrowUp":
        case "Enter":
          inputRef.current.launch = false;
          break;
      }
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, []);

  const toFieldX = useCallback((clientX: number): number | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0) return null;
    const rel = (clientX - rect.left) / rect.width;
    return Math.max(0, Math.min(FIELD_WIDTH, rel * FIELD_WIDTH));
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      inputRef.current.pointerX = toFieldX(e.clientX);
    },
    [toFieldX],
  );
  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      inputRef.current.pointerX = toFieldX(e.clientX);
      inputRef.current.launch = true;
    },
    [toFieldX],
  );
  const onPointerUp = useCallback(() => {
    inputRef.current.launch = false;
  }, []);
  const onPointerLeave = useCallback(() => {
    inputRef.current.pointerX = null;
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;
    const state = stateRef.current;
    const dpr = dprRef.current;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (shakeRef.current > 0.1) {
      ctx.translate(
        (Math.random() - 0.5) * shakeRef.current,
        (Math.random() - 0.5) * shakeRef.current,
      );
    }

    // background
    ctx.fillStyle = "#0a0f1a";
    ctx.fillRect(-20, -20, FIELD_WIDTH + 40, FIELD_HEIGHT + 40);
    ctx.strokeStyle = "rgba(159,232,112,0.06)";
    ctx.lineWidth = 1;
    for (let gx = 0; gx <= FIELD_WIDTH; gx += 40) {
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, FIELD_HEIGHT);
      ctx.stroke();
    }

    // bricks
    for (const b of state.bricks) {
      if (!b.alive) continue;
      ctx.save();
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 12;
      ctx.fillStyle = b.color;
      roundRect(ctx, b.x, b.y, b.width, b.height, 5);
      ctx.fill();
      if (b.maxHits > 1 && b.hits > 1) {
        ctx.shadowBlur = 0;
        ctx.fillStyle = "rgba(255,255,255,0.18)";
        roundRect(ctx, b.x + 3, b.y + 3, b.width - 6, b.height - 6, 3);
        ctx.fill();
      }
      ctx.restore();
    }

    // particles
    for (const p of particlesRef.current) {
      const alpha = Math.max(0, 1 - p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
    }
    ctx.globalAlpha = 1;

    // paddle
    const p = state.paddle;
    ctx.save();
    ctx.shadowColor = "#9FE870";
    ctx.shadowBlur = 16;
    ctx.fillStyle = "#9FE870";
    roundRect(ctx, p.x - p.width / 2, p.y, p.width, p.height, 8);
    ctx.fill();
    ctx.restore();

    // ball
    const ball = state.ball;
    ctx.save();
    ctx.shadowColor = "#ffffff";
    ctx.shadowBlur = 14;
    ctx.fillStyle = "#f4fff0";
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }, []);

  useGameLoop(
    (dt) => {
      const state = stateRef.current;
      const wasReady = state.phase === "ready";
      step(state, dt, inputRef.current, defaultConfig);
      if (wasReady && state.phase === "playing") inputRef.current.launch = false;

      for (const ev of state.events) {
        if (ev.type === "brick" && ev.destroyed && !reducedRef.current) {
          spawnParticles(particlesRef.current, ev.brick);
        } else if (ev.type === "life_lost" && !reducedRef.current) {
          shakeRef.current = 14;
        }
      }

      updateParticles(particlesRef.current, dt);
      if (shakeRef.current > 0) shakeRef.current = Math.max(0, shakeRef.current - dt * 0.05);

      draw();

      if (state.score !== prevScoreRef.current) {
        prevScoreRef.current = state.score;
        onScore?.(state.score);
      }
      setHud((h) =>
        h.score === state.score &&
        h.lives === state.lives &&
        h.level === state.level &&
        h.combo === state.combo &&
        h.phase === state.phase
          ? h
          : {
              score: state.score,
              lives: state.lives,
              level: state.level,
              combo: state.combo,
              phase: state.phase,
            },
      );

      if (state.phase === "game_over" && !gameOverSentRef.current) {
        gameOverSentRef.current = true;
        onGameOver(state.score);
      }
    },
    !paused,
  );

  return (
    <div className="relative mx-auto w-full max-w-[720px] select-none">
      <div className="mb-2 flex items-center justify-between font-mono text-xs uppercase tracking-widest text-[#9FE870]/80">
        <span>Score {hud.score.toLocaleString()}</span>
        <span>Lvl {hud.level}</span>
        <span>
          {"♥".repeat(Math.max(0, hud.lives))}
          <span className="text-white/15">{"♥".repeat(Math.max(0, defaultConfig.lives - hud.lives))}</span>
        </span>
      </div>
      <div className="relative overflow-hidden rounded-lg ring-1 ring-[#9FE870]/20">
        <canvas
          ref={canvasRef}
          onPointerMove={onPointerMove}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerLeave}
          className="block h-auto w-full touch-none"
          style={{ aspectRatio: `${FIELD_WIDTH} / ${FIELD_HEIGHT}` }}
        />
        {hud.combo >= 3 && hud.phase === "playing" && (
          <div className="pointer-events-none absolute right-3 top-3 rounded-md bg-black/40 px-2 py-1 font-mono text-sm font-bold text-[#9FE870]">
            {hud.combo}× combo
          </div>
        )}
        {hud.phase === "ready" && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-end pb-16 text-center">
            <p className="animate-pulse font-mono text-sm font-semibold uppercase tracking-widest text-white/90">
              Press Space / Click to launch
            </p>
            <p className="mt-1 font-mono text-[11px] text-white/50">
              Move: ← → / A D / mouse
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
