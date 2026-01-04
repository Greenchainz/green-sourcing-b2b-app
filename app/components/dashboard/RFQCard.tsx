'use client'

import Link from 'next/link'
import WaveBadge, { type WaveNumber } from './WaveBadge'

export interface RFQSummary {
  id: string
  projectName: string
  materialsCount: number
  deadline: Date
  wave: WaveNumber
  minutesUntilVisible?: number
  depositVerified: boolean
  buyerLinkedInVerified: boolean
  buyerCompany: string
  status: 'pending' | 'responded' | 'expired' | 'awarded'
  createdAt: Date
}

interface RFQCardProps {
  rfq: RFQSummary
  onRespond?: (rfqId: string) => void
}

const statusConfig: Record<RFQSummary['status'], {
  label: string
  color: string
  bgColor: string
}> = {
  pending: {
    label: 'Pending Response',
    color: '#ea580c',
    bgColor: '#fff7ed',
  },
  responded: {
    label: 'Response Sent',
    color: 'var(--gc-emerald-700)',
    bgColor: 'var(--gc-emerald-50)',
  },
  expired: {
    label: 'Expired',
    color: 'var(--gc-slate-500)',
    bgColor: 'var(--gc-slate-100)',
  },
  awarded: {
    label: 'Awarded',
    color: '#7c3aed',
    bgColor: '#f5f3ff',
  },
}

function formatDeadline(deadline: Date): string {
  const now = new Date()
  const diff = deadline.getTime() - now.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

  if (diff < 0) return 'Expired'
  if (days > 7) return deadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  if (days > 0) return `${days}d ${hours}h left`
  if (hours > 0) return `${hours}h left`
  return 'Less than 1h'
}

function isUrgent(deadline: Date): boolean {
  const now = new Date()
  const diff = deadline.getTime() - now.getTime()
  const hoursLeft = diff / (1000 * 60 * 60)
  return hoursLeft > 0 && hoursLeft <= 24
}

export default function RFQCard({ rfq, onRespond }: RFQCardProps) {
  const statusInfo = statusConfig[rfq.status]
  const urgent = isUrgent(rfq.deadline)
  const isVisible = !rfq.minutesUntilVisible || rfq.minutesUntilVisible <= 0
  const canRespond = rfq.status === 'pending' && isVisible

  return (
    <article
      className="gc-card gc-card-hover"
      style={{
        padding: '1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        opacity: !isVisible ? 0.75 : 1,
        transition: 'all var(--gc-duration) var(--gc-ease)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Link
            href={`/rfqs/${rfq.id}`}
            style={{
              display: 'block',
              fontSize: '1.0625rem',
              fontWeight: 800,
              color: 'var(--gc-slate-900)',
              textDecoration: 'none',
              lineHeight: 1.3,
              marginBottom: '0.35rem',
              transition: 'color var(--gc-duration) var(--gc-ease)',
            }}
            className="gc-rfq-link"
          >
            {rfq.projectName}
          </Link>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.8125rem',
              color: 'var(--gc-slate-600)',
            }}
          >
            <span style={{ fontWeight: 600 }}>{rfq.buyerCompany}</span>
            {rfq.buyerLinkedInVerified && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  padding: '0.15rem 0.4rem',
                  background: '#e0f2fe',
                  color: '#0369a1',
                  fontSize: '0.625rem',
                  fontWeight: 700,
                  borderRadius: 'var(--gc-radius-sm)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                }}
                title="LinkedIn Verified Buyer"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                </svg>
                Verified
              </span>
            )}
          </div>
        </div>

        {/* Wave Badge */}
        <WaveBadge wave={rfq.wave} minutesUntilVisible={rfq.minutesUntilVisible} size="sm" />
      </div>

      {/* Details Row */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '0.65rem 1.25rem',
        }}
      >
        {/* Materials Count */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontSize: '0.8125rem',
            color: 'var(--gc-slate-600)',
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--gc-slate-400)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
          </svg>
          <span style={{ fontWeight: 600 }}>{rfq.materialsCount} material{rfq.materialsCount !== 1 ? 's' : ''}</span>
        </div>

        {/* Deadline */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontSize: '0.8125rem',
            color: urgent ? '#dc2626' : 'var(--gc-slate-600)',
            fontWeight: urgent ? 700 : 600,
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke={urgent ? '#dc2626' : 'var(--gc-slate-400)'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span>{formatDeadline(rfq.deadline)}</span>
          {urgent && (
            <span
              style={{
                padding: '0.1rem 0.35rem',
                background: '#fef2f2',
                color: '#dc2626',
                fontSize: '0.625rem',
                fontWeight: 800,
                borderRadius: '3px',
                textTransform: 'uppercase',
              }}
            >
              Urgent
            </span>
          )}
        </div>

        {/* Deposit Verified */}
        {rfq.depositVerified && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.15rem 0.5rem',
              background: 'var(--gc-emerald-50)',
              borderRadius: 'var(--gc-radius-sm)',
              fontSize: '0.75rem',
              color: 'var(--gc-emerald-700)',
              fontWeight: 700,
            }}
            title="Buyer has placed a refundable deposit"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <polyline points="9 12 11 14 15 10" />
            </svg>
            Deposit Verified
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: '0.85rem',
          borderTop: '1px solid var(--gc-slate-100)',
          marginTop: 'auto',
        }}
      >
        {/* Status Badge */}
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.3rem 0.65rem',
            background: statusInfo.bgColor,
            color: statusInfo.color,
            fontSize: '0.75rem',
            fontWeight: 700,
            borderRadius: 'var(--gc-radius-sm)',
          }}
        >
          {rfq.status === 'responded' && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
          {rfq.status === 'awarded' && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="6" />
              <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
            </svg>
          )}
          {statusInfo.label}
        </span>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {canRespond ? (
            <button
              onClick={() => onRespond?.(rfq.id)}
              className="gc-btn gc-btn-primary"
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.8125rem',
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
              Respond
            </button>
          ) : !isVisible ? (
            <span
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: 'var(--gc-slate-500)',
                background: 'var(--gc-slate-100)',
                borderRadius: 'var(--gc-radius-lg)',
              }}
            >
              Available in {rfq.minutesUntilVisible}m
            </span>
          ) : (
            <Link
              href={`/rfqs/${rfq.id}`}
              className="gc-btn gc-btn-secondary"
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.8125rem',
              }}
            >
              View Details
            </Link>
          )}
        </div>
      </div>

      {/* Style for hover effect */}
      <style jsx>{`
        .gc-rfq-link:hover {
          color: var(--gc-emerald-700);
        }
      `}</style>
    </article>
  )
}

export { RFQCard }
