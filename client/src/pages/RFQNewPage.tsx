/**
 * NewRFQPage — 4-step RFQ submission wizard
 * Route: /rfq/new?supplierId=&materialId=
 */
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  X,
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

  // Architect profile for region toggle
  const { data: profile } = trpc.architect.getMyProfile.useQuery(undefined, {
    enabled: user?.role === "architect",
    staleTime: 60_000,
  });

  // Supplier lists
  const { data: allSuppliers = [] } = trpc.rfqRequests.listSuppliers.useQuery(
    { search: supplierSearch || undefined },
    { staleTime: 60_000 }
  );

  const profileState = profile?.state ?? "";
  const { data: regionSuppliers = [] } = trpc.location.suppliersByState.useQuery(
    { state: profileState },
    { enabled: profileState.length === 2 && regionAll, staleTime: 5 * 60_000 }
  );

  // When "all in region" is toggled on, replace selection with regional supplier IDs
  useEffect(() => {
    if (regionAll && regionSuppliers.length > 0) {
      setSelectedIds(regionSuppliers.map((s) => s.id).slice(0, 5));
    }
  }, [regionAll, regionSuppliers]);

  const createMulti = trpc.rfqRequests.createMulti.useMutation({
    onSuccess: ({ primaryId }) => {
      toast.success("RFQ sent to suppliers!", { description: "Most respond within 48 hours." });
      navigate(`/rfqs/${primaryId}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { unit: "SF", epdRequired: "preferred" },
  });

  const watchedCerts = watch("certifications") ?? [];

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
  const selectedSupplierObjects = allSuppliers.filter((s) => selectedIds.includes(s.id));

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
          <h1 className="text-2xl font-bold">New Request for Quotation</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Send a material request to verified sustainable suppliers.
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
                    <Input
                      id="projectCity"
                      placeholder="San Francisco"
                      {...register("projectCity")}
                      className={errors.projectCity ? "border-red-500" : ""}
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
              <Card>
                <CardContent className="pt-5 space-y-3">
                  {/* Region toggle */}
                  {profileState && (
                    <div className="flex items-center justify-between py-2 px-1 rounded-lg border border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-900/30">
                      <div>
                        <p className="text-sm font-medium">Send to all verified in {profileState}</p>
                        <p className="text-xs text-muted-foreground">Auto-selects up to 5 suppliers</p>
                      </div>
                      <Switch checked={regionAll} onCheckedChange={(v) => { setRegionAll(v); if (!v) setSelectedIds(presetSupplierId ? [presetSupplierId] : []); }} />
                    </div>
                  )}

                  {/* Search */}
                  <Input
                    placeholder="Search suppliers…"
                    value={supplierSearch}
                    onChange={(e) => setSupplierSearch(e.target.value)}
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

              {/* Supplier list */}
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {allSuppliers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No verified suppliers found.</p>
                ) : (
                  allSuppliers.map((s) => {
                    const selected = selectedIds.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleSupplier(s.id)}
                        className={`w-full text-left rounded-lg border p-3 flex items-center gap-3 transition-colors ${
                          selected
                            ? "border-green-500 bg-green-50 dark:bg-green-900/10"
                            : "border-border hover:border-green-300 bg-card"
                        }`}
                      >
                        <div className={`w-5 h-5 rounded flex items-center justify-center border-2 shrink-0 ${selected ? "border-green-500 bg-green-500" : "border-muted-foreground/30"}`}>
                          {selected && <CheckCircle className="w-3 h-3 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{s.companyName}</p>
                          {(s.city || s.state) && (
                            <p className="text-xs text-muted-foreground">{[s.city, s.state].filter(Boolean).join(", ")}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <ScoreBadge score={s.sustainabilityScore} />
                          {s.isPremium && (
                            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                          )}
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
                      <ScoreBadge score={s.sustainabilityScore} />
                      {s.isPremium && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />}
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground border-t pt-3 mt-2">
                    Most suppliers respond within 48 hours.
                  </p>
                </CardContent>
              </Card>
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
