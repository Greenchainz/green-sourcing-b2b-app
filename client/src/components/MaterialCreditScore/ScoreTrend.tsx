import { ResponsiveContainer, LineChart, Line, Tooltip as RechartsTooltip, XAxis } from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { getScoreColor } from "./ScoreRing";

interface HistoryPoint {
  month: string;
  score: number;
}

interface ScoreTrendProps {
  history: HistoryPoint[];
}

function formatMonth(iso: string): string {
  const [year, month] = iso.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString("en-US", { month: "short" });
}

export function ScoreTrend({ history }: ScoreTrendProps) {
  if (history.length < 2) return null;

  const latest = history[history.length - 1].score;
  const previous = history[history.length - 2].score;
  const delta = latest - previous;
  const color = getScoreColor(latest);

  const chartData = history.map((h) => ({
    month: formatMonth(h.month),
    score: h.score,
  }));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">Score Trend</span>
        <span className="flex items-center gap-1 text-sm font-semibold">
          {delta > 0 ? (
            <>
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-green-600">+{delta}</span>
            </>
          ) : delta < 0 ? (
            <>
              <TrendingDown className="w-4 h-4 text-red-500" />
              <span className="text-red-600">{delta}</span>
            </>
          ) : (
            <>
              <Minus className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">0</span>
            </>
          )}
          <span className="text-xs text-muted-foreground font-normal ml-1">vs last month</span>
        </span>
      </div>

      <div className="h-16 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
            <XAxis
              dataKey="month"
              tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
            />
            <RechartsTooltip
              contentStyle={{
                fontSize: 11,
                padding: "4px 8px",
                borderRadius: 6,
                border: "1px solid hsl(var(--border))",
                background: "hsl(var(--popover))",
                color: "hsl(var(--popover-foreground))",
              }}
              formatter={(value: number) => [value, "MCS"]}
            />
            <Line
              type="monotone"
              dataKey="score"
              stroke={color}
              strokeWidth={2}
              dot={{ fill: color, r: 3 }}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
