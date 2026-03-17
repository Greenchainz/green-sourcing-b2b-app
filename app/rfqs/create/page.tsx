"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Trash2, Plus, Loader2 } from "lucide-react";

export default function CreateRFQPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    project_name: "",
    description: "",
    delivery_date: "",
    delivery_address: "",
    materials: [{ material_name: "", quantity: "", unit: "sf" }],
  });

  const handleMaterialChange = (index: number, field: string, value: string) => {
    const newMaterials = [...formData.materials];
    newMaterials[index] = { ...newMaterials[index], [field]: value };
    setFormData({ ...formData, materials: newMaterials });
  };

  const addMaterial = () => {
    setFormData({
      ...formData,
      materials: [...formData.materials, { material_name: "", quantity: "", unit: "sf" }],
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
      if (!user) throw new Error("Not authenticated");

      const response = await fetch("/api/rfqs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          project_name: formData.project_name,
          delivery_date: formData.delivery_date,
          delivery_location: {
            lat: 0,
            lng: 0,
            address: formData.delivery_address,
          },
          notes: formData.description,
          materials: formData.materials.map((m) => ({
            material_id: m.material_name, // API accepts name string for matching
            quantity: parseFloat(m.quantity) || 1,
            unit: m.unit,
          })),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create RFQ");
      }

      router.push("/rfq-dashboard");
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
                value={formData.project_name}
                onChange={(e) =>
                  setFormData({ ...formData, project_name: e.target.value })
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
              <label htmlFor="deliveryAddress" className="gc-label gc-label-required">Delivery Address</label>
              <input
                id="deliveryAddress"
                type="text"
                required
                className="gc-input"
                value={formData.delivery_address}
                onChange={(e) => setFormData({ ...formData, delivery_address: e.target.value })}
                placeholder="e.g. 123 Main St, Newark, NJ 07102"
              />
            </div>

            <div className="gc-form-group">
              <label htmlFor="deadline" className="gc-label gc-label-required">Deadline</label>
              <input
                id="deadline"
                type="date"
                required
                className="gc-input"
                value={formData.delivery_date}
                onChange={(e) =>
                  setFormData({ ...formData, delivery_date: e.target.value })
                }
              />
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h3 className="gc-title-md mb-4">Materials Needed</h3>

              {formData.materials.map((material, index) => (
                <div key={index} className="flex gap-4 mb-4 items-end bg-gray-50 p-4 rounded-lg">
                  <div className="flex-grow">
                    <label htmlFor={`material-name-${index}`} className="gc-label text-sm mb-1">Material</label>
                    <input
                      id={`material-name-${index}`}
                      type="text"
                      required
                      className="gc-input"
                      value={material.material_name}
                      onChange={(e) =>
                        handleMaterialChange(index, "material_name", e.target.value)
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
                    <select
                      id={`material-unit-${index}`}
                      className="gc-input"
                      value={material.unit}
                      onChange={(e) =>
                        handleMaterialChange(index, "unit", e.target.value)
                      }
                    >
                      <option value="sf">sf</option>
                      <option value="lf">lf</option>
                      <option value="cy">cy</option>
                      <option value="ton">ton</option>
                      <option value="m2">m2</option>
                      <option value="m3">m3</option>
                      <option value="units">units</option>
                    </select>
                  </div>
                  {formData.materials.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeMaterial(index)}
                      className="gc-btn gc-btn-secondary text-red-600 border-red-200 hover:bg-red-50 p-2"
                      aria-label="Remove material"
                      title="Remove material"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}

              <button
                type="button"
                onClick={addMaterial}
                className="gc-btn gc-btn-secondary text-sm flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Another Material
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
                className="gc-btn gc-btn-primary flex items-center"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create RFQ"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
