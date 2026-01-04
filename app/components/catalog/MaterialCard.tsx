'use client'

import Image from 'next/image'
import Link from 'next/link'
import { CertificationBadgeGroup, type CertificationType } from './CertificationBadge'
import { ScoreBar } from './SustainabilityScore'

export interface Material {
  id: string
  name: string
  category: string
  subcategory?: string
  manufacturer: string
  image?: string
  sustainabilityScore: number
  certifications: CertificationType[]
  leedPoints?: number
  carbonFootprint?: number
  recycledContent?: number
  verifiedSuppliers: number
  shadowSuppliers?: number
  priceRange?: string
  featured?: boolean
}

export interface MaterialCardProps {
  material: Material
  /** Whether this card is selected for comparison */
  isSelected?: boolean
  /** Callback when compare checkbox changes */
  onCompareToggle?: (materialId: string, selected: boolean) => void
  /** Whether compare mode is enabled */
  compareEnabled?: boolean
  /** Animation delay index for staggered animations */
  animationIndex?: number
  /** Additional class names */
  className?: string
}

export default function MaterialCard({
  material,
  isSelected = false,
  onCompareToggle,
  compareEnabled = false,
  animationIndex = 0,
  className = '',
}: MaterialCardProps) {
  const staggerClass = `gc-stagger-${Math.min((animationIndex % 5) + 1, 5)}`

  return (
    <article
      className={`gc-card gc-card-hover gc-animate-fade-in ${staggerClass} ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Featured Badge */}
      {material.featured && (
        <div
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            zIndex: 2,
            padding: '0.25rem 0.5rem',
            background: 'linear-gradient(135deg, var(--gc-emerald-500), var(--gc-teal-500))',
            borderRadius: 'var(--gc-radius-sm)',
            fontSize: '0.625rem',
            fontWeight: 800,
            color: 'white',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
          }}
        >
          Featured
        </div>
      )}

      {/* Compare Checkbox */}
      {compareEnabled && (
        <label
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            zIndex: 2,
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
            cursor: 'pointer',
            transition: 'all var(--gc-duration) var(--gc-ease)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
          }}
          title={isSelected ? 'Remove from comparison' : 'Add to comparison'}
        >
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => onCompareToggle?.(material.id, e.target.checked)}
            style={{
              position: 'absolute',
              opacity: 0,
              width: '100%',
              height: '100%',
              cursor: 'pointer',
            }}
          />
          {isSelected ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ width: 16, height: 16 }}
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--gc-slate-400)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ width: 16, height: 16 }}
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          )}
        </label>
      )}

      {/* Image */}
      <Link
        href={`/catalog/${material.id}`}
        style={{
          display: 'block',
          position: 'relative',
          aspectRatio: '4/3',
          background: 'var(--gc-slate-100)',
          overflow: 'hidden',
        }}
      >
        <Image
          src={material.image || '/placeholder-material.png'}
          alt={material.name}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          style={{
            objectFit: 'cover',
            transition: 'transform var(--gc-duration-slow) var(--gc-ease)',
          }}
          className="gc-material-image"
        />
        {/* Score Badge Overlay */}
        <div
          style={{
            position: 'absolute',
            bottom: 8,
            right: 8,
            padding: '0.35rem 0.5rem',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(8px)',
            borderRadius: 'var(--gc-radius-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--gc-emerald-600)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ width: 14, height: 14 }}
          >
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 800,
              color: 'var(--gc-emerald-700)',
            }}
          >
            {material.sustainabilityScore}
          </span>
        </div>
      </Link>

      {/* Content */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: '1rem',
          gap: '0.65rem',
        }}
      >
        {/* Category */}
        <div
          style={{
            fontSize: '0.6875rem',
            fontWeight: 700,
            color: 'var(--gc-slate-500)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            marginBottom: 4,
          }}
        >
          {material.category}
          {material.subcategory && ` · ${material.subcategory}`}
        </div>

        {/* Name */}
        <Link
          href={`/catalog/${material.id}`}
          style={{
            fontSize: '1rem',
            fontWeight: 800,
            color: 'var(--gc-slate-900)',
            textDecoration: 'none',
            lineHeight: 1.3,
            marginBottom: 4,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {material.name}
        </Link>

        {/* Manufacturer */}
        <div
          style={{
            fontSize: '0.8125rem',
            color: 'var(--gc-slate-600)',
            marginBottom: 12,
          }}
        >
          by {material.manufacturer}
        </div>

        {/* Sustainability Score Bar */}
        <ScoreBar score={material.sustainabilityScore} className="" />

        {/* Certifications */}
        <div style={{ marginTop: 12 }}>
          <CertificationBadgeGroup
            certifications={material.certifications}
            size="sm"
            maxVisible={3}
          />
        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: 'auto',
            paddingTop: 12,
            borderTop: '1px solid var(--gc-slate-100)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem',
          }}
        >
          {/* Suppliers */}
          <div
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
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--gc-slate-500)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ width: 14, height: 14 }}
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <span
              style={{
                color: 'var(--gc-slate-600)',
              }}
            >
              {material.verifiedSuppliers}
              {material.shadowSuppliers && material.shadowSuppliers > 0 && (
                <span style={{ color: 'var(--gc-slate-400)' }}>
                  {' '}+{material.shadowSuppliers}
                </span>
              )}
            </span>
          </div>

          {/* Quick Quote CTA */}
          <Link
            href={`/rfqs/new?material=${material.id}`}
            className="gc-btn gc-btn-primary"
            style={{
              padding: '0.35rem 0.65rem',
              fontSize: '0.6875rem',
              fontWeight: 700,
            }}
          >
            Request Quote
          </Link>
        </div>
      </div>
    </article>
  )
}
