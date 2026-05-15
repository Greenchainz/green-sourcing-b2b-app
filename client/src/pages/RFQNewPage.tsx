/**
 * NewRFQPage — 4-step RFQ submission wizard
 * Route: /rfq/new?supplierId=&materialId=
 */
import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LocationTypeahead, CompanyTypeahead } from "@/components/ui/typeahead-variants";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  FolderOpen,
  Package,
  Building2,
  ClipboardCheck,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  Send,
  Leaf,
  Star,
  MapPin,
  Sparkles,
  X,
  FileText,
  Upload,
  Loader2,
  AlertCircle,
} from "lucide-react";

// ── Constants ──────────────────────────────────────────────────────────────────

const PROJECT_TYPES = [
  "Commercial Office",
  "Multi-Family Residential",
  "Single-Family Residential",
  "Education",
  "Healthcare",
  "Hospitality",
  "Industrial / Warehouse",
  "Mixed-Use",
  "Retail",
  "Government / Civic",
  "Infrastructure",
  "Other",
] as const;

const MATERIAL_CATEGORIES = [
  "Concrete & Masonry",
  "Steel & Metal",
  "Timber & Wood",
  "Insulation",
  "Roofing",
  "Flooring",
  "Glazing & Windows",
  "HVAC Systems",
  "Electrical",
  "Plumbing",
  "Interior Finishes",
  "Doors & Hardware",
  "Cladding & Facades",
  "Other",
] as const;

const CERT_OPTIONS = [
  "LEED",
  "EPD",
  "FSC",
  "GreenGuard",
  "Cradle to Cradle",
  "Living Building Challenge",
  "ISO 14001",
  "Other",
];

const QUANTITY_UNITS = ["SF", "LF", "EA", "CY", "tons"] as const;

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY",
];

// ── Schema ─────────────────────────────────────────────────────────────────────

const schema = z.object({
  // Step 0 — Project Info
  projectName: z.string().min(1, "Project name is required"),
  projectType: z.string().min(1, "Project type is required"),
  projectCity: z.string().min(1, "City is required"),
  projectState: z.string().length(2, "Select a state"),
  projectLat: z.number().optional(),
  projectLng: z.number().optional(),
  startDate: z.string().optional(),
  projectSqFt: z.coerce.number().positive().optional().or(z.literal("")),

  // Step 1 — Material Request
  category: z.string().min(1, "Category is required"),
  description: z.string().min(2, "Description is required"),
  quantity: z.coerce.number().positive("Enter a positive quantity"),
  unit: z.enum(QUANTITY_UNITS),
  certifications: z.array(z.string()).optional(),
  maxGwp: z.coerce.number().positive().optional().or(z.literal("")),
  epdRequired: z.enum(["yes", "no", "preferred"]).optional(),
  targetDeliveryDate: z.string().optional(),

  // Step 2 — Supplier Selection (managed separately as array state)
});

type FormData = z.infer<typeof schema>;

const STEP_FIELDS: Record<number, (keyof FormData)[]> = {
  0: ["projectName", "projectType", "projectCity", "projectState"],
  1: ["category", "description", "quantity", "unit"],
  2: [],
  3: [],
};

// ── Step indicator ─────────────────────────────────────────────────────────────

const STEPS = [
  { label: "Project",   icon: FolderOpen },
  { label: "Material",  icon: Package },
  { label: "Suppliers", icon: Building2 },
  { label: "Review",    icon: ClipboardCheck },
];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {STEPS.map((step, i) => {
        const Icon = step.icon;
        const done = i < current;
        const active = i === current;
        return (
          <div key={i} className="flex items-center">
            <div className={`flex flex-col items-center gap-1 px-3 ${active ? "text-green-600" : done ? "text-green-500" : "text-muted-foreground"}`}>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 ${
                done ? "border-green-500 bg-green-500 text-white"
                     : active ? "border-green-600 bg-background text-green-600"
                     : "border-muted-foreground/30 bg-background"
              }`}>
                {done ? <CheckCircle className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </div>
              <span className="text-xs font-medium hidden sm:block">{step.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-0.5 w-10 sm:w-16 ${i < current ? "bg-green-500" : "bg-muted-foreground/20"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Score badge ────────────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number | null | undefined }) {
  if (score == null) return null;
  const cls =
    score >= 70 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
    : score >= 40 ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
    : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-full border-0 ${cls}`}>
      <Leaf className="w-2.5 h-2.5" />{score}
    </span>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function RFQNewPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const searchStr = useSearch();
  const params = new URLSearchParams(searchStr);
  const presetSupplierId = params.get("supplierId") ? Number(params.get("supplierId")) : null;

  const [step, setStep] = useState(0);
  const [selectedIds, setSelectedIds] = useState<number[]>(presetSupplierId ? [presetSupplierId] : []);
  const [regionAll, setRegionAll] = useState(false);
  const [supplierSearch, setSupplierSearch] = useState("");
  const hasAutoSelectedRef = useRef(false);

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: { unit: "SF", epdRequired: "preferred" },
  });

  // Architect profile for region toggle
  const { data: profile } = trpc.architect.getMyProfile.useQuery(undefined, {
    enabled: user?.role === "architect",
    staleTime: 60_000,
  });

  // Watch form values needed for smart matching
  const watchedCategory = watch("category");
  const watchedCertsForMatch = watch("certifications");
  const watchedMaxGwp = watch("maxGwp");
  const watchedProjectState = watch("projectState");
  const watchedLat = watch("projectLat");
  const watchedLng = watch("projectLng");

  // Smart supplier matching — fires when user reaches Step 2 with a category
  const { data: matchedSuppliers = [], isLoading: matchLoading } =
    trpc.rfqRequests.matchSuppliers.useQuery(
      {
        category: watchedCategory ?? "",
        certifications: watchedCertsForMatch ?? [],
        maxGwp: watchedMaxGwp ? Number(watchedMaxGwp) : undefined,
        projectState: watchedProjectState ?? undefined,
        projectCity: watch("projectCity") ?? undefined,
        projectLat: watchedLat,
        projectLng: watchedLng,
      },
      {
        enabled: step === 2 && !!(watchedCategory),
        staleTime: 2 * 60_000,
      }
    );

  // Filter matched suppliers by search text
  const displayedSuppliers = supplierSearch
    ? matchedSuppliers.filter(
        (s) =>
          s.companyName.toLowerCase().includes(supplierSearch.toLowerCase()) ||
          (s.city ?? "").toLowerCase().includes(supplierSearch.toLowerCase()) ||
          (s.state ?? "").toLowerCase().includes(supplierSearch.toLowerCase())
      )
    : matchedSuppliers;

  const profileState = profile?.state ?? "";
  const { data: regionSuppliers = [] } = trpc.location.suppliersByState.useQuery(
    { state: profileState },
    { enabled: profileState.length === 2 && regionAll, staleTime: 5 * 60_000 }
  );

  // Auto-select top 3 on first load of smart results
  useEffect(() => {
    if (step !== 2) {
      hasAutoSelectedRef.current = false;
      return;
    }
    if (hasAutoSelectedRef.current) return;
    if (matchedSuppliers.length === 0) return;
    if (presetSupplierId) {
      // Keep preset + fill with top matches
      const fill = matchedSuppliers
        .filter((s) => s.id !== presetSupplierId)
        .slice(0, 2)
        .map((s) => s.id);
      setSelectedIds([presetSupplierId, ...fill]);
    } else {
      setSelectedIds(matchedSuppliers.slice(0, 3).map((s) => s.id));
    }
    hasAutoSelectedRef.current = true;
  }, [step, matchedSuppliers, presetSupplierId]);

  // When "all in region" is toggled on, replace selection with regional supplier IDs
  useEffect(() => {
    if (regionAll && regionSuppliers.length > 0) {
      setSelectedIds(regionSuppliers.map((s) => s.id).slice(0, 5));
    }
  }, [regionAll, regionSuppliers]);

  const createMulti = trpc.rfqRequests.createMulti.useMutation({
    onSuccess: ({ primaryId }) => {
      toast.success("RFQ sent — comparable bids incoming.", {
        description: "Submittal PDF included. Preview it now or find it on your dashboard when bids arrive.",
        action: { label: "Preview Submittal PDF", onClick: () => navigate("/tools/submittal") },
      });
      navigate(`/rfqs/${primaryId}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const watchedCerts = watchedCertsForMatch ?? [];

  // ── Spec upload state ────────────────────────────────────────────────────────
  const [specUploading, setSpecUploading] = useState(false);
  const [specParsed, setSpecParsed] = useState(false);
  const [specError, setSpecError] = useState<string | null>(null);
  const [specFieldsFound, setSpecFieldsFound] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const specInputRef = useRef<HTMLInputElement>(null);

  // Map LLM category labels → form MATERIAL_CATEGORIES values
  const mapSpecCategory = (cat: string): string => {
    const map: Record<string, string> = {
      "Concrete": "Concrete & Masonry",
      "Steel": "Steel & Metal",
      "Timber / Mass Timber": "Timber & Wood",
      "Glass": "Glazing & Windows",
      "Insulation": "Insulation",
      "Roofing": "Roofing",
      "Flooring": "Flooring",
      "Cladding": "Cladding & Facades",
      "MEP": "HVAC Systems",
      "Gypsum / Drywall": "Interior Finishes",
      "Other": "Other",
    };
    return map[cat] ?? MATERIAL_CATEGORIES.find(c => c.toLowerCase().includes(cat.toLowerCase())) ?? "";
  };

  const handleSpecUpload = async (file: File) => {
    if (!file || file.type !== "application/pdf") {
      setSpecError("Please upload a PDF file (spec section, CSI division, etc.)");
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setSpecError("File too large — max 25 MB");
      return;
    }

    setSpecUploading(true);
    setSpecError(null);
    setSpecParsed(false);
    setSpecFieldsFound([]);

    const formData = new FormData();
    formData.append("spec", file);

    try {
      const res = await fetch("/api/rfq/parse-spec", { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Parse failed" }));
        throw new Error((err as { error: string }).error ?? "Parse failed");
      }

      const fields = await res.json() as {
        category: string;
        description: string;
        certifications: string[];
        maxGwp: number | null;
        quantity: number | null;
        unit: string | null;
        epdRequired: boolean;
        confidence: string;
        fieldsFound: string[];
      };

      // Apply to form — only set fields that were actually found
      if (fields.fieldsFound.includes("category") && fields.category) {
        const mapped = mapSpecCategory(fields.category);
        if (mapped) setValue("category", mapped, { shouldValidate: true });
      }
      if (fields.fieldsFound.includes("description") && fields.description) {
        setValue("description", fields.description, { shouldValidate: true });
      }
      if (fields.fieldsFound.includes("certifications") && fields.certifications.length > 0) {
        // Only keep certs that match our known options (case-insensitive)
        const validCerts = fields.certifications.filter(fc =>
          CERT_OPTIONS.some(opt => opt.toLowerCase() === fc.toLowerCase())
        );
        if (validCerts.length > 0) setValue("certifications", validCerts);
      }
      if (fields.fieldsFound.includes("maxGwp") && fields.maxGwp != null) {
        setValue("maxGwp", fields.maxGwp as any);
      }
      if (fields.fieldsFound.includes("quantity") && fields.quantity != null) {
        setValue("quantity", fields.quantity as any, { shouldValidate: true });
      }
      if (fields.fieldsFound.includes("unit") && fields.unit) {
        const validUnit = (["SF","LF","EA","CY","tons"] as const).find(
          u => u.toLowerCase() === fields.unit!.toLowerCase()
        );
        if (validUnit) setValue("unit", validUnit);
      }
      if (fields.fieldsFound.includes("epdRequired")) {
        setValue("epdRequired", fields.epdRequired ? "yes" : "preferred");
      }

      setSpecFieldsFound(fields.fieldsFound);
      setSpecParsed(true);

      if (fields.confidence === "LOW") {
        toast.warning("Spec analyzed — limited data extracted. Review and fill in any blanks.", { duration: 5000 });
      } else {
        toast.success(`Spec analyzed — ${fields.fieldsFound.length} fields pre-filled from "${file.name}".`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Spec parsing failed";
      setSpecError(msg);
      toast.error(msg);
    } finally {
      setSpecUploading(false);
      // Reset the file input so same file can be re-uploaded
      if (specInputRef.current) specInputRef.current.value = "";
    }
  };

  const toggleCert = (cert: string) => {
    const current = getValues("certifications") ?? [];
    setValue(
      "certifications",
      current.includes(cert) ? current.filter((c) => c !== cert) : [...current, cert]
    );
  };

  const toggleSupplier = (id: number) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 5) { toast.error("Max 5 suppliers per RFQ"); return prev; }
      return [...prev, id];
    });
    if (regionAll) setRegionAll(false);
  };

  const goNext = async () => {
    if (step === 2) {
      if (selectedIds.length === 0) {
        toast.error("Select at least one supplier");
        return;
      }
      setStep(3);
      return;
    }
    const valid = await trigger(STEP_FIELDS[step]);
    if (valid) setStep((s) => s + 1);
  };

  const onSubmit = (data: FormData) => {
    if (selectedIds.length === 0) {
      toast.error("Select at least one supplier");
      return;
    }
    createMulti.mutate({
      projectInfo: {
        projectName: data.projectName,
        projectType: data.projectType,
        projectCity: data.projectCity,
        projectState: data.projectState,
        startDate: data.startDate || undefined,
        projectSqFt: data.projectSqFt ? Number(data.projectSqFt) : undefined,
      },
      materialRequest: {
        category: data.category,
        description: data.description,
        quantity: Number(data.quantity),
        unit: data.unit,
        certifications: data.certifications ?? [],
        maxGwp: data.maxGwp ? Number(data.maxGwp) : undefined,
        epdRequired: data.epdRequired,
        targetDeliveryDate: data.targetDeliveryDate || undefined,
      },
      supplierIds: selectedIds,
    });
  };

  const formValues = watch();
  const selectedSupplierObjects = matchedSuppliers.filter((s) => selectedIds.includes(s.id));

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <div className="container max-w-2xl py-8 flex-1">
        {/* Back link */}
        <button
          onClick={() => (step > 0 ? setStep((s) => s - 1) : navigate("/dashboard"))}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          {step === 0 ? "Back to Dashboard" : "Back"}
        </button>

        <div className="mb-2">
          <h1 className="text-2xl font-bold">Submit RFQ — No Shopping Required</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Requirements in. Comparable bids out. Suppliers respond in a structured format — price, lead time, and documentation in one place.
          </p>
        </div>

        <StepIndicator current={step} />

        <form onSubmit={handleSubmit(onSubmit)}>

          {/* ── Step 0: Project Info ──────────────────────────────────── */}
          {step === 0 && (
            <Card>
              <CardContent className="pt-6 space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="projectName">Project Name *</Label>
                  <Input
                    id="projectName"
                    placeholder="e.g. 123 Main St Office Renovation"
                    {...register("projectName")}
                    className={errors.projectName ? "border-red-500" : ""}
                  />
                  {errors.projectName && <p className="text-xs text-red-500">{errors.projectName.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label>Project Type *</Label>
                  <Select onValueChange={(v) => setValue("projectType", v, { shouldValidate: true })}>
                    <SelectTrigger className={errors.projectType ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select project type" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROJECT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {errors.projectType && <p className="text-xs text-red-500">{errors.projectType.message}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="projectCity">City *</Label>
                    <LocationTypeahead
                      id="projectCity"
                      placeholder="San Francisco"
                      value={formValues.projectCity ?? ""}
                      onChange={(v) => {
                        setValue("projectCity", v, { shouldValidate: true });
                        // Clear geocoords if the user types manually
                        setValue("projectLat", undefined);
                        setValue("projectLng", undefined);
                      }}
                      onSelect={(item) => {
                        // City name is before the first comma
                        const city = item.label.split(",")[0].trim();
                        setValue("projectCity", city, { shouldValidate: true });
                        // Auto-fill state: sublabel format is "City, ST, USA" or "City, State, Country"
                        if (item.sublabel) {
                          const parts = item.sublabel.split(",").map((s) => s.trim());
                          // Look for a 2-char uppercase state code in the parts
                          const stateCode = parts.find((p) => /^[A-Z]{2}$/.test(p));
                          if (stateCode && US_STATES.includes(stateCode)) {
                            setValue("projectState", stateCode, { shouldValidate: true });
                          }
                        }
                        // Store geocoords for haversine scoring
                        if (item.lat != null) setValue("projectLat", item.lat);
                        if (item.lng != null) setValue("projectLng", item.lng);
                      }}
                      inputClassName={errors.projectCity ? "border-red-500" : ""}
                    />
                    {errors.projectCity && <p className="text-xs text-red-500">{errors.projectCity.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>State *</Label>
                    <Select onValueChange={(v) => setValue("projectState", v, { shouldValidate: true })}>
                      <SelectTrigger className={errors.projectState ? "border-red-500" : ""}>
                        <SelectValue placeholder="State" />
                      </SelectTrigger>
                      <SelectContent>
                        {US_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {errors.projectState && <p className="text-xs text-red-500">{errors.projectState.message}</p>}
                  </div>
                </div>

                {/* OSM map preview — only shown once geocoords are captured */}
                {watchedLat != null && watchedLng != null && (
                  <div className="rounded-lg overflow-hidden border border-border">
                    <iframe
                      title="Project location"
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${watchedLng - 0.08}%2C${watchedLat - 0.06}%2C${watchedLng + 0.08}%2C${watchedLat + 0.06}&layer=mapnik&marker=${watchedLat}%2C${watchedLng}`}
                      width="100%"
                      height="160"
                      className="border-0"
                      loading="lazy"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="startDate">Expected Start Date</Label>
                    <Input id="startDate" type="date" {...register("startDate")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="projectSqFt">Project Size (sq ft)</Label>
                    <Input
                      id="projectSqFt"
                      type="number"
                      min={0}
                      placeholder="50,000"
                      {...register("projectSqFt")}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Step 1: Material Request ──────────────────────────────── */}
          {step === 1 && (
            <Card>
              <CardContent className="pt-6 space-y-5">

                {/* ── Spec upload zone ───────────────────────────────────────────── */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                      Have a spec section? Drop it — we'll pre-fill the form.
                    </Label>
                    {specParsed && (
                      <button
                        type="button"
                        onClick={() => { setSpecParsed(false); setSpecFieldsFound([]); }}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {/* Drop zone */}
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      const file = e.dataTransfer.files[0];
                      if (file) void handleSpecUpload(file);
                    }}
                    onClick={() => !specUploading && specInputRef.current?.click()}
                    className={`relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-5 text-center transition-colors cursor-pointer select-none ${
                      specUploading
                        ? "border-primary/40 bg-primary/5 cursor-not-allowed"
                        : isDragging
                        ? "border-green-500 bg-green-50 dark:bg-green-900/10"
                        : specParsed
                        ? "border-green-400 bg-green-50 dark:bg-green-900/10"
                        : "border-border hover:border-green-400 hover:bg-muted/30"
                    }`}
                  >
                    <input
                      ref={specInputRef}
                      type="file"
                      accept="application/pdf"
                      className="sr-only"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleSpecUpload(file);
                      }}
                    />

                    {specUploading ? (
                      <>
                        <Loader2 className="w-6 h-6 text-primary animate-spin" />
                        <p className="text-sm font-medium text-foreground">Analyzing spec section…</p>
                        <p className="text-xs text-muted-foreground">Document Intelligence + AI — usually under 10 seconds</p>
                      </>
                    ) : specParsed ? (
                      <>
                        <CheckCircle className="w-6 h-6 text-green-600" />
                        <p className="text-sm font-medium text-green-700 dark:text-green-400">
                          Form pre-filled — review and adjust
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {specFieldsFound.length > 0
                            ? `Filled: ${specFieldsFound.join(", ")}`
                            : "Low-confidence parse — check fields below"}
                        </p>
                      </>
                    ) : (
                      <>
                        <Upload className="w-6 h-6 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          <span className="font-medium text-foreground">Drop a spec PDF</span> or click to browse
                        </p>
                        <p className="text-xs text-muted-foreground">CSI spec section, product data sheet, or any PDF with material requirements · Max 25 MB</p>
                      </>
                    )}
                  </div>

                  {/* Error state */}
                  {specError && (
                    <div className="flex items-start gap-2 rounded-md bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 px-3 py-2">
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-red-600 dark:text-red-400">{specError}</p>
                    </div>
                  )}
                </div>

                <div className="border-t" />

                <div className="space-y-1.5">
                  <Label>Material Category *</Label>
                  <Select
                    defaultValue={formValues.category}
                    onValueChange={(v) => setValue("category", v, { shouldValidate: true })}
                  >
                    <SelectTrigger className={errors.category ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {MATERIAL_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {errors.category && <p className="text-xs text-red-500">{errors.category.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="description">Material Description *</Label>
                  <Textarea
                    id="description"
                    placeholder="e.g. Low-carbon ready-mix concrete, 4000 PSI, fly-ash replacement"
                    rows={3}
                    {...register("description")}
                    className={errors.description ? "border-red-500" : ""}
                  />
                  {errors.description && <p className="text-xs text-red-500">{errors.description.message}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="quantity">Quantity *</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min={0}
                      step="any"
                      placeholder="500"
                      {...register("quantity")}
                      className={errors.quantity ? "border-red-500" : ""}
                    />
                    {errors.quantity && <p className="text-xs text-red-500">{errors.quantity.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Unit *</Label>
                    <Select
                      defaultValue={formValues.unit ?? "SF"}
                      onValueChange={(v) => setValue("unit", v as typeof QUANTITY_UNITS[number])}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {QUANTITY_UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Required Certifications</Label>
                  <div className="flex flex-wrap gap-2">
                    {CERT_OPTIONS.map((cert) => {
                      const active = watchedCerts.includes(cert);
                      return (
                        <button
                          key={cert}
                          type="button"
                          onClick={() => toggleCert(cert)}
                          className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                            active
                              ? "bg-green-600 text-white border-green-600"
                              : "border-border text-muted-foreground hover:border-green-500 hover:text-foreground"
                          }`}
                        >
                          {cert}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="maxGwp">Max GWP (kgCO₂e/kg)</Label>
                    <Input
                      id="maxGwp"
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="Optional"
                      {...register("maxGwp")}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>EPD Required?</Label>
                    <Select
                      defaultValue={formValues.epdRequired ?? "preferred"}
                      onValueChange={(v) => setValue("epdRequired", v as "yes" | "no" | "preferred")}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">Yes — required</SelectItem>
                        <SelectItem value="preferred">Preferred</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="targetDeliveryDate">Target Delivery Date</Label>
                  <Input id="targetDeliveryDate" type="date" {...register("targetDeliveryDate")} />
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Step 2: Supplier Selection ───────────────────────────── */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
                <p className="text-sm font-medium text-foreground">We matched suppliers to your RFQ — select up to 5 to receive it.</p>
                <p className="text-xs text-muted-foreground mt-0.5">Ranked by category fit, location, sustainability, and certifications. Top 3 pre-selected as a recommended shortlist — review all options and adjust.</p>
              </div>
              <Card>
                <CardContent className="pt-5 space-y-3">
                  {/* Region toggle */}
                  {profileState && (
                    <div className="flex items-center justify-between py-2 px-1 rounded-lg border border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-900/30">
                      <div>
                        <p className="text-sm font-medium">Send to all verified in {profileState}</p>
                        <p className="text-xs text-muted-foreground">Override matching — select all regional suppliers up to 5</p>
                      </div>
                      <Switch checked={regionAll} onCheckedChange={(v) => { setRegionAll(v); if (!v) setSelectedIds(presetSupplierId ? [presetSupplierId] : []); }} />
                    </div>
                  )}

                  {/* Search */}
                  <CompanyTypeahead
                    placeholder="Search suppliers…"
                    value={supplierSearch}
                    onChange={setSupplierSearch}
                    onSelect={(item) => setSupplierSearch(item.label)}
                    clearable
                  />

                  {/* Selected chips */}
                  {selectedIds.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedSupplierObjects.map((s) => (
                        <Badge key={s.id} variant="secondary" className="text-xs gap-1 pr-1">
                          {s.companyName}
                          <button type="button" onClick={() => toggleSupplier(s.id)}>
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground">{selectedIds.length}/5 selected</p>
                </CardContent>
              </Card>

              {/* Matched supplier list */}
              <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                {matchLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <div key={n} className="rounded-lg border border-border p-3 flex items-center gap-3">
                        <div className="w-5 h-5 rounded bg-muted animate-pulse shrink-0" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-3 bg-muted animate-pulse rounded w-2/3" />
                          <div className="h-2.5 bg-muted animate-pulse rounded w-1/3" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : displayedSuppliers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No suppliers found for this category.</p>
                ) : (
                  displayedSuppliers.map((s, idx) => {
                    const selected = selectedIds.includes(s.id);
                    const sustScore = s.sustainabilityScore != null ? Number(s.sustainabilityScore) : null;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleSupplier(s.id)}
                        className={`w-full text-left rounded-lg border p-3 flex items-start gap-3 transition-colors ${
                          selected
                            ? "border-green-500 bg-green-50 dark:bg-green-900/10"
                            : s.isHighSustainability && !s.isFallback
                            ? "border-emerald-300 bg-emerald-50/50 dark:bg-emerald-900/5 hover:border-emerald-400"
                            : "border-border hover:border-green-300 bg-card"
                        }`}
                      >
                        <div className={`w-5 h-5 rounded flex items-center justify-center border-2 shrink-0 mt-0.5 ${selected ? "border-green-500 bg-green-500" : "border-muted-foreground/30"}`}>
                          {selected && <CheckCircle className="w-3 h-3 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-sm font-medium truncate">{s.companyName}</p>
                            {idx === 0 && !supplierSearch && !s.isFallback && (
                              <span className="text-[10px] font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-1.5 py-0.5 rounded-full leading-none">
                                #1 Match
                              </span>
                            )}
                            {s.isFallback && (
                              <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full leading-none">
                                Broader match
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {(s.city || s.state) && (
                              <p className="text-xs text-muted-foreground flex items-center gap-0.5">
                                <MapPin className="w-2.5 h-2.5" />
                                {[s.city, s.state].filter(Boolean).join(", ")}
                              </p>
                            )}
                            {s.isLocalSupplier && (
                              <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded-full leading-none">
                                Same-state
                              </span>
                            )}
                          </div>
                          {s.certificationMatches.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {s.certificationMatches.slice(0, 3).map((c) => (
                                <span key={c} className="text-[10px] border border-green-300 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded-full leading-none">
                                  {c}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          {s.isHighSustainability && !s.isFallback && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded-full leading-none whitespace-nowrap">
                              <Sparkles className="w-2.5 h-2.5" />High Sustainability Option
                            </span>
                          )}
                          <div className="flex items-center gap-1">
                            <ScoreBadge score={sustScore} />
                            {s.isPremium && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />}
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ── Step 3: Review + Send ────────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-4">
              <Card>
                <CardContent className="pt-5 space-y-4">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Project</h3>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                    <div><span className="text-muted-foreground">Name</span><p className="font-medium">{formValues.projectName}</p></div>
                    <div><span className="text-muted-foreground">Type</span><p className="font-medium">{formValues.projectType}</p></div>
                    <div><span className="text-muted-foreground">Location</span><p className="font-medium">{formValues.projectCity}, {formValues.projectState}</p></div>
                    {formValues.startDate && <div><span className="text-muted-foreground">Start Date</span><p className="font-medium">{formValues.startDate}</p></div>}
                    {formValues.projectSqFt && <div><span className="text-muted-foreground">Size</span><p className="font-medium">{Number(formValues.projectSqFt).toLocaleString()} sq ft</p></div>}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-5 space-y-4">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Material Request</h3>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                    <div><span className="text-muted-foreground">Category</span><p className="font-medium">{formValues.category}</p></div>
                    <div><span className="text-muted-foreground">Quantity</span><p className="font-medium">{formValues.quantity} {formValues.unit}</p></div>
                    <div className="col-span-2"><span className="text-muted-foreground">Description</span><p className="font-medium">{formValues.description}</p></div>
                    {watchedCerts.length > 0 && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Certifications</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {watchedCerts.map((c) => <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>)}
                        </div>
                      </div>
                    )}
                    <div><span className="text-muted-foreground">EPD Required</span><p className="font-medium capitalize">{formValues.epdRequired ?? "preferred"}</p></div>
                    {formValues.maxGwp && <div><span className="text-muted-foreground">Max GWP</span><p className="font-medium">{formValues.maxGwp} kgCO₂e/kg</p></div>}
                    {formValues.targetDeliveryDate && <div><span className="text-muted-foreground">Target Delivery</span><p className="font-medium">{formValues.targetDeliveryDate}</p></div>}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-5 space-y-3">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    Suppliers ({selectedIds.length})
                  </h3>
                  {selectedSupplierObjects.map((s) => (
                    <div key={s.id} className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium flex-1">{s.companyName}</span>
                      <ScoreBadge score={s.sustainabilityScore != null ? Number(s.sustainabilityScore) : null} />
                      {s.isPremium && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />}
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground border-t pt-3 mt-2">
                    Most suppliers respond within 48 hours in a comparable format — price, lead time, and documentation in one view.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── Submittal nudge on review step ──────────────────────── */}
          {step === 3 && (
            <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-foreground">Submittal PDF included with this RFQ.</p>
                <p className="text-xs text-muted-foreground mt-0.5">EPD + compliance docs formatted for approval — packaged automatically with your bid requests. Generate it now to review before sending.</p>
              </div>
              <Link href="/tools/submittal" className="text-xs font-medium text-primary hover:underline whitespace-nowrap mt-0.5">
                Preview →
              </Link>
            </div>
          )}

          {/* ── Navigation ──────────────────────────────────────────── */}
          <div className="flex gap-3 mt-6">
            {step > 0 && (
              <Button type="button" variant="outline" className="flex-1" onClick={() => setStep((s) => s - 1)}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </Button>
            )}
            {step < 3 ? (
              <Button type="button" className="flex-1 bg-green-600 hover:bg-green-700" onClick={goNext}>
                Next <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={createMulti.isPending}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {createMulti.isPending ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />Sending…</>
                ) : (
                  <><Send className="w-4 h-4 mr-2" />Send RFQ</>
                )}
              </Button>
            )}
          </div>

        </form>
      </div>

      <Footer />
    </div>
  );
}
