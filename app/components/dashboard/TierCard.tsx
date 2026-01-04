'use client'

export type SupplierTier = 'free' | 'standard' | 'premium'

interface TierCardProps {
  currentTier: SupplierTier
  rfqsUsed: number
  rfqsLimit: number
  onUpgradeClick?: () => void
}

const tierConfig: Record<SupplierTier, {
  name: string
  color: string
  bgGradient: string
  iconBg: string
  benefits: string[]
}> = {
  free: {
    name: 'Free',
    color: 'var(--gc-slate-600)',
    bgGradient: 'linear-gradient(135deg, var(--gc-slate-50), var(--gc-slate-100))',
    iconBg: 'linear-gradient(135deg, var(--gc-slate-400), var(--gc-slate-500))',
    benefits: [
      'Wave 3 access only',
      '5 RFQs per month',
      'Basic profile listing',
    ],
  },
  standard: {
    name: 'Standard',
    color: '#1d4ed8',
    bgGradient: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
    iconBg: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
    benefits: [
      'Wave 2 access (24h head start)',
      '25 RFQs per month',
      'Enhanced profile with certifications',
      'Priority support',
    ],
  },
  premium: {
    name: 'Premium',
    color: 'var(--gc-emerald-700)',
    bgGradient: 'linear-gradient(135deg, var(--gc-emerald-50), var(--gc-emerald-100))',
    iconBg: 'linear-gradient(135deg, var(--gc-emerald-500), var(--gc-teal-500))',
    benefits: [
      'Wave 1 access (first to respond)',
      'Unlimited RFQs',
      'Featured supplier badge',
      'Analytics dashboard',
      'Dedicated account manager',
    ],
  },
}

export default function TierCard({ currentTier, rfqsUsed, rfqsLimit, onUpgradeClick }: TierCardProps) {
  const config = tierConfig[currentTier]
  const usagePercent = rfqsLimit > 0 ? Math.min((rfqsUsed / rfqsLimit) * 100, 100) : 0
  const isUnlimited = currentTier === 'premium'
  const isNearLimit = usagePercent >= 80
  const isAtLimit = usagePercent >= 100

  return (
    <div
      className="gc-card"
      style={{
        padding: '1.5rem',
        background: config.bgGradient,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Background decoration */}
      <div
        style={{
          position: 'absolute',
          top: -40,
          right: -40,
          width: 150,
          height: 150,
          background: config.iconBg,
          opacity: 0.08,
          borderRadius: '50%',
        }}
      />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.25rem' }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 'var(--gc-radius-lg)',
            background: config.iconBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 6px 20px ${currentTier === 'premium' ? 'rgba(16, 185, 129, 0.3)' : currentTier === 'standard' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(100, 116, 139, 0.2)'}`,
            flexShrink: 0,
          }}
        >
          {currentTier === 'premium' ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          ) : currentTier === 'standard' ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
          )}
        </div>

        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: '0.6875rem',
              fontWeight: 700,
              color: 'var(--gc-slate-500)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              marginBottom: '0.2rem',
            }}
          >
            Current Tier
          </div>
          <h3
            style={{
              margin: 0,
              fontSize: '1.5rem',
              fontWeight: 900,
              color: config.color,
              letterSpacing: '-0.01em',
            }}
          >
            {config.name}
          </h3>
        </div>
      </div>

      {/* Usage */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            marginBottom: '0.5rem',
          }}
        >
          <span
            style={{
              fontSize: '0.875rem',
              fontWeight: 600,
              color: 'var(--gc-slate-700)',
            }}
          >
            RFQs This Month
          </span>
          <span
            style={{
              fontSize: '0.9375rem',
              fontWeight: 800,
              color: isAtLimit ? '#dc2626' : isNearLimit ? '#ea580c' : 'var(--gc-slate-800)',
            }}
          >
            {rfqsUsed}
            <span style={{ color: 'var(--gc-slate-400)', fontWeight: 600 }}>
              /{isUnlimited ? '∞' : rfqsLimit}
            </span>
          </span>
        </div>

        {/* Progress bar */}
        {!isUnlimited && (
          <div
            style={{
              width: '100%',
              height: 8,
              background: 'rgba(255, 255, 255, 0.6)',
              borderRadius: 4,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${usagePercent}%`,
                height: '100%',
                background: isAtLimit
                  ? 'linear-gradient(90deg, #dc2626, #f87171)'
                  : isNearLimit
                  ? 'linear-gradient(90deg, #ea580c, #fb923c)'
                  : config.iconBg,
                borderRadius: 4,
                transition: 'width 0.4s var(--gc-ease)',
              }}
            />
          </div>
        )}

        {isAtLimit && (
          <p
            style={{
              margin: '0.5rem 0 0',
              fontSize: '0.75rem',
              color: '#dc2626',
              fontWeight: 600,
            }}
          >
            You've reached your monthly limit. Upgrade to respond to more RFQs.
          </p>
        )}
      </div>

      {/* Benefits */}
      <div style={{ marginBottom: '1.25rem' }}>
        <h4
          style={{
            margin: '0 0 0.65rem',
            fontSize: '0.75rem',
            fontWeight: 700,
            color: 'var(--gc-slate-500)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          Your Benefits
        </h4>
        <ul
          style={{
            margin: 0,
            padding: 0,
            listStyle: 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.4rem',
          }}
        >
          {config.benefits.map((benefit) => (
            <li
              key={benefit}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.8125rem',
                color: 'var(--gc-slate-700)',
                fontWeight: 500,
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke={config.color}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {benefit}
            </li>
          ))}
        </ul>
      </div>

      {/* Upgrade CTA */}
      {currentTier !== 'premium' && (
        <button
          onClick={onUpgradeClick}
          className="gc-btn gc-btn-primary"
          style={{
            width: '100%',
            padding: '0.75rem 1rem',
            fontSize: '0.9375rem',
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 15l-6-6-6 6" />
          </svg>
          Upgrade to {currentTier === 'free' ? 'Standard' : 'Premium'}
        </button>
      )}
    </div>
  )
}

export { TierCard }
