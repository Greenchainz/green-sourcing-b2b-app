'use client'

import Link from 'next/link'
import type { Material } from './MaterialCard'
import SustainabilityScore from './SustainabilityScore'

interface CompareTrayProps {
  materials: Material[]
  onRemove: (materialId: string) => void
  onClear: () => void
  maxItems?: number
import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { Material } from './MaterialCard'

export interface CompareTrayProps {
  materials: Material[]
  /** Maximum number of items allowed */
  maxItems?: number
  /** Remove material from comparison */
  onRemove: (materialId: string) => void
  /** Clear all materials */
  onClearAll: () => void
  /** Additional class names */
  className?: string
}

export default function CompareTray({
  materials,
  onRemove,
  onClear,
  maxItems = 5,
}: CompareTrayProps) {
  maxItems = 5,
  onRemove,
  onClearAll,
  className = '',
}: CompareTrayProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  if (materials.length === 0) return null

  return (
    <div
      className="gc-compare-tray gc-animate-slide-up"
      className={`gc-compare-tray ${className}`}
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderTop: '1px solid var(--gc-glass-border)',
        boxShadow: '0 -8px 30px rgba(2, 44, 34, 0.12)',
        padding: '1rem 0',
      }}
    >
      <div
        className="gc-container"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
        }}
      >
        {/* Compare info */}
        zIndex: 40,
        background: 'var(--gc-glass)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderTop: '1px solid var(--gc-glass-border)',
        boxShadow: '0 -8px 32px rgba(2, 44, 34, 0.12)',
        transition: 'transform var(--gc-duration-slow) var(--gc-ease)',
        transform: isExpanded ? 'translateY(0)' : 'translateY(calc(100% - 48px))',
      }}
    >
      {/* Toggle Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.75rem 1.25rem',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            flexShrink: 0,
            gap: '0.75rem',
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 'var(--gc-radius-lg)',
              width: 32,
              height: 32,
              borderRadius: 'var(--gc-radius)',
              background: 'linear-gradient(135deg, var(--gc-emerald-500), var(--gc-teal-500))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
            }}
          >
            <svg
              width="20"
              height="20"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
            </svg>
          </div>
          <div>
            <p
              style={{
                margin: 0,
                fontSize: '0.9rem',
              style={{ width: 18, height: 18 }}
            >
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
          </div>
          <div style={{ textAlign: 'left' }}>
            <div
              style={{
                fontSize: '0.875rem',
                fontWeight: 800,
                color: 'var(--gc-slate-900)',
              }}
            >
              Compare Materials
            </p>
            <p
              style={{
                margin: 0,
            </div>
            <div
              style={{
                fontSize: '0.75rem',
                color: 'var(--gc-slate-500)',
              }}
            >
              {materials.length} of {maxItems} selected
            </p>
          </div>
        </div>

        {/* Selected materials */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            gap: '0.65rem',
            overflowX: 'auto',
            paddingBottom: '0.25rem',
          }}
        >
          {materials.map((material) => (
            <div
              key={material.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 0.75rem',
                background: 'var(--gc-slate-50)',
                border: '1px solid var(--gc-slate-200)',
                borderRadius: 'var(--gc-radius)',
                flexShrink: 0,
                maxWidth: 200,
              }}
            >
              <SustainabilityScore score={material.sustainabilityScore} size="sm" showLabel={false} />
              <div style={{ minWidth: 0 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: 'var(--gc-slate-900)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {material.name}
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: '0.65rem',
                    color: 'var(--gc-slate-500)',
                  }}
                >
                  {material.manufacturer}
                </p>
              </div>
              <button
                onClick={() => onRemove(material.id)}
                style={{
                  padding: '0.2rem',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--gc-slate-400)',
                  transition: 'color var(--gc-duration) var(--gc-ease)',
                  flexShrink: 0,
                }}
                aria-label={`Remove ${material.name} from comparison`}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}

          {/* Empty slots indicator */}
          {Array.from({ length: Math.max(0, 2 - materials.length) }).map((_, i) => (
            <div
              key={`empty-${i}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.75rem 1rem',
                border: '2px dashed var(--gc-slate-200)',
                borderRadius: 'var(--gc-radius)',
                color: 'var(--gc-slate-400)',
                fontSize: '0.75rem',
                fontWeight: 500,
                flexShrink: 0,
                minWidth: 100,
              }}
            >
              + Add more
            </div>
          ))}
        </div>

        {/* Actions */}
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--gc-slate-500)',
            }}
          >
            {isExpanded ? 'Hide' : 'Show'}
          </span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--gc-slate-400)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              width: 18,
              height: 18,
              transition: 'transform var(--gc-duration) var(--gc-ease)',
              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          >
            <polyline points="18 15 12 9 6 15" />
          </svg>
        </div>
      </button>

      {/* Content */}
      <div
        style={{
          padding: '0 1.25rem 1.25rem',
          display: isExpanded ? 'block' : 'none',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'stretch',
            gap: '1rem',
            overflowX: 'auto',
            paddingBottom: '0.5rem',
          }}
        >
          {/* Selected Materials */}
          {materials.map((material) => (
            <CompareItem
              key={material.id}
              material={material}
              onRemove={() => onRemove(material.id)}
            />
          ))}

          {/* Empty Slots */}
          {Array.from({ length: maxItems - materials.length }).map((_, i) => (
            <div
              key={`empty-${i}`}
              style={{
                minWidth: 140,
                width: 140,
                height: 100,
                borderRadius: 'var(--gc-radius)',
                border: '2px dashed var(--gc-slate-200)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: '0.35rem',
                color: 'var(--gc-slate-400)',
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ width: 20, height: 20 }}
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span
                style={{
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                }}
              >
                Add material
              </span>
            </div>
          ))}

          {/* Actions */}
          <div
            style={{
              minWidth: 160,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              justifyContent: 'center',
            }}
          >
            <Link
              href={`/catalog/compare?ids=${materials.map((m) => m.id).join(',')}`}
              className="gc-btn gc-btn-primary"
              style={{
                padding: '0.65rem 1rem',
                fontSize: '0.8125rem',
                width: '100%',
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ width: 16, height: 16 }}
              >
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
              Compare Now
            </Link>
            <button
              onClick={onClearAll}
              className="gc-btn gc-btn-ghost"
              style={{
                padding: '0.5rem 0.75rem',
                fontSize: '0.75rem',
                width: '100%',
              }}
            >
              Clear All
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function CompareItem({
  material,
  onRemove,
}: {
  material: Material
  onRemove: () => void
}) {
  return (
    <div
      style={{
        minWidth: 140,
        width: 140,
        background: 'white',
        borderRadius: 'var(--gc-radius)',
        border: '1px solid var(--gc-slate-200)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Remove Button */}
      <button
        onClick={onRemove}
        style={{
          position: 'absolute',
          top: 6,
          right: 6,
          zIndex: 1,
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.9)',
          border: '1px solid var(--gc-slate-200)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all var(--gc-duration) var(--gc-ease)',
        }}
        title="Remove from comparison"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--gc-slate-500)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ width: 12, height: 12 }}
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      {/* Image */}
      <div
        style={{
          position: 'relative',
          height: 56,
          background: 'var(--gc-slate-100)',
        }}
      >
        <Image
          src={material.image || '/placeholder-material.png'}
          alt={material.name}
          fill
          sizes="140px"
          style={{ objectFit: 'cover' }}
        />
      </div>

      {/* Info */}
      <div style={{ padding: '0.5rem' }}>
        <div
          style={{
            fontSize: '0.6875rem',
            fontWeight: 700,
            color: 'var(--gc-slate-900)',
            lineHeight: 1.3,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            marginBottom: 4,
          }}
        >
          {material.name}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            flexShrink: 0,
          }}
        >
          <button
            onClick={onClear}
            className="gc-btn gc-btn-ghost"
            style={{
              padding: '0.6rem 1rem',
              fontSize: '0.85rem',
            }}
          >
            Clear
          </button>
          <Link
            href={`/catalog/compare?ids=${materials.map((m) => m.id).join(',')}`}
            className="gc-btn gc-btn-primary"
            style={{
              padding: '0.6rem 1.25rem',
              fontSize: '0.85rem',
            }}
          >
            Compare Now
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
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
            gap: '0.35rem',
          }}
        >
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background:
                material.sustainabilityScore >= 80
                  ? 'var(--gc-emerald-500)'
                  : material.sustainabilityScore >= 60
                  ? 'var(--gc-teal-500)'
                  : '#f59e0b',
            }}
          />
          <span
            style={{
              fontSize: '0.625rem',
              fontWeight: 700,
              color: 'var(--gc-slate-600)',
            }}
          >
            Score: {material.sustainabilityScore}
          </span>
        </div>
      </div>
    </div>
  )
}

// Compare count badge for use elsewhere
export function CompareCountBadge({ count }: { count: number }) {
  if (count === 0) return null

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 18,
        height: 18,
        padding: '0 5px',
        background: 'linear-gradient(135deg, var(--gc-emerald-500), var(--gc-teal-500))',
        borderRadius: 9,
        fontSize: '0.6875rem',
        fontWeight: 800,
        color: 'white',
        boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)',
      }}
    >
      {count}
    </span>
  )
}
