'use client'

import { useState, CSSProperties } from 'react'

export interface LinkedInVerifyButtonProps {
  isVerified: boolean
  onVerify?: () => void
  compact?: boolean
  className?: string
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'

// Styles
const styles: Record<string, CSSProperties> = {
  verifiedBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 18px',
    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(20, 184, 166, 0.08) 100%)',
    border: '1px solid var(--gc-emerald-200)',
    borderRadius: 'var(--gc-radius)',
  },
  verifiedBadgeCompact: {
    padding: '8px 14px',
    gap: 8,
  },
  verifiedIcon: {
    width: 32,
    height: 32,
    background: '#0077b5',
    borderRadius: 6,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  verifiedIconCompact: {
    width: 24,
    height: 24,
    borderRadius: 4,
  },
  linkedinLogo: {
    width: 18,
    height: 18,
    color: 'white',
  },
  linkedinLogoCompact: {
    width: 14,
    height: 14,
  },
  verifiedContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  verifiedLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 14,
    fontWeight: 700,
    color: 'var(--gc-emerald-700)',
  },
  verifiedLabelCompact: {
    fontSize: 13,
  },
  checkIcon: {
    width: 14,
    height: 14,
    color: 'var(--gc-emerald-500)',
  },
  verifiedDesc: {
    fontSize: 12,
    color: 'var(--gc-slate-600)',
  },
  verifyCard: {
    padding: 24,
    background: 'linear-gradient(135deg, rgba(0, 119, 181, 0.04) 0%, rgba(0, 119, 181, 0.02) 100%)',
    border: '1px solid rgba(0, 119, 181, 0.15)',
    borderRadius: 'var(--gc-radius-lg, 12px)',
  },
  verifyCardCompact: {
    padding: 16,
  },
  verifyHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 20,
  },
  verifyHeaderCompact: {
    marginBottom: 16,
  },
  verifyIcon: {
    width: 48,
    height: 48,
    background: '#0077b5',
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    boxShadow: '0 4px 12px rgba(0, 119, 181, 0.3)',
  },
  verifyIconCompact: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  verifyInfo: {
    flex: 1,
  },
  verifyTitle: {
    margin: '0 0 6px 0',
    fontSize: 18,
    fontWeight: 800,
    color: 'var(--gc-slate-900)',
  },
  verifyTitleCompact: {
    fontSize: 15,
    marginBottom: 0,
  },
  verifyDesc: {
    margin: 0,
    fontSize: 14,
    color: 'var(--gc-slate-600)',
    lineHeight: 1.5,
  },
  verifyBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
    padding: '14px 24px',
    background: '#0077b5',
    color: 'white',
    fontSize: 15,
    fontWeight: 700,
    border: 'none',
    borderRadius: 'var(--gc-radius)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  verifyBtnIcon: {
    width: 18,
    height: 18,
  },
  verifyNote: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    margin: '14px 0 0 0',
    fontSize: 12,
    color: 'var(--gc-slate-500)',
  },
  verifyNoteIcon: {
    width: 14,
    height: 14,
    flexShrink: 0,
  },
  gateHeader: {
    marginBottom: 28,
    textAlign: 'center',
  },
  gateIcon: {
    width: 64,
    height: 64,
    margin: '0 auto 20px',
    background: 'linear-gradient(135deg, var(--gc-emerald-500) 0%, var(--gc-teal-500) 100%)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 24px rgba(16, 185, 129, 0.3)',
  },
  gateIconSvg: {
    width: 32,
    height: 32,
    color: 'white',
  },
  gateTitle: {
    margin: '0 0 12px 0',
    fontSize: 24,
    fontWeight: 900,
    color: 'var(--gc-slate-900)',
  },
  gateDesc: {
    margin: 0,
    fontSize: 15,
    color: 'var(--gc-slate-600)',
    lineHeight: 1.6,
  },
  gateBenefits: {
    marginTop: 32,
    padding: 20,
    background: 'var(--gc-slate-50)',
    borderRadius: 'var(--gc-radius)',
    textAlign: 'left',
  },
  gateBenefitsTitle: {
    margin: '0 0 12px 0',
    fontSize: 13,
    fontWeight: 700,
    color: 'var(--gc-slate-700)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  gateBenefitsList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  gateBenefitItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    fontSize: 14,
    color: 'var(--gc-slate-700)',
    padding: '8px 0',
  },
  gateBenefitIcon: {
    width: 16,
    height: 16,
    color: 'var(--gc-emerald-500)',
    flexShrink: 0,
  },
  gatePassed: {
    maxWidth: 480,
    margin: '0 auto',
    padding: 24,
    textAlign: 'center',
  },
}

export default function LinkedInVerifyButton({
  isVerified,
  onVerify,
  compact = false,
  className,
}: LinkedInVerifyButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleVerify = async () => {
    if (isVerified) return

    setIsLoading(true)

    try {
      const redirectUri = `${window.location.origin}/login/callback?provider=linkedin`
      const authUrl = `${BACKEND_URL}/api/v1/auth/linkedin/auth?redirect_uri=${encodeURIComponent(redirectUri)}`
      
      sessionStorage.setItem('linkedin_verify_return', window.location.pathname)
      
      window.location.href = authUrl
    } catch (error) {
      console.error('LinkedIn verification error:', error)
      setIsLoading(false)
    }

    if (onVerify) {
      onVerify()
    }
  }

  // Verified Badge State
  if (isVerified) {
    const badgeStyle: CSSProperties = {
      ...styles.verifiedBadge,
      ...(compact ? styles.verifiedBadgeCompact : {}),
    }
    const iconStyle: CSSProperties = {
      ...styles.verifiedIcon,
      ...(compact ? styles.verifiedIconCompact : {}),
    }
    const logoStyle: CSSProperties = {
      ...styles.linkedinLogo,
      ...(compact ? styles.linkedinLogoCompact : {}),
    }
    const labelStyle: CSSProperties = {
      ...styles.verifiedLabel,
      ...(compact ? styles.verifiedLabelCompact : {}),
    }

    return (
      <div className={className || ''} style={{ display: 'inline-flex' }}>
        <div style={badgeStyle}>
          <div style={iconStyle}>
            <svg viewBox="0 0 24 24" fill="currentColor" style={logoStyle}>
              <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
            </svg>
          </div>
          <div style={styles.verifiedContent as CSSProperties}>
            <span style={labelStyle}>
              LinkedIn Verified
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={styles.checkIcon}
              >
                <polyline points="20,6 9,17 4,12" />
              </svg>
            </span>
            {!compact && (
              <span style={styles.verifiedDesc}>Professional identity confirmed</span>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Verify Button State
  const cardStyle: CSSProperties = {
    ...styles.verifyCard,
    ...(compact ? styles.verifyCardCompact : {}),
  }
  const headerStyle: CSSProperties = {
    ...styles.verifyHeader,
    ...(compact ? styles.verifyHeaderCompact : {}),
  }
  const iconContainerStyle: CSSProperties = {
    ...styles.verifyIcon,
    ...(compact ? styles.verifyIconCompact : {}),
  }
  const logoStyle: CSSProperties = {
    ...styles.linkedinLogo,
    ...(compact ? { width: 18, height: 18 } : { width: 24, height: 24 }),
  }
  const titleStyle: CSSProperties = {
    ...styles.verifyTitle,
    ...(compact ? styles.verifyTitleCompact : {}),
  }

  return (
    <div className={className || ''} style={{ width: '100%' }}>
      <div style={cardStyle}>
        <div style={headerStyle}>
          <div style={iconContainerStyle}>
            <svg viewBox="0 0 24 24" fill="currentColor" style={logoStyle}>
              <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
            </svg>
          </div>
          <div style={styles.verifyInfo}>
            <h3 style={titleStyle}>Verify Your Identity</h3>
            {!compact && (
              <p style={styles.verifyDesc}>
                Connect your LinkedIn to verify your professional identity. This builds trust with suppliers.
              </p>
            )}
          </div>
        </div>

        <button
          onClick={handleVerify}
          disabled={isLoading}
          style={{
            ...styles.verifyBtn,
            opacity: isLoading ? 0.7 : 1,
            cursor: isLoading ? 'not-allowed' : 'pointer',
          }}
        >
          {isLoading ? (
            <>
              <span className="gc-spinner" style={{ width: 16, height: 16 }} />
              Connecting...
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" fill="currentColor" style={styles.verifyBtnIcon}>
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
              </svg>
              Verify with LinkedIn
            </>
          )}
        </button>

        <p style={styles.verifyNote as CSSProperties}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={styles.verifyNoteIcon}
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span>We only read basic profile info. We never post on your behalf.</span>
        </p>
      </div>
    </div>
  )
}

// Gate Component - blocks progress until verified
export function LinkedInVerificationGate({
  isVerified,
  children,
  onContinueAction,
}: {
  isVerified: boolean
  children?: React.ReactNode
  onContinueAction?: () => void
}) {
  if (!isVerified) {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', padding: 32, textAlign: 'center' }}>
        <div style={styles.gateHeader as CSSProperties}>
          <div style={styles.gateIcon as CSSProperties}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={styles.gateIconSvg}
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </div>
          <h2 style={styles.gateTitle}>Professional Verification Required</h2>
          <p style={styles.gateDesc}>
            To ensure quality RFQ submissions, we verify all requestors through their LinkedIn professional profile. This takes less than 30 seconds.
          </p>
        </div>

        <LinkedInVerifyButton isVerified={false} />

        <div style={styles.gateBenefits as CSSProperties}>
          <h4 style={styles.gateBenefitsTitle as CSSProperties}>Why verify?</h4>
          <ul style={styles.gateBenefitsList}>
            <li style={styles.gateBenefitItem}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                style={styles.gateBenefitIcon}
              >
                <polyline points="20,6 9,17 4,12" />
              </svg>
              Suppliers respond 3x faster to verified requests
            </li>
            <li style={styles.gateBenefitItem}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                style={styles.gateBenefitIcon}
              >
                <polyline points="20,6 9,17 4,12" />
              </svg>
              Access to premium pre-qualified suppliers
            </li>
            <li style={styles.gateBenefitItem}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                style={styles.gateBenefitIcon}
              >
                <polyline points="20,6 9,17 4,12" />
              </svg>
              Build trusted reputation for future RFQs
            </li>
          </ul>
        </div>
      </div>
    )
  }

  // Verified - show children with confirmation
  return (
    <div style={styles.gatePassed as CSSProperties}>
      <LinkedInVerifyButton isVerified={true} />
      
      {children}

      {onContinueAction && (
        <button 
          onClick={onContinueAction} 
          className="gc-btn gc-btn-primary" 
          style={{ marginTop: 20, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
        >
          Continue to Deposit
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ width: 18, height: 18 }}
          >
            <polyline points="9,18 15,12 9,6" />
          </svg>
        </button>
      )}
    </div>
  )
}
