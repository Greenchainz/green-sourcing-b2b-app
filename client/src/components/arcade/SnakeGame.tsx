import { useCallback, useEffect, useRef, useState } from "react";
import { useGameLoop } from "./useGameLoop";
import {
  createSnakeState,
  defaultSnakeConfig,
  setDirection,
  startSnake,
  stepSnake,
  type SnakeState,
} from "./snakeEngine";
import type { ArcadeGameProps } from "./types";

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    !!window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

const CELL = 30;
const COLS = defaultSnakeConfig.cols;
const ROWS = defaultSnakeConfig.rows;
const W = COLS * CELL;
const H = ROWS * CELL;

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

export default function SnakeGame({ paused, onScore, onGameOver }: ArcadeGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<SnakeState>(createSnakeState());
  const accRef = useRef(0);
  const dprRef = useRef(1);
  const reducedRef = useRef(false);
  const pulseRef = useRef(0);
  const prevScoreRef = useRef(0);
  const gameOverSentRef = useRef(false);
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);

  const [hud, setHud] = useState({
    score: 0,
    length: defaultSnakeConfig.startLength,
    phase: "ready" as SnakeState["phase"],
  });

  useEffect(() => {
    reducedRef.current = prefersReducedMotion();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    dprRef.current = dpr;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = stateRef.current;
      let handled = true;
      switch (e.key) {
        case "ArrowUp":
        case "w":
        case "W":
          setDirection(s, { x: 0, y: -1 });
          break;
        case "ArrowDown":
        case "s":
        case "S":
          setDirection(s, { x: 0, y: 1 });
          break;
        case "ArrowLeft":
        case "a":
        case "A":
          setDirection(s, { x: -1, y: 0 });
          break;
        case "ArrowRight":
        case "d":
        case "D":
          setDirection(s, { x: 1, y: 0 });
          break;
        default:
          handled = false;
      }
      if (handled) {
        if (s.phase === "ready") startSnake(s);
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    swipeStartRef.current = { x: e.clientX, y: e.clientY };
    const s = stateRef.current;
    if (s.phase === "ready") startSnake(s);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const start = swipeStartRef.current;
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    const threshold = 24;
    if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;
    if (Math.abs(dx) > Math.abs(dy)) {
      setDirection(stateRef.current, { x: dx > 0 ? 1 : -1, y: 0 });
    } else {
      setDirection(stateRef.current, { x: 0, y: dy > 0 ? 1 : -1 });
    }
    swipeStartRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const onPointerUp = useCallback(() => {
    swipeStartRef.current = null;
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;
    const s = stateRef.current;
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);

    // background + grid
    ctx.fillStyle = "#0a0f1a";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(159,232,112,0.05)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= COLS; x++) {
      ctx.beginPath();
      ctx.moveTo(x * CELL, 0);
      ctx.lineTo(x * CELL, H);
      ctx.stroke();
    }
    for (let y = 0; y <= ROWS; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * CELL);
      ctx.lineTo(W, y * CELL);
      ctx.stroke();
    }

    // food (an inbound order)
    const pulse = reducedRef.current ? 0 : Math.max(0, pulseRef.current);
    ctx.save();
    ctx.shadowColor = "#FFC24B";
    ctx.shadowBlur = 16 + pulse * 20;
    ctx.fillStyle = "#FFC24B";
    ctx.beginPath();
    ctx.arc(
      s.food.x * CELL + CELL / 2,
      s.food.y * CELL + CELL / 2,
      CELL * 0.32 + pulse * 6,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.restore();

    // snake — a growing green chain, head brightest
    const n = s.snake.length;
    for (let i = n - 1; i >= 0; i--) {
      // eslint-disable-next-line security/detect-object-injection -- bounded loop index
      const c = s.snake[i];
      const t = n <= 1 ? 1 : 1 - i / (n - 1); // 1 at head -> 0 at tail
      const head = i === 0;
      ctx.save();
      ctx.shadowColor = "#9FE870";
      ctx.shadowBlur = head ? 18 : 8;
      const g = Math.round(198 + t * 40);
      ctx.fillStyle = head ? "#CFF9B0" : `rgb(${Math.round(50 + t * 90)}, ${g}, ${Math.round(150 - t * 40)})`;
      const pad = head ? 2 : 3;
      roundRect(ctx, c.x * CELL + pad, c.y * CELL + pad, CELL - pad * 2, CELL - pad * 2, 8);
      ctx.fill();
      ctx.restore();
    }
  }, []);

  useGameLoop(
    (dt) => {
      const s = stateRef.current;
      if (pulseRef.current > 0) pulseRef.current = Math.max(0, pulseRef.current - dt * 0.006);

      if (s.phase === "playing") {
        accRef.current += dt;
        let guard = 0;
        while (accRef.current >= s.tickMs && guard < 4) {
          accRef.current -= s.tickMs;
          guard++;
          stepSnake(s);
          for (const ev of s.events) {
            if (ev.type === "eat") pulseRef.current = 1;
          }
          if (s.phase !== "playing") break;
        }
      }

      draw();

      if (s.score !== prevScoreRef.current) {
        prevScoreRef.current = s.score;
        onScore?.(s.score);
      }
      setHud((h) =>
        h.score === s.score && h.length === s.snake.length && h.phase === s.phase
          ? h
          : { score: s.score, length: s.snake.length, phase: s.phase },
      );

      if (s.phase === "game_over" && !gameOverSentRef.current) {
        gameOverSentRef.current = true;
        onGameOver(s.score);
      }
    },
    !paused,
  );

  return (
    <div className="relative mx-auto w-full max-w-[720px] select-none">
      <div className="mb-2 flex items-center justify-between font-mono text-xs uppercase tracking-widest text-[#9FE870]/80">
        <span>Score {hud.score.toLocaleString()}</span>
        <span>Chain {hud.length}</span>
      </div>
      <div className="relative overflow-hidden rounded-lg ring-1 ring-[#9FE870]/20">
        <canvas
          ref={canvasRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          className="block h-auto w-full touch-none"
          style={{ aspectRatio: `${W} / ${H}` }}
        />
        {hud.phase === "ready" && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <p className="animate-pulse font-mono text-sm font-semibold uppercase tracking-widest text-white/90">
              Press an arrow / swipe to start
            </p>
            <p className="mt-1 font-mono text-[11px] text-white/50">
              Link orders to grow your green chain
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
