'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import TrustBadges from '@/app/components/TrustBadges'
import RFQCheckout, { StripePaymentResult } from '@/app/components/RFQCheckout'
import CheckoutTrustSignals from '@/app/components/CheckoutTrustSignals'

interface Material {
  name: string
  quantity: number
  unit: string
  specification?: string
}

type Step = 'form' | 'checkout' | 'success'

export default function CreateRFQPage() {
  const router = useRouter()
  const { token, user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<Step>('form')
  const [paymentResult, setPaymentResult] = useState<StripePaymentResult | null>(null)
  const [createdRfqId, setCreatedRfqId] = useState<string | null>(null)

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

  const validateForm = (): boolean => {
    if (!formData.project_name.trim()) {
      setError('Please enter a project name')
      return false
    }
    if (!formData.deadline) {
      setError('Please select a deadline')
      return false
    }
    const validMaterials = materials.filter((m) => m.name.trim() !== '')
    if (validMaterials.length === 0) {
      setError('Please add at least one material')
      return false
    }
    return true
  }

  const handleProceedToCheckout = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    if (!validateForm()) return

    // Move to checkout step
    setStep('checkout')
  }

  const handlePaymentSuccess = async (result: StripePaymentResult) => {
    setPaymentResult(result)
    setLoading(true)
    setError(null)

    try {
      if (!token) {
        throw new Error('Not authenticated. Please log in first.')
      }

      // Create the RFQ after successful payment
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
            payment_intent_id: result.paymentIntentId,
            deposit_amount: result.amount,
          }),
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(
          errorData.error || errorData.errors?.join(', ') || 'Failed to create RFQ'
        )
      }

      const rfqResult = await response.json()
      setCreatedRfqId(rfqResult.id)
      setStep('success')

      // Redirect after showing success
      setTimeout(() => {
        router.push(`/rfqs/${rfqResult.id}`)
      }, 3000)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred'
      setError(message)
      console.error('RFQ creation error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleBackToForm = () => {
    setStep('form')
    setError(null)
  }

  const validMaterialsCount = materials.filter((m) => m.name.trim() !== '').length

  // Success Step
  if (step === 'success') {
    return (
      <div className="gc-page" style={{ padding: '48px 0' }}>
        <div className="gc-container" style={{ maxWidth: 600 }}>
          <div
            className="gc-card gc-animate-scale-in"
            style={{ padding: 40, textAlign: 'center' }}
          >
            {/* Success Icon */}
            <div
              style={{
                width: 72,
                height: 72,
                margin: '0 auto 24px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--gc-emerald-500) 0%, var(--gc-teal-500) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 12px 30px rgba(16, 185, 129, 0.3)',
              }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ width: 36, height: 36 }}
              >
                <polyline points="20,6 9,17 4,12" />
              </svg>
            </div>

            <h1
              style={{
                margin: '0 0 12px 0',
                fontSize: 28,
                fontWeight: 900,
                color: 'var(--gc-slate-900)',
              }}
            >
              RFQ Submitted Successfully!
            </h1>

            <p
              style={{
                margin: '0 0 24px 0',
                fontSize: 16,
                color: 'var(--gc-slate-600)',
                lineHeight: 1.6,
              }}
            >
              Your request for <strong>{formData.project_name}</strong> has been sent to verified suppliers. Expect responses within 48-72 hours.
            </p>

            {/* Deposit Confirmation */}
            {paymentResult && (
              <div
                style={{
                  padding: 16,
                  background: 'rgba(236, 253, 245, 0.7)',
                  border: '1px solid var(--gc-emerald-200)',
                  borderRadius: 'var(--gc-radius)',
                  marginBottom: 24,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ width: 18, height: 18, color: 'var(--gc-emerald-600)' }}
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--gc-emerald-700)' }}>
                    Deposit of ${(paymentResult.amount / 100).toFixed(2)} confirmed
                  </span>
                </div>
                <p style={{ margin: '8px 0 0 0', fontSize: 12, color: 'var(--gc-slate-600)' }}>
                  Receipt sent to {paymentResult.receiptEmail}
                </p>
              </div>
            )}

            {/* Trust Signals */}
            <CheckoutTrustSignals
              variant="horizontal"
              signals={[
                {
                  id: 'verified',
                  icon: 'shield',
                  label: 'Status',
                  value: 'Deposit Verified',
                  verified: true,
                },
                {
                  id: 'response',
                  icon: 'clock',
                  label: 'Expected Response',
                  value: '48-72 hours',
                  verified: true,
                },
                {
                  id: 'suppliers',
                  icon: 'check',
                  label: 'Suppliers Notified',
                  value: '3-5 Verified',
                  verified: true,
                },
              ]}
            />

            {/* View RFQ Button */}
            <div style={{ marginTop: 28 }}>
              <button
                onClick={() => router.push(`/rfqs/${createdRfqId}`)}
                className="gc-btn gc-btn-primary"
                style={{ padding: '0.85rem 2rem', fontSize: 15 }}
              >
                View Your RFQ
              </button>
              <p style={{ marginTop: 12, fontSize: 13, color: 'var(--gc-slate-500)' }}>
                Redirecting automatically in a few seconds...
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Checkout Step
  if (step === 'checkout') {
    return (
      <div className="gc-page" style={{ padding: '32px 0 48px 0' }}>
        <div className="gc-container">
          <RFQCheckout
            projectName={formData.project_name}
            materialsCount={validMaterialsCount}
            budget={formData.budget ? parseFloat(formData.budget) : null}
            deadline={formData.deadline}
            onPaymentSuccess={handlePaymentSuccess}
            onBack={handleBackToForm}
            isProcessing={loading}
          />

          {error && (
            <div className="gc-alert gc-alert-error" style={{ marginTop: 20, maxWidth: 600, marginLeft: 'auto', marginRight: 'auto' }}>
              {error}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Form Step (default)
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
            {/* Step Indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <span
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--gc-emerald-500) 0%, var(--gc-teal-500) 100%)',
                  color: 'white',
                  fontSize: 12,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                1
              </span>
              <span style={{ width: 20, height: 2, background: 'var(--gc-slate-200)', borderRadius: 1 }} />
              <span
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: 'var(--gc-slate-100)',
                  color: 'var(--gc-slate-400)',
                  fontSize: 12,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                2
              </span>
              <span style={{ marginLeft: 8, fontSize: 13, color: 'var(--gc-slate-500)', fontWeight: 600 }}>
                Step 1: Project Details
              </span>
            </div>

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

          {/* Error Message */}
          {error && (
            <div className="gc-alert gc-alert-error" style={{ marginBottom: 24 }}>
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleProceedToCheckout}>
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

            <hr className="gc-divider" />

            {/* Deposit Info Banner */}
            <div
              style={{
                padding: 16,
                background: 'linear-gradient(135deg, var(--gc-emerald-50) 0%, rgba(209, 250, 229, 0.5) 100%)',
                border: '1px solid var(--gc-emerald-200)',
                borderRadius: 'var(--gc-radius)',
                marginBottom: 24,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 'var(--gc-radius-sm)',
                    background: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                    flexShrink: 0,
                  }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ width: 18, height: 18, color: 'var(--gc-emerald-600)' }}
                  >
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                    <line x1="1" y1="10" x2="23" y2="10" />
                  </svg>
                </div>
                <div>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: 14, fontWeight: 700, color: 'var(--gc-slate-900)' }}>
                    Refundable $50 Deposit Required
                  </h3>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--gc-slate-600)', lineHeight: 1.5 }}>
                    A small deposit confirms your intent and unlocks responses from verified, pre-qualified suppliers. Fully refundable if no suitable quotes are received.
                  </p>
                </div>
              </div>
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
                    Processing...
                  </>
                ) : (
                  <>
                    Continue to Checkout
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ width: 18, height: 18, marginLeft: 4 }}
                    >
                      <polyline points="9,18 15,12 9,6" />
                    </svg>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="gc-btn gc-btn-secondary"
                style={{ padding: '0.85rem 1.5rem', fontSize: 15 }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>

        {/* Trust Signal Preview */}
        <div style={{ marginTop: 24 }}>
          <CheckoutTrustSignals variant="horizontal" showAnimation={false} />
        </div>
      </div>
    </div>
  )
}
