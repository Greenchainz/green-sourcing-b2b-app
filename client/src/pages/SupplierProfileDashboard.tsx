import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Building2, Upload, Package, Zap, Save, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

const MATERIAL_TYPES = [
  { id: "concrete", label: "Concrete & Masonry" },
  { id: "steel", label: "Steel & Metal" },
  { id: "wood", label: "Wood & Lumber" },
  { id: "insulation", label: "Insulation" },
  { id: "roofing", label: "Roofing" },
  { id: "flooring", label: "Flooring" },
  { id: "glazing", label: "Glazing & Windows" },
  { id: "hvac", label: "HVAC Systems" },
  { id: "electrical", label: "Electrical" },
  { id: "plumbing", label: "Plumbing" },
  { id: "finishes", label: "Interior Finishes" },
  { id: "doors", label: "Doors & Hardware" },
];

const CERTIFICATIONS = [
  { id: "leed", label: "LEED Certified" },
  { id: "epd", label: "EPD (Environmental Product Declaration)" },
  { id: "cradle2cradle", label: "Cradle to Cradle" },
  { id: "fsc", label: "FSC Certified" },
  { id: "greenguard", label: "Greenguard Certified" },
  { id: "iso14001", label: "ISO 14001" },
];

interface ProfileFormData {
  companyName: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  materialTypes: string[];
  certifications: string[];
}

export function SupplierProfileDashboard() {
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [formData, setFormData] = useState<ProfileFormData>({
    companyName: "",
    email: "",
    phone: "",
    website: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    country: "",
    materialTypes: [],
    certifications: [],
  });

  const getProfile = trpc.supplier.getProfile.useQuery(
    undefined,
    { enabled: !!user?.id }
  );

  const updateProfile = trpc.supplier.updateProfile.useMutation();

  // Load profile data when available
  React.useEffect(() => {
    if (getProfile.data) {
      const profile = getProfile.data;
      setFormData({
        companyName: profile.companyName || "",
        email: profile.email || "",
        phone: profile.phone || "",
        website: profile.website || "",
        address: profile.address || "",
        city: profile.city || "",
        state: profile.state || "",
        zipCode: profile.zipCode || "",
        country: profile.country || "",
        materialTypes: [],
        certifications: [],
      });
      if (profile.logoUrl) {
        setLogoPreview(profile.logoUrl);
      }
    }
  }, [getProfile.data]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleMaterialTypeChange = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      materialTypes: prev.materialTypes.includes(id)
        ? prev.materialTypes.filter((t) => t !== id)
        : [...prev.materialTypes, id],
    }));
  };

  const handleCertificationChange = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      certifications: prev.certifications.includes(id)
        ? prev.certifications.filter((c) => c !== id)
        : [...prev.certifications, id],
    }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Logo must be less than 5MB");
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setLogoPreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
    if (!formData.companyName || !formData.email) {
      toast.error("Please fill in required fields");
      return;
    }

    setIsSaving(true);
    try {
      await updateProfile.mutateAsync({
        companyName: formData.companyName,
        email: formData.email,
        phone: formData.phone,
        website: formData.website || undefined,
        address: formData.address || undefined,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode,
        country: formData.country,
      });
      toast.success("Profile updated successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  if (getProfile.isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="pt-12 pb-8 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-green-600" />
              <p className="text-gray-600">Loading your profile...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Supplier Profile</h1>
          <p className="text-lg text-gray-600">Manage your company information and preferences</p>
        </div>

        {/* Profile Tabs */}
        <Tabs defaultValue="company" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="company" className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              <span className="hidden sm:inline">Company</span>
            </TabsTrigger>
            <TabsTrigger value="logo" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Logo</span>
            </TabsTrigger>
            <TabsTrigger value="materials" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              <span className="hidden sm:inline">Materials</span>
            </TabsTrigger>
            <TabsTrigger value="subscription" className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              <span className="hidden sm:inline">Plan</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Company Information */}
          <TabsContent value="company">
            <Card>
              <CardHeader>
                <CardTitle>Company Information</CardTitle>
                <CardDescription>Update your company details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="companyName">Company Name *</Label>
                    <Input
                      id="companyName"
                      name="companyName"
                      value={formData.companyName}
                      onChange={handleInputChange}
                      placeholder="Your company name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="contact@company.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      name="website"
                      type="url"
                      value={formData.website}
                      onChange={handleInputChange}
                      placeholder="https://company.com"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="address">Street Address</Label>
                  <Input
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="123 Business St"
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      placeholder="Portland"
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      name="state"
                      value={formData.state}
                      onChange={handleInputChange}
                      placeholder="OR"
                    />
                  </div>
                  <div>
                    <Label htmlFor="zipCode">ZIP Code</Label>
                    <Input
                      id="zipCode"
                      name="zipCode"
                      value={formData.zipCode}
                      onChange={handleInputChange}
                      placeholder="97201"
                    />
                  </div>
                  <div>
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      name="country"
                      value={formData.country}
                      onChange={handleInputChange}
                      placeholder="USA"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="gap-2 bg-green-600 hover:bg-green-700"
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

          {/* Tab 2: Logo Upload */}
          <TabsContent value="logo">
            <Card>
              <CardHeader>
                <CardTitle>Company Logo</CardTitle>
                <CardDescription>Upload your company logo (max 5MB)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  {logoPreview ? (
                    <div className="space-y-4">
                      <img
                        src={logoPreview}
                        alt="Logo preview"
                        className="w-32 h-32 object-contain mx-auto"
                      />
                      <div>
                        <p className="text-sm text-gray-600 mb-2">Current logo</p>
                        <Button
                          variant="outline"
                          onClick={() => document.getElementById("logoInput")?.click()}
                        >
                          Change Logo
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="cursor-pointer"
                      onClick={() => document.getElementById("logoInput")?.click()}
                    >
                      <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600 font-medium mb-1">Click to upload logo</p>
                      <p className="text-sm text-gray-500">PNG, JPG, or GIF (max 5MB)</p>
                    </div>
                  )}
                  <input
                    id="logoInput"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </div>

                {logoFile && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <span className="text-sm text-green-700">
                      Logo ready to upload: {logoFile.name}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 3: Materials & Certifications */}
          <TabsContent value="materials">
            <Card>
              <CardHeader>
                <CardTitle>Materials & Certifications</CardTitle>
                <CardDescription>Select the materials you supply and certifications you hold</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label className="text-base font-semibold mb-3 block">Material Types</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {MATERIAL_TYPES.map((material) => (
                      <div key={material.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={material.id}
                          checked={formData.materialTypes.includes(material.id)}
                          onCheckedChange={() => handleMaterialTypeChange(material.id)}
                        />
                        <Label htmlFor={material.id} className="font-normal cursor-pointer">
                          {material.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-base font-semibold mb-3 block">Certifications</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {CERTIFICATIONS.map((cert) => (
                      <div key={cert.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={cert.id}
                          checked={formData.certifications.includes(cert.id)}
                          onCheckedChange={() => handleCertificationChange(cert.id)}
                        />
                        <Label htmlFor={cert.id} className="font-normal cursor-pointer">
                          {cert.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="gap-2 bg-green-600 hover:bg-green-700"
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

          {/* Tab 4: Subscription & Billing */}
          <TabsContent value="subscription">
            <Card>
              <CardHeader>
                <CardTitle>Subscription & Billing</CardTitle>
                <CardDescription>Manage your subscription plan</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Free Plan */}
                  <div className="border border-gray-200 rounded-lg p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">Free Plan</h3>
                        <p className="text-2xl font-bold mt-2">$0<span className="text-sm text-gray-600">/month</span></p>
                      </div>
                      {!getProfile.data?.isPremium && (
                        <Badge className="bg-green-100 text-green-800">Current</Badge>
                      )}
                    </div>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        Access to RFQ marketplace
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        Basic bid management
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        Real-time messaging
                      </li>
                    </ul>
                  </div>

                  {/* Premium Plan */}
                  <div className="border-2 border-green-300 rounded-lg p-6 bg-green-50">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">Premium Plan</h3>
                        <p className="text-2xl font-bold mt-2">$99<span className="text-sm text-gray-600">/month</span></p>
                      </div>
                      {getProfile.data?.isPremium && (
                        <Badge className="bg-green-600 text-white">Current</Badge>
                      )}
                    </div>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        Everything in Free
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        Priority RFQ matching
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        Advanced analytics
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        Dedicated support
                      </li>
                    </ul>
                    {!getProfile.data?.isPremium && (
                      <Button className="w-full mt-4 bg-green-600 hover:bg-green-700">
                        Upgrade to Premium
                      </Button>
                    )}
                  </div>
                </div>

                {getProfile.data?.isPremium && getProfile.data?.premiumExpiresAt && (
                  <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-blue-900">Premium expires on</p>
                      <p className="text-sm text-blue-700">
                        {new Date(getProfile.data.premiumExpiresAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
