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
  MessageSquare,
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

/** Look up a 5-digit US zip code → { city, state } via zippopotam.us (no API key). */
async function lookupZip(zip: string): Promise<{ city: string; state: string } | null> {
  try {
    const res = await fetch(`https://api.zippopotam.us/us/${zip}`);
    if (!res.ok) return null;
    const data = await res.json() as { places?: { "place name": string; "state abbreviation": string }[] };
    const place = data.places?.[0];
    if (!place) return null;
    return { city: place["place name"], state: place["state abbreviation"] };
  } catch {
    return null;
  }
}

// ── Schema ─────────────────────────────────────────────────────────────────────

const schema = z.object({
  // Step 0 — Project Info
  projectName: z.string().min(1, "Project name is required"),
  projectType: z.string().min(1, "Project type is required"),
  // Zip is the primary location input. City + state are derived from zip lookup
  // and stored for supplier matching — but they're optional so a lookup failure
  // never blocks submission.
  projectZip: z.string().regex(/^\d{5}$/, "Enter a 5-digit zip code").optional(),
  projectCity: z.string().optional().default(""),
  projectState: z.string().optional().default(""),
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
  // Step 0 (AI mode) — all required fields validated together before jumping to suppliers
  0: ["projectName", "projectType", "projectCity", "projectState", "category", "description", "quantity", "unit"],
  1: ["projectName", "projectType", "projectCity", "projectState", "category", "description", "quantity", "unit"],
  2: [],
  3: [],
};

// ── Step indicator ─────────────────────────────────────────────────────────────

const STEPS = [
  { label: "Describe",  icon: MessageSquare },
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

  // ── AI intake state ──────────────────────────────────────────────────────────
  const [aiInput, setAiInput] = useState("");
  const [aiParsing, setAiParsing] = useState(false);
  const [aiParsed, setAiParsed] = useState(false);
  const [aiSummary, setAiSummary] = useState<string[]>([]);
  const [clarifyQuestion, setClarifyQuestion] = useState<string | null>(null);
  const [clarifyInput, setClarifyInput] = useState("");
  const [allFieldsReady, setAllFieldsReady] = useState(false);

  // Map LLM category labels → form MATERIAL_CATEGORIES values
  // ── AI intake helpers ────────────────────────────────────────────────────────

  const mapAiCategory = (cat: string): string => {
    const direct = MATERIAL_CATEGORIES.find(c => c === cat);
    if (direct) return direct;
    const legacyMap: Record<string, string> = {
      "Concrete": "Concrete & Masonry",
      "Steel": "Steel & Metal",
      "Timber / Mass Timber": "Timber & Wood",
      "Glass": "Glazing & Windows",
      "Cladding": "Cladding & Facades",
      "MEP": "HVAC Systems",
      "Gypsum / Drywall": "Interior Finishes",
    };
    if (legacyMap[cat]) return legacyMap[cat];
    return MATERIAL_CATEGORIES.find(c =>
      c.toLowerCase().includes(cat.toLowerCase()) || cat.toLowerCase().includes(c.toLowerCase().split(" ")[0])
    ) ?? "";
  };

  const applyParsedFields = (fields: Record<string, unknown>): string[] => {
    const fieldsFound = Array.isArray(fields.fieldsFound) ? (fields.fieldsFound as string[]) : [];
    const filled: string[] = [];

    if (typeof fields.category === "string" && fields.category) {
      const mapped = mapAiCategory(fields.category);
      if (mapped) { setValue("category", mapped, { shouldValidate: true }); filled.push("Material type"); }
    }
    if (typeof fields.description === "string" && fields.description.trim().length >= 2) {
      setValue("description", fields.description, { shouldValidate: true });
      filled.push("Description");
    }
    if (typeof fields.quantity === "number" && fields.quantity > 0) {
      setValue("quantity", fields.quantity as any, { shouldValidate: true });
      filled.push("Quantity");
    }
    if (typeof fields.unit === "string") {
      const validUnit = (["SF","LF","EA","CY","tons"] as const).find(
        u => u.toLowerCase() === (fields.unit as string).toLowerCase()
      );
      if (validUnit) setValue("unit", validUnit);
    }
    if (fieldsFound.includes("certifications") && Array.isArray(fields.certifications)) {
      const validCerts = (fields.certifications as string[]).filter(fc =>
        CERT_OPTIONS.some(opt => opt.toLowerCase() === fc.toLowerCase())
      );
      if (validCerts.length > 0) { setValue("certifications", validCerts); filled.push("Certifications"); }
    }
    if (typeof fields.maxGwp === "number") {
      setValue("maxGwp", fields.maxGwp as any);
      filled.push("GWP limit");
    }
    if (fieldsFound.includes("epdRequired")) {
      setValue("epdRequired", fields.epdRequired ? "yes" : "preferred");
    }
    if (typeof fields.projectName === "string" && fields.projectName.trim()) {
      setValue("projectName", fields.projectName.trim(), { shouldValidate: true });
      filled.push("Project name");
    }
    if (typeof fields.projectType === "string" && fields.projectType.trim()) {
      const validType = PROJECT_TYPES.find(
        t => t.toLowerCase() === (fields.projectType as string).toLowerCase() ||
             (fields.projectType as string).toLowerCase().includes(t.toLowerCase().split(" ")[0])
      );
      if (validType) { setValue("projectType", validType, { shouldValidate: true }); filled.push("Project type"); }
    }
    // Zip takes priority — look it up and derive city + state from it.
    // If the lookup fails (API down etc.), we still store the zip and move on.
    if (typeof fields.projectZip === "string" && /^\d{5}$/.test(fields.projectZip)) {
      const zip = fields.projectZip;
      setValue("projectZip", zip, { shouldValidate: true });
      void lookupZip(zip).then((loc) => {
        if (loc) {
          setValue("projectCity", loc.city, { shouldValidate: true });
          setValue("projectState", loc.state, { shouldValidate: true });
        }
      });
      filled.push("Location");
    } else {
      if (typeof fields.projectCity === "string" && fields.projectCity.trim()) {
        setValue("projectCity", fields.projectCity.trim(), { shouldValidate: true });
        filled.push("City");
      }
      if (typeof fields.projectState === "string" && US_STATES.includes(fields.projectState.toUpperCase())) {
        setValue("projectState", fields.projectState.toUpperCase(), { shouldValidate: true });
        filled.push("State");
      }
    }
    return filled;
  };

  const getMissingField = (): { field: string; question: string } | null => {
    const v = getValues();
    if (!v.category) return { field: "category", question: "What type of material do you need? e.g., concrete, steel, timber, insulation, roofing, flooring…" };
    if (!v.quantity || Number(v.quantity) <= 0) return { field: "quantity", question: "How much do you need? e.g., '2,500 SF', '50 tons', '100 LF'" };
    if (!v.projectZip && !v.projectCity) return { field: "location", question: "What's the project zip code? e.g., 02101" };
    if (!v.projectName) return { field: "projectName", question: "What's the project name or address? e.g., '555 Market St Office Tower'" };
    if (!v.projectType) return { field: "projectType", question: "What type of building is this? e.g., office, multifamily residential, healthcare, retail" };
    return null;
  };

  const parseAndApply = async (text: string, isClarification = false) => {
    setAiParsing(true);
    try {
      const res = await fetch("/api/rfq/parse-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Parse failed");
      }
      const fields = await res.json() as Record<string, unknown>;
      const filled = applyParsedFields(fields);

      // Auto-generate description if still empty
      const v = getValues();
      if (!v.description || (v.description as string).trim().length < 2) {
        const cat = (v.category as string) || "";
        const qty = v.quantity ? `${v.quantity} ${v.unit ?? ""}`.trim() : "";
        const loc = v.projectCity ? `in ${v.projectCity}${v.projectState ? `, ${v.projectState}` : ""}` : "";
        const autoDesc = [cat, qty, loc].filter(Boolean).join(" ");
        if (autoDesc.trim().length >= 2) {
          setValue("description", autoDesc.trim(), { shouldValidate: true });
        }
      }

      if (!isClarification) {
        setAiParsed(true);
        if (filled.length > 0) setAiSummary(filled);
      } else if (filled.length > 0) {
        setAiSummary(prev => [...new Set([...prev, ...filled])]);
      }

      const missing = getMissingField();
      if (!missing) {
        setAllFieldsReady(true);
        setClarifyQuestion(null);
      } else {
        setClarifyQuestion(missing.question);
        setAllFieldsReady(false);
      }
    } catch {
      toast.error("Couldn't parse that — try rephrasing or fill in manually.");
    } finally {
      setAiParsing(false);
    }
  };

  const handleAiSubmit = () => {
    if (!aiInput.trim() || aiParsing) return;
    void parseAndApply(aiInput, false);
  };

  const handleClarifySubmit = () => {
    if (!clarifyInput.trim() || aiParsing) return;

    // Zip code: resolve directly without an AI round-trip.
    const zipMatch = clarifyInput.trim().match(/^\d{5}$/);
    if (zipMatch) {
      setAiParsing(true);
      void lookupZip(clarifyInput.trim()).then((loc) => {
        setAiParsing(false);
        setValue("projectZip", clarifyInput.trim(), { shouldValidate: true });
        // Populate city/state if lookup succeeded — if it failed (API down etc.)
        // we still accept the zip and move forward.
        if (loc) {
          setValue("projectCity", loc.city, { shouldValidate: true });
          setValue("projectState", loc.state, { shouldValidate: true });
        }
        setClarifyInput("");
        setTimeout(() => {
          const next = getMissingField();
          if (!next) { setAllFieldsReady(true); setClarifyQuestion(null); }
          else setClarifyQuestion(next.question);
        }, 0);
      });
      return;
    }

    const enriched = `${aiInput}\n\nAdditional info: ${clarifyInput}`;
    void parseAndApply(enriched, true);
    setClarifyInput("");
  };

  const resetAi = () => {
    setAiParsed(false);
    setAllFieldsReady(false);
    setAiSummary([]);
    setClarifyQuestion(null);
    setClarifyInput("");
  };

  // ── Spec PDF upload for the AI intake (Step 0) ───────────────────────────────
  // Uses Azure Document Intelligence → LLM pipeline, then drives the AI flow
  // (same endpoint as the manual-form spec upload, different state handling)
  const handleSpecUploadAi = async (file: File) => {
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

    const formData = new FormData();
    formData.append("spec", file);

    try {
      const res = await fetch("/api/rfq/parse-spec", { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Parse failed" })) as { error?: string };
        throw new Error(err.error ?? "Parse failed");
      }

      const fields = await res.json() as Record<string, unknown>;
      const filled = applyParsedFields(fields);

      // Auto-generate description if the PDF didn't supply one
      const v = getValues();
      if (!v.description || (v.description as string).trim().length < 2) {
        const cat = (v.category as string) || "";
        const qty = v.quantity ? `${v.quantity} ${v.unit ?? ""}`.trim() : "";
        const loc = v.projectCity ? `in ${v.projectCity}${v.projectState ? `, ${v.projectState}` : ""}` : "";
        const autoDesc = [cat, qty, loc].filter(Boolean).join(" ");
        if (autoDesc.trim().length >= 2) {
          setValue("description", autoDesc.trim(), { shouldValidate: true });
        }
      }

      setAiParsed(true);
      if (filled.length > 0) setAiSummary(filled);

      const missing = getMissingField();
      if (!missing) {
        setAllFieldsReady(true);
        setClarifyQuestion(null);
        toast.success(`Spec parsed — ${filled.length} fields filled from "${file.name}". Ready to match suppliers.`);
      } else {
        setClarifyQuestion(missing.question);
        setAllFieldsReady(false);
        if (filled.length > 0) {
          toast.success(`Spec parsed — ${filled.length} fields pre-filled. Just a couple more details needed.`);
        } else {
          toast.warning("Spec analyzed but limited data extracted. Please answer the questions below.", { duration: 5000 });
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Spec parsing failed";
      setSpecError(msg);
      toast.error(msg);
    } finally {
      setSpecUploading(false);
      if (specInputRef.current) specInputRef.current.value = "";
    }
  };

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
          onClick={() => {
            if (step === 0) navigate("/dashboard");
            else if (step === 2) setStep(aiParsed && allFieldsReady ? 0 : 1);
            else setStep((s) => s - 1);
          }}
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

          {/* ── Step 0: AI Intake ─────────────────────────────────────── */}
          {step === 0 && (
            <Card>
              <CardContent className="pt-6 space-y-5">
                {!aiParsed ? (
                  /* Phase 1 — Initial entry (text OR spec PDF) */
                  <div className="space-y-4">
                    {/* ── Natural language input ─────────────────────────── */}
                    <div className="space-y-2">
                      <Label htmlFor="aiInput" className="flex items-center gap-1.5 text-base font-semibold">
                        <MessageSquare className="w-4 h-4 text-green-600" />
                        Tell us what you need
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Describe your project in plain language — material type, quantity, location, certifications, anything relevant. Our AI handles the details.
                      </p>
                      <Textarea
                        id="aiInput"
                        placeholder="e.g., Need 3,000 SF of FSC-certified CLT panels for a 6-story mixed-use building in Austin, TX. EPD documentation required for LEED credit."
                        rows={4}
                        value={aiInput}
                        onChange={(e) => setAiInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleAiSubmit(); }}
                        className="resize-none"
                        disabled={aiParsing}
                        autoFocus
                      />
                      <p className="text-xs text-muted-foreground">⌘Enter to submit</p>
                    </div>
                    <Button
                      type="button"
                      className="w-full bg-green-600 hover:bg-green-700"
                      onClick={handleAiSubmit}
                      disabled={!aiInput.trim() || aiParsing}
                    >
                      {aiParsing ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing…</>
                      ) : (
                        <><Sparkles className="w-4 h-4 mr-2" />Analyze &amp; Match Suppliers</>
                      )}
                    </Button>

                    {/* ── OR divider ─────────────────────────────────────── */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1 border-t" />
                      <span className="text-xs text-muted-foreground">or</span>
                      <div className="flex-1 border-t" />
                    </div>

                    {/* ── Spec PDF drop zone ─────────────────────────────── */}
                    <div className="space-y-1.5">
                      <Label className="flex items-center gap-1.5 text-sm font-medium">
                        <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                        Drop a spec section PDF — AI will pre-fill everything
                      </Label>
                      <div
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDragging(false);
                          const file = e.dataTransfer.files[0];
                          if (file) void handleSpecUploadAi(file);
                        }}
                        onClick={() => !specUploading && specInputRef.current?.click()}
                        className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-4 text-center transition-colors cursor-pointer select-none ${
                          specUploading
                            ? "border-primary/40 bg-primary/5 cursor-not-allowed"
                            : isDragging
                            ? "border-green-500 bg-green-50 dark:bg-green-900/10"
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
                            if (file) void handleSpecUploadAi(file);
                          }}
                        />
                        {specUploading ? (
                          <>
                            <Loader2 className="w-5 h-5 text-primary animate-spin" />
                            <p className="text-sm font-medium">Analyzing spec section…</p>
                            <p className="text-xs text-muted-foreground">Document Intelligence + AI — under 10 seconds</p>
                          </>
                        ) : (
                          <>
                            <Upload className="w-5 h-5 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">
                              <span className="font-medium text-foreground">Drop a spec PDF</span> or click to browse
                            </p>
                            <p className="text-xs text-muted-foreground">CSI spec section, product data sheet · Max 25 MB</p>
                          </>
                        )}
                      </div>
                      {specError && (
                        <div className="flex items-start gap-2 rounded-md bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 px-3 py-2">
                          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                          <p className="text-xs text-red-600 dark:text-red-400">{specError}</p>
                        </div>
                      )}
                    </div>

                    <div className="text-center">
                      <button
                        type="button"
                        onClick={() => { setAiParsed(true); setAllFieldsReady(false); setStep(1); }}
                        className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
                      >
                        Fill out the form manually instead →
                      </button>
                    </div>
                  </div>
                ) : allFieldsReady ? (
                  /* Phase 3 — All required fields present */
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-900/30 px-4 py-3">
                      <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-green-800 dark:text-green-300">Ready to match suppliers</p>
                        <p className="text-xs text-green-700 dark:text-green-400 mt-0.5">Captured: {aiSummary.join(" · ")}</p>
                      </div>
                    </div>
                    <div className="rounded-lg border bg-muted/30 px-4 py-3 space-y-2 text-sm">
                      {watch("category") && <div className="flex gap-2"><span className="w-24 shrink-0 text-muted-foreground">Material</span><span className="font-medium">{watch("category")}</span></div>}
                      {watch("quantity") && <div className="flex gap-2"><span className="w-24 shrink-0 text-muted-foreground">Quantity</span><span className="font-medium">{watch("quantity")} {watch("unit")}</span></div>}
                      {watch("description") && <div className="flex gap-2"><span className="w-24 shrink-0 text-muted-foreground">Details</span><span className="font-medium truncate">{watch("description")}</span></div>}
                      {watch("projectCity") && <div className="flex gap-2"><span className="w-24 shrink-0 text-muted-foreground">Location</span><span className="font-medium">{watch("projectCity")}, {watch("projectState")}</span></div>}
                      {watch("projectName") && <div className="flex gap-2"><span className="w-24 shrink-0 text-muted-foreground">Project</span><span className="font-medium">{watch("projectName")}</span></div>}
                      {(watch("certifications") ?? []).length > 0 && <div className="flex gap-2"><span className="w-24 shrink-0 text-muted-foreground">Certs</span><span className="font-medium">{(watch("certifications") ?? []).join(", ")}</span></div>}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        onClick={() => setStep(2)}
                      >
                        Find Suppliers <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                      <Button type="button" variant="outline" onClick={resetAi}>
                        Edit
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* Phase 2 — Conversational clarification */
                  <div className="space-y-4">
                    {aiSummary.length > 0 && (
                      <div className="flex items-start gap-3 rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-900/30 px-4 py-3">
                        <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                        <p className="text-sm text-green-800 dark:text-green-300">
                          Got it — filled in: <span className="font-medium">{aiSummary.join(", ")}</span>
                        </p>
                      </div>
                    )}
                    {clarifyQuestion && (
                      <div className="space-y-3">
                        <div className="flex items-start gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-green-600 flex items-center justify-center shrink-0">
                            <Sparkles className="w-3.5 h-3.5 text-white" />
                          </div>
                          <div className="flex-1 rounded-2xl rounded-tl-none bg-muted px-4 py-2.5">
                            <p className="text-sm">{clarifyQuestion}</p>
                          </div>
                        </div>
                        <div className="flex gap-2 pl-9">
                          <Input
                            placeholder="Your answer…"
                            value={clarifyInput}
                            onChange={(e) => setClarifyInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") handleClarifySubmit(); }}
                            disabled={aiParsing}
                            className="flex-1"
                            autoFocus
                          />
                          <Button
                            type="button"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={handleClarifySubmit}
                            disabled={!clarifyInput.trim() || aiParsing}
                          >
                            {aiParsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                    )}
                    {aiParsing && !clarifyQuestion && (
                      <div className="flex items-center gap-2 text-muted-foreground text-sm">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing…
                      </div>
                    )}
                    <div className="pt-1 border-t">
                      <button type="button" onClick={resetAi}
                        className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2">
                        ← Start over
                      </button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ── Step 1: Manual Project + Material Form (fallback) ─────── */}
          {step === 1 && (
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

                <div className="space-y-1.5">
                  <Label htmlFor="projectZip">Project Zip Code *</Label>
                  <div className="flex gap-2 items-start">
                    <div className="flex-1">
                      <Input
                        id="projectZip"
                        placeholder="e.g. 02101"
                        maxLength={5}
                        value={formValues.projectZip ?? ""}
                        onChange={(e) => {
                          const z = e.target.value.replace(/\D/g, "").slice(0, 5);
                          setValue("projectZip", z);
                          if (z.length === 5) {
                            void lookupZip(z).then((loc) => {
                              // Populate city/state if lookup succeeded — never block if it doesn't
                              if (loc) {
                                setValue("projectCity", loc.city, { shouldValidate: true });
                                setValue("projectState", loc.state, { shouldValidate: true });
                              }
                            });
                          }
                        }}
                        className={errors.projectZip ?? errors.projectCity ?? errors.projectState ? "border-red-500" : ""}
                      />
                      {(errors.projectZip ?? errors.projectCity ?? errors.projectState) && (
                        <p className="text-xs text-red-500 mt-1">
                          {errors.projectZip?.message ?? errors.projectCity?.message ?? errors.projectState?.message}
                        </p>
                      )}
                    </div>
                    {formValues.projectCity && formValues.projectState && (
                      <div className="text-sm text-muted-foreground pt-2 whitespace-nowrap">
                        {formValues.projectCity}, {formValues.projectState}
                      </div>
                    )}
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
                  <div className="text-center py-8 space-y-2">
                    <p className="text-sm font-medium text-foreground">No verified suppliers found in your area.</p>
                    <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                      {watchedCategory && ["Concrete & Masonry"].includes(watchedCategory)
                        ? "Concrete and masonry are routed locally (within ~150 mi). Try a city closer to your material source, or contact us to expand coverage."
                        : "We match suppliers by location and delivery capability. Try adjusting your project location or selecting a broader category."}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Want to nominate a supplier?{" "}
                      <a href="/contact" className="text-primary underline underline-offset-2">Let us know.</a>
                    </p>
                  </div>
                ) : (
                  <>
                    {displayedSuppliers.map((s, idx) => {
                      const selected = selectedIds.includes(s.id);
                      const sustScore = s.sustainabilityScore != null ? Number(s.sustainabilityScore) : null;
                      const isVerified = s.verificationStatus === "approved";
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
                              {/* Verification status — always visible per product doctrine */}
                              {isVerified ? (
                                <span className="text-[10px] font-semibold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-1.5 py-0.5 rounded-full leading-none flex items-center gap-0.5">
                                  <CheckCircle className="w-2.5 h-2.5" />Verified
                                </span>
                              ) : (
                                <span className="text-[10px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded-full leading-none">
                                  Pending review
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
                                <Sparkles className="w-2.5 h-2.5" />High Sustainability
                              </span>
                            )}
                            <div className="flex items-center gap-1">
                              <ScoreBadge score={sustScore} />
                              {s.isPremium && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                    {/* Routing transparency note */}
                    <p className="text-[10px] text-muted-foreground text-center pt-1">
                      Matched by delivery range, certifications, and verified sustainability data.
                      Suppliers outside your delivery area are excluded automatically.
                    </p>
                  </>
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
              <Button type="button" variant="outline" className="flex-1"
                onClick={() => {
                  if (step === 2) setStep(aiParsed && allFieldsReady ? 0 : 1);
                  else setStep((s) => s - 1);
                }}
              >
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </Button>
            )}
            {/* Step 0 handles its own CTA (AI chat); step 1+ use Next/Send */}
            {step === 0 ? null : step < 3 ? (
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
