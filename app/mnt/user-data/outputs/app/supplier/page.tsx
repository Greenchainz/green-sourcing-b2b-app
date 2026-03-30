'use client'

// app/supplier/page.tsx

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  FileText,
  Eye,
  CheckCircle2,
  Clock,
  ArrowRight,
  AlertCircle,
  Upload,
  Package,
  Users,
  Loader2,
  Leaf,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface DashboardData {
  activeRfqs: number
  profileViews30d: number
  completionScore: number
  avgResponseTime: string
  recentOpportunities: {
    id: string
    title: string
    budget: string
    deadline: string
    category: string
  }[]
  hasProfile: boolean
}

export default function SupplierDashboardPage() {
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/supplier/dashboard', { credentials: 'same-origin' })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Error ${res.status}`)
        return res.json() as Promise<DashboardData>
      })
      .then(setData)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0a0a]">
        <Loader2 className="w-6 h-6 text-green-400 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
        <div className="bg-[#111] border border-red-900/40 rounded-xl p-6 max-w-sm w-full text-center">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-3" />
          <p className="text-white font-medium mb-1">Could not load dashboard</p>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  // ── Onboarding gate ──────────────────────────────────────────────────────
  if (!data?.hasProfile || (data.completionScore ?? 0) < 20) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto mb-6">
            <Leaf className="w-8 h-8 text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Finish your supplier profile</h1>
          <p className="text-gray-400 text-sm mb-8">
            Architects can't find you yet. Complete your profile so you show up in material searches
            for LEED, WELL, and sustainability projects.
          </p>
          <Button
            onClick={() => router.push('/supplier/onboarding')}
            className="bg-green-600 hover:bg-green-500 text-white w-full mb-3"
          >
            Complete Profile
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          <p className="text-gray-600 text-xs">Takes about 5 minutes</p>
        </div>
      </div>
    )
  }

  // ── Dashboard ────────────────────────────────────────────────────────────
  const metrics = [
    {
      label: 'Active RFQs',
      value: data.activeRfqs,
      icon: FileText,
      href: '/supplier/rfqs',
    },
    {
      label: 'Profile Views (30d)',
      value: data.profileViews30d,
      icon: Eye,
      href: null,
    },
    {
      label: 'Profile Completion',
      value: `${data.completionScore}%`,
      icon: CheckCircle2,
      href: '/supplier/profile',
    },
    {
      label: 'Avg Response Time',
      value: data.avgResponseTime,
      icon: Clock,
      href: null,
    },
  ]

  const quickActions = [
    { label: 'Upload New EPD', icon: Upload, href: '/supplier/certs' },
    { label: 'Update Product Catalog', icon: Package, href: '/supplier/products' },
    { label: 'Add Team Member', icon: Users, href: '/supplier/settings' },
  ]

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Supplier Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">
            Here's how you're performing on GreenChainz
          </p>
        </div>

        {/* Low completion banner */}
        {data.completionScore < 80 && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
              <p className="text-amber-200 text-sm">
                Your profile is {data.completionScore}% complete. A complete profile gets 3× more
                RFQ responses.
              </p>
            </div>
            <Link href="/supplier/profile">
              <Button size="sm" variant="outline" className="border-amber-500/40 text-amber-300 hover:bg-amber-500/10 shrink-0">
                Complete Profile
              </Button>
            </Link>
          </div>
        )}

        {/* Metric cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {metrics.map((m) => {
            const Icon = m.icon
            const card = (
              <div
                className={`bg-[#111] border border-[#1f1f1f] rounded-xl p-5 ${
                  m.href ? 'hover:border-green-500/30 transition-colors cursor-pointer' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-gray-500 text-xs font-medium uppercase tracking-wide">
                    {m.label}
                  </span>
                  <Icon className="w-4 h-4 text-green-400" />
                </div>
                <p className="text-2xl font-bold text-white">{m.value}</p>
              </div>
            )
            return m.href ? (
              <Link key={m.label} href={m.href}>
                {card}
              </Link>
            ) : (
              <div key={m.label}>{card}</div>
            )
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Opportunities */}
          <div className="lg:col-span-2 bg-[#111] border border-[#1f1f1f] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-semibold">Recent Opportunities</h2>
              <Link href="/supplier/rfqs" className="text-green-400 text-sm hover:text-green-300">
                View all
              </Link>
            </div>

            {data.recentOpportunities.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-8 h-8 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No open RFQs yet.</p>
                <p className="text-gray-600 text-xs mt-1">
                  Complete your profile to start receiving requests.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {data.recentOpportunities.map((rfq) => (
                  <Link
                    key={rfq.id}
                    href={`/supplier/rfqs/${rfq.id}`}
                    className="flex items-center justify-between p-3 bg-[#1a1a1a] rounded-lg hover:bg-[#222] transition-colors group"
                  >
                    <div>
                      <p className="text-white text-sm font-medium">{rfq.title}</p>
                      <p className="text-gray-500 text-xs mt-0.5">
                        {rfq.category} · Due {rfq.deadline}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-green-400 text-sm font-medium">{rfq.budget}</span>
                      <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-5">
            <h2 className="text-white font-semibold mb-4">Quick Actions</h2>
            <div className="flex flex-col gap-3">
              {quickActions.map((action) => {
                const Icon = action.icon
                return (
                  <Link key={action.label} href={action.href}>
                    <div className="flex items-center gap-3 p-3 bg-[#1a1a1a] rounded-lg hover:bg-[#222] transition-colors group cursor-pointer">
                      <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-green-400" />
                      </div>
                      <span className="text-gray-300 text-sm group-hover:text-white transition-colors">
                        {action.label}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-gray-600 ml-auto group-hover:text-gray-400 transition-colors" />
                    </div>
                  </Link>
                )
              })}
            </div>

            {/* EPD promo */}
            <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <p className="text-green-400 text-xs font-medium mb-1">Did you know?</p>
              <p className="text-gray-400 text-xs">
                Suppliers with verified EPDs get 4× more architect inquiries. Upload yours to stand out.
              </p>
              <Link href="/supplier/certs">
                <Button size="sm" className="mt-3 w-full bg-green-600 hover:bg-green-500 text-white text-xs h-8">
                  Upload EPD
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
