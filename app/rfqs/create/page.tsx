"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import TrustBadges from "@/app/components/TrustBadges";
import CheckoutTrustSignals from "@/app/components/CheckoutTrustSignals";
import {
  RFQStepper,
  LinkedInVerificationGate,
  DepositPayment,
  DEFAULT_DEPOSIT_AMOUNT,
} from "@/app/components/rfq";

interface Material {
  id?: string;
  name: string;
  quantity: number;
  unit: string;
  specification?: string;
  fromCatalog?: boolean;
}

type RFQFormStep = 1 | 2 | 3 | 4 | 5;

interface User {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  role: "architect" | "supplier";
  oauthProvider?: string | null;
}

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

export default function CreateRFQPage() {
  const router = useRouter();
  const { token, user } = useAuth() as {
    token: string | null;
    user: User | null;
  };
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<RFQFormStep>(1);
  const [createdRfqId, setCreatedRfqId] = useState<string | null>(null);
  const [depositPaymentIntentId, setDepositPaymentIntentId] = useState<
    string | null
  >(null);
  const [depositAmount, setDepositAmount] = useState<number>(0);

  // Form data
  const [formData, setFormData] = useState({
    project_name: "",
    description: "",
    deadline: "",
    budget: "",
    certifications_required: "",
    location: "",
  });

  const [materials, setMaterials] = useState<Material[]>([
    { name: "", quantity: 0, unit: "" },
  ]);

  // Check if user signed up with LinkedIn (required for RFQ creation)
  const isLinkedInSignup = user?.oauthProvider === 'linkedin';

  // Handle form field changes
  const handleFormChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Material handlers
  const handleMaterialChange = (
    index: number,
    field: string,
    value: string | number
  ) => {
    const updatedMaterials = [...materials];
    updatedMaterials[index] = {
      ...updatedMaterials[index],
      [field]: field === "quantity" ? parseFloat(String(value)) || 0 : value,
    };
    setMaterials(updatedMaterials);
  };

  const addMaterial = () => {
    setMaterials((prev) => [...prev, { name: "", quantity: 0, unit: "" }]);
  };

  const removeMaterial = (index: number) => {
    setMaterials((prev) => prev.filter((_, i) => i !== index));
  };

  // Validation
  const validateStep1 = (): boolean => {
    if (!formData.project_name.trim()) {
      setError("Please enter a project name");
      return false;
    }
    if (!formData.deadline) {
      setError("Please select a deadline");
      return false;
    }
    return true;
  };

  const validateStep2 = (): boolean => {
    const validMaterials = materials.filter((m) => m.name.trim() !== "");
    if (validMaterials.length === 0) {
      setError("Please add at least one material");
      return false;
    }
    return true;
  };

  // Navigation
  const goToStep = (step: RFQFormStep) => {
    setError(null);
    setCurrentStep(step);
  };

  const nextStep = () => {
    setError(null);

    if (currentStep === 1 && !validateStep1()) return;
    if (currentStep === 2 && !validateStep2()) return;
    if (currentStep === 3 && !isLinkedInSignup) {
      setError("You must sign up with LinkedIn to create RFQs. Please sign out and sign up using LinkedIn.");
      return;
    }

    if (currentStep < 5) {
      setCurrentStep((prev) => (prev + 1) as RFQFormStep);
    }
  };

  const prevStep = () => {
    setError(null);
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as RFQFormStep);
    }
  };

  // Handle deposit payment success
  const handleDepositSuccess = (paymentIntentId: string, amount: number) => {
    setDepositPaymentIntentId(paymentIntentId);
    setDepositAmount(amount);
    setCurrentStep(5); // Move to review step
  };

  // Submit RFQ
  const handleSubmitRFQ = async () => {
    if (!depositPaymentIntentId) {
      setError("Payment not completed. Please complete the deposit payment.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (!token) {
        throw new Error("Not authenticated. Please log in first.");
      }

      const response = await fetch(`${BACKEND_URL}/api/v1/rfqs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          project_name: formData.project_name,
          description: formData.description || null,
          deadline: formData.deadline,
          budget: formData.budget ? parseFloat(formData.budget) : null,
          certifications_required: formData.certifications_required || null,
          location: formData.location || null,
          materials: materials.filter((m) => m.name.trim() !== ""),
          deposit_payment_intent_id: depositPaymentIntentId,
          deposit_amount: depositAmount,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error ||
            errorData.errors?.join(", ") ||
            "Failed to create RFQ"
        );
      }

      const rfqResult = await response.json();
      setCreatedRfqId(rfqResult.id);

      // Redirect after a brief delay
      setTimeout(() => {
        router.push(`/rfqs/${rfqResult.id}`);
      }, 3000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An error occurred";
      setError(message);
      console.error("RFQ creation error:", err);
    } finally {
      setLoading(false);
    }
  };

  const validMaterialsCount = materials.filter(
    (m) => m.name.trim() !== ""
  ).length;

  // Success State
  if (createdRfqId) {
    return (
      <div className="gc-page py-12">
        <div className="gc-container max-w-[600px]">
          <div className="gc-card gc-animate-scale-in p-10 text-center">
            {/* Success Icon */}
            <div className="w-[72px] h-[72px] mx-auto mb-6 rounded-full bg-gradient-to-br from-[var(--gc-emerald-500)] to-[var(--gc-teal-500)] flex items-center justify-center shadow-[0_12px_30px_rgba(16,185,129,0.3)]">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-9 h-9"
                aria-hidden="true"
              >
                <polyline points="20,6 9,17 4,12" />
              </svg>
            </div>

            <h1 className="m-0 mb-3 text-[28px] font-black text-[var(--gc-slate-900)]">
              RFQ Submitted Successfully!
            </h1>

            <p className="m-0 mb-6 text-base text-[var(--gc-slate-600)] leading-relaxed">
              Your request for <strong>{formData.project_name}</strong> has been
              sent to verified suppliers. Expect responses within 48-72 hours.
            </p>

            {/* Deposit Confirmation */}
            {depositAmount > 0 && (
              <div className="p-4 bg-[rgba(236,253,245,0.7)] border border-[var(--gc-emerald-200)] rounded-[var(--gc-radius)] mb-6">
                <div className="flex items-center justify-center gap-2">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-[18px] h-[18px] text-[var(--gc-emerald-600)]"
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <span className="text-sm font-bold text-[var(--gc-emerald-700)]">
                    Deposit of ${(depositAmount / 100).toFixed(2)} confirmed
                  </span>
                </div>
              </div>
            )}

            {/* Trust Signals */}
            <CheckoutTrustSignals
              variant="horizontal"
              signals={[
                {
                  id: "verified",
                  icon: "shield",
                  label: "Status",
                  value: "Deposit Verified",
                  verified: true,
                },
                {
                  id: "response",
                  icon: "clock",
                  label: "Expected Response",
                  value: "48-72 hours",
                  verified: true,
                },
                {
                  id: "suppliers",
                  icon: "check",
                  label: "Suppliers Notified",
                  value: "3-5 Verified",
                  verified: true,
                },
              ]}
            />

            {/* View RFQ Button */}
            <div className="mt-7">
              <button
                onClick={() => router.push(`/rfqs/${createdRfqId}`)}
                className="gc-btn gc-btn-primary px-8 py-[0.85rem] text-[15px]"
              >
                View Your RFQ
              </button>
              <p className="mt-3 text-[13px] text-[var(--gc-slate-500)]">
                Redirecting automatically in a few seconds...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="gc-page py-8 pb-12">
      <div className="gc-container max-w-[800px]">
        {/* Trust Badges */}
        <div className="mb-5">
          <TrustBadges variant="compact" size="sm" />
        </div>

        {/* Stepper */}
        <RFQStepper
          currentStep={currentStep}
          steps={[
            {
              id: 1,
              label: "Project Details",
              description: "Name & requirements",
            },
            {
              id: 2,
              label: "Materials",
              description: "Select or add materials",
            },
            { id: 3, label: "Verification", description: "LinkedIn identity" },
            {
              id: 4,
              label: "Deposit",
              description: `$${DEFAULT_DEPOSIT_AMOUNT} refundable`,
            },
            { id: 5, label: "Review", description: "Confirm & submit" },
          ]}
        />

        {/* Main Form Card */}
        <div className="gc-card gc-animate-fade-in p-8">
          {/* Error Message */}
          {error && (
            <div
              className="gc-alert gc-alert-error mb-6"
              role="alert"
              aria-live="polite"
            >
              {error}
            </div>
          )}

          {/* Step 1: Project Details */}
          {currentStep === 1 && (
            <div className="gc-rfq-step-content">
              <div className="mb-7">
                <h1 className="m-0 text-2xl font-black text-[var(--gc-slate-900)]">
                  Project Details
                </h1>
                <p className="m-0 mt-2 text-[15px] text-[var(--gc-slate-600)]">
                  Tell us about your project and sustainability requirements
                </p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  nextStep();
                }}
              >
                {/* Project Name */}
                <div className="gc-form-group">
                  <label
                    htmlFor="project_name"
                    className="gc-label gc-label-required"
                  >
                    Project Name
                  </label>
                  <input
                    type="text"
                    id="project_name"
                    name="project_name"
                    value={formData.project_name}
                    onChange={handleFormChange}
                    required
                    className="gc-input"
                    placeholder="e.g., Downtown Office Renovation"
                  />
                </div>

                {/* Description */}
                <div className="gc-form-group">
                  <label htmlFor="description" className="gc-label">
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleFormChange}
                    rows={4}
                    className="gc-textarea"
                    placeholder="Project details, scope, location, sustainability goals..."
                  />
                </div>

                {/* Location */}
                <div className="gc-form-group">
                  <label htmlFor="location" className="gc-label">
                    Project Location
                  </label>
                  <input
                    type="text"
                    id="location"
                    name="location"
                    value={formData.location}
                    onChange={handleFormChange}
                    className="gc-input"
                    placeholder="e.g., New York, NY or 10001"
                  />
                </div>

                {/* Deadline & Budget Row */}
                {/* Deadline & Budget Row */}
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">
                  <div className="gc-form-group">
                    <label
                      htmlFor="deadline"
                      className="gc-label gc-label-required"
                    >
                      Deadline
                    </label>
                    <input
                      type="datetime-local"
                      id="deadline"
                      name="deadline"
                      value={formData.deadline}
                      onChange={handleFormChange}
                      required
                      className="gc-input"
                    />
                  </div>

                  <div className="gc-form-group">
                    <label htmlFor="budget" className="gc-label">
                      Budget (USD)
                    </label>
                    <input
                      type="number"
                      id="budget"
                      name="budget"
                      value={formData.budget}
                      onChange={handleFormChange}
                      step="0.01"
                      className="gc-input"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Certifications */}
                <div className="gc-form-group">
                  <label htmlFor="certifications_required" className="gc-label">
                    Certifications Required
                  </label>
                  <input
                    type="text"
                    id="certifications_required"
                    name="certifications_required"
                    value={formData.certifications_required}
                    onChange={handleFormChange}
                    className="gc-input"
                    placeholder="e.g., FSC, LEED, EPD, Carbon Neutral"
                  />
                </div>

                {/* Navigation */}
                <div className="flex gap-3 mt-7">
                  <button
                    type="submit"
                    className="gc-btn gc-btn-primary flex-1"
                  >
                    Continue to Materials
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="w-[18px] h-[18px] ml-1.5"
                    >
                      <polyline points="9,18 15,12 9,6" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="gc-btn gc-btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Step 2: Materials */}
          {currentStep === 2 && (
            <div className="gc-rfq-step-content">
              <div className="mb-7">
                <h1 className="m-0 text-2xl font-black text-[var(--gc-slate-900)]">
                  Materials
                </h1>
                <p className="m-0 mt-2 text-[15px] text-[var(--gc-slate-600)]">
                  Add materials from our catalog or enter them manually
                </p>
              </div>

              {/* Materials List */}
              {materials.map((material, index) => (
                <div
                  key={index}
                  className="gc-card p-5 mb-4 bg-[rgba(248,250,252,0.7)]"
                >
                  <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(140px,1fr))]">
                    <div className="gc-form-group mb-0">
                      <label className="gc-label">Material Name</label>
                      <input
                        type="text"
                        value={material.name}
                        onChange={(e) =>
                          handleMaterialChange(index, "name", e.target.value)
                        }
                        className="gc-input"
                        placeholder="e.g., Reclaimed Wood"
                      />
                    </div>
                    <div className="gc-form-group mb-0">
                      <label className="gc-label">Quantity</label>
                      <input
                        type="number"
                        value={material.quantity || ""}
                        onChange={(e) =>
                          handleMaterialChange(
                            index,
                            "quantity",
                            e.target.value
                          )
                        }
                        className="gc-input"
                        placeholder="0"
                        step="0.01"
                      />
                    </div>
                    <div className="gc-form-group mb-0">
                      <label className="gc-label">Unit</label>
                      <input
                        type="text"
                        value={material.unit}
                        onChange={(e) =>
                          handleMaterialChange(index, "unit", e.target.value)
                        }
                        className="gc-input"
                        placeholder="e.g., m², kg"
                      />
                    </div>
                  </div>

                  {/* Specification */}
                  <div className="gc-form-group mt-3 mb-0">
                    <label className="gc-label">Specification</label>
                    <input
                      type="text"
                      value={material.specification || ""}
                      onChange={(e) =>
                        handleMaterialChange(
                          index,
                          "specification",
                          e.target.value
                        )
                      }
                      className="gc-input"
                      placeholder="e.g., 2x4 Grade A, 10mm thickness"
                    />
                  </div>

                  {/* Remove button */}
                  {materials.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeMaterial(index)}
                      className="mt-3 text-[13px] font-semibold text-red-600 bg-transparent border-0 cursor-pointer p-0"
                      aria-label={`Remove material ${index + 1}${
                        material.name ? `: ${material.name}` : ""
                      }`}
                    >
                      − Remove Material
                    </button>
                  )}
                </div>
              ))}

              {/* Add Material Button */}
              <button
                type="button"
                onClick={addMaterial}
                className="gc-btn gc-btn-ghost w-full mb-4 border border-dashed border-[var(--gc-slate-300)]"
              >
                + Add Material
              </button>

              {/* Browse Catalog Link */}
              <div className="p-4 bg-[linear-gradient(135deg,rgba(16,185,129,0.05)_0%,rgba(20,184,166,0.03)_100%)] border border-[var(--gc-emerald-200)] rounded-[var(--gc-radius)] mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-[var(--gc-radius-sm)] bg-white flex items-center justify-center shadow-sm">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="w-[18px] h-[18px] text-[var(--gc-emerald-600)]"
                    >
                      <rect x="3" y="3" width="7" height="7" />
                      <rect x="14" y="3" width="7" height="7" />
                      <rect x="14" y="14" width="7" height="7" />
                      <rect x="3" y="14" width="7" height="7" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="m-0 text-sm font-semibold text-[var(--gc-slate-800)]">
                      Browse Our Catalog
                    </p>
                    <p className="m-0 mt-0.5 text-xs text-[var(--gc-slate-600)]">
                      Select from 10,000+ verified sustainable materials
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      window.open("/catalog", "_blank", "noopener,noreferrer")
                    }
                    className="gc-btn gc-btn-ghost text-[13px]"
                  >
                    Browse
                  </button>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={prevStep}
                  className="gc-btn gc-btn-secondary"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={nextStep}
                  className="gc-btn gc-btn-primary flex-1"
                >
                  Continue to Verification
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="w-[18px] h-[18px] ml-1.5"
                  >
                    <polyline points="9,18 15,12 9,6" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Step 3: LinkedIn Signup Verification */}
          {currentStep === 3 && (
            <div className="gc-rfq-step-content">
              {isLinkedInSignup ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-[var(--gc-emerald-500)] to-[var(--gc-teal-500)] flex items-center justify-center shadow-[0_8px_24px_rgba(16,185,129,0.3)]">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="white"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-8 h-8"
                    >
                      <polyline points="20,6 9,17 4,12" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-black text-[var(--gc-slate-900)] mb-2">
                    LinkedIn Verified
                  </h2>
                  <p className="text-[var(--gc-slate-600)] mb-6">
                    Your LinkedIn signup has been verified. You can proceed to create RFQs.
                  </p>
                  <button
                    type="button"
                    onClick={nextStep}
                    className="gc-btn gc-btn-primary"
                  >
                    Continue to Deposit
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="w-[18px] h-[18px] ml-1.5"
                    >
                      <polyline points="9,18 15,12 9,6" />
                    </svg>
                  </button>
                  <div className="text-center mt-4">
                    <button
                      type="button"
                      onClick={prevStep}
                      className="gc-btn gc-btn-ghost"
                    >
                      ← Back to Materials
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#0077b5] flex items-center justify-center shadow-[0_8px_24px_rgba(0,119,181,0.3)]">
                    <svg
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="w-8 h-8 text-white"
                    >
                      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-black text-[var(--gc-slate-900)] mb-2">
                    LinkedIn Signup Required
                  </h2>
                  <p className="text-[var(--gc-slate-600)] mb-6 max-w-md mx-auto">
                    To create RFQs, you must sign up using LinkedIn. Please sign out and sign up again using the LinkedIn option.
                  </p>
                  <button
                    type="button"
                    onClick={() => router.push('/login')}
                    className="gc-btn gc-btn-primary"
                  >
                    Go to Login
                  </button>
                  <div className="text-center mt-4">
                    <button
                      type="button"
                      onClick={prevStep}
                      className="gc-btn gc-btn-ghost"
                    >
                      ← Back to Materials
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Deposit Payment */}
          {currentStep === 4 && (
            <div className="gc-rfq-step-content">
              <div className="mb-7 text-center">
                <h1 className="m-0 text-2xl font-black text-[var(--gc-slate-900)]">
                  Secure Your RFQ
                </h1>
                <p className="m-0 mt-2 text-[15px] text-[var(--gc-slate-600)]">
                  A refundable ${DEFAULT_DEPOSIT_AMOUNT} deposit confirms your
                  intent and unlocks verified suppliers
                </p>
              </div>

              <DepositPayment
                token={token}
                onSuccess={handleDepositSuccess}
                onBack={prevStep}
                amount={DEFAULT_DEPOSIT_AMOUNT}
              />
            </div>
          )}

          {/* Step 5: Review & Submit */}
          {currentStep === 5 && (
            <div className="gc-rfq-step-content">
              <div className="mb-7">
                <h1 className="m-0 text-2xl font-black text-[var(--gc-slate-900)]">
                  Review & Submit
                </h1>
                <p className="m-0 mt-2 text-[15px] text-[var(--gc-slate-600)]">
                  Confirm your RFQ details before submitting to suppliers
                </p>
              </div>

              {/* Summary Card */}
              <div className="gc-card p-6 bg-[var(--gc-slate-50)] mb-6">
                <h3 className="m-0 mb-4 text-base font-bold text-[var(--gc-slate-800)]">
                  RFQ Summary
                </h3>

                <div className="grid gap-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-[var(--gc-slate-600)]">
                      Project Name
                    </span>
                    <span className="text-sm font-semibold text-[var(--gc-slate-900)]">
                      {formData.project_name}
                    </span>
                  </div>

                  {formData.location && (
                    <div className="flex justify-between">
                      <span className="text-sm text-[var(--gc-slate-600)]">
                        Location
                      </span>
                      <span className="text-sm font-semibold text-[var(--gc-slate-900)]">
                        {formData.location}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <span className="text-sm text-[var(--gc-slate-600)]">
                      Deadline
                    </span>
                    <span className="text-sm font-semibold text-[var(--gc-slate-900)]">
                      {formData.deadline
                        ? new Date(formData.deadline).toLocaleDateString(
                            "en-US",
                            {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            }
                          )
                        : "Not specified"}
                    </span>
                  </div>

                  {formData.budget && (
                    <div className="flex justify-between">
                      <span className="text-sm text-[var(--gc-slate-600)]">
                        Budget
                      </span>
                      <span className="text-sm font-semibold text-[var(--gc-slate-900)]">
                        ${parseFloat(formData.budget).toLocaleString()}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <span className="text-sm text-[var(--gc-slate-600)]">
                      Materials
                    </span>
                    <span className="text-sm font-semibold text-[var(--gc-slate-900)]">
                      {validMaterialsCount} item
                      {validMaterialsCount !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {formData.certifications_required && (
                    <div className="flex justify-between">
                      <span className="text-sm text-[var(--gc-slate-600)]">
                        Certifications
                      </span>
                      <span className="text-sm font-semibold text-[var(--gc-slate-900)]">
                        {formData.certifications_required}
                      </span>
                    </div>
                  )}
                </div>

                <hr className="my-4 border-0 border-t border-[var(--gc-slate-200)]" />

                {/* Materials List */}
                <h4 className="m-0 mb-3 text-sm font-bold text-[var(--gc-slate-700)]">
                  Materials Requested
                </h4>
                <ul className="m-0 pl-5">
                  {materials
                    .filter((m) => m.name.trim())
                    .map((m, i) => (
                      <li
                        key={i}
                        className="text-[13px] text-[var(--gc-slate-700)] mb-1"
                      >
                        {m.name} - {m.quantity} {m.unit}
                        {m.specification && (
                          <span className="text-[var(--gc-slate-500)]">
                            {" "}
                            ({m.specification})
                          </span>
                        )}
                      </li>
                    ))}
                </ul>
              </div>

              {/* Deposit Confirmation */}
              <div className="p-4 bg-[rgba(236,253,245,0.7)] border border-[var(--gc-emerald-200)] rounded-[var(--gc-radius)] mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[var(--gc-emerald-500)] flex items-center justify-center">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="white"
                      strokeWidth="3"
                      className="w-[18px] h-[18px]"
                    >
                      <polyline points="20,6 9,17 4,12" />
                    </svg>
                  </div>
                  <div>
                    <p className="m-0 text-sm font-bold text-[var(--gc-emerald-700)]">
                      Deposit Paid: ${(depositAmount / 100).toFixed(2)}
                    </p>
                    <p className="m-0 mt-0.5 text-xs text-[var(--gc-slate-600)]">
                      Refundable if no suitable quotes received
                    </p>
                  </div>
                </div>
              </div>

              {/* Trust Signals */}
              <CheckoutTrustSignals
                variant="horizontal"
                showAnimation={false}
              />

              {/* Navigation */}
              <div className="flex gap-3 mt-7">
                <button
                  type="button"
                  onClick={() => goToStep(4)}
                  className="gc-btn gc-btn-secondary"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleSubmitRFQ}
                  disabled={loading}
                  className="gc-btn gc-btn-primary flex-1"
                >
                  {loading ? (
                    <>
                      <span className="gc-spinner w-[18px] h-[18px]" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      Submit RFQ
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="w-[18px] h-[18px] ml-1.5"
                      >
                        <polyline points="9,18 15,12 9,6" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Trust Signal Footer */}
        {currentStep < 5 && (
          <div className="mt-6">
            <CheckoutTrustSignals variant="horizontal" showAnimation={false} />
          </div>
        )}
      </div>
    </div>
  );
}
