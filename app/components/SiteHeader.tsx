import Image from 'next/image'
import Link from 'next/link'

export default function SiteHeader() {
  return (
    <header className="gc-header">
      <div className="gc-container">
        <div className="gc-header-inner">
          {/* Logo */}
          <Link
            href="/"
            className="group"
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}
          >
            {/* Full wordmark for larger screens */}
            <Image
              src="/brand/logo-main.png"
              alt="GreenChainz"
              width={172}
              height={40}
              priority
              className="gc-wordmark"
              style={{ height: 36, width: 'auto' }}
            />
            {/* Icon only for mobile */}
            <Image
              src="/brand/logo-icon.png"
              alt="GreenChainz"
              width={36}
              height={36}
              priority
              className="gc-mark"
              style={{ height: 36, width: 36 }}
            />
            <span className="sr-only">GreenChainz home</span>
          </Link>

          {/* Navigation */}
          <nav className="gc-nav" aria-label="Primary navigation">
            <Link href="/rfqs/create" className="gc-link">
              Create RFQ
            </Link>
            <Link href="/login" className="gc-link">
              Log in
            </Link>
            <Link href="/login" className="gc-btn gc-btn-primary">
              Get Started
            </Link>
          </nav>
        </div>
      </div>
    </header>
  )
}
