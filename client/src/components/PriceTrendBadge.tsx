import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface PriceTrendBadgeProps {
  category: string;
  /** "compact" = "↑12%" for card view; "full" = "Steel prices ↑ 12.4% YoY (BLS PPI)" */
  mode?: "compact" | "full";
}

export function PriceTrendBadge({ category, mode = "compact" }: PriceTrendBadgeProps) {
  const { data: trends } = trpc.materials.getPriceTrends.useQuery(undefined, {
    staleTime: 5 * 60_000, // cache 5 min
  });

  if (!trends) return null;

  // Find matching trend — exact first, then fuzzy
  let trend = trends[category] ?? null;
  if (!trend) {
    const lowerCat = category.toLowerCase();
    for (const [key, val] of Object.entries(trends)) {
      const lowerKey = key.toLowerCase();
      if (lowerCat.includes(lowerKey) || lowerKey.includes(lowerCat)) {
        trend = val;
        break;
      }
    }
  }

  if (!trend) return null;

  const { yoyChange, direction } = trend;
  const absChange = Math.abs(yoyChange).toFixed(1);

  if (mode === "compact") {
    if (direction === "up") {
      return (
        <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-red-600">
          <TrendingUp className="w-3 h-3" />
          {absChange}%
        </span>
      );
    }
    if (direction === "down") {
      return (
        <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-emerald-600">
          <TrendingDown className="w-3 h-3" />
          {absChange}%
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-muted-foreground">
        <Minus className="w-3 h-3" />
        Stable
      </span>
    );
  }

  // Full mode
  const categoryLabel = category.split("/")[0].trim();
  if (direction === "up") {
    return (
      <div className="flex items-center gap-1.5 text-sm">
        <TrendingUp className="w-4 h-4 text-red-500" />
        <span className="text-red-600 font-medium">
          {categoryLabel} prices up {absChange}% YoY
        </span>
        <span className="text-muted-foreground text-xs">(BLS Producer Price Index)</span>
      </div>
    );
  }
  if (direction === "down") {
    return (
      <div className="flex items-center gap-1.5 text-sm">
        <TrendingDown className="w-4 h-4 text-emerald-500" />
        <span className="text-emerald-600 font-medium">
          {categoryLabel} prices down {absChange}% YoY
        </span>
        <span className="text-muted-foreground text-xs">(BLS Producer Price Index)</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 text-sm">
      <Minus className="w-4 h-4 text-muted-foreground" />
      <span className="text-muted-foreground font-medium">
        {categoryLabel} prices stable
      </span>
      <span className="text-muted-foreground text-xs">(BLS Producer Price Index)</span>
    </div>
  );
}
