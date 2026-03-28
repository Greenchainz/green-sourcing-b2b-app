import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useLocation } from "wouter";
import {
  User, Building2, Leaf, MapPin, CheckCircle,
  Zap, BarChart2, TreePine, Layers,
} from "lucide-react";

// ── Constants ─────────────────────────────────────────────────────────────────

const FIRM_TYPES = [
  { value: "architecture_firm", label: "Architecture Firm" },
  { value: "engineering_firm", label: "Engineering Firm" },
  { value: "owner_developer", label: "Owner / Developer" },
  { value: "contractor", label: "General Contractor" },
  { value: "consultant", label: "Sustainability Consultant" },
] as const;

const VOLUME_OPTIONS = [
  { value: "under_1m", label: "Under $1M" },
  { value: "1m_10m", label: "$1M – $10M" },
  { value: "10m_50m", label: "$10M – $50M" },
  { value: "over_50m", label: "Over $50M" },
] as const;

const PROJECT_TYPES = [
  "Commercial",
  "Residential",
  "Institutional",
  "Industrial",
  "Mixed-Use",
  "Healthcare",
  "Education",
  "Hospitality",
] as const;

const SUSTAINABILITY_GOALS = [
  { value: "leed_certification", label: "LEED Certification", icon: Leaf },
  { value: "net_zero", label: "Net Zero Energy", icon: Zap },
  { value: "embodied_carbon", label: "Embodied Carbon Reduction", icon: BarChart2 },
  { value: "biophilic", label: "Biophilic Design", icon: TreePine },
  { value: "mass_timber", label: "Mass Timber / Bio-based", icon: Layers },
  { value: "living_building", label: "Living Building Challenge", icon: Leaf },
] as const;

const PREFERRED_CERTS = [
  "LEED",
  "BREEAM",
  "Living Building Challenge",
  "WELL",
  "Fitwel",
  "Net Zero Carbon",
  "ENERGY STAR",
  "Passive House",
] as const;

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DC","DE","FL","GA","HI","ID","IL","IN",
  "IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH",
  "NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT",
  "VT","VA","WA","WV","WI","WY",
] as const;

const PROJECT_REGIONS = [
  "Northeast", "Southeast", "Midwest", "Southwest", "West", "Pacific Northwest",
] as const;

// ── Zod schema ────────────────────────────────────────────────────────────────

const schema = z.object({
  // Step 1
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email required"),
  phone: z.string().optional(),
  // Step 2
  firmName: z.string().min(1, "Firm name is required"),
  firmType: z.enum(["architecture_firm", "engineering_firm", "owner_developer", "contractor", "consultant"]),
  licenseNumber: z.string().optional(),
  licenseState: z.string().optional(),
  annualProjectVolume: z.enum(["under_1m", "1m_10m", "10m_50m", "over_50m"]).optional(),
  // Step 3
  projectTypes: z.array(z.string()).min(1, "Select at least one project type"),
  sustainabilityGoals: z.array(z.string()).min(1, "Select at least one sustainability goal"),
  preferredCertifications: z.array(z.string()).optional(),
  leedAccredited: z.boolean().optional(),
  // Step 4
  location: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zipCode: z.string().optional(),
  primaryProjectRegion: z.string().min(1, "Primary region is required"),
});

type FormData = z.infer<typeof schema>;

// ── Step indicator (mirrors SupplierOnboarding) ───────────────────────────────

const STEPS = [
  { label: "Personal Info", icon: User },
  { label: "Firm Details", icon: Building2 },
  { label: "Preferences", icon: Leaf },
  { label: "Location", icon: MapPin },
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
            <div
              className={`flex flex-col items-center gap-1 px-3 ${
                active ? "text-green-600" : done ? "text-green-500" : "text-muted-foreground"
              }`}
            >
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center border-2 ${
                  done
                    ? "border-green-500 bg-green-500 text-white"
                    : active
                    ? "border-green-600 bg-background"
                    : "border-muted-foreground/30 bg-background"
                }`}
              >
                {done ? <CheckCircle className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </div>
              <span className="text-xs font-medium hidden sm:block">{step.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`h-0.5 w-8 sm:w-16 ${i < current ? "bg-green-500" : "bg-muted-foreground/20"}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Multi-select chip group ────────────────────────────────────────────────────

function ChipGroup({
  options,
  value,
  onChange,
  error,
  renderLabel,
}: {
  options: readonly string[];
  value: string[];
  onChange: (v: string[]) => void;
  error?: string;
  renderLabel?: (opt: string) => React.ReactNode;
}) {
  const toggle = (item: string) =>
    onChange(value.includes(item) ? value.filter((x) => x !== item) : [...value, item]);

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const selected = value.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium transition-all ${
                selected
                  ? "border-green-600 bg-green-600 text-white"
                  : "border-border hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-950"
              }`}
            >
              {renderLabel ? renderLabel(opt) : opt}
            </button>
          );
        })}
      </div>
      {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
    </div>
  );
}

// ── Checkbox group (for certifications) ──────────────────────────────────────

function CheckboxGroup({
  options,
  value,
  onChange,
}: {
  options: readonly string[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (item: string) =>
    onChange(value.includes(item) ? value.filter((x) => x !== item) : [...value, item]);

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {options.map((opt) => (
        <label
          key={opt}
          className="flex items-center gap-2 p-2 rounded-md border cursor-pointer hover:bg-muted/50 text-sm"
        >
          <Checkbox
            checked={value.includes(opt)}
            onCheckedChange={() => toggle(opt)}
          />
          {opt}
        </label>
      ))}
    </div>
  );
}

// ── Draft persistence ─────────────────────────────────────────────────────────

const DRAFT_KEY = "gc_architect_onboarding_draft";

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ArchitectOnboarding() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);

  const submitOnboarding = trpc.architect.submitOnboarding.useMutation({
    onSuccess: () => {
      try { sessionStorage.removeItem("gc_pending_role"); } catch { /* ignore */ }
      try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
      setDone(true);
      toast.success("You're in! Welcome to GreenChainz.");
    },
    onError: (err) => toast.error(err.message),
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: typeof user?.email === "string" ? user.email : "",
      phone: "",
      firmName: "",
      firmType: undefined,
      licenseNumber: "",
      licenseState: "",
      annualProjectVolume: undefined,
      projectTypes: [],
      sustainabilityGoals: [],
      preferredCertifications: [],
      leedAccredited: false,
      location: "",
      state: "",
      zipCode: "",
      primaryProjectRegion: "",
    },
  });

  // Restore draft from localStorage on first mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw) as Partial<FormData>;
      (Object.entries(draft) as [keyof FormData, unknown][]).forEach(([key, value]) => {
        setValue(key, value as FormData[typeof key]);
      });
    } catch { /* ignore corrupted drafts */ }
  }, [setValue]);

  // Persist draft to localStorage whenever form values change
  useEffect(() => {
    const sub = watch((values) => {
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify(values)); } catch { /* ignore */ }
    });
    return () => sub.unsubscribe();
  }, [watch]);

  const projectTypes = watch("projectTypes") ?? [];
  const sustainabilityGoals = watch("sustainabilityGoals") ?? [];
  const preferredCertifications = watch("preferredCertifications") ?? [];
  const leedAccredited = watch("leedAccredited") ?? false;

  const STEP_FIELDS: (keyof FormData)[][] = [
    ["firstName", "lastName", "email"],
    ["firmName", "firmType"],
    ["projectTypes", "sustainabilityGoals"],
    ["location", "state", "primaryProjectRegion"],
  ];

  const nextStep = async () => {
    const ok = await trigger(STEP_FIELDS[step]);
    if (ok) setStep((s) => s + 1);
  };

  const onSubmit = (data: FormData) => submitOnboarding.mutate(data);

  if (done) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center px-4">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">You're in!</h2>
            <p className="text-muted-foreground mt-2 max-w-sm">
              Your architect profile is live. Start exploring EPD-verified materials,
              compare carbon footprints, and send RFQs to verified suppliers.
            </p>
          </div>
          <Button className="bg-green-600 hover:bg-green-700" onClick={() => navigate("/materials")}>
            Start Finding Materials →
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <div className="container max-w-2xl py-10 flex-1">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold">Architect Onboarding</h1>
          <p className="text-muted-foreground mt-1">
            Set up your profile to access the verified sustainable materials catalog.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Step {step + 1} of {STEPS.length} — your progress is saved as you go
          </p>
        </div>

        <StepIndicator current={step} />

        <form onSubmit={handleSubmit(onSubmit)}>

          {/* ── Step 1: Personal Info ──────────────────────────────────── */}
          {step === 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Personal Information</CardTitle>
                <CardDescription>Your name and contact details.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="firstName">First name *</Label>
                    <Input
                      id="firstName"
                      placeholder="Jane"
                      {...register("firstName")}
                      className={errors.firstName ? "border-red-500" : ""}
                    />
                    {errors.firstName && <p className="text-sm text-red-500">{errors.firstName.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="lastName">Last name *</Label>
                    <Input
                      id="lastName"
                      placeholder="Smith"
                      {...register("lastName")}
                      className={errors.lastName ? "border-red-500" : ""}
                    />
                    {errors.lastName && <p className="text-sm text-red-500">{errors.lastName.message}</p>}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="jane@gensler.com"
                    {...register("email")}
                    className={errors.email ? "border-red-500" : ""}
                  />
                  {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone <span className="text-muted-foreground">(optional)</span></Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    {...register("phone")}
                  />
                </div>

                <Button type="button" className="w-full bg-green-600 hover:bg-green-700" onClick={nextStep}>
                  Next: Firm Details
                </Button>
              </CardContent>
            </Card>
          )}

          {/* ── Step 2: Firm Details ───────────────────────────────────── */}
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Firm Details</CardTitle>
                <CardDescription>Tell us about your practice.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="firmName">Firm name *</Label>
                  <Input
                    id="firmName"
                    placeholder="Gensler, SOM, Your Firm LLC…"
                    {...register("firmName")}
                    className={errors.firmName ? "border-red-500" : ""}
                  />
                  {errors.firmName && <p className="text-sm text-red-500">{errors.firmName.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label>Firm type *</Label>
                  <Select
                    onValueChange={(v) => setValue("firmType", v as FormData["firmType"], { shouldValidate: true })}
                    defaultValue={watch("firmType")}
                  >
                    <SelectTrigger className={errors.firmType ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select firm type…" />
                    </SelectTrigger>
                    <SelectContent>
                      {FIRM_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.firmType && <p className="text-sm text-red-500">{errors.firmType.message}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="licenseNumber">License number <span className="text-muted-foreground">(optional)</span></Label>
                    <Input
                      id="licenseNumber"
                      placeholder="AIA-123456"
                      {...register("licenseNumber")}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="licenseState">License state <span className="text-muted-foreground">(optional)</span></Label>
                    <Input
                      id="licenseState"
                      placeholder="CA"
                      maxLength={2}
                      {...register("licenseState")}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Annual project volume <span className="text-muted-foreground">(optional)</span></Label>
                  <Select
                    onValueChange={(v) => setValue("annualProjectVolume", v as FormData["annualProjectVolume"])}
                    defaultValue={watch("annualProjectVolume")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select range…" />
                    </SelectTrigger>
                    <SelectContent>
                      {VOLUME_OPTIONS.map((v) => (
                        <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-3">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(0)}>
                    Back
                  </Button>
                  <Button type="button" className="flex-1 bg-green-600 hover:bg-green-700" onClick={nextStep}>
                    Next: Preferences
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Step 3: Project Preferences ───────────────────────────── */}
          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Project Preferences</CardTitle>
                <CardDescription>
                  We'll use this to surface the most relevant materials for your work.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Project types * <span className="text-xs text-muted-foreground">(select all that apply)</span></Label>
                  <ChipGroup
                    options={PROJECT_TYPES}
                    value={projectTypes}
                    onChange={(v) => setValue("projectTypes", v, { shouldValidate: true })}
                    error={errors.projectTypes?.message as string | undefined}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Sustainability goals * <span className="text-xs text-muted-foreground">(select all that apply)</span></Label>
                  <ChipGroup
                    options={SUSTAINABILITY_GOALS.map((g) => g.value)}
                    value={sustainabilityGoals}
                    onChange={(v) => setValue("sustainabilityGoals", v, { shouldValidate: true })}
                    error={errors.sustainabilityGoals?.message as string | undefined}
                    renderLabel={(val) => {
                      const goal = SUSTAINABILITY_GOALS.find((g) => g.value === val);
                      if (!goal) return val;
                      const Icon = goal.icon;
                      return (
                        <>
                          <Icon className="w-3.5 h-3.5" />
                          {goal.label}
                        </>
                      );
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Preferred certifications <span className="text-muted-foreground text-xs">(optional)</span></Label>
                  <CheckboxGroup
                    options={PREFERRED_CERTS}
                    value={preferredCertifications}
                    onChange={(v) => setValue("preferredCertifications", v)}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="leedAccredited"
                    checked={leedAccredited}
                    onCheckedChange={(v) => setValue("leedAccredited", v === true)}
                  />
                  <Label htmlFor="leedAccredited" className="cursor-pointer">
                    I am LEED Accredited (LEED AP / BD+C / ID+C / O+M)
                  </Label>
                </div>

                <div className="flex gap-3">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(1)}>
                    Back
                  </Button>
                  <Button type="button" className="flex-1 bg-green-600 hover:bg-green-700" onClick={nextStep}>
                    Next: Location
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Step 4: Location + Submit ──────────────────────────────── */}
          {step === 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Location</CardTitle>
                <CardDescription>
                  Helps us show you local suppliers and state-specific compliance requirements.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="location">City *</Label>
                    <Input
                      id="location"
                      placeholder="San Francisco"
                      {...register("location")}
                      className={errors.location ? "border-red-500" : ""}
                    />
                    {errors.location && <p className="text-sm text-red-500">{errors.location.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>State *</Label>
                    <Select
                      onValueChange={(v) => setValue("state", v, { shouldValidate: true })}
                      defaultValue={watch("state")}
                    >
                      <SelectTrigger className={errors.state ? "border-red-500" : ""}>
                        <SelectValue placeholder="Select state…" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {US_STATES.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.state && <p className="text-sm text-red-500">{errors.state.message}</p>}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="zipCode">ZIP code <span className="text-muted-foreground">(optional)</span></Label>
                  <Input
                    id="zipCode"
                    placeholder="94105"
                    maxLength={10}
                    {...register("zipCode")}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Primary project region *</Label>
                  <Select
                    onValueChange={(v) => setValue("primaryProjectRegion", v, { shouldValidate: true })}
                    defaultValue={watch("primaryProjectRegion")}
                  >
                    <SelectTrigger className={errors.primaryProjectRegion ? "border-red-500" : ""}>
                      <SelectValue placeholder="Select region…" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROJECT_REGIONS.map((r) => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.primaryProjectRegion && (
                    <p className="text-sm text-red-500">{errors.primaryProjectRegion.message}</p>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(2)}>
                    Back
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    disabled={submitOnboarding.isPending}
                  >
                    {submitOnboarding.isPending ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Saving…
                      </>
                    ) : (
                      "Complete Profile →"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </form>
      </div>
      <Footer />
    </div>
  );
}
