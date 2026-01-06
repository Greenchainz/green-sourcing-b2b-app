import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import SiteHeader from './components/SiteHeader'
import Footer from './components/Footer'
import IntercomWidget from './components/IntercomWidget'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#059669',
}

export const metadata: Metadata = {
  metadataBase: new URL('https://greenchainz.com'),
  title: {
    default: 'GreenChainz — The Trust Layer for Sustainable Commerce',
    template: '%s | GreenChainz',
  },
  description:
    'Connect verified suppliers with architects & builders. Automated certification verification, real-time material sourcing, and sustainability scoring powered by LEED, EPD, FSC, and more.',
  keywords: [
    'sustainable materials',
    'green building',
    'LEED certification',
    'FSC certified',
    'EPD',
    'building materials marketplace',
    'sustainable procurement',
    'RFQ',
    'architects',
    'suppliers',
  ],
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/brand/logo-icon.png', sizes: '32x32', type: 'image/png' },
      { url: '/brand/logo-icon.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/brand/logo-icon.png',
    shortcut: '/brand/logo-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'GreenChainz',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'GreenChainz',
    title: 'GreenChainz — The Trust Layer for Sustainable Commerce',
    description:
      'Connect verified suppliers with architects & builders. Automated certification verification and real-time material sourcing.',
    images: [
      {
        url: '/brand/greenchainz-logo.png',
        width: 1200,
        height: 630,
        alt: 'GreenChainz',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@greenchainzhq',
    title: 'GreenChainz — The Trust Layer for Sustainable Commerce',
    description:
      'Connect verified suppliers with architects & builders. Automated certification verification and real-time material sourcing.',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <div className="gc-shell">
          <SiteHeader />
          <main className="gc-main">{children}</main>
          <Footer />
          <IntercomWidget />
        </div>
      </body>
    </html>
  )
}
