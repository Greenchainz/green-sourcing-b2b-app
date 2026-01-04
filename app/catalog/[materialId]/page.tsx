'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import CertificationBadge, { CertificationBadgeGroup, type CertificationType } from '../../components/catalog/CertificationBadge'
import SustainabilityScore from '../../components/catalog/SustainabilityScore'

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
    gwp?: number
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

// Mock material data
const MOCK_MATERIAL: MaterialDetail = {
  id: 'mat-001',
  name: 'EcoTimber Premium Hardwood Flooring',
  category: 'Flooring',
  manufacturer: 'EcoTimber Inc.',
  description: 'Premium sustainably sourced hardwood flooring with FSC certification. Our EcoTimber Premium line combines traditional craftsmanship with modern sustainability standards, offering exceptional durability while minimizing environmental impact.',
  imageUrl: '/placeholder-material.png',
  sustainabilityScore: 92,
  certifications: [
    { name: 'FSC Certified', issuedDate: '2023-01-15', documentUrl: '#' },
    { name: 'LEED Credit Compliant', issuedDate: '2023-03-20', documentUrl: '#' },
    { name: 'EPD Verified', issuedDate: '2023-06-01', documentUrl: '#' },
  ],
  suppliers: [
    { id: 's1', name: 'GreenBuild Supply', location: 'Portland, OR', verified: true, rating: 4.8 },
    { id: 's2', name: 'EcoMaterials Direct', location: 'Seattle, WA', verified: true, rating: 4.6 },
    { id: 's3', name: 'Sustainable Floors Inc', location: 'San Francisco, CA', verified: false, rating: 4.2 },
  ],
  shadowSupplierCount: 12,
  specifications: {
    'Thickness': '3/4 inch (19mm)',
    'Width': '5 inch (127mm)',
    'Length': 'Random lengths 12"-84"',
    'Species': 'White Oak',
    'Finish': 'UV-cured polyurethane',
    'Janka Hardness': '1360 lbf',
    'Installation': 'Nail, Staple, or Glue Down',
    'Warranty': '50 Year Residential',
  },
  environmentalData: {
    gwp: 12.4,
    embodiedCarbon: 8.2,
    recyclableContent: 100,
    recycledContent: 35,
    voc: 0.02,
    waterUsage: 45,
  },
  priceRange: { min: 8, max: 15 },
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
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

export default function MaterialDetailPage() {
  const params = useParams()
  const materialId = params.materialId as string
  const [activeTab, setActiveTab] = useState<'overview' | 'specs' | 'suppliers'>('overview')
  
  // In production, this would fetch from API
  const material = MOCK_MATERIAL

  return (
    <div className="gc-page" style={{ minHeight: '100vh' }}>
      {/* Breadcrumb */}
      <div
        style={{
          borderBottom: '1px solid var(--gc-glass-border)',
          background: 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div className="gc-container" style={{ padding: '0.75rem 1rem' }}>
          <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem' }}>
            <Link href="/catalog" style={{ color: 'var(--gc-slate-500)', textDecoration: 'none' }}>
              Catalog
            </Link>
            <span style={{ color: 'var(--gc-slate-400)' }}>/</span>
            <span style={{ color: 'var(--gc-slate-900)', fontWeight: 600 }}>{material.name}</span>
          </nav>
        </div>
      </div>

      {/* Hero Section */}
      <div className="gc-container" style={{ padding: '2rem 1rem' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.2fr)',
            gap: '2rem',
            alignItems: 'start',
          }}
        >
          {/* Image */}
          <div
            style={{
              position: 'relative',
              aspectRatio: '4/3',
              borderRadius: 'var(--gc-radius-xl)',
              overflow: 'hidden',
              background: 'var(--gc-slate-100)',
            }}
          >
            <Image
              src={material.imageUrl || '/placeholder-material.png'}
              alt={material.name}
              fill
              style={{ objectFit: 'cover' }}
              priority
            />
          </div>

          {/* Info */}
          <div>
            <div style={{ marginBottom: '1rem' }}>
              <span
                style={{
                  display: 'inline-block',
                  padding: '0.25rem 0.6rem',
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  color: 'var(--gc-slate-600)',
                  background: 'var(--gc-slate-100)',
                  borderRadius: 'var(--gc-radius-sm)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                  marginBottom: '0.75rem',
                }}
              >
                {material.category}
              </span>
              <h1
                style={{
                  margin: '0 0 0.5rem 0',
                  fontSize: 'clamp(1.5rem, 4vw, 2.25rem)',
                  fontWeight: 900,
                  color: 'var(--gc-slate-900)',
                  lineHeight: 1.2,
                }}
              >
                {material.name}
              </h1>
              <p
                style={{
                  margin: '0 0 1.25rem 0',
                  fontSize: '0.9375rem',
                  color: 'var(--gc-slate-600)',
                  lineHeight: 1.6,
                }}
              >
                {material.description}
              </p>
            </div>

            {/* Sustainability Score */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <ScoreBadge score={material.sustainabilityScore} />
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--gc-slate-500)', marginBottom: '0.35rem' }}>
                  Manufacturer
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--gc-slate-900)' }}>
                  {material.manufacturer}
                </div>
              </div>
            </div>

            {/* Price Range */}
            {material.priceRange && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'baseline',
                  gap: '0.35rem',
                  padding: '0.75rem 1rem',
                  background: 'var(--gc-slate-50)',
                  borderRadius: 'var(--gc-radius)',
                  marginBottom: '1.5rem',
                }}
              >
                <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--gc-slate-900)' }}>
                  ${material.priceRange.min}
                </span>
                <span style={{ fontSize: '0.9rem', color: 'var(--gc-slate-500)' }}>-</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--gc-slate-900)' }}>
                  ${material.priceRange.max}
                </span>
                <span style={{ fontSize: '0.85rem', color: 'var(--gc-slate-500)' }}>/ sq ft</span>
              </div>
            )}

            {/* CTA Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <Link
                href={`/rfqs/new?material=${material.id}`}
                className="gc-btn gc-btn-primary"
                style={{ padding: '0.85rem 1.5rem', fontSize: '0.9375rem' }}
              >
                Request Quote
              </Link>
              <button
                className="gc-btn gc-btn-secondary"
                style={{ padding: '0.85rem 1.5rem', fontSize: '0.9375rem' }}
              >
                Add to Compare
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="gc-container" style={{ padding: '0 1rem' }}>
        <div
          style={{
            display: 'flex',
            gap: '0.25rem',
            borderBottom: '1px solid var(--gc-slate-200)',
          }}
        >
          {(['overview', 'specs', 'suppliers'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '1rem 1.5rem',
                fontSize: '0.9375rem',
                fontWeight: 700,
                color: activeTab === tab ? 'var(--gc-emerald-600)' : 'var(--gc-slate-600)',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === tab ? '2px solid var(--gc-emerald-500)' : '2px solid transparent',
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {tab === 'specs' ? 'Specifications' : tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="gc-container" style={{ padding: '2rem 1rem 4rem' }}>
        {activeTab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            {/* Certifications */}
            <section>
              <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.125rem', fontWeight: 800, color: 'var(--gc-slate-900)' }}>
                Certifications
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {material.certifications.map((cert, i) => (
                  <CertBadge key={i} cert={cert} />
                ))}
              </div>
            </section>

            {/* Environmental Data */}
            <section>
              <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.125rem', fontWeight: 800, color: 'var(--gc-slate-900)' }}>
                Environmental Data
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                {material.environmentalData.gwp !== undefined && (
                  <MetricCard label="GWP" value={material.environmentalData.gwp} unit="kg CO2e" />
                )}
                {material.environmentalData.recycledContent !== undefined && (
                  <MetricCard label="Recycled Content" value={material.environmentalData.recycledContent} unit="%" />
                )}
                {material.environmentalData.recyclableContent !== undefined && (
                  <MetricCard label="Recyclable" value={material.environmentalData.recyclableContent} unit="%" />
                )}
                {material.environmentalData.voc !== undefined && (
                  <MetricCard label="VOC" value={material.environmentalData.voc} unit="g/L" />
                )}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'specs' && (
          <section>
            <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.125rem', fontWeight: 800, color: 'var(--gc-slate-900)' }}>
              Technical Specifications
            </h2>
            <div
              className="gc-card"
              style={{ padding: 0, overflow: 'hidden' }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {Object.entries(material.specifications).map(([key, value], i) => (
                    <tr
                      key={key}
                      style={{
                        borderBottom: i < Object.keys(material.specifications).length - 1 ? '1px solid var(--gc-slate-100)' : 'none',
                      }}
                    >
                      <td
                        style={{
                          padding: '0.85rem 1rem',
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          color: 'var(--gc-slate-600)',
                          background: 'var(--gc-slate-50)',
                          width: '40%',
                        }}
                      >
                        {key}
                      </td>
                      <td
                        style={{
                          padding: '0.85rem 1rem',
                          fontSize: '0.875rem',
                          fontWeight: 600,
                          color: 'var(--gc-slate-900)',
                        }}
                      >
                        {value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeTab === 'suppliers' && (
          <section>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 800, color: 'var(--gc-slate-900)' }}>
                Suppliers ({material.suppliers.length})
              </h2>
              {material.shadowSupplierCount > 0 && (
                <span style={{ fontSize: '0.8125rem', color: 'var(--gc-slate-500)' }}>
                  +{material.shadowSupplierCount} unverified suppliers
                </span>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {material.suppliers.map((supplier) => (
                <SupplierCard key={supplier.id} supplier={supplier} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

// Metric card component
function MetricCard({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div
      style={{
        padding: '1rem',
        background: 'var(--gc-slate-50)',
        borderRadius: 'var(--gc-radius)',
      }}
    >
      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--gc-slate-500)', marginBottom: '0.35rem' }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
        <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--gc-slate-900)' }}>{value}</span>
        <span style={{ fontSize: '0.8125rem', color: 'var(--gc-slate-500)' }}>{unit}</span>
      </div>
    </div>
  )
}
