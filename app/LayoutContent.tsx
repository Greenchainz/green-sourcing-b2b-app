"use client";

import SiteHeader from './components/SiteHeader'
import Footer from './components/Footer'
import IntercomWidget from './components/IntercomWidget'
import { useAuth } from './hooks/useAuth'
import { usePathname } from 'next/navigation'

export function LayoutContent({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const pathname = usePathname()

  // Check if we are in the Supplier Dashboard
  const isSupplierDashboard = pathname?.startsWith('/dashboard/supplier')

  if (isSupplierDashboard) {
    return (
      <div className="h-full">
        {children}
      </div>
    )
  }
import SiteHeader from "./components/SiteHeader";
import Footer from "./components/Footer";
import { IntercomProvider } from "./components/IntercomProvider";
import IntercomWidget from "./components/IntercomWidget";
import { useAuth } from "./hooks/useAuth";

export function LayoutContent({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  return (
    <IntercomProvider>
      <div className="gc-shell">
        <SiteHeader />
        <main className="gc-main">{children}</main>
        <Footer />
        {!loading && <IntercomWidget user={user ?? undefined} />}
      </div>
    </IntercomProvider>
  );
}
