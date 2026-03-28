'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Boxes, FileSpreadsheet, Layers, Factory, Leaf, ArrowLeft } from 'lucide-react'

const PUBLIC_ROUTES = ['/', '/about', '/pricing', '/login', '/signup', '/how-it-works', '/contact', '/blog', '/careers', '/terms', '/privacy', '/legal']
const PUBLIC_PREFIXES = ['/blog', '/legal', '/terms', '/privacy']

const NAV_ITEMS = [
  { label: 'Dashboard',      href: '/dashboard', icon: LayoutDashboard },
  { label: 'Catalog',        href: '/catalog',   icon: Boxes },
  { label: 'RFQs',           href: '/rfqs',      icon: FileSpreadsheet },
  { label: 'Materials',      href: '/materials', icon: Layers },
  { label: 'Supplier Portal',href: '/supplier',  icon: Factory },
  { label: 'Carbon Compare', href: '/tools',     icon: Leaf },
]

export function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isPublic =
    PUBLIC_ROUTES.some(route => pathname === route) ||
    PUBLIC_PREFIXES.some(prefix => pathname.startsWith(prefix + '/') || pathname === prefix)

  if (isPublic) {
    return <>{children}</>
  }

  return (
    <div className="flex min-h-screen bg-[#0a0a0a]">
      <aside
        className="w-56 shrink-0 bg-[#111] border-r border-[#1f1f1f] flex flex-col py-6 px-3 sticky top-0 h-screen"
        aria-label="Main navigation"
      >
        <Link href="/dashboard" className="flex items-center gap-2 px-3 mb-8">
          <span className="text-green-400 font-bold text-lg">GreenChainz</span>
        </Link>

        <nav className="flex flex-col gap-1 flex-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-green-500/10 text-green-400 font-medium'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="flex flex-col gap-1 mt-4 pt-4 border-t border-[#1f1f1f]">
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-white hover:bg-white/5 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            <span>Back to Site</span>
          </Link>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
