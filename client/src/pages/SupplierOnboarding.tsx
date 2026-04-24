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
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useLocation } from "wouter";
import {
  Building2,
  User,
  Package,
  Award,
  ClipboardCheck,
  CheckCircle,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Pencil,
} from "lucide-react";

// ── Constants ──────────────────────────────────────────────────────────────────

const MATERIAL_CATEGORIES = [
  "Concrete",
  "Steel",
  "Timber",
  "Glass",
  "Insulation",
  "Roofing",
  "Flooring",
  "Cladding",
  "MEP",
  "Other",
];

const CERTIFICATIONS = [
  "LEED",
  "EPD",
  "FSC",
  "GreenGuard",
  "Cradle to Cradle",
  "Living Building Challenge",
  "Other",
];

// ── Schema ─────────────────────────────────────────────────────────────────────

const normalizeWebsite = (val: string): string => {
  if (!val || val.trim() === "") return "";
  const v = val.trim();
  if (v.startsWith("http://") || v.startsWith("https://")) return v;
  return `https://${v}`;
};

const isValidUrlOrEmpty = (val: string): boolean => {
  if (val === "") return true;
  try {
    new URL(val);
    return true;
  } catch {
    return false;
  }
};

const schema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  website: z
    .string()
    .transform(normalizeWebsite)
    .refine(isValidUrlOrEmpty, {
      message: "Enter a valid website (e.g. greenchainz.com)",
    }),
  description: z.string().optional(),
  contactName: z.string().min(1, "Contact name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
  materialCategories: z
    .array(z.string())
    .min(1, "Select at least one category"),
  certifications: z.array(z.string()).optional(),
});

type FormValues = z.input<typeof schema>;
type FormData = z.output<typeof schema>;

type SupplierProfile = {
  companyName?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  website?: string;
  description?: string;
  materialCategories?: string[];
  certifications?: string[];
};

// ── Steps ──────────────────────────────────────────────────────────────────────

const STEPS = [
  { label: "Company Info", icon: Building2, description: "Basic company details" },
  { label: "Contact", icon: User, description: "Contact information" },
  { label: "Materials", icon: Package, description: "Material categories" },
  { label: "Certifications", icon: Award, description: "Sustainability certs" },
  { label: "Review", icon: ClipboardCheck, description: "Review & submit" },
];

// Fields to validate per step (only required fields; optional ones like phone are skipped)
const STEP_FIELDS: (keyof FormValues)[][] = [
  ["companyName"],
  ["contactName", "email"],
  ["materialCategories"],
  ["certifications"],
  [],
];

// ── Step Indicator ─────────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center mb-10">
      {STEPS.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={i} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all text-sm font-semibold ${
                  done
                    ? "border-emerald-700 bg-emerald-700 text-white"
                    : active
                    ? "border-emerald-700 bg-white text-emerald-700"
                    : "border-gray-300 bg-white text-gray-400"
                }`}
              >
                {done ? <CheckCircle className="w-5 h-5" /> : i + 1}
              </div>
              <span
                className={`text-xs font-medium hidden sm:block ${
                  active
                    ? "text-emerald-700"
                    : done
                    ? "text-emerald-700"
                    : "text-gray-400"
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`h-0.5 w-8 sm:w-14 mx-1 transition-all ${
                  i < current ? "bg-emerald-700" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Checkbox Group ─────────────────────────────────────────────────────────────

function CheckboxGroup({
  options,
  value,
  onChange,
  error,
}: {
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
  error?: string;
}) {
  const toggle = (item: string) =>
    onChange(
      value.includes(item)
        ? value.filter((x) => x !== item)
        : [...value, item]
    );

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {options.map((opt) => (
          <label
            key={opt}
            className={`flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer transition-all hover:border-emerald-700/50 hover:bg-emerald-700/5 text-sm ${
              value.includes(opt)
                ? "border-emerald-700 bg-emerald-700/10"
                : "border-gray-200"
            }`}
          >
            <Checkbox
              checked={value.includes(opt)}
              onCheckedChange={() => toggle(opt)}
            />
            {opt}
          </label>
        ))}
      </div>
      {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────────

export default function SupplierOnboarding() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [step, setStep] = useState(0);

  const profileQuery = trpc.supplierOnboarding.getMyProfile.useQuery(
    undefined,
    { enabled: !!user }
  );

  const submitOnboarding =
    trpc.supplierOnboarding.submitOnboarding.useMutation({
      onSuccess: () => {
        toast.success("Profile submitted! Redirecting to your dashboard…");
        setTimeout(() => navigate("/supplier/dashboard"), 1500);
      },
      onError: (err) => toast.error(err.message),
    });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    reset,
    formState: { errors },
  } = useForm<FormValues, unknown, FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      companyName: "",
      contactName: user?.name ?? "",
      email: user?.email ?? "",
      phone: "",
      website: "",
      description: "",
      materialCategories: [],
      certifications: [],
    },
  });

  // Pre-fill from existing profile
  useEffect(() => {
    const p = profileQuery.data as SupplierProfile | undefined;
    if (!p) return;
    reset({
      companyName: p.companyName ?? "",
      contactName: p.contactName ?? user?.name ?? "",
      email: p.email ?? user?.email ?? "",
      phone: p.phone ?? "",
      website: p.website ?? "",
      description: p.description ?? "",
      materialCategories: p.materialCategories ?? [],
      certifications: p.certifications ?? [],
    });
  }, [profileQuery.data, reset, user]);

  const materialCategories = watch("materialCategories") ?? [];
  const certifications = watch("certifications") ?? [];
  const allValues = watch();

  const nextStep = async () => {
    const fields = STEP_FIELDS[step];
    if (fields.length > 0) {
      const ok = await trigger(fields);
      if (!ok) return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const prevStep = () => setStep((s) => Math.max(s - 1, 0));

  const onSubmit = (data: FormData) => submitOnboarding.mutate(data);

  // Loading state while checking for existing profile
  if (profileQuery.isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-700" />
            <p className="text-sm text-muted-foreground">
              Checking your profile…
            </p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Page Header */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-gray-900">
              Supplier Onboarding
            </h1>
            <p className="text-muted-foreground mt-2">
              Join GreenChainz as a verified sustainable materials supplier.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Step {step + 1} of {STEPS.length}
            </p>
          </div>

          <StepIndicator current={step} />

          <form onSubmit={handleSubmit(onSubmit)}>
            {/* ── Step 1: Company Info ─────────────────────────────── */}
            {step === 0 && (
              <Card className="shadow-sm">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-700/10 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-emerald-700" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">
                        Company Information
                      </CardTitle>
                      <CardDescription>
                        Tell architects about your company. Fields marked * are required to appear in marketplace search.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-1.5">
                    <Label htmlFor="companyName">Company Name *</Label>
                    <Input
                      id="companyName"
                      placeholder="Acme Green Materials Inc."
                      {...register("companyName")}
                      className={errors.companyName ? "border-red-500" : ""}
                    />
                    {errors.companyName && (
                      <p className="text-sm text-red-500">
                        {errors.companyName.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      type="url"
                      placeholder="https://acmegreenco.com"
                      {...register("website")}
                      className={errors.website ? "border-red-500" : ""}
                    />
                    {errors.website && (
                      <p className="text-sm text-red-500">
                        {errors.website.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="description">Company Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe your company, sustainability mission, and what makes your materials unique."
                      rows={4}
                      {...register("description")}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ── Step 2: Contact ──────────────────────────────────── */}
            {step === 1 && (
              <Card className="shadow-sm">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-700/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-emerald-700" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">
                        Contact Details
                      </CardTitle>
                      <CardDescription>
                        How architects can reach you.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-1.5">
                    <Label htmlFor="contactName">Contact Name *</Label>
                    <Input
                      id="contactName"
                      placeholder="Jane Smith"
                      {...register("contactName")}
                      className={errors.contactName ? "border-red-500" : ""}
                    />
                    {errors.contactName && (
                      <p className="text-sm text-red-500">
                        {errors.contactName.message}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="jane@acmegreenco.com"
                        {...register("email")}
                        className={errors.email ? "border-red-500" : ""}
                      />
                      {errors.email && (
                        <p className="text-sm text-red-500">
                          {errors.email.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+1 (555) 000-0000"
                        {...register("phone")}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ── Step 3: Material Categories ──────────────────────── */}
            {step === 2 && (
              <Card className="shadow-sm">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-700/10 flex items-center justify-center">
                      <Package className="w-5 h-5 text-emerald-700" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">
                        Material Categories
                      </CardTitle>
                      <CardDescription>
                        Which sustainable materials do you supply? Select at least one category — required for your profile to appear in search results.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <CheckboxGroup
                    options={MATERIAL_CATEGORIES}
                    value={materialCategories}
                    onChange={(v) =>
                      setValue("materialCategories", v, {
                        shouldValidate: true,
                      })
                    }
                    error={errors.materialCategories?.message as string | undefined}
                  />
                </CardContent>
              </Card>
            )}

            {/* ── Step 4: Certifications ───────────────────────────── */}
            {step === 3 && (
              <Card className="shadow-sm">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-700/10 flex items-center justify-center">
                      <Award className="w-5 h-5 text-emerald-700" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Certifications</CardTitle>
                      <CardDescription>
                        Select sustainability certifications your products hold. These help architects find and trust your materials. If you have EPDs in EC3 or EPD International, you'll be able to link them to individual materials later.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <CheckboxGroup
                    options={CERTIFICATIONS}
                    value={certifications}
                    onChange={(v) => setValue("certifications", v)}
                  />
                  <p className="text-sm font-medium text-muted-foreground mt-3">
                    Certifications are optional — you can add them later.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* ── Step 5: Review & Submit ──────────────────────────── */}
            {step === 4 && (
              <Card className="shadow-sm">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-700/10 flex items-center justify-center">
                      <ClipboardCheck className="w-5 h-5 text-emerald-700" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">
                        Review & Submit
                      </CardTitle>
                      <CardDescription>
                        Verify your information before submitting.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Company Info Summary */}
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-sm text-emerald-700 flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        Company Info
                      </h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-emerald-700 h-8"
                        onClick={() => setStep(0)}
                      >
                        <Pencil className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                    </div>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      <div>
                        <dt className="text-muted-foreground">Company</dt>
                        <dd className="font-medium">
                          {allValues.companyName || "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Website</dt>
                        <dd className="font-medium">
                          {allValues.website || "—"}
                        </dd>
                      </div>
                      {allValues.description && (
                        <div className="sm:col-span-2">
                          <dt className="text-muted-foreground">Description</dt>
                          <dd className="font-medium">
                            {allValues.description}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>

                  {/* Contact Summary */}
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-sm text-emerald-700 flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Contact
                      </h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-emerald-700 h-8"
                        onClick={() => setStep(1)}
                      >
                        <Pencil className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                    </div>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      <div>
                        <dt className="text-muted-foreground">Name</dt>
                        <dd className="font-medium">
                          {allValues.contactName || "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Email</dt>
                        <dd className="font-medium">
                          {allValues.email || "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Phone</dt>
                        <dd className="font-medium">
                          {allValues.phone || "—"}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  {/* Materials Summary */}
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-sm text-emerald-700 flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        Material Categories
                      </h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-emerald-700 h-8"
                        onClick={() => setStep(2)}
                      >
                        <Pencil className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {materialCategories.length > 0 ? (
                        materialCategories.map((cat) => (
                          <span
                            key={cat}
                            className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-700/10 text-emerald-700"
                          >
                            {cat}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          None selected
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Certifications Summary */}
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-sm text-emerald-700 flex items-center gap-2">
                        <Award className="w-4 h-4" />
                        Certifications
                      </h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-emerald-700 h-8"
                        onClick={() => setStep(3)}
                      >
                        <Pencil className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {certifications.length > 0 ? (
                        certifications.map((cert) => (
                          <span
                            key={cert}
                            className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700"
                          >
                            {cert}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          None selected
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ── Navigation Buttons ──────────────────────────────── */}
            <div className="flex gap-3 mt-6">
              {step > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 border-2 border-emerald-700 text-emerald-700 hover:bg-emerald-700/10 font-semibold"
                  onClick={prevStep}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
              )}
              {step < STEPS.length - 1 && (
                <Button
                  type="button"
                  className={`flex-1 bg-emerald-700 hover:bg-emerald-800 text-white ${
                    step === 0 ? "w-full" : ""
                  }`}
                  onClick={nextStep}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              )}
              {step === STEPS.length - 1 && (
                <Button
                  type="submit"
                  className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white"
                  disabled={submitOnboarding.isPending}
                >
                  {submitOnboarding.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting…
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Submit Application
                    </>
                  )}
                </Button>
              )}
            </div>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}
