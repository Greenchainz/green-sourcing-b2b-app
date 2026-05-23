/**
 * CarbonForecastPanel
 *
 * Shows projected embodied carbon (kgCO2e A1-A3) for an RFQ before it's
 * submitted. Renders on the review step of the RFQ wizard so architects
 * see the carbon impact at spec time — not post-purchase.
 *
 * Features:
 *  - Total kgCO2e with vs-industry comparison
 *  - Confidence indicator (EPD-backed vs. EC3 benchmark)
 *  - LEED MR credit context line
 *  - Animated progress bar showing position vs. industry average
 */

import { trpc } from "@/lib/trpc";
import { Leaf, TrendingDown, TrendingUp, Minus, AlertCircle, Loader2, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type QuantityUnit = "SF" | "LF" | "CY" | "tons" | "EA";

interface ForecastItem {
  category: string;
  quantity: number;
  unit: QuantityUnit;
  materialId?: number;
}

interface CarbonForecastPanelProps {
  items: ForecastItem[];
  /** Only fetch when the user is actually on the review step */
  enabled?: boolean;
}

function formatKgCO2e(kg: number): string {
  if (kg >= 1_000_000) return `${(kg / 1_000_000).toFixed(1)} MtCO₂e`;
  if (kg >= 1_000) return `${(kg / 1_000).toFixed(1)} tCO₂e`;
  return `${kg.toFixed(0)} kgCO₂e`;
}

function ConfidenceBadge({ confidence }: { confidence: "high" | "medium" | "low" }) {
  if (confidence === "high") {
    return (
      <Badge variant="outline" className="text-xs border-emerald-400 text-emerald-700 bg-emerald-50">
        EPD-backed
      </Badge>
    );
  }
  if (confidence === "medium") {
    return (
      <Badge variant="outline" className="text-xs border-amber-400 text-amber-700 bg-amber-50">
        Partial EPD
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-xs border-slate-300 text-slate-600 bg-slate-50">
      EC3 estimate
    </Badge>
  );
}

function DeltaIcon({ pct }: { pct: number }) {
  if (Math.abs(pct) < 3) return <Minus className="w-3.5 h-3.5 text-slate-400" />;
  if (pct < 0) return <TrendingDown className="w-3.5 h-3.5 text-emerald-500" />;
  return <TrendingUp className="w-3.5 h-3.5 text-amber-500" />;
}

export function CarbonForecastPanel({ items, enabled = true }: CarbonForecastPanelProps) {
  const { data, isLoading, isError } = trpc.rfqRequests.carbonForecast.useQuery(
    { items },
    {
      enabled: enabled && items.length > 0,
      staleTime: 60_000,
      retry: 1,
    }
  );

  if (!enabled || items.length === 0) return null;

  if (isLoading) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 px-4 py-3 flex items-center gap-2 text-sm text-emerald-700">
        <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
        Calculating carbon impact…
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 flex items-center gap-2 text-sm text-slate-500">
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        Carbon forecast unavailable — EPD data will be included with your submittal.
      </div>
    );
  }

  const { totalKgCO2e, breakdown, confidence, leedContext } = data;

  // Compute overall % vs industry (weighted average across breakdown rows)
  const totalIndustry = breakdown.reduce(
    (sum, r) => sum + r.industryAvgPerUnit * r.quantity,
    0
  );
  const overallPct =
    totalIndustry > 0
      ? ((totalKgCO2e - totalIndustry) / totalIndustry) * 100
      : 0;

  // Bar: 0% = industry average, clamp to 0–200% of industry
  const barPct = Math.min((totalKgCO2e / (totalIndustry || totalKgCO2e || 1)) * 100, 200);
  const barColor =
    overallPct <= -10
      ? "bg-emerald-500"
      : overallPct <= 5
      ? "bg-amber-400"
      : "bg-red-400";

  const deltaLabel =
    Math.abs(overallPct) < 3
      ? "at industry average"
      : overallPct < 0
      ? `${Math.abs(overallPct).toFixed(0)}% below industry avg`
      : `${overallPct.toFixed(0)}% above industry avg`;

  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 px-4 py-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Leaf className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span className="text-sm font-semibold text-foreground">Carbon Impact Forecast</span>
          <ConfidenceBadge confidence={confidence} />
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-emerald-700 leading-none">
            {formatKgCO2e(totalKgCO2e)}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">A1–A3 embodied carbon</p>
        </div>
      </div>

      {/* Progress bar vs industry */}
      <div className="space-y-1">
        <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${barColor}`}
            style={{ width: `${Math.min(barPct, 100)}%` }}
          />
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <DeltaIcon pct={overallPct} />
          <span>{deltaLabel}</span>
          <span className="text-slate-300">·</span>
          <span className="text-slate-400">EC3 North America benchmark</span>
        </div>
      </div>

      {/* Per-line breakdown (only if multiple categories) */}
      {breakdown.length > 1 && (
        <div className="space-y-1.5 pt-1 border-t border-emerald-100">
          {breakdown.map((row, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground truncate max-w-[55%]">
                {row.category} — {row.quantity.toLocaleString()} {row.unit}
              </span>
              <div className="flex items-center gap-1.5">
                <DeltaIcon pct={row.percentVsIndustry} />
                <span className="font-medium text-foreground">
                  {formatKgCO2e(row.totalKgCO2e)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* LEED context */}
      {leedContext && (
        <div className="flex items-start gap-2 pt-1 border-t border-emerald-100">
          <Info className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground leading-relaxed">{leedContext}</p>
        </div>
      )}

      <p className="text-xs text-slate-400 pt-0.5">
        Exact GWP values are included in the EPD submittal package sent with your RFQ.
      </p>
    </div>
  );
}
