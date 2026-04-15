import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "../lib/trpc";

export default function ArchitectSpecsUpload() {
  const [, navigate] = useLocation();
  const [file, setFile] = useState<File | null>(null);
  const [projectName, setProjectName] = useState("");
  const [projectLocation, setProjectLocation] = useState("");
  const [estimatedValue, setEstimatedValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);

  const uploadFile = trpc.architectSpec.uploadFile.useMutation();
  const uploadAndParse = trpc.architectSpec.uploadAndParse.useMutation();

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Please select a file");
      return;
    }

    setLoading(true);
    setError("");
    setProgress(25);

    try {
      // Read file as base64
      const buffer = await file.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      setProgress(50);

      // Upload file to Azure Blob Storage
      const uploadResult = await uploadFile.mutateAsync({
        fileBufferBase64: base64,
        originalFilename: file.name,
        mimeType: file.type,
      });

      setProgress(75);

      // Parse the spec
      const parseResult = await uploadAndParse.mutateAsync({
        originalFilename: file.name,
        blobUrl: uploadResult.blobUrl,
        mimeType: file.type,
        fileBufferBase64: base64,
        projectName: projectName || undefined,
        projectLocation: projectLocation || undefined,
        estimatedValue: estimatedValue ? parseFloat(estimatedValue) : undefined,
      });

      setProgress(100);

      // Redirect to results page
      setTimeout(() => {
        navigate(`/architect/specs/${parseResult.specId}`);
      }, 500);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to upload spec"
      );
      setProgress(0);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Upload Embodied Carbon Spec
          </h1>
          <p className="text-gray-600 mb-8">
            Upload your architectural spec PDF or Excel file. We'll extract materials and find sustainable alternatives.
          </p>

          <form onSubmit={handleUpload} className="space-y-6">
            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Spec File (PDF or Excel)
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors cursor-pointer"
                onDragOver={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.add("border-blue-500");
                }}
                onDragLeave={(e) => {
                  e.currentTarget.classList.remove("border-blue-500");
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove("border-blue-500");
                  const files = e.dataTransfer.files;
                  if (files.length > 0) {
                    setFile(files[0]);
                  }
                }}>
                <input
                  type="file"
                  accept=".pdf,.xlsx,.xls"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="file-input"
                  disabled={loading}
                />
                <label htmlFor="file-input" className="cursor-pointer block">
                  <p className="text-gray-600">
                    {file ? (
                      <span className="text-blue-600 font-semibold">{file.name}</span>
                    ) : (
                      <>
                        <span className="text-blue-600 font-semibold">Click to upload</span> or drag and drop
                      </>
                    )}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">PDF or Excel up to 50MB</p>
                </label>
              </div>
            </div>

            {/* Project Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project Name
                </label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g. 100 Main Street Tower"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px]"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location
                </label>
                <input
                  type="text"
                  value={projectLocation}
                  onChange={(e) => setProjectLocation(e.target.value)}
                  placeholder="e.g. San Francisco, CA"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px]"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estimated Project Value
              </label>
              <input
                type="number"
                value={estimatedValue}
                onChange={(e) => setEstimatedValue(e.target.value)}
                placeholder="e.g. 5000000"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px]"
                disabled={loading}
                min="0"
                step="1"
              />
            </div>

            {/* Progress Bar */}
            {loading && progress > 0 && (
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !file}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 rounded-lg transition-colors min-h-[44px]"
            >
              {loading ? `Uploading & Parsing... ${progress}%` : "Upload & Analyze Spec"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
