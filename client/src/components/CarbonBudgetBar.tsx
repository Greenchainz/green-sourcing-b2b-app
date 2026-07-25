/**
 * CarbonBudgetBar — sticky bottom bar for the live LEED carbon tracker.
 *
 * Shows only when at least one material has been added to the budget tray.
 * Collapsed: progress bar + status + LEED point badge + expand button.
 * Expanded:  full list of tracked materials with remove + Send to RFQ CTA.
 */

import { useState } from "react";
import { useLocation } from "wouter";
import { useCarbonBudget } from "@/contexts/CarbonBudgetContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Leaf,
  Trophy,
  ChevronUp,
  ChevronDown,
  X,
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  ShoppingCart,
  Trash2,
} from "lucide-react";

// ── Status helpers ─────────────────────────────────────────────────────────────

function getStatus(pct: number | null) {
  if (pct === null) return "unknown";
  if (pct >= 10) return "on-track";
  if (pct >= 0) return "near-track";
  return "off-track";
}

const STATUS_STYLES = {
  "on-track":   { text: "text-emerald-700", bar: "bg-emerald-500", dot: "bg-emerald-500" },
  "near-track": { text: "text-amber-700",   bar: "bg-amber-500",   dot: "bg-amber-500"   },
  "off-track":  { text: "text-red-700",     bar: "bg-red-500",     dot: "bg-red-500"     },
  "unknown":    { text: "text-muted-foreground", bar: "bg-muted-foreground", dot: "bg-muted-foreground" },
} as const;

// ── Component ─────────────────────────────────────────────────────────────────

export default function CarbonBudgetBar() {
  const [expanded, setExpanded] = useState(false);
  const [, navigate] = useLocation();

  const {
    items,
    totalCarbon,
    pctBelowBaseline,
    leedPoints,
    removeItem,
    clearAll,
  } = useCarbonBudget();

  if (items.length === 0) return null;

  const pct = pctBelowBaseline ?? 0;
  const status = getStatus(pctBelowBaseline);
  const { text: textColor, bar: barColor } = STATUS_STYLES[status];

  // Progress bar: 0 → 0% below baseline; 100 → 50%+ below baseline.
  const barValue = Math.min(Math.max((pct / 50) * 100, 0), 100);

  // Heaviest material — primary swap suggestion candidate when off-track.
  const heaviest = [...items].sort((a, b) => b.gwpValue - a.gwpValue)[0];

  const handleSendToRfq = () => {
    if (items.length === 0) return;
    const qs = new URLSearchParams();
    items.forEach((i) => qs.append("materialIds", String(i.id)));
    navigate(`/rfq/new?${qs.toString()}`);
  };

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-sm shadow-[0_-4px_20px_rgba(0,0,0,0.08)] animate-in slide-in-from-bottom-2 duration-200"
      role="region"
      aria-label="Carbon budget tracker"
    >
      {/* ── Expanded panel ───────────────────────────────────────────────── */}
      {expanded && (
        <div className="container max-w-7xl py-3 space-y-3 border-b border-border/40">

          {/* Material list */}
          <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
            {items.map((item) => {
              const aboveBaseline =
                item.ec3Median !== null && item.gwpValue > item.ec3Median;
              const pctDiff =
                item.ec3Median && item.ec3Median > 0
                  ? ((item.ec3Median - item.gwpValue) / item.ec3Median) * 100
                  : null;
              const isHeaviest = item.id === heaviest?.id;

              return (
                <div
                  key={item.id}
                  className={`flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                    isHeaviest && status === "off-track"
                      ? "bg-red-50 border border-red-100"
                      : "bg-muted/30"
                  }`}
                >
                  <Leaf
                    className={`w-3.5 h-3.5 shrink-0 ${
                      aboveBaseline ? "text-red-500" : "text-emerald-600"
                    }`}
                  />

                  <span className="flex-1 truncate font-medium text-xs">
                    {item.name}
                  </span>

                  <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">
                    {item.gwpValue.toFixed(1)}&nbsp;{item.gwpUnit}/unit
                  </span>

                  {pctDiff !== null && (
                    <Badge
                      variant="outline"
                      className={`text-[10px] h-4 px-1.5 shrink-0 ${
                        aboveBaseline
                          ? "border-red-200 bg-red-50 text-red-700"
                          : "border-emerald-200 bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {aboveBaseline ? "+" : ""}
                      {(-pctDiff).toFixed(0)}%&nbsp;vs&nbsp;avg
                    </Badge>
                  )}

                  {/* Swap nudge for the heaviest material when off-track */}
                  {isHeaviest && status === "off-track" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 px-1.5 text-[10px] text-amber-700 hover:text-amber-800 hover:bg-amber-50 shrink-0"
                      onClick={() => navigate(`/materials/${item.id}`)}
                    >
                      Swap ↗
                    </Button>
                  )}

                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-muted-foreground/40 hover:text-muted-foreground transition-colors shrink-0"
                    aria-label={`Remove ${item.name} from carbon tracker`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="bg-green-700 hover:bg-green-800 text-white gap-1.5 h-8 text-xs"
              onClick={handleSendToRfq}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              Send to RFQ
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-8 text-xs text-destructive border-destructive/30 hover:bg-destructive/5"
              onClick={clearAll}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear All
            </Button>
          </div>
        </div>
      )}

      {/* ── Collapsed bar (always visible) ───────────────────────────────── */}
      <div className="container max-w-7xl flex items-center gap-3 py-2.5">

        {/* Icon + label */}
        <div className="flex items-center gap-1.5 shrink-0">
          <CircleDot className={`w-3 h-3 ${STATUS_STYLES[status].dot} rounded-full`} />
          <Leaf className="w-4 h-4 text-emerald-600" />
          <span className="text-xs font-semibold text-foreground hidden sm:block">
            Carbon Budget
          </span>
        </div>

        {/* Progress + label */}
        <div className="flex-1 min-w-0 space-y-0.5">
          <div className="relative h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${barColor}`}
              style={{ width: `${barValue}%` }}
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className={`text-[10px] font-medium leading-tight ${textColor}`}>
              {pctBelowBaseline === null ? (
                "Add materials with EPD data to compare against baseline"
              ) : status === "off-track" ? (
                <span className="flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {Math.abs(pct).toFixed(1)}% above baseline — not on track for LEED MRc1
                </span>
              ) : status === "near-track" ? (
                `${pct.toFixed(1)}% below baseline — ${(10 - pct).toFixed(1)}% more to unlock LEED MRc1`
              ) : (
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  {pct.toFixed(1)}% below baseline — on track for LEED MRc1
                </span>
              )}
            </span>
            <span className="text-[10px] text-muted-foreground tabular-nums shrink-0 hidden sm:block">
              {totalCarbon.toFixed(0)}&nbsp;kgCO₂e
            </span>
          </div>
        </div>

        {/* LEED points badge */}
        {leedPoints > 0 && (
          <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-200 rounded-md px-2 py-1 shrink-0">
            <Trophy className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-xs font-bold text-emerald-700">
              {leedPoints}&nbsp;pt{leedPoints !== 1 ? "s" : ""}
            </span>
            <span className="text-[10px] text-emerald-600 hidden md:block">LEED MRc1</span>
          </div>
        )}

        {/* Material count */}
        <Badge variant="secondary" className="text-[10px] h-5 shrink-0">
          {items.length}&nbsp;material{items.length !== 1 ? "s" : ""}
        </Badge>

        {/* Expand / collapse */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
          aria-label={expanded ? "Collapse carbon tracker" : "Expand carbon tracker"}
        >
          {expanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronUp className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
}
