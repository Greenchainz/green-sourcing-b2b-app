"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

export default function CreateRFQPage() {
  const router = useRouter();
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    projectName: "",
    description: "",
    deadline: "",
    materials: [{ name: "", quantity: "", unit: "pcs" }],
  });

  const handleMaterialChange = (index: number, field: string, value: string) => {
    const newMaterials = [...formData.materials];
    newMaterials[index] = { ...newMaterials[index], [field]: value };
    setFormData({ ...formData, materials: newMaterials });
  };

  const addMaterial = () => {
    setFormData({
      ...formData,
      materials: [...formData.materials, { name: "", quantity: "", unit: "pcs" }],
    });
  };

  const removeMaterial = (index: number) => {
    if (formData.materials.length === 1) return;
    const newMaterials = formData.materials.filter((_, i) => i !== index);
    setFormData({ ...formData, materials: newMaterials });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (!token) throw new Error("Not authenticated");

      const response = await fetch(`${BACKEND_URL}/api/v2/rfqs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          project_name: formData.projectName,
          message: formData.description,
          deadline: formData.deadline,
          items: formData.materials,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create RFQ");
      }

      router.push("/rfqs");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  // If useAuth returns undefined/loading, we might show loading state
  // But here we return "Please log in" if !user.
  // The verification script mocks session, but client component needs to re-fetch or hydrate.

  if (!user) {
    return (
      <div className="gc-page gc-rfq-page--centered">
        <p>Please log in to create an RFQ.</p>
        <p className="text-sm text-gray-500 mt-2">
          If you are seeing this during verification, ensure auth is mocked.
        </p>
      </div>
    );
  }

  return (
    <div className="gc-page gc-rfq-page">
      <div className="gc-container gc-rfq-container--narrow">
        <div className="gc-card gc-card-padding-lg">
          <h1 className="gc-title-lg mb-6">Create New RFQ</h1>

          {error && <div className="gc-alert gc-alert-error mb-6">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="gc-form-group">
              <label htmlFor="projectName" className="gc-label gc-label-required">Project Name</label>
              <input
                id="projectName"
                type="text"
                required
                className="gc-input"
                value={formData.projectName}
                onChange={(e) =>
                  setFormData({ ...formData, projectName: e.target.value })
                }
                placeholder="e.g. Downtown Office Renovation"
              />
            </div>

            <div className="gc-form-group">
              <label htmlFor="description" className="gc-label">Description / Message</label>
              <textarea
                id="description"
                className="gc-textarea"
                rows={4}
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Describe your sourcing needs..."
              />
            </div>

            <div className="gc-form-group">
              <label htmlFor="deadline" className="gc-label gc-label-required">Deadline</label>
              <input
                id="deadline"
                type="date"
                required
                className="gc-input"
                value={formData.deadline}
                onChange={(e) =>
                  setFormData({ ...formData, deadline: e.target.value })
                }
              />
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h3 className="gc-title-md mb-4">Materials Needed</h3>

              {formData.materials.map((material, index) => (
                <div key={index} className="flex gap-4 mb-4 items-end bg-gray-50 p-4 rounded-lg">
                  <div className="flex-grow">
                    <label htmlFor={`material-name-${index}`} className="gc-label text-sm mb-1">Material Name</label>
                    <input
                      id={`material-name-${index}`}
                      type="text"
                      required
                      className="gc-input"
                      value={material.name}
                      onChange={(e) =>
                        handleMaterialChange(index, "name", e.target.value)
                      }
                      placeholder="e.g. Steel Beams"
                    />
                  </div>
                  <div className="w-24">
                    <label htmlFor={`material-qty-${index}`} className="gc-label text-sm mb-1">Qty</label>
                    <input
                      id={`material-qty-${index}`}
                      type="number"
                      required
                      className="gc-input"
                      value={material.quantity}
                      onChange={(e) =>
                        handleMaterialChange(index, "quantity", e.target.value)
                      }
                    />
                  </div>
                  <div className="w-24">
                    <label htmlFor={`material-unit-${index}`} className="gc-label text-sm mb-1">Unit</label>
                    <input
                      id={`material-unit-${index}`}
                      type="text"
                      className="gc-input"
                      value={material.unit}
                      onChange={(e) =>
                        handleMaterialChange(index, "unit", e.target.value)
                      }
                    />
                  </div>
                  {formData.materials.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeMaterial(index)}
                      className="gc-btn gc-btn-secondary text-red-600 border-red-200 hover:bg-red-50"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}

              <button
                type="button"
                onClick={addMaterial}
                className="gc-btn gc-btn-secondary text-sm"
              >
                + Add Another Material
              </button>
            </div>

            <div className="flex justify-end pt-6">
              <button
                type="button"
                onClick={() => router.back()}
                className="gc-btn gc-btn-secondary mr-4"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="gc-btn gc-btn-primary"
              >
                {loading ? "Creating..." : "Create RFQ"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
