import { trpc } from "@/lib/trpc";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export function MacroTrendBanner({ category }: { category: string }) {
  const { data } = trpc.materials.getPriceTrend.useQuery(
    { category },
    { enabled: !!category, staleTime: 60_000 }
  );

  if (!data || !data.direction) return null;

  const isUp = data.direction === "up";
  const isDown = data.direction === "down";
  const Icon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;
  const color = isUp ? "text-red-600 bg-red-50 border-red-200" : isDown ? "text-green-600 bg-green-50 border-green-200" : "text-muted-foreground bg-muted border-border";

  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium w-fit ${color}`}>
      <Icon className="w-3.5 h-3.5" />
      <span>{category}: {isUp ? "↑ trending up" : isDown ? "↓ trending down" : "stable"}</span>
      {data.yoyChange !== undefined && (
        <span className="font-mono">{data.yoyChange > 0 ? "+" : ""}{data.yoyChange.toFixed(1)}% YoY</span>
      )}
      <span className="text-[10px] font-normal opacity-60">(BLS PPI)</span>
    </div>
  );
}
