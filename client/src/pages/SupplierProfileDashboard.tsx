import { useState, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { format } from "date-fns";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Building2,
  Package,
  Award,
  Settings,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Shield,
  Star,
  CalendarDays,
  MapPin,
  Truck,
  Info,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const MATERIAL_CATEGORIES = [
  { id: "Concrete", label: "Concrete & Masonry" },
  { id: "Steel", label: "Steel & Metal" },
  { id: "Timber", label: "Timber & Lumber" },
  { id: "Glass", label: "Glass & Glazing" },
  { id: "Insulation", label: "Insulation" },
  { id: "Roofing", label: "Roofing" },
  { id: "Flooring", label: "Flooring" },
  { id: "Cladding", label: "Cladding & Facades" },
  { id: "MEP", label: "MEP (Mechanical, Electrical, Plumbing)" },
  { id: "Other", label: "Other Materials" },
];

const CERTIFICATIONS = [
  { id: "LEED", label: "LEED Certified" },
  { id: "EPD", label: "EPD (Environmental Product Declaration)" },
  { id: "FSC", label: "FSC Certified" },
  { id: "GreenGuard", label: "GreenGuard Certified" },
  { id: "Cradle to Cradle", label: "Cradle to Cradle" },
  { id: "Living Building Challenge", label: "Living Building Challenge" },
  { id: "ISO 14001", label: "ISO 14001" },
  { id: "Other", label: "Other" },
];

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY",
] as const;

type USState = typeof US_STATES[number];

const SERVICE_RADIUS_OPTIONS = [
  { value: 50,  label: "50 miles — very local" },
  { value: 100, label: "100 miles" },
  { value: 250, label: "250 miles" },
  { value: 500, label: "500 miles — regional" },
] as const;

interface ProfileFormState {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  website: string;
  description: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  materialCategories: string[];
  certifications: string[];
  // ── Service area ──────────────────────────────────────────
  shipsNationwide: boolean;
  serviceRadiusMiles: number | null;
  statesServed: string[] | null;
  minOrderQuantity: number | null;
  maxOrderQuantity: number | null;
}

export function SupplierProfileDashboard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("company");

  const [form, setForm] = useState<ProfileFormState>({
    companyName: "",
    contactName: "",
    email: "",
    phone: "",
    website: "",
    description: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    country: "",
    materialCategories: [],
    certifications: [],
    shipsNationwide: false,
    serviceRadiusMiles: null,
    statesServed: null,
    minOrderQuantity: null,
    maxOrderQuantity: null,
  });

  const profile = trpc.supplierOnboarding.getMyProfile.useQuery(undefined, {
    enabled: !!user,
  });

  const updateProfile = trpc.supplierOnboarding.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Profile updated successfully!");
      profile.refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update profile");
    },
  });

  // Redirect to onboarding if no profile
  useEffect(() => {
    if (profile.data === null && !profile.isLoading) {
      navigate("/supplier/onboarding");
    }
  }, [profile.data, profile.isLoading, navigate]);

  // Load profile into form
  useEffect(() => {
    if (profile.data) {
      const p = profile.data;
      setForm({
        companyName: p.companyName || "",
        contactName: p.contactName || "",
        email: p.email || "",
        phone: p.phone || "",
        website: p.website || "",
        description: p.description || "",
        address: p.address || "",
        city: p.city || "",
        state: p.state || "",
        zipCode: p.zipCode || "",
        country: p.country || "",
        materialCategories: Array.isArray(p.materialCategories) ? p.materialCategories : [],
        certifications: Array.isArray(p.certifications) ? p.certifications : [],
        shipsNationwide: p.shipsNationwide ?? false,
        serviceRadiusMiles: p.serviceRadiusMiles ?? null,
        statesServed: Array.isArray(p.statesServed) ? p.statesServed : null,
        minOrderQuantity: p.minOrderQuantity != null ? Number(p.minOrderQuantity) : null,
        maxOrderQuantity: p.maxOrderQuantity != null ? Number(p.maxOrderQuantity) : null,
      });
    }
  }, [profile.data]);

  // Profile completeness calculation
  const completeness = useMemo(() => {
    if (!profile.data) return 0;
    const fields = [
      profile.data.companyName,
      profile.data.contactName,
      profile.data.email,
      profile.data.phone,
      profile.data.website,
      profile.data.description,
      profile.data.address || profile.data.location,
      profile.data.city,
      profile.data.state,
      profile.data.materialCategories && (Array.isArray(profile.data.materialCategories) ? profile.data.materialCategories : []).length > 0,
      profile.data.certifications && (Array.isArray(profile.data.certifications) ? profile.data.certifications : []).length > 0,
    ];
    const filled = fields.filter(Boolean).length;
    return Math.round((filled / fields.length) * 100);
  }, [profile.data]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const toggleMaterialCategory = (id: string) => {
    setForm((prev) => ({
      ...prev,
      materialCategories: prev.materialCategories.includes(id)
        ? prev.materialCategories.filter((c) => c !== id)
        : [...prev.materialCategories, id],
    }));
  };

  const toggleCertification = (id: string) => {
    setForm((prev) => ({
      ...prev,
      certifications: prev.certifications.includes(id)
        ? prev.certifications.filter((c) => c !== id)
        : [...prev.certifications, id],
    }));
  };

  const handleSave = async () => {
    if (!form.companyName.trim()) {
      toast.error("Company name is required");
      return;
    }

    setIsSaving(true);
    try {
      await updateProfile.mutateAsync({
        companyName: form.companyName,
        contactName: form.contactName || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
        website: form.website || undefined,
        description: form.description || undefined,
        materialCategories: form.materialCategories,
        certifications: form.certifications,
        // ── Location — always persist so RFQ routing stays accurate ──────────
        city: form.city || undefined,
        state: (form.state as USState) || undefined,
        zipCode: form.zipCode || undefined,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveServiceArea = async () => {
    setIsSaving(true);
    try {
      await updateProfile.mutateAsync({
        city: form.city || undefined,
        state: (form.state as USState) || undefined,
        zipCode: form.zipCode || undefined,
        shipsNationwide: form.shipsNationwide,
        serviceRadiusMiles: form.serviceRadiusMiles,
        statesServed: form.statesServed as USState[] | null | undefined,
        minOrderQuantity: form.minOrderQuantity,
        maxOrderQuantity: form.maxOrderQuantity,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getVerificationBadge = (status: string | undefined | null) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-300 gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Verified
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-100 text-red-800 border-red-300 gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300 gap-1">
            <Clock className="w-3.5 h-3.5" />
            Pending Verification
          </Badge>
        );
    }
  };

  // Loading state
  if (profile.isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-10 h-10 animate-spin text-[#2D6A4F] mx-auto mb-4" />
            <p className="text-gray-600">Loading your profile...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // If no profile, the redirect will fire. Show nothing in the meantime.
  if (!profile.data) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-10 h-10 animate-spin text-[#2D6A4F] mx-auto mb-4" />
            <p className="text-gray-600">Redirecting to onboarding...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Page Header */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Supplier Profile
                </h1>
                <p className="text-gray-600 mt-1">
                  Manage your company information and preferences
                </p>
              </div>
              {getVerificationBadge(profile.data.verificationStatus)}
            </div>
          </div>

          {/* ── Pending verification banner — shown until admin approves ──────── */}
          {profile.data.verificationStatus === "pending" && (
            <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 flex gap-3">
              <div className="mt-0.5">
                <Info className="w-5 h-5 text-amber-600 shrink-0" />
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-900">
                  Your profile is under review
                </p>
                <p className="text-sm text-amber-800 mt-0.5">
                  GreenChainz will verify your sustainability credentials and activate your profile — typically within 1–2 business days. You've already received a confirmation email. While you wait, complete your profile below to improve your match quality once you go live.
                </p>
              </div>
            </div>
          )}

          {profile.data.verificationStatus === "rejected" && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-900">Verification not approved</p>
                <p className="text-sm text-red-800 mt-0.5">
                  Please reach out to <a href="mailto:support@greenchainz.com" className="underline">support@greenchainz.com</a> so we can help you get verified.
                </p>
              </div>
            </div>
          )}

          {/* Profile Completeness */}
          <Card className="mb-6 border-[#2D6A4F]/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Profile Completeness
                </span>
                <span className="text-sm font-semibold text-[#2D6A4F]">
                  {completeness}%
                </span>
              </div>
              <Progress value={completeness} className="h-2.5" />
              {completeness < 100 && (
                <p className="text-xs text-gray-500 mt-2">
                  Complete your profile to improve visibility and RFQ match quality
                </p>
              )}
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 sm:grid-cols-5 mb-6">
              <TabsTrigger
                value="company"
                className="data-[state=active]:bg-[#2D6A4F] data-[state=active]:text-white gap-1.5"
              >
                <Building2 className="w-4 h-4" />
                <span className="hidden sm:inline">Company</span>
              </TabsTrigger>
              <TabsTrigger
                value="materials"
                className="data-[state=active]:bg-[#2D6A4F] data-[state=active]:text-white gap-1.5"
              >
                <Package className="w-4 h-4" />
                <span className="hidden sm:inline">Materials</span>
              </TabsTrigger>
              <TabsTrigger
                value="certifications"
                className="data-[state=active]:bg-[#2D6A4F] data-[state=active]:text-white gap-1.5"
              >
                <Award className="w-4 h-4" />
                <span className="hidden sm:inline">Certs</span>
              </TabsTrigger>
              <TabsTrigger
                value="service-area"
                className="data-[state=active]:bg-[#2D6A4F] data-[state=active]:text-white gap-1.5"
              >
                <MapPin className="w-4 h-4" />
                <span className="hidden sm:inline">Service Area</span>
              </TabsTrigger>
              <TabsTrigger
                value="account"
                className="data-[state=active]:bg-[#2D6A4F] data-[state=active]:text-white gap-1.5"
              >
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Account</span>
              </TabsTrigger>
            </TabsList>

            {/* ===== Company Info Tab ===== */}
            <TabsContent value="company">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-[#2D6A4F]" />
                    Company Information
                  </CardTitle>
                  <CardDescription>
                    Update your company details and contact information
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="companyName">Company Name *</Label>
                      <Input
                        id="companyName"
                        name="companyName"
                        value={form.companyName}
                        onChange={handleInputChange}
                        placeholder="Your company name"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="contactName">Contact Name</Label>
                      <Input
                        id="contactName"
                        name="contactName"
                        value={form.contactName}
                        onChange={handleInputChange}
                        placeholder="Primary contact"
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={form.email}
                        onChange={handleInputChange}
                        placeholder="contact@company.com"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        name="phone"
                        value={form.phone}
                        onChange={handleInputChange}
                        placeholder="+1 (555) 000-0000"
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      name="website"
                      type="url"
                      value={form.website}
                      onChange={handleInputChange}
                      placeholder="https://company.com"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Company Description</Label>
                    <Textarea
                      id="description"
                      name="description"
                      value={form.description}
                      onChange={handleInputChange}
                      placeholder="Tell architects about your company, specialties, and experience..."
                      rows={4}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="address">Street Address</Label>
                    <Input
                      id="address"
                      name="address"
                      value={form.address}
                      onChange={handleInputChange}
                      placeholder="123 Business St"
                      className="mt-1"
                    />
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        name="city"
                        value={form.city}
                        onChange={handleInputChange}
                        placeholder="Portland"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="state">State</Label>
                      <Select
                        value={form.state}
                        onValueChange={(v) => setForm((prev) => ({ ...prev, state: v }))}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select state" />
                        </SelectTrigger>
                        <SelectContent>
                          {US_STATES.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="zipCode">ZIP Code</Label>
                      <Input
                        id="zipCode"
                        name="zipCode"
                        value={form.zipCode}
                        onChange={handleInputChange}
                        placeholder="97201"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="country">Country</Label>
                      <Input
                        id="country"
                        name="country"
                        value={form.country}
                        onChange={handleInputChange}
                        placeholder="USA"
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-[#2D6A4F] hover:bg-[#245a42] text-white gap-2"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ===== Material Categories Tab ===== */}
            <TabsContent value="materials">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-[#2D6A4F]" />
                    Material Categories
                  </CardTitle>
                  <CardDescription>
                    Select the material categories your company supplies. This
                    helps us match you with relevant RFQs.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                    {MATERIAL_CATEGORIES.map((cat) => (
                      <label
                        key={cat.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          form.materialCategories.includes(cat.id)
                            ? "border-[#2D6A4F] bg-[#2D6A4F]/5"
                            : "border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        <Checkbox
                          checked={form.materialCategories.includes(cat.id)}
                          onCheckedChange={() => toggleMaterialCategory(cat.id)}
                        />
                        <span className="text-sm font-medium text-gray-700">
                          {cat.label}
                        </span>
                      </label>
                    ))}
                  </div>

                  {form.materialCategories.length > 0 && (
                    <p className="text-sm text-gray-500 mb-4">
                      {form.materialCategories.length} categor
                      {form.materialCategories.length === 1 ? "y" : "ies"}{" "}
                      selected
                    </p>
                  )}

                  <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-[#2D6A4F] hover:bg-[#245a42] text-white gap-2"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Save Categories
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ===== Certifications Tab ===== */}
            <TabsContent value="certifications">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-[#2D6A4F]" />
                    Certifications
                  </CardTitle>
                  <CardDescription>
                    Select the sustainability certifications your company holds.
                    Certified suppliers rank higher in search results.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                    {CERTIFICATIONS.map((cert) => (
                      <label
                        key={cert.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          form.certifications.includes(cert.id)
                            ? "border-[#2D6A4F] bg-[#2D6A4F]/5"
                            : "border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        <Checkbox
                          checked={form.certifications.includes(cert.id)}
                          onCheckedChange={() => toggleCertification(cert.id)}
                        />
                        <span className="text-sm font-medium text-gray-700">
                          {cert.label}
                        </span>
                      </label>
                    ))}
                  </div>

                  {form.certifications.length > 0 && (
                    <p className="text-sm text-gray-500 mb-4">
                      {form.certifications.length} certification
                      {form.certifications.length === 1 ? "" : "s"} selected
                    </p>
                  )}

                  <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-[#2D6A4F] hover:bg-[#245a42] text-white gap-2"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Save Certifications
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ===== Service Area Tab ===== */}
            <TabsContent value="service-area">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-[#2D6A4F]" />
                    Service Area & Delivery
                  </CardTitle>
                  <CardDescription>
                    GreenChainz uses this to route RFQs to you. Keep it accurate — wrong or missing location = missed bids.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Facility location */}
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-gray-700">Facility location</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">City</label>
                        <input
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          placeholder="e.g. Charlotte"
                          value={form.city}
                          onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">State</label>
                        <Select
                          value={form.state}
                          onValueChange={(v) => setForm((prev) => ({ ...prev, state: v }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select state" />
                          </SelectTrigger>
                          <SelectContent>
                            {US_STATES.map((s) => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">ZIP code</label>
                        <input
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          placeholder="e.g. 28202"
                          value={form.zipCode}
                          onChange={(e) => setForm((prev) => ({ ...prev, zipCode: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4" />

                  {/* Ships nationwide */}
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="shipsNationwide"
                      checked={form.shipsNationwide}
                      onChange={(e) => setForm((prev) => ({ ...prev, shipsNationwide: e.target.checked }))}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#2D6A4F] focus:ring-[#2D6A4F]"
                    />
                    <div>
                      <label htmlFor="shipsNationwide" className="text-sm font-medium cursor-pointer">
                        We ship / deliver nationwide
                      </label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Check this if you can serve projects anywhere in the US — typical for mass timber, specialty systems, and manufactured products.
                      </p>
                    </div>
                  </div>

                  {!form.shipsNationwide && (
                    <>
                      {/* Delivery radius */}
                      <div className="space-y-2">
                        <p className="text-sm font-medium flex items-center gap-1.5">
                          <Truck className="w-3.5 h-3.5 text-muted-foreground" />
                          Delivery radius
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {SERVICE_RADIUS_OPTIONS.map((opt) => {
                            const selected = form.serviceRadiusMiles === opt.value;
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() =>
                                  setForm((prev) => ({
                                    ...prev,
                                    serviceRadiusMiles: selected ? null : opt.value,
                                  }))
                                }
                                className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-colors ${
                                  selected
                                    ? "bg-[#2D6A4F] text-white border-[#2D6A4F]"
                                    : "border-border hover:border-[#2D6A4F]/50 hover:bg-[#2D6A4F]/5"
                                }`}
                              >
                                {opt.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* States served */}
                      <div className="space-y-2">
                        <p className="text-sm font-medium">States served</p>
                        <p className="text-xs text-muted-foreground">
                          Select states where you actively serve projects. Overrides the radius above for those states.
                        </p>
                        <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto rounded-lg border p-3">
                          {US_STATES.map((state) => {
                            const current = form.statesServed ?? [];
                            const selected = current.includes(state);
                            return (
                              <button
                                key={state}
                                type="button"
                                onClick={() => {
                                  const next = selected
                                    ? current.filter((s) => s !== state)
                                    : [...current, state];
                                  setForm((prev) => ({
                                    ...prev,
                                    statesServed: next.length > 0 ? next : null,
                                  }));
                                }}
                                className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                                  selected
                                    ? "bg-[#2D6A4F] text-white"
                                    : "bg-muted text-muted-foreground hover:bg-[#2D6A4F]/10"
                                }`}
                              >
                                {state}
                              </button>
                            );
                          })}
                        </div>
                        {(form.statesServed ?? []).length > 0 && (
                          <p className="text-xs text-[#2D6A4F]">
                            {(form.statesServed ?? []).length} state(s) selected
                          </p>
                        )}
                      </div>
                    </>
                  )}

                  {/* Order capacity */}
                  <div className="space-y-3">
                    <p className="text-sm font-medium">Typical order capacity (optional)</p>
                    <p className="text-xs text-muted-foreground">
                      Helps GreenChainz avoid routing RFQs that are too small or too large for your operation.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Minimum order</label>
                        <input
                          type="number"
                          placeholder="e.g. 500"
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          value={form.minOrderQuantity ?? ""}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              minOrderQuantity: e.target.value ? Number(e.target.value) : null,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Typical max order</label>
                        <input
                          type="number"
                          placeholder="e.g. 50000"
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          value={form.maxOrderQuantity ?? ""}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              maxOrderQuantity: e.target.value ? Number(e.target.value) : null,
                            }))
                          }
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">Units depend on your material type (SF, tons, LF, etc.).</p>
                  </div>

                  <Button
                    onClick={handleSaveServiceArea}
                    disabled={isSaving}
                    className="bg-[#2D6A4F] hover:bg-[#245a42] text-white gap-2"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Save Service Area
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ===== Account Tab ===== */}
            <TabsContent value="account">
              <div className="space-y-4">
                {/* Verification Status */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-[#2D6A4F]" />
                      Verification Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 p-4 rounded-lg bg-gray-50">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900">
                            Account Verification
                          </span>
                          {getVerificationBadge(
                            profile.data.verificationStatus
                          )}
                        </div>
                        <p className="text-sm text-gray-500">
                          {profile.data.verificationStatus === "approved"
                            ? "Your account has been verified. You have full access to all features."
                            : profile.data.verificationStatus === "rejected"
                              ? "Your verification was not approved. Please contact support for more information."
                              : "Your account is pending verification. You can still use the platform while we review your profile."}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Account Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="w-5 h-5 text-[#2D6A4F]" />
                      Account Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between py-3 border-b">
                        <div className="flex items-center gap-2 text-gray-600">
                          <CalendarDays className="w-4 h-4" />
                          <span className="text-sm">Account Created</span>
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {profile.data.createdAt
                            ? format(
                                new Date(profile.data.createdAt),
                                "MMMM d, yyyy"
                              )
                            : "N/A"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between py-3 border-b">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Star className="w-4 h-4" />
                          <span className="text-sm">Subscription</span>
                        </div>
                        <span>
                          {profile.data.isPremium ? (
                            <Badge className="bg-[#2D6A4F] text-white">
                              Premium
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Free Plan</Badge>
                          )}
                        </span>
                      </div>

                      <div className="flex items-center justify-between py-3 border-b">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Shield className="w-4 h-4" />
                          <span className="text-sm">Sustainability Score</span>
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {profile.data.sustainabilityScore != null
                            ? `${profile.data.sustainabilityScore}/100`
                            : "Not yet calculated"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between py-3">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Building2 className="w-4 h-4" />
                          <span className="text-sm">Company</span>
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {profile.data.companyName || "—"}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
}
