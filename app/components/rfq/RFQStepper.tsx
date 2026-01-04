'use client'

import { useEffect, useState, CSSProperties } from 'react'

export type RFQStep = {
  id: number
  label: string
  description?: string
}

export interface RFQStepperProps {
  steps: RFQStep[]
  currentStep: number
  className?: string
  compact?: boolean
}

const DEFAULT_STEPS: RFQStep[] = [
  { id: 1, label: 'Project Details', description: 'Name, deadline & requirements' },
  { id: 2, label: 'Materials', description: 'Select from catalog or add manually' },
  { id: 3, label: 'Verification', description: 'Confirm your identity' },
  { id: 4, label: 'Deposit', description: '$25 refundable deposit' },
  { id: 5, label: 'Review & Submit', description: 'Confirm and send to suppliers' },
]

// Styles object
const styles: Record<string, CSSProperties> = {
  stepper: {
    width: '100%',
    padding: '1.5rem 0',
  },
  track: {
    display: 'flex',
    justifyContent: 'space-between',
  },
  step: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    flex: 1,
    position: 'relative',
  },
  indicator: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    position: 'relative',
  },
  circle: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: 14,
    background: 'var(--gc-slate-100)',
    color: 'var(--gc-slate-400)',
    border: '2px solid var(--gc-slate-200)',
    transition: 'all 0.3s ease',
    zIndex: 2,
    flexShrink: 0,
    margin: '0 auto',
  },
  circleActive: {
    background: 'linear-gradient(135deg, var(--gc-emerald-500) 0%, var(--gc-teal-500) 100%)',
    color: 'white',
    borderColor: 'var(--gc-emerald-400)',
    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)',
  },
  circleCompleted: {
    background: 'var(--gc-emerald-500)',
    color: 'white',
    borderColor: 'var(--gc-emerald-500)',
  },
  checkIcon: {
    width: 16,
    height: 16,
  },
  connector: {
    position: 'absolute',
    top: '50%',
    left: 'calc(50% + 18px)',
    width: 'calc(100% - 36px)',
    height: 3,
    background: 'var(--gc-slate-200)',
    transform: 'translateY(-50%)',
    zIndex: 1,
    borderRadius: 2,
  },
  connectorCompleted: {
    background: 'linear-gradient(90deg, var(--gc-emerald-500) 0%, var(--gc-emerald-400) 100%)',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    marginTop: 12,
    maxWidth: 120,
  },
  label: {
    fontSize: 12,
    fontWeight: 700,
    color: 'var(--gc-slate-400)',
    transition: 'color 0.2s ease',
  },
  labelActive: {
    color: 'var(--gc-emerald-700)',
  },
  labelCompleted: {
    color: 'var(--gc-slate-700)',
  },
  desc: {
    fontSize: 11,
    color: 'var(--gc-slate-500)',
    marginTop: 2,
    lineHeight: 1.3,
  },
  mobile: {
    display: 'none',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    padding: '12px 16px',
    background: 'var(--gc-slate-50)',
    borderRadius: 'var(--gc-radius)',
    marginTop: 12,
  },
  mobileCurrent: {
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--gc-emerald-600)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  mobileLabel: {
    fontSize: 15,
    fontWeight: 700,
    color: 'var(--gc-slate-900)',
  },
  circleCompact: {
    width: 28,
    height: 28,
    fontSize: 12,
  },
  connectorCompact: {
    left: 'calc(50% + 14px)',
    width: 'calc(100% - 28px)',
    height: 2,
  },
}

export default function RFQStepper({
  steps = DEFAULT_STEPS,
  currentStep,
  className,
  compact = false,
}: RFQStepperProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const getStepStatus = (stepId: number) => {
    if (stepId < currentStep) return 'completed'
    if (stepId === currentStep) return 'active'
    return 'pending'
  }

  return (
    <div
      className={className || ''}
      style={styles.stepper}
      role="navigation"
      aria-label="RFQ creation progress"
    >
      <div style={styles.track}>
        {steps.map((step, index) => {
          const status = getStepStatus(step.id)
          const isLast = index === steps.length - 1

          const circleStyle: CSSProperties = {
            ...styles.circle,
            ...(compact ? styles.circleCompact : {}),
            ...(status === 'active' ? styles.circleActive : {}),
            ...(status === 'completed' ? styles.circleCompleted : {}),
          }

          const connectorStyle: CSSProperties = {
            ...styles.connector,
            ...(compact ? styles.connectorCompact : {}),
            ...(status === 'completed' ? styles.connectorCompleted : {}),
          }

          const labelStyle: CSSProperties = {
            ...styles.label,
            ...(status === 'active' ? styles.labelActive : {}),
            ...(status === 'completed' ? styles.labelCompleted : {}),
          }

          return (
            <div
              key={step.id}
              style={styles.step}
              className={mounted ? 'gc-animate-fade-in' : ''}
            >
              {/* Step Circle */}
              <div style={styles.indicator}>
                <div style={circleStyle}>
                  {status === 'completed' ? (
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
                  ) : (
                    <span>{step.id}</span>
                  )}
                </div>

                {/* Connector Line */}
                {!isLast && <div style={connectorStyle} />}
              </div>

              {/* Step Content */}
              {!compact && (
                <div style={styles.content as CSSProperties}>
                  <span style={labelStyle}>{step.label}</span>
                  {step.description && (
                    <span style={styles.desc}>{step.description}</span>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Mobile Step Indicator - shown via CSS media query would need a custom hook */}
      <div style={styles.mobile as CSSProperties} className="gc-rfq-stepper-mobile">
        <span style={styles.mobileCurrent as CSSProperties}>
          Step {currentStep} of {steps.length}
        </span>
        <span style={styles.mobileLabel}>
          {steps.find((s) => s.id === currentStep)?.label}
        </span>
      </div>
    </div>
  )
}

export { DEFAULT_STEPS as RFQ_STEPS }
