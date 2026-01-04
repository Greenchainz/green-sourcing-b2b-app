'use client'

import { useState, useEffect, useCallback } from 'react'
import FilterSidebar, { DEFAULT_FILTERS, type FilterState } from '../components/catalog/FilterSidebar'
import MaterialCard, { type Material } from '../components/catalog/MaterialCard'
import CompareTray from '../components/catalog/CompareTray'

const ITEMS_PER_PAGE = 24

// Categories for the filter
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
]

export default function CatalogPage() {
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS)
  const [compareList, setCompareList] = useState<Material[]>([])
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  // Fetch materials from API
  const fetchMaterials = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', String(ITEMS_PER_PAGE))
      params.set('sortBy', filters.sortBy)

      if (filters.minScore > 0) {
        params.set('minScore', String(filters.minScore))
      }
      if (filters.categories.length > 0) {
        params.set('categories', filters.categories.join(','))
      }
      if (filters.certifications.length > 0) {
        params.set('certifications', filters.certifications.join(','))
      }

      const response = await fetch(`/api/v1/catalog/materials?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch materials')
      }

      const data = await response.json()
      setMaterials(data.materials || data.data || [])
      setTotalCount(data.total || data.totalCount || 0)
    } catch (err) {
      console.error('Error fetching materials:', err)
      setError('Failed to load materials. Please try again.')
      // Use mock data for demo purposes
      setMaterials(MOCK_MATERIALS)
      setTotalCount(MOCK_MATERIALS.length)
    } finally {
      setLoading(false)
    }
  }, [page, filters])

  useEffect(() => {
    fetchMaterials()
  }, [fetchMaterials])

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [filters])

  const handleCompareToggle = (material: Material) => {
    setCompareList((prev) => {
      const exists = prev.find((m) => m.id === material.id)
      if (exists) {
        return prev.filter((m) => m.id !== material.id)
      }
      if (prev.length >= 5) {
        return prev
      }
      return [...prev, material]
    })
  }

  const handleCompareRemove = (materialId: string) => {
    setCompareList((prev) => prev.filter((m) => m.id !== materialId))
  }

  const handleCompareClear = () => {
    setCompareList([])
  }

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)

  return (
    <div className="gc-page" style={{ minHeight: '100vh' }}>
      <div className="gc-container" style={{ paddingTop: 32, paddingBottom: compareList.length > 0 ? 120 : 48 }}>
        {/* Page Header */}
        <header style={{ marginBottom: 32 }}>
          <h1
            className="gc-animate-fade-in"
            style={{
              margin: 0,
              fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
              fontWeight: 900,
              color: 'var(--gc-slate-900)',
              letterSpacing: '-0.02em',
            }}
          >
            Material Catalog
          </h1>
          <p
            className="gc-animate-fade-in gc-stagger-1"
            style={{
              margin: '0.5rem 0 0',
              fontSize: '1rem',
              color: 'var(--gc-slate-600)',
              lineHeight: 1.6,
            }}
          >
            Discover verified sustainable materials with gold-standard certifications
          </p>

          {/* Mobile filter toggle */}
          <button
            onClick={() => setMobileFiltersOpen(true)}
            className="gc-btn gc-btn-secondary gc-mobile-filter-btn"
            style={{
              marginTop: '1rem',
              display: 'none', // Hidden by default, shown via CSS media query
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
            >
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            Filters
            {(filters.categories.length > 0 ||
              filters.certifications.length > 0 ||
              filters.minScore > 0) && (
              <span
                style={{
                  padding: '0.15rem 0.45rem',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  background: 'var(--gc-emerald-500)',
                  color: 'white',
                  borderRadius: 'var(--gc-radius-sm)',
                }}
              >
                {filters.categories.length + filters.certifications.length + (filters.minScore > 0 ? 1 : 0)}
              </span>
            )}
          </button>
        </header>

        {/* Main content layout */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '280px 1fr',
            gap: '2rem',
            alignItems: 'start',
          }}
          className="gc-catalog-layout"
        >
          {/* Sidebar */}
          <div className="gc-sidebar-wrapper">
            <FilterSidebar
              filters={filters}
              onChange={setFilters}
              categories={CATEGORIES}
              isOpen={mobileFiltersOpen}
              onClose={() => setMobileFiltersOpen(false)}
            />
          </div>

          {/* Materials Grid */}
          <main>
            {/* Results count */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1rem',
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: '0.875rem',
                  color: 'var(--gc-slate-600)',
                }}
              >
                Showing{' '}
                <strong style={{ color: 'var(--gc-slate-900)' }}>
                  {Math.min((page - 1) * ITEMS_PER_PAGE + 1, totalCount)}-
                  {Math.min(page * ITEMS_PER_PAGE, totalCount)}
                </strong>{' '}
                of <strong style={{ color: 'var(--gc-slate-900)' }}>{totalCount}</strong> materials
              </p>
            </div>

            {/* Loading state */}
            {loading && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 400,
                  flexDirection: 'column',
                  gap: '1rem',
                }}
              >
                <div className="gc-spinner" />
                <p style={{ margin: 0, color: 'var(--gc-slate-500)' }}>Loading materials...</p>
              </div>
            )}

            {/* Error state */}
            {error && !loading && (
              <div className="gc-alert gc-alert-error" style={{ marginBottom: '1rem' }}>
                {error}
              </div>
            )}

            {/* Materials grid */}
            {!loading && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                  gap: '1.25rem',
                }}
              >
                {materials.map((material, index) => (
                  <div
                    key={material.id}
                    className="gc-animate-fade-in"
                    style={{ animationDelay: `${Math.min(index * 0.03, 0.3)}s` }}
                  >
                    <MaterialCard
                      material={material}
                      isSelected={compareList.some((m) => m.id === material.id)}
                      onCompareToggle={handleCompareToggle}
                      compareDisabled={compareList.length >= 5}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Empty state */}
            {!loading && materials.length === 0 && (
              <div
                className="gc-card"
                style={{
                  padding: '3rem',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    width: 64,
                    height: 64,
                    margin: '0 auto 1rem',
                    borderRadius: 'var(--gc-radius-xl)',
                    background: 'var(--gc-slate-100)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--gc-slate-400)"
                    strokeWidth="2"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                </div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: '1.125rem',
                    fontWeight: 700,
                    color: 'var(--gc-slate-900)',
                  }}
                >
                  No materials found
                </h3>
                <p
                  style={{
                    margin: '0.5rem 0 1.25rem',
                    color: 'var(--gc-slate-600)',
                    fontSize: '0.9rem',
                  }}
                >
                  Try adjusting your filters to find what you&apos;re looking for.
                </p>
                <button
                  onClick={() => setFilters(DEFAULT_FILTERS)}
                  className="gc-btn gc-btn-secondary"
                >
                  Clear all filters
                </button>
              </div>
            )}

            {/* Pagination */}
            {!loading && totalPages > 1 && (
              <nav
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  marginTop: '2rem',
                  paddingTop: '1.5rem',
                  borderTop: '1px solid var(--gc-slate-100)',
                }}
                aria-label="Pagination"
              >
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="gc-btn gc-btn-ghost"
                  style={{ padding: '0.5rem 0.85rem', fontSize: '0.85rem' }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                  Previous
                </button>

                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (page <= 3) {
                      pageNum = i + 1
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = page - 2 + i
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        style={{
                          minWidth: 36,
                          height: 36,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: 'var(--gc-radius)',
                          border: 'none',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all var(--gc-duration) var(--gc-ease)',
                          background:
                            page === pageNum
                              ? 'linear-gradient(135deg, var(--gc-emerald-500), var(--gc-teal-500))'
                              : 'transparent',
                          color: page === pageNum ? 'white' : 'var(--gc-slate-700)',
                          boxShadow:
                            page === pageNum ? '0 4px 12px rgba(16, 185, 129, 0.25)' : 'none',
                        }}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                </div>

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="gc-btn gc-btn-ghost"
                  style={{ padding: '0.5rem 0.85rem', fontSize: '0.85rem' }}
                >
                  Next
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              </nav>
            )}
          </main>
        </div>
      </div>

      {/* Compare Tray */}
      <CompareTray
        materials={compareList}
        onRemove={handleCompareRemove}
        onClear={handleCompareClear}
        maxItems={5}
      />

      {/* Responsive styles */}
      <style jsx>{`
        @media (max-width: 1024px) {
          .gc-catalog-layout {
            grid-template-columns: 1fr !important;
          }
          .gc-sidebar-wrapper {
            display: none;
          }
          .gc-mobile-filter-btn {
            display: inline-flex !important;
          }
        }
      `}</style>
    </div>
  )
}

// Mock data for development/demo
const MOCK_MATERIALS: Material[] = [
  {
    id: '1',
    name: 'EcoFloor Pro Hardwood',
    category: 'Flooring',
    manufacturer: 'GreenWood Industries',
    sustainabilityScore: 92,
    certifications: ['FSC', 'LEED', 'GREENGUARD'],
    supplierCount: 8,
    priceRange: { min: 8, max: 15 },
    imageUrl: '',
  },
  {
    id: '2',
    name: 'ThermaShield R-40 Insulation',
    category: 'Insulation',
    manufacturer: 'EcoInsulate Corp',
    sustainabilityScore: 88,
    certifications: ['ENERGY STAR', 'GREENGUARD', 'EPD'],
    supplierCount: 12,
    priceRange: { min: 2, max: 5 },
    imageUrl: '',
  },
  {
    id: '3',
    name: 'SolarReflect Metal Roofing',
    category: 'Roofing',
    manufacturer: 'SustainRoof LLC',
    sustainabilityScore: 85,
    certifications: ['LEED', 'EPD', 'CRADLE TO CRADLE'],
    supplierCount: 5,
    priceRange: { min: 12, max: 22 },
    imageUrl: '',
  },
  {
    id: '4',
    name: 'BioPanel Wall System',
    category: 'Wall Systems',
    manufacturer: 'BioBuild Materials',
    sustainabilityScore: 94,
    certifications: ['DECLARE', 'LBC', 'LEED', 'FSC'],
    supplierCount: 3,
    priceRange: { min: 18, max: 35 },
    imageUrl: '',
  },
  {
    id: '5',
    name: 'ClearView Triple Pane Windows',
    category: 'Windows & Doors',
    manufacturer: 'EcoGlass Solutions',
    sustainabilityScore: 79,
    certifications: ['ENERGY STAR', 'GREENGUARD'],
    supplierCount: 7,
    priceRange: { min: 350, max: 800 },
    imageUrl: '',
  },
  {
    id: '6',
    name: 'RecycledCrete Structural Concrete',
    category: 'Structural',
    manufacturer: 'GreenConcrete Inc',
    sustainabilityScore: 72,
    certifications: ['EPD', 'LEED'],
    supplierCount: 15,
    priceRange: { min: 120, max: 180 },
    imageUrl: '',
  },
  {
    id: '7',
    name: 'NaturalFinish Zero-VOC Paint',
    category: 'Finishes',
    manufacturer: 'PureCoat Systems',
    sustainabilityScore: 96,
    certifications: ['GREENGUARD', 'DECLARE', 'CRADLE TO CRADLE'],
    supplierCount: 20,
    priceRange: { min: 45, max: 75 },
    imageUrl: '',
  },
  {
    id: '8',
    name: 'SmartLight LED Panel System',
    category: 'Lighting',
    manufacturer: 'EcoLumen Technologies',
    sustainabilityScore: 83,
    certifications: ['ENERGY STAR', 'EPD'],
    supplierCount: 11,
    priceRange: { min: 85, max: 150 },
    imageUrl: '',
  },
]
