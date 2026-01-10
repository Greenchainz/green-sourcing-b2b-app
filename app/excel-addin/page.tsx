"use client";

import { useState, useEffect } from "react";
import { AlertCircle, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";

interface AuditResult {
    original: string;
    carbon_score?: number;
    health_grade?: "A" | "C" | "F";
    red_list_status?: "Free" | "Approved" | "None";
    verified?: boolean;
    alternative_name?: string;
    certifications?: string[];
    error?: string;
}

export default function ExcelTaskPane() {
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<AuditResult[]>([]);
    const [selectedCount, setSelectedCount] = useState(0);
    const [message, setMessage] = useState("Ready to audit your materials.");

    // Initialize Office.js
    useEffect(() => {
        const initializeOffice = async () => {
            if (typeof window !== "undefined" && typeof Office !== "undefined") {
                Office.onReady(() => {
                    setMessage("GreenChainz loaded. Select a column of materials to begin.");
                });
            }
        };
        initializeOffice();
    }, []);

    const handleAudit = async () => {
        if (typeof Excel === "undefined") {
            setMessage("Excel library not loaded. Please ensure you're running Excel Online or Office 365.");
            return;
        }

        setLoading(true);
        setMessage("Fetching materials from selection...");

        try {
            await Excel.run(async (context) => {
                // Get the selected range
                const range = context.workbook.getSelectedRange();
                range.load("values, rowCount, columnCount");
                await context.sync();

                if (!range.values || range.values.length === 0) {
                    setMessage("No cells selected. Please select a column of material names.");
                    setLoading(false);
                    return;
                }

                // Extract materials (assumes single column selection)
                const materials = range.values
                    .map((row: unknown[]) => row[0])
                    .filter((item: unknown) => item && String(item).trim().length > 0)
                    .map((item: unknown) => String(item).trim());

                setSelectedCount(materials.length);
                setMessage(`Auditing ${materials.length} materials...`);

                // Call backend API
                const response = await fetch("/api/audit/excel-batch", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ materials }),
                });

                if (!response.ok) {
                    throw new Error(`API error: ${response.statusText}`);
                }

                const data = await response.json();
                setResults(data.results);

                // Append results to Excel (3 columns to the right of selection)
                if (data.results && data.results.length > 0) {
                    const resultRange = range
                        .getOffsetRange(0, 1)
                        .getResizedRange(range.rowCount - 1, 3);

                    const writeValues = data.results.map((item: AuditResult) => [
                        item.carbon_score?.toFixed(1) ?? "N/A", // Column 1: Carbon (kgCO2e)
                        item.health_grade === "A"
                            ? "🟢 Grade A"
                            : item.health_grade === "C"
                                ? "🟡 Grade C"
                                : item.health_grade === "F"
                                    ? "🔴 Grade F"
                                    : "⚪ Unknown", // Column 2: Health Grade
                        item.red_list_status === "Free"
                            ? "✅ Red List Free"
                            : item.red_list_status === "Approved"
                                ? "⚠️ Approved"
                                : "❌ Not Verified", // Column 3: Compliance Status
                    ]);

                    resultRange.values = writeValues;
                    resultRange.format.font.size = 11;
                    resultRange.format.autofitColumns();

                    await context.sync();
                    setMessage(`✅ Audit complete. Appended ${materials.length} results.`);
                }
            });
        } catch (error) {
            setMessage(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-sm mx-auto p-4 bg-gradient-to-b from-slate-50 to-white rounded-lg shadow-sm">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900 mb-1">GreenChainz</h1>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Carbon Audit for Excel</p>
            </div>

            {/* Status Message */}
            <div
                className={`mb-4 p-3 rounded-md text-sm flex items-start gap-2 ${message.includes("Error")
                        ? "bg-red-50 text-red-700"
                        : message.includes("complete")
                            ? "bg-green-50 text-green-700"
                            : "bg-blue-50 text-blue-700"
                    }`}
            >
                {message.includes("Error") ? (
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                ) : message.includes("complete") ? (
                    <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                ) : (
                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                )}
                <span>{message}</span>
            </div>

            {/* Instructions */}
            <div className="mb-6 bg-slate-100 p-3 rounded-md text-xs text-slate-700">
                <strong>How to use:</strong>
                <ol className="mt-2 space-y-1 ml-3 list-decimal">
                    <li>Select a column of material names in your spreadsheet</li>
                    <li>Click "Run Audit" below</li>
                    <li>We'll append 3 columns: Carbon (kgCO2e), Health Grade, and Compliance Status</li>
                </ol>
            </div>

            {/* Audit Button */}
            <button
                onClick={handleAudit}
                disabled={loading}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-400 text-white py-3 rounded-lg font-bold transition-all duration-200 flex items-center justify-center gap-2"
            >
                {loading ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Auditing... ({selectedCount} materials)
                    </>
                ) : (
                    "Run Audit"
                )}
            </button>

            {/* Results Preview */}
            {results.length > 0 && (
                <div className="mt-6 border-t pt-4">
                    <h3 className="text-sm font-semibold text-slate-900 mb-3">Results Preview</h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                        {results.slice(0, 5).map((result, idx) => (
                            <div
                                key={idx}
                                className="p-2 bg-slate-50 rounded text-xs border border-slate-200"
                            >
                                <p className="font-medium text-slate-900 truncate">{result.original}</p>
                                <div className="mt-1 grid grid-cols-2 gap-2 text-slate-600">
                                    <span>
                                        Carbon:{" "}
                                        <span className="font-semibold">{result.carbon_score?.toFixed(1) ?? "N/A"}</span> kgCO2e
                                    </span>
                                    <span>
                                        Grade:{" "}
                                        <span className="font-semibold">{result.health_grade ?? "Unknown"}</span>
                                    </span>
                                </div>
                            </div>
                        ))}
                        {results.length > 5 && (
                            <p className="text-xs text-slate-500 italic">+{results.length - 5} more...</p>
                        )}
                    </div>
                </div>
            )}

            {/* Footer */}
            <div className="mt-6 pt-4 border-t text-xs text-slate-500">
                <p>Data powered by Building Transparency (EC3) and EPD International</p>
                <p className="mt-2">
                    <a href="https://greenchainz.com" className="text-green-600 hover:underline">
                        Learn more about GreenChainz
                    </a>
                </p>
            </div>
        </div>
    );
}
