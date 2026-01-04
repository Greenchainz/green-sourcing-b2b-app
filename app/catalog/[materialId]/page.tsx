import Link from 'next/link'
import { Metadata } from 'next'

// Types
interface MaterialDetail {
  id: string
  name: string
  category: string
  manufacturer: string
  description: string
  imageUrl?: string
  sustainabilityScore: number
  certifications: Array<{
    name: string
    issuedDate: string
    expiryDate?: string
    documentUrl?: string
  }>
  suppliers: Array<{
    id: string
    name: string
    location: string
    verified: boolean
    rating?: number
  }>
  shadowSupplierCount: number
  specifications: Record<string, string>
  environmentalData: {
    gwp?: number // Global Warming Potential
    embodiedCarbon?: number
    recyclableContent?: number
    recycledContent?: number
    voc?: number
    waterUsage?: number
  }
  priceRange?: { min: number; max: number }
  createdAt: string
  updatedAt: string
}

interface PageProps {
  params: Promise<{ materialId: string }>
}

// Fetch material data
async function getMaterial(materialId: string): Promise<MaterialDetail | null> {
  try {
    // In production, this would be an API call
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
    const response = await fetch(`${baseUrl}/api/v1/catalog/materials/${materialId}`, {
      next: { revalidate: 60 }, // Cache for 60 seconds
    })

    if (!response.ok) {
      return null
    }

    return response.json()
  } catch (error) {
    console.error('Error fetching material:', error)
    // Return mock data for demo
    return MOCK_MATERIAL
  }
}

// Generate metadata for SEO
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params
  const material = await getMaterial(resolvedParams.materialId)

  if (!material) {
    return {
      title: 'Material Not Found | GreenChainz',
    }
  }

  return {
    title: `${material.name} | GreenChainz Catalog`,
    description: `${material.description.slice(0, 155)}...`,
    openGraph: {
      title: `${material.name} - Sustainability Score: ${material.sustainabilityScore}/100`,
      description: material.description,
      images: material.imageUrl ? [material.imageUrl] : [],
    },
  }
}

// Score badge component
function ScoreBadge({ score }: { score: number }) {
  const getScoreColor = (s: number) => {
    if (s >= 80) return { bg: 'var(--gc-emerald-500)', text: 'white' }
    if (s >= 60) return { bg: '#22c55e', text: 'white' }
    if (s >= 40) return { bg: '#facc15', text: '#713f12' }
    return { bg: '#fb923c', text: 'white' }
  }

  const colors = getScoreColor(score)

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.65rem',
        padding: '0.75rem 1.25rem',
        background: colors.bg,
        color: colors.text,
        borderRadius: 'var(--gc-radius-xl)',
        boxShadow: '0 8px 25px rgba(16, 185, 129, 0.3)',
      }}
    >
      <span style={{ fontSize: '1.75rem', fontWeight: 900, lineHeight: 1 }}>{score}</span>
      <div style={{ lineHeight: 1.2 }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 600, opacity: 0.9, textTransform: 'uppercase' }}>
          Sustainability
        </div>
        <div style={{ fontSize: '0.85rem', fontWeight: 800 }}>Score</div>
      </div>
    </div>
  )
}

// Certification badge component
function CertBadge({ cert }: { cert: MaterialDetail['certifications'][0] }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.85rem 1rem',
        background: 'var(--gc-emerald-50)',
        border: '1px solid var(--gc-emerald-200)',
        borderRadius: 'var(--gc-radius)',
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 'var(--gc-radius)',
          background: 'linear-gradient(135deg, var(--gc-emerald-500), var(--gc-teal-500))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--gc-slate-900)' }}>
          {cert.name}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--gc-slate-500)' }}>
          Issued: {new Date(cert.issuedDate).toLocaleDateString()}
        </div>
      </div>
      {cert.documentUrl && (
        <a
          href={cert.documentUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            padding: '0.35rem 0.65rem',
            fontSize: '0.7rem',
            fontWeight: 600,
            color: 'var(--gc-emerald-700)',
            background: 'white',
            border: '1px solid var(--gc-emerald-300)',
            borderRadius: 'var(--gc-radius-sm)',
            textDecoration: 'none',
          }}
        >
          View →
        </a>
      )}
    </div>
  )
}

// Supplier card component
function SupplierCard({ supplier }: { supplier: MaterialDetail['suppliers'][0] }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.85rem',
        padding: '1rem',
        background: supplier.verified ? 'rgba(236, 253, 245, 0.5)' : 'var(--gc-slate-50)',
        border: `1px solid ${supplier.verified ? 'var(--gc-emerald-200)' : 'var(--gc-slate-200)'}`,
        borderRadius: 'var(--gc-radius)',
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 'var(--gc-radius-lg)',
          background: supplier.verified
            ? 'linear-gradient(135deg, var(--gc-emerald-500), var(--gc-teal-500))'
            : 'var(--gc-slate-200)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: supplier.verified ? 'white' : 'var(--gc-slate-500)',
          fontSize: '1.1rem',
          fontWeight: 800,
        }}
      >
        {supplier.name.charAt(0)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--gc-slate-900)' }}>
            {supplier.name}
          </span>
          {supplier.verified && (
            <span
              style={{
                padding: '0.15rem 0.4rem',
                fontSize: '0.6rem',
                fontWeight: 700,
                color: 'var(--gc-emerald-700)',
                background: 'var(--gc-emerald-100)',
                borderRadius: 'var(--gc-radius-sm)',
                textTransform: 'uppercase',
              }}
            >
              Verified
            </span>
          )}
        </div>
        <div
          style={{
            fontSize: '0.8rem',
            color: 'var(--gc-slate-500)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          {supplier.location}
        </div>
      </div>
      {supplier.rating && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--gc-emerald-500)" stroke="none">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--gc-slate-700)' }}>
            {supplier.rating.toFixed(1)}
          </span>
        </div>
      )}
    </div>
  )
}

// Environmental metric card
function MetricCard({
  label,
  value,
  unit,
  benchmark,
}: {
  label: string
  value: number
  unit: string
  benchmark?: { good: number; average: number }
}) {
  let status: 'good' | 'average' | 'poor' = 'average'
  if (benchmark) {
    if (value <= benchmark.good) status = 'good'
    else if (value > benchmark.average) status = 'poor'
  }

  const statusColors = {
    good: { bg: 'var(--gc-emerald-50)', border: 'var(--gc-emerald-200)', text: 'var(--gc-emerald-700)' },
    average: { bg: 'rgba(250, 204, 21, 0.1)', border: 'rgba(234, 179, 8, 0.3)', text: '#a16207' },
    poor: { bg: 'rgba(251, 146, 60, 0.1)', border: 'rgba(249, 115, 22, 0.3)', text: '#c2410c' },
  }

  const colors = statusColors[status]

  return (
    <div
      style={{
        padding: '1rem',
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        borderRadius: 'var(--gc-radius)',
      }}
    >
      <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--gc-slate-500)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
        <span style={{ fontSize: '1.5rem', fontWeight: 900, color: colors.text }}>{value}</span>
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--gc-slate-500)' }}>{unit}</span>
      </div>
    </div>
  )
}

// Main page component
export default async function MaterialDetailPage({ params }: PageProps) {
  const resolvedParams = await params
  const material = await getMaterial(resolvedParams.materialId)

  if (!material) {
    return (
      <div className="gc-page" style={{ minHeight: '100vh' }}>
        <div className="gc-container" style={{ paddingTop: 64, textAlign: 'center' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--gc-slate-900)' }}>
            Material Not Found
          </h1>
          <p style={{ color: 'var(--gc-slate-600)', marginBottom: '1.5rem' }}>
            The material you&apos;re looking for doesn&apos;t exist or has been removed.
          </p>
          <Link href="/catalog" className="gc-btn gc-btn-primary">
            Back to Catalog
          </Link>
        </div>
      </div>
    )
  }

  const verifiedSuppliers = material.suppliers.filter((s) => s.verified)
  const totalSupplierCount = verifiedSuppliers.length + material.shadowSupplierCount

  return (
    <div className="gc-page" style={{ minHeight: '100vh' }}>
      <div className="gc-container" style={{ paddingTop: 32, paddingBottom: 64 }}>
        {/* Breadcrumb */}
        <nav
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '1.5rem',
            fontSize: '0.85rem',
          }}
        >
          <Link
            href="/catalog"
            style={{ color: 'var(--gc-slate-500)', textDecoration: 'none', fontWeight: 500 }}
          >
            Catalog
          </Link>
          <span style={{ color: 'var(--gc-slate-300)' }}>/</span>
          <Link
            href={`/catalog?category=${encodeURIComponent(material.category)}`}
            style={{ color: 'var(--gc-slate-500)', textDecoration: 'none', fontWeight: 500 }}
          >
            {material.category}
          </Link>
          <span style={{ color: 'var(--gc-slate-300)' }}>/</span>
          <span style={{ color: 'var(--gc-slate-900)', fontWeight: 600 }}>{material.name}</span>
        </nav>

        {/* Hero Section */}
        <section
          className="gc-card gc-animate-fade-in"
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: '2rem',
            padding: '2rem',
            marginBottom: '2rem',
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            {/* Image */}
            <div
              style={{
                aspectRatio: '4/3',
                background: material.imageUrl
                  ? `url(${material.imageUrl}) center/cover no-repeat`
                  : 'linear-gradient(135deg, var(--gc-slate-100), var(--gc-emerald-50))',
                borderRadius: 'var(--gc-radius-xl)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {!material.imageUrl && (
                <svg
                  width="64"
                  height="64"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--gc-slate-300)"
                  strokeWidth="1.5"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              )}
            </div>

            {/* Info */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span
                style={{
                  alignSelf: 'flex-start',
                  padding: '0.35rem 0.85rem',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  color: 'var(--gc-emerald-700)',
                  background: 'var(--gc-emerald-100)',
                  borderRadius: 'var(--gc-radius)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                  marginBottom: '0.75rem',
                }}
              >
                {material.category}
              </span>

              <h1
                style={{
                  margin: 0,
                  fontSize: 'clamp(1.5rem, 3vw, 2rem)',
                  fontWeight: 900,
                  color: 'var(--gc-slate-900)',
                  lineHeight: 1.2,
                }}
              >
                {material.name}
              </h1>

              <p
                style={{
                  margin: '0.35rem 0 0',
                  fontSize: '0.95rem',
                  color: 'var(--gc-slate-500)',
                  fontWeight: 500,
                }}
              >
                by {material.manufacturer}
              </p>

              <div style={{ marginTop: '1.25rem' }}>
                <ScoreBadge score={material.sustainabilityScore} />
              </div>

              <p
                style={{
                  margin: '1.5rem 0 0',
                  fontSize: '0.95rem',
                  color: 'var(--gc-slate-600)',
                  lineHeight: 1.7,
                }}
              >
                {material.description}
              </p>

              {/* Price range */}
              {material.priceRange && (
                <div style={{ marginTop: '1.25rem' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--gc-slate-500)', textTransform: 'uppercase' }}>
                    Price Range
                  </span>
                  <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--gc-emerald-700)' }}>
                    ${material.priceRange.min.toLocaleString()} - ${material.priceRange.max.toLocaleString()}
                  </div>
                </div>
              )}

              {/* CTA */}
              <div style={{ marginTop: 'auto', paddingTop: '1.5rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <Link
                  href={`/rfqs/new?material=${material.id}`}
                  className="gc-btn gc-btn-primary"
                  style={{ padding: '0.85rem 1.5rem', fontSize: '0.95rem' }}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  Request Quote
                </Link>
                <button
                  className="gc-btn gc-btn-secondary"
                  style={{ padding: '0.85rem 1.5rem', fontSize: '0.95rem' }}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="14" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" />
                  </svg>
                  Add to Compare
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Content Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr',
            gap: '2rem',
          }}
        >
          {/* Main Content */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Sustainability Scorecard */}
            <section className="gc-card gc-animate-fade-in gc-stagger-1" style={{ padding: '1.5rem' }}>
              <h2
                style={{
                  margin: '0 0 1.25rem',
                  fontSize: '1.125rem',
                  fontWeight: 800,
                  color: 'var(--gc-slate-900)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--gc-emerald-600)"
                  strokeWidth="2"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                Sustainability Scorecard
              </h2>

              {/* Environmental metrics */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: '0.75rem',
                  marginBottom: '1.5rem',
                }}
              >
                {material.environmentalData.gwp !== undefined && (
                  <MetricCard
                    label="GWP"
                    value={material.environmentalData.gwp}
                    unit="kg CO₂e"
                    benchmark={{ good: 5, average: 15 }}
                  />
                )}
                {material.environmentalData.recycledContent !== undefined && (
                  <MetricCard
                    label="Recycled Content"
                    value={material.environmentalData.recycledContent}
                    unit="%"
                  />
                )}
                {material.environmentalData.voc !== undefined && (
                  <MetricCard
                    label="VOC Emissions"
                    value={material.environmentalData.voc}
                    unit="g/L"
                    benchmark={{ good: 50, average: 150 }}
                  />
                )}
                {material.environmentalData.recyclableContent !== undefined && (
                  <MetricCard
                    label="Recyclable"
                    value={material.environmentalData.recyclableContent}
                    unit="%"
                  />
                )}
              </div>

              {/* Certifications */}
              <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', fontWeight: 700, color: 'var(--gc-slate-700)' }}>
                Active Certifications
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {material.certifications.map((cert) => (
                  <CertBadge key={cert.name} cert={cert} />
                ))}
              </div>
            </section>

            {/* Specifications */}
            {Object.keys(material.specifications).length > 0 && (
              <section className="gc-card gc-animate-fade-in gc-stagger-2" style={{ padding: '1.5rem' }}>
                <h2
                  style={{
                    margin: '0 0 1rem',
                    fontSize: '1.125rem',
                    fontWeight: 800,
                    color: 'var(--gc-slate-900)',
                  }}
                >
                  Specifications
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                  {Object.entries(material.specifications).map(([key, value]) => (
                    <div
                      key={key}
                      style={{
                        padding: '0.75rem',
                        background: 'var(--gc-slate-50)',
                        borderRadius: 'var(--gc-radius-sm)',
                      }}
                    >
                      <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--gc-slate-500)', textTransform: 'uppercase' }}>
                        {key}
                      </div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--gc-slate-900)' }}>
                        {value}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar - Suppliers */}
          <aside style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <section className="gc-card gc-animate-fade-in gc-stagger-2" style={{ padding: '1.5rem' }}>
              <h2
                style={{
                  margin: '0 0 1rem',
                  fontSize: '1.125rem',
                  fontWeight: 800,
                  color: 'var(--gc-slate-900)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--gc-emerald-600)"
                  strokeWidth="2"
                >
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                Verified Suppliers
                <span
                  style={{
                    marginLeft: 'auto',
                    padding: '0.2rem 0.5rem',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    background: 'var(--gc-emerald-100)',
                    color: 'var(--gc-emerald-700)',
                    borderRadius: 'var(--gc-radius-sm)',
                  }}
                >
                  {verifiedSuppliers.length}
                </span>
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {verifiedSuppliers.map((supplier) => (
                  <SupplierCard key={supplier.id} supplier={supplier} />
                ))}
              </div>

              {/* Shadow suppliers count */}
              {material.shadowSupplierCount > 0 && (
                <div
                  style={{
                    marginTop: '1rem',
                    padding: '0.85rem',
                    background: 'var(--gc-slate-50)',
                    borderRadius: 'var(--gc-radius)',
                    textAlign: 'center',
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontSize: '0.85rem',
                      color: 'var(--gc-slate-600)',
                    }}
                  >
                    <strong style={{ color: 'var(--gc-slate-900)' }}>
                      +{material.shadowSupplierCount} more
                    </strong>{' '}
                    suppliers available
                  </p>
                  <p
                    style={{
                      margin: '0.35rem 0 0',
                      fontSize: '0.75rem',
                      color: 'var(--gc-slate-500)',
                    }}
                  >
                    Request a quote to see all options
                  </p>
                </div>
              )}

              {/* Request Quote CTA */}
              <Link
                href={`/rfqs/new?material=${material.id}`}
                className="gc-btn gc-btn-primary"
                style={{
                  width: '100%',
                  marginTop: '1.25rem',
                  padding: '0.85rem',
                  fontSize: '0.95rem',
                  justifyContent: 'center',
                }}
              >
                Request Quote from {totalSupplierCount} Supplier{totalSupplierCount !== 1 ? 's' : ''}
              </Link>
            </section>

            {/* Trust signals */}
            <div
              className="gc-card gc-animate-fade-in gc-stagger-3"
              style={{
                padding: '1.25rem',
                background: 'linear-gradient(135deg, var(--gc-emerald-50), rgba(209, 250, 229, 0.5))',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.85rem' }}>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--gc-emerald-600)"
                  strokeWidth="2"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
                <span style={{ fontWeight: 700, color: 'var(--gc-slate-900)', fontSize: '0.9rem' }}>
                  GreenChainz Verified
                </span>
              </div>
              <ul
                style={{
                  margin: 0,
                  padding: 0,
                  listStyle: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                }}
              >
                {['Certifications validated', 'Supplier background checked', 'Product data verified'].map((item) => (
                  <li
                    key={item}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '0.8rem',
                      color: 'var(--gc-slate-700)',
                    }}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--gc-emerald-500)"
                      strokeWidth="3"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </div>

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 1024px) {
          .gc-container > div:last-of-type {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 768px) {
          .gc-card > div:first-child {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}

// Mock data for development
const MOCK_MATERIAL: MaterialDetail = {
  id: '1',
  name: 'EcoFloor Pro Hardwood',
  category: 'Flooring',
  manufacturer: 'GreenWood Industries',
  description:
    'Premium sustainable hardwood flooring with FSC certification. Sourced from responsibly managed forests, this product features low-VOC finishes and exceptional durability. Perfect for commercial and residential applications seeking LEED credits.',
  imageUrl: '',
  sustainabilityScore: 92,
  certifications: [
    { name: 'FSC', issuedDate: '2024-01-15', expiryDate: '2029-01-15', documentUrl: '#' },
    { name: 'LEED', issuedDate: '2024-03-20', documentUrl: '#' },
    { name: 'GREENGUARD', issuedDate: '2024-02-10', expiryDate: '2025-02-10', documentUrl: '#' },
  ],
  suppliers: [
    { id: 's1', name: 'EcoTimber Supply Co.', location: 'Portland, OR', verified: true, rating: 4.8 },
    { id: 's2', name: 'Sustainable Floors Inc.', location: 'Seattle, WA', verified: true, rating: 4.6 },
    { id: 's3', name: 'GreenBuild Materials', location: 'San Francisco, CA', verified: true, rating: 4.9 },
  ],
  shadowSupplierCount: 5,
  specifications: {
    'Thickness': '3/4 inch',
    'Width': '3-1/4 inch',
    'Length': 'Random (12-84 inch)',
    'Species': 'White Oak',
    'Finish': 'UV-Cured Polyurethane',
    'Grade': 'Select & Better',
    'Installation': 'Nail, Staple, or Glue',
    'Warranty': '25 Years Residential',
  },
  environmentalData: {
    gwp: 3.2,
    recycledContent: 0,
    recyclableContent: 95,
    voc: 25,
  },
  priceRange: { min: 8, max: 15 },
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-06-15T00:00:00Z',
}
