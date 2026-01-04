'use client'

import { useState, useCallback } from 'react'
import CheckoutTrustSignals from './CheckoutTrustSignals'

export interface RFQCheckoutProps {
  /** Project name for display */
  projectName: string
  /** Total materials count */
  materialsCount: number
  /** Budget amount (optional) */
  budget?: number | null
  /** Deadline date string */
  deadline: string
  /** Callback when payment succeeds */
  onPaymentSuccess: (paymentIntent: StripePaymentResult) => void
  /** Callback to go back to form */
  onBack: () => void
  /** Whether checkout is processing */
  isProcessing?: boolean
}

export interface StripePaymentResult {
  paymentIntentId: string
  status: 'succeeded' | 'processing' | 'requires_action'
  amount: number
  receiptEmail?: string
}

// Deposit amount in cents
const DEPOSIT_AMOUNT_CENTS = 5000 // $50.00
const DEPOSIT_AMOUNT_DISPLAY = '$50.00'

export default function RFQCheckout({
  projectName,
  materialsCount,
  budget,
  deadline,
  onPaymentSuccess,
  onBack,
  isProcessing = false,
}: RFQCheckoutProps) {
  const [cardholderName, setCardholderName] = useState('')
  const [email, setEmail] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvc, setCvc] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [agreeToTerms, setAgreeToTerms] = useState(false)

  // Format card number with spaces
  const formatCardNumber = useCallback((value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 16)
    const groups = cleaned.match(/.{1,4}/g)
    return groups ? groups.join(' ') : cleaned
  }, [])

  // Format expiry as MM/YY
  const formatExpiry = useCallback((value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 4)
    if (cleaned.length >= 2) {
      return `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`
    }
    return cleaned
  }, [])

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCardNumber(formatCardNumber(e.target.value))
  }

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setExpiry(formatExpiry(e.target.value))
  }

  const handleCvcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))
  }

  const validateForm = (): boolean => {
    if (!cardholderName.trim()) {
      setError('Please enter the cardholder name')
      return false
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address')
      return false
    }
    if (cardNumber.replace(/\s/g, '').length < 13) {
      setError('Please enter a valid card number')
      return false
    }
    if (expiry.length < 5) {
      setError('Please enter a valid expiry date (MM/YY)')
      return false
    }
    if (cvc.length < 3) {
      setError('Please enter a valid CVC')
      return false
    }
    if (!agreeToTerms) {
      setError('Please agree to the terms and conditions')
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!validateForm()) return

    setIsSubmitting(true)

    try {
      // Simulate Stripe payment processing (client-side only)
      // In production, this would call Stripe.js to create a PaymentIntent
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Simulate successful payment
      const mockPaymentResult: StripePaymentResult = {
        paymentIntentId: `pi_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
        status: 'succeeded',
        amount: DEPOSIT_AMOUNT_CENTS,
        receiptEmail: email,
      }

      onPaymentSuccess(mockPaymentResult)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const formattedDeadline = deadline
    ? new Date(deadline).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Not specified'

  const processing = isSubmitting || isProcessing

  return (
    <div className="gc-checkout">
      {/* Header */}
      <div className="gc-checkout-header">
        <button
          type="button"
          onClick={onBack}
          className="gc-checkout-back"
          disabled={processing}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15,18 9,12 15,6" />
          </svg>
          Back to RFQ
        </button>
        <div className="gc-checkout-step-indicator">
          <span className="gc-checkout-step gc-checkout-step--completed">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <polyline points="20,6 9,17 4,12" />
            </svg>
          </span>
          <span className="gc-checkout-step-line gc-checkout-step-line--completed" />
          <span className="gc-checkout-step gc-checkout-step--active">2</span>
        </div>
      </div>

      <div className="gc-checkout-layout">
        {/* Left Column - Payment Form */}
        <div className="gc-checkout-form-section">
          <div className="gc-card" style={{ padding: 28 }}>
            <h2 className="gc-checkout-form-title">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                <line x1="1" y1="10" x2="23" y2="10" />
              </svg>
              Secure Deposit Payment
            </h2>
            <p className="gc-checkout-form-subtitle">
              A refundable {DEPOSIT_AMOUNT_DISPLAY} deposit confirms your RFQ and unlocks verified supplier responses.
            </p>

            {error && (
              <div className="gc-alert gc-alert-error" style={{ marginBottom: 20 }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Cardholder Name */}
              <div className="gc-form-group">
                <label htmlFor="cardholderName" className="gc-label gc-label-required">
                  Cardholder Name
                </label>
                <input
                  type="text"
                  id="cardholderName"
                  value={cardholderName}
                  onChange={(e) => setCardholderName(e.target.value)}
                  className="gc-input"
                  placeholder="John Smith"
                  disabled={processing}
                  autoComplete="cc-name"
                />
              </div>

              {/* Email */}
              <div className="gc-form-group">
                <label htmlFor="email" className="gc-label gc-label-required">
                  Receipt Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="gc-input"
                  placeholder="john@company.com"
                  disabled={processing}
                  autoComplete="email"
                />
              </div>

              {/* Card Number */}
              <div className="gc-form-group">
                <label htmlFor="cardNumber" className="gc-label gc-label-required">
                  Card Number
                </label>
                <div className="gc-input-with-icon">
                  <input
                    type="text"
                    id="cardNumber"
                    value={cardNumber}
                    onChange={handleCardNumberChange}
                    className="gc-input"
                    placeholder="4242 4242 4242 4242"
                    disabled={processing}
                    autoComplete="cc-number"
                    inputMode="numeric"
                  />
                  <div className="gc-card-brands">
                    <svg viewBox="0 0 38 24" className="gc-card-brand-visa">
                      <path d="M35 0H3C1.3 0 0 1.3 0 3v18c0 1.7 1.3 3 3 3h32c1.7 0 3-1.3 3-3V3c0-1.7-1.3-3-3-3z" fill="#000" opacity="0.07" />
                      <path d="M35 1c1.1 0 2 .9 2 2v18c0 1.1-.9 2-2 2H3c-1.1 0-2-.9-2-2V3c0-1.1.9-2 2-2h32" fill="#fff" />
                      <path d="M28.3 10.1H28c-.4 1-.7 1.5-1 3h1.9c-.3-1.5-.3-2.2-.6-3zm2.9 5.9h-1.7c-.1 0-.1 0-.2-.1l-.2-.9-.1-.2h-2.4c-.1 0-.2 0-.2.2l-.3.9c0 .1-.1.1-.1.1h-2.1l.2-.5L27 8.7c0-.5.3-.7.8-.7h1.5c.1 0 .2 0 .2.2l1.4 6.5c.1.4.2.7.2 1.1.1.1.1.1.1.2zm-13.4-.3l.4-1.8c.1 0 .2.1.2.1.7.3 1.4.5 2.1.4.2 0 .5-.1.7-.2.5-.2.5-.7.1-1.1-.2-.2-.5-.3-.8-.5-.4-.2-.8-.4-1.1-.7-1.2-1-.8-2.4-.1-3.1.6-.5 1.3-.8 2.1-.9h.2c.9-.1 1.7.1 2.5.5.1 0 .1.1.2.1l-.3 1.6c-.4-.2-.8-.3-1.2-.4-.3-.1-.7-.1-1 0-.3 0-.5.1-.7.2-.4.2-.4.6-.1.8.3.2.6.4 1 .6.4.2.8.4 1.1.7 1.2.9.9 2.1.3 2.9-.5.6-1.2 1-2 1.1-.2 0-.4 0-.6.1-1 .1-1.9 0-2.8-.4 0-.1-.1-.1-.1-.2zm-6.5 0l.4-1.8c.1 0 .2.1.3.1.7.3 1.4.5 2.1.4.2 0 .5-.1.7-.2.5-.2.5-.7.1-1.1-.2-.2-.5-.3-.8-.5-.4-.2-.8-.4-1.1-.7-1.2-1-.8-2.4-.1-3.1.6-.5 1.3-.8 2.1-.9h.2c.9-.1 1.7.1 2.5.5.1 0 .1.1.2.1l-.4 1.6c-.4-.2-.8-.3-1.2-.4-.3-.1-.7-.1-1 0-.3 0-.5.1-.7.2-.4.2-.4.6 0 .8.3.2.6.4 1 .6.4.2.8.4 1.1.7 1.2.9.9 2.1.3 2.9-.5.6-1.2 1-2 1.1-.2 0-.4 0-.6.1-1 .1-1.9 0-2.8-.4 0-.1-.1-.1-.1-.2zm-7.6-6.9c-.1 0-.3 0-.4.1h-.1L5 15.9c0 .1 0 .2.1.2h1.6c.4 0 .7-.3.8-.6l1.5-7.2V8c-.2-.1-.3-.1-.4-.1h-1.9z" fill="#142688" />
                    </svg>
                    <svg viewBox="0 0 38 24" className="gc-card-brand-mc">
                      <path d="M35 0H3C1.3 0 0 1.3 0 3v18c0 1.7 1.3 3 3 3h32c1.7 0 3-1.3 3-3V3c0-1.7-1.3-3-3-3z" fill="#000" opacity="0.07" />
                      <path d="M35 1c1.1 0 2 .9 2 2v18c0 1.1-.9 2-2 2H3c-1.1 0-2-.9-2-2V3c0-1.1.9-2 2-2h32" fill="#fff" />
                      <circle fill="#EB001B" cx="15" cy="12" r="7" />
                      <circle fill="#F79E1B" cx="23" cy="12" r="7" />
                      <path fill="#FF5F00" d="M22 12c0-2.4-1.2-4.5-3-5.7-1.8 1.3-3 3.4-3 5.7s1.2 4.5 3 5.7c1.8-1.2 3-3.3 3-5.7z" />
                    </svg>
                    <svg viewBox="0 0 38 24" className="gc-card-brand-amex">
                      <path d="M35 0H3C1.3 0 0 1.3 0 3v18c0 1.7 1.3 3 3 3h32c1.7 0 3-1.3 3-3V3c0-1.7-1.3-3-3-3z" fill="#000" opacity="0.07" />
                      <path d="M35 1c1.1 0 2 .9 2 2v18c0 1.1-.9 2-2 2H3c-1.1 0-2-.9-2-2V3c0-1.1.9-2 2-2h32" fill="#006FCF" />
                      <path d="M8.971 10.268l.774 1.876H8.203l.768-1.876zm16.075.078h-2.977v.827h2.929v1.239h-2.929v.916h2.977v1.262h-4.643v-5.485h4.643v1.241zm-5.4-.078l.774 1.876h-1.542l.768-1.876zm5.4-2.59l3.258 5.547V7.678h1.426l2.027 3.477 2.074-3.477h1.377v5.485h-1.283V9.674l-1.956 3.489h-1.377l-2.027-3.489v3.489h-2.691l-.691-1.633h-2.881l-.691 1.633H19.2l2.929-5.485h1.452l2.465 4.605V7.678h1.452zm-11.283 5.485H12.48l-.691-1.633H8.908l-.691 1.633H6.924l2.929-5.485h1.452l2.458 5.485z" fill="#fff" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Expiry & CVC Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="gc-form-group">
                  <label htmlFor="expiry" className="gc-label gc-label-required">
                    Expiry Date
                  </label>
                  <input
                    type="text"
                    id="expiry"
                    value={expiry}
                    onChange={handleExpiryChange}
                    className="gc-input"
                    placeholder="MM/YY"
                    disabled={processing}
                    autoComplete="cc-exp"
                    inputMode="numeric"
                  />
                </div>
                <div className="gc-form-group">
                  <label htmlFor="cvc" className="gc-label gc-label-required">
                    CVC
                  </label>
                  <input
                    type="text"
                    id="cvc"
                    value={cvc}
                    onChange={handleCvcChange}
                    className="gc-input"
                    placeholder="123"
                    disabled={processing}
                    autoComplete="cc-csc"
                    inputMode="numeric"
                  />
                </div>
              </div>

              {/* Terms Checkbox */}
              <div className="gc-form-group gc-checkbox-group">
                <label className="gc-checkbox-label">
                  <input
                    type="checkbox"
                    checked={agreeToTerms}
                    onChange={(e) => setAgreeToTerms(e.target.checked)}
                    className="gc-checkbox"
                    disabled={processing}
                  />
                  <span className="gc-checkbox-text">
                    I agree to the{' '}
                    <a href="/terms" target="_blank" rel="noopener noreferrer">
                      Terms of Service
                    </a>{' '}
                    and{' '}
                    <a href="/privacy" target="_blank" rel="noopener noreferrer">
                      Refund Policy
                    </a>
                  </span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={processing}
                className="gc-btn gc-btn-primary gc-checkout-submit"
              >
                {processing ? (
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
                    >
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    Pay {DEPOSIT_AMOUNT_DISPLAY} Deposit
                  </>
                )}
              </button>
            </form>

            {/* Powered by Stripe */}
            <div className="gc-checkout-powered-by">
              <span>Powered by</span>
              <svg viewBox="0 0 60 25" className="gc-stripe-logo">
                <path
                  fill="#635bff"
                  d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95l.59 3.14c-1.16.67-2.88 1.16-4.93 1.16-4.91 0-7.63-2.88-7.63-7.43 0-4.05 2.46-7.57 7.03-7.57 4.35 0 5.91 3.4 5.91 6.73 0 .77-.08 1.73-.16 2.37zm-4.35-2.95c0-1.21-.49-2.95-2.21-2.95-1.6 0-2.37 1.66-2.46 2.95h4.67zm-9.47 7.28h-4.74V5.73h4.74v13.88zm-7.11 0h-4.74V.69h4.74v18.92zm-6.15-7.63c0 4.42-2.95 7.87-7.24 7.87-4.26 0-7.13-3.37-7.13-7.8 0-4.35 2.95-7.8 7.16-7.8 4.34 0 7.21 3.37 7.21 7.73zm-4.75.04c0-2.3-1.12-4.05-2.46-4.05-1.37 0-2.43 1.73-2.43 4.05 0 2.34 1.03 4.11 2.43 4.11 1.34 0 2.46-1.8 2.46-4.11zm-10.28 7.59h-4.31l-.16-1.36c-.93.93-2.27 1.6-3.88 1.6-3.4 0-4.88-2.34-4.88-4.93 0-4.35 3.13-5.44 6.89-5.44.67 0 1.45.04 2.08.12 0-1.16-.45-2.18-2.27-2.18-1.37 0-2.8.41-3.93.93L5.14 4.03c1.41-.67 3.4-1.2 5.73-1.2 4.88 0 6.15 2.59 6.15 6.28l-.04 9.5zM13.9 16.03v-2.87c-.41-.04-.89-.04-1.36-.04-1.77 0-2.87.53-2.87 1.97 0 1.12.67 1.73 1.77 1.73.97 0 1.86-.33 2.46-.79z"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Right Column - Order Summary & Trust */}
        <div className="gc-checkout-summary-section">
          {/* Order Summary Card */}
          <div className="gc-card gc-checkout-summary" style={{ padding: 24, marginBottom: 20 }}>
            <h3 className="gc-checkout-summary-title">RFQ Summary</h3>
            
            <div className="gc-checkout-summary-item gc-checkout-summary-project">
              <span className="gc-checkout-summary-label">Project</span>
              <span className="gc-checkout-summary-value">{projectName}</span>
            </div>

            <div className="gc-checkout-summary-details">
              <div className="gc-checkout-summary-item">
                <span className="gc-checkout-summary-label">Materials</span>
                <span className="gc-checkout-summary-value">
                  {materialsCount} item{materialsCount !== 1 ? 's' : ''}
                </span>
              </div>
              
              {budget && (
                <div className="gc-checkout-summary-item">
                  <span className="gc-checkout-summary-label">Budget</span>
                  <span className="gc-checkout-summary-value">
                    ${budget.toLocaleString()}
                  </span>
                </div>
              )}
              
              <div className="gc-checkout-summary-item">
                <span className="gc-checkout-summary-label">Deadline</span>
                <span className="gc-checkout-summary-value">{formattedDeadline}</span>
              </div>
            </div>

            <hr className="gc-divider" />

            <div className="gc-checkout-summary-item gc-checkout-summary-total">
              <span className="gc-checkout-summary-label">Refundable Deposit</span>
              <span className="gc-checkout-summary-value">{DEPOSIT_AMOUNT_DISPLAY}</span>
            </div>

            <div className="gc-checkout-deposit-note">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              <span>
                Your deposit will be applied as credit toward your final order or refunded if no suitable quotes are received.
              </span>
            </div>
          </div>

          {/* Trust Signals */}
          <CheckoutTrustSignals variant="vertical" />
        </div>
      </div>
    </div>
  )
}
