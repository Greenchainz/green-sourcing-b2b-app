import { useState, useMemo, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import {
  Leaf,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  TrendingDown,
  BarChart3,
  TrendingUp,
  Plus,
  X,
  Share2,
  CheckCircle2,
  XCircle,
  Layers,
  FlaskConical,
} from "lucide-react";
import { useSearch, useLocation } from "wouter";
import { toast } from "sonner";

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

// Material type returned by trpc.materials.getById
interface MaterialData {
  id: number;
  name: string;
  productName: string | null;
  category: string;
  subcategory: string | null;
  gwpValue: string | null;
  embodiedCarbonPer1000sf: string | null;
  rValue: string | null;
  hasEpd: boolean;
  hasHpd: boolean;
  recycledContentPct: string | null;
  leadTimeDays: number | null;
  usManufactured: boolean;
  pricePerUnit: string | null;
  manufacturerName: string | null;
  [key: string]: unknown;
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

// Material compare colors
const MATERIAL_COLORS = [
  "#16a34a", // green-600
  "#3b82f6", // blue-500
  "#f59e0b", // amber-500
  "#a855f7", // purple-500
];

const MATERIAL_RADAR_COLORS = [
  "#16a34a",
  "#3b82f6",
  "#f59e0b",
  "#a855f7",
];

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

function gwpBarColor(gwp: number): string {
  if (gwp < 100) return "#16a34a"; // green-600
  if (gwp < 500) return "#eab308"; // yellow-500
  return "#ef4444";                // red-500
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + "…" : s;
}

// ─── Custom tooltip (assembly) ────────────────────────────────────────────────

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
        <div className="space-y-3">
          <Skeleton className="h-10 w-72 bg-gray-800" />
          <Skeleton className="h-5 w-[480px] max-w-full bg-gray-800" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl bg-gray-800" />
          ))}
        </div>
        <Skeleton className="h-80 w-full rounded-xl bg-gray-800" />
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

// ─── Material GWP bar tooltip ─────────────────────────────────────────────────

interface MatGwpTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; payload: { name: string; gwp: number } }>;
  label?: string;
}

function MatGwpTooltip({ active, payload, label }: MatGwpTooltipProps) {
  if (!active || !payload?.length) return null;
  const gwp = payload[0].value;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-3 shadow-2xl text-xs">
      <p className="text-white font-semibold mb-1">{label}</p>
      <p className="text-gray-400">
        GWP: <span className="text-white font-mono font-bold">{gwp.toFixed(2)} kgCO₂e</span>
      </p>
    </div>
  );
}

// ─── Material Radar Tooltip ───────────────────────────────────────────────────

interface MatRadarTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}

function MatRadarTooltip({ active, payload, label }: MatRadarTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-3 shadow-2xl text-xs">
      <p className="text-white font-semibold mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
          <span className="text-gray-400">{p.name}:</span>
          <span className="text-white font-mono">{p.value.toFixed(1)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Single material fetcher (hook wrapper) ───────────────────────────────────

function useMaterialById(id: number | null) {
  return trpc.materials.getById.useQuery(
    { id: id ?? 0 },
    { enabled: id !== null && id > 0 }
  );
}

// ─── Material Search Row ──────────────────────────────────────────────────────

interface MaterialSearchRowProps {
  onAdd: (id: number) => void;
  existingIds: number[];
  disabled: boolean;
}

function MaterialSearchRow({ onAdd, existingIds, disabled }: MaterialSearchRowProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const { data: results = [], isFetching } = trpc.materials.list.useQuery(
    { search: searchTerm, limit: 8 } as any,
    { enabled: searchTerm.trim().length >= 2 }
  );
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <div className="flex gap-2">
        <Input
          className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 focus:border-emerald-500"
          placeholder="Search materials to add…"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setOpen(e.target.value.trim().length >= 2);
          }}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          disabled={disabled}
        />
      </div>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden">
          {isFetching ? (
            <div className="px-4 py-3 text-sm text-gray-500">Searching…</div>
          ) : (results as any[]).length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-500">No results found</div>
          ) : (
            <ul>
              {(results as any[]).map((r: any) => {
                const mat = r.material ?? r;
                const alreadyAdded = existingIds.includes(mat.id);
                return (
                  <li key={mat.id}>
                    <button
                      className={[
                        "w-full text-left px-4 py-3 text-sm flex items-center justify-between gap-3 transition-colors",
                        alreadyAdded
                          ? "opacity-40 cursor-not-allowed"
                          : "hover:bg-gray-800 cursor-pointer",
                      ].join(" ")}
                      onMouseDown={() => {
                        if (!alreadyAdded) {
                          onAdd(mat.id);
                          setSearchTerm("");
                          setOpen(false);
                        }
                      }}
                      disabled={alreadyAdded}
                    >
                      <div>
                        <span className="text-white font-medium">{mat.name}</span>
                        {mat.productName && (
                          <span className="text-gray-500 text-xs ml-2">{mat.productName}</span>
                        )}
                        <span className="block text-gray-500 text-xs mt-0.5">{mat.category}</span>
                      </div>
                      {alreadyAdded ? (
                        <span className="text-gray-500 text-xs">Added</span>
                      ) : (
                        <Plus size={14} className="text-emerald-400 shrink-0" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Material Compare Panel ───────────────────────────────────────────────────

interface MaterialComparePanelProps {
  materialIds: number[];
  onIdsChange: (ids: number[]) => void;
}

function MaterialComparePanel({ materialIds, onIdsChange }: MaterialComparePanelProps) {
  // Fetch up to 4 materials
  const q0 = useMaterialById(materialIds[0] ?? null);
  const q1 = useMaterialById(materialIds[1] ?? null);
  const q2 = useMaterialById(materialIds[2] ?? null);
  const q3 = useMaterialById(materialIds[3] ?? null);

  const queries = [q0, q1, q2, q3].slice(0, materialIds.length);
  const loadedMaterials: (MaterialData | null)[] = queries.map((q) => (q.data as MaterialData | null | undefined) ?? null);
  const isLoading = queries.some((q) => q.isLoading);

  // Add / remove handlers
  const handleAdd = useCallback(
    (id: number) => {
      if (materialIds.length >= 4) return;
      if (materialIds.includes(id)) return;
      onIdsChange([...materialIds, id]);
    },
    [materialIds, onIdsChange]
  );

  const handleRemove = useCallback(
    (id: number) => {
      onIdsChange(materialIds.filter((x) => x !== id));
    },
    [materialIds, onIdsChange]
  );

  // Share comparison
  const handleShare = useCallback(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("mode", "material");
    url.searchParams.set("ids", materialIds.join(","));
    navigator.clipboard.writeText(url.toString()).then(() => {
      toast.success("Comparison URL copied to clipboard");
    });
  }, [materialIds]);

  // ── GWP bar chart data ────────────────────────────────────────────────────

  const gwpData = useMemo(() => {
    return loadedMaterials
      .map((m, i) => {
        if (!m) return null;
        const gwp = parseFloat(m.gwpValue ?? "0") || 0;
        return {
          name: truncate(m.name ?? m.productName ?? `Material ${i + 1}`, 20),
          gwp,
          fill: gwpBarColor(gwp),
          color: MATERIAL_COLORS[i],
        };
      })
      .filter(Boolean) as { name: string; gwp: number; fill: string; color: string }[];
  }, [loadedMaterials]);

  // ── Radar chart data ──────────────────────────────────────────────────────

  const radarData = useMemo(() => {
    const mats = loadedMaterials.filter(Boolean) as MaterialData[];
    if (mats.length === 0) return [];

    // Extract raw values
    const rValues = mats.map((m) => parseFloat(m.rValue ?? "0") || 0);
    const recycled = mats.map((m) => parseFloat(m.recycledContentPct ?? "0") || 0);
    const gwps = mats.map((m) => parseFloat(m.gwpValue ?? "0") || 0);
    const prices = mats.map((m) => parseFloat(m.pricePerUnit ?? "0") || 0);
    const leads = mats.map((m) => m.leadTimeDays ?? 0);

    // Normalize to 0-100
    const normalize = (vals: number[], invert = false): number[] => {
      const min = Math.min(...vals);
      const max = Math.max(...vals);
      if (max === min) return vals.map(() => 50);
      return vals.map((v) => {
        const pct = ((v - min) / (max - min)) * 100;
        return invert ? 100 - pct : pct;
      });
    };

    const normR = normalize(rValues);
    const normRec = normalize(recycled);
    const normGwp = normalize(gwps, true); // lower gwp → higher score
    const normPrice = normalize(prices, true); // lower price → higher score
    const normLead = normalize(leads, true); // shorter lead time → higher score

    const axes = [
      { key: "R-Value", scores: normR },
      { key: "Recycled Content", scores: normRec },
      { key: "GWP Score", scores: normGwp },
      { key: "Price Score", scores: normPrice },
      { key: "Lead Time Score", scores: normLead },
    ];

    return axes.map(({ key, scores }) => {
      const entry: Record<string, string | number> = { subject: key };
      mats.forEach((m, i) => {
        entry[m.name ?? `Material ${i + 1}`] = Math.round(scores[i]);
      });
      return entry;
    });
  }, [loadedMaterials]);

  // ── Cost table data ───────────────────────────────────────────────────────

  const costRows = useMemo(() => {
    const mats = loadedMaterials.filter(Boolean) as MaterialData[];
    const prices = mats.map((m) => parseFloat(m.pricePerUnit ?? "0") || 0);
    const minPrice = Math.min(...prices.filter((p) => p > 0));
    return mats.map((m, i) => {
      const price = parseFloat(m.pricePerUnit ?? "0") || 0;
      const totalEst = price * 1000; // per 1000 SF
      return {
        id: m.id,
        name: m.name,
        pricePerUnit: price,
        leadTimeDays: m.leadTimeDays,
        totalEst,
        isLowest: price > 0 && price === minPrice,
        color: MATERIAL_COLORS[i],
      };
    });
  }, [loadedMaterials]);

  // ── LEED credits ──────────────────────────────────────────────────────────

  const leedRows = useMemo(() => {
    const mats = loadedMaterials.filter(Boolean) as MaterialData[];
    return mats.map((m, i) => {
      const credits: string[] = [];
      if (m.hasEpd) credits.push("MR Credit: EPD Disclosure");
      if (m.hasHpd) credits.push("EQ Credit: Material Ingredients");
      if (m.usManufactured) credits.push("MR Credit: Regional Materials");
      if ((parseFloat(m.recycledContentPct ?? "0") || 0) > 0) credits.push("MR Credit: Recycled Content");
      return { id: m.id, name: m.name, credits, color: MATERIAL_COLORS[i] };
    });
  }, [loadedMaterials]);

  const allCredits = useMemo(() => {
    const set = new Set<string>();
    leedRows.forEach((r) => r.credits.forEach((c) => set.add(c)));
    return Array.from(set).sort();
  }, [leedRows]);

  // ── Custom bar shape for colored bars ─────────────────────────────────────

  const renderCustomBar = (props: any) => {
    const { x, y, width, height, fill } = props;
    return <rect x={x} y={y} width={width} height={height} fill={fill} rx={4} ry={4} />;
  };

  // ── Empty placeholder ─────────────────────────────────────────────────────

  if (materialIds.length === 0) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold text-white">Material Compare</h2>
            <p className="text-gray-500 text-sm mt-0.5">
              Compare 2–4 materials side by side across GWP, specs, cost, and LEED credits.
            </p>
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <p className="text-gray-500 text-sm mb-4">Add materials to start comparing (up to 4):</p>
          <MaterialSearchRow onAdd={handleAdd} existingIds={materialIds} disabled={false} />
        </div>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center mb-6">
            <FlaskConical className="text-gray-400" size={28} />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">No Materials Selected</h3>
          <p className="text-gray-500 max-w-sm">
            Search for materials above or use a URL with <code className="text-emerald-400 text-xs">?mode=material&ids=1,2,3</code> to pre-load a comparison.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ── Header / Controls ──────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-white">Material Compare</h2>
          <p className="text-gray-500 text-sm mt-0.5">
            Comparing {materialIds.length} material{materialIds.length !== 1 ? "s" : ""} — side by side across GWP, specs, cost, and LEED credits.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <Button
            variant="outline"
            size="sm"
            className="border-gray-700 text-gray-300 hover:border-emerald-500 hover:text-emerald-400 gap-1.5"
            onClick={handleShare}
          >
            <Share2 size={14} />
            Share Comparison
          </Button>
        </div>
      </div>

      {/* ── Selected material chips + search ─────────────────────────────── */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap gap-2">
          {materialIds.map((id, i) => {
            const mat = loadedMaterials[i];
            return (
              <div
                key={id}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm"
                style={{
                  borderColor: `${MATERIAL_COLORS[i]}66`,
                  backgroundColor: `${MATERIAL_COLORS[i]}18`,
                  color: MATERIAL_COLORS[i],
                }}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: MATERIAL_COLORS[i] }}
                />
                {mat ? truncate(mat.name ?? `#${id}`, 24) : `Loading #${id}…`}
                <button
                  onClick={() => handleRemove(id)}
                  className="ml-1 opacity-60 hover:opacity-100 transition-opacity"
                  title="Remove"
                >
                  <X size={12} />
                </button>
              </div>
            );
          })}
          {materialIds.length < 4 && (
            <span className="text-gray-500 text-xs self-center">
              ({4 - materialIds.length} more slot{4 - materialIds.length !== 1 ? "s" : ""} available)
            </span>
          )}
        </div>
        {materialIds.length < 4 && (
          <MaterialSearchRow onAdd={handleAdd} existingIds={materialIds} disabled={materialIds.length >= 4} />
        )}
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-48 rounded-xl bg-gray-800" />
          ))}
        </div>
      )}

      {!isLoading && (
        <>
          {/* ── GWP Bar Chart ─────────────────────────────────────────────── */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 sm:p-6">
            <div className="mb-4">
              <h3 className="text-base font-semibold text-white">GWP Comparison</h3>
              <p className="text-gray-500 text-sm mt-0.5">
                Global Warming Potential (kgCO₂e per declared unit). Green &lt;100, Yellow &lt;500, Red ≥500.
              </p>
            </div>
            {gwpData.length === 0 ? (
              <p className="text-gray-500 text-sm py-6 text-center">No GWP data available for selected materials.</p>
            ) : (
              <div style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={gwpData}
                    margin={{ top: 10, right: 20, bottom: 10, left: 10 }}
                    barCategoryGap="30%"
                  >
                    <XAxis
                      dataKey="name"
                      tick={{ fill: "#d1d5db", fontSize: 11 }}
                      tickLine={false}
                      axisLine={{ stroke: "#374151" }}
                    />
                    <YAxis
                      tick={{ fill: "#6b7280", fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      label={{
                        value: "kgCO₂e",
                        angle: -90,
                        position: "insideLeft",
                        fill: "#6b7280",
                        fontSize: 11,
                        offset: 10,
                      }}
                    />
                    <Tooltip content={<MatGwpTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                    <Bar
                      dataKey="gwp"
                      name="GWP"
                      shape={renderCustomBar}
                      maxBarSize={72}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* ── Radar Chart ───────────────────────────────────────────────── */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 sm:p-6">
            <div className="mb-4">
              <h3 className="text-base font-semibold text-white">Spec Radar</h3>
              <p className="text-gray-500 text-sm mt-0.5">
                Normalized 0–100 scores across key dimensions. Inverted axes: higher is always better.
              </p>
            </div>
            {radarData.length === 0 || loadedMaterials.filter(Boolean).length === 0 ? (
              <p className="text-gray-500 text-sm py-6 text-center">Not enough data to render radar chart.</p>
            ) : (
              <>
                <div style={{ height: 340 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData} margin={{ top: 20, right: 40, bottom: 20, left: 40 }}>
                      <PolarGrid stroke="#374151" />
                      <PolarAngleAxis
                        dataKey="subject"
                        tick={{ fill: "#9ca3af", fontSize: 11 }}
                      />
                      <PolarRadiusAxis
                        angle={90}
                        domain={[0, 100]}
                        tick={{ fill: "#6b7280", fontSize: 9 }}
                        tickCount={4}
                      />
                      <Tooltip content={<MatRadarTooltip />} />
                      {(loadedMaterials.filter(Boolean) as MaterialData[]).map((m, i) => (
                        <Radar
                          key={m.id}
                          name={truncate(m.name, 20)}
                          dataKey={m.name}
                          stroke={MATERIAL_RADAR_COLORS[i]}
                          fill={MATERIAL_RADAR_COLORS[i]}
                          fillOpacity={0.15}
                          strokeWidth={2}
                        />
                      ))}
                      <Legend
                        formatter={(value: string) => (
                          <span className="text-xs text-gray-400">{truncate(value, 20)}</span>
                        )}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 flex gap-4 flex-wrap justify-center">
                  {(loadedMaterials.filter(Boolean) as MaterialData[]).map((m, i) => (
                    <div key={m.id} className="flex items-center gap-1.5 text-xs text-gray-400">
                      <span
                        className="w-3 h-3 rounded-sm"
                        style={{ backgroundColor: MATERIAL_RADAR_COLORS[i] }}
                      />
                      {truncate(m.name, 20)}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* ── Cost Comparison Table ─────────────────────────────────────── */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 sm:p-6">
            <div className="mb-4">
              <h3 className="text-base font-semibold text-white">Cost Comparison</h3>
              <p className="text-gray-500 text-sm mt-0.5">
                Estimated costs at 1,000 SF. Lowest price highlighted in green.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left px-3 py-2.5 text-gray-500 font-medium text-xs uppercase tracking-wider">
                      Material
                    </th>
                    <th className="text-right px-3 py-2.5 text-gray-500 font-medium text-xs uppercase tracking-wider">
                      Price / Unit
                    </th>
                    <th className="text-right px-3 py-2.5 text-gray-500 font-medium text-xs uppercase tracking-wider">
                      Lead Time
                    </th>
                    <th className="text-right px-3 py-2.5 text-gray-500 font-medium text-xs uppercase tracking-wider">
                      Total Est. (1,000 SF)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {costRows.map((row) => (
                    <tr
                      key={row.id}
                      className={[
                        "border-b border-gray-800 transition-colors hover:bg-gray-800/40",
                        row.isLowest ? "bg-emerald-500/5" : "",
                      ].join(" ")}
                    >
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: row.color }}
                          />
                          <span className={row.isLowest ? "text-emerald-300 font-medium" : "text-gray-200"}>
                            {truncate(row.name ?? "", 28)}
                          </span>
                          {row.isLowest && (
                            <Badge className="text-[9px] px-1.5 py-0 bg-emerald-500/20 text-emerald-400 border-emerald-500/30 border">
                              Lowest
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className={`px-3 py-3 text-right font-mono ${row.isLowest ? "text-emerald-400 font-semibold" : "text-gray-300"}`}>
                        {row.pricePerUnit > 0
                          ? `$${row.pricePerUnit.toFixed(2)}`
                          : <span className="text-gray-600">—</span>}
                      </td>
                      <td className="px-3 py-3 text-right text-gray-400 font-mono">
                        {row.leadTimeDays != null
                          ? `${row.leadTimeDays}d`
                          : <span className="text-gray-600">—</span>}
                      </td>
                      <td className={`px-3 py-3 text-right font-mono font-semibold ${row.isLowest ? "text-emerald-400" : "text-gray-200"}`}>
                        {row.totalEst > 0
                          ? `$${row.totalEst.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
                          : <span className="text-gray-600 font-normal">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── LEED Impact Summary ───────────────────────────────────────── */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 sm:p-6">
            <div className="mb-4">
              <h3 className="text-base font-semibold text-white">LEED Impact Summary</h3>
              <p className="text-gray-500 text-sm mt-0.5">
                Which LEED credits each material contributes to, based on available certifications and attributes.
              </p>
            </div>
            {allCredits.length === 0 ? (
              <p className="text-gray-500 text-sm py-4 text-center">
                No LEED credit data available for selected materials.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left px-3 py-2.5 text-gray-500 font-medium text-xs uppercase tracking-wider min-w-[200px]">
                        LEED Credit
                      </th>
                      {leedRows.map((row, i) => (
                        <th
                          key={row.id}
                          className="text-center px-3 py-2.5 text-xs font-medium uppercase tracking-wider"
                          style={{ color: row.color }}
                        >
                          {truncate(row.name ?? "", 16)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {allCredits.map((credit) => (
                      <tr key={credit} className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors">
                        <td className="px-3 py-3 text-gray-300 text-xs">{credit}</td>
                        {leedRows.map((row) => (
                          <td key={row.id} className="px-3 py-3 text-center">
                            {row.credits.includes(credit) ? (
                              <CheckCircle2 size={16} className="text-emerald-400 mx-auto" />
                            ) : (
                              <XCircle size={16} className="text-gray-700 mx-auto" />
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Assembly Compare Panel (wraps all existing functionality) ────────────────

interface AssemblyComparePanelProps {
  assemblies: AssemblySpec[];
}

function AssemblyComparePanel({ assemblies }: AssemblyComparePanelProps) {
  const [framingOption, setFramingOption] = useState<FramingOption>(1);

  const chartData = useMemo<ChartDatum[]>(() => {
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

  const sortedAssemblies = useMemo<AssemblySpec[]>(() => {
    return [...assemblies].sort((a, b) => {
      const ta = calcTotal(a.components, framingOption);
      const tb = calcTotal(b.components, framingOption);
      return ta - tb;
    });
  }, [assemblies, framingOption]);

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

  const anyHasFraming = useMemo(
    () => assemblies.some(assemblyHasFramingOptions),
    [assemblies]
  );

  const legendItems: LegendEntry[] = [
    { value: "Interior", color: ZONE_COLORS.INTERIOR },
    { value: "Core", color: ZONE_COLORS.CORE },
    { value: "Exterior", color: ZONE_COLORS.EXTERIOR },
  ];

  const chartHeight = Math.max(320, chartData.length * 56 + 60);

  return (
    <div className="space-y-10">
      {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
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

      {/* ── Framing Option Toggle ───────────────────────────────────────────── */}
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

      {/* ── Stacked Horizontal Bar Chart ───────────────────────────────────── */}
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
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-2 text-right">
            <p className="text-gray-600 text-[10px]">
              Values shown in kg CO₂e per 1,000 SF facade area
            </p>
          </div>
        </div>
      </section>

      {/* ── Assembly Detail Accordion ───────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">Assembly Details</h2>
            <p className="text-gray-500 text-sm mt-0.5">
              Expand each assembly to see full component-level carbon data
            </p>
          </div>
        </div>
        <div className="space-y-3">
          {sortedAssemblies.map((assembly, idx) => (
            <AssemblyCard
              key={assembly.id}
              assembly={assembly}
              framingOption={framingOption}
              rank={idx + 1}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CarbonCompare() {
  const { data: assemblies, isLoading } = trpc.assemblySpecs.listWithComponents.useQuery();
  const searchStr = useSearch();
  const [, navigate] = useLocation();

  // ── Parse URL params ────────────────────────────────────────────────────

  const urlParams = useMemo(() => new URLSearchParams(searchStr), [searchStr]);
  const urlMode = urlParams.get("mode");
  const urlIds = urlParams.get("ids");

  const initialTab = urlMode === "material" ? "material" : "assembly";
  const initialMaterialIds = useMemo<number[]>(() => {
    if (!urlIds) return [];
    return urlIds
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n) && n > 0)
      .slice(0, 4);
  }, [urlIds]);

  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [materialIds, setMaterialIds] = useState<number[]>(initialMaterialIds);

  // ── Sync material IDs to URL ────────────────────────────────────────────

  const handleMaterialIdsChange = useCallback(
    (ids: number[]) => {
      setMaterialIds(ids);
      const params = new URLSearchParams(searchStr);
      params.set("mode", "material");
      if (ids.length > 0) {
        params.set("ids", ids.join(","));
      } else {
        params.delete("ids");
      }
      navigate(`/carbon-compare?${params.toString()}`, { replace: true });
    },
    [searchStr, navigate]
  );

  const handleTabChange = useCallback(
    (tab: string) => {
      setActiveTab(tab);
      const params = new URLSearchParams(searchStr);
      if (tab === "material") {
        params.set("mode", "material");
        if (materialIds.length > 0) params.set("ids", materialIds.join(","));
      } else {
        params.delete("mode");
        params.delete("ids");
      }
      navigate(`/carbon-compare?${params.toString()}`, { replace: true });
    },
    [searchStr, navigate, materialIds]
  );

  // ── Loading / empty states ──────────────────────────────────────────────

  if (isLoading) return <LoadingSkeleton />;
  if (!assemblies || assemblies.length === 0) return <EmptyState />;

  // ── Main render ─────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
        {/* ── Hero ─────────────────────────────────────────────────────────── */}
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
            Interactive comparison of exterior wall systems and individual materials by
            embodied carbon intensity{" "}
            <span className="text-gray-300">(kg CO₂e per 1,000 SF)</span>.
          </p>
        </section>

        {/* ── Top-level Mode Tabs ───────────────────────────────────────────── */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="bg-gray-900 border border-gray-800 p-1 rounded-xl h-auto mb-8">
            <TabsTrigger
              value="assembly"
              className="
                flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150
                data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg
                data-[state=inactive]:text-gray-400 data-[state=inactive]:hover:text-gray-200
              "
            >
              <Layers size={15} />
              Assembly Compare
            </TabsTrigger>
            <TabsTrigger
              value="material"
              className="
                flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150
                data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg
                data-[state=inactive]:text-gray-400 data-[state=inactive]:hover:text-gray-200
              "
            >
              <FlaskConical size={15} />
              Material Compare
            </TabsTrigger>
          </TabsList>

          {/* ── Assembly Compare Tab ──────────────────────────────────────── */}
          <TabsContent value="assembly" className="mt-0">
            <AssemblyComparePanel assemblies={assemblies as AssemblySpec[]} />
          </TabsContent>

          {/* ── Material Compare Tab ──────────────────────────────────────── */}
          <TabsContent value="material" className="mt-0">
            <MaterialComparePanel
              materialIds={materialIds}
              onIdsChange={handleMaterialIdsChange}
            />
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
}
