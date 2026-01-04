'use client'

import { CERTIFICATIONS } from './CertificationBadge'

export interface FilterState {
  categories: string[]
  certifications: string[]
  minScore: number
  maxScore: number
  priceRange: { min: number; max: number } | null
  sortBy: 'score' | 'name' | 'suppliers' | 'newest'
}

interface FilterSidebarProps {
  filters: FilterState
  onChange: (filters: FilterState) => void
  categories: string[]
  isOpen?: boolean
  onClose?: () => void
}

const CATEGORIES = [
  'Flooring',
  'Insulation',
  'Roofing',
  'Wall Systems',
  'Structural',
  'Windows & Doors',
  'Finishes',
  'Lighting',
  'HVAC',
  'Plumbing',
] as const

export default function FilterSidebar({
  filters,
  onChange,
  categories = CATEGORIES as unknown as string[],
  isOpen = true,
  onClose,
}: FilterSidebarProps) {
  const handleCategoryToggle = (category: string) => {
    const newCategories = filters.categories.includes(category)
      ? filters.categories.filter((c) => c !== category)
      : [...filters.categories, category]
    onChange({ ...filters, categories: newCategories })
  }

  const handleCertificationToggle = (cert: string) => {
    const newCerts = filters.certifications.includes(cert)
      ? filters.certifications.filter((c) => c !== cert)
      : [...filters.certifications, cert]
    onChange({ ...filters, certifications: newCerts })
  }

  const handleScoreChange = (value: number) => {
    onChange({ ...filters, minScore: value })
  }

  const handleSortChange = (sortBy: FilterState['sortBy']) => {
    onChange({ ...filters, sortBy })
  }

  const clearFilters = () => {
    onChange({
      categories: [],
      certifications: [],
      minScore: 0,
      maxScore: 100,
      priceRange: null,
      sortBy: 'score',
    })
  }

  const hasActiveFilters =
    filters.categories.length > 0 ||
    filters.certifications.length > 0 ||
    filters.minScore > 0

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && onClose && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            zIndex: 40,
          }}
          className="gc-filter-overlay"
        />
      )}

      <aside
        className="gc-filter-sidebar"
        style={{
          position: 'sticky',
          top: 80,
          height: 'fit-content',
          maxHeight: 'calc(100vh - 100px)',
          overflowY: 'auto',
          width: 280,
          padding: '1.25rem',
          background: 'var(--gc-glass)',
          backdropFilter: 'blur(16px) saturate(180%)',
          WebkitBackdropFilter: 'blur(16px) saturate(180%)',
          border: '1px solid var(--gc-glass-border)',
          borderRadius: 'var(--gc-radius-xl)',
          boxShadow: 'var(--gc-glass-shadow)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.25rem',
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: '1rem',
              fontWeight: 800,
              color: 'var(--gc-slate-900)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: 'var(--gc-emerald-600)' }}
            >
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            Filters
          </h2>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              style={{
                padding: '0.35rem 0.65rem',
                fontSize: '0.7rem',
                fontWeight: 600,
                color: 'var(--gc-slate-600)',
                background: 'var(--gc-slate-100)',
                border: 'none',
                borderRadius: 'var(--gc-radius-sm)',
                cursor: 'pointer',
                transition: 'all var(--gc-duration) var(--gc-ease)',
              }}
            >
              Clear all
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              style={{
                padding: '0.35rem',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--gc-slate-500)',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Sort By */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label className="gc-section-title">Sort By</label>
          <select
            value={filters.sortBy}
            onChange={(e) => handleSortChange(e.target.value as FilterState['sortBy'])}
            className="gc-select"
            style={{ fontSize: '0.875rem', padding: '0.6rem 0.85rem' }}
          >
            <option value="score">Sustainability Score</option>
            <option value="name">Name (A-Z)</option>
            <option value="suppliers">Most Suppliers</option>
            <option value="newest">Newest First</option>
          </select>
        </div>

        {/* Sustainability Score Slider */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label className="gc-section-title">
            Min Score: <span style={{ color: 'var(--gc-emerald-600)' }}>{filters.minScore}</span>
          </label>
          <div style={{ position: 'relative', marginTop: '0.5rem' }}>
            <input
              type="range"
              min="0"
              max="100"
              value={filters.minScore}
              onChange={(e) => handleScoreChange(Number(e.target.value))}
              style={{
                width: '100%',
                height: 6,
                borderRadius: 3,
                appearance: 'none',
                background: `linear-gradient(to right, var(--gc-emerald-500) 0%, var(--gc-emerald-500) ${filters.minScore}%, var(--gc-slate-200) ${filters.minScore}%, var(--gc-slate-200) 100%)`,
                cursor: 'pointer',
              }}
            />
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '0.35rem',
                fontSize: '0.65rem',
                color: 'var(--gc-slate-400)',
              }}
            >
              <span>0</span>
              <span>50</span>
              <span>100</span>
            </div>
          </div>
        </div>

        <hr className="gc-divider" />

        {/* Categories */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label className="gc-section-title">Categories</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {categories.map((category) => (
              <label
                key={category}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  padding: '0.5rem 0.65rem',
                  borderRadius: 'var(--gc-radius)',
                  cursor: 'pointer',
                  background: filters.categories.includes(category)
                    ? 'var(--gc-emerald-50)'
                    : 'transparent',
                  transition: 'background var(--gc-duration) var(--gc-ease)',
                }}
              >
                <input
                  type="checkbox"
                  checked={filters.categories.includes(category)}
                  onChange={() => handleCategoryToggle(category)}
                  style={{
                    width: 16,
                    height: 16,
                    accentColor: 'var(--gc-emerald-600)',
                    cursor: 'pointer',
                  }}
                />
                <span
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: filters.categories.includes(category) ? 600 : 500,
                    color: filters.categories.includes(category)
                      ? 'var(--gc-emerald-700)'
                      : 'var(--gc-slate-700)',
                  }}
                >
                  {category}
                </span>
              </label>
            ))}
          </div>
        </div>

        <hr className="gc-divider" />

        {/* Certifications */}
        <div>
          <label className="gc-section-title">Certifications</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {CERTIFICATIONS.map((cert) => (
              <label
                key={cert}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  padding: '0.5rem 0.65rem',
                  borderRadius: 'var(--gc-radius)',
                  cursor: 'pointer',
                  background: filters.certifications.includes(cert)
                    ? 'var(--gc-emerald-50)'
                    : 'transparent',
                  transition: 'background var(--gc-duration) var(--gc-ease)',
                }}
              >
                <input
                  type="checkbox"
                  checked={filters.certifications.includes(cert)}
                  onChange={() => handleCertificationToggle(cert)}
                  style={{
                    width: 16,
                    height: 16,
                    accentColor: 'var(--gc-emerald-600)',
                    cursor: 'pointer',
                  }}
                />
                <span
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: filters.certifications.includes(cert) ? 600 : 500,
                    color: filters.certifications.includes(cert)
                      ? 'var(--gc-emerald-700)'
                      : 'var(--gc-slate-700)',
                  }}
                >
                  {cert}
                </span>
              </label>
            ))}
          </div>
        </div>
      </aside>
    </>
  )
}

// Export default filters for initialization
export const DEFAULT_FILTERS: FilterState = {
  categories: [],
  certifications: [],
  minScore: 0,
  maxScore: 100,
  priceRange: null,
  sortBy: 'score',
}
