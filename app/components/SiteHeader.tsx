import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'

export default function SiteHeader() {
  return (
    <header className="gc-header sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-gc-fern/10">
      <div className="gc-container">
        <div className="gc-header-inner py-4">
          {/* Logo */}
          <Link
            href="/"
            className="group flex items-center gap-3"
          >
            {/* Full wordmark for larger screens */}
            <Image
              src="/brand/logo-main.png"
              alt="GreenChainz"
              width={172}
              height={40}
              priority
              className="gc-wordmark h-10 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
              style={{ maxWidth: '172px', height: 'auto' }}
            />
            {/* Icon only for mobile */}
            <Image
              src="/brand/logo-icon.png"
              alt="GreenChainz"
              width={36}
              height={36}
              priority
              className="gc-mark h-10 w-10 object-contain transition-transform duration-300 group-hover:scale-105"
            />
            <span className="sr-only">GreenChainz home</span>
          </Link>

          {/* Navigation */}
          <nav className="gc-nav flex items-center gap-2" aria-label="Primary navigation">
            <Link 
              href="/rfqs/create" 
              className="hidden sm:flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-slate-700 hover:text-gc-fern-dark hover:bg-gc-fern/5 rounded-lg transition-all duration-200"
            >
              Create RFQ
            </Link>
            <Link 
              href="/login" 
              className="hidden sm:flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-slate-700 hover:text-gc-fern-dark hover:bg-gc-fern/5 rounded-lg transition-all duration-200"
            >
              Log in
            </Link>
            <Link 
              href="/login" 
              className="group flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white rounded-xl transition-all duration-300 relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #71b340 0%, #669d31 50%, #0d9488 100%)',
                backgroundSize: '200% 200%',
                animation: 'gradientFlow 3s ease infinite',
              }}
            >
              <Sparkles className="w-4 h-4" />
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            </Link>
          </nav>
        </div>
      </div>
    </header>
  )
}
