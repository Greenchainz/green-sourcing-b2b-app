/**
 * SubmittalGenerator — /tools/submittal
 *
 * Search materials from the GreenChainz catalog, build a submittal queue,
 * add project context, then download CSI 3-part spec sheet PDFs for each
 * selected material via GET /api/materials/:id/spec-sheet
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Search,
  Plus,
  X,
  Download,
  FileText,
  Leaf,
  CheckCircle2,
  AlertCircle,
  Package,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";

// ── Types ─────────────────────────────────────────────────────────────────────

interface MaterialResult {
  id: number;
  name: string;
  category: string;
  subcategory?: string | null;
  gwpValue?: string | null;
  hasEpd?: boolean | null;
  manufacturerName?: string | null;
}

interface ProjectInfo {
  projectName: string;
  projectNumber: string;
  specSection: string;
  architectName: string;
  contractorName: string;
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function SubmittalGenerator() {
  const [searchQuery, setSearchQuery] = useState("");
  const [queue, setQueue] = useState<MaterialResult[]>([]);
  const [downloading, setDownloading] = useState<Set<number>>(new Set());
  const [projectInfo, setProjectInfo] = useState<ProjectInfo>({
    projectName: "",
    projectNumber: "",
    specSection: "",
    architectName: "",
    contractorName: "",
  });

  const debouncedQuery = useDebounce(searchQuery, 300);

  const { data: searchData, isFetching } = trpc.materials.semanticSearch.useQuery(
    { query: debouncedQuery, limit: 8 },
    { enabled: debouncedQuery.trim().length >= 2 }
  );

  const results: MaterialResult[] = (searchData?.items ?? []).map((m: any) => ({
    id: m.id,
    name: m.name ?? m.productName ?? "Unknown",
    category: m.category ?? "",
    subcategory: m.subcategory,
    gwpValue: m.gwpValue,
    hasEpd: m.hasEpd,
    manufacturerName: m.manufacturerName,
  }));

  const addToQueue = (mat: MaterialResult) => {
    if (queue.find((q) => q.id === mat.id)) {
      toast.info(`${mat.name} is already in your submittal queue.`);
      return;
    }
    if (queue.length >= 20) {
      toast.error("Max 20 materials per submittal package.");
      return;
    }
    setQueue((prev) => [...prev, mat]);
    setSearchQuery("");
    toast.success(`Added ${mat.name}`);
  };

  const removeFromQueue = (id: number) => {
    setQueue((prev) => prev.filter((m) => m.id !== id));
  };

  const downloadSpec = async (mat: MaterialResult) => {
    setDownloading((prev) => new Set(prev).add(mat.id));
    try {
      const params = new URLSearchParams();
      if (projectInfo.projectName) params.set("projectName", projectInfo.projectName);
      if (projectInfo.projectNumber) params.set("projectNumber", projectInfo.projectNumber);
      if (projectInfo.specSection) params.set("specSection", projectInfo.specSection);

      const url = `/api/materials/${mat.id}/spec-sheet?${params.toString()}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const blob = await res.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `SpecSheet-${mat.name.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;
      link.click();
      URL.revokeObjectURL(link.href);
      toast.success(`Downloaded spec sheet for ${mat.name}`);
    } catch {
      toast.error(`Failed to download spec sheet for ${mat.name}`);
    } finally {
      setDownloading((prev) => {
        const next = new Set(prev);
        next.delete(mat.id);
        return next;
      });
    }
  };

  const downloadAll = async () => {
    if (queue.length === 0) return;
    toast.info(`Generating ${queue.length} spec sheet${queue.length > 1 ? "s" : ""}…`);
    for (const mat of queue) {
      await downloadSpec(mat);
      await new Promise((r) => setTimeout(r, 400));
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      {/* Hero */}
      <section className="py-16 border-b border-border bg-gradient-to-b from-background to-secondary/20">
        <div className="container max-w-4xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 text-sm font-semibold text-primary">
            <FileText className="w-4 h-4" />
            Submittal Generator
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground">
            CSI 3-Part Spec Sheets,{" "}
            <span className="text-primary">Instant Download</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Search the GreenChainz catalog, build your submittal queue, and download
            formatted CSI spec sheets ready for your project package.
          </p>
        </div>
      </section>

      {/* Main */}
      <main className="flex-1 container max-w-6xl mx-auto py-10">
        <div className="grid lg:grid-cols-5 gap-8">

          {/* Left: Search + Queue */}
          <div className="lg:col-span-3 space-y-6">

            {/* Search */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Search Materials</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, category, or description…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                  {isFetching && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                  )}
                </div>

                {debouncedQuery.trim().length >= 2 && (
                  <div className="border border-border rounded-lg overflow-hidden divide-y divide-border">
                    {isFetching && results.length === 0 ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="p-3 flex items-center gap-3">
                          <Skeleton className="w-8 h-8 rounded" />
                          <div className="flex-1 space-y-1">
                            <Skeleton className="h-4 w-40" />
                            <Skeleton className="h-3 w-24" />
                          </div>
                        </div>
                      ))
                    ) : results.length === 0 ? (
                      <div className="p-4 text-sm text-muted-foreground text-center">
                        No materials found for "{debouncedQuery}"
                      </div>
                    ) : (
                      results.map((mat) => {
                        const inQueue = queue.some((q) => q.id === mat.id);
                        return (
                          <button
                            key={mat.id}
                            onClick={() => addToQueue(mat)}
                            disabled={inQueue}
                            className="w-full text-left p-3 flex items-center gap-3 hover:bg-accent/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <Package className="w-4 h-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{mat.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {mat.category}
                                {mat.subcategory ? ` › ${mat.subcategory}` : ""}
                                {mat.manufacturerName ? ` · ${mat.manufacturerName}` : ""}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {mat.hasEpd && (
                                <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
                                  EPD
                                </Badge>
                              )}
                              {inQueue ? (
                                <CheckCircle2 className="w-4 h-4 text-primary" />
                              ) : (
                                <Plus className="w-4 h-4 text-muted-foreground" />
                              )}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Queue */}
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  Submittal Queue
                  {queue.length > 0 && (
                    <Badge className="bg-primary/10 text-primary border-primary/20">
                      {queue.length}
                    </Badge>
                  )}
                </CardTitle>
                {queue.length > 1 && (
                  <Button size="sm" onClick={downloadAll} className="gap-1.5">
                    <Download className="w-4 h-4" />
                    Download All
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {queue.length === 0 ? (
                  <div className="py-10 text-center space-y-2">
                    <FileText className="w-10 h-10 text-muted-foreground/40 mx-auto" />
                    <p className="text-sm text-muted-foreground">
                      Search for materials above to add them to your submittal queue.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {queue.map((mat) => (
                      <div
                        key={mat.id}
                        className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card/50"
                      >
                        <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Leaf className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{mat.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span className="text-xs text-muted-foreground">{mat.category}</span>
                            {mat.hasEpd && (
                              <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
                                EPD
                              </Badge>
                            )}
                            {mat.gwpValue && (
                              <span className="text-xs text-muted-foreground">
                                {mat.gwpValue} GWP
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => downloadSpec(mat)}
                            disabled={downloading.has(mat.id)}
                            className="gap-1.5 h-8 text-xs"
                          >
                            {downloading.has(mat.id) ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Download className="w-3 h-3" />
                            )}
                            PDF
                          </Button>
                          <button
                            onClick={() => removeFromQueue(mat.id)}
                            className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right: Project Info */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Project Information</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Optional — included in the generated PDF header.
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { key: "projectName",    label: "Project Name",         placeholder: "123 Main St Office Tower" },
                  { key: "projectNumber",  label: "Project Number",       placeholder: "2025-0042" },
                  { key: "specSection",    label: "CSI Section",          placeholder: "03 30 00" },
                  { key: "architectName",  label: "Architect of Record",  placeholder: "Smith & Associates AIA" },
                  { key: "contractorName", label: "General Contractor",   placeholder: "BuildCo Inc." },
                ].map(({ key, label, placeholder }) => (
                  <div key={key} className="space-y-1">
                    <Label className="text-xs">{label}</Label>
                    <Input
                      placeholder={placeholder}
                      value={projectInfo[key as keyof ProjectInfo]}
                      onChange={(e) =>
                        setProjectInfo((prev) => ({ ...prev, [key]: e.target.value }))
                      }
                      className="h-8 text-sm"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-4 space-y-3">
                <div className="flex gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-foreground">
                    Each PDF includes Part 1 (General), Part 2 (Products), and Part 3
                    (Execution) in CSI MasterFormat structure.
                  </p>
                </div>
                <div className="flex gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-foreground">
                    EPD data, GWP values, certifications, and manufacturer info are
                    pre-populated from the verified catalog.
                  </p>
                </div>
                <div className="flex gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    Always review generated specs before including in contract documents.
                    Licensed architect signature required for official submittals.
                  </p>
                </div>
              </CardContent>
            </Card>

            {queue.length > 0 && (
              <Button className="w-full gap-2" size="lg" onClick={downloadAll}>
                <Download className="w-4 h-4" />
                Download {queue.length} Spec Sheet{queue.length > 1 ? "s" : ""}
                <ChevronRight className="w-4 h-4 ml-auto" />
              </Button>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
