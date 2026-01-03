'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Material {
  name: string;
  quantity: number;
  unit: string;
  specification?: string;
}

export default function CreateRFQPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [materials, setMaterials] = useState<Material[]>([{ name: '', quantity: 0, unit: '' }]);

  const [formData, setFormData] = useState({
    project_name: '',
    description: '',
    deadline: '',
    budget: '',
    certifications_required: '',
  });

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleMaterialChange = (index: number, field: string, value: string | number) => {
    const updatedMaterials = [...materials];
    updatedMaterials[index] = {
      ...updatedMaterials[index],
      [field]: field === 'quantity' ? parseFloat(String(value)) : value,
    };
    setMaterials(updatedMaterials);
  };

  const addMaterial = () => {
    setMaterials((prev) => [...prev, { name: '', quantity: 0, unit: '' }]);
  };

  const removeMaterial = (index: number) => {
    setMaterials((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Get token from localStorage (set during login)
      const token = localStorage.getItem('jwt_token');
      if (!token) {
        throw new Error('Not authenticated. Please log in first.');
      }

      // Call backend API
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/rfqs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          project_name: formData.project_name,
          description: formData.description || null,
          deadline: formData.deadline,
          budget: formData.budget ? parseFloat(formData.budget) : null,
          certifications_required: formData.certifications_required || null,
          materials: materials.filter((m) => m.name.trim() !== ''),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.errors?.join(', ') || 'Failed to create RFQ');
      }

      const result = await response.json();
      setSuccess(true);

      // Redirect to RFQ detail page after 1 second
      setTimeout(() => {
        router.push(`/rfqs/${result.id}`);
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      console.error('RFQ creation error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Create RFQ</h1>
        <p className="text-gray-600 mb-8">Request for Quote - Find verified sustainable materials</p>

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-700">✓ RFQ created successfully! Redirecting...</p>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Project Name */}
          <div>
            <label htmlFor="project_name" className="block text-sm font-medium text-gray-700">
              Project Name *
            </label>
            <input
              type="text"
              id="project_name"
              name="project_name"
              value={formData.project_name}
              onChange={handleFormChange}
              required
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500"
              placeholder="e.g., Downtown Office Renovation"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleFormChange}
              rows={4}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500"
              placeholder="Project details, scope, location, etc."
            />
          </div>

          {/* Deadline */}
          <div>
            <label htmlFor="deadline" className="block text-sm font-medium text-gray-700">
              Deadline *
            </label>
            <input
              type="datetime-local"
              id="deadline"
              name="deadline"
              value={formData.deadline}
              onChange={handleFormChange}
              required
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500"
            />
          </div>

          {/* Budget */}
          <div>
            <label htmlFor="budget" className="block text-sm font-medium text-gray-700">
              Budget (Optional)
            </label>
            <input
              type="number"
              id="budget"
              name="budget"
              value={formData.budget}
              onChange={handleFormChange}
              step="0.01"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500"
              placeholder="0.00"
            />
          </div>

          {/* Certifications Required */}
          <div>
            <label htmlFor="certifications_required" className="block text-sm font-medium text-gray-700">
              Certifications Required (Optional)
            </label>
            <input
              type="text"
              id="certifications_required"
              name="certifications_required"
              value={formData.certifications_required}
              onChange={handleFormChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500"
              placeholder="e.g., FSC, LEED, Carbon Neutral"
            />
          </div>

          {/* Materials */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Materials *</h2>
            {materials.map((material, index) => (
              <div key={index} className="mb-4 p-4 border border-gray-200 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Material Name</label>
                    <input
                      type="text"
                      value={material.name}
                      onChange={(e) => handleMaterialChange(index, 'name', e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                      placeholder="e.g., Reclaimed Wood"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Quantity</label>
                    <input
                      type="number"
                      value={material.quantity || ''}
                      onChange={(e) => handleMaterialChange(index, 'quantity', e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                      placeholder="0"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Unit</label>
                    <input
                      type="text"
                      value={material.unit}
                      onChange={(e) => handleMaterialChange(index, 'unit', e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                      placeholder="e.g., m², kg, pcs"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700">Specification</label>
                  <input
                    type="text"
                    value={material.specification || ''}
                    onChange={(e) => handleMaterialChange(index, 'specification', e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                    placeholder="e.g., 2x4 Grade A, 10mm thickness"
                  />
                </div>
                {materials.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeMaterial(index)}
                    className="mt-4 text-red-600 hover:text-red-700 text-sm font-medium"
                  >
                    Remove Material
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addMaterial}
              className="mt-4 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition"
            >
              + Add Material
            </button>
          </div>

          {/* Submit Button */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-teal-600 text-white py-2 px-4 rounded-md hover:bg-teal-700 disabled:bg-gray-400 transition font-medium"
            >
              {loading ? 'Creating RFQ...' : 'Create RFQ'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 bg-gray-300 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-400 transition font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
