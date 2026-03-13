import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "wouter";
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, ArrowLeft, Download } from "lucide-react";

type UploadStatus = "idle" | "uploading" | "success" | "error";

export default function SupplierBulkUpload() {
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFile = (file: File) => {
    if (!file) return;
    setFileName(file.name);
    setStatus("uploading");
    // Simulate upload
    setTimeout(() => setStatus("success"), 2000);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8 max-w-3xl">
        {/* Back */}
        <Link href="/supplier/materials">
          <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Materials
          </button>
        </Link>

        <h1 className="text-3xl font-bold text-foreground mb-2">Bulk Upload Materials</h1>
        <p className="text-muted-foreground mb-8">
          Upload a CSV or Excel file to add multiple materials at once. Download the template to get started.
        </p>

        {/* Template Download */}
        <Card className="p-5 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground">GreenChainz Material Template</p>
              <p className="text-sm text-muted-foreground">CSV format with all required fields</p>
            </div>
          </div>
          <Button variant="outline" className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Download Template
          </Button>
        </Card>

        {/* Upload Zone */}
        {status === "idle" || status === "uploading" ? (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-16 text-center transition-all duration-200 ${
              dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30"
            }`}
          >
            {status === "uploading" ? (
              <div className="space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                  <Upload className="w-8 h-8 text-primary" />
                </div>
                <p className="text-lg font-medium text-foreground">Uploading {fileName}...</p>
                <div className="w-48 h-2 bg-muted rounded-full mx-auto overflow-hidden">
                  <div className="h-full bg-primary rounded-full animate-pulse w-2/3" />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
                  <Upload className="w-8 h-8 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-lg font-medium text-foreground">Drop your file here</p>
                  <p className="text-sm text-muted-foreground mt-1">Supports CSV and XLSX up to 10MB</p>
                </div>
                <label>
                  <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleChange} />
                  <Button className="cursor-pointer">Browse Files</Button>
                </label>
              </div>
            )}
          </div>
        ) : status === "success" ? (
          <Card className="p-12 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="text-xl font-semibold text-foreground">Upload Successful</h3>
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">{fileName}</span> has been uploaded and is being processed.
              Your materials will appear in your catalog once verified.
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <Link href="/supplier/materials">
                <Button>View Materials</Button>
              </Link>
              <Button variant="outline" onClick={() => { setStatus("idle"); setFileName(null); }}>
                Upload Another
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="p-12 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-xl font-semibold text-foreground">Upload Failed</h3>
            <p className="text-muted-foreground">Something went wrong. Please check your file format and try again.</p>
            <Button onClick={() => { setStatus("idle"); setFileName(null); }}>Try Again</Button>
          </Card>
        )}

        {/* Requirements */}
        <Card className="p-6 mt-6">
          <h3 className="font-semibold text-foreground mb-3">Required Fields</h3>
          <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
            {["material_name", "category", "gwp_value", "gwp_unit", "epd_number", "epd_expiry", "manufacturer", "country_of_origin"].map((field) => (
              <div key={field} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                <code className="text-xs">{field}</code>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
