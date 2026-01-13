// app/layout.tsx
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { LayoutContent } from './LayoutContent'
import StructuredData from './components/StructuredData'

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
    default: 'GreenChainz — Sustainability Compliance Auditing That Saves You Money',
    template: '%s | GreenChainz',
  },
  description:
    'Cut compliance costs by 85% with AI-powered sustainability auditing. Automated EPD verification, LEED compliance tracking, and carbon scoring for construction. Green because it makes business sense.',
  keywords: [
    'sustainability compliance auditing',
    'green building compliance',
    'LEED compliance automation',
    'EPD verification software',
    'construction sustainability audit',
    'building materials compliance',
    'carbon footprint tracking',
    'supply chain sustainability',
    'green procurement software',
    'sustainable construction ROI',
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
    title: 'GreenChainz — Sustainability Compliance Auditing That Saves You Money',
    description:
      'Cut compliance costs by 85% with AI-powered sustainability auditing. Green because it makes business sense—save money while meeting LEED, EPD, and carbon requirements.',
    images: [
      {
        url: '/brand/greenchainz-logo.png',
        width: 1200,
        height: 630,
        alt: 'GreenChainz - Sustainability Compliance Auditing',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@greenchainzhq',
    title: 'GreenChainz — Sustainability Compliance Auditing That Saves You Money',
    description:
      'Cut compliance costs by 85% with AI-powered sustainability auditing. Green because it makes business sense.',
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
      <head>
        <StructuredData />
      </head>
      <body>
        <LayoutContent>{children}</LayoutContent>
      </body>
    </html>
  )
}
