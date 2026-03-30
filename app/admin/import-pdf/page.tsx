"use client";

import { useState, useRef, useCallback } from "react";

interface ExtractedMaterial {
  name: string;
  productName: string | null;
  manufacturer: string | null;
  category: string;
  gwpValue: string | null;
  gwpUnit: string | null;
  epdNumber: string | null;
  description: string | null;
  _embodiedCarbonPer1000SF?: number | null;
}

interface ImportResult {
  success: boolean;
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
  materials: ExtractedMaterial[];
  filename: string;
  textLength: number;
  dryRun: boolean;
}

type Stage = "idle" | "uploading" | "extracting" | "preview" | "importing" | "done" | "error";

export default function ImportPDFPage() {
  const [stage, setStage] = useState<Stage>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewResult, setPreviewResult] = useState<ImportResult | null>(null);
  const [finalResult, setFinalResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addLog = (msg: string) => setLog((prev) => [...prev, msg]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped?.type === "application/pdf") {
      setFile(dropped);
      setPreviewResult(null);
      setFinalResult(null);
      setError(null);
      setLog([]);
      setStage("idle");
    } else {
      setError("Please drop a PDF file.");
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setPreviewResult(null);
      setFinalResult(null);
      setError(null);
      setLog([]);
      setStage("idle");
    }
  };

  const runExtraction = async (dryRun: boolean) => {
    if (!file) return;
    setError(null);

    try {
      if (dryRun) {
        setStage("uploading");
        addLog(`Uploading ${file.name} (${(file.size / 1024).toFixed(0)} KB)...`);
      } else {
        setStage("importing");
        addLog("Importing extracted materials to database...");
      }

      const formData = new FormData();
      formData.append("pdf", file);

      const url = `/api/admin/import-pdf-materials${dryRun ? "?dryRun=true" : ""}`;

      if (dryRun) {
        addLog("Extracting PDF text...");
        setStage("extracting");
        // Give UI a tick to update
        await new Promise((r) => setTimeout(r, 100));
      }

      const res = await fetch(url, { method: "POST", body: formData });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || `Server error ${res.status}`);
      }

      const data: ImportResult = await res.json();

      if (dryRun) {
        addLog(`GPT-4o extracted ${data.materials.length} materials from ${data.textLength.toLocaleString()} chars of text.`);
        setPreviewResult(data);
        setStage("preview");
      } else {
        addLog(`Import complete: ${data.created} created, ${data.updated} updated, ${data.errors.length} errors.`);
        setFinalResult(data);
        setStage("done");
      }
    } catch (err: any) {
      setError(err.message || String(err));
      setStage("error");
      addLog(`Error: ${err.message}`);
    }
  };

  const categoryColors: Record<string, string> = {
    Concrete: "bg-gray-600",
    Steel: "bg-blue-700",
    Aluminum: "bg-sky-600",
    Glass: "bg-cyan-600",
    Insulation: "bg-orange-600",
    "Gypsum Board": "bg-yellow-600",
    Masonry: "bg-stone-600",
    Wood: "bg-amber-700",
    Roofing: "bg-red-700",
    Other: "bg-purple-600",
  };

  return (
    <div className="min-h-screen bg-gc-evergreen-700 p-6 md:p-10">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">📄</span>
            <h1 className="text-2xl font-bold text-white">PDF EPD Importer</h1>
            <span className="px-2 py-0.5 bg-gc-fern-500 text-white text-xs rounded-full font-semibold">
              GPT-4o Powered
            </span>
          </div>
          <p className="text-gc-evergreen-300 text-sm">
            Upload any EPD table PDF. GPT-4o extracts structured material records — manufacturer,
            GWP, EPD number, declared unit — and imports them directly to the catalog.
          </p>
        </div>

        {/* Drop Zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all
            ${isDragging
              ? "border-gc-fern-400 bg-gc-fern-900/30"
              : file
              ? "border-gc-fern-500 bg-gc-evergreen-600/50"
              : "border-gc-evergreen-500 bg-gc-evergreen-600/30 hover:border-gc-fern-500"
            }
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleFileChange}
          />
          {file ? (
            <div>
              <div className="text-4xl mb-3">📋</div>
              <p className="text-white font-semibold">{file.name}</p>
              <p className="text-gc-evergreen-300 text-sm mt-1">
                {(file.size / 1024).toFixed(0)} KB — click to change
              </p>
            </div>
          ) : (
            <div>
              <div className="text-4xl mb-3">📂</div>
              <p className="text-white font-semibold">Drop an EPD PDF here</p>
              <p className="text-gc-evergreen-300 text-sm mt-1">or click to browse — max 20 MB</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {file && (
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => runExtraction(true)}
              disabled={["uploading", "extracting", "importing"].includes(stage)}
              className="flex-1 bg-gc-evergreen-500 hover:bg-gc-evergreen-400 disabled:opacity-50 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              {stage === "uploading" || stage === "extracting"
                ? "⏳ Extracting..."
                : "🔍 Preview extraction"}
            </button>
            {previewResult && (
              <button
                onClick={() => runExtraction(false)}
                disabled={stage === "importing"}
                className="flex-1 bg-gc-fern-500 hover:bg-gc-fern-400 disabled:opacity-50 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                {stage === "importing"
                  ? "⏳ Importing..."
                  : `✅ Import ${previewResult.materials.length} materials`}
              </button>
            )}
          </div>
        )}

        {/* Log */}
        {log.length > 0 && (
          <div className="mt-4 bg-black/30 rounded-lg p-4 font-mono text-sm text-gc-fern-300 space-y-1">
            {log.map((l, i) => (
              <div key={i}>▸ {l}</div>
            ))}
            {["uploading", "extracting", "importing"].includes(stage) && (
              <div className="animate-pulse text-gc-fern-400">⏳ Working...</div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 bg-red-900/50 border border-red-500 rounded-lg p-4 text-red-200 text-sm">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Preview Results */}
        {(previewResult || finalResult) && (
          <div className="mt-6">
            {finalResult && (
              <div className="mb-4 bg-gc-fern-900/50 border border-gc-fern-500 rounded-lg p-4 text-white">
                <div className="text-lg font-bold text-gc-fern-300 mb-1">✅ Import Complete</div>
                <div className="flex gap-6 text-sm">
                  <span><strong className="text-green-400">{finalResult.created}</strong> created</span>
                  <span><strong className="text-blue-400">{finalResult.updated}</strong> updated</span>
                  <span><strong className="text-yellow-400">{finalResult.skipped}</strong> skipped</span>
                  {finalResult.errors.length > 0 && (
                    <span><strong className="text-red-400">{finalResult.errors.length}</strong> errors</span>
                  )}
                </div>
                {finalResult.errors.length > 0 && (
                  <ul className="mt-2 text-red-300 text-xs list-disc list-inside">
                    {finalResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                )}
              </div>
            )}

            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white font-semibold">
                {finalResult ? "Imported" : "Extracted"} Materials
                <span className="ml-2 text-gc-evergreen-300 text-sm font-normal">
                  ({(previewResult || finalResult)!.materials.length} total)
                </span>
              </h2>
              {previewResult && !finalResult && (
                <span className="text-xs text-gc-evergreen-400 italic">
                  Preview only — nothing saved yet
                </span>
              )}
            </div>

            <div className="space-y-2">
              {(previewResult || finalResult)!.materials.map((mat, i) => (
                <div
                  key={i}
                  className="bg-gc-evergreen-600/50 border border-gc-evergreen-500 rounded-lg p-4 flex items-start gap-4"
                >
                  <span
                    className={`text-xs font-semibold text-white px-2 py-1 rounded shrink-0 ${
                      categoryColors[mat.category] || "bg-purple-600"
                    }`}
                  >
                    {mat.category}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-semibold text-sm truncate">
                      {mat.manufacturer && (
                        <span className="text-gc-fern-400 mr-2">{mat.manufacturer}</span>
                      )}
                      {mat.productName || mat.name}
                    </div>
                    <div className="text-gc-evergreen-300 text-xs mt-0.5 truncate">{mat.name}</div>
                    <div className="flex gap-4 mt-1.5 text-xs">
                      {mat.gwpValue && mat.gwpUnit && (
                        <span className="text-orange-300">
                          GWP: {mat.gwpValue} {mat.gwpUnit}
                        </span>
                      )}
                      {mat.epdNumber && (
                        <span className="text-gc-evergreen-300 font-mono">EPD: {mat.epdNumber}</span>
                      )}
                      {mat._embodiedCarbonPer1000SF && (
                        <span className="text-yellow-300">
                          {mat._embodiedCarbonPer1000SF.toLocaleString()} kgCO2e/1000SF
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        {stage === "idle" && !file && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                icon: "📄",
                title: "Upload any EPD PDF",
                desc: "Works with EC3 exports, manufacturer EPD tables, assembly comparison sheets, and product spec PDFs with GWP data.",
              },
              {
                icon: "🤖",
                title: "GPT-4o extracts structure",
                desc: "Handles messy multi-column layouts, mixed units, repeated assemblies. Deduplicates by EPD number automatically.",
              },
              {
                icon: "✅",
                title: "Preview then import",
                desc: "Review all extracted materials before committing. Safe to re-run — updates existing records matched by EPD number.",
              },
            ].map((card) => (
              <div key={card.title} className="bg-gc-evergreen-600/30 border border-gc-evergreen-500 rounded-xl p-5">
                <div className="text-2xl mb-2">{card.icon}</div>
                <div className="text-white font-semibold text-sm mb-1">{card.title}</div>
                <div className="text-gc-evergreen-300 text-xs leading-relaxed">{card.desc}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
