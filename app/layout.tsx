import type { Metadata } from 'next'
import './globals.css'
import SiteHeader from './components/SiteHeader'
import Footer from './components/Footer'

export const metadata: Metadata = {
  title: 'GreenChainz - Verified Sustainable Sourcing',
  description: 'The Trust Layer for Sustainable Commerce. Connect verified suppliers with architects & builders.',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.svg', type: 'image/svg+xml' }
    ],
    apple: '/apple-touch-icon.png',
  },
  themeColor: '#059669',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Greenchainz',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <div className="gc-shell">
          <SiteHeader />
          <main className="gc-main">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  )
}
