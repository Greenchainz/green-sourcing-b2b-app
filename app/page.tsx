export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Hero Section with Green Gradient Background */}
      <div className="relative bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50">
        {/* Animated Gradient Orbs */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-emerald-400/30 to-green-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute top-1/2 -left-40 w-96 h-96 bg-gradient-to-tr from-teal-400/30 to-emerald-500/20 rounded-full blur-3xl animate-pulse delay-700"></div>
          <div className="absolute bottom-20 right-1/3 w-72 h-72 bg-gradient-to-bl from-green-400/20 to-teal-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>

        {/* Navigation */}
        <nav className="relative z-10 max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-600 to-green-700 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">G</span>
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-emerald-700 to-green-600 bg-clip-text text-transparent">
              GreenChainz
            </span>
          </div>
          <div className="flex gap-4">
            <a href="/login" className="px-4 py-2 text-emerald-700 hover:text-emerald-800 font-medium transition-colors">
              Log In
            </a>
            <a href="/signup" className="px-6 py-2 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-lg font-medium hover:from-emerald-700 hover:to-green-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
              Get Started
            </a>
          </div>
        </nav>

        {/* Hero Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-32 text-center">
          <h1 className="text-6xl md:text-7xl font-bold mb-6">
            <span className="bg-gradient-to-r from-emerald-700 via-green-600 to-teal-600 bg-clip-text text-transparent">
              The Trust Layer
            </span>
            <br />
            <span className="text-gray-900">
              for Sustainable Commerce
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-700 mb-12 max-w-3xl mx-auto leading-relaxed">
            Connect verified suppliers with architects & builders. 
            <span className="font-semibold text-emerald-700"> Automated certification verification</span>. 
            Real-time material sourcing.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <a href="/signup?type=supplier" className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl font-semibold text-lg hover:from-emerald-700 hover:to-green-700 transition-all shadow-xl hover:shadow-2xl transform hover:-translate-y-1">
              Join as Supplier
            </a>
            <a href="/signup?type=architect" className="w-full sm:w-auto px-8 py-4 bg-white text-emerald-700 border-2 border-emerald-600 rounded-xl font-semibold text-lg hover:bg-emerald-50 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1">
              Join as Architect
            </a>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-emerald-100">
              <div className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">50+</div>
              <div className="text-gray-700 font-medium mt-2">Verified Suppliers</div>
            </div>
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-emerald-100">
              <div className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">$1T</div>
              <div className="text-gray-700 font-medium mt-2">Market Opportunity</div>
            </div>
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-emerald-100">
              <div className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">24/7</div>
              <div className="text-gray-700 font-medium mt-2">AI Verification</div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-white py-24">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-4xl font-bold text-center mb-16">
            <span className="bg-gradient-to-r from-emerald-700 to-green-600 bg-clip-text text-transparent">
              Enterprise-Grade Infrastructure
            </span>
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 rounded-2xl bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-100 hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-600 to-green-600 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Verified Certifications</h3>
              <p className="text-gray-700">Automated verification of EPDs, LEED, Cradle to Cradle, and FSC certifications via AI agents</p>
            </div>

            <div className="p-8 rounded-2xl bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-100 hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-600 to-green-600 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Real-Time RFQ Matching</h3>
              <p className="text-gray-700">Intelligent matching engine connects architects with suppliers in seconds, not weeks</p>
            </div>

            <div className="p-8 rounded-2xl bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-100 hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-600 to-green-600 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Autodesk Integration</h3>
              <p className="text-gray-700">Direct integration with Revit and BIM 360 for seamless material specification workflow</p>
            </div>
          </div>
        </div>
      </div>

      {/* Final CTA */}
      <div className="bg-gradient-to-br from-emerald-600 via-green-600 to-teal-600 py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Build Sustainably?
          </h2>
          <p className="text-xl text-emerald-50 mb-8">
            Join the platform that is transforming how the AEC industry sources sustainable materials
          </p>
          <a href="/signup" className="inline-block px-10 py-4 bg-white text-emerald-700 rounded-xl font-bold text-lg hover:bg-gray-50 transition-all shadow-2xl hover:shadow-3xl transform hover:-translate-y-1">
            Get Started Today
          </a>
        </div>
      </div>
    </main>
  );
}
