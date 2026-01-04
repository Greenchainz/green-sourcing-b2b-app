'use client'

import { useState, useEffect, useCallback, CSSProperties } from 'react'
import { loadStripe, Stripe as StripeJS } from '@stripe/stripe-js'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'

export interface DepositPaymentProps {
  onSuccess: (paymentIntentId: string, amount: number) => void
  onBack?: () => void
  token: string | null
  isProcessing?: boolean
  amount?: number // in dollars, default $25
}

export interface DepositPaymentResult {
  paymentIntentId: string
  status: 'succeeded' | 'processing' | 'requires_action'
  amount: number
  receiptEmail?: string
}

const STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'
const DEFAULT_DEPOSIT_AMOUNT = 25 // $25 deposit

// Styles
const styles: Record<string, CSSProperties> = {
  form: {
    width: '100%',
  },
  amountBox: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(20, 184, 166, 0.05) 100%)',
    border: '1px solid var(--gc-emerald-200)',
    borderRadius: 'var(--gc-radius)',
    marginBottom: 24,
  },
  amountLabel: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--gc-slate-700)',
  },
  amountValue: {
    fontSize: 24,
    fontWeight: 900,
    color: 'var(--gc-emerald-700)',
  },
  elementContainer: {
    padding: 20,
    background: 'white',
    border: '1px solid var(--gc-slate-200)',
    borderRadius: 'var(--gc-radius)',
    marginBottom: 20,
  },
  infoBox: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    padding: '14px 16px',
    background: 'var(--gc-slate-50)',
    borderRadius: 'var(--gc-radius)',
    marginBottom: 24,
  },
  infoIcon: {
    width: 18,
    height: 18,
    color: 'var(--gc-slate-500)',
    flexShrink: 0,
    marginTop: 1,
  },
  infoText: {
    fontSize: 13,
    color: 'var(--gc-slate-600)',
    lineHeight: 1.5,
  },
  buttons: {
    display: 'flex',
    gap: 12,
  },
  submitBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: '14px 24px',
  },
  submitIcon: {
    width: 18,
    height: 18,
  },
  security: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 20,
    fontSize: 12,
    color: 'var(--gc-slate-500)',
  },
  securityIcon: {
    width: 14,
    height: 14,
  },
  stripeLogo: {
    height: 16,
    width: 'auto',
  },
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
    gap: 16,
  },
  loadingText: {
    margin: 0,
    fontSize: 14,
    color: 'var(--gc-slate-600)',
  },
  error: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    padding: 40,
  },
  errorIcon: {
    width: 56,
    height: 56,
    background: 'rgba(239, 68, 68, 0.1)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  errorIconSvg: {
    width: 28,
    height: 28,
    color: '#ef4444',
  },
  errorTitle: {
    margin: '0 0 8px 0',
    fontSize: 18,
    fontWeight: 700,
    color: 'var(--gc-slate-900)',
  },
  errorText: {
    margin: '0 0 24px 0',
    fontSize: 14,
    color: 'var(--gc-slate-600)',
  },
  errorActions: {
    display: 'flex',
    gap: 12,
  },
  wrapper: {
    width: '100%',
    maxWidth: 480,
    margin: '0 auto',
  },
}

// Load Stripe outside of component to avoid recreating on every render
let stripePromise: Promise<StripeJS | null> | null = null
const getStripe = () => {
  if (!stripePromise && STRIPE_PUBLISHABLE_KEY) {
    stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY)
  }
  return stripePromise
}

// Inner payment form component (inside Elements provider)
function DepositPaymentForm({
  onSuccess,
  onBack,
  isProcessing,
  amount,
}: {
  onSuccess: (paymentIntentId: string, amount: number) => void
  onBack?: () => void
  isProcessing?: boolean
  amount: number
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [paymentReady, setPaymentReady] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      setError('Payment system not ready. Please try again.')
      return
    }

    setProcessing(true)
    setError(null)

    try {
      const { error: submitError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/rfqs/create?payment_status=success`,
        },
        redirect: 'if_required',
      })

      if (submitError) {
        setError(submitError.message || 'Payment failed. Please try again.')
        setProcessing(false)
        return
      }

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        onSuccess(paymentIntent.id, amount * 100)
      } else if (paymentIntent && paymentIntent.status === 'processing') {
        onSuccess(paymentIntent.id, amount * 100)
      } else {
        setError('Payment was not completed. Please try again.')
        setProcessing(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
      setProcessing(false)
    }
  }

  const isSubmitting = processing || isProcessing

  return (
    <div style={styles.form}>
      <form onSubmit={handleSubmit}>
        {/* Amount Display */}
        <div style={styles.amountBox}>
          <span style={styles.amountLabel}>Refundable Deposit</span>
          <span style={styles.amountValue}>${amount.toFixed(2)}</span>
        </div>

        {/* Stripe Payment Element */}
        <div style={styles.elementContainer}>
          <PaymentElement
            onReady={() => setPaymentReady(true)}
            options={{
              layout: 'tabs',
            }}
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="gc-alert gc-alert-error" style={{ marginTop: 16 }}>
            {error}
          </div>
        )}

        {/* Deposit Info */}
        <div style={styles.infoBox}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={styles.infoIcon}
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <span style={styles.infoText}>
            Your deposit confirms your intent and unlocks verified supplier responses. 
            Fully refundable if no suitable quotes are received within 14 days.
          </span>
        </div>

        {/* Buttons */}
        <div style={styles.buttons}>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              disabled={isSubmitting}
              className="gc-btn gc-btn-secondary"
            >
              Back
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting || !stripe || !paymentReady}
            className="gc-btn gc-btn-primary"
            style={styles.submitBtn}
          >
            {isSubmitting ? (
              <>
                <span className="gc-spinner" style={{ width: 18, height: 18 }} />
                Processing...
              </>
            ) : (
              <>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={styles.submitIcon}
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Pay ${amount.toFixed(2)} Deposit
              </>
            )}
          </button>
        </div>

        {/* Security Footer */}
        <div style={styles.security as CSSProperties}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={styles.securityIcon}
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span>Secured by</span>
          <svg viewBox="0 0 60 25" style={styles.stripeLogo}>
            <path
              fill="#635bff"
              d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95l.59 3.14c-1.16.67-2.88 1.16-4.93 1.16-4.91 0-7.63-2.88-7.63-7.43 0-4.05 2.46-7.57 7.03-7.57 4.35 0 5.91 3.4 5.91 6.73 0 .77-.08 1.73-.16 2.37zm-4.35-2.95c0-1.21-.49-2.95-2.21-2.95-1.6 0-2.37 1.66-2.46 2.95h4.67zm-9.47 7.28h-4.74V5.73h4.74v13.88zm-7.11 0h-4.74V.69h4.74v18.92zm-6.15-7.63c0 4.42-2.95 7.87-7.24 7.87-4.26 0-7.13-3.37-7.13-7.8 0-4.35 2.95-7.8 7.16-7.8 4.34 0 7.21 3.37 7.21 7.73zm-4.75.04c0-2.3-1.12-4.05-2.46-4.05-1.37 0-2.43 1.73-2.43 4.05 0 2.34 1.03 4.11 2.43 4.11 1.34 0 2.46-1.8 2.46-4.11zm-10.28 7.59h-4.31l-.16-1.36c-.93.93-2.27 1.6-3.88 1.6-3.4 0-4.88-2.34-4.88-4.93 0-4.35 3.13-5.44 6.89-5.44.67 0 1.45.04 2.08.12 0-1.16-.45-2.18-2.27-2.18-1.37 0-2.8.41-3.93.93L5.14 4.03c1.41-.67 3.4-1.2 5.73-1.2 4.88 0 6.15 2.59 6.15 6.28l-.04 9.5zM13.9 16.03v-2.87c-.41-.04-.89-.04-1.36-.04-1.77 0-2.87.53-2.87 1.97 0 1.12.67 1.73 1.77 1.73.97 0 1.86-.33 2.46-.79z"
            />
          </svg>
        </div>
      </form>
    </div>
  )
}

// Main component wrapper
export default function DepositPayment({
  onSuccess,
  onBack,
  token,
  isProcessing = false,
  amount = DEFAULT_DEPOSIT_AMOUNT,
}: DepositPaymentProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch payment intent from backend
  const createPaymentIntent = useCallback(async () => {
    if (!token) {
      setError('Authentication required. Please log in.')
      setLoading(false)
      return
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/v1/payments/rfq-deposit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: amount * 100,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to initialize payment')
      }

      const data = await response.json()
      setClientSecret(data.clientSecret)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize payment')
    } finally {
      setLoading(false)
    }
  }, [token, amount])

  useEffect(() => {
    createPaymentIntent()
  }, [createPaymentIntent])

  // Loading state
  if (loading) {
    return (
      <div style={styles.loading as CSSProperties}>
        <div className="gc-spinner" style={{ width: 32, height: 32 }} />
        <p style={styles.loadingText}>Preparing secure payment...</p>
      </div>
    )
  }

  // Error state
  if (error || !clientSecret) {
    return (
      <div style={styles.error as CSSProperties}>
        <div style={styles.errorIcon as CSSProperties}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={styles.errorIconSvg}
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
        <h3 style={styles.errorTitle}>Payment Initialization Failed</h3>
        <p style={styles.errorText}>{error || 'Unable to prepare payment. Please try again.'}</p>
        <div style={styles.errorActions}>
          <button onClick={createPaymentIntent} className="gc-btn gc-btn-primary">
            Try Again
          </button>
          {onBack && (
            <button onClick={onBack} className="gc-btn gc-btn-secondary">
              Go Back
            </button>
          )}
        </div>
      </div>
    )
  }

  // Render Stripe Elements
  const stripePromise = getStripe()

  if (!stripePromise) {
    return (
      <div style={styles.error as CSSProperties}>
        <p style={styles.errorText}>Stripe is not configured. Please contact support.</p>
      </div>
    )
  }

  return (
    <div style={styles.wrapper}>
      <Elements
        stripe={stripePromise}
        options={{
          clientSecret,
          appearance: {
            theme: 'stripe',
            variables: {
              colorPrimary: '#10b981',
              colorBackground: '#ffffff',
              colorText: '#1e293b',
              colorDanger: '#ef4444',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              borderRadius: '8px',
              spacingUnit: '4px',
            },
            rules: {
              '.Input': {
                border: '1px solid #e2e8f0',
                boxShadow: 'none',
              },
              '.Input:focus': {
                border: '2px solid #10b981',
                boxShadow: '0 0 0 3px rgba(16, 185, 129, 0.1)',
              },
              '.Label': {
                fontWeight: '600',
                color: '#475569',
              },
            },
          },
        }}
      >
        <DepositPaymentForm
          onSuccess={onSuccess}
          onBack={onBack}
          isProcessing={isProcessing}
          amount={amount}
        />
      </Elements>
    </div>
  )
}

export { DEFAULT_DEPOSIT_AMOUNT }
