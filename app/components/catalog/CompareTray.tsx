'use client'

import Link from 'next/link'
import type { Material } from './MaterialCard'
import SustainabilityScore from './SustainabilityScore'

interface CompareTrayProps {
  materials: Material[]
  onRemove: (materialId: string) => void
  onClear: () => void
  maxItems?: number
}

export default function CompareTray({
  materials,
  onRemove,
  onClear,
  maxItems = 5,
}: CompareTrayProps) {
  if (materials.length === 0) return null

  return (
    <div
      className="gc-compare-tray gc-animate-slide-up"
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
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 'var(--gc-radius-lg)',
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
                fontWeight: 800,
                color: 'var(--gc-slate-900)',
              }}
            >
              Compare Materials
            </p>
            <p
              style={{
                margin: 0,
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
        </div>
      </div>
    </div>
  )
}
