'use client'

import { useState } from 'react'
import Link from 'next/link'
import TierCard, { type SupplierTier } from '../components/dashboard/TierCard'
import RFQCard, { type RFQSummary } from '../components/dashboard/RFQCard'

// Mock data - in production this would come from API/database
const mockSupplierData = {
  name: 'EcoMaterials Inc.',
  tier: 'standard' as SupplierTier,
  rfqsUsed: 18,
  rfqsLimit: 25,
}

const mockRecentRFQs: RFQSummary[] = [
  {
    id: 'rfq-001',
    projectName: 'Downtown Office Tower - LEED Platinum',
    materialsCount: 12,
    deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    wave: 2,
    depositVerified: true,
    buyerLinkedInVerified: true,
    buyerCompany: 'Greenfield Architects',
    status: 'pending',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
  },
  {
    id: 'rfq-002',
    projectName: 'Sustainable Campus Renovation',
    materialsCount: 8,
    deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    wave: 2,
    depositVerified: true,
    buyerLinkedInVerified: false,
    buyerCompany: 'University of California',
    status: 'responded',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
  },
  {
    id: 'rfq-003',
    projectName: 'Net-Zero Residential Complex',
    materialsCount: 24,
    deadline: new Date(Date.now() + 18 * 60 * 60 * 1000),
    wave: 1,
    depositVerified: true,
    buyerLinkedInVerified: true,
    buyerCompany: 'EcoHomes Development',
    status: 'pending',
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
  },
]

const mockStats = {
  totalRFQs: 45,
  pendingResponses: 12,
  wonProjects: 8,
  responseRate: 78,
}

export default function DashboardPage() {
  const [supplier] = useState(mockSupplierData)
  const [recentRFQs] = useState(mockRecentRFQs)

  const handleUpgradeClick = () => {
    // Navigate to upgrade page or open modal
    window.location.href = '/dashboard/settings?upgrade=true'
  }

  const handleRespond = (rfqId: string) => {
    // Navigate to RFQ response page
    window.location.href = `/rfqs/${rfqId}/respond`
  }

  return (
    <div className="gc-page" style={{ minHeight: '100vh' }}>
      <div className="gc-container" style={{ paddingTop: '2rem', paddingBottom: '3rem' }}>
        {/* Welcome Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1
            style={{
              margin: 0,
              fontSize: 'clamp(1.75rem, 4vw, 2.25rem)',
              fontWeight: 900,
              color: 'var(--gc-slate-900)',
              letterSpacing: '-0.02em',
            }}
          >
            Welcome back, {supplier.name}
          </h1>
          <p
            style={{
              margin: '0.5rem 0 0',
              fontSize: '1rem',
              color: 'var(--gc-slate-600)',
            }}
          >
            Here's what's happening with your RFQs today.
          </p>
        </div>

        {/* Main Grid */}
        <div
          style={{
            display: 'grid',
            gap: '1.5rem',
            gridTemplateColumns: 'repeat(12, 1fr)',
          }}
        >
          {/* Stats Row */}
          <div
            style={{
              gridColumn: 'span 12',
              display: 'grid',
              gap: '1rem',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            }}
          >
            {/* Stat Cards */}
            {[
              { label: 'Total RFQs Received', value: mockStats.totalRFQs, icon: 'inbox' },
              { label: 'Pending Responses', value: mockStats.pendingResponses, icon: 'clock', highlight: true },
              { label: 'Won Projects', value: mockStats.wonProjects, icon: 'trophy' },
              { label: 'Response Rate', value: `${mockStats.responseRate}%`, icon: 'chart' },
            ].map((stat, index) => (
              <div
                key={stat.label}
                className="gc-card gc-animate-fade-in"
                style={{
                  padding: '1.25rem',
                  textAlign: 'center',
                  animationDelay: `${index * 0.05}s`,
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    margin: '0 auto 0.75rem',
                    borderRadius: 'var(--gc-radius-lg)',
                    background: stat.highlight
                      ? 'linear-gradient(135deg, #fef3c7, #fde68a)'
                      : 'linear-gradient(135deg, var(--gc-emerald-100), var(--gc-emerald-50))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {stat.icon === 'inbox' && (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--gc-emerald-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
                      <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
                    </svg>
                  )}
                  {stat.icon === 'clock' && (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  )}
                  {stat.icon === 'trophy' && (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--gc-emerald-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                      <path d="M4 22h16" />
                      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
                    </svg>
                  )}
                  {stat.icon === 'chart' && (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--gc-emerald-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="20" x2="18" y2="10" />
                      <line x1="12" y1="20" x2="12" y2="4" />
                      <line x1="6" y1="20" x2="6" y2="14" />
                    </svg>
                  )}
                </div>
                <div
                  style={{
                    fontSize: '1.75rem',
                    fontWeight: 900,
                    color: stat.highlight ? '#d97706' : 'var(--gc-emerald-700)',
                    lineHeight: 1,
                    marginBottom: '0.35rem',
                  }}
                >
                  {stat.value}
                </div>
                <div
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: 'var(--gc-slate-600)',
                  }}
                >
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          {/* Tier Card - Left Column */}
          <div
            style={{
              gridColumn: 'span 12',
            }}
            className="md-grid-col-4"
          >
            <TierCard
              currentTier={supplier.tier}
              rfqsUsed={supplier.rfqsUsed}
              rfqsLimit={supplier.rfqsLimit}
              onUpgradeClick={handleUpgradeClick}
            />
          </div>

          {/* Recent RFQs - Right Column */}
          <div
            style={{
              gridColumn: 'span 12',
            }}
            className="md-grid-col-8"
          >
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
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  color: 'var(--gc-slate-900)',
                }}
              >
                Recent RFQs
              </h2>
              <Link
                href="/dashboard/rfqs"
                className="gc-link"
                style={{
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                View All
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
              }}
            >
              {recentRFQs.map((rfq, index) => (
                <div
                  key={rfq.id}
                  className="gc-animate-fade-in"
                  style={{ animationDelay: `${0.1 + index * 0.05}s` }}
                >
                  <RFQCard rfq={rfq} onRespond={handleRespond} />
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div
            style={{
              gridColumn: 'span 12',
              marginTop: '0.5rem',
            }}
          >
            <h3
              style={{
                margin: '0 0 1rem',
                fontSize: '0.75rem',
                fontWeight: 800,
                color: 'var(--gc-slate-500)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              Quick Actions
            </h3>
            <div
              style={{
                display: 'grid',
                gap: '1rem',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              }}
            >
              <Link
                href="/dashboard/rfqs?filter=pending"
                className="gc-card gc-card-hover"
                style={{
                  padding: '1rem 1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.85rem',
                  textDecoration: 'none',
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 'var(--gc-radius)',
                    background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--gc-slate-900)' }}>
                    Pending RFQs
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--gc-slate-500)' }}>
                    {mockStats.pendingResponses} awaiting response
                  </div>
                </div>
              </Link>

              <Link
                href="/dashboard/settings"
                className="gc-card gc-card-hover"
                style={{
                  padding: '1rem 1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.85rem',
                  textDecoration: 'none',
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 'var(--gc-radius)',
                    background: 'linear-gradient(135deg, var(--gc-slate-100), var(--gc-slate-200))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--gc-slate-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--gc-slate-900)' }}>
                    Account Settings
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--gc-slate-500)' }}>
                    Manage your profile & billing
                  </div>
                </div>
              </Link>

              <Link
                href="/catalog"
                className="gc-card gc-card-hover"
                style={{
                  padding: '1rem 1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.85rem',
                  textDecoration: 'none',
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 'var(--gc-radius)',
                    background: 'linear-gradient(135deg, var(--gc-emerald-100), var(--gc-emerald-50))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--gc-emerald-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" />
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--gc-slate-900)' }}>
                    Browse Catalog
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--gc-slate-500)' }}>
                    Explore sustainable materials
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Responsive styles */}
      <style jsx>{`
        @media (min-width: 768px) {
          .md-grid-col-4 {
            grid-column: span 4 !important;
          }
          .md-grid-col-8 {
            grid-column: span 8 !important;
          }
        }
      `}</style>
    </div>
  )
}
