import { Link } from "react-router-dom";
import Logo from "../components/Logo";
import WhySection from "../components/LandingPage/WhySection";
import Footer from "../components/Footer";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Premium Glass Header */}
      <header className="border-b border-gray-100 bg-white/70 backdrop-blur-lg sticky top-0 z-50 transition-all duration-300 hover:bg-white/90">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Logo height={32} showText={true} />
          <nav className="flex items-center gap-8">
            <Link
              to="/login"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/login"
              className="btn-premium px-6 py-2.5 text-sm"
            >
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      {/* Premium B2B Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-28 lg:pt-32 lg:pb-40" style={{
        background: 'linear-gradient(135deg, #064e3b 0%, #065f46 20%, #047857 40%, #059669 60%, #0891b2 80%, #06b6d4 100%)',
      }}>
        {/* Animated gradient overlay */}
        <div className="absolute inset-0 opacity-20" style={{
          background: 'radial-gradient(ellipse 1000px 600px at 50% -10%, rgba(16, 185, 129, 0.5), transparent 70%)',
        }}></div>

        {/* Floating decoration elements */}
        <div className="absolute top-20 left-10 w-24 h-24 bg-white/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }}></div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm text-white text-xs font-semibold uppercase tracking-wide mb-8 animate-fade-in border border-white/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Trusted by top firms
          </div>

          <h1 className="text-5xl lg:text-7xl font-bold text-white mb-6 tracking-tight animate-fade-in-up" style={{
            letterSpacing: '-0.02em',
            textShadow: '0 2px 20px rgba(0,0,0,0.2)',
          }}>
            The Operating System for <br className="hidden lg:block" />
            <span className="text-gradient-hero inline-block px-2 py-1" style={{
              background: 'linear-gradient(135deg, #a7f3d5 0%, #6ee7c2 50%, #34d399 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>Sustainable Construction</span>
          </h1>

          <p className="text-xl text-white/90 mb-10 max-w-2xl mx-auto leading-relaxed animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            Eliminate greenwashing and verify compliance instantly. The only
            platform that connects architects directly with audited, low-carbon
            suppliers.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <Link
              to="/survey/architect"
              className="btn-premium px-10 py-4 text-lg inline-flex items-center justify-center gap-2 group"
            >
              Start Sourcing
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <Link
              to="/login"
              className="card-glass px-10 py-4 text-lg font-semibold text-white inline-block rounded-xl hover:scale-105 active:scale-95 transition-all"
            >
              Supplier Login
            </Link>
          </div>
        </div>
      </section>

      {/* Trust Markers with Glassmorphism */}
      <div className="border-y border-gray-100 bg-gradient-to-r from-gray-50 to-white py-12 animate-fade-in">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-8">
            Verified data from reliable sources
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              'EPD International',
              'EC3',
              'BREEAM',
              'LEED',
            ].map((source, index) => (
              <div
                key={source}
                className="card-glass p-4 hover:scale-105 transition-all animate-scale-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <span className="text-lg font-bold text-gray-700">{source}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <WhySection />

      <Footer />
    </div>
  );
}
