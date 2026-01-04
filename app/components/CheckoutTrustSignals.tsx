'use client'

import { useState, useEffect } from 'react'

export type TrustSignal = {
  id: string
  icon: 'linkedin' | 'deposit' | 'clock' | 'shield' | 'check'
  label: string
  value: string
  verified: boolean
  tooltip?: string
}

export interface CheckoutTrustSignalsProps {
  signals?: TrustSignal[]
  variant?: 'horizontal' | 'vertical'
  showAnimation?: boolean
  className?: string
}

const DEFAULT_SIGNALS: TrustSignal[] = [
  {
    id: 'linkedin',
    icon: 'linkedin',
    label: 'Identity Verified',
    value: 'LinkedIn Connected',
    verified: true,
    tooltip: 'Your professional identity has been verified via LinkedIn',
  },
  {
    id: 'deposit',
    icon: 'deposit',
    label: 'Deposit Protection',
    value: '$50 Refundable',
    verified: true,
    tooltip: 'Your deposit is fully refundable if no quotes are received',
  },
  {
    id: 'response',
    icon: 'clock',
    label: 'Response Window',
    value: '48-72 hours',
    verified: true,
    tooltip: 'Verified suppliers typically respond within this timeframe',
  },
]

const IconComponents = {
  linkedin: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="gc-trust-signal-svg">
      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
    </svg>
  ),
  deposit: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="gc-trust-signal-svg">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  ),
  clock: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="gc-trust-signal-svg">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12,6 12,12 16,14" />
    </svg>
  ),
  shield: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="gc-trust-signal-svg">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  ),
  check: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="gc-trust-signal-svg">
      <polyline points="20,6 9,17 4,12" />
    </svg>
  ),
}

export default function CheckoutTrustSignals({
  signals = DEFAULT_SIGNALS,
  variant = 'horizontal',
  showAnimation = true,
  className,
}: CheckoutTrustSignalsProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isHorizontal = variant === 'horizontal'

  return (
    <div
      className={[
        'gc-checkout-trust',
        isHorizontal ? 'gc-checkout-trust--horizontal' : 'gc-checkout-trust--vertical',
        className || '',
      ]
        .filter(Boolean)
        .join(' ')}
      role="region"
      aria-label="Checkout trust signals"
    >
      {/* Header */}
      <div className="gc-checkout-trust-header">
        <div className="gc-checkout-trust-icon-wrap">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        </div>
        <div>
          <h3 className="gc-checkout-trust-title">Secure RFQ Submission</h3>
          <p className="gc-checkout-trust-subtitle">
            Your request is protected by verified suppliers
          </p>
        </div>
      </div>

      {/* Trust Signals Grid */}
      <div className="gc-checkout-trust-grid">
        {signals.map((signal, index) => {
          const Icon = IconComponents[signal.icon] || IconComponents.check

          return (
            <div
              key={signal.id}
              className={[
                'gc-trust-signal',
                signal.verified ? 'gc-trust-signal--verified' : '',
                showAnimation && mounted ? `gc-animate-fade-in gc-stagger-${Math.min(index + 1, 5)}` : '',
              ]
                .filter(Boolean)
                .join(' ')}
              title={signal.tooltip}
            >
              {/* Icon */}
              <div
                className={[
                  'gc-trust-signal-icon',
                  signal.verified ? 'gc-trust-signal-icon--verified' : '',
                ].join(' ')}
              >
                <Icon />
              </div>

              {/* Content */}
              <div className="gc-trust-signal-content">
                <span className="gc-trust-signal-label">{signal.label}</span>
                <span className="gc-trust-signal-value">
                  {signal.value}
                  {signal.verified && (
                    <span className="gc-trust-signal-badge">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20,6 9,17 4,12" />
                      </svg>
                    </span>
                  )}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Security Footer */}
      <div className="gc-checkout-trust-footer">
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
        <span>256-bit SSL Encrypted • PCI Compliant • SOC 2 Type II</span>
      </div>
    </div>
  )
}
