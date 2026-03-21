import { useEffect, useRef } from "react";

export function getScoreColor(score: number): string {
  if (score >= 71) return "#22c55e"; // green-500
  if (score >= 41) return "#f59e0b"; // amber-500
  return "#ef4444"; // red-500
}

export function getScoreLabel(score: number): string {
  if (score >= 85) return "Excellent";
  if (score >= 71) return "Good";
  if (score >= 55) return "Fair";
  if (score >= 41) return "Below Average";
  return "Needs Work";
}

const SIZE_CONFIG = {
  sm: { px: 80, cx: 40, cy: 40, r: 32, strokeWidth: 6, fontSize: 18, subFontSize: 9 },
  md: { px: 120, cx: 60, cy: 60, r: 50, strokeWidth: 8, fontSize: 26, subFontSize: 10 },
  lg: { px: 160, cx: 80, cy: 80, r: 66, strokeWidth: 10, fontSize: 36, subFontSize: 12 },
} as const;

interface ScoreRingProps {
  score: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export function ScoreRing({ score, size = "md", showLabel = true }: ScoreRingProps) {
  const cfg = SIZE_CONFIG[size];
  const circumference = 2 * Math.PI * cfg.r;
  const color = getScoreColor(score);
  const label = getScoreLabel(score);
  const circleRef = useRef<SVGCircleElement>(null);

  useEffect(() => {
    const el = circleRef.current;
    if (!el) return;
    const targetOffset = circumference * (1 - score / 100);
    // Reset to empty, force reflow, then animate to target
    el.style.transition = "none";
    el.style.strokeDashoffset = String(circumference);
    void el.getBoundingClientRect();
    el.style.transition = "stroke-dashoffset 1s ease-out";
    el.style.strokeDashoffset = String(targetOffset);
  }, [score, circumference]);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: cfg.px, height: cfg.px }}>
        <svg
          width={cfg.px}
          height={cfg.px}
          viewBox={`0 0 ${cfg.px} ${cfg.px}`}
          className="-rotate-90"
          aria-label={`Material Credit Score: ${score} out of 100`}
          role="img"
        >
          {/* Track */}
          <circle
            cx={cfg.cx}
            cy={cfg.cy}
            r={cfg.r}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={cfg.strokeWidth}
            className="dark:stroke-gray-700"
          />
          {/* Progress */}
          <circle
            ref={circleRef}
            cx={cfg.cx}
            cy={cfg.cy}
            r={cfg.r}
            fill="none"
            stroke={color}
            strokeWidth={cfg.strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference}
          />
        </svg>

        {/* Centered score text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
          <span
            className="font-bold leading-none tabular-nums"
            style={{ fontSize: cfg.fontSize, color }}
          >
            {score}
          </span>
          <span className="text-muted-foreground leading-none mt-0.5" style={{ fontSize: cfg.subFontSize }}>
            / 100
          </span>
        </div>
      </div>

      {showLabel && (
        <span className="font-semibold text-sm" style={{ color }}>
          {label}
        </span>
      )}
    </div>
  );
}
