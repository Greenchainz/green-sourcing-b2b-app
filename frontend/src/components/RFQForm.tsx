"use client";

import { useState, useCallback } from "react";
import { cn, formatDate } from "../lib/utils";

// Types
interface ProjectDetails {
  name: string;
  location: string;
  timeline: string;
  projectType: string;
  budgetRange: string;
  description: string;
}

interface MaterialRequirement {
  id: string;
  category: string;
  quantity: number;
  unit: string;
  specifications: string;
  certifications: string[];
  maxGwp: number | null;
}

interface RFQFormData {
  projectDetails: ProjectDetails;
  materials: MaterialRequirement[];
}

interface RFQFormProps {
  preselectedMaterialId?: string;
  className?: string;
  onSuccess?: (rfqId: string) => void;
  onCancel?: () => void;
}

// Step indicator component
const StepIndicator = ({
  currentStep,
  steps,
}: {
  currentStep: number;
  steps: string[];
}) => (
  <div className="step-indicator">
    {steps.map((step, index) => (
      <div
        key={step}
        className={cn(
          "step-indicator-item",
          index < currentStep && "step-complete",
          index === currentStep && "step-active",
          index > currentStep && "step-pending"
        )}
      >
        <div className="step-number">
          {index < currentStep ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m4.5 12.75 6 6 9-13.5"
              />
            </svg>
          ) : (
            index + 1
          )}
        </div>
        <div className="step-label">{step}</div>
        {index < steps.length - 1 && <div className="step-connector" />}
      </div>
    ))}
  </div>
);

// Toast notification component
const Toast = ({
  message,
  type,
  onClose,
}: {
  message: string;
  type: "success" | "error";
  onClose: () => void;
}) => (
  <div className={cn("toast", `toast-${type}`)}>
    <div className="toast-icon">
      {type === "success" ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
          />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
          />
        </svg>
      )}
    </div>
    <span className="toast-message">{message}</span>
    <button
      onClick={onClose}
      className="toast-close"
      aria-label="Close notification"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6 18 18 6M6 6l12 12"
        />
      </svg>
    </button>
  </div>
);

// Step 1: Project Details
const Step1ProjectDetails = ({
  data,
  onChange,
  errors,
}: {
  data: ProjectDetails;
  onChange: (updates: Partial<ProjectDetails>) => void;
  errors: Record<string, string>;
}) => {
  const projectTypes = [
    "Commercial Office",
    "Residential Multi-Family",
    "Healthcare",
    "Education",
    "Retail",
    "Industrial",
    "Hospitality",
    "Mixed Use",
    "Other",
  ];

  const budgetRanges = [
    "Under $1M",
    "$1M - $5M",
    "$5M - $10M",
    "$10M - $50M",
    "Over $50M",
  ];

  return (
    <div className="form-step">
      <h3 className="form-step-title">Project Details</h3>
      <p className="form-step-description">
        Tell us about your project so suppliers can provide accurate quotes.
      </p>

      <div className="form-grid">
        <div className="form-field">
          <label htmlFor="project-name" className="form-label required">
            Project Name
          </label>
          <input
            id="project-name"
            type="text"
            value={data.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="e.g., Downtown Office Tower"
            className={cn("form-input", errors.name && "form-input-error")}
          />
          {errors.name && <span className="form-error">{errors.name}</span>}
        </div>

        <div className="form-field">
          <label htmlFor="project-location" className="form-label required">
            Location
          </label>
          <input
            id="project-location"
            type="text"
            value={data.location}
            onChange={(e) => onChange({ location: e.target.value })}
            placeholder="e.g., San Francisco, CA"
            className={cn("form-input", errors.location && "form-input-error")}
          />
          {errors.location && (
            <span className="form-error">{errors.location}</span>
          )}
        </div>

        <div className="form-field">
          <label htmlFor="project-type" className="form-label required">
            Project Type
          </label>
          <select
            id="project-type"
            value={data.projectType}
            onChange={(e) => onChange({ projectType: e.target.value })}
            className={cn(
              "form-select",
              errors.projectType && "form-input-error"
            )}
          >
            <option value="">Select project type</option>
            {projectTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          {errors.projectType && (
            <span className="form-error">{errors.projectType}</span>
          )}
        </div>

        <div className="form-field">
          <label htmlFor="budget-range" className="form-label">
            Budget Range
          </label>
          <select
            id="budget-range"
            value={data.budgetRange}
            onChange={(e) => onChange({ budgetRange: e.target.value })}
            className="form-select"
          >
            <option value="">Select budget range</option>
            {budgetRanges.map((range) => (
              <option key={range} value={range}>
                {range}
              </option>
            ))}
          </select>
        </div>

        <div className="form-field">
          <label htmlFor="timeline" className="form-label required">
            Expected Timeline
          </label>
          <input
            id="timeline"
            type="date"
            value={data.timeline}
            onChange={(e) => onChange({ timeline: e.target.value })}
            min={new Date().toISOString().split("T")[0]}
            className={cn("form-input", errors.timeline && "form-input-error")}
          />
          {errors.timeline && (
            <span className="form-error">{errors.timeline}</span>
          )}
        </div>

        <div className="form-field form-field-full">
          <label htmlFor="description" className="form-label">
            Project Description
          </label>
          <textarea
            id="description"
            value={data.description}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="Describe your project and any specific sustainability goals..."
            rows={4}
            className="form-textarea"
          />
        </div>
      </div>
    </div>
  );
};

// Step 2: Material Requirements
const Step2Materials = ({
  materials,
  onAdd,
  onRemove,
  onUpdate,
}: {
  materials: MaterialRequirement[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, updates: Partial<MaterialRequirement>) => void;
}) => {
  const categories = [
    "Flooring",
    "Wall Systems",
    "Roofing",
    "Structural Steel",
    "Concrete",
    "Insulation",
    "Windows & Glazing",
    "Interior Finishes",
    "Exterior Cladding",
    "Other",
  ];

  const units = ["sq ft", "sq m", "linear ft", "tons", "cubic yards", "units"];

  const certifications = [
    "EPD Verified",
    "FSC Certified",
    "LEED Compliant",
    "Cradle to Cradle",
    "GreenGuard",
    "Living Building Challenge",
  ];

  return (
    <div className="form-step">
      <h3 className="form-step-title">Material Requirements</h3>
      <p className="form-step-description">
        Specify the materials you need. Add as many as required for your
        project.
      </p>

      <div className="materials-list">
        {materials.map((material, index) => (
          <div key={material.id} className="material-requirement-card">
            <div className="material-requirement-header">
              <h4>Material {index + 1}</h4>
              {materials.length > 1 && (
                <button
                  onClick={() => onRemove(material.id)}
                  className="btn-remove-material"
                  aria-label="Remove material"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                    />
                  </svg>
                </button>
              )}
            </div>

            <div className="form-grid">
              <div className="form-field">
                <label className="form-label required">Category</label>
                <select
                  value={material.category}
                  onChange={(e) =>
                    onUpdate(material.id, { category: e.target.value })
                  }
                  className="form-select"
                >
                  <option value="">Select category</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field form-field-quantity">
                <label className="form-label required">Quantity</label>
                <div className="input-with-unit">
                  <input
                    type="number"
                    min="1"
                    value={material.quantity || ""}
                    onChange={(e) =>
                      onUpdate(material.id, {
                        quantity: Number(e.target.value),
                      })
                    }
                    placeholder="0"
                    className="form-input"
                  />
                  <select
                    value={material.unit}
                    onChange={(e) =>
                      onUpdate(material.id, { unit: e.target.value })
                    }
                    className="form-select unit-select"
                  >
                    {units.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-field">
                <label className="form-label">Max GWP (kg CO₂e)</label>
                <input
                  type="number"
                  min="0"
                  value={material.maxGwp ?? ""}
                  onChange={(e) =>
                    onUpdate(material.id, {
                      maxGwp: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  placeholder="Optional"
                  className="form-input"
                />
              </div>

              <div className="form-field form-field-full">
                <label className="form-label">Required Certifications</label>
                <div className="certification-chips">
                  {certifications.map((cert) => (
                    <button
                      key={cert}
                      type="button"
                      onClick={() => {
                        const current = material.certifications || [];
                        const updated = current.includes(cert)
                          ? current.filter((c) => c !== cert)
                          : [...current, cert];
                        onUpdate(material.id, { certifications: updated });
                      }}
                      className={cn(
                        "certification-chip",
                        material.certifications?.includes(cert) &&
                          "certification-chip-selected"
                      )}
                    >
                      {cert}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-field form-field-full">
                <label className="form-label">Specifications & Notes</label>
                <textarea
                  value={material.specifications}
                  onChange={(e) =>
                    onUpdate(material.id, { specifications: e.target.value })
                  }
                  placeholder="Any specific requirements, dimensions, colors, etc."
                  rows={2}
                  className="form-textarea"
                />
              </div>
            </div>
          </div>
        ))}

        <button onClick={onAdd} className="btn-add-material">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>
          Add Another Material
        </button>
      </div>
    </div>
  );
};

// Step 3: Review & Submit
const Step3Review = ({
  formData,
  onEdit,
}: {
  formData: RFQFormData;
  onEdit: (step: number) => void;
}) => {
  return (
    <div className="form-step">
      <h3 className="form-step-title">Review Your RFQ</h3>
      <p className="form-step-description">
        Please review your request before submitting. Suppliers will respond
        within 48 hours.
      </p>

      {/* Project Summary */}
      <div className="review-section">
        <div className="review-section-header">
          <h4>Project Details</h4>
          <button onClick={() => onEdit(0)} className="btn-edit">
            Edit
          </button>
        </div>
        <div className="review-grid">
          <div className="review-item">
            <span className="review-label">Project Name</span>
            <span className="review-value">{formData.projectDetails.name}</span>
          </div>
          <div className="review-item">
            <span className="review-label">Location</span>
            <span className="review-value">
              {formData.projectDetails.location}
            </span>
          </div>
          <div className="review-item">
            <span className="review-label">Project Type</span>
            <span className="review-value">
              {formData.projectDetails.projectType}
            </span>
          </div>
          <div className="review-item">
            <span className="review-label">Timeline</span>
            <span className="review-value">
              {formData.projectDetails.timeline
                ? formatDate(formData.projectDetails.timeline)
                : "Not specified"}
            </span>
          </div>
          {formData.projectDetails.budgetRange && (
            <div className="review-item">
              <span className="review-label">Budget</span>
              <span className="review-value">
                {formData.projectDetails.budgetRange}
              </span>
            </div>
          )}
          {formData.projectDetails.description && (
            <div className="review-item review-item-full">
              <span className="review-label">Description</span>
              <span className="review-value">
                {formData.projectDetails.description}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Materials Summary */}
      <div className="review-section">
        <div className="review-section-header">
          <h4>Materials ({formData.materials.length})</h4>
          <button onClick={() => onEdit(1)} className="btn-edit">
            Edit
          </button>
        </div>
        <div className="materials-review-list">
          {formData.materials.map((material, index) => (
            <div key={material.id} className="material-review-item">
              <div className="material-review-number">{index + 1}</div>
              <div className="material-review-details">
                <div className="material-review-main">
                  <span className="material-review-category">
                    {material.category || "Uncategorized"}
                  </span>
                  <span className="material-review-quantity">
                    {material.quantity} {material.unit}
                  </span>
                </div>
                {material.certifications?.length > 0 && (
                  <div className="material-review-certs">
                    {material.certifications.map((cert) => (
                      <span key={cert} className="cert-tag">
                        {cert}
                      </span>
                    ))}
                  </div>
                )}
                {material.maxGwp && (
                  <div className="material-review-gwp">
                    Max GWP: {material.maxGwp} kg CO₂e
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Main RFQ Form Component
export default function RFQForm({
  preselectedMaterialId,
  className = "",
  onSuccess,
  onCancel,
}: RFQFormProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const steps = ["Project Details", "Materials", "Review"];

  // Form data
  const [formData, setFormData] = useState<RFQFormData>({
    projectDetails: {
      name: "",
      location: "",
      timeline: "",
      projectType: "",
      budgetRange: "",
      description: "",
    },
    materials: [
      {
        id: crypto.randomUUID(),
        category: "",
        quantity: 0,
        unit: "sq ft",
        specifications: "",
        certifications: [],
        maxGwp: null,
      },
    ],
  });

  // Update project details
  const handleProjectDetailsChange = useCallback(
    (updates: Partial<ProjectDetails>) => {
      setFormData((prev) => ({
        ...prev,
        projectDetails: { ...prev.projectDetails, ...updates },
      }));
      // Clear related errors
      Object.keys(updates).forEach((key) => {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[key];
          return newErrors;
        });
      });
    },
    []
  );

  // Add material
  const handleAddMaterial = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      materials: [
        ...prev.materials,
        {
          id: crypto.randomUUID(),
          category: "",
          quantity: 0,
          unit: "sq ft",
          specifications: "",
          certifications: [],
          maxGwp: null,
        },
      ],
    }));
  }, []);

  // Remove material
  const handleRemoveMaterial = useCallback((id: string) => {
    setFormData((prev) => ({
      ...prev,
      materials: prev.materials.filter((m) => m.id !== id),
    }));
  }, []);

  // Update material
  const handleUpdateMaterial = useCallback(
    (id: string, updates: Partial<MaterialRequirement>) => {
      setFormData((prev) => ({
        ...prev,
        materials: prev.materials.map((m) =>
          m.id === id ? { ...m, ...updates } : m
        ),
      }));
    },
    []
  );

  // Validate step
  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 0) {
      if (!formData.projectDetails.name.trim()) {
        newErrors.name = "Project name is required";
      }
      if (!formData.projectDetails.location.trim()) {
        newErrors.location = "Location is required";
      }
      if (!formData.projectDetails.projectType) {
        newErrors.projectType = "Please select a project type";
      }
      if (!formData.projectDetails.timeline) {
        newErrors.timeline = "Please select a timeline";
      }
    }

    if (step === 1) {
      const invalidMaterials = formData.materials.filter(
        (m) => !m.category || m.quantity <= 0
      );
      if (invalidMaterials.length > 0) {
        newErrors.materials = "Please fill in all required material fields";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Navigate steps
  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleEdit = (step: number) => {
    setCurrentStep(step);
  };

  // Save as draft
  const handleSaveDraft = async () => {
    try {
      const response = await fetch("/api/v1/rfqs/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error("Failed to save draft");

      setToast({ message: "Draft saved successfully!", type: "success" });
    } catch {
      setToast({ message: "Failed to save draft", type: "error" });
    }
  };

  // Submit form
  const handleSubmit = async () => {
    if (!validateStep(2)) return;

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/v1/rfqs/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error("Failed to submit RFQ");

      const data = await response.json();
      setToast({ message: "RFQ submitted successfully!", type: "success" });

      if (onSuccess) {
        setTimeout(() => onSuccess(data.rfqId), 1500);
      }
    } catch {
      setToast({
        message: "Failed to submit RFQ. Please try again.",
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={cn("rfq-form", className)}>
      {/* Toast notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Header */}
      <div className="rfq-form-header">
        <h2 className="rfq-form-title">Create Request for Quote</h2>
        <p className="rfq-form-subtitle">
          Get quotes from verified sustainable material suppliers
        </p>
      </div>

      {/* Step indicator */}
      <StepIndicator currentStep={currentStep} steps={steps} />

      {/* Form content */}
      <div className="rfq-form-content">
        {currentStep === 0 && (
          <Step1ProjectDetails
            data={formData.projectDetails}
            onChange={handleProjectDetailsChange}
            errors={errors}
          />
        )}

        {currentStep === 1 && (
          <Step2Materials
            materials={formData.materials}
            onAdd={handleAddMaterial}
            onRemove={handleRemoveMaterial}
            onUpdate={handleUpdateMaterial}
          />
        )}

        {currentStep === 2 && (
          <Step3Review formData={formData} onEdit={handleEdit} />
        )}
      </div>

      {/* Form actions */}
      <div className="rfq-form-actions">
        <div className="rfq-form-actions-left">
          {onCancel && (
            <button onClick={onCancel} className="btn-cancel">
              Cancel
            </button>
          )}
          <button onClick={handleSaveDraft} className="btn-save-draft">
            Save as Draft
          </button>
        </div>

        <div className="rfq-form-actions-right">
          {currentStep > 0 && (
            <button onClick={handleBack} className="btn-back">
              Back
            </button>
          )}

          {currentStep < steps.length - 1 ? (
            <button onClick={handleNext} className="btn-next">
              Continue
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="btn-submit"
            >
              {isSubmitting ? (
                <>
                  <span className="spinner" />
                  Submitting...
                </>
              ) : (
                "Submit RFQ"
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
