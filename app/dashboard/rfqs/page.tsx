'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import RFQCard, { type RFQSummary } from '../../components/dashboard/RFQCard'
import WaveBadge from '../../components/dashboard/WaveBadge'

type FilterStatus = 'all' | 'pending' | 'responded' | 'expired'

// Mock RFQ data - would come from API in production
const mockRFQs: RFQSummary[] = [
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
  {
    id: 'rfq-004',
    projectName: 'Green Healthcare Facility',
    materialsCount: 35,
    deadline: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    wave: 3,
    depositVerified: false,
    buyerLinkedInVerified: true,
    buyerCompany: 'MedBuild Contractors',
    status: 'expired',
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
  },
  {
    id: 'rfq-005',
    projectName: 'Eco-Friendly Retail Space',
    materialsCount: 6,
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    wave: 3,
    minutesUntilVisible: 1440, // 24 hours
    depositVerified: true,
    buyerLinkedInVerified: true,
    buyerCompany: 'Retail Dynamics',
    status: 'pending',
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
  },
  {
    id: 'rfq-006',
    projectName: 'Solar-Powered Data Center',
    materialsCount: 18,
    deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    wave: 2,
    depositVerified: true,
    buyerLinkedInVerified: true,
    buyerCompany: 'TechGreen Solutions',
    status: 'pending',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  },
  {
    id: 'rfq-007',
    projectName: 'Passive House Community',
    materialsCount: 42,
    deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    wave: 1,
    depositVerified: true,
    buyerLinkedInVerified: false,
    buyerCompany: 'Community Builders LLC',
    status: 'responded',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
  },
  {
    id: 'rfq-008',
    projectName: 'Historic Building Retrofit',
    materialsCount: 15,
    deadline: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    wave: 2,
    depositVerified: false,
    buyerLinkedInVerified: true,
    buyerCompany: 'Heritage Preservation Co',
    status: 'expired',
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
  },
]

const filterOptions: { value: FilterStatus; label: string; count?: number }[] = [
  { value: 'all', label: 'All RFQs' },
  { value: 'pending', label: 'Pending' },
  { value: 'responded', label: 'Responded' },
  { value: 'expired', label: 'Expired' },
]

export default function RFQsPage() {
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredRFQs = useMemo(() => {
    let result = mockRFQs

    // Apply status filter
    if (filter !== 'all') {
      result = result.filter((rfq) => rfq.status === filter)
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (rfq) =>
          rfq.projectName.toLowerCase().includes(query) ||
          rfq.buyerCompany.toLowerCase().includes(query)
      )
    }

    // Sort by deadline (most urgent first for pending, most recent for others)
    return result.sort((a, b) => {
      if (a.status === 'pending' && b.status === 'pending') {
        return a.deadline.getTime() - b.deadline.getTime()
      }
      return b.createdAt.getTime() - a.createdAt.getTime()
    })
  }, [filter, searchQuery])

  const handleRespond = (rfqId: string) => {
    window.location.href = `/rfqs/${rfqId}/respond`
  }

  // Calculate counts for filter badges
  const counts = useMemo(() => ({
    all: mockRFQs.length,
    pending: mockRFQs.filter((r) => r.status === 'pending').length,
    responded: mockRFQs.filter((r) => r.status === 'responded').length,
    expired: mockRFQs.filter((r) => r.status === 'expired').length,
  }), [])

  return (
    <div className="gc-page" style={{ minHeight: '100vh' }}>
      <div className="gc-container" style={{ paddingTop: '2rem', paddingBottom: '3rem' }}>
        {/* Header */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Link
              href="/dashboard"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.875rem',
                color: 'var(--gc-slate-500)',
                textDecoration: 'none',
                transition: 'color var(--gc-duration) var(--gc-ease)',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Dashboard
            </Link>
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: 'clamp(1.5rem, 4vw, 2rem)',
              fontWeight: 900,
              color: 'var(--gc-slate-900)',
              letterSpacing: '-0.02em',
            }}
          >
            Your RFQs
          </h1>
          <p
            style={{
              margin: '0.35rem 0 0',
              fontSize: '0.9375rem',
              color: 'var(--gc-slate-600)',
            }}
          >
            View and respond to requests for quotes from verified buyers.
          </p>
        </div>

        {/* Wave Legend */}
        <div
          className="gc-card"
          style={{
            padding: '1rem 1.25rem',
            marginBottom: '1.5rem',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '1rem 2rem',
          }}
        >
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              color: 'var(--gc-slate-500)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            Wave System:
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <WaveBadge wave={1} size="sm" />
            <span style={{ fontSize: '0.8125rem', color: 'var(--gc-slate-600)' }}>Premium (0-24h)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <WaveBadge wave={2} size="sm" />
            <span style={{ fontSize: '0.8125rem', color: 'var(--gc-slate-600)' }}>Standard (24-48h)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <WaveBadge wave={3} size="sm" />
            <span style={{ fontSize: '0.8125rem', color: 'var(--gc-slate-600)' }}>All (48h+)</span>
          </div>
        </div>

        {/* Filters & Search */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '1rem',
            marginBottom: '1.5rem',
          }}
        >
          {/* Filter Tabs */}
          <div
            style={{
              display: 'flex',
              background: 'rgba(255, 255, 255, 0.8)',
              backdropFilter: 'blur(8px)',
              borderRadius: 'var(--gc-radius-lg)',
              padding: '0.25rem',
              border: '1px solid var(--gc-slate-200)',
            }}
          >
            {filterOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setFilter(option.value)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.5rem 0.85rem',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: filter === option.value ? 'white' : 'var(--gc-slate-600)',
                  background: filter === option.value
                    ? 'linear-gradient(135deg, var(--gc-emerald-600), var(--gc-teal-600))'
                    : 'transparent',
                  border: 'none',
                  borderRadius: 'var(--gc-radius)',
                  cursor: 'pointer',
                  transition: 'all var(--gc-duration) var(--gc-ease)',
                }}
              >
                {option.label}
                <span
                  style={{
                    padding: '0.1rem 0.4rem',
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    background: filter === option.value
                      ? 'rgba(255, 255, 255, 0.2)'
                      : 'var(--gc-slate-100)',
                    borderRadius: '10px',
                  }}
                >
                  {counts[option.value]}
                </span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div style={{ flex: 1, minWidth: 200, maxWidth: 350 }}>
            <div style={{ position: 'relative' }}>
              <svg
                width="18"
                height="18"
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
                }}
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Search projects or buyers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="gc-input"
                style={{
                  paddingLeft: 42,
                  fontSize: '0.875rem',
                }}
              />
            </div>
          </div>
        </div>

        {/* RFQ List */}
        {filteredRFQs.length > 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            {filteredRFQs.map((rfq, index) => (
              <div
                key={rfq.id}
                className="gc-animate-fade-in"
                style={{ animationDelay: `${index * 0.03}s` }}
              >
                <RFQCard rfq={rfq} onRespond={handleRespond} />
              </div>
            ))}
          </div>
        ) : (
          <div
            className="gc-card"
            style={{
              padding: '3rem 2rem',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                margin: '0 auto 1.25rem',
                borderRadius: 'var(--gc-radius-xl)',
                background: 'linear-gradient(135deg, var(--gc-slate-100), var(--gc-slate-50))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--gc-slate-400)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <line x1="9" y1="15" x2="15" y2="15" />
              </svg>
            </div>
            <h3
              style={{
                margin: '0 0 0.5rem',
                fontSize: '1.125rem',
                fontWeight: 800,
                color: 'var(--gc-slate-900)',
              }}
            >
              No RFQs Found
            </h3>
            <p
              style={{
                margin: 0,
                fontSize: '0.9375rem',
                color: 'var(--gc-slate-600)',
              }}
            >
              {searchQuery
                ? `No RFQs match your search "${searchQuery}"`
                : `You don't have any ${filter !== 'all' ? filter : ''} RFQs yet.`}
            </p>
            {filter !== 'all' && (
              <button
                onClick={() => setFilter('all')}
                className="gc-btn gc-btn-secondary"
                style={{ marginTop: '1.25rem' }}
              >
                View All RFQs
              </button>
            )}
          </div>
        )}

        {/* Pagination placeholder */}
        {filteredRFQs.length > 0 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '0.5rem',
              marginTop: '2rem',
              color: 'var(--gc-slate-500)',
              fontSize: '0.875rem',
            }}
          >
            <span>Showing {filteredRFQs.length} of {counts.all} RFQs</span>
          </div>
        )}
      </div>
    </div>
  )
}
