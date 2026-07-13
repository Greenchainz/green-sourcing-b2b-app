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
/** tee-shot loft: screen px of height per unit power + a live carry read.
 *  Pure flourish layered over the roll — no physics/scoring change. */
const YDS_PER_PX = 0.46;

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

  // Tee-shot "sail": a time-based loft + live carry count-up layered over the
  // existing roll so a big drive visibly hangs and climbs (drum-roll tension)
  // instead of skidding flat. Purely visual — the sim and scoring are untouched.
  const driveRef = useRef({
    active: false,
    t: 0,
    airMs: 0,
    maxH: 0,
    tx: 0,
    ty: 0,
    carry: 0,
    hold: 0,
  });

  // floating "+points" pops for ring hits, muck penalties & bumper banks
  const popsRef = useRef<
    Array<{ x: number; y: number; text: string; color: string; life: number; max: number }>
  >([]);

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
      const isTeeShot = s.strokes === 0;
      const power = m.power;
      launchGolf(s, aimRef.current + angleErr, m.power);
      trailRef.current = [];
      if (isTeeShot) {
        // Only the tee shot sails. Bigger swings hang longer and fly higher, so
        // the bomb looks like a bomb; a stock swing just gets a gentle hop.
        const d = driveRef.current;
        d.active = true;
        d.t = 0;
        d.airMs = 640 + power * 720;
        d.maxH = 24 + power * 108;
        d.tx = s.ball.x;
        d.ty = s.ball.y;
        d.carry = 0;
        d.hold = 0;
      }
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
    // Fill the viewport first so cinematic pans never reveal empty canvas.
    ctx.fillStyle = "#07140d";
    ctx.fillRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);

    const drive = driveRef.current;
    const flightK = drive.airMs > 0 ? clamp(drive.t / drive.airMs, 0, 1) : 0;
    const loft = drive.active ? Math.sin(flightK * Math.PI) * drive.maxH : 0;
    const cinematic = drive.active && !reducedRef.current;
    ctx.save();
    if (cinematic) {
      // Nintendo-style suspense beat: follow the tee shot with a quick zoom/pan.
      const zoom = 1.08 + Math.sin(flightK * Math.PI) * 0.42;
      const lookAhead = 48 + drive.maxH * 0.18;
      const camX = clamp(
        s.ball.x + Math.cos(aimRef.current) * lookAhead,
        FIELD_WIDTH * 0.2,
        FIELD_WIDTH * 0.8,
      );
      const camY = clamp(
        s.ball.y - loft * 0.38,
        FIELD_HEIGHT * 0.18,
        FIELD_HEIGHT * 0.82,
      );
      ctx.translate(FIELD_WIDTH * 0.5, FIELD_HEIGHT * 0.62);
      ctx.scale(zoom, zoom);
      ctx.translate(-camX, -camY);
    }

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

    // pinball scoring rings (green wins) + dirty-energy zones (avoid the muck!)
    const nowMs = performance.now();
    for (const t of s.targets) {
    // FAIRWAY + BULLS-EYE are the drive landing zone — rendered as a gold bullseye.
    const nowMs = performance.now();
    // Collect the drive landing zone targets for the bullseye composite render.
    const fairwayT = s.targets.find((t) => t.label === "FAIRWAY");
    const bullseyeT = s.targets.find((t) => t.label === "BULLS-EYE");
    if (fairwayT && !fairwayT.hit && bullseyeT && !bullseyeT.hit) {
      // Landing zone: draw BEFORE the ball loop so rings sit under the ball.
      // Outer dashed ring.
      const lPulse = 0.6 + 0.4 * Math.sin(nowMs / 400 + fairwayT.x * 0.05);
      ctx.save();
      ctx.textAlign = "center";
      ctx.setLineDash([8, 5]);
      ctx.strokeStyle = `rgba(255,204,51,${0.45 + lPulse * 0.35})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(fairwayT.x, fairwayT.y, fairwayT.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = `rgba(255,204,51,${0.06 + lPulse * 0.05})`;
      ctx.fill();
      // Inner bulls-eye ring.
      ctx.shadowColor = "#FFCC33";
      ctx.shadowBlur = 8 + lPulse * 8;
      ctx.strokeStyle = `rgba(255,220,100,${0.7 + lPulse * 0.25})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(bullseyeT.x, bullseyeT.y, bullseyeT.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      // Crosshair lines through the center.
      ctx.strokeStyle = `rgba(255,204,51,${0.3 + lPulse * 0.2})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(bullseyeT.x - bullseyeT.radius, bullseyeT.y);
      ctx.lineTo(bullseyeT.x + bullseyeT.radius, bullseyeT.y);
      ctx.moveTo(bullseyeT.x, bullseyeT.y - bullseyeT.radius);
      ctx.lineTo(bullseyeT.x, bullseyeT.y + bullseyeT.radius);
      ctx.stroke();
      // "DRIVE HERE" label — only show before the tee shot.
      if (s.strokes === 0) {
        ctx.fillStyle = `rgba(255,220,100,${0.7 + lPulse * 0.25})`;
        ctx.font = "700 10px ui-monospace, monospace";
        ctx.fillText("DRIVE HERE", fairwayT.x, fairwayT.y - fairwayT.radius - 7);
        ctx.fillStyle = `rgba(255,220,100,0.55)`;
        ctx.font = "600 9px ui-monospace, monospace";
        ctx.fillText("+350", fairwayT.x, fairwayT.y - fairwayT.radius - 18);
      }
      ctx.restore();
    } else if (fairwayT?.hit && bullseyeT?.hit) {
      // Both hit — ghost bullseye with a soft star glow.
      ctx.save();
      ctx.globalAlpha = 0.18;
      ctx.strokeStyle = "#FFCC33";
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 5]);
      ctx.beginPath();
      ctx.arc(fairwayT.x, fairwayT.y, fairwayT.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
    for (const t of s.targets) {
      // Drive landing zone targets have their own render pass above.
      if (t.label === "FAIRWAY" || t.label === "BULLS-EYE") continue;
      const good = t.kind === "good";
      if (t.hit) {
        // spent: faint ghost so the course still reads after you tag it
        ctx.save();
        ctx.globalAlpha = 0.12;
        ctx.strokeStyle = good ? "#8affc0" : "#ff8f8f";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        continue;
      }
      const pulse = 0.55 + 0.45 * Math.sin(nowMs / 320 + t.x * 0.05);
      ctx.save();
      ctx.textAlign = "center";
      if (good) {
        ctx.shadowColor = "#39d98a";
        ctx.shadowBlur = 12 + pulse * 10;
        ctx.strokeStyle = `rgba(120,255,180,${0.5 + pulse * 0.4})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "rgba(140,255,190,0.10)";
        ctx.fill();
        ctx.fillStyle = "#eafff0";
        ctx.font = "800 15px ui-monospace, monospace";
        ctx.fillText(`+${t.value}`, t.x, t.y + 5);
        ctx.font = "700 9px ui-monospace, monospace";
        ctx.fillStyle = "rgba(180,255,210,0.85)";
        ctx.fillText(t.label, t.x, t.y + t.radius + 12);
      } else {
        const g = ctx.createRadialGradient(t.x, t.y, 2, t.x, t.y, t.radius);
        g.addColorStop(0, "rgba(46,26,12,0.92)");
        g.addColorStop(1, "rgba(12,6,22,0.35)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.setLineDash([5, 4]);
        ctx.strokeStyle = `rgba(255,120,80,${0.4 + pulse * 0.3})`;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = "rgba(255,186,158,0.95)";
        ctx.font = "800 9px ui-monospace, monospace";
        ctx.fillText(t.label, t.x, t.y + 3);
      }
      ctx.restore();
    }

    // green-side bumpers — lit like pinball rails; bank a shot off one for bonus
    for (const w of s.walls) {
      ctx.save();
      ctx.shadowColor = accentRef.current;
      ctx.shadowBlur = 12;
      ctx.fillStyle = "#20321f";
      ctx.fillRect(w.x, w.y, w.width, w.height);
      ctx.restore();
      ctx.fillStyle = accentRef.current;
      ctx.globalAlpha = 0.9;
      ctx.fillRect(w.x, w.y, w.width, 4);
      ctx.fillRect(w.x, w.y + w.height - 4, w.width, 4);
      ctx.globalAlpha = 1;
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

    // ball — on the tee shot it sails: a shadow stays on the turf while the ball
    // lofts on a time-based arc, so a big drive visibly hangs and climbs.
    const drive = driveRef.current;
    const loft =
      drive.active && drive.airMs > 0
        ? Math.sin(clamp(drive.t / drive.airMs, 0, 1) * Math.PI) * drive.maxH
        : 0;
    if (loft > 0.5) {
      ctx.save();
      ctx.globalAlpha = clamp(0.3 - loft / 700, 0.07, 0.3);
      ctx.fillStyle = "#000000";
      ctx.beginPath();
      ctx.ellipse(s.ball.x, s.ball.y, s.ball.radius * 1.15, s.ball.radius * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2 + loft * 0.12;
    ctx.fillStyle = "#f8fff4";
    ctx.beginPath();
    ctx.arc(s.ball.x, s.ball.y - loft, s.ball.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // floating point pops (rise + fade) for rings, muck and banks
    for (const p of popsRef.current) {
      const k = clamp(p.life / p.max, 0, 1);
      const rise = (1 - k) * 26;
      ctx.save();
      ctx.globalAlpha = k;
      ctx.textAlign = "center";
      ctx.font = "800 15px ui-monospace, monospace";
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(0,0,0,0.55)";
      ctx.strokeText(p.text, p.x, p.y - 14 - rise);
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, p.x, p.y - 14 - rise);
      ctx.restore();
    }

    // tee-shot carry drum-roll: the number climbs while the ball is in the air,
    // then freezes and fades so you feel the distance land.
    if (drive.active || drive.hold > 0) {
      const yds = Math.max(0, Math.round(drive.carry));
      const fading = !drive.active && drive.hold > 0;
      ctx.save();
      ctx.textAlign = "center";
      ctx.globalAlpha = fading ? clamp(drive.hold / 850, 0, 1) : 1;
      ctx.fillStyle = drive.active ? accentRef.current : "#f8fff4";
      ctx.font = "800 46px ui-monospace, monospace";
      ctx.fillText(String(yds), FIELD_WIDTH / 2, 70);
      ctx.font = "700 12px ui-monospace, monospace";
      ctx.fillStyle = "rgba(255,255,255,0.72)";
      ctx.fillText("CARRY · YDS", FIELD_WIDTH / 2, 88);
      ctx.restore();
    }

    // celebration fireworks (draws its own additive-glow layer, self-contained)
    fxRef.current.draw(ctx, logoRef.current);
    ctx.restore();

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

      // pinball juice: turn ring hits, muck penalties and bumper banks into
      // floating point pops the player can feel land.
      for (const ev of s.events) {
        if (ev.type === "target") {
          popsRef.current.push({
            x: ev.x,
            y: ev.y,
            text: ev.kind === "good" ? `+${ev.value} ${ev.label}` : `${ev.value} ${ev.label}`,
            color: ev.kind === "good" ? "#8affc0" : "#ff7a6b",
            life: 900,
            max: 900,
          });
          if (ev.kind === "good") {
            const hot = ev.label === "BULLS-EYE" || ev.label === "NET-ZERO";
            fxRef.current.burst(ev.x, ev.y, {
              accent: accentRef.current,
              reduced: reducedRef.current,
              intensity: hot ? 0.92 : clamp(ev.value / 260, 0.35, 0.68),
            });
          }
        } else if (ev.type === "bank") {
          popsRef.current.push({
            x: ev.x,
            y: ev.y,
            text: `BANK +${ev.value}`,
            color: accentRef.current,
            life: 800,
            max: 800,
          });
          fxRef.current.burst(ev.x, ev.y, {
            accent: accentRef.current,
            reduced: reducedRef.current,
            intensity: 0.58,
          });
        }
      }
      for (const p of popsRef.current) p.life -= dt;
      if (popsRef.current.some((p) => p.life <= 0)) {
        popsRef.current = popsRef.current.filter((p) => p.life > 0);
      }

      // advance the tee-shot sail (visual only): climb the carry read while the
      // ball is aloft, then hold the final number briefly after it lands.
      const drive = driveRef.current;
      if (drive.active) {
        drive.t += dt;
        drive.carry = Math.hypot(s.ball.x - drive.tx, s.ball.y - drive.ty) * YDS_PER_PX;
        if (drive.t >= drive.airMs || s.phase !== "rolling") {
          drive.active = false;
          drive.hold = 850;
        }
      } else if (drive.hold > 0) {
        drive.hold -= dt;
      }

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
              ← → aim · Space / click to DRIVE
            </p>
            <p className="mt-1 font-mono text-[11px] text-white/50">
              Grip it and rip it — send it sailing down the fairway.
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
