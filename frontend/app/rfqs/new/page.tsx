'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

interface Material {
  sku: string;
  name: string;
  quantity: number;
  unit: string;
}

export default function NewRFQPage() {
  const router = useRouter();
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    projectId: '',
    title: '',
    description: '',
    budget: '',
    deadline: '',
    materials: [] as Material[],
  });

  const [currentMaterial, setCurrentMaterial] = useState<Material>({
    sku: '',
    name: '',
    quantity: 0,
    unit: 'ea',
  });

  const addMaterial = () => {
    if (!currentMaterial.name || !currentMaterial.quantity) {
      setError('Please fill material details');
      return;
    }
    setForm({
      ...form,
      materials: [...form.materials, currentMaterial],
    });
    setCurrentMaterial({ sku: '', name: '', quantity: 0, unit: 'ea' });
    setError('');
  };

  const removeMaterial = (index: number) => {
    setForm({
      ...form,
      materials: form.materials.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/rfqs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          projectId: form.projectId,
          title: form.title,
          description: form.description,
          materials: form.materials,
          budget: form.budget ? parseFloat(form.budget) : null,
          deadline: form.deadline || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create RFQ');
      }

      const rfq = await response.json();
      router.push(`/rfqs/${rfq.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <div className="p-8">Please log in first</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Create Request for Quote</h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow">
          {/* Project ID */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Project ID
            </label>
            <input
              type="text"
              required
              value={form.projectId}
              onChange={(e) =>
                setForm({ ...form, projectId: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter project ID"
            />
          </div>

          {/* Title */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              RFQ Title
            </label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Sustainable Flooring Materials"
            />
          </div>

          {/* Description */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Project details, requirements, certifications needed..."
            />
          </div>

          {/* Materials Section */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Materials</h3>

            {/* Material Input */}
            <div className="space-y-4 mb-4">
              <input
                type="text"
                placeholder="Material Name (e.g., Cork Flooring)"
                value={currentMaterial.name}
                onChange={(e) =>
                  setCurrentMaterial({
                    ...currentMaterial,
                    name: e.target.value,
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="SKU (optional)"
                value={currentMaterial.sku}
                onChange={(e) =>
                  setCurrentMaterial({ ...currentMaterial, sku: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="number"
                  placeholder="Quantity"
                  min="1"
                  value={currentMaterial.quantity || ''}
                  onChange={(e) =>
                    setCurrentMaterial({
                      ...currentMaterial,
                      quantity: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <select
                  value={currentMaterial.unit}
                  onChange={(e) =>
                    setCurrentMaterial({
                      ...currentMaterial,
                      unit: e.target.value,
                    })
                  }
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option>ea</option>
                  <option>sq ft</option>
                  <option>tons</option>
                  <option>pallets</option>
                </select>
              </div>
              <button
                type="button"
                onClick={addMaterial}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                + Add Material
              </button>
            </div>

            {/* Materials List */}
            {form.materials.length > 0 && (
              <div>
                <h4 className="font-medium mb-3">Added Materials:</h4>
                <div className="space-y-2">
                  {form.materials.map((material, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center bg-white p-3 rounded border border-gray-200"
                    >
                      <div>
                        <p className="font-medium">
                          {material.quantity} {material.unit} - {material.name}
                        </p>
                        {material.sku && (
                          <p className="text-sm text-gray-500">SKU: {material.sku}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeMaterial(index)}
                        className="text-red-600 hover:text-red-800 font-medium"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Budget & Deadline */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Budget (USD)
              </label>
              <input
                type="number"
                value={form.budget}
                onChange={(e) => setForm({ ...form, budget: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Deadline
              </label>
              <input
                type="datetime-local"
                value={form.deadline}
                onChange={(e) =>
                  setForm({ ...form, deadline: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-400"
          >
            {loading ? 'Creating RFQ...' : 'Create RFQ'}
          </button>
        </form>
      </div>
    </div>
  );
}
