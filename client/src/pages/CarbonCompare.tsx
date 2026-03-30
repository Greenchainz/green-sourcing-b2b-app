import { useState, useMemo } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";
import {
  Leaf,
  BarChart3,
  Building2,
  Award,
  Filter,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type CarbonTier = "LOW" | "MID" | "HIGH";
type SortMode = "carbon" | "name";
type TierFilter = "ALL" | CarbonTier;

interface Assembly {
  id: string;
  name: string;
  epd: string | null;
  gwpA1A3: number;
  unit: string;
  conversionFactor: number;
  gwpPer1000sf: number;
  tier: CarbonTier;
  tags: {
    assemblyType: string;
    framingType: string;
    finish: string;
  };
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const RAW_ASSEMBLIES: Omit<Assembly, "tier">[] = [
  {
    id: "EWS-1A-V",
    name: "EWS-1A Unitized Vision",
    epd: null,
    gwpA1A3: 55.7,
    unit: "m²",
    conversionFactor: 92.903,
    gwpPer1000sf: 5172.7,
    tags: { assemblyType: "Unitized", framingType: "Curtainwall", finish: "Vision" },
  },
  {
    id: "EWS-1A-SB",
    name: "EWS-1A Unitized Shadowbox",
    epd: null,
    gwpA1A3: 55.7,
    unit: "m²",
    conversionFactor: 92.903,
    gwpPer1000sf: 5172.7,
    tags: { assemblyType: "Unitized", framingType: "Curtainwall", finish: "Shadowbox" },
  },
  {
    id: "EWS-1A-SP",
    name: "EWS-1A Unitized Spandrel",
    epd: null,
    gwpA1A3: 25.4,
    unit: "m²",
    conversionFactor: 92.903,
    gwpPer1000sf: 2359.7,
    tags: { assemblyType: "Unitized", framingType: "Curtainwall", finish: "Spandrel" },
  },
  {
    id: "EWS-1B-VF",
    name: "EWS-1B Unitized Vision Frit",
    epd: null,
    gwpA1A3: 80.0,
    unit: "m²",
    conversionFactor: 92.903,
    gwpPer1000sf: 7432.2,
    tags: { assemblyType: "Unitized", framingType: "Curtainwall", finish: "Frit Glass" },
  },
  {
    id: "EWS-2A-G",
    name: "EWS-2A Granite Panel CFMF",
    epd: null,
    gwpA1A3: 39.1,
    unit: "m²",
    conversionFactor: 92.903,
    gwpPer1000sf: 3632.5,
    tags: { assemblyType: "Panel", framingType: "CFMF", finish: "Granite" },
  },
  {
    id: "EWS-2B-LS",
    name: "EWS-2B Limestone Panel CFMF",
    epd: null,
    gwpA1A3: 29.2,
    unit: "m²",
    conversionFactor: 92.903,
    gwpPer1000sf: 2712.8,
    tags: { assemblyType: "Panel", framingType: "CFMF", finish: "Limestone" },
  },
  {
    id: "EWS-2B-SS",
    name: "EWS-2B Sandstone Panel CFMF",
    epd: null,
    gwpA1A3: 24.0,
    unit: "m²",
    conversionFactor: 92.903,
    gwpPer1000sf: 2229.7,
    tags: { assemblyType: "Panel", framingType: "CFMF", finish: "Sandstone" },
  },
  {
    id: "EWS-3A-TC",
    name: "EWS-3A Terracotta Panel CFMF",
    epd: null,
    gwpA1A3: 111.0,
    unit: "m²",
    conversionFactor: 92.903,
    gwpPer1000sf: 10312.2,
    tags: { assemblyType: "Panel", framingType: "CFMF", finish: "Terracotta" },
  },
  {
    id: "EWS-3B-UHPC",
    name: "EWS-3B UHPC Panel CFMF",
    epd: null,
    gwpA1A3: 14.9,
    unit: "m²",
    conversionFactor: 92.903,
    gwpPer1000sf: 1384.3,
    tags: { assemblyType: "Panel", framingType: "CFMF", finish: "UHPC" },
  },
  {
    id: "EWS-3C-GFRC",
    name: "EWS-3C GFRC Panel CFMF",
    epd: null,
    gwpA1A3: 818.0,
    unit: "mt",
    conversionFactor: 4.64,
    gwpPer1000sf: 3795.5,
    tags: { assemblyType: "Panel", framingType: "CFMF", finish: "GFRC" },
  },
  {
    id: "EWS-5-AMP",
    name: "EWS-5 Aluminum Metal Panel",
    epd: null,
    gwpA1A3: 10.62,
    unit: "100m²",
    conversionFactor: 1000,
    gwpPer1000sf: 10620.0,
    tags: { assemblyType: "Panel", framingType: "Metal", finish: "Aluminum" },
  },
];

function getTier(gwpPer1000sf: number): CarbonTier {
  if (gwpPer1000sf < 5000) return "LOW";
  if (gwpPer1000sf <= 15000) return "MID";
  return "HIGH";
}

const ASSEMBLIES: Assembly[] = RAW_ASSEMBLIES.map((a) => ({
  ...a,
  tier: getTier(a.gwpPer1000sf),
}));

// ─── Tier colour helpers ──────────────────────────────────────────────────────

const TIER_COLORS: Record<CarbonTier, string> = {
  LOW: "#10b981",  // emerald-500
  MID: "#eab308",  // yellow-500
  HIGH: "#ef4444", // red-500
};

const TIER_BG_CLASSES: Record<CarbonTier, string> = {
  LOW: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  MID: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  HIGH: "bg-red-500/10 text-red-400 border-red-500/30",
};

const TIER_LABELS: Record<CarbonTier, string> = {
  LOW: "Low Carbon",
  MID: "Mid Carbon",
  HIGH: "High Carbon",
};

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

interface TooltipPayloadItem {
  value: number;
  payload: Assembly;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const a = payload[0].payload;
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-xl text-xs">
      <p className="font-semibold text-white mb-1 max-w-[200px] leading-snug">{a.name}</p>
      <p className="text-gray-300">
        <span className="text-gray-400">GWP/1000 sf: </span>
        <span className="font-medium text-white">{a.gwpPer1000sf.toLocaleString()} kg CO₂e</span>
      </p>
      <p className="text-gray-300">
        <span className="text-gray-400">GWP A1-A3: </span>
        <span className="font-medium text-white">{a.gwpA1A3} kg CO₂e/{a.unit}</span>
      </p>
      <span className={`inline-flex items-center mt-2 px-2 py-0.5 rounded border text-[10px] font-medium ${TIER_BG_CLASSES[a.tier]}`}>
        {TIER_LABELS[a.tier]}
      </span>
    </div>
  );
}

// ─── Custom Bar Label ─────────────────────────────────────────────────────────

interface CustomLabelProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  value?: number;
}

function CustomBarLabel({ x = 0, y = 0, width = 0, height = 0, value = 0 }: CustomLabelProps) {
  return (
    <text
      x={x + width + 6}
      y={y + height / 2}
      fill="#9ca3af"
      fontSize={11}
      dominantBaseline="middle"
    >
      {value.toLocaleString()}
    </text>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CarbonCompare() {
  const [sortMode, setSortMode] = useState<SortMode>("carbon");
  const [tierFilter, setTierFilter] = useState<TierFilter>("ALL");

  // ── Stats ──
  const sorted = useMemo(
    () => [...ASSEMBLIES].sort((a, b) => a.gwpPer1000sf - b.gwpPer1000sf),
    []
  );
  const lowest = sorted[0];
  const highest = sorted[sorted.length - 1];
  const average = Math.round(
    ASSEMBLIES.reduce((sum, a) => sum + a.gwpPer1000sf, 0) / ASSEMBLIES.length
  );

  // ── Filtered + sorted list for chart & cards ──
  const displayed = useMemo(() => {
    let list = tierFilter === "ALL" ? ASSEMBLIES : ASSEMBLIES.filter((a) => a.tier === tierFilter);
    if (sortMode === "carbon") {
      list = [...list].sort((a, b) => a.gwpPer1000sf - b.gwpPer1000sf);
    } else {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    }
    return list;
  }, [sortMode, tierFilter]);

  // ── Chart data — truncate name for Y-axis ──
  const chartData = useMemo(
    () =>
      displayed.map((a) => ({
        ...a,
        shortName: a.name.replace(/^EWS-\d+[A-Z]? /, "").replace(" CFMF", ""),
      })),
    [displayed]
  );

  const tierFilters: { value: TierFilter; label: string }[] = [
    { value: "ALL", label: "All" },
    { value: "LOW", label: "Low" },
    { value: "MID", label: "Mid" },
    { value: "HIGH", label: "High" },
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#0a0a0a" }}>
      <Header />

      <main className="flex-1 container py-8 max-w-6xl mx-auto px-4">
        {/* ── Page header ── */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
            <span>Tools</span>
            <span>/</span>
            <span className="text-foreground">Carbon Compare</span>
          </div>
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 mt-0.5">
              <Leaf className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Embodied Carbon Compare</h1>
              <p className="text-sm text-gray-400 mt-1">
                A1–A3 embodied carbon benchmarks for EWS facade assemblies, expressed as kg CO₂e per 1,000 SF.
              </p>
            </div>
          </div>
        </div>

        {/* ── Hero KPI cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {/* Lowest */}
          <Card className="bg-gray-900 border-gray-800 py-5">
            <CardContent className="px-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                  <Leaf className="w-4 h-4 text-emerald-400" />
                </div>
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Lowest Carbon</span>
              </div>
              <div className="text-2xl font-bold text-emerald-400 mb-1">
                {lowest.gwpPer1000sf.toLocaleString()}
                <span className="text-sm font-normal text-gray-500 ml-1">kg CO₂e</span>
              </div>
              <div className="text-sm text-gray-300 font-medium truncate">{lowest.name}</div>
              <div className="text-xs text-gray-500 mt-0.5">per 1,000 SF</div>
            </CardContent>
          </Card>

          {/* Average */}
          <Card className="bg-gray-900 border-gray-800 py-5">
            <CardContent className="px-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 rounded-md bg-blue-500/10 border border-blue-500/20">
                  <BarChart3 className="w-4 h-4 text-blue-400" />
                </div>
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Portfolio Average</span>
              </div>
              <div className="text-2xl font-bold text-blue-400 mb-1">
                {average.toLocaleString()}
                <span className="text-sm font-normal text-gray-500 ml-1">kg CO₂e</span>
              </div>
              <div className="text-sm text-gray-300 font-medium">{ASSEMBLIES.length} assemblies</div>
              <div className="text-xs text-gray-500 mt-0.5">per 1,000 SF</div>
            </CardContent>
          </Card>

          {/* Highest */}
          <Card className="bg-gray-900 border-gray-800 py-5">
            <CardContent className="px-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 rounded-md bg-red-500/10 border border-red-500/20">
                  <Award className="w-4 h-4 text-red-400" />
                </div>
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Highest Carbon</span>
              </div>
              <div className="text-2xl font-bold text-red-400 mb-1">
                {highest.gwpPer1000sf.toLocaleString()}
                <span className="text-sm font-normal text-gray-500 ml-1">kg CO₂e</span>
              </div>
              <div className="text-sm text-gray-300 font-medium truncate">{highest.name}</div>
              <div className="text-xs text-gray-500 mt-0.5">per 1,000 SF</div>
            </CardContent>
          </Card>
        </div>

        {/* ── Controls ── */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {/* Sort toggle */}
          <div className="flex items-center gap-1 bg-gray-900 border border-gray-800 rounded-lg p-1">
            <Button
              size="sm"
              variant={sortMode === "carbon" ? "default" : "ghost"}
              className={`h-7 text-xs px-3 ${sortMode === "carbon" ? "bg-emerald-600 hover:bg-emerald-500 text-white" : "text-gray-400 hover:text-white"}`}
              onClick={() => setSortMode("carbon")}
            >
              <BarChart3 className="w-3.5 h-3.5 mr-1" />
              By Carbon
            </Button>
            <Button
              size="sm"
              variant={sortMode === "name" ? "default" : "ghost"}
              className={`h-7 text-xs px-3 ${sortMode === "name" ? "bg-emerald-600 hover:bg-emerald-500 text-white" : "text-gray-400 hover:text-white"}`}
              onClick={() => setSortMode("name")}
            >
              <Building2 className="w-3.5 h-3.5 mr-1" />
              By Name
            </Button>
          </div>

          {/* Tier filter */}
          <div className="flex items-center gap-1 bg-gray-900 border border-gray-800 rounded-lg p-1">
            <div className="flex items-center px-2">
              <Filter className="w-3.5 h-3.5 text-gray-500" />
            </div>
            {tierFilters.map(({ value, label }) => (
              <Button
                key={value}
                size="sm"
                variant="ghost"
                onClick={() => setTierFilter(value)}
                className={`h-7 text-xs px-3 ${
                  tierFilter === value
                    ? value === "ALL"
                      ? "bg-gray-700 text-white"
                      : value === "LOW"
                      ? "bg-emerald-600/30 text-emerald-400 border border-emerald-500/40"
                      : value === "MID"
                      ? "bg-yellow-600/30 text-yellow-400 border border-yellow-500/40"
                      : "bg-red-600/30 text-red-400 border border-red-500/40"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {label}
              </Button>
            ))}
          </div>

          <span className="text-xs text-gray-500 ml-1">
            {displayed.length} of {ASSEMBLIES.length} assemblies
          </span>
        </div>

        {/* ── Bar Chart ── */}
        <Card className="bg-gray-900 border-gray-800 mb-8">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-200 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              GWP A1–A3 per 1,000 SF (kg CO₂e)
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {displayed.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-gray-500 text-sm">
                No assemblies match the selected filter.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={displayed.length * 44 + 20}>
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 4, right: 80, bottom: 4, left: 8 }}
                  barCategoryGap="20%"
                >
                  <XAxis
                    type="number"
                    tick={{ fill: "#6b7280", fontSize: 11 }}
                    axisLine={{ stroke: "#374151" }}
                    tickLine={false}
                    tickFormatter={(v: number) => v.toLocaleString()}
                  />
                  <YAxis
                    type="category"
                    dataKey="shortName"
                    width={150}
                    tick={{ fill: "#d1d5db", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                  <Bar dataKey="gwpPer1000sf" radius={[0, 4, 4, 0]} label={<CustomBarLabel />}>
                    {chartData.map((entry) => (
                      <Cell key={entry.id} fill={TIER_COLORS[entry.tier]} opacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}

            {/* Legend */}
            <div className="flex items-center gap-5 mt-4 pt-4 border-t border-gray-800">
              {(["LOW", "MID", "HIGH"] as CarbonTier[]).map((t) => (
                <div key={t} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-sm"
                    style={{ backgroundColor: TIER_COLORS[t] }}
                  />
                  <span className="text-xs text-gray-400">{TIER_LABELS[t]}</span>
                  {t === "LOW" && <span className="text-xs text-gray-600">(&lt;5,000)</span>}
                  {t === "MID" && <span className="text-xs text-gray-600">(5,000–15,000)</span>}
                  {t === "HIGH" && <span className="text-xs text-gray-600">(&gt;15,000)</span>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ── Assembly Detail Cards ── */}
        <div className="mb-4">
          <h2 className="text-base font-semibold text-gray-200 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-400" />
            Assembly Details
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            All values per declared unit (A1–A3 stage). Carbon per 1,000 SF uses a conversion factor per assembly.
          </p>
        </div>

        {displayed.length === 0 ? (
          <div className="text-center py-16 text-gray-500 text-sm">
            No assemblies match the selected filter.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
            {displayed.map((a) => (
              <AssemblyCard key={a.id} assembly={a} />
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

// ─── Assembly Card ─────────────────────────────────────────────────────────────

interface AssemblyCardProps {
  assembly: Assembly;
}

function AssemblyCard({ assembly: a }: AssemblyCardProps) {
  return (
    <Card className="bg-gray-900 border-gray-800 hover:border-gray-700 transition-colors py-0 overflow-hidden">
      {/* Tier accent bar */}
      <div
        className="h-0.5 w-full"
        style={{ backgroundColor: TIER_COLORS[a.tier] }}
      />

      <CardContent className="p-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0">
            <p className="text-[10px] font-mono text-gray-500 mb-0.5">{a.id}</p>
            <h3 className="text-sm font-semibold text-white leading-snug">{a.name}</h3>
          </div>
          {a.epd ? (
            <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/30 text-[10px] shrink-0">
              EPD
            </Badge>
          ) : (
            <Badge className="bg-gray-800 text-gray-500 border-gray-700 text-[10px] shrink-0">
              No EPD
            </Badge>
          )}
        </div>

        {/* Carbon values */}
        <div className="bg-gray-800/60 rounded-lg p-3 mb-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">GWP / 1,000 SF</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">
                {a.gwpPer1000sf.toLocaleString()}
              </span>
              <span className="text-xs text-gray-500">kg CO₂e</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">GWP A1–A3</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-200">
                {a.gwpA1A3}
              </span>
              <span className="text-xs text-gray-500">kg CO₂e/{a.unit}</span>
            </div>
          </div>
        </div>

        {/* Tier badge */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-gray-500">Carbon Tier</span>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded border text-[11px] font-medium ${TIER_BG_CLASSES[a.tier]}`}
          >
            {a.tier === "LOW" && <Leaf className="w-3 h-3 mr-1" />}
            {TIER_LABELS[a.tier]}
          </span>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          <span className="text-[10px] px-2 py-0.5 bg-gray-800 text-gray-400 rounded-md border border-gray-700">
            {a.tags.assemblyType}
          </span>
          <span className="text-[10px] px-2 py-0.5 bg-gray-800 text-gray-400 rounded-md border border-gray-700">
            {a.tags.framingType}
          </span>
          <span className="text-[10px] px-2 py-0.5 bg-gray-800 text-gray-400 rounded-md border border-gray-700">
            {a.tags.finish}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
