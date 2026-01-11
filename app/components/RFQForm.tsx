"use client";

import { useState } from "react";
import LocationAutocomplete from "./LocationAutocomplete";
import {
  FileText,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";

interface RFQFormData {
  project_name: string;
  project_location: string;
  project_timeline: string;
  material_type: string;
  quantity: string;
  specifications: string;
  certifications_required: string[];
  budget_range: string;
  deadline: string;
}

const CERTIFICATION_OPTIONS = [
  "LEED",
  "EPD",
  "FSC",
  "Cradle to Cradle",
  "Living Building Challenge",
  "Green Globes",
  "WELL Building Standard",
  "BREEAM",
];

const BUDGET_RANGES = [
  "Under $10,000",
  "$10,000 - $50,000",
  "$50,000 - $100,000",
  "$100,000 - $500,000",
  "$500,000+",
  "Prefer not to say",
];

const TIMELINE_OPTIONS = [
  "Urgent (1-2 weeks)",
  "Standard (3-4 weeks)",
  "Flexible (1-2 months)",
  "Long-term (3+ months)",
];

export default function RFQForm() {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState<RFQFormData>({
    project_name: "",
    project_location: "",
    project_timeline: "",
    material_type: "",
    quantity: "",
    specifications: "",
    certifications_required: [],
    budget_range: "",
    deadline: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateField = (field: keyof RFQFormData, value: any) => {
    setFormData({ ...formData, [field]: value });
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors({ ...errors, [field]: "" });
    }
  };

  const toggleCertification = (cert: string) => {
    const current = formData.certifications_required;
    if (current.includes(cert)) {
      updateField(
        "certifications_required",
        current.filter((c) => c !== cert)
      );
    } else {
      updateField("certifications_required", [...current, cert]);
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.project_name.trim()) {
        newErrors.project_name = "Project name is required";
      }
      if (!formData.project_location.trim()) {
        newErrors.project_location = "Project location is required";
      }
      if (!formData.project_timeline) {
        newErrors.project_timeline = "Timeline is required";
      }
    }

    if (step === 2) {
      if (!formData.material_type.trim()) {
        newErrors.material_type = "Material type is required";
      }
      if (!formData.quantity.trim()) {
        newErrors.quantity = "Quantity is required";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep(2)) return;

    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/v1/rfqs/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        // Reset form after 3 seconds
        setTimeout(() => {
          setFormData({
            project_name: "",
            project_location: "",
            project_timeline: "",
            material_type: "",
            quantity: "",
            specifications: "",
            certifications_required: [],
            budget_range: "",
            deadline: "",
          });
          setCurrentStep(1);
          setSuccess(false);
        }, 3000);
      } else {
        setError(data.error || "Failed to submit RFQ");
      }
    } catch (err) {
      setError("Network error. Please try again.");
      console.error("RFQ submission error:", err);
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { number: 1, title: "Project Details", icon: FileText },
    { number: 2, title: "Material Requirements", icon: FileText },
    { number: 3, title: "Review & Submit", icon: CheckCircle },
  ];

  if (success) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            RFQ Submitted Successfully!
          </h2>
          <p className="text-gray-600 mb-6">
            Your request has been sent to verified suppliers. You'll receive
            responses within 24-48 hours.
          </p>
          <button
            onClick={() => (window.location.href = "/dashboard")}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition"
          >
            View My RFQs
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Request for Quote
        </h1>
        <p className="text-gray-600">
          Submit your material requirements to verified sustainable suppliers
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold transition ${
                    currentStep >= step.number
                      ? "bg-green-600 text-white"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {step.number}
                </div>
                <span
                  className={`text-sm mt-2 font-medium ${
                    currentStep >= step.number
                      ? "text-green-600"
                      : "text-gray-500"
                  }`}
                >
                  {step.title}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`flex-1 h-1 mx-4 transition ${
                    currentStep > step.number ? "bg-green-600" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-800">
              Submission Failed
            </p>
            <p className="text-sm text-red-600 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Form Card */}
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-8">
        {/* Step 1: Project Details */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <label
                htmlFor="project_name"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Project Name *
              </label>
              <input
                id="project_name"
                type="text"
                value={formData.project_name}
                onChange={(e) => updateField("project_name", e.target.value)}
                placeholder="e.g., Downtown Office Building Renovation"
                aria-invalid={!!errors.project_name}
                aria-describedby={errors.project_name ? "project_name-error" : undefined}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 ${
                  errors.project_name ? "border-red-300" : "border-gray-300"
                }`}
              />
              {errors.project_name && (
                <p id="project_name-error" className="text-sm text-red-600 mt-1">
                  {errors.project_name}
                </p>
              )}
            </div>

            <LocationAutocomplete
              id="project_location"
              value={formData.project_location}
              onChange={(value, coords) => {
                updateField("project_location", value);
                // Store coordinates if needed later
                if (coords) {
                  console.log("Project coordinates:", coords);
                }
              }}
              label="Project Location"
              placeholder="Enter city, state, or full address"
              required
              error={errors.project_location}
            />
            <div>
              <label
                htmlFor="project_timeline"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Project Timeline *
              </label>
              <select
                id="project_timeline"
                value={formData.project_timeline}
                onChange={(e) =>
                  updateField("project_timeline", e.target.value)
                }
                aria-invalid={!!errors.project_timeline}
                aria-describedby={errors.project_timeline ? "project_timeline-error" : undefined}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 ${
                  errors.project_timeline ? "border-red-300" : "border-gray-300"
                }`}
              >
                <option value="">Select timeline</option>
                {TIMELINE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              {errors.project_timeline && (
                <p id="project_timeline-error" className="text-sm text-red-600 mt-1">
                  {errors.project_timeline}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="deadline"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Response Deadline (Optional)
              </label>
              <input
                id="deadline"
                type="date"
                value={formData.deadline}
                onChange={(e) => updateField("deadline", e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
        )}

        {/* Step 2: Material Requirements */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <label
                htmlFor="material_type"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Material Type *
              </label>
              <input
                id="material_type"
                type="text"
                value={formData.material_type}
                onChange={(e) => updateField("material_type", e.target.value)}
                placeholder="e.g., Low-carbon concrete, Recycled steel, Sustainable timber"
                aria-invalid={!!errors.material_type}
                aria-describedby={errors.material_type ? "material_type-error" : undefined}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 ${
                  errors.material_type ? "border-red-300" : "border-gray-300"
                }`}
              />
              {errors.material_type && (
                <p id="material_type-error" className="text-sm text-red-600 mt-1">
                  {errors.material_type}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="quantity"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Quantity *
              </label>
              <input
                id="quantity"
                type="text"
                value={formData.quantity}
                onChange={(e) => updateField("quantity", e.target.value)}
                placeholder="e.g., 500 cubic yards, 10,000 sq ft"
                aria-invalid={!!errors.quantity}
                aria-describedby={errors.quantity ? "quantity-error" : undefined}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500 ${
                  errors.quantity ? "border-red-300" : "border-gray-300"
                }`}
              />
              {errors.quantity && (
                <p id="quantity-error" className="text-sm text-red-600 mt-1">{errors.quantity}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="specifications"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Detailed Specifications
              </label>
              <textarea
                id="specifications"
                value={formData.specifications}
                onChange={(e) => updateField("specifications", e.target.value)}
                placeholder="Describe technical requirements, performance criteria, or any specific needs..."
                rows={5}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>

            <fieldset>
              <legend className="block text-sm font-medium text-gray-700 mb-3">
                Required Certifications
              </legend>
              <div className="grid grid-cols-2 gap-3">
                {CERTIFICATION_OPTIONS.map((cert) => (
                  <label
                    key={cert}
                    className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition"
                  >
                    <input
                      type="checkbox"
                      checked={formData.certifications_required.includes(cert)}
                      onChange={() => toggleCertification(cert)}
                      className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-700">{cert}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div>
              <label
                htmlFor="budget_range"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Budget Range (Optional)
              </label>
              <select
                id="budget_range"
                value={formData.budget_range}
                onChange={(e) => updateField("budget_range", e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              >
                <option value="">Select budget range</option>
                {BUDGET_RANGES.map((range) => (
                  <option key={range} value={range}>
                    {range}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Step 3: Review */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-4">
                Review Your Request
              </h3>

              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    Project Name
                  </p>
                  <p className="text-gray-900">{formData.project_name}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-700">Location</p>
                  <p className="text-gray-900">{formData.project_location}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-700">Timeline</p>
                  <p className="text-gray-900">{formData.project_timeline}</p>
                </div>

                {formData.deadline && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      Deadline
                    </p>
                    <p className="text-gray-900">
                      {new Date(formData.deadline).toLocaleDateString()}
                    </p>
                  </div>
                )}

                <div className="border-t border-gray-200 pt-4">
                  <p className="text-sm font-medium text-gray-700">
                    Material Type
                  </p>
                  <p className="text-gray-900">{formData.material_type}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-700">Quantity</p>
                  <p className="text-gray-900">{formData.quantity}</p>
                </div>

                {formData.specifications && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      Specifications
                    </p>
                    <p className="text-gray-900">{formData.specifications}</p>
                  </div>
                )}

                {formData.certifications_required.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Required Certifications
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {formData.certifications_required.map((cert) => (
                        <span
                          key={cert}
                          className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                        >
                          {cert}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {formData.budget_range && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      Budget Range
                    </p>
                    <p className="text-gray-900">{formData.budget_range}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Next steps:</strong> Your RFQ will be sent to verified
                suppliers matching your requirements. You'll receive email
                notifications when suppliers respond with quotes.
              </p>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
          {currentStep > 1 ? (
            <button
              onClick={prevStep}
              className="flex items-center gap-2 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
            >
              <ChevronLeft className="w-5 h-5" />
              Back
            </button>
          ) : (
            <div></div>
          )}

          {currentStep < 3 ? (
            <button
              onClick={nextStep}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition font-medium ml-auto"
            >
              Next
              <ChevronRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition font-medium ml-auto disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  Submit RFQ
                  <CheckCircle className="w-5 h-5" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
