'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import CertificationBadge, { CertificationBadgeGroup, type CertificationType } from '../../components/catalog/CertificationBadge'
import SustainabilityScore from '../../components/catalog/SustainabilityScore'

// Mock material data - would come from API in production
interface MaterialDetail {
  id: string
  name: string
  category: string
  subcategory?: string
  manufacturer: string
  description: string
  images: string[]
  sustainabilityScore: number
  certifications: CertificationType[]
  leedPoints: number
  carbonFootprint: number
  recycledContent: number
  hasEpd: boolean
  verifiedSuppliers: Supplier[]
  shadowSupplierCount: number
  specifications: { label: string; value: string }[]
  documents: { name: string; type: string; url: string }[]
  relatedMaterials: { id: string; name: string; image: string; score: number }[]
}

interface Supplier {
  id: string
  name: string
  location: string
  verified: boolean
  rating: number
  responseTime: string
  certifications: string[]
}

// Mock data
const getMaterial = (id: string): MaterialDetail | null => {
  const materials: Record<string, MaterialDetail> = {
    'mat-001': {
      id: 'mat-001',
      name: 'EcoTimber Premium Hardwood Flooring',
      category: 'Flooring',
      subcategory: 'Hardwood',
      manufacturer: 'EcoTimber Inc.',
      description:
        'Premium sustainably harvested hardwood flooring with FSC certification. This product combines exceptional durability with environmental responsibility, featuring wood sourced from responsibly managed forests. Each plank is precision-milled for easy installation and finished with a low-VOC, plant-based sealant that protects the wood while maintaining indoor air quality.',
      images: [
        '/placeholder-material.png',
        '/placeholder-material.png',
        '/placeholder-material.png',
        '/placeholder-material.png',
      ],
      sustainabilityScore: 92,
      certifications: ['fsc', 'leed', 'epd'],
      leedPoints: 8,
      carbonFootprint: 12.4,
      recycledContent: 35,
      hasEpd: true,
      verifiedSuppliers: [
        {
          id: 'sup-1',
          name: 'EcoTimber Direct',
          location: 'Portland, OR',
          verified: true,
          rating: 4.9,
          responseTime: '< 24 hours',
          certifications: ['FSC', 'LEED Partner'],
        },
        {
          id: 'sup-2',
          name: 'GreenBuild Supply Co.',
          location: 'Seattle, WA',
          verified: true,
          rating: 4.7,
          responseTime: '< 48 hours',
          certifications: ['FSC'],
        },
        {
          id: 'sup-3',
          name: 'Sustainable Floors LLC',
          location: 'Denver, CO',
          verified: true,
          rating: 4.8,
          responseTime: '< 24 hours',
          certifications: ['FSC', 'EPD'],
        },
      ],
      shadowSupplierCount: 12,
      specifications: [
        { label: 'Thickness', value: '3/4" (19mm)' },
        { label: 'Width', value: '5" (127mm)' },
        { label: 'Length', value: 'Random (12" - 84")' },
        { label: 'Finish', value: 'UV-cured polyurethane' },
        { label: 'Edge', value: 'Micro-beveled' },
        { label: 'Installation', value: 'Nail, staple, or glue down' },
        { label: 'Janka Hardness', value: '1360' },
        { label: 'Warranty', value: '25 years residential' },
      ],
      documents: [
        { name: 'Product Data Sheet', type: 'PDF', url: '#' },
        { name: 'EPD Certificate', type: 'PDF', url: '#' },
        { name: 'FSC Chain of Custody', type: 'PDF', url: '#' },
        { name: 'Installation Guide', type: 'PDF', url: '#' },
        { name: 'Maintenance Guide', type: 'PDF', url: '#' },
      ],
      relatedMaterials: [
        { id: 'mat-012', name: 'CorkTech Acoustic Flooring', image: '/placeholder-material.png', score: 91 },
        { id: 'mat-010', name: 'EcoWall Bamboo Panels', image: '/placeholder-material.png', score: 89 },
        { id: 'mat-003', name: 'BioFiber Insulation Panels', image: '/placeholder-material.png', score: 95 },
      ],
    },
  }

  // Return the specific material or a default one for demo
  return materials[id] || materials['mat-001']
}

export default function MaterialDetailPage() {
  const params = useParams()
  const materialId = params.materialId as string
  const [selectedImage, setSelectedImage] = useState(0)
  const [showAllSuppliers, setShowAllSuppliers] = useState(false)

  const material = getMaterial(materialId)

  if (!material) {
    return (
      <div className="gc-page">
        <div className="gc-container" style={{ padding: '4rem 1rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--gc-slate-900)' }}>
            Material Not Found
          </h1>
          <p style={{ color: 'var(--gc-slate-600)', marginTop: '0.5rem' }}>
            The material you're looking for doesn't exist or has been removed.
          </p>
          <Link href="/catalog" className="gc-btn gc-btn-primary" style={{ marginTop: '1.5rem' }}>
            Back to Catalog
          </Link>
        </div>
      </div>
    )
  }

  const displayedSuppliers = showAllSuppliers
    ? material.verifiedSuppliers
    : material.verifiedSuppliers.slice(0, 3)

  return (
    <div className="gc-page">
      <div className="gc-container" style={{ padding: '1.5rem 1rem 4rem' }}>
        {/* Breadcrumb */}
        <nav
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '1.5rem',
            fontSize: '0.8125rem',
          }}
        >
          <Link href="/catalog" style={{ color: 'var(--gc-slate-500)', textDecoration: 'none' }}>
            Catalog
          </Link>
          <span style={{ color: 'var(--gc-slate-400)' }}>/</span>
          <Link
            href={`/catalog?category=${material.category.toLowerCase()}`}
            style={{ color: 'var(--gc-slate-500)', textDecoration: 'none' }}
          >
            {material.category}
          </Link>
          {material.subcategory && (
            <>
              <span style={{ color: 'var(--gc-slate-400)' }}>/</span>
              <span style={{ color: 'var(--gc-slate-700)', fontWeight: 600 }}>
                {material.subcategory}
              </span>
            </>
          )}
        </nav>

        {/* Hero Section */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))',
            gap: '2rem',
            marginBottom: '3rem',
          }}
        >
          {/* Image Gallery */}
          <div className="gc-animate-fade-in">
            {/* Main Image */}
            <div
              className="gc-card"
              style={{
                position: 'relative',
                aspectRatio: '4/3',
                overflow: 'hidden',
                marginBottom: '0.75rem',
              }}
            >
              <Image
                src={material.images[selectedImage] || '/placeholder-material.png'}
                alt={material.name}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 50vw"
                style={{ objectFit: 'cover' }}
              />
              {/* Score Badge */}
              <div
                style={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  padding: '0.5rem 0.75rem',
                  background: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(8px)',
                  borderRadius: 'var(--gc-radius)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
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
                  style={{ width: 20, height: 20 }}
                >
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
                <span
                  style={{
                    fontSize: '1.125rem',
                    fontWeight: 900,
                    color: 'var(--gc-emerald-700)',
                  }}
                >
                  {material.sustainabilityScore}
                </span>
              </div>
            </div>

            {/* Thumbnails */}
            <div
              style={{
                display: 'flex',
                gap: '0.5rem',
                overflowX: 'auto',
              }}
            >
              {material.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(i)}
                  style={{
                    width: 72,
                    height: 54,
                    borderRadius: 'var(--gc-radius-sm)',
                    overflow: 'hidden',
                    border:
                      selectedImage === i
                        ? '2px solid var(--gc-emerald-500)'
                        : '2px solid transparent',
                    cursor: 'pointer',
                    padding: 0,
                    background: 'var(--gc-slate-100)',
                    flexShrink: 0,
                    position: 'relative',
                  }}
                >
                  <Image
                    src={img}
                    alt={`${material.name} view ${i + 1}`}
                    fill
                    sizes="72px"
                    style={{ objectFit: 'cover' }}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Product Info */}
          <div className="gc-animate-fade-in gc-stagger-1">
            {/* Category */}
            <div
              style={{
                fontSize: '0.6875rem',
                fontWeight: 800,
                color: 'var(--gc-slate-500)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                marginBottom: '0.5rem',
              }}
            >
              {material.category}
              {material.subcategory && ` · ${material.subcategory}`}
            </div>

            {/* Title */}
            <h1
              style={{
                margin: '0 0 0.5rem 0',
                fontSize: 'clamp(1.5rem, 4vw, 2rem)',
                fontWeight: 900,
                color: 'var(--gc-slate-900)',
                lineHeight: 1.2,
              }}
            >
              {material.name}
            </h1>

            {/* Manufacturer */}
            <div
              style={{
                fontSize: '1rem',
                color: 'var(--gc-slate-600)',
                marginBottom: '1rem',
              }}
            >
              by <strong style={{ color: 'var(--gc-slate-800)' }}>{material.manufacturer}</strong>
            </div>

            {/* Certifications */}
            <div style={{ marginBottom: '1.25rem' }}>
              <CertificationBadgeGroup
                certifications={material.certifications}
                size="md"
                maxVisible={5}
              />
            </div>

            {/* Description */}
            <p
              style={{
                fontSize: '0.9375rem',
                color: 'var(--gc-slate-600)',
                lineHeight: 1.7,
                marginBottom: '1.5rem',
              }}
            >
              {material.description}
            </p>

            {/* CTA */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.75rem',
                marginBottom: '1.5rem',
              }}
            >
              <Link
                href={`/rfqs/new?material=${material.id}`}
                className="gc-btn gc-btn-primary"
                style={{
                  padding: '0.85rem 1.5rem',
                  fontSize: '0.9375rem',
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
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
                Request Quote
              </Link>
              <button
                className="gc-btn gc-btn-secondary"
                style={{
                  padding: '0.85rem 1.5rem',
                  fontSize: '0.9375rem',
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
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                </svg>
                Save to Project
              </button>
            </div>

            {/* Quick Stats */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '0.75rem',
              }}
            >
              <QuickStat
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                }
                label="LEED Points"
                value={`${material.leedPoints} pts`}
              />
              <QuickStat
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
                  </svg>
                }
                label="Carbon"
                value={`${material.carbonFootprint} kg`}
              />
              <QuickStat
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                    <path d="M16 16h5v5" />
                  </svg>
                }
                label="Recycled"
                value={`${material.recycledContent}%`}
              />
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
            gap: '1.5rem',
          }}
        >
          {/* Left Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Sustainability Scorecard */}
            <section className="gc-card gc-animate-fade-in gc-stagger-2" style={{ padding: '1.5rem' }}>
              <h2
                style={{
                  margin: '0 0 1.25rem 0',
                  fontSize: '1rem',
                  fontWeight: 800,
                  color: 'var(--gc-slate-900)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
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
                  style={{ width: 20, height: 20 }}
                >
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
                Sustainability Scorecard
              </h2>
              <SustainabilityScore
                score={material.sustainabilityScore}
                leedPoints={material.leedPoints}
                carbonFootprint={material.carbonFootprint}
                hasEpd={material.hasEpd}
                recycledContent={material.recycledContent}
                variant="detailed"
                size="lg"
                showBreakdown
              />
            </section>

            {/* Specifications */}
            <section className="gc-card gc-animate-fade-in gc-stagger-3" style={{ padding: '1.5rem' }}>
              <h2
                style={{
                  margin: '0 0 1rem 0',
                  fontSize: '1rem',
                  fontWeight: 800,
                  color: 'var(--gc-slate-900)',
                }}
              >
                Specifications
              </h2>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '0.75rem',
                }}
              >
                {material.specifications.map((spec) => (
                  <div
                    key={spec.label}
                    style={{
                      padding: '0.65rem 0.85rem',
                      background: 'var(--gc-slate-50)',
                      borderRadius: 'var(--gc-radius-sm)',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '0.625rem',
                        fontWeight: 700,
                        color: 'var(--gc-slate-500)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.03em',
                        marginBottom: 2,
                      }}
                    >
                      {spec.label}
                    </div>
                    <div
                      style={{
                        fontSize: '0.875rem',
                        fontWeight: 700,
                        color: 'var(--gc-slate-900)',
                      }}
                    >
                      {spec.value}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Documents */}
            <section className="gc-card gc-animate-fade-in gc-stagger-4" style={{ padding: '1.5rem' }}>
              <h2
                style={{
                  margin: '0 0 1rem 0',
                  fontSize: '1rem',
                  fontWeight: 800,
                  color: 'var(--gc-slate-900)',
                }}
              >
                Documents & Certifications
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {material.documents.map((doc) => (
                  <a
                    key={doc.name}
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem',
                      background: 'var(--gc-slate-50)',
                      borderRadius: 'var(--gc-radius-sm)',
                      textDecoration: 'none',
                      transition: 'all var(--gc-duration) var(--gc-ease)',
                    }}
                    className="gc-document-link"
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 'var(--gc-radius-sm)',
                        background: 'white',
                        border: '1px solid var(--gc-slate-200)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--gc-slate-500)',
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
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: '0.875rem',
                          fontWeight: 700,
                          color: 'var(--gc-slate-900)',
                        }}
                      >
                        {doc.name}
                      </div>
                      <div
                        style={{
                          fontSize: '0.6875rem',
                          color: 'var(--gc-slate-500)',
                        }}
                      >
                        {doc.type}
                      </div>
                    </div>
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
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  </a>
                ))}
              </div>
            </section>
          </div>

          {/* Right Column - Suppliers */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Verified Suppliers */}
            <section className="gc-card gc-animate-fade-in gc-stagger-2" style={{ padding: '1.5rem' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
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
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--gc-emerald-600)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ width: 20, height: 20 }}
                  >
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                  Verified Suppliers
                </h2>
                <span
                  style={{
                    padding: '0.25rem 0.5rem',
                    background: 'var(--gc-emerald-50)',
                    borderRadius: 'var(--gc-radius-sm)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: 'var(--gc-emerald-700)',
                  }}
                >
                  {material.verifiedSuppliers.length} verified
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {displayedSuppliers.map((supplier) => (
                  <SupplierCard key={supplier.id} supplier={supplier} materialId={material.id} />
                ))}
              </div>

              {material.verifiedSuppliers.length > 3 && !showAllSuppliers && (
                <button
                  onClick={() => setShowAllSuppliers(true)}
                  style={{
                    width: '100%',
                    marginTop: '0.75rem',
                    padding: '0.65rem',
                    background: 'transparent',
                    border: '1px dashed var(--gc-slate-300)',
                    borderRadius: 'var(--gc-radius)',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    color: 'var(--gc-slate-600)',
                    cursor: 'pointer',
                    transition: 'all var(--gc-duration) var(--gc-ease)',
                  }}
                >
                  Show {material.verifiedSuppliers.length - 3} more suppliers
                </button>
              )}

              {/* Shadow Suppliers Notice */}
              {material.shadowSupplierCount > 0 && (
                <div
                  style={{
                    marginTop: '1rem',
                    padding: '0.85rem',
                    background: 'var(--gc-slate-50)',
                    borderRadius: 'var(--gc-radius)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 'var(--gc-radius-sm)',
                      background: 'var(--gc-slate-200)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--gc-slate-500)',
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
                      style={{ width: 16, height: 16 }}
                    >
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <line x1="19" y1="8" x2="19" y2="14" />
                      <line x1="22" y1="11" x2="16" y2="11" />
                    </svg>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: '0.8125rem',
                        fontWeight: 700,
                        color: 'var(--gc-slate-700)',
                      }}
                    >
                      +{material.shadowSupplierCount} more suppliers available
                    </div>
                    <div
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--gc-slate-500)',
                        marginTop: 2,
                      }}
                    >
                      Submit an RFQ to connect with additional suppliers
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* Related Materials */}
            <section className="gc-card gc-animate-fade-in gc-stagger-3" style={{ padding: '1.5rem' }}>
              <h2
                style={{
                  margin: '0 0 1rem 0',
                  fontSize: '1rem',
                  fontWeight: 800,
                  color: 'var(--gc-slate-900)',
                }}
              >
                Related Materials
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {material.relatedMaterials.map((related) => (
                  <Link
                    key={related.id}
                    href={`/catalog/${related.id}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.5rem',
                      background: 'var(--gc-slate-50)',
                      borderRadius: 'var(--gc-radius)',
                      textDecoration: 'none',
                      transition: 'all var(--gc-duration) var(--gc-ease)',
                    }}
                  >
                    <div
                      style={{
                        width: 56,
                        height: 42,
                        borderRadius: 'var(--gc-radius-sm)',
                        overflow: 'hidden',
                        position: 'relative',
                        flexShrink: 0,
                      }}
                    >
                      <Image
                        src={related.image}
                        alt={related.name}
                        fill
                        sizes="56px"
                        style={{ objectFit: 'cover' }}
                      />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '0.8125rem',
                          fontWeight: 700,
                          color: 'var(--gc-slate-900)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {related.name}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          marginTop: 2,
                        }}
                      >
                        <div
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background:
                              related.score >= 80
                                ? 'var(--gc-emerald-500)'
                                : related.score >= 60
                                ? 'var(--gc-teal-500)'
                                : '#f59e0b',
                          }}
                        />
                        <span
                          style={{
                            fontSize: '0.6875rem',
                            fontWeight: 700,
                            color: 'var(--gc-slate-600)',
                          }}
                        >
                          Score: {related.score}
                        </span>
                      </div>
                    </div>
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
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </Link>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}

function QuickStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div
      style={{
        padding: '0.75rem',
        background: 'var(--gc-slate-50)',
        borderRadius: 'var(--gc-radius)',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          margin: '0 auto 0.35rem auto',
          borderRadius: 'var(--gc-radius-sm)',
          background: 'var(--gc-emerald-50)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--gc-emerald-600)',
        }}
      >
        <span style={{ width: 16, height: 16 }}>{icon}</span>
      </div>
      <div
        style={{
          fontSize: '0.6rem',
          fontWeight: 700,
          color: 'var(--gc-slate-500)',
          textTransform: 'uppercase',
          letterSpacing: '0.03em',
          marginBottom: 2,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: '0.875rem',
          fontWeight: 800,
          color: 'var(--gc-slate-900)',
        }}
      >
        {value}
      </div>
    </div>
  )
}

function SupplierCard({
  supplier,
  materialId,
}: {
  supplier: Supplier
  materialId: string
}) {
  return (
    <div
      style={{
        padding: '1rem',
        background: 'var(--gc-slate-50)',
        border: '1px solid var(--gc-slate-100)',
        borderRadius: 'var(--gc-radius)',
        transition: 'all var(--gc-duration) var(--gc-ease)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: '0.75rem',
        }}
      >
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: 4,
            }}
          >
            <span
              style={{
                fontSize: '0.9375rem',
                fontWeight: 800,
                color: 'var(--gc-slate-900)',
              }}
            >
              {supplier.name}
            </span>
            {supplier.verified && (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--gc-emerald-500)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ width: 16, height: 16 }}
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            )}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.75rem',
              color: 'var(--gc-slate-500)',
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
              style={{ width: 12, height: 12 }}
            >
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            {supplier.location}
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            padding: '0.25rem 0.5rem',
            background: 'white',
            borderRadius: 'var(--gc-radius-sm)',
            fontSize: '0.75rem',
            fontWeight: 700,
            color: 'var(--gc-slate-700)',
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="var(--gc-emerald-400)"
            style={{ width: 12, height: 12 }}
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          {supplier.rating}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.35rem',
          marginBottom: '0.75rem',
        }}
      >
        {supplier.certifications.map((cert) => (
          <span
            key={cert}
            style={{
              padding: '0.2rem 0.4rem',
              background: 'var(--gc-emerald-50)',
              borderRadius: 'var(--gc-radius-sm)',
              fontSize: '0.625rem',
              fontWeight: 700,
              color: 'var(--gc-emerald-700)',
              textTransform: 'uppercase',
            }}
          >
            {cert}
          </span>
        ))}
        <span
          style={{
            padding: '0.2rem 0.4rem',
            background: 'white',
            borderRadius: 'var(--gc-radius-sm)',
            fontSize: '0.625rem',
            fontWeight: 600,
            color: 'var(--gc-slate-500)',
          }}
        >
          Responds {supplier.responseTime}
        </span>
      </div>

      <Link
        href={`/rfqs/new?material=${materialId}&supplier=${supplier.id}`}
        className="gc-btn gc-btn-primary"
        style={{
          width: '100%',
          padding: '0.6rem',
          fontSize: '0.8125rem',
        }}
      >
        Request Quote from {supplier.name.split(' ')[0]}
      </Link>
    </div>
  )
}
