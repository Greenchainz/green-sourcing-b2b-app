import { useState } from "react";
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { Building2, Package, Award, CheckCircle } from "lucide-react";

// ── Constants ────────────────────────────────────────────────────────────────

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

// ── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  contactName: z.string().min(1, "Contact name is required"),
  email: z.string().email("Valid email required"),
  phone: z.string().optional(),
  website: z.string().url("Enter a valid URL (include https://)").optional().or(z.literal("")),
  description: z.string().optional(),
  materialCategories: z.array(z.string()).min(1, "Select at least one category"),
  certifications: z.array(z.string()).optional(),
});

type FormData = z.infer<typeof schema>;

// ── Step indicator ───────────────────────────────────────────────────────────

const STEPS = [
  { label: "Company Info", icon: Building2 },
  { label: "Materials", icon: Package },
  { label: "Certifications", icon: Award },
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
              className={`flex flex-col items-center gap-1 px-4 ${
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
                className={`h-0.5 w-12 sm:w-20 ${i < current ? "bg-green-500" : "bg-muted-foreground/20"}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Checkbox group ────────────────────────────────────────────────────────────

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
    onChange(value.includes(item) ? value.filter((x) => x !== item) : [...value, item]);

  return (
    <div>
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
      {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SupplierOnboarding() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);

  const submitOnboarding = trpc.supplierOnboarding.submitOnboarding.useMutation({
    onSuccess: () => {
      setDone(true);
      toast.success("Profile submitted! Our team will review it shortly.");
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
      companyName: "",
      contactName: user?.name ?? "",
      email: typeof user?.email === "string" ? user.email : "",
      phone: "",
      website: "",
      description: "",
      materialCategories: [],
      certifications: [],
    },
  });

  const materialCategories = watch("materialCategories") ?? [];
  const certifications = watch("certifications") ?? [];

  const nextStep = async () => {
    let fields: (keyof FormData)[] = [];
    if (step === 0) fields = ["companyName", "contactName", "email", "phone", "website", "description"];
    if (step === 1) fields = ["materialCategories"];
    const ok = await trigger(fields);
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
            <h2 className="text-2xl font-bold">Application Submitted!</h2>
            <p className="text-muted-foreground mt-2 max-w-sm">
              Thanks for joining GreenChainz. Our team will review your profile and verify your
              sustainability credentials — usually within 2 business days.
            </p>
          </div>
          <Button className="bg-green-600 hover:bg-green-700" onClick={() => navigate("/supplier/dashboard")}>
            Go to Dashboard
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
          <h1 className="text-3xl font-bold">Supplier Onboarding</h1>
          <p className="text-muted-foreground mt-1">
            Join GreenChainz as a verified sustainable materials supplier.
          </p>
        </div>

        <StepIndicator current={step} />

        <form onSubmit={handleSubmit(onSubmit)}>
          {/* ── Step 1: Company Info ─────────────────────────────────── */}
          {step === 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Company Information</CardTitle>
                <CardDescription>Tell architects who you are.</CardDescription>
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
                    <p className="text-sm text-red-500">{errors.companyName.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="contactName">Contact Name *</Label>
                  <Input
                    id="contactName"
                    placeholder="Jane Smith"
                    {...register("contactName")}
                    className={errors.contactName ? "border-red-500" : ""}
                  />
                  {errors.contactName && (
                    <p className="text-sm text-red-500">{errors.contactName.message}</p>
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
                      <p className="text-sm text-red-500">{errors.email.message}</p>
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
                    <p className="text-sm text-red-500">{errors.website.message}</p>
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

                <Button type="button" className="w-full bg-green-600 hover:bg-green-700" onClick={nextStep}>
                  Next: Material Categories
                </Button>
              </CardContent>
            </Card>
          )}

          {/* ── Step 2: Material Categories ──────────────────────────── */}
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Material Categories</CardTitle>
                <CardDescription>
                  Which sustainable materials do you supply? Select all that apply.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <CheckboxGroup
                  options={MATERIAL_CATEGORIES}
                  value={materialCategories}
                  onChange={(v) => setValue("materialCategories", v, { shouldValidate: true })}
                  error={errors.materialCategories?.message as string | undefined}
                />

                <div className="flex gap-3">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(0)}>
                    Back
                  </Button>
                  <Button type="button" className="flex-1 bg-green-600 hover:bg-green-700" onClick={nextStep}>
                    Next: Certifications
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Step 3: Certifications + Submit ──────────────────────── */}
          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Certifications</CardTitle>
                <CardDescription>
                  Select any sustainability certifications your products hold. These help architects
                  filter and trust your materials.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <CheckboxGroup
                  options={CERTIFICATIONS}
                  value={certifications}
                  onChange={(v) => setValue("certifications", v)}
                />

                <div className="flex gap-3">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(1)}>
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
                        Submitting…
                      </>
                    ) : (
                      "Submit Application"
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
