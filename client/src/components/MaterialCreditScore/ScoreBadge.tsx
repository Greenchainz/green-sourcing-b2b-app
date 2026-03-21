import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Link } from "wouter";
import { getScoreColor, getScoreLabel } from "./ScoreRing";
import { ScoreBreakdown, type McsBreakdown } from "./ScoreBreakdown";

interface ScoreBadgeProps {
  score: number;
  materialId?: number;
  breakdown?: McsBreakdown;
}

export function ScoreBadge({ score, materialId, breakdown }: ScoreBadgeProps) {
  const color = getScoreColor(score);
  const label = getScoreLabel(score);

  const badge = (
    <span
      className="inline-flex items-center gap-1 cursor-pointer select-none"
      role="img"
      aria-label={`Material Credit Score: ${score} — ${label}`}
    >
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: color }}
      />
      <span className="font-bold text-xs tabular-nums" style={{ color }}>
        {score}
      </span>
      <span className="text-[10px] text-muted-foreground font-medium">MCS</span>
    </span>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {materialId ? (
          <Link href={`/materials/${materialId}/score`} className="inline-flex">
            {badge}
          </Link>
        ) : (
          <span className="inline-flex">{badge}</span>
        )}
      </TooltipTrigger>
      <TooltipContent
        side="top"
        align="start"
        className="w-72 p-3 space-y-2"
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold">Material Credit Score</span>
          <span className="text-sm font-bold" style={{ color }}>
            {score} / 100
          </span>
        </div>
        {breakdown ? (
          <ScoreBreakdown breakdown={breakdown} />
        ) : (
          <p className="text-xs text-muted-foreground">
            {materialId ? (
              <>
                Tap to view full score breakdown →
              </>
            ) : (
              label
            )}
          </p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
