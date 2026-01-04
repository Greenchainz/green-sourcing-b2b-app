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
import { useState, useMemo } from 'react'
import FilterSidebar, { MobileFilterButton, type FilterState } from '../components/catalog/FilterSidebar'
import MaterialCard, { type Material } from '../components/catalog/MaterialCard'
import CompareTray from '../components/catalog/CompareTray'
import type { CertificationType } from '../components/catalog/CertificationBadge'

// Mock data - would come from API in production
const MOCK_MATERIALS: Material[] = [
  {
    id: 'mat-001',
    name: 'EcoTimber Premium Hardwood Flooring',
    category: 'Flooring',
    subcategory: 'Hardwood',
    manufacturer: 'EcoTimber Inc.',
    image: '/placeholder-material.png',
    sustainabilityScore: 92,
    certifications: ['fsc', 'leed', 'epd'],
    leedPoints: 8,
    carbonFootprint: 12.4,
    recycledContent: 35,
    verifiedSuppliers: 8,
    shadowSuppliers: 12,
    featured: true,
  },
  {
    id: 'mat-002',
    name: 'GreenCore Recycled Steel Beams',
    category: 'Structural',
    subcategory: 'Steel',
    manufacturer: 'GreenCore Steel',
    image: '/placeholder-material.png',
    sustainabilityScore: 88,
    certifications: ['epd', 'leed'],
    leedPoints: 6,
    carbonFootprint: 45.2,
    recycledContent: 95,
    verifiedSuppliers: 5,
    shadowSuppliers: 8,
  },
  {
    id: 'mat-003',
    name: 'BioFiber Insulation Panels',
    category: 'Insulation',
    subcategory: 'Natural Fiber',
    manufacturer: 'BioFiber Solutions',
    image: '/placeholder-material.png',
    sustainabilityScore: 95,
    certifications: ['greenguard', 'declare', 'epd'],
    leedPoints: 10,
    carbonFootprint: 3.2,
    recycledContent: 80,
    verifiedSuppliers: 3,
    shadowSuppliers: 5,
    featured: true,
  },
  {
    id: 'mat-004',
    name: 'ClearVue Low-E Triple Glazing',
    category: 'Windows',
    subcategory: 'Glazing',
    manufacturer: 'ClearVue Glass',
    image: '/placeholder-material.png',
    sustainabilityScore: 78,
    certifications: ['energy-star', 'epd'],
    leedPoints: 5,
    carbonFootprint: 28.5,
    recycledContent: 20,
    verifiedSuppliers: 6,
    shadowSuppliers: 4,
  },
  {
    id: 'mat-005',
    name: 'TerraCotta Rain Screen Panels',
    category: 'Cladding',
    subcategory: 'Terracotta',
    manufacturer: 'TerraCotta Systems',
    image: '/placeholder-material.png',
    sustainabilityScore: 72,
    certifications: ['leed', 'breeam'],
    leedPoints: 4,
    carbonFootprint: 18.9,
    recycledContent: 15,
    verifiedSuppliers: 4,
    shadowSuppliers: 7,
  },
  {
    id: 'mat-006',
    name: 'SolarShade Dynamic Glass',
    category: 'Windows',
    subcategory: 'Smart Glass',
    manufacturer: 'SolarShade Tech',
    image: '/placeholder-material.png',
    sustainabilityScore: 85,
    certifications: ['energy-star', 'leed', 'epd'],
    leedPoints: 7,
    carbonFootprint: 32.1,
    recycledContent: 25,
    verifiedSuppliers: 2,
    shadowSuppliers: 3,
  },
  {
    id: 'mat-007',
    name: 'HempCrete Building Blocks',
    category: 'Masonry',
    subcategory: 'Bio-Based',
    manufacturer: 'HempBuild Co.',
    image: '/placeholder-material.png',
    sustainabilityScore: 98,
    certifications: ['declare', 'cradle-to-cradle', 'epd'],
    leedPoints: 12,
    carbonFootprint: -5.2,
    recycledContent: 0,
    verifiedSuppliers: 2,
    shadowSuppliers: 6,
    featured: true,
  },
  {
    id: 'mat-008',
    name: 'RecycleRoof Metal Panels',
    category: 'Roofing',
    subcategory: 'Metal',
    manufacturer: 'RecycleRoof Industries',
    image: '/placeholder-material.png',
    sustainabilityScore: 82,
    certifications: ['leed', 'epd'],
    leedPoints: 5,
    carbonFootprint: 22.8,
    recycledContent: 70,
    verifiedSuppliers: 7,
    shadowSuppliers: 9,
  },
  {
    id: 'mat-009',
    name: 'AquaGuard Permeable Pavers',
    category: 'Hardscape',
    subcategory: 'Pavers',
    manufacturer: 'AquaGuard Outdoor',
    image: '/placeholder-material.png',
    sustainabilityScore: 76,
    certifications: ['leed', 'breeam'],
    leedPoints: 4,
    carbonFootprint: 15.3,
    recycledContent: 40,
    verifiedSuppliers: 5,
    shadowSuppliers: 11,
  },
  {
    id: 'mat-010',
    name: 'EcoWall Bamboo Panels',
    category: 'Wall Finishes',
    subcategory: 'Wood Panels',
    manufacturer: 'EcoWall Designs',
    image: '/placeholder-material.png',
    sustainabilityScore: 89,
    certifications: ['fsc', 'greenguard', 'leed'],
    leedPoints: 7,
    carbonFootprint: 8.7,
    recycledContent: 10,
    verifiedSuppliers: 4,
    shadowSuppliers: 6,
  },
  {
    id: 'mat-011',
    name: 'ZeroVOC Interior Paint',
    category: 'Coatings',
    subcategory: 'Paint',
    manufacturer: 'PureCoat Labs',
    image: '/placeholder-material.png',
    sustainabilityScore: 94,
    certifications: ['greenguard', 'declare', 'leed'],
    leedPoints: 8,
    carbonFootprint: 2.1,
    recycledContent: 5,
    verifiedSuppliers: 9,
    shadowSuppliers: 14,
  },
  {
    id: 'mat-012',
    name: 'CorkTech Acoustic Flooring',
    category: 'Flooring',
    subcategory: 'Cork',
    manufacturer: 'CorkTech International',
    image: '/placeholder-material.png',
    sustainabilityScore: 91,
    certifications: ['fsc', 'epd', 'cradle-to-cradle'],
    leedPoints: 9,
    carbonFootprint: 6.4,
    recycledContent: 65,
    verifiedSuppliers: 3,
    shadowSuppliers: 5,
  },
]

const CATEGORIES = [
  {
    id: 'flooring',
    name: 'Flooring',
    count: 24,
    subcategories: [
      { id: 'hardwood', name: 'Hardwood', count: 8 },
      { id: 'cork', name: 'Cork', count: 4 },
      { id: 'tile', name: 'Tile', count: 7 },
      { id: 'carpet', name: 'Carpet', count: 5 },
    ],
  },
  {
    id: 'structural',
    name: 'Structural',
    count: 18,
    subcategories: [
      { id: 'steel', name: 'Steel', count: 6 },
      { id: 'timber', name: 'Timber', count: 8 },
      { id: 'concrete', name: 'Concrete', count: 4 },
    ],
  },
  {
    id: 'insulation',
    name: 'Insulation',
    count: 15,
    subcategories: [
      { id: 'natural-fiber', name: 'Natural Fiber', count: 5 },
      { id: 'foam', name: 'Foam', count: 6 },
      { id: 'mineral-wool', name: 'Mineral Wool', count: 4 },
    ],
  },
  { id: 'windows', name: 'Windows', count: 12 },
  { id: 'cladding', name: 'Cladding', count: 10 },
  { id: 'roofing', name: 'Roofing', count: 14 },
  { id: 'masonry', name: 'Masonry', count: 9 },
  { id: 'wall-finishes', name: 'Wall Finishes', count: 16 },
  { id: 'coatings', name: 'Coatings', count: 11 },
  { id: 'hardscape', name: 'Hardscape', count: 8 },
]

const CERTIFICATIONS: { id: CertificationType; name: string; count: number }[] = [
  { id: 'leed', name: 'LEED Certified', count: 156 },
  { id: 'fsc', name: 'FSC Certified', count: 89 },
  { id: 'epd', name: 'EPD Verified', count: 124 },
  { id: 'breeam', name: 'BREEAM', count: 67 },
  { id: 'greenguard', name: 'GREENGUARD Gold', count: 45 },
  { id: 'cradle-to-cradle', name: 'Cradle to Cradle', count: 32 },
  { id: 'energy-star', name: 'ENERGY STAR', count: 28 },
  { id: 'declare', name: 'Declare Label', count: 41 },
]

const MANUFACTURERS = [
  { id: 'ecotimber', name: 'EcoTimber Inc.', count: 12 },
  { id: 'greencore', name: 'GreenCore Steel', count: 8 },
  { id: 'biofiber', name: 'BioFiber Solutions', count: 6 },
  { id: 'clearvue', name: 'ClearVue Glass', count: 9 },
  { id: 'terracotta', name: 'TerraCotta Systems', count: 5 },
  { id: 'solarshade', name: 'SolarShade Tech', count: 4 },
  { id: 'hempbuild', name: 'HempBuild Co.', count: 3 },
  { id: 'recycleroof', name: 'RecycleRoof Industries', count: 7 },
  { id: 'aquaguard', name: 'AquaGuard Outdoor', count: 5 },
  { id: 'ecowall', name: 'EcoWall Designs', count: 8 },
  { id: 'purecoat', name: 'PureCoat Labs', count: 6 },
  { id: 'corktech', name: 'CorkTech International', count: 4 },
]

const ITEMS_PER_PAGE = 24

type SortOption = 'score-desc' | 'score-asc' | 'name-asc' | 'name-desc' | 'suppliers-desc'

export default function CatalogPage() {
  const [filters, setFilters] = useState<FilterState>({
    categories: [],
    certifications: [],
    scoreRange: [0, 100],
    priceRange: [],
    manufacturers: [],
  })
  const [compareList, setCompareList] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [sortBy, setSortBy] = useState<SortOption>('score-desc')
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Filter and sort materials
  const filteredMaterials = useMemo(() => {
    let result = [...MOCK_MATERIALS]

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(query) ||
          m.manufacturer.toLowerCase().includes(query) ||
          m.category.toLowerCase().includes(query)
      )
    }

    // Category filter
    if (filters.categories.length > 0) {
      result = result.filter((m) =>
        filters.categories.some(
          (cat) =>
            m.category.toLowerCase().replace(/\s+/g, '-') === cat ||
            m.subcategory?.toLowerCase().replace(/\s+/g, '-') === cat
        )
      )
    }

    // Certification filter
    if (filters.certifications.length > 0) {
      result = result.filter((m) =>
        filters.certifications.some((cert) => m.certifications.includes(cert))
      )
    }

    // Score range filter
    result = result.filter(
      (m) =>
        m.sustainabilityScore >= filters.scoreRange[0] &&
        m.sustainabilityScore <= filters.scoreRange[1]
    )

    // Manufacturer filter
    if (filters.manufacturers.length > 0) {
      result = result.filter((m) =>
        filters.manufacturers.some(
          (mfr) => m.manufacturer.toLowerCase().replace(/\s+/g, '-').includes(mfr)
        )
      )
    }

    // Sort
    switch (sortBy) {
      case 'score-desc':
        result.sort((a, b) => b.sustainabilityScore - a.sustainabilityScore)
        break
      case 'score-asc':
        result.sort((a, b) => a.sustainabilityScore - b.sustainabilityScore)
        break
      case 'name-asc':
        result.sort((a, b) => a.name.localeCompare(b.name))
        break
      case 'name-desc':
        result.sort((a, b) => b.name.localeCompare(a.name))
        break
      case 'suppliers-desc':
        result.sort((a, b) => b.verifiedSuppliers - a.verifiedSuppliers)
        break
    }

    return result
  }, [filters, sortBy, searchQuery])

  // Pagination
  const totalPages = Math.ceil(filteredMaterials.length / ITEMS_PER_PAGE)
  const paginatedMaterials = filteredMaterials.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  // Compare functionality
  const handleCompareToggle = (materialId: string, selected: boolean) => {
    if (selected && compareList.length >= 5) return // Max 5 items
    setCompareList((prev) =>
      selected ? [...prev, materialId] : prev.filter((id) => id !== materialId)
    )
  }

  const compareMaterials = MOCK_MATERIALS.filter((m) => compareList.includes(m.id))

  const activeFilterCount =
    filters.categories.length +
    filters.certifications.length +
    filters.manufacturers.length +
    (filters.scoreRange[0] > 0 || filters.scoreRange[1] < 100 ? 1 : 0)

  return (
    <div className="gc-page">
      {/* Page Header */}
      <div
        style={{
          borderBottom: '1px solid var(--gc-glass-border)',
          background: 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div className="gc-container" style={{ padding: '1.5rem 1rem' }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: 'clamp(1.5rem, 4vw, 2rem)',
                  fontWeight: 900,
                  color: 'var(--gc-slate-900)',
                }}
              >
                Material Catalog
              </h1>
              <p
                style={{
                  margin: '0.35rem 0 0 0',
                  fontSize: '0.9375rem',
                  color: 'var(--gc-slate-600)',
                }}
              >
                Discover verified sustainable building materials from trusted suppliers
              </p>
            </div>

            {/* Search & Actions Bar */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: '0.75rem',
              }}
            >
              {/* Search */}
              <div
                style={{
                  flex: '1 1 280px',
                  position: 'relative',
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--gc-slate-400)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    position: 'absolute',
                    left: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 18,
                    height: 18,
                    pointerEvents: 'none',
                  }}
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="search"
                  placeholder="Search materials, manufacturers..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="gc-input"
                  style={{
                    paddingLeft: 42,
                    paddingRight: 12,
                  }}
                />
              </div>

              {/* Mobile Filters Button */}
              <div className="gc-mobile-only" style={{ display: 'none' }}>
                <MobileFilterButton
                  filterCount={activeFilterCount}
                  onClick={() => setShowMobileFilters(true)}
                />
              </div>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="gc-select"
                style={{
                  width: 'auto',
                  minWidth: 180,
                }}
              >
                <option value="score-desc">Highest Score</option>
                <option value="score-asc">Lowest Score</option>
                <option value="name-asc">Name A-Z</option>
                <option value="name-desc">Name Z-A</option>
                <option value="suppliers-desc">Most Suppliers</option>
              </select>

              {/* Results Count */}
              <div
                style={{
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: 'var(--gc-slate-600)',
                  whiteSpace: 'nowrap',
                }}
              >
                {filteredMaterials.length} materials
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div
        style={{
          display: 'flex',
          minHeight: 'calc(100vh - 200px)',
        }}
      >
        {/* Sidebar */}
        <FilterSidebar
          filters={filters}
          onFiltersChange={(newFilters) => {
            setFilters(newFilters)
            setCurrentPage(1)
          }}
          availableCategories={CATEGORIES}
          availableCertifications={CERTIFICATIONS}
          availableManufacturers={MANUFACTURERS}
        />

        {/* Grid Content */}
        <div
          style={{
            flex: 1,
            padding: '1.5rem',
            minWidth: 0,
          }}
        >
          {/* Materials Grid */}
          {paginatedMaterials.length > 0 ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '1.25rem',
                marginBottom: '2rem',
              }}
            >
              {paginatedMaterials.map((material, index) => (
                <MaterialCard
                  key={material.id}
                  material={material}
                  isSelected={compareList.includes(material.id)}
                  onCompareToggle={handleCompareToggle}
                  compareEnabled={true}
                  animationIndex={index}
                />
              ))}
            </div>
          ) : (
            <div
              className="gc-card gc-animate-fade-in"
              style={{
                padding: '3rem 2rem',
                textAlign: 'center',
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--gc-slate-400)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  width: 48,
                  height: 48,
                  margin: '0 auto 1rem auto',
                }}
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <h3
                style={{
                  margin: '0 0 0.5rem 0',
                  fontSize: '1.125rem',
                  fontWeight: 800,
                  color: 'var(--gc-slate-900)',
                }}
              >
                No materials found
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: '0.875rem',
                  color: 'var(--gc-slate-600)',
                }}
              >
                Try adjusting your filters or search query
              </p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                marginBottom: compareList.length > 0 ? '120px' : '2rem',
              }}
            >
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="gc-btn gc-btn-ghost"
                style={{ padding: '0.5rem 0.75rem' }}
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
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>

              {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                let pageNum: number
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (currentPage <= 3) {
                  pageNum = i + 1
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = currentPage - 2 + i
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`gc-btn ${currentPage === pageNum ? 'gc-btn-primary' : 'gc-btn-ghost'}`}
                    style={{
                      padding: '0.5rem 0.85rem',
                      minWidth: 40,
                    }}
                  >
                    {pageNum}
                  </button>
                )
              })}

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="gc-btn gc-btn-ghost"
                style={{ padding: '0.5rem 0.75rem' }}
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
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
          )}
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
        materials={compareMaterials}
        maxItems={5}
        onRemove={(id) => setCompareList((prev) => prev.filter((i) => i !== id))}
        onClearAll={() => setCompareList([])}
      />

      {/* Mobile Filter Overlay */}
      {showMobileFilters && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(0, 0, 0, 0.5)',
          }}
          onClick={() => setShowMobileFilters(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: '100%',
              maxWidth: 320,
              background: 'white',
              overflowY: 'auto',
            }}
          >
            <div
              style={{
                position: 'sticky',
                top: 0,
                background: 'white',
                borderBottom: '1px solid var(--gc-slate-200)',
                padding: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: '1.125rem',
                  fontWeight: 800,
                }}
              >
                Filters
              </h2>
              <button
                onClick={() => setShowMobileFilters(false)}
                style={{
                  padding: 8,
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
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
                  style={{ width: 24, height: 24 }}
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <FilterSidebar
              filters={filters}
              onFiltersChange={(newFilters) => {
                setFilters(newFilters)
                setCurrentPage(1)
              }}
              availableCategories={CATEGORIES}
              availableCertifications={CERTIFICATIONS}
              availableManufacturers={MANUFACTURERS}
            />
          </div>
        </div>
      )}
    </div>
  )
}
