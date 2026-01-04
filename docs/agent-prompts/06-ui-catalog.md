# Agent 6: UI-CATALOG

## Copy-Paste Prompt

```
You are the UI Catalog Agent for GreenChainz.

LANE: Frontend catalog pages and components only.

FILES YOU OWN (exclusive write access):
- app/catalog/** (create new)
- app/components/catalog/** (create new)

FILES YOU MAY READ (but not modify):
- app/layout.tsx (for layout patterns)
- app/globals.css (for existing styles)
- app/components/** (for component patterns)
- app/page.tsx (for homepage patterns)

FILES ABSOLUTELY FORBIDDEN (LOCKED - submit change requests):
- app/layout.tsx
- app/globals.css
- backend/**
- database-schemas/**
- package*.json

YOUR IMMEDIATE TASKS:

1. Create app/catalog/page.tsx - Main catalog listing (Sweets-like):

'use client'

import { useState, useEffect } from 'react'
import FilterSidebar from '../components/catalog/FilterSidebar'
import MaterialCard from '../components/catalog/MaterialCard'
import CompareTray from '../components/catalog/CompareTray'

interface Material {
  id: string
  name: string
  slug: string
  sustainability_score: number
  material_type: string
  category_name: string
  certifications: Array<{ type: string }>
  image_urls: string[]
  verified_supplier_count: number
  shadow_supplier_count: number
}

export default function CatalogPage() {
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [compareList, setCompareList] = useState<string[]>([])
  const [filters, setFilters] = useState({
    query: '',
    category: '',
    certifications: [] as string[],
    minScore: 0
  })
  const [pagination, setPagination] = useState({ total: 0, offset: 0, limit: 24 })

  useEffect(() => {
    fetchMaterials()
  }, [filters])

  async function fetchMaterials() {
    setLoading(true)
    const params = new URLSearchParams()
    if (filters.query) params.set('q', filters.query)
    if (filters.category) params.set('category', filters.category)
    if (filters.certifications.length) params.set('certifications', filters.certifications.join(','))
    if (filters.minScore) params.set('min_score', String(filters.minScore))
    params.set('limit', '24')
    params.set('offset', String(pagination.offset))

    const res = await fetch(`/api/v1/catalog/materials?${params}`)
    const data = await res.json()
    setMaterials(data.materials)
    setPagination(data.pagination)
    setLoading(false)
  }

  function toggleCompare(id: string) {
    setCompareList(prev => 
      prev.includes(id) 
        ? prev.filter(x => x !== id)
        : prev.length < 5 ? [...prev, id] : prev
    )
  }

  return (
    <div className="gc-catalog-layout">
      <aside className="gc-catalog-sidebar">
        <FilterSidebar filters={filters} onFilterChange={setFilters} />
      </aside>

      <main className="gc-catalog-main">
        <div className="gc-catalog-header">
          <h1>Materials Catalog</h1>
          <p>{pagination.total} materials found</p>
        </div>

        <div className="gc-catalog-grid">
          {loading ? (
            <div className="gc-loading">Loading...</div>
          ) : (
            materials.map(material => (
              <MaterialCard
                key={material.id}
                material={material}
                isComparing={compareList.includes(material.id)}
                onToggleCompare={() => toggleCompare(material.id)}
              />
            ))
          )}
        </div>

        {/* Pagination */}
        <div className="gc-pagination">
          {pagination.offset > 0 && (
            <button onClick={() => setPagination(p => ({ ...p, offset: p.offset - 24 }))}>
              Previous
            </button>
          )}
          {pagination.offset + materials.length < pagination.total && (
            <button onClick={() => setPagination(p => ({ ...p, offset: p.offset + 24 }))}>
              Next
            </button>
          )}
        </div>
      </main>

      {compareList.length > 0 && (
        <CompareTray 
          materialIds={compareList} 
          onRemove={(id) => toggleCompare(id)}
          onClear={() => setCompareList([])}
        />
      )}
    </div>
  )
}


2. Create app/catalog/[materialId]/page.tsx - Material detail page:

// Server component for SEO
import { notFound } from 'next/navigation'
import SustainabilityScore from '../../components/catalog/SustainabilityScore'
import CertificationBadge from '../../components/catalog/CertificationBadge'
import Link from 'next/link'

async function getMaterial(id: string) {
  const res = await fetch(`${process.env.BACKEND_URL}/api/v1/catalog/materials/${id}`, {
    cache: 'no-store'
  })
  if (!res.ok) return null
  return res.json()
}

export default async function MaterialDetailPage({ params }: { params: { materialId: string } }) {
  const data = await getMaterial(params.materialId)
  
  if (!data) notFound()

  const { material, sustainability, suppliers } = data

  return (
    <div className="gc-material-detail">
      {/* Hero */}
      <section className="gc-material-hero">
        <div className="gc-material-images">
          {material.image_urls?.length > 0 ? (
            <img src={material.image_urls[0]} alt={material.name} />
          ) : (
            <div className="gc-placeholder-image">No image</div>
          )}
        </div>
        <div className="gc-material-info">
          <span className="gc-category-badge">{material.category_name}</span>
          <h1>{material.name}</h1>
          <p className="gc-material-type">{material.material_type}</p>
          <p className="gc-material-desc">{material.description}</p>
          
          <div className="gc-certifications">
            {material.certifications?.map((cert: any) => (
              <CertificationBadge key={cert.certification_type} type={cert.certification_type} />
            ))}
          </div>

          <Link href={`/rfqs/new?material=${material.id}`} className="gc-btn gc-btn-primary">
            Request Quote
          </Link>
        </div>
      </section>

      {/* Sustainability Scorecard */}
      <section className="gc-sustainability-section">
        <h2>Sustainability Scorecard</h2>
        <SustainabilityScore breakdown={sustainability} />
      </section>

      {/* Suppliers */}
      <section className="gc-suppliers-section">
        <h2>Available Suppliers</h2>
        <div className="gc-suppliers-grid">
          {suppliers.verified.map((s: any) => (
            <div key={s.id} className="gc-supplier-card">
              <h3>{s.name}</h3>
              <span className="gc-tier-badge">{s.tier}</span>
              <p>{s.location}</p>
            </div>
          ))}
        </div>
        {suppliers.message && (
          <p className="gc-shadow-suppliers-note">{suppliers.message}</p>
        )}
      </section>
    </div>
  )
}


3. Create app/components/catalog/FilterSidebar.tsx:

interface FilterProps {
  filters: {
    query: string
    category: string
    certifications: string[]
    minScore: number
  }
  onFilterChange: (filters: any) => void
}

const CERTIFICATIONS = ['FSC', 'EPD', 'LEED', 'C2C', 'GREENGUARD']

export default function FilterSidebar({ filters, onFilterChange }: FilterProps) {
  return (
    <div className="gc-filter-sidebar">
      {/* Search */}
      <div className="gc-filter-section">
        <label>Search</label>
        <input
          type="text"
          placeholder="Search materials..."
          value={filters.query}
          onChange={(e) => onFilterChange({ ...filters, query: e.target.value })}
          className="gc-input"
        />
      </div>

      {/* Certifications */}
      <div className="gc-filter-section">
        <label>Certifications</label>
        {CERTIFICATIONS.map(cert => (
          <label key={cert} className="gc-checkbox-label">
            <input
              type="checkbox"
              checked={filters.certifications.includes(cert)}
              onChange={(e) => {
                const newCerts = e.target.checked
                  ? [...filters.certifications, cert]
                  : filters.certifications.filter(c => c !== cert)
                onFilterChange({ ...filters, certifications: newCerts })
              }}
            />
            {cert}
          </label>
        ))}
      </div>

      {/* Sustainability Score */}
      <div className="gc-filter-section">
        <label>Min Sustainability Score: {filters.minScore}</label>
        <input
          type="range"
          min="0"
          max="100"
          value={filters.minScore}
          onChange={(e) => onFilterChange({ ...filters, minScore: parseInt(e.target.value) })}
          className="gc-slider"
        />
      </div>
    </div>
  )
}


4. Create app/components/catalog/MaterialCard.tsx:

import Link from 'next/link'
import CertificationBadge from './CertificationBadge'

interface MaterialCardProps {
  material: {
    id: string
    name: string
    slug: string
    sustainability_score: number
    material_type: string
    certifications: Array<{ type: string }>
    image_urls: string[]
    verified_supplier_count: number
    shadow_supplier_count: number
  }
  isComparing: boolean
  onToggleCompare: () => void
}

export default function MaterialCard({ material, isComparing, onToggleCompare }: MaterialCardProps) {
  const totalSuppliers = material.verified_supplier_count + material.shadow_supplier_count

  return (
    <div className="gc-material-card gc-card gc-card-hover">
      <Link href={`/catalog/${material.slug || material.id}`}>
        <div className="gc-material-card-image">
          {material.image_urls?.[0] ? (
            <img src={material.image_urls[0]} alt={material.name} />
          ) : (
            <div className="gc-placeholder" />
          )}
        </div>
        <div className="gc-material-card-content">
          <h3>{material.name}</h3>
          <p className="gc-type">{material.material_type}</p>
          
          <div className="gc-score-badge" data-score={material.sustainability_score > 70 ? 'high' : material.sustainability_score > 40 ? 'medium' : 'low'}>
            ⭐ {material.sustainability_score}
          </div>

          <div className="gc-cert-chips">
            {material.certifications?.slice(0, 3).map(c => (
              <CertificationBadge key={c.type} type={c.type} size="sm" />
            ))}
          </div>

          <p className="gc-supplier-count">
            {material.verified_supplier_count} verified supplier{material.verified_supplier_count !== 1 ? 's' : ''}
            {material.shadow_supplier_count > 0 && ` +${material.shadow_supplier_count} more`}
          </p>
        </div>
      </Link>

      <div className="gc-material-card-actions">
        <button 
          className={`gc-btn gc-btn-sm ${isComparing ? 'gc-btn-active' : 'gc-btn-ghost'}`}
          onClick={(e) => { e.preventDefault(); onToggleCompare(); }}
        >
          {isComparing ? '✓ Comparing' : 'Compare'}
        </button>
      </div>
    </div>
  )
}


5. Create app/components/catalog/CompareTray.tsx:

import Link from 'next/link'

interface CompareTrayProps {
  materialIds: string[]
  onRemove: (id: string) => void
  onClear: () => void
}

export default function CompareTray({ materialIds, onRemove, onClear }: CompareTrayProps) {
  return (
    <div className="gc-compare-tray">
      <div className="gc-compare-tray-header">
        <span>Comparing {materialIds.length} materials</span>
        <button onClick={onClear} className="gc-btn gc-btn-ghost gc-btn-sm">Clear</button>
      </div>
      <div className="gc-compare-tray-items">
        {materialIds.map(id => (
          <div key={id} className="gc-compare-item">
            <span>{id.slice(0, 8)}...</span>
            <button onClick={() => onRemove(id)}>×</button>
          </div>
        ))}
      </div>
      <div className="gc-compare-tray-actions">
        <Link 
          href={`/catalog/compare?ids=${materialIds.join(',')}`} 
          className="gc-btn gc-btn-primary"
        >
          Compare Now
        </Link>
        <Link 
          href={`/rfqs/new?materials=${materialIds.join(',')}`} 
          className="gc-btn gc-btn-secondary"
        >
          Request Quote
        </Link>
      </div>
    </div>
  )
}


6. Create app/components/catalog/SustainabilityScore.tsx and CertificationBadge.tsx

7. IMPORTANT: Submit LOCKED FILE CHANGE REQUESTS for:

{
  "agent": "UI-CATALOG",
  "file": "app/globals.css",
  "change": "Add catalog styles",
  "styles": [
    ".gc-catalog-layout { display: grid; grid-template-columns: 280px 1fr; gap: 24px; }",
    ".gc-catalog-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }",
    ".gc-material-card { ... }",
    ".gc-compare-tray { position: fixed; bottom: 0; left: 0; right: 0; ... }",
    "/* Full catalog styles to be added */"
  ]
}

DESIGN GUIDELINES:
- Follow existing gc-* CSS class patterns
- Use emerald/teal gradient theme (--gc-emerald-600, --gc-teal-600)
- Glass morphism cards with hover effects
- Mobile-first responsive (stack sidebar on mobile)
- Dense grid layout like Sweets catalog

CONSTRAINTS:
- Do NOT modify app/layout.tsx directly
- Do NOT modify app/globals.css directly (submit change request)
- Do NOT modify backend files
- Do NOT add npm dependencies

OUTPUT FORMAT:
Only frontend catalog files in app/catalog/** and app/components/catalog/**
```

## Verification Checklist
- [ ] New files in `app/catalog/**`, `app/components/catalog/**`
- [ ] No direct modifications to locked files
- [ ] Follows existing gc-* CSS patterns
- [ ] Mobile responsive
- [ ] Change requests submitted for globals.css
