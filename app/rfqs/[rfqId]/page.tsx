'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import TrustBadges from '@/app/components/TrustBadges'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'

interface RFQLineItem {
  id: number
  rfq_id: string
  material_name: string
  quantity: number
  unit: string
  specification?: string | null
  sort_order?: number | null
}

interface RFQ {
  id: string
  project_name: string
  description?: string | null
  deadline: string
  budget?: number | null
  status: string
  created_at: string
  materials: RFQLineItem[]
}

interface RFQResponseQuote {
  quote_id: number
  line_item_id: number
  price: number
  availability: 'available' | 'partial' | 'unavailable'
  lead_time_days?: number | null
}

interface RFQResponse {
  response_id: number
  supplier_id: number
  notes?: string | null
  created_at: string
  quotes: RFQResponseQuote[]
}

export default function RFQDetailPage() {
  const params = useParams()
  const rfqId = params.rfqId as string
  const { user, token } = useAuth()

  const [rfq, setRfq] = useState<RFQ | null>(null)
  const [responses, setResponses] = useState<RFQResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showBidForm, setShowBidForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [bidForm, setBidForm] = useState({
    quotedPrice: '',
    notes: '',
  })

  useEffect(() => {
    const fetchRFQ = async () => {
      try {
        if (!token) throw new Error('Not authenticated. Please log in first.')
        const response = await fetch(`${BACKEND_URL}/api/v1/rfqs/${rfqId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!response.ok) throw new Error('Failed to fetch RFQ')
        setRfq(await response.json())
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      }
    }

    const fetchResponses = async () => {
      try {
        if (!token) return
        const response = await fetch(
          `${BACKEND_URL}/api/v1/rfqs/${rfqId}/responses`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        if (!response.ok) return
        const data = await response.json()
        setResponses(data.responses || [])
      } catch (err) {
        console.error('Failed to fetch responses:', err)
      }
    }

    ;(async () => {
      setLoading(true)
      await fetchRFQ()
      await fetchResponses()
      setLoading(false)
    })()
  }, [rfqId, token])

  const handleSubmitBid = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      if (!token) throw new Error('Not authenticated. Please log in first.')
      if (!rfq?.materials?.length) throw new Error('RFQ has no line items to quote.')
      const price = parseFloat(bidForm.quotedPrice)
      if (Number.isNaN(price)) throw new Error('Please enter a valid price.')

      const quotes = rfq.materials.map((li) => ({
        rfq_line_item_id: li.id,
        price,
        availability: 'available' as const,
      }))

      const response = await fetch(`${BACKEND_URL}/api/v1/rfqs/${rfqId}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          quotes,
          notes: bidForm.notes || null,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to submit bid')
      }

      setShowBidForm(false)
      setBidForm({ quotedPrice: '', notes: '' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setSubmitting(false)
    }
  }

  // Status badge color
  const getStatusStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case 'open':
        return { background: 'var(--gc-emerald-100)', color: 'var(--gc-emerald-800)' }
      case 'closed':
        return { background: 'var(--gc-slate-100)', color: 'var(--gc-slate-700)' }
      case 'awarded':
        return { background: '#dbeafe', color: '#1e40af' }
      default:
        return { background: 'var(--gc-slate-100)', color: 'var(--gc-slate-600)' }
    }
  }

  if (loading) {
    return (
      <div className="gc-page" style={{ padding: 48 }}>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div className="gc-spinner" />
        </div>
      </div>
    )
  }

  if (!rfq) {
    return (
      <div className="gc-page" style={{ padding: 48 }}>
        <div className="gc-container" style={{ maxWidth: 600, textAlign: 'center' }}>
          <div className="gc-card" style={{ padding: 32 }}>
            <h1
              style={{
                fontSize: 24,
                fontWeight: 800,
                color: 'var(--gc-slate-900)',
                marginBottom: 8,
              }}
            >
              RFQ Not Found
            </h1>
            <p style={{ color: 'var(--gc-slate-600)', margin: 0 }}>
              The requested RFQ could not be found or you don&apos;t have access.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="gc-page" style={{ padding: '32px 0 48px 0' }}>
      <div className="gc-container" style={{ maxWidth: 960 }}>
        {/* Trust Badges */}
        <div style={{ marginBottom: 20 }}>
          <TrustBadges variant="compact" size="sm" />
        </div>

        {/* Header Card */}
        <div
          className="gc-card gc-animate-fade-in"
          style={{ padding: 24, marginBottom: 20 }}
        >
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 16,
            }}
          >
            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: 28,
                  fontWeight: 900,
                  color: 'var(--gc-slate-900)',
                }}
              >
                {rfq.project_name}
              </h1>
              <div
                style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10 }}
              >
                <span
                  style={{
                    display: 'inline-block',
                    padding: '4px 12px',
                    borderRadius: 9999,
                    fontSize: 12,
                    fontWeight: 700,
                    textTransform: 'capitalize',
                    ...getStatusStyle(rfq.status),
                  }}
                >
                  {rfq.status}
                </span>
                {rfq.deadline && (
                  <span style={{ fontSize: 13, color: 'var(--gc-slate-600)' }}>
                    Deadline: {new Date(rfq.deadline).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>

            {rfq.budget && (
              <div style={{ textAlign: 'right' }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: 28,
                    fontWeight: 900,
                    color: 'var(--gc-emerald-700)',
                  }}
                >
                  ${rfq.budget.toLocaleString()}
                </p>
                <p
                  style={{
                    margin: '4px 0 0 0',
                    fontSize: 12,
                    color: 'var(--gc-slate-500)',
                  }}
                >
                  Estimated Budget
                </p>
              </div>
            )}
          </div>

          {rfq.description && (
            <>
              <hr className="gc-divider" />
              <div>
                <h3
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: 'var(--gc-slate-700)',
                    marginBottom: 8,
                  }}
                >
                  Description
                </h3>
                <p
                  style={{
                    margin: 0,
                    fontSize: 14,
                    color: 'var(--gc-slate-600)',
                    lineHeight: 1.6,
                  }}
                >
                  {rfq.description}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Materials Card */}
        <div
          className="gc-card gc-animate-fade-in gc-stagger-1"
          style={{ padding: 24, marginBottom: 20 }}
        >
          <h2
            style={{
              margin: '0 0 16px 0',
              fontSize: 18,
              fontWeight: 800,
              color: 'var(--gc-slate-900)',
            }}
          >
            Required Materials
          </h2>
          <div style={{ display: 'grid', gap: 10 }}>
            {rfq.materials.map((material, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: 14,
                  background: 'var(--gc-slate-50)',
                  borderRadius: 'var(--gc-radius)',
                  border: '1px solid var(--gc-slate-100)',
                }}
              >
                <div>
                  <p
                    style={{
                      margin: 0,
                      fontWeight: 700,
                      color: 'var(--gc-slate-900)',
                    }}
                  >
                    {material.material_name}
                  </p>
                  {material.specification && (
                    <p
                      style={{
                        margin: '4px 0 0 0',
                        fontSize: 13,
                        color: 'var(--gc-slate-500)',
                      }}
                    >
                      {material.specification}
                    </p>
                  )}
                </div>
                <p
                  style={{
                    margin: 0,
                    fontWeight: 700,
                    color: 'var(--gc-slate-700)',
                  }}
                >
                  {material.quantity} {material.unit}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Bids Card */}
        <div
          className="gc-card gc-animate-fade-in gc-stagger-2"
          style={{ padding: 24 }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 20,
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: 18,
                fontWeight: 800,
                color: 'var(--gc-slate-900)',
              }}
            >
              Bids Received ({responses.length})
            </h2>
            {user && rfq.status === 'open' && (
              <button
                onClick={() => setShowBidForm(!showBidForm)}
                className="gc-btn gc-btn-primary"
                style={{ padding: '0.55rem 1rem' }}
              >
                {showBidForm ? 'Cancel' : 'Submit Bid'}
              </button>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="gc-alert gc-alert-error" style={{ marginBottom: 20 }}>
              {error}
            </div>
          )}

          {/* Bid Form */}
          {showBidForm && user && (
            <form
              onSubmit={handleSubmitBid}
              className="gc-card"
              style={{
                padding: 20,
                marginBottom: 24,
                background: 'rgba(236, 253, 245, 0.6)',
              }}
            >
              <div className="gc-form-group">
                <label className="gc-label gc-label-required">
                  Your Quote (USD per line item)
                </label>
                <input
                  type="number"
                  required
                  step="0.01"
                  value={bidForm.quotedPrice}
                  onChange={(e) =>
                    setBidForm({ ...bidForm, quotedPrice: e.target.value })
                  }
                  className="gc-input"
                  placeholder="0.00"
                />
              </div>
              <div className="gc-form-group" style={{ marginBottom: 0 }}>
                <label className="gc-label">Notes</label>
                <textarea
                  value={bidForm.notes}
                  onChange={(e) => setBidForm({ ...bidForm, notes: e.target.value })}
                  rows={3}
                  className="gc-textarea"
                  placeholder="Special conditions, certifications, lead time, etc."
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="gc-btn gc-btn-primary"
                style={{ marginTop: 16, width: '100%' }}
              >
                {submitting ? 'Submitting...' : 'Submit Bid'}
              </button>
            </form>
          )}

          {/* Responses List */}
          <div style={{ display: 'grid', gap: 14 }}>
            {responses.length === 0 ? (
              <p style={{ color: 'var(--gc-slate-500)', textAlign: 'center', padding: 24 }}>
                No bids yet. Be the first to submit!
              </p>
            ) : (
              responses.map((response) => (
                <div
                  key={response.response_id}
                  style={{
                    padding: 16,
                    border: '1px solid var(--gc-slate-200)',
                    borderRadius: 'var(--gc-radius)',
                    background: 'white',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: 10,
                    }}
                  >
                    <div>
                      <h3
                        style={{
                          margin: 0,
                          fontWeight: 700,
                          color: 'var(--gc-slate-900)',
                        }}
                      >
                        Supplier #{response.supplier_id}
                      </h3>
                      <p
                        style={{
                          margin: '4px 0 0 0',
                          fontSize: 12,
                          color: 'var(--gc-slate-500)',
                        }}
                      >
                        {new Date(response.created_at || '').toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {Array.isArray(response.quotes) && response.quotes.length > 0 && (
                    <div style={{ fontSize: 13, color: 'var(--gc-slate-700)' }}>
                      <p style={{ fontWeight: 600, margin: '0 0 6px 0' }}>Quotes:</p>
                      <ul style={{ margin: 0, paddingLeft: 20 }}>
                        {response.quotes.map((q) => (
                          <li key={q.quote_id}>
                            Line item #{q.line_item_id}:{' '}
                            <strong style={{ color: 'var(--gc-emerald-700)' }}>
                              ${q.price}
                            </strong>{' '}
                            ({q.availability})
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {response.notes && (
                    <p
                      style={{
                        marginTop: 10,
                        fontSize: 13,
                        color: 'var(--gc-slate-600)',
                        fontStyle: 'italic',
                      }}
                    >
                      &ldquo;{response.notes}&rdquo;
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
