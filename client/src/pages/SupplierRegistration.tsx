import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Building2, MapPin, Package, Zap, CheckCircle2, ArrowRight, ArrowLeft } from "lucide-react";

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

interface RegistrationFormData {
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
  tier: "free" | "premium";
}

export function SupplierRegistration() {
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [formData, setFormData] = useState<RegistrationFormData>({
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
    tier: "free",
  });

  const registerSupplier = trpc.supplier.register.useMutation();

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

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(formData.companyName && formData.email && formData.phone);
      case 2:
        return !!(formData.address && formData.city && formData.state && formData.zipCode && formData.country);
      case 3:
        return formData.materialTypes.length > 0;
      case 4:
        return !!formData.tier;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 4) {
        setCurrentStep(currentStep + 1);
      }
    } else {
      toast.error("Please fill in all required fields");
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(4)) {
      toast.error("Please select a subscription tier");
      return;
    }

    setIsLoading(true);
    try {
      await registerSupplier.mutateAsync({
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
      setShowSuccess(true);
      setTimeout(() => {
        setLocation("/supplier/dashboard");
      }, 2000);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-12 pb-8">
            <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Welcome to GreenChainz!</h2>
            <p className="text-gray-600 mb-6">Your supplier profile has been created successfully.</p>
            <p className="text-sm text-gray-500">Redirecting to your dashboard...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Become a GreenChainz Supplier</h1>
          <p className="text-lg text-gray-600">Join our network of verified sustainable material suppliers</p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex justify-between mb-4">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex flex-col items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold mb-2 transition-all ${
                    step <= currentStep
                      ? "bg-green-600 text-white"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {step}
                </div>
                <span className="text-xs text-gray-600 text-center">
                  {step === 1 && "Company"}
                  {step === 2 && "Location"}
                  {step === 3 && "Materials"}
                  {step === 4 && "Plan"}
                </span>
              </div>
            ))}
          </div>
          <div className="h-1 bg-gray-200 rounded-full">
            <div
              className="h-1 bg-green-600 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / 4) * 100}%` }}
            />
          </div>
        </div>

        {/* Form Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {currentStep === 1 && <Building2 className="w-5 h-5" />}
              {currentStep === 2 && <MapPin className="w-5 h-5" />}
              {currentStep === 3 && <Package className="w-5 h-5" />}
              {currentStep === 4 && <Zap className="w-5 h-5" />}
              {currentStep === 1 && "Company Information"}
              {currentStep === 2 && "Location Details"}
              {currentStep === 3 && "Materials & Certifications"}
              {currentStep === 4 && "Choose Your Plan"}
            </CardTitle>
            <CardDescription>
              {currentStep === 1 && "Tell us about your company"}
              {currentStep === 2 && "Where is your business located?"}
              {currentStep === 3 && "What materials do you supply?"}
              {currentStep === 4 && "Select a subscription plan"}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {/* Step 1: Company Information */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="companyName">Company Name *</Label>
                  <Input
                    id="companyName"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleInputChange}
                    placeholder="e.g., EcoMaterials Inc"
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
                <div>
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
                <div>
                  <Label htmlFor="website">Website (Optional)</Label>
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
            )}

            {/* Step 2: Location */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="address">Street Address *</Label>
                  <Input
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="123 Business St"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      placeholder="Portland"
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">State/Province *</Label>
                    <Input
                      id="state"
                      name="state"
                      value={formData.state}
                      onChange={handleInputChange}
                      placeholder="OR"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="zipCode">ZIP/Postal Code *</Label>
                    <Input
                      id="zipCode"
                      name="zipCode"
                      value={formData.zipCode}
                      onChange={handleInputChange}
                      placeholder="97201"
                    />
                  </div>
                  <div>
                    <Label htmlFor="country">Country *</Label>
                    <Input
                      id="country"
                      name="country"
                      value={formData.country}
                      onChange={handleInputChange}
                      placeholder="USA"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Materials & Certifications */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <Label className="text-base font-semibold mb-3 block">Material Types *</Label>
                  <div className="grid grid-cols-2 gap-3">
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
                  <Label className="text-base font-semibold mb-3 block">Certifications (Optional)</Label>
                  <div className="grid grid-cols-2 gap-3">
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
              </div>
            )}

            {/* Step 4: Subscription Tier */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <RadioGroup value={formData.tier} onValueChange={(value) => setFormData((prev) => ({ ...prev, tier: value as "free" | "premium" }))}>
                  {/* Free Tier */}
                  <div className="relative">
                    <div className="flex items-start space-x-3 p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-green-300 transition-colors" onClick={() => setFormData((prev) => ({ ...prev, tier: "free" }))}>
                      <RadioGroupItem value="free" id="free" className="mt-1" />
                      <div className="flex-1">
                        <Label htmlFor="free" className="text-lg font-semibold cursor-pointer">
                          Free Plan
                        </Label>
                        <p className="text-sm text-gray-600 mt-1">Perfect for getting started</p>
                        <ul className="mt-3 space-y-2 text-sm">
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
                      <div className="text-right">
                        <p className="text-2xl font-bold">$0</p>
                        <p className="text-xs text-gray-600">forever</p>
                      </div>
                    </div>
                  </div>

                  {/* Premium Tier */}
                  <div className="relative">
                    <div className="absolute -top-3 right-4 bg-green-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                      Recommended
                    </div>
                    <div className="flex items-start space-x-3 p-4 border-2 border-green-300 rounded-lg cursor-pointer hover:border-green-500 transition-colors bg-green-50" onClick={() => setFormData((prev) => ({ ...prev, tier: "premium" }))}>
                      <RadioGroupItem value="premium" id="premium" className="mt-1" />
                      <div className="flex-1">
                        <Label htmlFor="premium" className="text-lg font-semibold cursor-pointer">
                          Premium Plan
                        </Label>
                        <p className="text-sm text-gray-600 mt-1">For growing suppliers</p>
                        <ul className="mt-3 space-y-2 text-sm">
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
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">$99</p>
                        <p className="text-xs text-gray-600">/month</p>
                      </div>
                    </div>
                  </div>
                </RadioGroup>
              </div>
            )}
          </CardContent>

          {/* Navigation Buttons */}
          <div className="px-6 py-4 border-t flex justify-between gap-3">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Previous
            </Button>

            {currentStep < 4 ? (
              <Button onClick={handleNext} className="gap-2 bg-green-600 hover:bg-green-700">
                Next
                <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isLoading}
                className="gap-2 bg-green-600 hover:bg-green-700"
              >
                {isLoading ? "Creating Profile..." : "Create Profile"}
              </Button>
            )}
          </div>
        </Card>

        {/* Footer */}
        <p className="text-center text-sm text-gray-600 mt-6">
          Already a supplier?{" "}
          <button
            onClick={() => setLocation("/sign-in")}
            className="text-green-600 hover:text-green-700 font-semibold"
          >
            Sign in here
          </button>
        </p>
      </div>
    </div>
  );
}
