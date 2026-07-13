import { useState, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Download,
  Loader2,
  FileWarning,
  X,
  RotateCcw,
  ChevronRight,
} from "lucide-react";

// ── CSV Template ─────────────────────────────────────────────────────────────

const TEMPLATE_HEADERS = [
  "name",
  "category",
  "description",
  "pricePerUnit",
  "priceUnit",
  "leadTimeDays",
  "hasEpd",
  "recycledContentPct",
] as const;

const TEMPLATE_EXAMPLE = [
  "Low-Carbon Concrete Mix",
  "Concrete",
  "Sustainable concrete with 30% recycled aggregate",
  "85.00",
  "per m3",
  "14",
  "true",
  "30",
];

const VALID_CATEGORIES = [
  "Concrete",
  "Steel",
  "Timber",
  "Glass",
  "Insulation",
  "Roofing",
  "Flooring",
  "Cladding",
  "MEP",
  "Other",
];

function downloadTemplate() {
  const header = TEMPLATE_HEADERS.join(",");
  const example = TEMPLATE_EXAMPLE.join(",");
  const csv = `${header}\n${example}\n`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "greenchainz_material_template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// ── CSV Parsing ──────────────────────────────────────────────────────────────

interface ParsedRow {
  rowNum: number;
  name: string;
  category: string;
  description: string;
  pricePerUnit: string;
  priceUnit: string;
  leadTimeDays: string;
  hasEpd: string;
  recycledContentPct: string;
  errors: string[];
  valid: boolean;
}

interface MaterialFieldValues {
  name: string;
  category: string;
  description: string;
  pricePerUnit: string;
  priceUnit: string;
  leadTimeDays: string;
  hasEpd: string;
  recycledContentPct: string;
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current.trim());
  return fields;
}

function buildParsedRow(values: MaterialFieldValues, rowNum: number): ParsedRow {
  const errors: string[] = [];

  const {
    name,
    category,
    description,
    pricePerUnit,
    priceUnit,
    leadTimeDays,
    hasEpd,
    recycledContentPct,
  } = values;

  if (!name) errors.push("Name is required");
  if (!category) {
    errors.push("Category is required");
  } else if (!VALID_CATEGORIES.includes(category)) {
    errors.push(
      `Invalid category "${category}". Valid: ${VALID_CATEGORIES.join(", ")}`,
    );
  }
  if (pricePerUnit && (isNaN(Number(pricePerUnit)) || Number(pricePerUnit) < 0)) {
    errors.push("Price must be a positive number");
  }
  if (leadTimeDays && (!Number.isInteger(Number(leadTimeDays)) || Number(leadTimeDays) < 1)) {
    errors.push("Lead time must be a positive integer");
  }
  if (
    recycledContentPct &&
    (isNaN(Number(recycledContentPct)) ||
      Number(recycledContentPct) < 0 ||
      Number(recycledContentPct) > 100)
  ) {
    errors.push("Recycled content must be 0-100");
  }

  return {
    rowNum,
    name,
    category,
    description,
    pricePerUnit,
    priceUnit,
    leadTimeDays,
    hasEpd,
    recycledContentPct,
    errors,
    valid: errors.length === 0,
  };
}

function parseCSV(text: string): ParsedRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  // Skip header row
  const dataLines = lines.slice(1);
  return dataLines.map((line, idx) => {
    const fields = parseCSVLine(line);
    return buildParsedRow(
      {
        name: fields[0] ?? "",
        category: fields[1] ?? "",
        description: fields[2] ?? "",
        pricePerUnit: fields[3] ?? "",
        priceUnit: fields[4] ?? "",
        leadTimeDays: fields[5] ?? "",
        hasEpd: fields[6] ?? "",
        recycledContentPct: fields[7] ?? "",
      },
      idx + 1,
    );
  });
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

function stringFromCell(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value).trim();
  }
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "object") {
    const objectValue = value as Record<string, unknown>;
    if (typeof objectValue.text === "string") return objectValue.text.trim();
    if (typeof objectValue.result === "string" || typeof objectValue.result === "number") {
      return String(objectValue.result).trim();
    }
    if (Array.isArray(objectValue.richText)) {
      return objectValue.richText
        .map((segment) =>
          typeof segment === "object" && segment && typeof (segment as Record<string, unknown>).text === "string"
            ? ((segment as Record<string, unknown>).text as string)
            : "",
        )
        .join("")
        .trim();
    }
  }
  return "";
}

async function parseSpreadsheet(file: File): Promise<ParsedRow[]> {
  const { Workbook } = await import("exceljs");
  const workbook = new Workbook();
  const buffer = await file.arrayBuffer();
  await workbook.xlsx.load(buffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet || worksheet.rowCount < 2) return [];

  const headerRow = worksheet.getRow(1);
  const headerToColumn = new Map<string, number>();
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const key = normalizeHeader(stringFromCell(cell.value));
    if (key) headerToColumn.set(key, colNumber);
  });

  const getValue = (rowNumber: number, header: (typeof TEMPLATE_HEADERS)[number]) => {
    const col = headerToColumn.get(normalizeHeader(header));
    if (!col) return "";
    return stringFromCell(worksheet.getRow(rowNumber).getCell(col).value);
  };

  const parsedRows: ParsedRow[] = [];
  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
    const rowValues: MaterialFieldValues = {
      name: getValue(rowNumber, "name"),
      category: getValue(rowNumber, "category"),
      description: getValue(rowNumber, "description"),
      pricePerUnit: getValue(rowNumber, "pricePerUnit"),
      priceUnit: getValue(rowNumber, "priceUnit"),
      leadTimeDays: getValue(rowNumber, "leadTimeDays"),
      hasEpd: getValue(rowNumber, "hasEpd"),
      recycledContentPct: getValue(rowNumber, "recycledContentPct"),
    };

    const hasAnyValue = Object.values(rowValues).some((value) => value.length > 0);
    if (!hasAnyValue) continue;

    parsedRows.push(buildParsedRow(rowValues, parsedRows.length + 1));
  }

  return parsedRows;
}

// ── Upload States ────────────────────────────────────────────────────────────

type UploadPhase = "upload" | "preview" | "submitting" | "complete";

interface SubmitResult {
  total: number;
  succeeded: number;
  failed: number;
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function SupplierBulkUpload() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [phase, setPhase] = useState<UploadPhase>("upload");
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [submitProgress, setSubmitProgress] = useState(0);
  const [result, setResult] = useState<SubmitResult | null>(null);

  // Fetch supplier profile
  const { data: profile } = trpc.supplierOnboarding.getMyProfile.useQuery(
    undefined,
    { enabled: !!user },
  );

  const submitMaterial = trpc.materialSpec.submit.useMutation();

  const validRows = rows.filter((r) => r.valid);
  const errorRows = rows.filter((r) => !r.valid);

  // ── File Handling ──────────────────────────────────────────────────────────

  const processFile = useCallback(async (file: File) => {
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "csv" && ext !== "xlsx" && ext !== "xls") {
      toast.error("Please upload a .csv, .xlsx, or .xls file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large. Maximum size is 10MB.");
      return;
    }

    setFileName(file.name);

    try {
      if (ext === "xlsx" || ext === "xls") {
        const parsed = await parseSpreadsheet(file);
        if (parsed.length === 0) {
          toast.error(
            "No data rows found. Make sure your spreadsheet has a header row and at least one data row.",
          );
          return;
        }
        setRows(parsed);
        setPhase("preview");
        toast.success(`Parsed ${parsed.length} rows from ${file.name}`);
        return;
      }

      const text = await file.text();
      const parsed = parseCSV(text);
      if (parsed.length === 0) {
        toast.error(
          "No data rows found. Make sure your CSV has a header row and at least one data row.",
        );
        return;
      }
      setRows(parsed);
      setPhase("preview");
      toast.success(`Parsed ${parsed.length} rows from ${file.name}`);
    } catch {
      toast.error("Failed to read file");
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) void processFile(file);
    },
    [processFile],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) void processFile(file);
      // Reset input so re-selecting same file triggers change
      e.target.value = "";
    },
    [processFile],
  );

  // ── Batch Submit ───────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!profile?.id) {
      toast.error("Supplier profile not found. Please complete onboarding first.");
      return;
    }
    if (validRows.length === 0) {
      toast.error("No valid rows to submit");
      return;
    }

    setPhase("submitting");
    setSubmitProgress(0);

    let succeeded = 0;
    let failed = 0;

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      try {
        await submitMaterial.mutateAsync({
          materialId: 1, // placeholder
          supplierId: profile.id,
          pricePerUnit: row.pricePerUnit
            ? parseFloat(row.pricePerUnit)
            : undefined,
          priceUnit: row.priceUnit || undefined,
          leadTimeDays: row.leadTimeDays
            ? parseInt(row.leadTimeDays)
            : undefined,
          hasEpd:
            row.hasEpd.toLowerCase() === "true" ||
            row.hasEpd === "1" ||
            row.hasEpd.toLowerCase() === "yes",
          recycledContentPct: row.recycledContentPct
            ? parseFloat(row.recycledContentPct)
            : undefined,
          notes: [row.name, row.category, row.description]
            .filter(Boolean)
            .join(" | "),
        });
        succeeded++;
      } catch {
        failed++;
      }
      setSubmitProgress(i + 1);
    }

    setResult({ total: validRows.length, succeeded, failed });
    setPhase("complete");

    if (failed === 0) {
      toast.success(`All ${succeeded} materials submitted successfully!`);
    } else {
      toast.warning(`${succeeded} succeeded, ${failed} failed`);
    }
  };

  // ── Reset ──────────────────────────────────────────────────────────────────

  const resetUpload = () => {
    setPhase("upload");
    setFileName(null);
    setRows([]);
    setSubmitProgress(0);
    setResult(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8 max-w-4xl mx-auto w-full">
        {/* Back Link */}
        <Link href="/supplier/materials">
          <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Materials
          </button>
        </Link>

        <h1 className="text-3xl font-bold text-foreground mb-2">
          Bulk Upload Materials
        </h1>
        <p className="text-muted-foreground mb-8">
          Upload a CSV file to add multiple materials at once. Download our
          template to ensure correct formatting.
        </p>

        {/* Template Download Card */}
        <Card className="p-5 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#2D6A4F]/10 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-5 h-5 text-[#2D6A4F]" />
              </div>
              <div>
                <p className="font-medium text-foreground">
                  GreenChainz Material Template
                </p>
                <p className="text-sm text-muted-foreground">
                  CSV with all required headers and an example row
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              className="flex items-center gap-2 border-[#2D6A4F] text-[#2D6A4F] hover:bg-[#2D6A4F]/5"
              onClick={downloadTemplate}
            >
              <Download className="w-4 h-4" />
              Download Template
            </Button>
          </div>
        </Card>

        {/* ── Phase: Upload ─────────────────────────────────────────────── */}
        {phase === "upload" && (
          <>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-16 text-center transition-all duration-200 ${
                dragOver
                  ? "border-[#2D6A4F] bg-[#2D6A4F]/5"
                  : "border-border hover:border-[#2D6A4F]/50 hover:bg-muted/30"
              }`}
            >
              <div className="space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
                  <Upload className="w-8 h-8 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-lg font-medium text-foreground">
                    Drop your CSV file here
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Supports .csv, .xlsx, and .xls files up to 10MB
                  </p>
                </div>
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    className="hidden"
                    onChange={handleChange}
                  />
                  <Button
                    className="bg-[#2D6A4F] hover:bg-[#245a42]"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Browse Files
                  </Button>
                </div>
              </div>
            </div>

            {/* Template Columns Reference */}
            <Card className="p-6 mt-6">
              <h3 className="font-semibold text-foreground mb-3">
                Required CSV Columns
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                {TEMPLATE_HEADERS.map((header) => (
                  <div key={header} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#2D6A4F]" />
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                      {header}
                    </code>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                <strong>name</strong> and <strong>category</strong> are required.
                Valid categories: {VALID_CATEGORIES.join(", ")}.
              </p>
            </Card>
          </>
        )}

        {/* ── Phase: Preview ────────────────────────────────────────────── */}
        {phase === "preview" && (
          <>
            {/* Summary Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{fileName}</span>
                </div>
                <Badge
                  variant="outline"
                  className="bg-green-500/10 text-green-600 border-green-500/20"
                >
                  {validRows.length} valid
                </Badge>
                {errorRows.length > 0 && (
                  <Badge
                    variant="outline"
                    className="bg-red-500/10 text-red-600 border-red-500/20"
                  >
                    {errorRows.length} errors
                  </Badge>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={resetUpload}>
                  <X className="w-3 h-3 mr-1" /> Cancel
                </Button>
                <Button
                  size="sm"
                  className="bg-[#2D6A4F] hover:bg-[#245a42]"
                  onClick={handleSubmit}
                  disabled={validRows.length === 0}
                >
                  <ChevronRight className="w-3 h-3 mr-1" />
                  Submit {validRows.length} Material
                  {validRows.length !== 1 ? "s" : ""}
                </Button>
              </div>
            </div>

            {/* Preview Table */}
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left p-3 font-semibold text-muted-foreground w-12">
                        #
                      </th>
                      <th className="text-left p-3 font-semibold text-muted-foreground w-12">
                        Status
                      </th>
                      <th className="text-left p-3 font-semibold text-muted-foreground">
                        Name
                      </th>
                      <th className="text-left p-3 font-semibold text-muted-foreground">
                        Category
                      </th>
                      <th className="text-left p-3 font-semibold text-muted-foreground">
                        Price
                      </th>
                      <th className="text-left p-3 font-semibold text-muted-foreground">
                        Lead Time
                      </th>
                      <th className="text-left p-3 font-semibold text-muted-foreground">
                        EPD
                      </th>
                      <th className="text-left p-3 font-semibold text-muted-foreground">
                        Error
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr
                        key={row.rowNum}
                        className={`border-b border-border transition-colors ${
                          row.valid
                            ? "hover:bg-muted/20"
                            : "bg-red-50 dark:bg-red-950/20"
                        }`}
                      >
                        <td className="p-3 text-muted-foreground font-mono text-xs">
                          {row.rowNum}
                        </td>
                        <td className="p-3">
                          {row.valid ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-red-500" />
                          )}
                        </td>
                        <td className="p-3 font-medium">
                          {row.name || (
                            <span className="text-red-400 italic">Missing</span>
                          )}
                        </td>
                        <td className="p-3">
                          {row.category ? (
                            <Badge variant="outline" className="text-xs">
                              {row.category}
                            </Badge>
                          ) : (
                            <span className="text-red-400 italic">Missing</span>
                          )}
                        </td>
                        <td className="p-3 font-mono text-xs">
                          {row.pricePerUnit ? (
                            <>
                              ${row.pricePerUnit}
                              {row.priceUnit && (
                                <span className="text-muted-foreground ml-1">
                                  {row.priceUnit}
                                </span>
                              )}
                            </>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="p-3 font-mono text-xs">
                          {row.leadTimeDays ? `${row.leadTimeDays}d` : "—"}
                        </td>
                        <td className="p-3">
                          {row.hasEpd &&
                          (row.hasEpd.toLowerCase() === "true" ||
                            row.hasEpd === "1" ||
                            row.hasEpd.toLowerCase() === "yes") ? (
                            <Badge
                              variant="outline"
                              className="bg-green-500/10 text-green-600 border-green-500/20 text-xs"
                            >
                              Yes
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">
                              No
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          {row.errors.length > 0 && (
                            <span
                              className="text-xs text-red-600"
                              title={row.errors.join("; ")}
                            >
                              {row.errors[0]}
                              {row.errors.length > 1 &&
                                ` (+${row.errors.length - 1})`}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}

        {/* ── Phase: Submitting ─────────────────────────────────────────── */}
        {phase === "submitting" && (
          <Card className="p-12 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-[#2D6A4F]/10 flex items-center justify-center mb-6">
              <Loader2 className="w-8 h-8 text-[#2D6A4F] animate-spin" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Submitting Materials
            </h3>
            <p className="text-muted-foreground mb-6">
              Submitting {submitProgress} of {validRows.length} materials...
            </p>
            <div className="w-full max-w-md mx-auto h-3 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-[#2D6A4F] rounded-full transition-all duration-300"
                style={{
                  width: `${(submitProgress / validRows.length) * 100}%`,
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {Math.round((submitProgress / validRows.length) * 100)}% complete
            </p>
          </Card>
        )}

        {/* ── Phase: Complete ───────────────────────────────────────────── */}
        {phase === "complete" && result && (
          <Card className="p-12 text-center">
            {result.failed === 0 ? (
              <>
                <div className="w-16 h-16 mx-auto rounded-full bg-green-500/10 flex items-center justify-center mb-6">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Upload Complete!
                </h3>
                <p className="text-muted-foreground mb-6">
                  All{" "}
                  <span className="font-semibold text-foreground">
                    {result.succeeded}
                  </span>{" "}
                  materials were submitted successfully and are pending review.
                </p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 mx-auto rounded-full bg-yellow-500/10 flex items-center justify-center mb-6">
                  <FileWarning className="w-8 h-8 text-yellow-500" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Upload Partially Complete
                </h3>
                <p className="text-muted-foreground mb-6">
                  <span className="font-semibold text-green-600">
                    {result.succeeded} succeeded
                  </span>
                  {" and "}
                  <span className="font-semibold text-red-600">
                    {result.failed} failed
                  </span>{" "}
                  out of {result.total} materials.
                </p>
              </>
            )}

            {/* Result Stats */}
            <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto mb-8">
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">
                  {result.total}
                </p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {result.succeeded}
                </p>
                <p className="text-xs text-muted-foreground">Succeeded</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">
                  {result.failed}
                </p>
                <p className="text-xs text-muted-foreground">Failed</p>
              </div>
            </div>

            <div className="flex justify-center gap-3">
              <Link href="/supplier/materials">
                <Button className="bg-[#2D6A4F] hover:bg-[#245a42]">
                  View Materials
                </Button>
              </Link>
              <Button variant="outline" onClick={resetUpload}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Upload Another
              </Button>
            </div>
          </Card>
        )}
      </main>

      <Footer />
    </div>
  );
}
