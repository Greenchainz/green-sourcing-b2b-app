/**
 * MaterialCreditScoreCard
 *
 * Displays a 0–100 Material Credit Score with a circular progress ring,
 * a per-dimension breakdown, and an actionable "What improves this score?"
 * expandable section.
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ChevronDown, ChevronUp, AlertCircle } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScoreBreakdown {
  carbonEfficiency: number;
  epdVerification: number;
  manufacturerTransparency: number;
  assemblyOptionsCoverage: number;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const filled = circumference * (score / 100);
  const color =
    score >= 70 ? "#22c55e" : score >= 40 ? "#f59e0b" : "#ef4444";

  return (
    <svg width="120" height="120" viewBox="0 0 120 120" aria-hidden="true">
      {/* Track */}
      <circle
        cx="60"
        cy="60"
        r={radius}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth="10"
      />
      {/* Progress */}
      <circle
        cx="60"
        cy="60"
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="10"
        strokeDasharray={`${filled} ${circumference}`}
        strokeLinecap="round"
        transform="rotate(-90 60 60)"
      />
      <text
        x="60"
        y="65"
        textAnchor="middle"
        fontSize="24"
        fontWeight="700"
        fill={color}
      >
        {score}
      </text>
    </svg>
  );
}

const DIMENSION_LABELS: Record<keyof ScoreBreakdown, string> = {
  carbonEfficiency: "Carbon Efficiency",
  epdVerification: "EPD Verification",
  manufacturerTransparency: "Manufacturer Transparency",
  assemblyOptionsCoverage: "Assembly Options Coverage",
};

const DIMENSION_MAX: Record<keyof ScoreBreakdown, number> = {
  carbonEfficiency: 40,
  epdVerification: 20,
  manufacturerTransparency: 20,
  assemblyOptionsCoverage: 20,
};

const IMPROVEMENT_TIPS: Record<keyof ScoreBreakdown, string> = {
  carbonEfficiency:
    "Submit an EPD with a lower GWP value to improve carbon efficiency score.",
  epdVerification:
    "Ensure the EPD number follows a recognised format (e.g. EPD-XX-12345).",
  manufacturerTransparency:
    "Complete your GreenChainz supplier profile (website, description, contact name).",
  assemblyOptionsCoverage:
    "Document all three core options (CFMF, Mega Panel HSS, Unitized) for this assembly type.",
};

function BreakdownRow({
  label,
  score,
  max,
}: {
  label: string;
  score: number;
  max: number;
}) {
  const pct = (score / max) * 100;
  const barColor =
    pct >= 70 ? "bg-green-500" : pct >= 40 ? "bg-amber-400" : "bg-red-400";

  return (
    <div className="flex items-center gap-3 py-1">
      <span className="w-44 text-sm text-muted-foreground truncate">{label}</span>
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-12 text-right text-sm font-medium tabular-nums">
        {score}/{max}
      </span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  epdId: number;
  productName?: string;
}

export function MaterialCreditScoreCard({ epdId, productName }: Props) {
  const [showTips, setShowTips] = useState(false);

  const { data, isLoading, isError } = trpc.materialCreditScore.getForMaterial.useQuery(
    { epdId },
    { staleTime: 60_000 }
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <Skeleton className="h-32 w-32 rounded-full" />
          <div className="w-full space-y-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError || !data) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Unable to load material credit score.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const { total, breakdown } = data;
  const scoreLabel =
    total >= 70 ? "green" : total >= 40 ? "amber" : "red";
  const scoreBadgeVariant =
    scoreLabel === "green"
      ? "default"
      : scoreLabel === "amber"
      ? "secondary"
      : "destructive";

  const gapKeys = (Object.keys(breakdown) as (keyof ScoreBreakdown)[]).filter(
    (k) => breakdown[k] < DIMENSION_MAX[k]
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            {productName ?? `EPD #${epdId}`}
          </CardTitle>
          <Badge variant={scoreBadgeVariant}>
            {scoreLabel === "green"
              ? "High"
              : scoreLabel === "amber"
              ? "Medium"
              : "Low"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col items-center gap-4">
        {/* Circular score ring */}
        <ScoreRing score={total} />
        <p className="text-xs text-muted-foreground">
          Material Credit Score (0–100)
        </p>

        {/* Breakdown rows */}
        <div className="w-full space-y-1">
          {(Object.keys(breakdown) as (keyof ScoreBreakdown)[]).map((key) => (
            <BreakdownRow
              key={key}
              label={DIMENSION_LABELS[key]}
              score={breakdown[key]}
              max={DIMENSION_MAX[key]}
            />
          ))}
        </div>

        {/* What improves this score? */}
        {gapKeys.length > 0 && (
          <div className="w-full border rounded-md">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-between"
              onClick={() => setShowTips((v) => !v)}
              aria-expanded={showTips}
            >
              <span className="text-sm font-medium">
                What improves this score?
              </span>
              {showTips ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>

            {showTips && (
              <ul className="px-4 pb-3 space-y-2 text-sm text-muted-foreground list-disc list-inside">
                {gapKeys.map((k) => (
                  <li key={k}>{IMPROVEMENT_TIPS[k]}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
