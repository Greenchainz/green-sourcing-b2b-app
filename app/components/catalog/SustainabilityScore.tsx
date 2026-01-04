'use client'

export interface SustainabilityScoreProps {
  /** Overall sustainability score 0-100 */
  score: number
  /** LEED points contribution */
  leedPoints?: number
  /** Carbon footprint in kg CO2e */
  carbonFootprint?: number
  /** EPD availability */
  hasEpd?: boolean
  /** Recycled content percentage */
  recycledContent?: number
  /** Display variant */
  variant?: 'compact' | 'detailed' | 'minimal'
  /** Size */
  size?: 'sm' | 'md' | 'lg'
  /** Show breakdown metrics */
  showBreakdown?: boolean
  /** Additional class names */
  className?: string
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'var(--gc-emerald-500)'
  if (score >= 60) return 'var(--gc-teal-500)'
  if (score >= 40) return '#f59e0b'
  return '#ef4444'
}

function getScoreLabel(score: number): string {
  if (score >= 90) return 'Excellent'
  if (score >= 75) return 'Very Good'
  if (score >= 60) return 'Good'
  if (score >= 40) return 'Fair'
  return 'Needs Improvement'
}

export default function SustainabilityScore({
  score,
  leedPoints,
  carbonFootprint,
  hasEpd,
  recycledContent,
  variant = 'compact',
  size = 'md',
  showBreakdown = false,
  className = '',
}: SustainabilityScoreProps) {
  const color = getScoreColor(score)
  const label = getScoreLabel(score)

  const sizes = {
    sm: { ring: 48, stroke: 4, fontSize: '0.875rem', labelSize: '0.6rem' },
    md: { ring: 64, stroke: 5, fontSize: '1.125rem', labelSize: '0.65rem' },
    lg: { ring: 80, stroke: 6, fontSize: '1.5rem', labelSize: '0.75rem' },
  }

  const s = sizes[size]
  const radius = (s.ring - s.stroke) / 2
  const circumference = 2 * Math.PI * radius
  const progress = ((100 - score) / 100) * circumference

  if (variant === 'minimal') {
    return (
      <div
        className={className}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: color,
          }}
        />
        <span
          style={{
            fontSize: '0.875rem',
            fontWeight: 700,
            color: 'var(--gc-slate-700)',
          }}
        >
          {score}
        </span>
      </div>
    )
  }

  return (
    <div className={`gc-sustainability-score ${className}`}>
      <div
        style={{
          display: 'flex',
          alignItems: variant === 'detailed' ? 'flex-start' : 'center',
          gap: variant === 'detailed' ? '1.25rem' : '0.75rem',
          flexWrap: variant === 'detailed' ? 'wrap' : 'nowrap',
        }}
      >
        {/* Circular Progress */}
        <div
          style={{
            position: 'relative',
            width: s.ring,
            height: s.ring,
            flexShrink: 0,
          }}
        >
          <svg
            width={s.ring}
            height={s.ring}
            style={{ transform: 'rotate(-90deg)' }}
          >
            {/* Background circle */}
            <circle
              cx={s.ring / 2}
              cy={s.ring / 2}
              r={radius}
              fill="none"
              stroke="var(--gc-slate-100)"
              strokeWidth={s.stroke}
            />
            {/* Progress circle */}
            <circle
              cx={s.ring / 2}
              cy={s.ring / 2}
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth={s.stroke}
              strokeDasharray={circumference}
              strokeDashoffset={progress}
              strokeLinecap="round"
              style={{
                transition: 'stroke-dashoffset 0.6s var(--gc-ease)',
              }}
            />
          </svg>
          {/* Score number */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
            }}
          >
            <span
              style={{
                fontSize: s.fontSize,
                fontWeight: 900,
                color: 'var(--gc-slate-900)',
                lineHeight: 1,
              }}
            >
              {score}
            </span>
            {variant !== 'compact' && (
              <span
                style={{
                  fontSize: s.labelSize,
                  fontWeight: 600,
                  color: 'var(--gc-slate-500)',
                  marginTop: 2,
                }}
              >
                /100
              </span>
            )}
          </div>
        </div>

        {/* Label & Details */}
        {variant === 'compact' && (
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: '0.75rem',
                fontWeight: 800,
                color: 'var(--gc-slate-500)',
                textTransform: 'uppercase',
                letterSpacing: '0.03em',
              }}
            >
              Sustainability
            </div>
            <div
              style={{
                fontSize: '0.875rem',
                fontWeight: 700,
                color,
                marginTop: 2,
              }}
            >
              {label}
            </div>
          </div>
        )}

        {variant === 'detailed' && (
          <div style={{ flex: 1, minWidth: 200 }}>
            <div
              style={{
                fontSize: '0.6875rem',
                fontWeight: 800,
                color: 'var(--gc-slate-500)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                marginBottom: 4,
              }}
            >
              Sustainability Score
            </div>
            <div
              style={{
                fontSize: '1.125rem',
                fontWeight: 800,
                color,
                marginBottom: 8,
              }}
            >
              {label}
            </div>

            {/* Breakdown Metrics */}
            {showBreakdown && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '0.5rem 1rem',
                }}
              >
                {leedPoints !== undefined && (
                  <MetricItem
                    label="LEED Points"
                    value={`${leedPoints}`}
                    icon={
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    }
                  />
                )}
                {carbonFootprint !== undefined && (
                  <MetricItem
                    label="Carbon"
                    value={`${carbonFootprint} kg`}
                    icon={
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
                      </svg>
                    }
                  />
                )}
                {hasEpd !== undefined && (
                  <MetricItem
                    label="EPD"
                    value={hasEpd ? 'Verified' : 'Pending'}
                    icon={
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                        <polyline points="10 9 9 9 8 9" />
                      </svg>
                    }
                    verified={hasEpd}
                  />
                )}
                {recycledContent !== undefined && (
                  <MetricItem
                    label="Recycled"
                    value={`${recycledContent}%`}
                    icon={
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                        <path d="M3 3v5h5" />
                        <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                        <path d="M16 16h5v5" />
                      </svg>
                    }
                  />
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function MetricItem({
  label,
  value,
  icon,
  verified,
}: {
  label: string
  value: string
  icon: React.ReactNode
  verified?: boolean
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
      }}
    >
      <div
        style={{
          width: 24,
          height: 24,
          borderRadius: 'var(--gc-radius-sm)',
          background: verified === false ? 'var(--gc-slate-100)' : 'var(--gc-emerald-50)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: verified === false ? 'var(--gc-slate-400)' : 'var(--gc-emerald-600)',
          flexShrink: 0,
        }}
      >
        <span style={{ width: 14, height: 14 }}>{icon}</span>
      </div>
      <div>
        <div
          style={{
            fontSize: '0.625rem',
            fontWeight: 700,
            color: 'var(--gc-slate-500)',
            textTransform: 'uppercase',
            letterSpacing: '0.02em',
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: '0.8125rem',
            fontWeight: 700,
            color: verified === false ? 'var(--gc-slate-400)' : 'var(--gc-slate-900)',
          }}
        >
          {value}
        </div>
      </div>
    </div>
  )
}

// Compact scorecard for cards
export function ScoreBar({
  score,
  className = '',
}: {
  score: number
  className?: string
}) {
  const color = getScoreColor(score)

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
      }}
    >
      <div
        style={{
          flex: 1,
          height: 6,
          background: 'var(--gc-slate-100)',
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${score}%`,
            height: '100%',
            background: `linear-gradient(90deg, ${color}, ${color}cc)`,
            borderRadius: 3,
            transition: 'width 0.5s var(--gc-ease)',
          }}
        />
      </div>
      <span
        style={{
          fontSize: '0.75rem',
          fontWeight: 800,
          color: 'var(--gc-slate-700)',
          minWidth: 24,
        }}
      >
        {score}
      </span>
    </div>
  )
}
