/**
 * ArchitectSpecsUpload
 *
 * Two modes:
 *   "quick"  — enter one assembly manually, get alternatives instantly (no file)
 *   "full"   — upload a PDF/Excel and parse the whole project
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "../lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LocationTypeahead } from "@/components/ui/typeahead-variants";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Zap, FileUp, ArrowRight, ChevronLeft } from "lucide-react";

// Assembly types from the EWS spec — matches server/services/architect-spec-parser.ts
const ASSEMBLY_TYPES = [
  { code: "EWS-1A", label: "Unitized Curtain Wall (Vision / Shadow / Spandrel)" },
  { code: "EWS-1B", label: "Unitized Vision Fitted" },
  { code: "EWS-2A", label: "Granite Panel" },
  { code: "EWS-2B", label: "Natural Stone (Limestone / Sandstone)" },
  { code: "EWS-3A", label: "Terracotta" },
  { code: "EWS-3B", label: "UHPC" },
  { code: "EWS-3C", label: "GFRC" },
  { code: "EWS-5",  label: "Aluminum Metal Panel" },
  { code: "OTHER",  label: "Other / Custom" },
];

const STRUCTURAL_OPTIONS = [
  { value: "1", label: "CFMF Steel Studs" },
  { value: "2", label: "Mega Panel (HSS)" },
  { value: "3", label: "Unitized Aluminum Framing" },
];

type Mode = "pick" | "quick" | "full";

export default function ArchitectSpecsUpload() {
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<Mode>("pick");

  // ── Quick mode state ────────────────────────────────────────────────────────
  const [assemblyCode, setAssemblyCode]       = useState("");
  const [customAssembly, setCustomAssembly]   = useState("");
  const [structuralOption, setStructuralOption] = useState("");
  const [currentGwp, setCurrentGwp]           = useState("");
  const [manufacturer, setManufacturer]       = useState("");
  const [product, setProduct]                 = useState("");
  const [quickLoading, setQuickLoading]       = useState(false);

  // ── Full upload state ───────────────────────────────────────────────────────
  const [file, setFile]                 = useState<File | null>(null);
  const [projectName, setProjectName]   = useState("");
  const [projectLocation, setProjectLocation] = useState("");
  const [estimatedValue, setEstimatedValue] = useState("");
  const [uploadLoading, setUploadLoading] = useState(false);
  const [progress, setProgress]         = useState(0);
  const [error, setError]               = useState("");

  const uploadFile    = trpc.architectSpec.uploadFile.useMutation();
  const uploadAndParse = trpc.architectSpec.uploadAndParse.useMutation();
  const utils = trpc.useUtils();

  // ── Quick submit — create a single-assembly spec manually ──────────────────
  async function handleQuickSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!assemblyCode) { toast.error("Select an assembly type"); return; }
    setQuickLoading(true);
    try {
      // We POST a tiny synthetic "spec" with one row — reuse uploadAndParse
      // by building a minimal single-row CSV in memory and passing it as the buffer.
      const chosenCode  = assemblyCode === "OTHER" ? "CUSTOM" : assemblyCode;
      const chosenLabel = ASSEMBLY_TYPES.find(a => a.code === assemblyCode)?.label
                        ?? customAssembly;
      const gwp  = parseFloat(currentGwp) || null;
      const rows = [
        ["AssemblyCode", "AssemblyType", "StructuralOption", "GWP", "Manufacturer", "Product"],
        [chosenCode, chosenLabel, structuralOption, gwp ?? "", manufacturer, product],
      ];
      const csv = rows.map(r => r.map(String).join(",")).join("\n");
      const bytes = new TextEncoder().encode(csv);
      let binary = "";
      const chunk = 8192;
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
      }
      const base64 = btoa(binary);

      // Use a placeholder blob URL — parser will use the buffer directly
      const blobUrl = `data:text/csv;base64,${base64}`;

      const result = await uploadAndParse.mutateAsync({
        originalFilename: `quick-${chosenCode}.csv`,
        blobUrl,
        mimeType: "text/csv",
        fileBufferBase64: base64,
        projectName: `Quick lookup — ${chosenLabel}`,
      });

      await utils.architectSpec.listSpecs.invalidate();
      toast.success("Assembly analyzed — finding alternatives…");
      navigate(`/architect/specs/${result.specId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to analyze assembly");
    } finally {
      setQuickLoading(false);
    }
  }

  // ── Full upload submit ──────────────────────────────────────────────────────
  async function handleFullUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { setError("Please select a file"); return; }
    setUploadLoading(true);
    setError("");
    setProgress(25);
    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = "";
      const chunk = 8192;
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
      }
      const base64 = btoa(binary);
      setProgress(50);

      const uploadResult = await uploadFile.mutateAsync({
        fileBufferBase64: base64,
        originalFilename: file.name,
        mimeType: file.type,
      });
      setProgress(75);

      const parseResult = await uploadAndParse.mutateAsync({
        originalFilename: file.name,
        blobUrl: uploadResult.blobUrl,
        mimeType: file.type,
        fileBufferBase64: base64,
        projectName:    projectName    || undefined,
        projectLocation: projectLocation || undefined,
        estimatedValue: estimatedValue ? parseFloat(estimatedValue) : undefined,
      });
      setProgress(100);
      await utils.architectSpec.listSpecs.invalidate();
      toast.success("Spec parsed successfully");
      setTimeout(() => navigate(`/architect/specs/${parseResult.specId}`), 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setProgress(0);
    } finally {
      setUploadLoading(false);
    }
  }

  // ── Mode picker ─────────────────────────────────────────────────────────────
  if (mode === "pick") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-2xl space-y-4">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-foreground">Find Greener Alternatives</h1>
            <p className="text-muted-foreground mt-1">Look up one assembly or analyze a full project spec.</p>
          </div>

          {/* Quick lookup */}
          <Card
            className="cursor-pointer hover:shadow-md hover:border-green-500 transition-all border-2"
            onClick={() => setMode("quick")}
          >
            <CardContent className="flex items-start gap-4 p-6">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5 text-green-700" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-foreground">Quick Assembly Lookup</p>
                  <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px]">Fastest</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Enter one assembly type and your current GWP. Get green alternatives in seconds — no file needed.
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
            </CardContent>
          </Card>

          {/* Full upload */}
          <Card
            className="cursor-pointer hover:shadow-md hover:border-primary transition-all border-2"
            onClick={() => setMode("full")}
          >
            <CardContent className="flex items-start gap-4 p-6">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                <FileUp className="w-5 h-5 text-blue-700" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Upload Full Project Spec</p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Upload an Embodied Carbon Tables PDF or Excel to analyze every assembly in your project at once.
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground pt-2">
            <span
              className="underline cursor-pointer hover:text-foreground"
              onClick={() => navigate("/architect/specs")}
            >
              View past lookups
            </span>
          </p>
        </div>
      </div>
    );
  }

  // ── Quick lookup form ───────────────────────────────────────────────────────
  if (mode === "quick") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-lg">
          <button
            onClick={() => setMode("pick")}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-green-600" />
                <CardTitle>Quick Assembly Lookup</CardTitle>
              </div>
              <CardDescription>
                Tell us what you're currently specifying — we'll find lower-carbon alternatives from verified suppliers.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleQuickSubmit} className="space-y-4">
                <div>
                  <Label>Assembly Type <span className="text-destructive">*</span></Label>
                  <Select value={assemblyCode} onValueChange={setAssemblyCode}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select assembly type…" />
                    </SelectTrigger>
                    <SelectContent>
                      {ASSEMBLY_TYPES.map((a) => (
                        <SelectItem key={a.code} value={a.code}>
                          <span className="font-mono text-xs text-muted-foreground mr-2">{a.code}</span>
                          {a.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {assemblyCode === "OTHER" && (
                    <Input
                      className="mt-2"
                      placeholder="Describe your assembly…"
                      value={customAssembly}
                      onChange={(e) => setCustomAssembly(e.target.value)}
                    />
                  )}
                </div>

                <div>
                  <Label>Structural Option</Label>
                  <Select value={structuralOption} onValueChange={setStructuralOption}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select if applicable…" />
                    </SelectTrigger>
                    <SelectContent>
                      {STRUCTURAL_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Current GWP <span className="text-muted-foreground text-xs font-normal">(kgCO₂e / 1,000 SF — optional)</span></Label>
                  <Input
                    className="mt-1"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="e.g. 450"
                    value={currentGwp}
                    onChange={(e) => setCurrentGwp(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Current Manufacturer <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
                    <Input
                      className="mt-1"
                      placeholder="e.g. Kawneer"
                      value={manufacturer}
                      onChange={(e) => setManufacturer(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Product Name <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
                    <Input
                      className="mt-1"
                      placeholder="e.g. AA3110"
                      value={product}
                      onChange={(e) => setProduct(e.target.value)}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={!assemblyCode || quickLoading}
                  className="w-full bg-green-700 hover:bg-green-800 text-white"
                >
                  {quickLoading ? "Finding alternatives…" : "Find Green Alternatives →"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ── Full upload form ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <button
          onClick={() => setMode("pick")}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </button>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileUp className="w-5 h-5 text-blue-600" />
              <CardTitle>Upload Full Project Spec</CardTitle>
            </div>
            <CardDescription>
              Upload your Embodied Carbon Tables PDF or Excel. We'll extract and analyze every assembly.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleFullUpload} className="space-y-4">
              {/* Drop zone */}
              <div>
                <Label>Spec File (PDF or Excel)</Label>
                <div
                  className="mt-1 border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer"
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("border-primary"); }}
                  onDragLeave={(e) => { e.currentTarget.classList.remove("border-primary"); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove("border-primary");
                    if (e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]);
                  }}
                >
                  <input
                    type="file"
                    accept=".pdf,.xlsx,.xls"
                    id="file-input"
                    className="hidden"
                    disabled={uploadLoading}
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                  <label htmlFor="file-input" className="cursor-pointer block">
                    {file ? (
                      <span className="text-primary font-semibold">{file.name}</span>
                    ) : (
                      <>
                        <span className="text-primary font-semibold">Click to upload</span>
                        <span className="text-muted-foreground"> or drag and drop</span>
                        <p className="text-xs text-muted-foreground mt-1">PDF or Excel up to 50 MB</p>
                      </>
                    )}
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Project Name <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
                  <Input className="mt-1" placeholder="100 Main Street Tower" value={projectName} onChange={(e) => setProjectName(e.target.value)} disabled={uploadLoading} />
                </div>
                <div>
                  <Label>Location <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
                  <LocationTypeahead className="mt-1" placeholder="San Francisco, CA" value={projectLocation} onChange={setProjectLocation} onSelect={(item) => setProjectLocation(item.label)} disabled={uploadLoading} />
                </div>
              </div>

              <div>
                <Label>Estimated Project Value <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
                <Input className="mt-1" type="number" placeholder="5000000" value={estimatedValue} onChange={(e) => setEstimatedValue(e.target.value)} disabled={uploadLoading} min="0" />
              </div>

              {uploadLoading && progress > 0 && (
                <div className="w-full bg-muted rounded-full h-1.5">
                  <div className="bg-primary h-1.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
              )}

              {error && (
                <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>
              )}

              <Button type="submit" disabled={uploadLoading || !file} className="w-full">
                {uploadLoading ? `Uploading… ${progress}%` : "Upload & Analyze Spec"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
