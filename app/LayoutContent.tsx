'use client'

import SiteHeader from './components/SiteHeader'
import Footer from './components/Footer'
import IntercomWidget from './components/IntercomWidget'
import { useAuth } from './hooks/useAuth'

export function LayoutContent({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  return (
    <div className="gc-shell">
      <SiteHeader />
      <main className="gc-main">{children}</main>
      <Footer />
      {!loading && <IntercomWidget user={user ?? undefined} />}
    </div>
  )
}
