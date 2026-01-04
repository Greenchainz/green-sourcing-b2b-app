'use client'

import Image from 'next/image'

export type CertificationType = 
  | 'leed'
  | 'fsc'
  | 'epd'
  | 'breeam'
  | 'cradle-to-cradle'
  | 'greenguard'
  | 'energy-star'
  | 'declare'

export interface CertificationBadgeProps {
  type: CertificationType
  /** Show full label or just icon */
  variant?: 'icon' | 'full'
  /** Badge size */
  size?: 'sm' | 'md' | 'lg'
  /** Whether certification is verified */
  verified?: boolean
  /** Additional class names */
  className?: string
}

const CERTIFICATION_DATA: Record<CertificationType, {
  label: string
  shortLabel: string
  icon: string
  color: string
  bgColor: string
}> = {
  leed: {
    label: 'LEED Certified',
    shortLabel: 'LEED',
    icon: '/trust/leed.png',
    color: 'var(--gc-emerald-700)',
    bgColor: 'var(--gc-emerald-50)',
  },
  fsc: {
    label: 'FSC Certified',
    shortLabel: 'FSC',
    icon: '/trust/fsc.png',
    color: 'var(--gc-emerald-700)',
    bgColor: 'var(--gc-emerald-50)',
  },
  epd: {
    label: 'EPD Verified',
    shortLabel: 'EPD',
    icon: '/trust/epd.png',
    color: 'var(--gc-teal-700)',
    bgColor: 'rgba(20, 184, 166, 0.1)',
  },
  breeam: {
    label: 'BREEAM Certified',
    shortLabel: 'BREEAM',
    icon: '/trust/breeam.svg',
    color: 'var(--gc-emerald-700)',
    bgColor: 'var(--gc-emerald-50)',
  },
  'cradle-to-cradle': {
    label: 'Cradle to Cradle',
    shortLabel: 'C2C',
    icon: '/trust/leed.png', // Fallback
    color: '#8b5cf6',
    bgColor: 'rgba(139, 92, 246, 0.1)',
  },
  greenguard: {
    label: 'GREENGUARD Gold',
    shortLabel: 'GG',
    icon: '/trust/leed.png', // Fallback
    color: '#059669',
    bgColor: 'var(--gc-emerald-50)',
  },
  'energy-star': {
    label: 'ENERGY STAR',
    shortLabel: 'E★',
    icon: '/trust/leed.png', // Fallback
    color: '#2563eb',
    bgColor: 'rgba(37, 99, 235, 0.1)',
  },
  declare: {
    label: 'Declare Label',
    shortLabel: 'DEC',
    icon: '/trust/leed.png', // Fallback
    color: '#dc2626',
    bgColor: 'rgba(220, 38, 38, 0.1)',
  },
}

export default function CertificationBadge({
  type,
  variant = 'full',
  size = 'md',
  verified = true,
  className = '',
}: CertificationBadgeProps) {
  const cert = CERTIFICATION_DATA[type]
  if (!cert) return null

  const sizeStyles = {
    sm: {
      padding: '0.25rem 0.5rem',
      fontSize: '0.6875rem',
      iconSize: 14,
      gap: '0.35rem',
    },
    md: {
      padding: '0.35rem 0.65rem',
      fontSize: '0.75rem',
      iconSize: 16,
      gap: '0.4rem',
    },
    lg: {
      padding: '0.5rem 0.85rem',
      fontSize: '0.8125rem',
      iconSize: 20,
      gap: '0.5rem',
    },
  }

  const s = sizeStyles[size]

  return (
    <span
      className={`gc-cert-badge ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: s.gap,
        padding: s.padding,
        background: cert.bgColor,
        borderRadius: 'var(--gc-radius-sm)',
        fontSize: s.fontSize,
        fontWeight: 700,
        color: cert.color,
        textTransform: 'uppercase',
        letterSpacing: '0.02em',
        border: verified ? `1px solid ${cert.color}20` : '1px solid transparent',
        transition: 'all var(--gc-duration) var(--gc-ease)',
      }}
      title={cert.label}
    >
      {/* Icon placeholder - could use actual icons */}
      <span
        style={{
          width: s.iconSize,
          height: s.iconSize,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {verified ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ width: '100%', height: '100%' }}
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ width: '100%', height: '100%', opacity: 0.5 }}
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
        )}
      </span>

      {variant === 'full' && (
        <span>{cert.shortLabel}</span>
      )}
    </span>
  )
}

// Export a group component for multiple badges
export function CertificationBadgeGroup({
  certifications,
  size = 'sm',
  maxVisible = 4,
  className = '',
}: {
  certifications: CertificationType[]
  size?: 'sm' | 'md' | 'lg'
  maxVisible?: number
  className?: string
}) {
  const visible = certifications.slice(0, maxVisible)
  const remaining = certifications.length - maxVisible

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.35rem',
        alignItems: 'center',
      }}
    >
      {visible.map((cert) => (
        <CertificationBadge key={cert} type={cert} size={size} variant="full" />
      ))}
      {remaining > 0 && (
        <span
          style={{
            padding: '0.25rem 0.5rem',
            background: 'var(--gc-slate-100)',
            borderRadius: 'var(--gc-radius-sm)',
            fontSize: '0.6875rem',
            fontWeight: 700,
            color: 'var(--gc-slate-600)',
          }}
        >
          +{remaining} more
        </span>
      )}
    </div>
  )
}
