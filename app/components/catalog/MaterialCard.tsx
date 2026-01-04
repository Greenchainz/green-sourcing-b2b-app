'use client'

import Link from 'next/link'
import SustainabilityScore from './SustainabilityScore'
import CertificationBadge from './CertificationBadge'

export interface Material {
  id: string
  name: string
  category: string
  manufacturer: string
  imageUrl?: string
  sustainabilityScore: number
  certifications: string[]
  supplierCount: number
  priceRange?: { min: number; max: number }
}

interface MaterialCardProps {
  material: Material
  isSelected?: boolean
  onCompareToggle?: (material: Material) => void
  compareDisabled?: boolean
}

export default function MaterialCard({
  material,
  isSelected = false,
  onCompareToggle,
  compareDisabled = false,
}: MaterialCardProps) {
  return (
    <div
      className="gc-card gc-card-hover gc-material-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        border: isSelected ? '2px solid var(--gc-emerald-500)' : undefined,
        boxShadow: isSelected
          ? '0 0 0 3px rgba(16, 185, 129, 0.15), var(--gc-glass-shadow)'
          : undefined,
      }}
    >
      {/* Compare checkbox */}
      {onCompareToggle && (
        <label
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
            borderRadius: 'var(--gc-radius-sm)',
            background: isSelected
              ? 'linear-gradient(135deg, var(--gc-emerald-500), var(--gc-teal-500))'
              : 'rgba(255, 255, 255, 0.9)',
            border: isSelected ? 'none' : '1px solid var(--gc-slate-200)',
            cursor: compareDisabled && !isSelected ? 'not-allowed' : 'pointer',
            opacity: compareDisabled && !isSelected ? 0.5 : 1,
            transition: 'all var(--gc-duration) var(--gc-ease)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}
          title={compareDisabled && !isSelected ? 'Max 5 materials to compare' : 'Add to compare'}
        >
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onCompareToggle(material)}
            disabled={compareDisabled && !isSelected}
            style={{ display: 'none' }}
          />
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke={isSelected ? 'white' : 'var(--gc-slate-400)'}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {isSelected ? (
              <polyline points="20 6 9 17 4 12" />
            ) : (
              <>
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
              </>
            )}
          </svg>
        </label>
      )}

      {/* Image section */}
      <Link href={`/catalog/${material.id}`} style={{ display: 'block' }}>
        <div
          style={{
            position: 'relative',
            paddingTop: '60%',
            background: material.imageUrl
              ? `url(${material.imageUrl}) center/cover no-repeat`
              : 'linear-gradient(135deg, var(--gc-slate-100), var(--gc-slate-50))',
            borderRadius: 'var(--gc-radius-xl) var(--gc-radius-xl) 0 0',
          }}
        >
          {/* Score badge overlay */}
          <div
            style={{
              position: 'absolute',
              bottom: 10,
              left: 10,
            }}
          >
            <SustainabilityScore score={material.sustainabilityScore} size="sm" showLabel={false} />
          </div>

          {/* Category tag */}
          <span
            style={{
              position: 'absolute',
              top: 12,
              left: 12,
              padding: '0.25rem 0.6rem',
              fontSize: '0.65rem',
              fontWeight: 700,
              color: 'var(--gc-slate-600)',
              background: 'rgba(255, 255, 255, 0.92)',
              backdropFilter: 'blur(8px)',
              borderRadius: 'var(--gc-radius-sm)',
              textTransform: 'uppercase',
              letterSpacing: '0.03em',
            }}
          >
            {material.category}
          </span>
        </div>
      </Link>

      {/* Content section */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: '1rem',
          gap: '0.65rem',
        }}
      >
        <div>
          <Link
            href={`/catalog/${material.id}`}
            style={{
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: '0.95rem',
                fontWeight: 800,
                color: 'var(--gc-slate-900)',
                lineHeight: 1.3,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {material.name}
            </h3>
          </Link>
          <p
            style={{
              margin: '0.25rem 0 0',
              fontSize: '0.75rem',
              color: 'var(--gc-slate-500)',
              fontWeight: 500,
            }}
          >
            by {material.manufacturer}
          </p>
        </div>

        {/* Certifications */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.35rem',
          }}
        >
          {material.certifications.slice(0, 3).map((cert) => (
            <CertificationBadge key={cert} certification={cert} size="sm" showLabel={false} />
          ))}
          {material.certifications.length > 3 && (
            <span
              style={{
                padding: '0.2rem 0.4rem',
                fontSize: '0.65rem',
                fontWeight: 600,
                color: 'var(--gc-slate-500)',
                background: 'var(--gc-slate-100)',
                borderRadius: 'var(--gc-radius-sm)',
              }}
            >
              +{material.certifications.length - 3}
            </span>
          )}
        </div>

        {/* Footer info */}
        <div
          style={{
            marginTop: 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: '0.65rem',
            borderTop: '1px solid var(--gc-slate-100)',
          }}
        >
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.75rem',
              color: 'var(--gc-slate-600)',
              fontWeight: 600,
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            {material.supplierCount} supplier{material.supplierCount !== 1 ? 's' : ''}
          </span>

          {material.priceRange && (
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: 'var(--gc-emerald-700)',
              }}
            >
              ${material.priceRange.min.toLocaleString()} - ${material.priceRange.max.toLocaleString()}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
