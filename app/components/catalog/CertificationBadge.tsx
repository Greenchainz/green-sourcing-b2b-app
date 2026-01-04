'use client'

interface CertificationBadgeProps {
  certification: string
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

const CERT_CONFIG: Record<string, { color: string; bgColor: string; label: string; icon: string }> = {
  LEED: {
    color: 'var(--gc-emerald-700)',
    bgColor: 'var(--gc-emerald-100)',
    label: 'LEED Certified',
    icon: '🌿',
  },
  FSC: {
    color: 'var(--gc-teal-700)',
    bgColor: 'rgba(20, 184, 166, 0.15)',
    label: 'FSC Certified',
    icon: '🌲',
  },
  EPD: {
    color: '#1e40af',
    bgColor: 'rgba(59, 130, 246, 0.12)',
    label: 'EPD Verified',
    icon: '📊',
  },
  'ENERGY STAR': {
    color: '#7c3aed',
    bgColor: 'rgba(139, 92, 246, 0.12)',
    label: 'ENERGY STAR',
    icon: '⭐',
  },
  GREENGUARD: {
    color: 'var(--gc-emerald-800)',
    bgColor: 'var(--gc-emerald-50)',
    label: 'GREENGUARD',
    icon: '🛡️',
  },
  'CRADLE TO CRADLE': {
    color: '#059669',
    bgColor: 'rgba(5, 150, 105, 0.12)',
    label: 'C2C Certified',
    icon: '♻️',
  },
  DECLARE: {
    color: '#b45309',
    bgColor: 'rgba(245, 158, 11, 0.12)',
    label: 'Declare Label',
    icon: '📋',
  },
  LBC: {
    color: '#0d9488',
    bgColor: 'rgba(20, 184, 166, 0.12)',
    label: 'Living Building',
    icon: '🏛️',
  },
}

const SIZE_CLASSES = {
  sm: { padding: '0.2rem 0.5rem', fontSize: '0.65rem', iconSize: '0.7rem' },
  md: { padding: '0.3rem 0.65rem', fontSize: '0.75rem', iconSize: '0.85rem' },
  lg: { padding: '0.4rem 0.85rem', fontSize: '0.85rem', iconSize: '1rem' },
}

export default function CertificationBadge({
  certification,
  size = 'md',
  showLabel = true,
}: CertificationBadgeProps) {
  const config = CERT_CONFIG[certification.toUpperCase()] || {
    color: 'var(--gc-slate-700)',
    bgColor: 'var(--gc-slate-100)',
    label: certification,
    icon: '✓',
  }

  const sizeStyles = SIZE_CLASSES[size]

  return (
    <span
      className="gc-cert-badge"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        padding: sizeStyles.padding,
        fontSize: sizeStyles.fontSize,
        fontWeight: 700,
        color: config.color,
        background: config.bgColor,
        borderRadius: 'var(--gc-radius-sm)',
        textTransform: 'uppercase',
        letterSpacing: '0.02em',
        whiteSpace: 'nowrap',
        transition: 'transform var(--gc-duration) var(--gc-ease), box-shadow var(--gc-duration) var(--gc-ease)',
      }}
    >
      <span style={{ fontSize: sizeStyles.iconSize }}>{config.icon}</span>
      {showLabel && <span>{config.label}</span>}
    </span>
  )
}

// Export a list of common certifications for filtering
export const CERTIFICATIONS = [
  'LEED',
  'FSC',
  'EPD',
  'ENERGY STAR',
  'GREENGUARD',
  'CRADLE TO CRADLE',
  'DECLARE',
  'LBC',
] as const

export type CertificationType = (typeof CERTIFICATIONS)[number]
