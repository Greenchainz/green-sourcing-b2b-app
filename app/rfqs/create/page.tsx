'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import TrustBadges from '@/app/components/TrustBadges'

interface Material {
  name: string
  quantity: number
  unit: string
  specification?: string
}

export default function CreateRFQPage() {
  const router = useRouter()
  const { token } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [materials, setMaterials] = useState<Material[]>([
    { name: '', quantity: 0, unit: '' },
  ])

  const [formData, setFormData] = useState({
    project_name: '',
    description: '',
    deadline: '',
    budget: '',
    certifications_required: '',
  })

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleMaterialChange = (
    index: number,
    field: string,
    value: string | number
  ) => {
    const updatedMaterials = [...materials]
    updatedMaterials[index] = {
      ...updatedMaterials[index],
      [field]: field === 'quantity' ? parseFloat(String(value)) : value,
    }
    setMaterials(updatedMaterials)
  }

  const addMaterial = () => {
    setMaterials((prev) => [...prev, { name: '', quantity: 0, unit: '' }])
  }

  const removeMaterial = (index: number) => {
    setMaterials((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (!token) {
        throw new Error('Not authenticated. Please log in first.')
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/rfqs`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            project_name: formData.project_name,
            description: formData.description || null,
            deadline: formData.deadline,
            budget: formData.budget ? parseFloat(formData.budget) : null,
            certifications_required: formData.certifications_required || null,
            materials: materials.filter((m) => m.name.trim() !== ''),
          }),
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(
          errorData.error || errorData.errors?.join(', ') || 'Failed to create RFQ'
        )
      }

      const result = await response.json()
      setSuccess(true)

      setTimeout(() => {
        router.push(`/rfqs/${result.id}`)
      }, 1000)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred'
      setError(message)
      console.error('RFQ creation error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="gc-page" style={{ padding: '48px 0' }}>
      <div className="gc-container" style={{ maxWidth: 720 }}>
        {/* Trust Badges */}
        <div style={{ marginBottom: 24 }}>
          <TrustBadges variant="compact" size="sm" />
        </div>

        {/* Form Card */}
        <div className="gc-card gc-animate-fade-in" style={{ padding: 32 }}>
          {/* Header */}
          <div style={{ marginBottom: 28 }}>
            <h1
              style={{
                margin: 0,
                fontSize: 28,
                fontWeight: 900,
                color: 'var(--gc-slate-900)',
              }}
            >
              Create RFQ
            </h1>
            <p
              style={{
                margin: '8px 0 0 0',
                color: 'var(--gc-slate-600)',
                fontSize: 15,
              }}
            >
              Request for Quote — Find verified sustainable materials for your project
            </p>
          </div>

          {/* Success Message */}
          {success && (
            <div className="gc-alert gc-alert-success" style={{ marginBottom: 24 }}>
              ✓ RFQ created successfully! Redirecting...
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="gc-alert gc-alert-error" style={{ marginBottom: 24 }}>
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {/* Project Name */}
            <div className="gc-form-group">
              <label htmlFor="project_name" className="gc-label gc-label-required">
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

            {/* Deadline & Budget Row */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 16,
              }}
            >
              <div className="gc-form-group">
                <label htmlFor="deadline" className="gc-label gc-label-required">
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

            <hr className="gc-divider" />

            {/* Materials Section */}
            <div style={{ marginBottom: 24 }}>
              <h2
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  color: 'var(--gc-slate-900)',
                  marginBottom: 16,
                }}
              >
                Materials <span style={{ color: '#ef4444' }}>*</span>
              </h2>

              {materials.map((material, index) => (
                <div
                  key={index}
                  className="gc-card"
                  style={{
                    padding: 20,
                    marginBottom: 16,
                    background: 'rgba(248, 250, 252, 0.7)',
                  }}
                >
                  {/* Material row */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                      gap: 12,
                    }}
                  >
                    <div className="gc-form-group" style={{ marginBottom: 0 }}>
                      <label className="gc-label">Material Name</label>
                      <input
                        type="text"
                        value={material.name}
                        onChange={(e) =>
                          handleMaterialChange(index, 'name', e.target.value)
                        }
                        className="gc-input"
                        placeholder="e.g., Reclaimed Wood"
                      />
                    </div>
                    <div className="gc-form-group" style={{ marginBottom: 0 }}>
                      <label className="gc-label">Quantity</label>
                      <input
                        type="number"
                        value={material.quantity || ''}
                        onChange={(e) =>
                          handleMaterialChange(index, 'quantity', e.target.value)
                        }
                        className="gc-input"
                        placeholder="0"
                        step="0.01"
                      />
                    </div>
                    <div className="gc-form-group" style={{ marginBottom: 0 }}>
                      <label className="gc-label">Unit</label>
                      <input
                        type="text"
                        value={material.unit}
                        onChange={(e) =>
                          handleMaterialChange(index, 'unit', e.target.value)
                        }
                        className="gc-input"
                        placeholder="e.g., m², kg"
                      />
                    </div>
                  </div>

                  {/* Specification */}
                  <div className="gc-form-group" style={{ marginTop: 12, marginBottom: 0 }}>
                    <label className="gc-label">Specification</label>
                    <input
                      type="text"
                      value={material.specification || ''}
                      onChange={(e) =>
                        handleMaterialChange(index, 'specification', e.target.value)
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
                      style={{
                        marginTop: 12,
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#dc2626',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                      }}
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
                className="gc-btn gc-btn-ghost"
                style={{
                  border: '1px dashed var(--gc-slate-300)',
                  width: '100%',
                }}
              >
                + Add Material
              </button>
            </div>

            {/* Submit Buttons */}
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                type="submit"
                disabled={loading}
                className="gc-btn gc-btn-primary"
                style={{ flex: 1, padding: '0.85rem 1rem', fontSize: 15 }}
              >
                {loading ? (
                  <>
                    <span className="gc-spinner" style={{ width: 18, height: 18 }} />
                    Creating...
                  </>
                ) : (
                  'Create RFQ'
                )}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="gc-btn gc-btn-secondary"
                style={{ flex: 1, padding: '0.85rem 1rem', fontSize: 15 }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
