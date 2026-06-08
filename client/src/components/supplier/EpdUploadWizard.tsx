/**
 * EpdUploadWizard
 *
 * Lets a supplier drag-and-drop or select their EPD / product sheet PDF.
 * Sends it to the server, gets back structured fields, and calls onExtracted
 * so the parent onboarding form can pre-fill itself.
 *
 * Usage:
 *   <EpdUploadWizard onExtracted={(fields) => mergeIntoForm(fields)} />
 */

import { useRef, useState, useCallback } from "react";
import { trpc } from "../../lib/trpc";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  UploadCloud,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
} from "lucide-react";
import type { ParsedEpdFields } from "../../../../server/services/epd-intelligence";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve((reader.result as string).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

function confidenceBadgeVariant(confidence: "HIGH" | "MEDIUM" | "LOW") {
  if (confidence === "HIGH")   return "default";
  if (confidence === "MEDIUM") return "secondary";
  return "outline";
}

// ── Component ─────────────────────────────────────────────────────────────────

interface EpdUploadWizardProps {
  onExtracted: (fields: ParsedEpdFields) => void;
  className?: string;
}

export function EpdUploadWizard({ onExtracted, className = "" }: EpdUploadWizardProps) {
  const inputRef        = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging]   = useState(false);
  const [extracted, setExtracted] = useState<ParsedEpdFields | null>(null);
  const [error, setError]         = useState<string | null>(null);

  const parseMutation = trpc.supplierOnboarding.parseEpdDocument.useMutation({
    onSuccess: (data) => {
      setExtracted(data);
      onExtracted(data);
    },
    onError: (err) => {
      setError(err.message ?? "Failed to parse document");
    },
  });

  const handleFile = useCallback(async (f: File) => {
    if (!f.name.toLowerCase().endsWith(".pdf")) {
      setError("Only PDF files are supported");
      return;
    }
    if (f.size > 50 * 1024 * 1024) {
      setError("File too large — maximum 50 MB");
      return;
    }
    setFile(f);
    setError(null);
    setExtracted(null);

    const base64 = await fileToBase64(f);
    parseMutation.mutate({ fileBase64: base64, fileName: f.name });
  }, [parseMutation]);

  // Drop zone handlers
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) void handleFile(dropped);
  }, [handleFile]);

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) void handleFile(f);
  };

  const reset = () => {
    setFile(null);
    setExtracted(null);
    setError(null);
    parseMutation.reset();
    if (inputRef.current) inputRef.current.value = "";
  };

  const isParsing = parseMutation.isPending;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Drop zone */}
      {!file && (
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClick={() => inputRef.current?.click()}
          className={`
            flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed
            p-8 cursor-pointer transition-colors
            ${dragging
              ? "border-green-500 bg-green-50"
              : "border-gray-300 hover:border-green-400 hover:bg-gray-50"}
          `}
        >
          <UploadCloud className="h-10 w-10 text-gray-400" />
          <div className="text-center">
            <p className="text-sm font-medium text-gray-700">
              Drop your EPD or product sheet PDF here
            </p>
            <p className="text-xs text-gray-500 mt-1">
              We'll auto-fill your profile — GWP, certifications, product name, and more
            </p>
          </div>
          <Button variant="outline" size="sm" type="button">
            Browse files
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={onInputChange}
          />
        </div>
      )}

      {/* File selected — parsing state */}
      {file && (
        <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
          <FileText className="h-5 w-5 flex-shrink-0 text-gray-500" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">{file.name}</p>
            <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(0)} KB</p>
          </div>
          {isParsing && <Loader2 className="h-4 w-4 animate-spin text-green-600" />}
          {!isParsing && (
            <button onClick={reset} className="text-gray-400 hover:text-gray-600" type="button">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* Parsing in progress */}
      {isParsing && (
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800 flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Analyzing with AI — extracting GWP, certifications, and product data…
        </div>
      )}

      {/* Error state */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Success — extracted fields preview */}
      {extracted && !isParsing && (
        <div className="rounded-xl border border-green-200 bg-white p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm font-semibold text-green-800">
                {extracted.fieldsFound.length} fields extracted
              </span>
            </div>
            <Badge variant={confidenceBadgeVariant(extracted.confidence)}>
              {extracted.confidence} confidence
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
            {extracted.productName && (
              <Row label="Product" value={extracted.productName} />
            )}
            {extracted.manufacturer && (
              <Row label="Manufacturer" value={extracted.manufacturer} />
            )}
            {extracted.category && (
              <Row label="Category" value={extracted.category} />
            )}
            {extracted.gwpA1A3 != null && (
              <Row label="GWP A1–A3" value={`${extracted.gwpA1A3} kgCO₂e/kg`} highlight />
            )}
            {extracted.gwpA1C4 != null && (
              <Row label="GWP A1–C4" value={`${extracted.gwpA1C4} kgCO₂e/kg`} />
            )}
            {extracted.epdNumber && (
              <Row label="EPD No." value={extracted.epdNumber} />
            )}
            {extracted.epdProgram && (
              <Row label="Program" value={extracted.epdProgram} />
            )}
            {extracted.validTo && (
              <Row label="Expires" value={extracted.validTo} />
            )}
            {extracted.recycledContentPct != null && (
              <Row label="Recycled content" value={`${extracted.recycledContentPct}%`} />
            )}
            {extracted.facilityLocation && (
              <Row label="Facility" value={extracted.facilityLocation} />
            )}
          </div>

          {extracted.certifications.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {extracted.certifications.map(c => (
                <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>
              ))}
            </div>
          )}

          <p className="text-xs text-gray-500 pt-1">
            Fields pre-filled below — review and adjust before saving.
          </p>

          <div className="flex gap-2 pt-1">
            <Button variant="outline" size="sm" type="button" onClick={reset}>
              Upload a different file
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Small helper ──────────────────────────────────────────────────────────────

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <span className="text-gray-500">{label}: </span>
      <span className={`font-medium ${highlight ? "text-green-700" : "text-gray-800"}`}>
        {value}
      </span>
    </div>
  );
}
