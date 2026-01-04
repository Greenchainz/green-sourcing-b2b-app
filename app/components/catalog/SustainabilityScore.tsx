'use client'

interface SustainabilityScoreProps {
  score: number // 0-100
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  animated?: boolean
}

function getScoreConfig(score: number) {
  if (score >= 80) {
    return {
      label: 'Excellent',
      gradient: 'linear-gradient(135deg, var(--gc-emerald-500), var(--gc-teal-500))',
      bgColor: 'var(--gc-emerald-50)',
      borderColor: 'var(--gc-emerald-200)',
      textColor: 'var(--gc-emerald-700)',
    }
  }
  if (score >= 60) {
    return {
      label: 'Good',
      gradient: 'linear-gradient(135deg, var(--gc-emerald-400), #22c55e)',
      bgColor: 'rgba(34, 197, 94, 0.08)',
      borderColor: 'rgba(34, 197, 94, 0.25)',
      textColor: '#15803d',
    }
  }
  if (score >= 40) {
    return {
      label: 'Average',
      gradient: 'linear-gradient(135deg, #facc15, #eab308)',
      bgColor: 'rgba(250, 204, 21, 0.1)',
      borderColor: 'rgba(234, 179, 8, 0.3)',
      textColor: '#a16207',
    }
  }
  if (score >= 20) {
    return {
      label: 'Fair',
      gradient: 'linear-gradient(135deg, #fb923c, #f97316)',
      bgColor: 'rgba(251, 146, 60, 0.1)',
      borderColor: 'rgba(249, 115, 22, 0.3)',
      textColor: '#c2410c',
    }
  }
  return {
    label: 'Poor',
    gradient: 'linear-gradient(135deg, #f87171, #ef4444)',
    bgColor: 'rgba(248, 113, 113, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    textColor: '#b91c1c',
  }
}

const SIZE_CONFIG = {
  sm: { size: 40, stroke: 4, fontSize: '0.7rem', labelSize: '0.6rem' },
  md: { size: 56, stroke: 5, fontSize: '0.9rem', labelSize: '0.65rem' },
  lg: { size: 80, stroke: 6, fontSize: '1.25rem', labelSize: '0.75rem' },
}

export default function SustainabilityScore({
  score,
  size = 'md',
  showLabel = true,
  animated = true,
}: SustainabilityScoreProps) {
  const config = getScoreConfig(score)
  const sizeConfig = SIZE_CONFIG[size]
  
  const radius = (sizeConfig.size - sizeConfig.stroke) / 2
  const circumference = 2 * Math.PI * radius
  const progress = ((100 - score) / 100) * circumference

  return (
    <div
      className="gc-sustainability-score"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.35rem',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: sizeConfig.size,
          height: sizeConfig.size,
        }}
      >
        <svg
          width={sizeConfig.size}
          height={sizeConfig.size}
          style={{ transform: 'rotate(-90deg)' }}
        >
          {/* Background circle */}
          <circle
            cx={sizeConfig.size / 2}
            cy={sizeConfig.size / 2}
            r={radius}
            fill="none"
            stroke="var(--gc-slate-100)"
            strokeWidth={sizeConfig.stroke}
          />
          {/* Progress circle */}
          <circle
            cx={sizeConfig.size / 2}
            cy={sizeConfig.size / 2}
            r={radius}
            fill="none"
            stroke="url(#scoreGradient)"
            strokeWidth={sizeConfig.stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={progress}
            style={{
              transition: animated ? 'stroke-dashoffset 0.8s var(--gc-ease)' : 'none',
            }}
          />
          <defs>
            <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--gc-emerald-500)" />
              <stop offset="100%" stopColor="var(--gc-teal-500)" />
            </linearGradient>
          </defs>
        </svg>
        {/* Score number */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: sizeConfig.fontSize,
            fontWeight: 900,
            color: config.textColor,
            lineHeight: 1,
          }}
        >
          {score}
        </div>
      </div>
      {showLabel && (
        <span
          style={{
            fontSize: sizeConfig.labelSize,
            fontWeight: 700,
            color: config.textColor,
            textTransform: 'uppercase',
            letterSpacing: '0.03em',
          }}
        >
          {config.label}
        </span>
      )}
    </div>
  )
}

// Badge variant for inline use
export function SustainabilityBadge({ score }: { score: number }) {
  const config = getScoreConfig(score)
  
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4rem',
        padding: '0.35rem 0.65rem',
        background: config.bgColor,
        border: `1px solid ${config.borderColor}`,
        borderRadius: 'var(--gc-radius)',
        fontSize: '0.8rem',
        fontWeight: 700,
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: config.gradient,
        }}
      />
      <span style={{ color: config.textColor }}>{score}</span>
      <span style={{ color: 'var(--gc-slate-500)', fontWeight: 600 }}>/ 100</span>
    </span>
  )
}
