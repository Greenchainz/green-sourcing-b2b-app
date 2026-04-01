/**
 * CarbonComparisonChart
 *
 * Two-tab chart component:
 *   "Multi-Core Assemblies"  — grouped bar chart (Recharts)
 *   "Unitized Curtain Wall"  — horizontal bar chart (Recharts)
 *
 * Features:
 *   - Green highlight on lowest-carbon bar, red on highest
 *   - "Download PNG" button (SVG → canvas via browser APIs)
 *   - "Export CSV" button
 *   - "Generate LEED Report PDF" button (uses pdf-lib, already in dependencies)
 */

import { useRef, useCallback } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  LabelList,
} from "recharts";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Download, FileText, FileBarChart } from "lucide-react";
import type {
  CarbonReportData,
  AssemblyDataPoint,
  UnitizedDataPoint,
} from "@shared/carbon-report";

// Re-export for consumers that prefer the client-side import path
export type { CarbonReportData };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function exportCsv(data: CarbonReportData, projectId?: string): void {
  const rows: string[][] = [
    ["Assembly", "Type", "Option/Series", "GWP per 1000SF (kgCO2e)"],
  ];

  for (const a of data.multiOptionAssemblies) {
    if (a.option1 != null) rows.push([a.name, "Multi-Core", "Option 1 (CFMF)", String(a.option1)]);
    if (a.option2 != null) rows.push([a.name, "Multi-Core", "Option 2 (Mega Panel HSS)", String(a.option2)]);
    if (a.option3 != null) rows.push([a.name, "Multi-Core", "Option 3 (Unitized)", String(a.option3)]);
  }

  for (const u of data.unitizedAssemblies) {
    rows.push([u.name, "Unitized", "—", String(u.gwp)]);
  }

  const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `carbon-report${projectId ? `-${projectId}` : ""}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

async function generateLeedPdf(data: CarbonReportData, projectId?: string): Promise<void> {
  // Dynamically import pdf-lib (already in dependencies)
  const { PDFDocument, rgb, StandardFonts } = await import("pdf-lib");

  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]); // US Letter
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
  const { width, height } = page.getSize();
  const margin = 50;

  // Header
  page.drawText("LEED Embodied Carbon Report", {
    x: margin,
    y: height - 60,
    size: 20,
    font: boldFont,
    color: rgb(0.13, 0.47, 0.27),
  });

  const subtitle = projectId ? `Project: ${projectId}` : "GreenChainz Carbon Comparison";
  page.drawText(subtitle, {
    x: margin,
    y: height - 85,
    size: 12,
    font,
    color: rgb(0.3, 0.3, 0.3),
  });

  page.drawText(`Generated: ${new Date(data.metadata.generatedAt).toLocaleDateString()}`, {
    x: margin,
    y: height - 100,
    size: 10,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });

  // Summary
  let y = height - 140;
  page.drawText("Summary", { x: margin, y, size: 14, font: boldFont, color: rgb(0, 0, 0) });
  y -= 20;

  if (data.lowestCarbonAssembly) {
    page.drawText(
      `Lowest Carbon Assembly: ${data.lowestCarbonAssembly.name} — ${data.lowestCarbonAssembly.value.toLocaleString()} kgCO2e/1000SF`,
      { x: margin, y, size: 10, font, color: rgb(0.13, 0.6, 0.13) }
    );
    y -= 16;
  }

  if (data.highestCarbonAssembly) {
    page.drawText(
      `Highest Carbon Assembly: ${data.highestCarbonAssembly.name} — ${data.highestCarbonAssembly.value.toLocaleString()} kgCO2e/1000SF`,
      { x: margin, y, size: 10, font, color: rgb(0.8, 0.1, 0.1) }
    );
    y -= 16;
  }

  // Data table header
  y -= 20;
  page.drawText("Assembly Data", { x: margin, y, size: 14, font: boldFont });
  y -= 20;

  const cols = { name: margin, type: margin + 200, gwp: margin + 320 };
  page.drawText("Assembly", { x: cols.name, y, size: 10, font: boldFont });
  page.drawText("Type", { x: cols.type, y, size: 10, font: boldFont });
  page.drawText("GWP (kgCO2e/1000SF)", { x: cols.gwp, y, size: 10, font: boldFont });
  y -= 14;
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) });
  y -= 10;

  for (const a of data.multiOptionAssemblies) {
    for (const [label, val] of [
      ["Option 1", a.option1],
      ["Option 2", a.option2],
      ["Option 3", a.option3],
    ] as [string, number | null | undefined][]) {
      if (val == null) continue;
      if (y < 80) break;
      page.drawText(`${a.name}`, { x: cols.name, y, size: 9, font });
      page.drawText(label, { x: cols.type, y, size: 9, font });
      page.drawText(val.toLocaleString(), { x: cols.gwp, y, size: 9, font });
      y -= 14;
    }
  }

  for (const u of data.unitizedAssemblies) {
    if (y < 80) break;
    page.drawText(u.name, { x: cols.name, y, size: 9, font });
    page.drawText("Unitized", { x: cols.type, y, size: 9, font });
    page.drawText(u.gwp.toLocaleString(), { x: cols.gwp, y, size: 9, font });
    y -= 14;
  }

  // Footer
  page.drawText("Powered by GreenChainz — greenchainz.com", {
    x: margin,
    y: 30,
    size: 8,
    font,
    color: rgb(0.6, 0.6, 0.6),
  });

  const pdfBytes = await doc.save();
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `leed-carbon-report${projectId ? `-${projectId}` : ""}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Custom tick / tooltip ────────────────────────────────────────────────────

function formatGwp(value: number): string {
  return `${value.toLocaleString()} kgCO2e`;
}

// ─── Multi-Core (grouped bar) chart ──────────────────────────────────────────

const OPTION_COLORS = ["#3b82f6", "#8b5cf6", "#06b6d4"];
const OPTION_LABELS = ["Option 1 (CFMF)", "Option 2 (Mega Panel HSS)", "Option 3 (Unitized)"];

function MultiCoreChart({
  data,
  lowestName,
  highestName,
}: {
  data: AssemblyDataPoint[];
  lowestName: string | undefined;
  highestName: string | undefined;
}) {
  if (data.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-12">
        No multi-core assembly data available.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} margin={{ top: 20, right: 20, left: 20, bottom: 60 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="name" angle={-35} textAnchor="end" tick={{ fontSize: 11 }} />
        <YAxis
          tickFormatter={(v: number) => v.toLocaleString()}
          label={{ value: "kgCO2e / 1,000 SF", angle: -90, position: "insideLeft", offset: -5, style: { fontSize: 11 } }}
        />
        <Tooltip formatter={(value: number) => [formatGwp(value), ""]} />
        <Legend
          wrapperStyle={{ paddingTop: 16 }}
          formatter={(_: unknown, entry: { dataKey: string }) => {
            const idx = ["option1", "option2", "option3"].indexOf(entry.dataKey);
            return OPTION_LABELS[idx] ?? entry.dataKey;
          }}
        />
        {(["option1", "option2", "option3"] as const).map((key, i) => (
          <Bar key={key} dataKey={key} fill={OPTION_COLORS[i]} maxBarSize={32}>
            {data.map((entry) => {
              const isLow = entry.name === lowestName;
              const isHigh = entry.name === highestName;
              return (
                <Cell
                  key={entry.name}
                  fill={isLow ? "#22c55e" : isHigh ? "#ef4444" : OPTION_COLORS[i]}
                />
              );
            })}
            <LabelList
              dataKey={key}
              position="top"
              formatter={(v: number) => v ? v.toLocaleString() : ""}
              style={{ fontSize: 9, fill: "#6b7280" }}
            />
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Unitized (horizontal bar) chart ─────────────────────────────────────────

function UnitizedChart({
  data,
  lowestName,
  highestName,
}: {
  data: UnitizedDataPoint[];
  lowestName: string | undefined;
  highestName: string | undefined;
}) {
  if (data.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-12">
        No unitized curtain wall data available.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(280, data.length * 52)}>
      <BarChart
        layout="vertical"
        data={data}
        margin={{ top: 10, right: 60, left: 20, bottom: 10 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis
          type="number"
          tickFormatter={(v: number) => v.toLocaleString()}
          label={{ value: "kgCO2e / 1,000 SF", position: "insideBottom", offset: -2, style: { fontSize: 11 } }}
        />
        <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 11 }} />
        <Tooltip formatter={(value: number) => [formatGwp(value), "GWP"]} />
        <Bar dataKey="gwp" maxBarSize={28}>
          {data.map((entry) => (
            <Cell
              key={entry.name}
              fill={
                entry.name === lowestName
                  ? "#22c55e"
                  : entry.name === highestName
                  ? "#ef4444"
                  : "#6366f1"
              }
            />
          ))}
          <LabelList
            dataKey="gwp"
            position="right"
            formatter={(v: number) => v.toLocaleString()}
            style={{ fontSize: 10, fill: "#374151" }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  data: CarbonReportData;
  projectId?: string;
}

export function CarbonComparisonChart({ data, projectId }: Props) {
  const chartRef = useRef<HTMLDivElement>(null);

  const handleDownloadPng = useCallback(() => {
    const svgEl = chartRef.current?.querySelector("svg");
    if (!svgEl) return;

    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svgEl);
    const svgBlob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = svgEl.clientWidth || 800;
      canvas.height = svgEl.clientHeight || 400;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const dl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = dl;
        a.download = `carbon-chart${projectId ? `-${projectId}` : ""}.png`;
        a.click();
        URL.revokeObjectURL(dl);
      }, "image/png");
    };
    img.src = url;
  }, [projectId]);

  const lowestName = data.lowestCarbonAssembly?.name;
  const highestName = data.highestCarbonAssembly?.name;

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div className="flex flex-wrap gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={handleDownloadPng}>
          <Download className="h-4 w-4 mr-1" />
          Download PNG
        </Button>
        <Button variant="outline" size="sm" onClick={() => exportCsv(data, projectId)}>
          <FileText className="h-4 w-4 mr-1" />
          Export CSV
        </Button>
        <Button variant="outline" size="sm" onClick={() => void generateLeedPdf(data, projectId)}>
          <FileBarChart className="h-4 w-4 mr-1" />
          Generate LEED Report PDF
        </Button>
      </div>

      {/* Legend pills */}
      <div className="flex gap-4 text-xs">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm bg-green-500" />
          Lowest carbon
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm bg-red-400" />
          Highest carbon
        </span>
      </div>

      {/* Charts */}
      <Tabs defaultValue="multi-core">
        <TabsList>
          <TabsTrigger value="multi-core">Multi-Core Assemblies</TabsTrigger>
          <TabsTrigger value="unitized">Unitized Curtain Wall</TabsTrigger>
        </TabsList>

        <TabsContent value="multi-core">
          <div ref={chartRef} className="pt-2">
            <MultiCoreChart
              data={data.multiOptionAssemblies}
              lowestName={lowestName}
              highestName={highestName}
            />
          </div>
        </TabsContent>

        <TabsContent value="unitized">
          <div ref={chartRef} className="pt-2">
            <UnitizedChart
              data={data.unitizedAssemblies}
              lowestName={lowestName}
              highestName={highestName}
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Summary pills */}
      {(data.lowestCarbonAssembly || data.highestCarbonAssembly) && (
        <div className="flex flex-wrap gap-3 text-xs pt-2 border-t">
          {data.lowestCarbonAssembly && (
            <span className="text-green-700 dark:text-green-400">
              ▼ Best: <strong>{data.lowestCarbonAssembly.name}</strong>{" "}
              {data.lowestCarbonAssembly.value.toLocaleString()} kgCO2e/1,000SF
            </span>
          )}
          {data.highestCarbonAssembly && (
            <span className="text-red-600 dark:text-red-400">
              ▲ Highest: <strong>{data.highestCarbonAssembly.name}</strong>{" "}
              {data.highestCarbonAssembly.value.toLocaleString()} kgCO2e/1,000SF
            </span>
          )}
        </div>
      )}
    </div>
  );
}
