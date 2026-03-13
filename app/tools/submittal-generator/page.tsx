"use client";
import { useState, useCallback } from "react";
import { Upload, CheckCircle, AlertCircle, Loader2, FileText } from "lucide-react";

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
        </div>
    );
}
