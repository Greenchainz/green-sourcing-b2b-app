import Image from 'next/image'
import Link from 'next/link'

export default function SiteHeader() {
  return (
    <header className="gc-header">
      <div className="gc-container">
        <div className="gc-header-inner">
        <Link href="/" className="group flex items-center gap-3">
          <Image
            src="/assets/logo/greenchainz-full.svg"
            alt="GreenChainz"
            width={172}
            height={40}
            priority
            className="gc-wordmark"
          />
          <Image
            src="/brand/logo-icon.png"
            alt="GreenChainz"
            width={36}
            height={36}
            priority
            className="gc-mark"
          />
          <span className="sr-only">GreenChainz home</span>
        </Link>

        <nav className="gc-nav" aria-label="Primary">
          <Link
            href="/rfqs/create"
            className="gc-link"
          >
            Create RFQ
          </Link>
          <Link
            href="/login"
            className="gc-link"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="gc-btn gc-btn-primary"
          >
            Get started
          </Link>
        </nav>
        </div>
      </div>
    </header>
  )
}

