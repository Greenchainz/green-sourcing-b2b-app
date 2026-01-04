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
import { useState } from 'react'
import type { CertificationType } from './CertificationBadge'

export interface FilterState {
  categories: string[]
  certifications: CertificationType[]
  scoreRange: [number, number]
  priceRange: string[]
  manufacturers: string[]
}

export interface FilterSidebarProps {
  filters: FilterState
  onFiltersChange: (filters: FilterState) => void
  availableCategories: { id: string; name: string; count: number; subcategories?: { id: string; name: string; count: number }[] }[]
  availableCertifications: { id: CertificationType; name: string; count: number }[]
  availableManufacturers: { id: string; name: string; count: number }[]
  /** Is the sidebar collapsed (mobile) */
  isCollapsed?: boolean
  /** Toggle collapse */
  onToggleCollapse?: () => void
  /** Additional class names */
  className?: string
}

export default function FilterSidebar({
  filters,
  onFiltersChange,
  availableCategories,
  availableCertifications,
  availableManufacturers,
  isCollapsed = false,
  onToggleCollapse,
  className = '',
}: FilterSidebarProps) {
  const [expandedCategories, setExpandedCategories] = useState<string[]>([])

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    )
  }

  const handleCategoryToggle = (categoryId: string, isSubcategory = false) => {
    const newCategories = filters.categories.includes(categoryId)
      ? filters.categories.filter((id) => id !== categoryId)
      : [...filters.categories, categoryId]
    onFiltersChange({ ...filters, categories: newCategories })
  }

  const handleCertificationToggle = (certId: CertificationType) => {
    const newCerts = filters.certifications.includes(certId)
      ? filters.certifications.filter((id) => id !== certId)
      : [...filters.certifications, certId]
    onFiltersChange({ ...filters, certifications: newCerts })
  }

  const handleScoreChange = (value: [number, number]) => {
    onFiltersChange({ ...filters, scoreRange: value })
  }

  const clearAllFilters = () => {
    onFiltersChange({
      categories: [],
      certifications: [],
      scoreRange: [0, 100],
      priceRange: [],
      manufacturers: [],
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
    filters.scoreRange[0] > 0 ||
    filters.scoreRange[1] < 100 ||
    filters.manufacturers.length > 0

  return (
    <aside
      className={`gc-filter-sidebar ${className}`}
      style={{
        width: isCollapsed ? 0 : 280,
        minWidth: isCollapsed ? 0 : 280,
        background: 'var(--gc-glass)',
        backdropFilter: 'blur(16px) saturate(180%)',
        borderRight: isCollapsed ? 'none' : '1px solid var(--gc-glass-border)',
        height: '100%',
        overflow: isCollapsed ? 'hidden' : 'auto',
        transition: 'all var(--gc-duration-slow) var(--gc-ease)',
        flexShrink: 0,
      }}
    >
      <div style={{ padding: '1.25rem' }}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.25rem',
            marginBottom: '1rem',
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
              fontSize: '0.9375rem',
              fontWeight: 800,
              color: 'var(--gc-slate-900)',
            }}
          >
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
              onClick={clearAllFilters}
              style={{
                padding: '0.25rem 0.5rem',
                background: 'transparent',
                border: 'none',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--gc-emerald-600)',
                cursor: 'pointer',
                borderRadius: 'var(--gc-radius-sm)',
                transition: 'background var(--gc-duration) var(--gc-ease)',
              }}
            >
              Clear all
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
        {/* Categories Accordion */}
        <FilterSection title="Categories">
          {availableCategories.map((category) => (
            <div key={category.id}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <FilterCheckbox
                  id={`cat-${category.id}`}
                  checked={filters.categories.includes(category.id)}
                  onChange={() => handleCategoryToggle(category.id)}
                  label={category.name}
                  count={category.count}
                />
                {category.subcategories && category.subcategories.length > 0 && (
                  <button
                    onClick={() => toggleCategory(category.id)}
                    style={{
                      padding: 4,
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--gc-slate-400)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'transform var(--gc-duration) var(--gc-ease)',
                      transform: expandedCategories.includes(category.id)
                        ? 'rotate(180deg)'
                        : 'rotate(0deg)',
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
                      style={{ width: 14, height: 14 }}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                )}
              </div>
              {/* Subcategories */}
              {category.subcategories &&
                expandedCategories.includes(category.id) && (
                  <div style={{ marginLeft: '1.5rem', marginTop: '0.35rem' }}>
                    {category.subcategories.map((sub) => (
                      <FilterCheckbox
                        key={sub.id}
                        id={`subcat-${sub.id}`}
                        checked={filters.categories.includes(sub.id)}
                        onChange={() => handleCategoryToggle(sub.id, true)}
                        label={sub.name}
                        count={sub.count}
                      />
                    ))}
                  </div>
                )}
            </div>
          ))}
        </FilterSection>

        <FilterDivider />

        {/* Certifications */}
        <FilterSection title="Certifications">
          {availableCertifications.map((cert) => (
            <FilterCheckbox
              key={cert.id}
              id={`cert-${cert.id}`}
              checked={filters.certifications.includes(cert.id)}
              onChange={() => handleCertificationToggle(cert.id)}
              label={cert.name}
              count={cert.count}
              verified
            />
          ))}
        </FilterSection>

        <FilterDivider />

        {/* Sustainability Score Slider */}
        <FilterSection title="Sustainability Score">
          <div style={{ padding: '0.5rem 0' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '0.75rem',
              }}
            >
              <span
                style={{
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  color: 'var(--gc-slate-700)',
                }}
              >
                {filters.scoreRange[0]} - {filters.scoreRange[1]}
              </span>
            </div>
            <div style={{ position: 'relative', height: 24 }}>
              {/* Track */}
              <div
                style={{
                  position: 'absolute',
                  top: 10,
                  left: 0,
                  right: 0,
                  height: 4,
                  background: 'var(--gc-slate-200)',
                  borderRadius: 2,
                }}
              />
              {/* Active Track */}
              <div
                style={{
                  position: 'absolute',
                  top: 10,
                  left: `${filters.scoreRange[0]}%`,
                  right: `${100 - filters.scoreRange[1]}%`,
                  height: 4,
                  background: 'linear-gradient(90deg, var(--gc-emerald-500), var(--gc-teal-500))',
                  borderRadius: 2,
                }}
              />
              {/* Min Slider */}
              <input
                type="range"
                min={0}
                max={100}
                value={filters.scoreRange[0]}
                onChange={(e) =>
                  handleScoreChange([
                    Math.min(Number(e.target.value), filters.scoreRange[1] - 5),
                    filters.scoreRange[1],
                  ])
                }
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  appearance: 'none',
                  background: 'transparent',
                  pointerEvents: 'none',
                }}
                className="gc-range-slider"
              />
              {/* Max Slider */}
              <input
                type="range"
                min={0}
                max={100}
                value={filters.scoreRange[1]}
                onChange={(e) =>
                  handleScoreChange([
                    filters.scoreRange[0],
                    Math.max(Number(e.target.value), filters.scoreRange[0] + 5),
                  ])
                }
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  appearance: 'none',
                  background: 'transparent',
                  pointerEvents: 'none',
                }}
                className="gc-range-slider"
              />
            </div>
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
                fontSize: '0.6875rem',
                color: 'var(--gc-slate-500)',
              }}
            >
              <span>0</span>
              <span>100</span>
            </div>
          </div>
        </FilterSection>

        <FilterDivider />

        {/* Manufacturers */}
        <FilterSection title="Manufacturers" defaultCollapsed>
          {availableManufacturers.slice(0, 10).map((mfr) => (
            <FilterCheckbox
              key={mfr.id}
              id={`mfr-${mfr.id}`}
              checked={filters.manufacturers.includes(mfr.id)}
              onChange={() => {
                const newMfrs = filters.manufacturers.includes(mfr.id)
                  ? filters.manufacturers.filter((id) => id !== mfr.id)
                  : [...filters.manufacturers, mfr.id]
                onFiltersChange({ ...filters, manufacturers: newMfrs })
              }}
              label={mfr.name}
              count={mfr.count}
            />
          ))}
          {availableManufacturers.length > 10 && (
            <button
              style={{
                marginTop: '0.5rem',
                padding: '0.35rem 0.65rem',
                background: 'transparent',
                border: '1px solid var(--gc-slate-200)',
                borderRadius: 'var(--gc-radius-sm)',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--gc-slate-600)',
                cursor: 'pointer',
                width: '100%',
              }}
            >
              Show {availableManufacturers.length - 10} more
            </button>
          )}
        </FilterSection>
      </div>
    </aside>
  )
}

// Filter Section Component
function FilterSection({
  title,
  children,
  defaultCollapsed = false,
}: {
  title: string
  children: React.ReactNode
  defaultCollapsed?: boolean
}) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed)

  return (
    <div style={{ marginBottom: '0.25rem' }}>
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: '0.5rem 0',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span
          style={{
            fontSize: '0.6875rem',
            fontWeight: 800,
            color: 'var(--gc-slate-500)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          {title}
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
            width: 14,
            height: 14,
            transition: 'transform var(--gc-duration) var(--gc-ease)',
            transform: isCollapsed ? 'rotate(0deg)' : 'rotate(180deg)',
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      <div
        style={{
          overflow: 'hidden',
          maxHeight: isCollapsed ? 0 : 500,
          opacity: isCollapsed ? 0 : 1,
          transition: 'all var(--gc-duration-slow) var(--gc-ease)',
        }}
      >
        {children}
      </div>
    </div>
  )
}

// Checkbox Component
function FilterCheckbox({
  id,
  checked,
  onChange,
  label,
  count,
  verified,
}: {
  id: string
  checked: boolean
  onChange: () => void
  label: string
  count?: number
  verified?: boolean
}) {
  return (
    <label
      htmlFor={id}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.35rem 0',
        cursor: 'pointer',
        flex: 1,
      }}
    >
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={onChange}
        style={{
          width: 16,
          height: 16,
          accentColor: 'var(--gc-emerald-600)',
          cursor: 'pointer',
          flexShrink: 0,
        }}
      />
      <span
        style={{
          flex: 1,
          fontSize: '0.8125rem',
          fontWeight: 600,
          color: checked ? 'var(--gc-slate-900)' : 'var(--gc-slate-700)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.35rem',
        }}
      >
        {label}
        {verified && (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--gc-emerald-500)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ width: 12, height: 12 }}
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        )}
      </span>
      {count !== undefined && (
        <span
          style={{
            fontSize: '0.6875rem',
            fontWeight: 600,
            color: 'var(--gc-slate-400)',
          }}
        >
          {count}
        </span>
      )}
    </label>
  )
}

// Divider
function FilterDivider() {
  return (
    <hr
      style={{
        border: 'none',
        height: 1,
        background: 'var(--gc-slate-100)',
        margin: '0.75rem 0',
      }}
    />
  )
}

// Mobile Filter Button
export function MobileFilterButton({
  filterCount,
  onClick,
}: {
  filterCount: number
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="gc-btn gc-btn-secondary"
      style={{
        padding: '0.65rem 1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
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
        style={{ width: 18, height: 18 }}
      >
        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
      </svg>
      Filters
      {filterCount > 0 && (
        <span
          style={{
            padding: '0.125rem 0.4rem',
            background: 'var(--gc-emerald-500)',
            borderRadius: 10,
            fontSize: '0.6875rem',
            fontWeight: 800,
            color: 'white',
          }}
        >
          {filterCount}
        </span>
      )}
    </button>
  )
}
