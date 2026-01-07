"use client";
import { useState, useCallback } from "react";

export default function SubmittalGeneratorPage() {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

    const handleFiles = useCallback(async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        setError(null);
        setDownloading(null);
        setUploading(true);
        try {
            const form = new FormData();
            form.append("file", files[0]);

            const res = await fetch("/api/submittal/generate", {
                method: "POST",
                body: form,
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data?.error || "Failed to generate submittal");
            }

            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            setDownloadUrl(url);
        } catch (e: any) {
            setError(e?.message || "Unexpected error");
        } finally {
            setUploading(false);
        }
    }, []);

    // small helper due to TS strictness
    const setDownloading = (val: string | null) => setDownloadUrl(val);

    return (
        <div className="min-h-screen bg-slate-50">
            <section className="bg-white border-b border-slate-200 py-12 px-6">
                <div className="max-w-5xl mx-auto text-center">
                    <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-4">
                        Submittal Auto-Generator
                    </h1>
                    <p className="text-slate-600 text-lg">
                        Drag in your Spec Book PDF. Get a verified submittal package in about a minute.
                    </p>
                </div>
            </section>

            <section className="py-12 px-6">
                <div className="max-w-3xl mx-auto">
                    <div
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                            e.preventDefault();
                            handleFiles(e.dataTransfer?.files ?? null);
                        }}
                        className="border-2 border-dashed border-slate-300 rounded-2xl p-10 bg-white text-center hover:border-slate-400 transition-colors"
                    >
                        <p className="text-slate-700 mb-4 font-semibold">Drag & Drop Spec PDF here</p>
                        <p className="text-slate-500 mb-6 text-sm">or click to choose a file</p>
                        <label className="inline-block bg-slate-900 text-white px-5 py-2 rounded-lg cursor-pointer hover:bg-slate-800">
                            Choose PDF
                            <input
                                type="file"
                                accept="application/pdf"
                                onChange={(e) => handleFiles(e.target.files)}
                                className="hidden"
                            />
                        </label>
                    </div>

                    {uploading && (
                        <div className="mt-6 text-slate-700">Generating submittal package…</div>
                    )}
                    {error && (
                        <div className="mt-6 text-red-600">{error}</div>
                    )}
                    {downloadUrl && (
                        <div className="mt-6 flex items-center gap-3">
                            <a
                                href={downloadUrl}
                                download="GreenChainz_Submittal.pdf"
                                className="inline-block bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg font-semibold"
                            >
                                Download Submittal Package
                            </a>
                            <button
                                onClick={() => setDownloadUrl(null)}
                                className="text-slate-600 hover:text-slate-800"
                            >
                                Clear
                            </button>
                        </div>
                    )}

                    <div className="mt-10 text-sm text-slate-500">
                        <p>
                            Notes: We parse your spec with Azure Document Intelligence, extract criteria with Azure OpenAI,
                            match products with EPDs in our database, and merge a polished PDF package for submittal.
                        </p>
                    </div>
                </div>
            </section>
        </div>
    );
}
