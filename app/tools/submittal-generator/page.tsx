"use client";
import { useState, useCallback, useMemo } from "react";
import { Upload, CheckCircle, AlertCircle, Loader2, FileText, Download } from "lucide-react";
import { calculateAssemblyLevelImpact } from "@/lib/greenchainz/scoring/ccps-engine";
import type { AssemblyRowWithEc3 } from "@/app/api/submittals/assemblies/ingest/route";
import type { AssemblyReportPayload } from "@/app/api/submittals/assemblies/report/route";

type BaseImpactView = ReturnType<typeof calculateAssemblyLevelImpact>;

type AssemblyImpactView = BaseImpactView & {
    gwpSource: "EC3" | "Schedule";
    gwpDiffPercent?: number;
    ec3ValidUntil?: string;
};

interface ExtractionResult {
    requirements: {
        materialType: string | null;
        maxCarbon?: number | null;
        minRecycledPercent?: number | null;
        standards: string[];
        requiredCerts: string[];
    };
    matches: Array<{
        ProductID: number;
        ProductName: string;
        SupplierName?: string;
        CategoryName: string | null;
        GlobalWarmingPotential: number | null;
    }>;
}

export default function SubmittalGeneratorPage() {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [_fileName, setFileName] = useState<string | null>(null);
    const [_extractionResult, setExtractionResult] = useState<ExtractionResult | null>(null);
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
    const [stage, setStage] = useState<"upload" | "processing" | "results" | "complete">("upload");

    // EWS assembly ingestion state
    const [ewsUploading, setEwsUploading] = useState(false);
    const [ewsError, setEwsError] = useState<string | null>(null);
    const [assemblies, setAssemblies] = useState<AssemblyImpactView[]>([]);

    // Defensibility report metadata
    const [projectName, setProjectName] = useState("");
    const [facadeScope, setFacadeScope] = useState("");
    const [architectName, setArchitectName] = useState("");
    const [architectFirm, setArchitectFirm] = useState("");
    const [reportDownloading, setReportDownloading] = useState(false);
    const [reportError, setReportError] = useState<string | null>(null);

    const reportReady = assemblies.length > 0 && projectName.trim() !== "" && facadeScope.trim() !== "";

    const grandTotal = useMemo(
        () => assemblies.reduce((sum, a) => sum + a.totalKgCO2ePer1000SF, 0),
        [assemblies]
    );

    const hotspots = useMemo(
        () =>
            [...assemblies]
                .sort((a, b) => b.totalKgCO2ePer1000SF - a.totalKgCO2ePer1000SF)
                .slice(0, 3),
        [assemblies]
    );

    const handleFiles = useCallback(async (files: FileList | null) => {
        if (!files || files.length === 0) return;

        const file = files[0];
        if (!file.name.toLowerCase().endsWith(".pdf")) {
            setError("Only PDF files are supported");
            return;
        }

        setError(null);
        setFileName(file.name);
        setUploading(true);
        setStage("processing");

        try {
            const form = new FormData();
            form.append("file", file);

            const res = await fetch("/api/submittal/generate", {
                method: "POST",
                body: form,
            });

            if (!res.ok) {
                if (res.headers.get("content-type")?.includes("application/json")) {
                    const data = await res.json();
                    throw new Error(data?.error || "Failed to generate submittal");
                } else {
                    throw new Error(`Server error: ${res.statusText}`);
                }
            }

            // Handle PDF response
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            setDownloadUrl(url);
            setStage("complete");
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Unexpected error");
            setStage("upload");
        } finally {
            setUploading(false);
        }
    }, []);

    const handleEwsUpload = async (file: File) => {
        setEwsUploading(true);
        setEwsError(null);

        try {
            const formData = new FormData();
            formData.append("file", file);

            const res = await fetch("/api/submittals/assemblies/ingest", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                const body = await res.text();
                throw new Error(body || `Upload failed with ${res.status}`);
            }

            const data = (await res.json()) as { rows: AssemblyRowWithEc3[] };

            const impacts: AssemblyImpactView[] = data.rows.map((row) => {
                const useEc3 = row.ec3 !== undefined;
                const gwpToUse = row.ec3?.gwpPerUnit ?? row.gwpPerFunctionalUnit;
                const unitLabel = row.ec3?.unit ?? row.functionalUnitLabel;

                const base = calculateAssemblyLevelImpact({
                    assemblyId: row.assemblyId,
                    description: row.description,
                    manufacturer: row.manufacturer,
                    epdNumber: row.epdNumber,
                    gwpPerFunctionalUnit: gwpToUse,
                    msfFactor: row.msfFactor,
                    functionalUnitLabel: unitLabel,
                });

                return {
                    ...base,
                    gwpSource: useEc3 ? "EC3" : "Schedule",
                    ...(row.ec3?.gwpDiffPercent !== undefined ? { gwpDiffPercent: row.ec3.gwpDiffPercent } : {}),
                    ...(row.ec3?.validUntil ? { ec3ValidUntil: row.ec3.validUntil } : {}),
                };
            });

            setAssemblies(impacts);
        } catch (e: unknown) {
            setEwsError(e instanceof Error ? e.message : "Unknown error");
        } finally {
            setEwsUploading(false);
        }
    };

    const handleDownloadReport = async () => {
        if (!reportReady) return;
        setReportDownloading(true);
        setReportError(null);

        try {
            const payload: AssemblyReportPayload = {
                projectName: projectName.trim(),
                facadeScope: facadeScope.trim(),
                architectName: architectName.trim() || undefined,
                architectFirm: architectFirm.trim() || undefined,
                assemblies: assemblies.map((a) => ({
                    assemblyId: a.assemblyId,
                    description: a.description,
                    manufacturer: a.manufacturer,
                    epdNumber: a.epdNumber,
                    gwpPerFunctionalUnit: a.gwpPerFunctionalUnit,
                    msfFactor: a.msfFactor,
                    totalKgCO2ePer1000SF: a.totalKgCO2ePer1000SF,
                    gwpSource: a.gwpSource,
                    ...(a.gwpDiffPercent !== undefined ? { gwpDiffPercent: a.gwpDiffPercent } : {}),
                    ...(a.ec3ValidUntil ? { ec3ValidUntil: a.ec3ValidUntil } : {}),
                })),
            };

            const res = await fetch("/api/submittals/assemblies/report", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const body = await res.text();
                throw new Error(body || `Report generation failed with status ${res.status}`);
            }

            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `greenchainz-defensibility-report-${projectName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (e: unknown) {
            setReportError(e instanceof Error ? e.message : "Failed to generate report");
        } finally {
            setReportDownloading(false);
        }
    };

    const resetForm = () => {
        setError(null);
        setFileName(null);
        setExtractionResult(null);
        setDownloadUrl(null);
        setStage("upload");
    };

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <section className="bg-white border-b border-slate-200 py-12 px-6">
                <div className="max-w-5xl mx-auto text-center">
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <FileText className="w-8 h-8 text-green-600" />
                        <h1 className="text-4xl md:text-5xl font-black text-slate-900">
                            Submittal Auto-Generator
                        </h1>
                    </div>
                    <p className="text-slate-600 text-lg max-w-2xl mx-auto">
                        Drag your specification PDF. We extract requirements, find verified suppliers, and generate a professional submittal package in seconds.
                    </p>
                </div>
            </section>

            {/* Main Content */}
            <section className="py-12 px-6">
                <div className="max-w-4xl mx-auto">
                    {/* Upload Zone */}
                    {(stage === "upload" || stage === "processing") && (
                        <div
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                                e.preventDefault();
                                handleFiles(e.dataTransfer?.files ?? null);
                            }}
                            className="border-2 border-dashed border-slate-300 rounded-2xl p-12 bg-white text-center hover:border-green-500 transition-all hover:shadow-lg"
                        >
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center">
                                    <Upload className="w-8 h-8 text-green-600" />
                                </div>
                                <div>
                                    <p className="text-lg font-semibold text-slate-900 mb-1">
                                        {uploading ? "Processing..." : "Drag & Drop Spec PDF"}
                                    </p>
                                    <p className="text-slate-500 text-sm mb-4">
                                        or click to choose a file
                                    </p>
                                </div>

                                {uploading ? (
                                    <div className="flex items-center gap-2 text-slate-600">
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span>Analyzing specification...</span>
                                    </div>
                                ) : (
                                    <label className="inline-block bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg cursor-pointer font-semibold transition">
                                        Choose PDF
                                        <input
                                            type="file"
                                            accept=".pdf"
                                            onChange={(e) => handleFiles(e.target.files)}
                                            className="hidden"
                                            disabled={uploading}
                                        />
                                    </label>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Error Display */}
                    {error && (
                        <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
                            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-semibold text-red-900">Error</p>
                                <p className="text-red-700 text-sm">{error}</p>
                            </div>
                        </div>
                    )}

                    {/* Results Display */}
                    {stage === "complete" && downloadUrl && (
                        <div className="space-y-6">
                            <div className="bg-green-50 border border-green-200 rounded-lg p-6 flex gap-4 items-start">
                                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-bold text-green-900 text-lg">
                                        Submittal Package Generated Successfully!
                                    </p>
                                    <p className="text-green-700 text-sm mt-1">
                                        Your PDF is ready to download and submit to the architect.
                                    </p>
                                </div>
                            </div>

                            <div className="bg-white border border-slate-200 rounded-lg p-8 space-y-4">
                                <h3 className="text-xl font-bold text-slate-900">
                                    What's Included
                                </h3>
                                <ul className="space-y-3">
                                    <li className="flex items-start gap-3">
                                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                        <span className="text-slate-700">
                                            <strong>Cover Sheet:</strong> GreenChainz verification badge
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                        <span className="text-slate-700">
                                            <strong>Criteria Summary:</strong> Your specification requirements extracted
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                        <span className="text-slate-700">
                                            <strong>Verified Products:</strong> Top 3 matches from certified suppliers
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                        <span className="text-slate-700">
                                            <strong>EPD Documents:</strong> Official Environmental Product Declarations attached
                                        </span>
                                    </li>
                                </ul>
                            </div>

                            <div className="flex gap-4">
                                <a
                                    href={downloadUrl}
                                    download="GreenChainz_Submittal.pdf"
                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-4 rounded-lg font-bold text-center transition shadow-lg hover:shadow-xl"
                                >
                                    ⬇️ Download Submittal Package
                                </a>
                                <button
                                    onClick={resetForm}
                                    className="px-6 py-4 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg font-semibold transition"
                                >
                                    Generate Another
                                </button>
                            </div>

                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-600">
                                <p className="font-semibold text-slate-900 mb-2">Next Steps:</p>
                                <ol className="list-decimal list-inside space-y-1">
                                    <li>Download the PDF above</li>
                                    <li>Review the proposed products and verify they match your needs</li>
                                    <li>Submit to your architect for approval</li>
                                    <li>Share with contractor for procurement</li>
                                </ol>
                            </div>
                        </div>
                    )}

                    {/* Info Section */}
                    <div className="mt-12 grid md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-lg border border-slate-200">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                                <span className="text-xl font-bold text-blue-600">1</span>
                            </div>
                            <h4 className="font-bold text-slate-900 mb-2">Upload Spec</h4>
                            <p className="text-sm text-slate-600">
                                Drag in your architectural specification PDF. We support Section 03, 04, 05, etc.
                            </p>
                        </div>
                        <div className="bg-white p-6 rounded-lg border border-slate-200">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                                <span className="text-xl font-bold text-blue-600">2</span>
                            </div>
                            <h4 className="font-bold text-slate-900 mb-2">AI Extracts</h4>
                            <p className="text-sm text-slate-600">
                                Our AI reads your spec, extracts criteria, and identifies material requirements.
                            </p>
                        </div>
                        <div className="bg-white p-6 rounded-lg border border-slate-200">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                                <span className="text-xl font-bold text-blue-600">3</span>
                            </div>
                            <h4 className="font-bold text-slate-900 mb-2">We Package It</h4>
                            <p className="text-sm text-slate-600">
                                Verified products + EPDs combined into one professional submittal PDF.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* EWS Assembly Carbon Section */}
            <section className="py-12 px-6 bg-white border-t border-slate-200">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-2xl font-bold text-slate-900 mb-1">
                        Assembly Carbon Table (EWS PDF)
                    </h2>
                    <p className="text-slate-600 text-sm mb-6">
                        Drop the architect&apos;s EWS combined assemblies PDF to calculate total kgCO2e per 1,000 SF for each assembly row.
                    </p>

                    <div
                        className="border-2 border-dashed border-slate-300 rounded-2xl p-10 bg-slate-50 text-center hover:border-green-500 transition-all hover:shadow-lg"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                            e.preventDefault();
                            const file = e.dataTransfer.files?.[0];
                            if (file) handleEwsUpload(file);
                        }}
                    >
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center">
                                <FileText className="w-7 h-7 text-green-600" />
                            </div>
                            {ewsUploading ? (
                                <div className="flex items-center gap-2 text-slate-600">
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>Processing table and calculating impacts…</span>
                                </div>
                            ) : (
                                <label
                                    htmlFor="ews-upload-input"
                                    className="inline-block bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg cursor-pointer font-semibold transition"
                                >
                                    Choose EWS PDF
                                    <input
                                        type="file"
                                        id="ews-upload-input"
                                        accept="application/pdf"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) handleEwsUpload(file);
                                        }}
                                    />
                                </label>
                            )}
                            <p className="text-slate-500 text-sm">or drag &amp; drop EWS_Combined PDF here</p>
                        </div>
                    </div>

                    {ewsError && (
                        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
                            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                            <p className="text-red-700 text-sm">{ewsError}</p>
                        </div>
                    )}

                    {assemblies.length > 0 && (
                        <>
                            {/* Summary bar */}
                            <div className="mt-6 flex flex-wrap gap-4">
                                <div className="flex-1 min-w-[180px] bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                                    <p className="text-xs text-green-700 font-semibold uppercase tracking-wide">Grand Total</p>
                                    <p className="text-2xl font-black text-green-800">{grandTotal.toLocaleString()}</p>
                                    <p className="text-xs text-green-600">kgCO₂e / 1,000 SF</p>
                                </div>
                                {hotspots.length > 0 && (
                                    <div className="flex-1 min-w-[220px] bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                                        <p className="text-xs text-amber-700 font-semibold uppercase tracking-wide mb-1">Top Hotspots</p>
                                        {hotspots.map((h, i) => (
                                            <p key={h.assemblyId} className="text-xs text-amber-800">
                                                {i + 1}. {h.assemblyId} — {h.totalKgCO2ePer1000SF.toLocaleString()} kgCO₂e
                                            </p>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Assembly table */}
                            <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200">
                                <table className="min-w-full text-sm bg-white">
                                    <thead className="bg-slate-50 border-b border-slate-200">
                                        <tr>
                                            <th className="text-left px-4 py-3 font-semibold text-slate-700">Assembly</th>
                                            <th className="text-left px-4 py-3 font-semibold text-slate-700">EPD #</th>
                                            <th className="text-right px-4 py-3 font-semibold text-slate-700">GWP / unit</th>
                                            <th className="text-right px-4 py-3 font-semibold text-slate-700">Factor (1000 SF)</th>
                                            <th className="text-right px-4 py-3 font-semibold text-slate-700">Total kgCO2e / 1000 SF</th>
                                            <th className="text-left px-4 py-3 font-semibold text-slate-700">Source</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {assemblies.map((a) => {
                                            const hasBigDiff = a.gwpDiffPercent !== undefined && Math.abs(a.gwpDiffPercent) > 10;
                                            return (
                                                <tr key={`${a.assemblyId}-${a.epdNumber}`} className="border-b border-slate-100 hover:bg-slate-50">
                                                    <td className="px-4 py-2 text-slate-900">{a.assemblyId}</td>
                                                    <td className="px-4 py-2 text-slate-600 font-mono text-xs">{a.epdNumber}</td>
                                                    <td className="px-4 py-2 text-right text-slate-700">{a.gwpPerFunctionalUnit.toFixed(1)}</td>
                                                    <td className="px-4 py-2 text-right text-slate-700">{a.msfFactor.toFixed(3)}</td>
                                                    <td className="px-4 py-2 text-right font-bold text-green-700">{a.totalKgCO2ePer1000SF.toLocaleString()}</td>
                                                    <td className="px-4 py-2 text-left">
                                                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                                                            a.gwpSource === "EC3"
                                                                ? "bg-green-100 text-green-800"
                                                                : "bg-slate-100 text-slate-600"
                                                        }`}>
                                                            {a.gwpSource === "EC3" ? "EC3" : "Schedule"}
                                                            {hasBigDiff && (
                                                                <span title={`GWP differs from schedule by ${a.gwpDiffPercent}%`} className="text-amber-600">⚠</span>
                                                            )}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Defensibility Report form */}
                            <div className="mt-8 bg-slate-50 border border-slate-200 rounded-xl p-6">
                                <h3 className="text-lg font-bold text-slate-900 mb-1">Download Defensibility Report</h3>
                                <p className="text-slate-500 text-sm mb-5">
                                    Generate a branded PDF with assembly carbon data, hotspots, methodology, and a signature block.
                                </p>

                                <div className="grid sm:grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                                            Project Name <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={projectName}
                                            onChange={(e) => setProjectName(e.target.value)}
                                            placeholder="e.g. 123 Main Street Mixed-Use"
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                                            Facade / Scope <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={facadeScope}
                                            onChange={(e) => setFacadeScope(e.target.value)}
                                            placeholder="e.g. Exterior Facade Package — Level 3-12"
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                                            Architect Name <span className="text-slate-400 font-normal">(optional)</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={architectName}
                                            onChange={(e) => setArchitectName(e.target.value)}
                                            placeholder="e.g. Jane Smith, AIA"
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                                            Architect Firm <span className="text-slate-400 font-normal">(optional)</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={architectFirm}
                                            onChange={(e) => setArchitectFirm(e.target.value)}
                                            placeholder="e.g. Smith & Partners Architecture"
                                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                                        />
                                    </div>
                                </div>

                                {!reportReady && assemblies.length > 0 && (
                                    <p className="text-xs text-amber-700 mb-3 flex items-center gap-1">
                                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                                        Project name and facade scope are required to generate the report.
                                    </p>
                                )}

                                {reportError && (
                                    <div className="mb-3 bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2">
                                        <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                                        <p className="text-red-700 text-sm">{reportError}</p>
                                    </div>
                                )}

                                <button
                                    onClick={handleDownloadReport}
                                    disabled={!reportReady || reportDownloading}
                                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-semibold transition shadow-sm"
                                >
                                    {reportDownloading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Generating PDF…
                                        </>
                                    ) : (
                                        <>
                                            <Download className="w-4 h-4" />
                                            Download Defensibility Report
                                        </>
                                    )}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </section>
        </div>
    );
}
