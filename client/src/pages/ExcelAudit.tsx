/**
 * ExcelAudit — /excel-audit
 *
 * Upload a CSV Bill of Materials → match each line to the GreenChainz catalog
 * → show carbon scores, EPD status, certifications → download carbon report CSV.
 *
 * CSV format: first column = material name (required), second column = quantity (optional)
 * First row is treated as a header and skipped automatically.
 */

import { useState, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Download,
  Loader2,
  RotateCcw,
  Leaf,
  BarChart3,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface BomRow {
  rowNum: number;
  rawName: string;
  quantity?: string;
}

type MatchStatus = "matched" | "partial" | "no_match";

interface AuditResult {
  rowNum: number;
  rawName: string;
  quantity?: string;
  status: MatchStatus;
  matchedName?: string;
  matchedId?: number;
  category?: string;
  gwpValue?: string;
  hasEpd?: boolean;
  hasHpd?: boolean;
  hasFsc?: boolean;
  hasGreenguard?: boolean;
  complianceGrade?: string;
  manufacturerName?: string;
}

// ── CSV Parser ────────────────────────────────────────────────────────────────

function parseCSV(text: string): BomRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const rows: BomRow[] = [];
  // skip header row (index 0)
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    const name = cols[0];
    if (!name) continue;
    rows.push({ rowNum: i, rawName: name, quantity: cols[1] || undefined });
  }
  return rows;
}

function gradeColor(grade: string | undefined) {
  switch (grade?.toUpperCase()) {
    case "A": return "bg-green-100 text-green-800 border-green-200";
    case "B": return "bg-blue-100 text-blue-800 border-blue-200";
    case "C": return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "D": return "bg-orange-100 text-orange-800 border-orange-200";
    case "F": return "bg-red-100 text-red-800 border-red-200";
    default:  return "bg-gray-100 text-gray-600 border-gray-200";
  }
}

function statusIcon(status: MatchStatus) {
  switch (status) {
    case "matched":  return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    case "partial":  return <AlertCircle  className="w-4 h-4 text-amber-500" />;
    case "no_match": return <XCircle      className="w-4 h-4 text-red-400"   />;
  }
}

// ── Report CSV Generator ───────────────────────────────────────────────────────

function generateReportCSV(results: AuditResult[]): string {
  const header = [
    "Row", "Original Name", "Quantity", "Status",
    "Matched Material", "Category", "GWP Value",
    "Has EPD", "Has HPD", "Has FSC", "Has GreenGuard",
    "Compliance Grade", "Manufacturer",
  ].join(",");

  const rows = results.map((r) =>
    [
      r.rowNum,
      `"${r.rawName}"`,
      r.quantity ?? "",
      r.status,
      `"${r.matchedName ?? ""}"`,
      r.category ?? "",
      r.gwpValue ?? "",
      r.hasEpd ? "Yes" : "No",
      r.hasHpd ? "Yes" : "No",
      r.hasFsc ? "Yes" : "No",
      r.hasGreenguard ? "Yes" : "No",
      r.complianceGrade ?? "",
      `"${r.manufacturerName ?? ""}"`,
    ].join(",")
  );

  return [header, ...rows].join("\n");
}

// ── Main Component ────────────────────────────────────────────────────────────

type PageState = "idle" | "parsed" | "analyzing" | "done";

export default function ExcelAudit() {
  const [pageState, setPageState] = useState<PageState>("idle");
  const [bomRows, setBomRows] = useState<BomRow[]>([]);
  const [results, setResults] = useState<AuditResult[]>([]);
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();

  const handleFile = (file: File) => {
    if (!file.name.match(/\.(csv|txt)$/i)) {
      toast.error("Please upload a CSV file. To use Excel, save your spreadsheet as CSV first.");
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rows = parseCSV(text);
      if (rows.length === 0) {
        toast.error("No material rows found. Make sure your CSV has a header row and at least one data row.");
        return;
      }
      setBomRows(rows);
      setPageState("parsed");
      toast.success(`Parsed ${rows.length} materials from ${file.name}`);
    };
    reader.readAsText(file);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  const analyzeAll = async () => {
    setPageState("analyzing");
    setProgress(0);
    const auditResults: AuditResult[] = [];

    for (let i = 0; i < bomRows.length; i++) {
      const row = bomRows[i];
      try {
        const data = await utils.materials.semanticSearch.fetch({
          query: row.rawName,
          limit: 1,
        });
        const items = data?.items ?? [];
        const best = items[0] as any;

        if (best) {
          const score = best.distance ?? 0;
          // distance < 0.3 = strong match, < 0.6 = partial
          const status: MatchStatus = score < 0.3 ? "matched" : score < 0.6 ? "partial" : "partial";
          auditResults.push({
            rowNum: row.rowNum,
            rawName: row.rawName,
            quantity: row.quantity,
            status,
            matchedName: best.name ?? best.productName,
            matchedId: best.id,
            category: best.category,
            gwpValue: best.gwpValue,
            hasEpd: best.hasEpd,
            hasHpd: best.hasHpd,
            hasFsc: best.hasFsc,
            hasGreenguard: best.hasGreenguard,
            complianceGrade: best.complianceGrade,
            manufacturerName: best.manufacturerName,
          });
        } else {
          auditResults.push({
            rowNum: row.rowNum,
            rawName: row.rawName,
            quantity: row.quantity,
            status: "no_match",
          });
        }
      } catch {
        auditResults.push({
          rowNum: row.rowNum,
          rawName: row.rawName,
          quantity: row.quantity,
          status: "no_match",
        });
      }
      setProgress(Math.round(((i + 1) / bomRows.length) * 100));
    }

    setResults(auditResults);
    setPageState("done");
    const matched = auditResults.filter((r) => r.status !== "no_match").length;
    toast.success(`Analysis complete — ${matched}/${auditResults.length} materials matched`);
  };

  const downloadReport = () => {
    const csv = generateReportCSV(results);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `GreenChainz-BOM-Audit-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success("Report downloaded");
  };

  const downloadTemplate = () => {
    const csv = `Material Name,Quantity\nLow-Carbon Concrete Mix,500 CY\nCross-Laminated Timber (CLT),2000 SF\nMineral Wool Insulation,5000 SF\nTPO Roofing Membrane,3000 SF\n`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "GreenChainz-BOM-Template.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const reset = () => {
    setPageState("idle");
    setBomRows([]);
    setResults([]);
    setProgress(0);
    setFileName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Stats ──────────────────────────────────────────────────────────────────
  const matched   = results.filter((r) => r.status === "matched").length;
  const partial   = results.filter((r) => r.status === "partial").length;
  const noMatch   = results.filter((r) => r.status === "no_match").length;
  const withEpd   = results.filter((r) => r.hasEpd).length;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      {/* Hero */}
      <section className="py-16 border-b border-border bg-gradient-to-b from-background to-secondary/20">
        <div className="container max-w-4xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 text-sm font-semibold text-primary">
            <FileSpreadsheet className="w-4 h-4" />
            BOM Carbon Audit
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground">
            Upload Your BOM.{" "}
            <span className="text-primary">Get Your Carbon Score.</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Upload a CSV bill of materials. We match every line to our verified catalog and return
            EPD status, GWP values, compliance grades, and certification coverage — ready to drop
            into your LEED submittal.
          </p>
        </div>
      </section>

      <main className="flex-1 container max-w-5xl mx-auto py-10 space-y-8">

        {/* Upload Zone */}
        {(pageState === "idle" || pageState === "parsed") && (
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base">Upload Bill of Materials</CardTitle>
              <Button variant="ghost" size="sm" onClick={downloadTemplate} className="gap-1.5 text-xs">
                <Download className="w-3.5 h-3.5" />
                Download Template
              </Button>
            </CardHeader>
            <CardContent>
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 hover:bg-accent/30"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  className="hidden"
                  onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
                />
                <Upload className="w-10 h-10 text-muted-foreground/60 mx-auto mb-3" />
                {fileName ? (
                  <>
                    <p className="text-sm font-medium text-foreground">{fileName}</p>
                    <p className="text-xs text-muted-foreground mt-1">{bomRows.length} materials parsed</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium text-foreground">
                      Drag & drop your CSV here, or click to browse
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      CSV format: Column A = Material Name, Column B = Quantity (optional).
                      First row = header (skipped automatically).
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Using Excel? File → Save As → CSV.
                    </p>
                  </>
                )}
              </div>

              {pageState === "parsed" && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Ready to analyze <span className="font-semibold text-foreground">{bomRows.length} materials</span>
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={reset} className="gap-1.5">
                      <RotateCcw className="w-3.5 h-3.5" />
                      Clear
                    </Button>
                    <Button size="sm" onClick={analyzeAll} className="gap-1.5">
                      <BarChart3 className="w-3.5 h-3.5" />
                      Run Audit
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Progress */}
        {pageState === "analyzing" && (
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    Analyzing {bomRows.length} materials…
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Matching against 1,500+ verified catalog entries
                  </p>
                </div>
                <span className="text-sm font-semibold text-primary">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {pageState === "done" && (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Matched",      value: matched,  color: "text-green-600" },
                { label: "Partial Match",value: partial,  color: "text-amber-600" },
                { label: "Not Found",    value: noMatch,  color: "text-red-500"   },
                { label: "With EPD",     value: withEpd,  color: "text-primary"   },
              ].map(({ label, value, color }) => (
                <Card key={label}>
                  <CardContent className="pt-4 text-center">
                    <p className={`text-3xl font-bold ${color}`}>{value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Results Table */}
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base">Audit Results — {results.length} Materials</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={reset} className="gap-1.5">
                    <RotateCcw className="w-3.5 h-3.5" />
                    New Audit
                  </Button>
                  <Button size="sm" onClick={downloadReport} className="gap-1.5">
                    <Download className="w-3.5 h-3.5" />
                    Download Report
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground w-6">#</th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Your Material</th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Matched</th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Category</th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">GWP</th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Certs</th>
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Grade</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {results.map((r) => (
                        <tr key={r.rowNum} className="hover:bg-accent/30 transition-colors">
                          <td className="px-4 py-3 text-xs text-muted-foreground">{r.rowNum}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {statusIcon(r.status)}
                              <span className="font-medium truncate max-w-[160px]" title={r.rawName}>
                                {r.rawName}
                              </span>
                            </div>
                            {r.quantity && (
                              <p className="text-xs text-muted-foreground ml-6">{r.quantity}</p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {r.matchedName ? (
                              <span className="text-xs truncate max-w-[140px] block" title={r.matchedName}>
                                {r.matchedName}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">No match</span>
                            )}
                            {r.manufacturerName && (
                              <p className="text-xs text-muted-foreground">{r.manufacturerName}</p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{r.category ?? "—"}</td>
                          <td className="px-4 py-3 text-xs">
                            {r.gwpValue ? (
                              <span className="font-medium">{r.gwpValue}</span>
                            ) : "—"}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1 flex-wrap">
                              {r.hasEpd      && <Badge className="bg-green-100 text-green-800 border-green-200 text-xs py-0">EPD</Badge>}
                              {r.hasHpd      && <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs py-0">HPD</Badge>}
                              {r.hasFsc      && <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs py-0">FSC</Badge>}
                              {r.hasGreenguard && <Badge className="bg-teal-100 text-teal-800 border-teal-200 text-xs py-0">GG</Badge>}
                              {!r.hasEpd && !r.hasHpd && !r.hasFsc && !r.hasGreenguard && (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {r.complianceGrade ? (
                              <Badge className={`text-xs ${gradeColor(r.complianceGrade)}`}>
                                {r.complianceGrade}
                              </Badge>
                            ) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Leaf className="w-3.5 h-3.5 text-primary" />
              Materials marked "Partial Match" were found in the catalog but confidence was lower.
              Review before including in submittals.
            </div>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
