'use client'

import { useState } from 'react'

export type WaveNumber = 1 | 2 | 3

interface WaveBadgeProps {
  wave: WaveNumber
  /** Minutes until visible (only relevant for future waves) */
  minutesUntilVisible?: number
  size?: 'sm' | 'md' | 'lg'
}

const waveConfig: Record<WaveNumber, { label: string; color: string; bgColor: string; description: string }> = {
  1: {
    label: 'Wave 1',
    color: 'var(--gc-emerald-700)',
    bgColor: 'var(--gc-emerald-100)',
    description: 'Premium suppliers get first access (0-24 hours)',
  },
  2: {
    label: 'Wave 2',
    color: '#1d4ed8',
    bgColor: '#dbeafe',
    description: 'Standard suppliers get access (24-48 hours)',
  },
  3: {
    label: 'Wave 3',
    color: 'var(--gc-slate-600)',
    bgColor: 'var(--gc-slate-200)',
    description: 'All suppliers can view this RFQ (48+ hours)',
  },
}

const sizeStyles = {
  sm: { padding: '0.2rem 0.5rem', fontSize: '0.625rem', iconSize: 12 },
  md: { padding: '0.3rem 0.65rem', fontSize: '0.75rem', iconSize: 14 },
  lg: { padding: '0.4rem 0.85rem', fontSize: '0.875rem', iconSize: 16 },
}

export default function WaveBadge({ wave, minutesUntilVisible, size = 'md' }: WaveBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  const config = waveConfig[wave]
  const styles = sizeStyles[size]

  const formatTimeUntilVisible = (minutes: number) => {
    if (minutes <= 0) return 'Now'
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours < 24) return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
    const days = Math.floor(hours / 24)
    const remainingHours = hours % 24
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`
  }

  return (
    <div
      style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          padding: styles.padding,
          fontSize: styles.fontSize,
          fontWeight: 700,
          color: config.color,
          background: config.bgColor,
          borderRadius: 'var(--gc-radius-sm)',
          cursor: 'help',
          transition: 'all var(--gc-duration) var(--gc-ease)',
          textTransform: 'uppercase',
          letterSpacing: '0.03em',
        }}
      >
        {/* Wave icon */}
        <svg
          width={styles.iconSize}
          height={styles.iconSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M2 12h2c2 0 3-2 5-2s3 2 5 2 3-2 5-2 3 2 5 2h2" />
          <path d="M2 6h2c2 0 3-2 5-2s3 2 5 2 3-2 5-2 3 2 5 2h2" />
          <path d="M2 18h2c2 0 3-2 5-2s3 2 5 2 3-2 5-2 3 2 5 2h2" />
        </svg>
        {config.label}
        {minutesUntilVisible !== undefined && minutesUntilVisible > 0 && (
          <span
            style={{
              marginLeft: '0.15rem',
              padding: '0.1rem 0.3rem',
              fontSize: `calc(${styles.fontSize} * 0.9)`,
              background: 'rgba(0, 0, 0, 0.1)',
              borderRadius: '3px',
            }}
          >
            {formatTimeUntilVisible(minutesUntilVisible)}
          </span>
        )}
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 8px)',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '0.65rem 0.85rem',
            background: 'var(--gc-slate-900)',
            color: 'white',
            fontSize: '0.75rem',
            fontWeight: 500,
            lineHeight: 1.4,
            borderRadius: 'var(--gc-radius)',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
            whiteSpace: 'nowrap',
            zIndex: 100,
            animation: 'gc-fade-in 0.2s var(--gc-ease)',
          }}
        >
          {config.description}
          {/* Arrow */}
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: '6px solid var(--gc-slate-900)',
            }}
          />
        </div>
      )}
    </div>
  )
}

export { WaveBadge }
