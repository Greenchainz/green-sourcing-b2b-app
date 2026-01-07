import { Link } from "react-router-dom";
import Logo from "../components/Logo";
import WhySection from "../components/LandingPage/WhySection";
import Footer from "../components/Footer";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Professional Header */}
      <header className="border-b border-gray-100 bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Logo height={32} showText={true} />
          <nav className="flex items-center gap-8">
            <Link
              to="/features"
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Features
            </Link>
            <Link
              to="/login"
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Sign In
            </Link>
            <Link
              to="/login"
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors"
            >
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      {/* B2B Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-28 lg:pt-32 lg:pb-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold uppercase tracking-wide mb-8">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Trusted by top firms
          </div>

          <h1 className="text-5xl lg:text-7xl font-bold text-gray-900 mb-6 tracking-tight">
            The Operating System for <br className="hidden lg:block" />
            <span className="text-emerald-600">Sustainable Construction</span>
          </h1>

          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            Eliminate greenwashing and verify compliance instantly. The only
            platform that connects architects directly with audited, low-carbon
            suppliers.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/survey/architect"
              className="px-8 py-4 rounded-xl bg-gray-900 text-white font-semibold text-lg hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl"
            >
              Start Sourcing
            </Link>
            <Link
              to="/login"
              className="px-8 py-4 rounded-xl bg-white border border-gray-200 text-gray-700 font-semibold text-lg hover:bg-gray-50 transition-all"
            >
              Supplier Login
            </Link>
          </div>
        </div>
      </section>

      {/* Trust Markers (Subtle, not giant) */}
      <div className="border-y border-gray-100 bg-gray-50 py-10">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-6">
            Verified data from reliable sources
          </p>
          <div className="flex flex-wrap justify-center gap-8 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
            {/* Use text or very small SVGs instead of giant images */}
            <span className="text-xl font-bold text-gray-400">
              EPD International
            </span>
            <span className="text-xl font-bold text-gray-400">EC3</span>
            <span className="text-xl font-bold text-gray-400">BREEAM</span>
            <span className="text-xl font-bold text-gray-400">LEED</span>
          </div>
        </div>
      </div>

      <WhySection />

      <Footer />
    </div>
  );
}
