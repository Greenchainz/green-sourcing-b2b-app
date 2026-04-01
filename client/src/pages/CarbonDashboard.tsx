/**
 * Carbon Dashboard Page
 *
 * Architect-facing dashboard for comparing embodied carbon across assembly
 * types and core options. Wired to Track 1–3 tRPC procedures.
 *
 * Layout:
 *   Mobile  — stacked: selector → chart → score cards
 *   Desktop — 2-column: (selector + chart) | score cards
 */

import { useState, useCallback, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { CarbonComparisonChart, generateLeedPdf } from "@/components/CarbonComparisonChart";
import { MaterialCreditScoreCard } from "@/components/MaterialCreditScoreCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Share2,
  Save,
  FileBarChart,
  Plus,
  BarChart3,
  AlertCircle,
} from "lucide-react";
import {
  generateCarbonReport,
  type EpdMaterialRow,
} from "@shared/carbon-report";

// ─── Constants ────────────────────────────────────────────────────────────────

const CORE_OPTIONS: { value: 1 | 2 | 3; label: string }[] = [
  { value: 1, label: "Option 1 — CFMF" },
  { value: 2, label: "Option 2 — Mega Panel HSS" },
  { value: 3, label: "Option 3 — Unitized" },
];

// ─── URL state helpers ────────────────────────────────────────────────────────

function encodeState(
  projectName: string,
  assemblies: string[],
  options: number[]
): string {
  const params = new URLSearchParams();
  if (projectName) params.set("p", projectName);
  if (assemblies.length) params.set("a", assemblies.join(","));
  if (options.length) params.set("o", options.join(","));
  return params.toString();
}

function decodeState(search: string): {
  projectName: string;
  assemblies: string[];
  options: number[];
} {
  const params = new URLSearchParams(search);
  return {
    projectName: params.get("p") ?? "",
    assemblies: params.get("a")?.split(",").filter(Boolean) ?? [],
    options: params
      .get("o")
      ?.split(",")
      .map(Number)
      .filter((n) => [1, 2, 3].includes(n)) ?? [],
  };
}

// ─── Assembly selector ────────────────────────────────────────────────────────

interface AssemblySelectorProps {
  availableTypes: string[];
  selected: string[];
  onChange: (types: string[]) => void;
}

function AssemblySelector({ availableTypes, selected, onChange }: AssemblySelectorProps) {
  const toggle = (type: string) => {
    onChange(
      selected.includes(type)
        ? selected.filter((t) => t !== type)
        : [...selected, type]
    );
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Assembly Types</p>
      {availableTypes.length === 0 ? (
        <p className="text-xs text-muted-foreground">No assemblies found.</p>
      ) : (
        <div className="space-y-1">
          {availableTypes.map((type) => (
            <label
              key={type}
              className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5"
            >
              <Checkbox
                checked={selected.includes(type)}
                onCheckedChange={() => toggle(type)}
                id={`asm-${type}`}
              />
              <span className="text-sm truncate">{type}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Core option toggles ──────────────────────────────────────────────────────

interface CoreOptionTogglesProps {
  selected: number[];
  onChange: (options: number[]) => void;
}

function CoreOptionToggles({ selected, onChange }: CoreOptionTogglesProps) {
  const toggle = (v: 1 | 2 | 3) => {
    onChange(
      selected.includes(v)
        ? selected.filter((o) => o !== v)
        : [...selected, v]
    );
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Core Options</p>
      {CORE_OPTIONS.map(({ value, label }) => (
        <label
          key={value}
          className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5"
        >
          <Checkbox
            checked={selected.includes(value)}
            onCheckedChange={() => toggle(value)}
            id={`opt-${value}`}
          />
          <span className="text-sm">{label}</span>
        </label>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CarbonDashboard() {
  const [, navigate] = useLocation();
  const searchStr = useSearch();

  // Initialise state from URL params on mount (lazy initializers to avoid re-running)
  const [projectName, setProjectName] = useState(() => decodeState(searchStr).projectName);
  const [selectedAssemblies, setSelectedAssemblies] = useState<string[]>(
    () => decodeState(searchStr).assemblies
  );
  const [selectedOptions, setSelectedOptions] = useState<number[]>(() => {
    const opts = decodeState(searchStr).options;
    return opts.length ? opts : [1, 2, 3];
  });
  const [availableTypes, setAvailableTypes] = useState<string[]>([]);

  // Fetch EPD materials for all selected assemblies in a single query
  const assemblyQuery = trpc.epd.listByAssemblies.useQuery(
    { assemblyTypes: selectedAssemblies },
    { enabled: selectedAssemblies.length > 0, staleTime: 30_000 }
  );

  // Collect unique assembly types seen in returned data for the selector
  useEffect(() => {
    const types = new Set<string>(assemblyQuery.data?.map((m) => m.assemblyType ?? "").filter(Boolean) ?? []);
    for (const t of selectedAssemblies) types.add(t);
    setAvailableTypes((prev) => Array.from(new Set([...prev, ...types])));
  }, [assemblyQuery.data, selectedAssemblies]);

  // Flatten and filter material rows
  const allMaterials: EpdMaterialRow[] = (assemblyQuery.data ?? []).filter(
    (m) =>
      selectedOptions.length === 0 ||
      m.coreOption == null ||
      selectedOptions.includes(m.coreOption)
  );

  // Generate chart data
  const chartData =
    allMaterials.length > 0
      ? generateCarbonReport(allMaterials, projectName || undefined)
      : null;

  const isLoading = assemblyQuery.isLoading;
  const isError = assemblyQuery.isError;

  // Get primary material ID for each selected assembly (for score cards)
  const primaryMaterials: { assemblyType: string; id: number; productName: string }[] =
    selectedAssemblies.flatMap((type) => {
      const rows = (assemblyQuery.data ?? []).filter((m) => m.assemblyType === type);
      if (rows.length === 0) return [];
      return [{ assemblyType: type, id: rows[0].id, productName: rows[0].productName }];
    });

  const handleShareLink = useCallback(() => {
    const qs = encodeState(projectName, selectedAssemblies, selectedOptions);
    const url = `${window.location.origin}/carbon-dashboard?${qs}`;
    void navigator.clipboard.writeText(url);
  }, [projectName, selectedAssemblies, selectedOptions]);

  const handleSave = useCallback(() => {
    const qs = encodeState(projectName, selectedAssemblies, selectedOptions);
    navigate(`/carbon-dashboard?${qs}`);
  }, [navigate, projectName, selectedAssemblies, selectedOptions]);

  const handleNewComparison = useCallback(() => {
    setProjectName("");
    setSelectedAssemblies([]);
    setSelectedOptions([1, 2, 3]);
    navigate("/carbon-dashboard");
  }, [navigate]);

  // Generate Report — calls pdf-lib directly via the exported helper
  const handleGenerateReport = useCallback(() => {
    if (!chartData) return;
    generateLeedPdf(chartData, projectName || undefined).catch((err) => {
      console.error("Failed to generate LEED PDF:", err);
    });
  }, [chartData, projectName]);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-6 max-w-screen-xl">
        {/* ── Page header ─────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-7 w-7 text-green-600" />
            <div>
              <h1 className="text-2xl font-bold">Embodied Carbon Comparison</h1>
              <p className="text-sm text-muted-foreground">
                Compare assemblies by kgCO2e per 1,000 SF
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Input
              placeholder="Project name…"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="w-48"
            />
            <Button variant="outline" size="sm" onClick={handleNewComparison}>
              <Plus className="h-4 w-4 mr-1" />
              New Comparison
            </Button>
          </div>
        </div>

        {/* ── Desktop 2-column / mobile stacked ───────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ─ Left panel: selectors + chart ─────────────────────────── */}
          <div className="lg:col-span-2 space-y-4">
            {/* Selector card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Filters</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <AssemblySelector
                  availableTypes={availableTypes}
                  selected={selectedAssemblies}
                  onChange={setSelectedAssemblies}
                />
                <CoreOptionToggles
                  selected={selectedOptions}
                  onChange={setSelectedOptions}
                />
              </CardContent>
            </Card>

            {/* Chart card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  Carbon Comparison
                  {chartData && (
                    <Badge variant="secondary">
                      {chartData.metadata.totalAssemblies} assemblies
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading && (
                  <div className="space-y-2">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-64 w-full" />
                  </div>
                )}
                {isError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Failed to load assembly data. Please try again.
                    </AlertDescription>
                  </Alert>
                )}
                {!isLoading && !isError && selectedAssemblies.length === 0 && (
                  <p className="text-center text-muted-foreground py-16">
                    Select one or more assembly types from the filter panel to
                    display the carbon comparison chart.
                  </p>
                )}
                {!isLoading && !isError && selectedAssemblies.length > 0 && !chartData && (
                  <p className="text-center text-muted-foreground py-16">
                    No EPD data found for the selected assemblies.
                  </p>
                )}
                {!isLoading && !isError && chartData && (
                  <CarbonComparisonChart
                    data={chartData}
                    projectId={projectName || undefined}
                  />
                )}
              </CardContent>
            </Card>
          </div>

          {/* ─ Right panel: Material Credit Score cards ──────────────── */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Material Credit Scores
            </h2>
            {selectedAssemblies.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Select assemblies to see material credit scores.
              </p>
            )}
            {primaryMaterials.map((m) => (
              <MaterialCreditScoreCard
                key={m.id}
                epdId={m.id}
                productName={m.productName}
              />
            ))}
          </div>
        </div>

        {/* ── Bottom action bar ────────────────────────────────────────── */}
        <div className="mt-6 flex flex-wrap gap-2 justify-end border-t pt-4">
          <Button variant="outline" onClick={handleSave}>
            <Save className="h-4 w-4 mr-1" />
            Save Comparison
          </Button>
          <Button
            variant="outline"
            onClick={handleGenerateReport}
            disabled={!chartData}
          >
            <FileBarChart className="h-4 w-4 mr-1" />
            Generate Report
          </Button>
          <Button variant="outline" onClick={handleShareLink}>
            <Share2 className="h-4 w-4 mr-1" />
            Share Link
          </Button>
        </div>
      </main>

      <Footer />
    </div>
  );
}
