import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import {
  Leaf,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  TrendingDown,
  BarChart3,
  TrendingUp,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Zone = "INTERIOR" | "CORE" | "EXTERIOR";
type CarbonTier = "LOW" | "MID" | "HIGH";
type FramingOption = 1 | 2 | 3;

interface EwsComponent {
  id: number;
  assemblySpecId: number;
  zone: string;
  layerOrder: number;
  layerName: string;
  framingOption: number | null;
  manufacturer: string | null;
  productName: string | null;
  epdNumber: string | null;
  dimensionParam: string | null;
  gwpValue: string | null;
  gwpUnits: string | null;
  declaredUnit: string | null;
  msfFactor: string | null;
  carbonPer1000sf: string | null;
  notes: string | null;
  createdAt: Date;
}

interface AssemblySpec {
  id: number;
  name: string;
  category: string;
  description: string | null;
  totalThicknessInches: string | null;
  totalRValue: string | null;
  fireRating: string | null;
  ulDesignNumber: string | null;
  stcRating: number | null;
  iicRating: number | null;
  totalCostPerSf: string | null;
  totalGwpPerSf: string | null;
  createdAt: Date;
  updatedAt: Date;
  epdNumber: string | null;
  gwpA1A3: string | null;
  gwpDeclaredUnit: string | null;
  gwpPer1000sf: string | null;
  gwpMsfFactor: string | null;
  carbonTier: string | null;
  assemblyTypeTags: string[] | null;
  framingTypeTags: string[] | null;
  exteriorFinishTags: string[] | null;
  certificationTags: string[] | null;
  components: EwsComponent[];
}

// ─── Zone colours ────────────────────────────────────────────────────────────

const ZONE_COLORS: Record<Zone, string> = {
  INTERIOR: "#60a5fa", // blue-400
  CORE: "#94a3b8",     // slate-400
  EXTERIOR: "#34d399", // emerald-400
};

const ZONE_BG: Record<Zone, string> = {
  INTERIOR: "bg-blue-400/20 text-blue-300 border-blue-400/30",
  CORE: "bg-slate-400/20 text-slate-300 border-slate-400/30",
  EXTERIOR: "bg-emerald-400/20 text-emerald-300 border-emerald-400/30",
};

const TIER_COLORS: Record<CarbonTier, string> = {
  LOW: "#10b981",
  MID: "#eab308",
  HIGH: "#ef4444",
};

const TIER_BG: Record<CarbonTier, string> = {
  LOW: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  MID: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  HIGH: "bg-red-500/20 text-red-300 border-red-500/30",
};

const FRAMING_LABELS: Record<FramingOption, string> = {
  1: "CFMF Studs",
  2: "HSS Mega Panel",
  3: "Unitized",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isZone(z: string): z is Zone {
  return z === "INTERIOR" || z === "CORE" || z === "EXTERIOR";
}

function isTier(t: string | null | undefined): t is CarbonTier {
  return t === "LOW" || t === "MID" || t === "HIGH";
}

function calcTotal(components: EwsComponent[], framingOption: FramingOption): number {
  return components.reduce((sum, c) => {
    const opt = c.framingOption as FramingOption | null;
    if (opt === null || opt === framingOption) {
      return sum + (parseFloat(c.carbonPer1000sf ?? "0") || 0);
    }
    return sum;
  }, 0);
}

function calcZoneTotals(
  components: EwsComponent[],
  framingOption: FramingOption
): Record<Zone, number> {
  const totals: Record<Zone, number> = { INTERIOR: 0, CORE: 0, EXTERIOR: 0 };
  for (const c of components) {
    const opt = c.framingOption as FramingOption | null;
    if (opt !== null && opt !== framingOption) continue;
    if (!isZone(c.zone)) continue;
    totals[c.zone] += parseFloat(c.carbonPer1000sf ?? "0") || 0;
  }
  return totals;
}

function fmtCarbon(value: number): string {
  return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function assemblyHasFramingOptions(a: AssemblySpec): boolean {
  return a.components.some((c) => c.framingOption !== null);
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────

interface TooltipPayloadEntry {
  name: string;
  value: number;
  fill: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
  assemblies: AssemblySpec[];
  framingOption: FramingOption;
}

function CustomBarTooltip({
  active,
  payload,
  label,
  assemblies,
  framingOption,
}: CustomTooltipProps) {
  if (!active || !payload || !payload.length || !label) return null;

  const assembly = assemblies.find((a) => a.name === label);
  if (!assembly) return null;

  const total = calcTotal(assembly.components, framingOption);
  const relevantComponents = assembly.components.filter((c) => {
    const opt = c.framingOption as FramingOption | null;
    return opt === null || opt === framingOption;
  });

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 shadow-2xl max-w-xs">
      <p className="text-white font-semibold text-sm mb-3">{label}</p>
      <div className="space-y-1.5 mb-3">
        {relevantComponents.map((c) => {
          const zone = isZone(c.zone) ? c.zone : "CORE";
          const carbon = parseFloat(c.carbonPer1000sf ?? "0") || 0;
          return (
            <div key={c.id} className="flex items-start gap-2 text-xs">
              <span
                className="mt-0.5 shrink-0 w-2 h-2 rounded-full"
                style={{ backgroundColor: ZONE_COLORS[zone] }}
              />
              <div className="flex-1 min-w-0">
                <span className="text-gray-200 truncate block">{c.layerName}</span>
                {c.manufacturer && (
                  <span className="text-gray-500 text-[10px]">{c.manufacturer}</span>
                )}
              </div>
              <span className="text-gray-300 font-mono shrink-0">{fmtCarbon(carbon)}</span>
            </div>
          );
        })}
      </div>
      <div className="border-t border-gray-700 pt-2 flex justify-between text-xs font-semibold">
        <span className="text-gray-400">Total</span>
        <span className="text-emerald-400">{fmtCarbon(total)} kg CO₂e</span>
      </div>
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  accent: string;
}

function KpiCard({ label, value, sub, icon, accent }: KpiCardProps) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-start gap-4">
      <div
        className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
        style={{ backgroundColor: `${accent}22` }}
      >
        <span style={{ color: accent }}>{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-1">{label}</p>
        <p className="text-white text-xl font-bold font-mono leading-none">{value}</p>
        <p className="text-gray-500 text-xs mt-1 truncate">{sub}</p>
      </div>
    </div>
  );
}

// ─── Framing Toggle ──────────────────────────────────────────────────────────

interface FramingToggleProps {
  selected: FramingOption;
  onChange: (opt: FramingOption) => void;
}

function FramingToggle({ selected, onChange }: FramingToggleProps) {
  const options: FramingOption[] = [1, 2, 3];
  return (
    <div className="flex gap-2 flex-wrap">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={[
            "px-4 py-2 rounded-lg border text-sm font-medium transition-all duration-150",
            selected === opt
              ? "bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20"
              : "bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-200",
          ].join(" ")}
        >
          <span className="text-[10px] font-mono mr-1.5 opacity-60">#{opt}</span>
          {FRAMING_LABELS[opt]}
        </button>
      ))}
    </div>
  );
}

// ─── Component detail row ─────────────────────────────────────────────────────

interface ComponentRowProps {
  component: EwsComponent;
  framingOption: FramingOption;
}

function ComponentRow({ component, framingOption }: ComponentRowProps) {
  const zone = isZone(component.zone) ? component.zone : "CORE";
  const carbon = parseFloat(component.carbonPer1000sf ?? "0") || 0;
  const isOptionSpecific = component.framingOption !== null;
  const isCurrentOption = component.framingOption === framingOption;

  return (
    <tr
      className={[
        "border-b border-gray-800 text-sm transition-colors",
        isOptionSpecific && !isCurrentOption
          ? "opacity-40"
          : "hover:bg-gray-800/50",
      ].join(" ")}
    >
      <td className="px-4 py-2.5">
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-medium ${ZONE_BG[zone]}`}
        >
          {zone}
        </span>
      </td>
      <td className="px-4 py-2.5 text-gray-200">
        <div className="flex items-center gap-2">
          {component.layerName}
          {component.dimensionParam && (
            <span className="text-gray-500 text-xs">({component.dimensionParam})</span>
          )}
          {isOptionSpecific && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700 font-mono">
              {FRAMING_LABELS[component.framingOption as FramingOption]}
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-2.5 text-gray-400">
        {component.manufacturer ?? "—"}
      </td>
      <td className="px-4 py-2.5 text-gray-400">
        {component.productName ?? "—"}
      </td>
      <td className="px-4 py-2.5">
        {component.epdNumber ? (
          <span className="font-mono text-xs text-emerald-400">{component.epdNumber}</span>
        ) : (
          <span className="text-gray-600">—</span>
        )}
      </td>
      <td className="px-4 py-2.5 text-right">
        {component.gwpValue ? (
          <span className="text-gray-300 font-mono text-xs">
            {parseFloat(component.gwpValue).toFixed(3)}
            {component.gwpUnits && (
              <span className="text-gray-600 ml-1">{component.gwpUnits}</span>
            )}
          </span>
        ) : (
          <span className="text-gray-600">—</span>
        )}
      </td>
      <td className="px-4 py-2.5 text-right">
        <span className="font-mono text-sm text-white font-medium">
          {fmtCarbon(carbon)}
        </span>
      </td>
    </tr>
  );
}

// ─── Assembly accordion card ──────────────────────────────────────────────────

interface AssemblyCardProps {
  assembly: AssemblySpec;
  framingOption: FramingOption;
  rank: number;
}

function AssemblyCard({ assembly, framingOption, rank }: AssemblyCardProps) {
  const [expanded, setExpanded] = useState(false);

  const zoneTotals = useMemo(
    () => calcZoneTotals(assembly.components, framingOption),
    [assembly.components, framingOption]
  );
  const total = useMemo(
    () => calcTotal(assembly.components, framingOption),
    [assembly.components, framingOption]
  );

  const tier = isTier(assembly.carbonTier) ? assembly.carbonTier : null;
  const relevantComponents = assembly.components.filter((c) => {
    const opt = c.framingOption as FramingOption | null;
    return opt === null || opt === framingOption;
  });

  // Mini zone bar (proportional)
  const zoneBar = (["INTERIOR", "CORE", "EXTERIOR"] as Zone[]).map((z) => ({
    zone: z,
    pct: total > 0 ? (zoneTotals[z] / total) * 100 : 0,
    color: ZONE_COLORS[z],
  }));

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      {/* Header row */}
      <button
        className="w-full px-5 py-4 flex items-center gap-4 hover:bg-gray-800/50 transition-colors text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        {/* Rank badge */}
        <span className="shrink-0 w-7 h-7 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-xs font-mono text-gray-400">
          {rank}
        </span>

        {/* Name + tags */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white font-semibold">{assembly.name}</span>
            {tier && (
              <Badge
                className={`text-[10px] px-1.5 py-0 border ${TIER_BG[tier]}`}
              >
                {tier}
              </Badge>
            )}
            {assembly.epdNumber && (
              <span className="text-[10px] font-mono text-gray-500 hidden sm:inline">
                EPD: {assembly.epdNumber}
              </span>
            )}
          </div>
          {/* Mini zone bar */}
          <div className="mt-2 flex rounded-full overflow-hidden h-1.5 w-full max-w-xs gap-px">
            {zoneBar.map(({ zone, pct, color }) =>
              pct > 0 ? (
                <div
                  key={zone}
                  style={{ width: `${pct}%`, backgroundColor: color }}
                  title={`${zone}: ${fmtCarbon(zoneTotals[zone])} kg CO₂e`}
                />
              ) : null
            )}
          </div>
        </div>

        {/* Total carbon */}
        <div className="shrink-0 text-right">
          <div className="text-white font-bold font-mono text-lg leading-none">
            {fmtCarbon(total)}
          </div>
          <div className="text-gray-500 text-xs mt-0.5">kg CO₂e / 1k SF</div>
        </div>

        {/* Chevron */}
        <span className="shrink-0 text-gray-500">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </button>

      {/* Expanded detail table */}
      {expanded && (
        <div className="border-t border-gray-800">
          {/* Zone summary row */}
          <div className="px-5 py-3 flex gap-6 bg-gray-950/60 flex-wrap">
            {(["INTERIOR", "CORE", "EXTERIOR"] as Zone[]).map((z) => (
              <div key={z} className="flex items-center gap-1.5 text-xs">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: ZONE_COLORS[z] }}
                />
                <span className="text-gray-400">{z}:</span>
                <span className="text-gray-200 font-mono font-medium">
                  {fmtCarbon(zoneTotals[z])}
                </span>
              </div>
            ))}
          </div>

          {/* Component table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-950/40">
                  <th className="px-4 py-2 text-left text-gray-500 font-medium uppercase tracking-wider text-[10px]">
                    Zone
                  </th>
                  <th className="px-4 py-2 text-left text-gray-500 font-medium uppercase tracking-wider text-[10px]">
                    Layer
                  </th>
                  <th className="px-4 py-2 text-left text-gray-500 font-medium uppercase tracking-wider text-[10px]">
                    Manufacturer
                  </th>
                  <th className="px-4 py-2 text-left text-gray-500 font-medium uppercase tracking-wider text-[10px]">
                    Product
                  </th>
                  <th className="px-4 py-2 text-left text-gray-500 font-medium uppercase tracking-wider text-[10px]">
                    EPD #
                  </th>
                  <th className="px-4 py-2 text-right text-gray-500 font-medium uppercase tracking-wider text-[10px]">
                    GWP
                  </th>
                  <th className="px-4 py-2 text-right text-gray-500 font-medium uppercase tracking-wider text-[10px]">
                    Carbon / 1k SF
                  </th>
                </tr>
              </thead>
              <tbody>
                {relevantComponents.map((c) => (
                  <ComponentRow
                    key={c.id}
                    component={c}
                    framingOption={framingOption}
                  />
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-700 bg-gray-900">
                  <td
                    colSpan={6}
                    className="px-4 py-3 text-gray-400 font-semibold text-xs uppercase tracking-wider"
                  >
                    Assembly Total
                  </td>
                  <td className="px-4 py-3 text-right font-bold font-mono text-emerald-400">
                    {fmtCarbon(total)} kg CO₂e
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Chart data shape ─────────────────────────────────────────────────────────

interface ChartDatum {
  name: string;
  INTERIOR: number;
  CORE: number;
  EXTERIOR: number;
  total: number;
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
        {/* Hero skeleton */}
        <div className="space-y-3">
          <Skeleton className="h-10 w-72 bg-gray-800" />
          <Skeleton className="h-5 w-[480px] max-w-full bg-gray-800" />
        </div>
        {/* KPI cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl bg-gray-800" />
          ))}
        </div>
        {/* Chart skeleton */}
        <Skeleton className="h-80 w-full rounded-xl bg-gray-800" />
        {/* Accordion skeletons */}
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl bg-gray-800" />
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center mb-6">
          <AlertCircle className="text-gray-400" size={28} />
        </div>
        <h2 className="text-2xl font-bold text-white mb-3">No Assembly Data Found</h2>
        <p className="text-gray-400 max-w-md">
          No assembly data found. Run the seed scripts to populate the carbon comparison data.
        </p>
      </main>
      <Footer />
    </div>
  );
}

// ─── Legend renderer ──────────────────────────────────────────────────────────

interface LegendEntry {
  value: string;
  color: string;
}

function ChartLegend({ items }: { items: LegendEntry[] }) {
  return (
    <div className="flex gap-5 justify-center mt-2 flex-wrap">
      {items.map(({ value, color }) => (
        <div key={value} className="flex items-center gap-1.5 text-xs text-gray-400">
          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
          {value}
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CarbonCompare() {
  const { data: assemblies, isLoading } = trpc.assemblySpecs.listWithComponents.useQuery();
  const [framingOption, setFramingOption] = useState<FramingOption>(1);
  const [expandedAll, setExpandedAll] = useState(false);

  // ── Derived chart data ────────────────────────────────────────────────────

  const chartData = useMemo<ChartDatum[]>(() => {
    if (!assemblies) return [];
    return assemblies
      .map((a) => {
        const zoneTotals = calcZoneTotals(a.components, framingOption);
        const total =
          zoneTotals.INTERIOR + zoneTotals.CORE + zoneTotals.EXTERIOR;
        return {
          name: a.name,
          INTERIOR: Math.round(zoneTotals.INTERIOR),
          CORE: Math.round(zoneTotals.CORE),
          EXTERIOR: Math.round(zoneTotals.EXTERIOR),
          total,
        };
      })
      .sort((a, b) => a.total - b.total);
  }, [assemblies, framingOption]);

  // ── Sorted assembly list (for accordion) ─────────────────────────────────

  const sortedAssemblies = useMemo<AssemblySpec[]>(() => {
    if (!assemblies) return [];
    return [...assemblies].sort((a, b) => {
      const ta = calcTotal(a.components, framingOption);
      const tb = calcTotal(b.components, framingOption);
      return ta - tb;
    });
  }, [assemblies, framingOption]);

  // ── KPI values ────────────────────────────────────────────────────────────

  const kpis = useMemo(() => {
    if (!sortedAssemblies.length) return null;
    const totals = sortedAssemblies.map((a) => calcTotal(a.components, framingOption));
    const lowest = totals[0];
    const highest = totals[totals.length - 1];
    const avg = totals.reduce((s, v) => s + v, 0) / totals.length;
    const lowestAssembly = sortedAssemblies[0];
    const highestAssembly = sortedAssemblies[sortedAssemblies.length - 1];
    return { lowest, highest, avg, lowestAssembly, highestAssembly };
  }, [sortedAssemblies, framingOption]);

  // ── Whether any assembly has framing options ──────────────────────────────

  const anyHasFraming = useMemo(
    () => (assemblies ?? []).some(assemblyHasFramingOptions),
    [assemblies]
  );

  // ── Render states ─────────────────────────────────────────────────────────

  if (isLoading) return <LoadingSkeleton />;
  if (!assemblies || assemblies.length === 0) return <EmptyState />;

  // ── Main render ───────────────────────────────────────────────────────────

  const legendItems: LegendEntry[] = [
    { value: "Interior", color: ZONE_COLORS.INTERIOR },
    { value: "Core", color: ZONE_COLORS.CORE },
    { value: "Exterior", color: ZONE_COLORS.EXTERIOR },
  ];

  // Dynamic chart height based on number of assemblies
  const chartHeight = Math.max(320, chartData.length * 56 + 60);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
        {/* ── Section 1: Hero ───────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
              <Leaf className="text-emerald-400" size={20} />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              Embodied Carbon Compare
            </h1>
          </div>
          <p className="text-gray-400 text-base max-w-2xl leading-relaxed">
            Interactive comparison of exterior wall systems by embodied carbon intensity{" "}
            <span className="text-gray-300">(kg CO₂e per 1,000 SF)</span>. Stacked by
            interior, core, and exterior zone contributions.
          </p>
        </section>

        {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
        {kpis && (
          <section>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <KpiCard
                label="Lowest Carbon"
                value={`${fmtCarbon(kpis.lowest)} kg`}
                sub={kpis.lowestAssembly.name}
                icon={<TrendingDown size={18} />}
                accent="#10b981"
              />
              <KpiCard
                label="Average Carbon"
                value={`${fmtCarbon(kpis.avg)} kg`}
                sub={`Across ${sortedAssemblies.length} assemblies`}
                icon={<BarChart3 size={18} />}
                accent="#94a3b8"
              />
              <KpiCard
                label="Highest Carbon"
                value={`${fmtCarbon(kpis.highest)} kg`}
                sub={kpis.highestAssembly.name}
                icon={<TrendingUp size={18} />}
                accent="#ef4444"
              />
            </div>
          </section>
        )}

        {/* ── Section 2: Framing Option Toggle ─────────────────────────────── */}
        {anyHasFraming && (
          <section>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-base font-semibold text-white">Framing Option</h2>
                <Badge className="bg-gray-800 text-gray-400 border-gray-700 text-[10px]">
                  EWS-2A through EWS-5
                </Badge>
              </div>
              <p className="text-gray-500 text-sm mb-4">
                Select a framing strategy to recalculate totals. Shared components (null
                framing option) are always included.
              </p>
              <FramingToggle selected={framingOption} onChange={setFramingOption} />
            </div>
          </section>
        )}

        {/* ── Section 3: Stacked Horizontal Bar Chart ───────────────────────── */}
        <section>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 sm:p-6">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Carbon Intensity by Assembly
                </h2>
                <p className="text-gray-500 text-sm mt-0.5">
                  Sorted ascending — lower is better. Stacked by zone.
                </p>
              </div>
              <ChartLegend items={legendItems} />
            </div>

            <div style={{ height: chartHeight }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={chartData}
                  margin={{ top: 0, right: 80, bottom: 0, left: 10 }}
                  barCategoryGap="20%"
                >
                  <XAxis
                    type="number"
                    tick={{ fill: "#6b7280", fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: "#374151" }}
                    tickFormatter={(v: number) =>
                      v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
                    }
                    label={{
                      value: "kg CO₂e / 1,000 SF",
                      position: "insideBottomRight",
                      offset: -10,
                      fill: "#6b7280",
                      fontSize: 11,
                    }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={110}
                    tick={{ fill: "#d1d5db", fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    content={
                      <CustomBarTooltip
                        assemblies={assemblies}
                        framingOption={framingOption}
                      />
                    }
                    cursor={{ fill: "rgba(255,255,255,0.03)" }}
                  />
                  <Bar
                    dataKey="INTERIOR"
                    stackId="a"
                    fill={ZONE_COLORS.INTERIOR}
                    radius={[0, 0, 0, 0]}
                    maxBarSize={40}
                  />
                  <Bar
                    dataKey="CORE"
                    stackId="a"
                    fill={ZONE_COLORS.CORE}
                    maxBarSize={40}
                  />
                  <Bar
                    dataKey="EXTERIOR"
                    stackId="a"
                    fill={ZONE_COLORS.EXTERIOR}
                    radius={[0, 4, 4, 0]}
                    maxBarSize={40}
                    label={{
                      position: "right",
                      fill: "#9ca3af",
                      fontSize: 10,
                      formatter: (v: number) => {
                        // v here is the EXTERIOR value, not total — we need total
                        return "";
                      },
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Total labels rendered outside Recharts for reliability */}
            <div className="mt-2 text-right">
              <p className="text-gray-600 text-[10px]">
                Values shown in kg CO₂e per 1,000 SF facade area
              </p>
            </div>
          </div>
        </section>

        {/* ── Section 4: Assembly Detail Accordion ─────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">Assembly Details</h2>
              <p className="text-gray-500 text-sm mt-0.5">
                Expand each assembly to see full component-level carbon data
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 bg-transparent"
              onClick={() => setExpandedAll((v) => !v)}
            >
              {expandedAll ? "Collapse All" : "Expand All"}
            </Button>
          </div>

          <div className="space-y-3">
            {sortedAssemblies.map((assembly, idx) => (
              <AssemblyCardControlled
                key={assembly.id}
                assembly={assembly}
                framingOption={framingOption}
                rank={idx + 1}
                forceExpanded={expandedAll}
              />
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

// ─── Controlled Assembly Card (respects forceExpanded) ────────────────────────

interface AssemblyCardControlledProps {
  assembly: AssemblySpec;
  framingOption: FramingOption;
  rank: number;
  forceExpanded: boolean;
}

function AssemblyCardControlled({
  assembly,
  framingOption,
  rank,
  forceExpanded,
}: AssemblyCardControlledProps) {
  const [localExpanded, setLocalExpanded] = useState(false);
  const expanded = forceExpanded || localExpanded;

  const zoneTotals = useMemo(
    () => calcZoneTotals(assembly.components, framingOption),
    [assembly.components, framingOption]
  );
  const total = useMemo(
    () => calcTotal(assembly.components, framingOption),
    [assembly.components, framingOption]
  );

  const tier = isTier(assembly.carbonTier) ? assembly.carbonTier : null;

  const relevantComponents = assembly.components.filter((c) => {
    const opt = c.framingOption as FramingOption | null;
    return opt === null || opt === framingOption;
  });

  // Mini zone bar (proportional)
  const zoneBar = (["INTERIOR", "CORE", "EXTERIOR"] as Zone[]).map((z) => ({
    zone: z,
    pct: total > 0 ? (zoneTotals[z] / total) * 100 : 0,
    color: ZONE_COLORS[z],
    value: zoneTotals[z],
  }));

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      {/* Header row */}
      <button
        className="w-full px-5 py-4 flex items-center gap-4 hover:bg-gray-800/50 transition-colors text-left"
        onClick={() => setLocalExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        {/* Rank badge */}
        <span className="shrink-0 w-7 h-7 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-xs font-mono text-gray-400">
          {rank}
        </span>

        {/* Name + tags + zone bar */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white font-semibold text-sm sm:text-base">
              {assembly.name}
            </span>
            {tier && (
              <span
                className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-medium ${TIER_BG[tier]}`}
              >
                {tier}
              </span>
            )}
            {assembly.epdNumber && (
              <span className="text-[10px] font-mono text-gray-500 hidden sm:inline">
                EPD: {assembly.epdNumber}
              </span>
            )}
          </div>

          {/* Zone mini-bar */}
          <div className="mt-2 flex rounded-full overflow-hidden h-1.5 w-full max-w-xs gap-px">
            {zoneBar.map(({ zone, pct, color, value }) =>
              pct > 0 ? (
                <div
                  key={zone}
                  style={{ width: `${pct}%`, backgroundColor: color }}
                  title={`${zone}: ${fmtCarbon(value)} kg CO₂e`}
                />
              ) : null
            )}
          </div>

          {/* Zone labels — visible on wider screens */}
          <div className="mt-1.5 hidden sm:flex gap-3">
            {zoneBar.map(({ zone, pct, color, value }) =>
              pct > 0 ? (
                <div key={zone} className="flex items-center gap-1 text-[10px] text-gray-500">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  {zone.charAt(0) + zone.slice(1).toLowerCase()}:{" "}
                  <span className="text-gray-400">{fmtCarbon(value)}</span>
                </div>
              ) : null
            )}
          </div>
        </div>

        {/* Total */}
        <div className="shrink-0 text-right">
          <div
            className="text-white font-bold font-mono text-base sm:text-lg leading-none"
            style={{ color: tier ? TIER_COLORS[tier] : "#ffffff" }}
          >
            {fmtCarbon(total)}
          </div>
          <div className="text-gray-500 text-[10px] mt-0.5">kg CO₂e / 1k SF</div>
        </div>

        {/* Chevron */}
        <span className="shrink-0 text-gray-500">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-gray-800">
          {/* Zone summary strip */}
          <div className="px-5 py-3 flex gap-6 bg-gray-950/60 flex-wrap border-b border-gray-800">
            {(["INTERIOR", "CORE", "EXTERIOR"] as Zone[]).map((z) => (
              <div key={z} className="flex items-center gap-2 text-xs">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: ZONE_COLORS[z] }}
                />
                <span className="text-gray-400">{z}:</span>
                <span className="text-gray-200 font-mono font-medium">
                  {fmtCarbon(zoneTotals[z])} kg
                </span>
                {total > 0 && (
                  <span className="text-gray-600">
                    ({((zoneTotals[z] / total) * 100).toFixed(1)}%)
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Component table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-950/40">
                  <th className="px-4 py-2.5 text-left text-gray-500 font-medium uppercase tracking-wider text-[10px] whitespace-nowrap">
                    Zone
                  </th>
                  <th className="px-4 py-2.5 text-left text-gray-500 font-medium uppercase tracking-wider text-[10px]">
                    Layer
                  </th>
                  <th className="px-4 py-2.5 text-left text-gray-500 font-medium uppercase tracking-wider text-[10px]">
                    Manufacturer
                  </th>
                  <th className="px-4 py-2.5 text-left text-gray-500 font-medium uppercase tracking-wider text-[10px]">
                    Product
                  </th>
                  <th className="px-4 py-2.5 text-left text-gray-500 font-medium uppercase tracking-wider text-[10px] whitespace-nowrap">
                    EPD #
                  </th>
                  <th className="px-4 py-2.5 text-right text-gray-500 font-medium uppercase tracking-wider text-[10px]">
                    GWP
                  </th>
                  <th className="px-4 py-2.5 text-right text-gray-500 font-medium uppercase tracking-wider text-[10px] whitespace-nowrap">
                    Carbon / 1k SF
                  </th>
                </tr>
              </thead>
              <tbody>
                {relevantComponents.map((c) => {
                  const zone = isZone(c.zone) ? c.zone : "CORE";
                  const carbon = parseFloat(c.carbonPer1000sf ?? "0") || 0;
                  const isOptionSpecific = c.framingOption !== null;

                  return (
                    <tr
                      key={c.id}
                      className="border-b border-gray-800 hover:bg-gray-800/40 transition-colors"
                    >
                      <td className="px-4 py-2.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-medium ${ZONE_BG[zone]}`}
                        >
                          {zone}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-200 text-sm">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span>{c.layerName}</span>
                          {c.dimensionParam && (
                            <span className="text-gray-500 text-xs">
                              ({c.dimensionParam})
                            </span>
                          )}
                          {isOptionSpecific && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700 font-mono whitespace-nowrap">
                              {FRAMING_LABELS[c.framingOption as FramingOption]}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-gray-400 text-sm">
                        {c.manufacturer ?? "—"}
                      </td>
                      <td className="px-4 py-2.5 text-gray-400 text-sm max-w-[160px]">
                        <span className="block truncate" title={c.productName ?? undefined}>
                          {c.productName ?? "—"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        {c.epdNumber ? (
                          <span className="font-mono text-xs text-emerald-400">
                            {c.epdNumber}
                          </span>
                        ) : (
                          <span className="text-gray-600 text-sm">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {c.gwpValue ? (
                          <span className="text-gray-300 font-mono text-xs">
                            {parseFloat(c.gwpValue).toFixed(3)}
                            {c.gwpUnits && (
                              <span className="text-gray-600 ml-1 text-[10px]">
                                {c.gwpUnits}
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-gray-600 text-sm">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span className="font-mono text-sm text-white font-medium">
                          {fmtCarbon(carbon)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-700 bg-gray-900/80">
                  <td
                    colSpan={6}
                    className="px-4 py-3 text-gray-400 font-semibold text-xs uppercase tracking-wider"
                  >
                    Assembly Total
                    <span className="ml-2 text-gray-600 font-normal normal-case">
                      ({relevantComponents.length} components)
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-bold font-mono text-emerald-400">
                    {fmtCarbon(total)} kg CO₂e
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Notes section if any component has notes */}
          {relevantComponents.some((c) => c.notes) && (
            <div className="px-5 py-3 bg-gray-950/40 border-t border-gray-800">
              <p className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-2">
                Notes
              </p>
              <div className="space-y-1.5">
                {relevantComponents
                  .filter((c) => c.notes)
                  .map((c) => (
                    <p key={c.id} className="text-gray-400 text-xs leading-relaxed">
                      <span className="text-gray-500 font-medium">{c.layerName}:</span>{" "}
                      {c.notes}
                    </p>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
