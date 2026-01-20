import Link from "next/link";
import Image from "next/image";
import { ArrowRight, FileSpreadsheet, Chrome, Box, FileText, DollarSign, Leaf, Zap, Shield, TrendingDown, CheckCircle2, Sparkles, Star, Globe, Award } from "lucide-react";
import SiteHeader from "./components/SiteHeader";
import Footer from "./components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen premium-bg-animated">
      {/* LocalBusiness Schema for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "LocalBusiness",
            "name": "GreenChainz",
            "image": "https://greenchainz.com/og-image.png",
            "@id": "https://greenchainz.com",
            "url": "https://greenchainz.com",
            "telephone": "",
            "priceRange": "$$",
            "address": {
              "@type": "PostalAddress",
              "streetAddress": "",
              "addressLocality": "Danville",
              "addressRegion": "VA",
              "postalCode": "",
              "addressCountry": "US"
            },
            "geo": {
              "@type": "GeoCoordinates",
              "latitude": 36.5859718,
              "longitude": -79.3950228
            },
            "openingHoursSpecification": {
              "@type": "OpeningHoursSpecification",
              "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
              "opens": "09:00",
              "closes": "17:00"
            }
          })
        }}
      />

      <SiteHeader />

      {/* Hero Section - Premium Vibrant Theme */}
      <section className="hero-premium relative overflow-hidden text-white py-28 md:py-40 px-6 text-center">
        {/* Animated premium gradient background */}
        <div className="absolute inset-0 hero-premium-gradient"></div>

        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}></div>

        {/* Multi-color glowing orbs */}
        <div className="hero-orb hero-orb-1"></div>
        <div className="hero-orb hero-orb-2"></div>
        <div className="hero-orb hero-orb-3"></div>
        <div className="hero-orb hero-orb-4"></div>

        <div className="relative z-10 max-w-6xl mx-auto">
          {/* Logo with glow effect */}
          <div className="flex justify-center mb-10 animate-fade-in-up">
            <div className="logo-glow-container">
              <Image
                src="/brand/greenchainz-logo-full.png"
                alt="GreenChainz"
                width={320}
                height={80}
                priority
                className="h-auto w-[220px] md:w-[300px] drop-shadow-2xl"
              />
            </div>
          </div>

          {/* Main Tagline */}
          <h1 className="hero-title-premium mb-8 animate-fade-in-up" style={{
            animationDelay: '0.1s',
          }}>
            Where Being Green<br />
            <span className="hero-title-glow">Has Never Been So Easy</span>
          </h1>

          {/* Value proposition */}
          <p className="text-xl md:text-2xl max-w-3xl mx-auto mb-4 text-white/95 leading-relaxed animate-fade-in-up font-medium" style={{
            animationDelay: '0.2s',
          }}>
            Save money. Save the planet. Same workflow.
          </p>

          <p className="text-lg md:text-xl max-w-2xl mx-auto mb-12 text-white/80 leading-relaxed animate-fade-in-up" style={{
            animationDelay: '0.3s',
          }}>
            We plug AI-powered sustainability tools directly into Excel, Revit, and your browser—so you can stay compliant without changing how you work.
          </p>

          {/* CTA Buttons with aurora glow */}
          <div className="flex justify-center gap-5 flex-wrap animate-fade-in-up" style={{
            animationDelay: '0.4s',
          }}>
            <Link
              href="/login"
              className="btn-aurora group shimmer"
            >
              <Sparkles className="w-5 h-5" />
              <span>Start Saving Today</span>
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="#tools"
              className="btn-glass"
            >
              See How It Works
            </Link>
          </div>

          {/* Trust indicators */}
          <div className="mt-14 flex flex-wrap justify-center gap-6 md:gap-10 text-white/80 text-sm animate-fade-in-up" style={{
            animationDelay: '0.5s',
          }}>
            <span className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
              <CheckCircle2 className="w-5 h-5 text-gc-fern-light" />
              Free to start
            </span>
            <span className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
              <CheckCircle2 className="w-5 h-5 text-gc-teal-light" />
              No credit card needed
            </span>
            <span className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
              <CheckCircle2 className="w-5 h-5 text-gc-sage-light" />
              5-minute setup
            </span>
          </div>
        </div>
      </section>

      {/* Value Props Section - Premium Gradient */}
      <section className="py-24 px-6 section-gradient-1 relative overflow-hidden">
        {/* Decorative blobs */}
        <div className="deco-blob deco-blob-fern w-[500px] h-[500px] -top-40 -left-40 opacity-30"></div>
        <div className="deco-blob deco-blob-teal w-[400px] h-[400px] top-20 -right-20 opacity-20"></div>

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-20">
            <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-gc-fern-50 via-gc-teal-50 to-gc-sage-50 text-gc-fern-dark text-sm font-bold mb-5 border border-gc-fern-200">
              <DollarSign className="w-4 h-4" />
              DOLLARS & SENSE
            </span>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-5">
              Green Makes <span className="text-aurora">Cents</span>
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Sustainability isn&apos;t a luxury—it&apos;s a competitive advantage. We make it affordable, accessible, and automatic.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Card 1 */}
            <div className="feature-card-premium group">
              <div className="feature-icon-premium">
                <TrendingDown className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Cut Compliance Costs</h3>
              <p className="text-slate-600 leading-relaxed">
                No more expensive consultants. No manual data entry. Our AI does the heavy lifting—so your budget stays green too.
              </p>
            </div>

            {/* Card 2 */}
            <div className="feature-card-premium group">
              <div className="feature-icon-premium">
                <Zap className="w-8 h-8 text-cyan-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Save Hours Every Week</h3>
              <p className="text-slate-600 leading-relaxed">
                What used to take days now takes minutes. Instant EPD lookups, automated audits, and one-click submittals.
              </p>
            </div>

            {/* Card 3 */}
            <div className="feature-card-premium group">
              <div className="feature-icon-premium">
                <Shield className="w-8 h-8 text-violet-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Stay Ahead of Regulations</h3>
              <p className="text-slate-600 leading-relaxed">
                LEED, Buy Clean, and beyond—we track the rules so you don&apos;t have to. Future-proof your projects today.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Catchy Slogan Banner - Premium Aurora */}
      <section className="py-16 px-6 relative overflow-hidden" style={{
        background: 'linear-gradient(135deg, #064e3b 0%, #0d9488 25%, #0891b2 50%, #4f46e5 75%, #7c3aed 100%)'
      }}>
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}></div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <p className="text-2xl md:text-4xl font-black text-white tracking-tight leading-tight">
            &quot;Every dollar saved is a tree planted.<br />
            <span className="text-emerald-300">Every minute saved is a forest grown.</span>&quot;
          </p>
        </div>
      </section>

      {/* Tools Section - Premium Cards */}
      <section id="tools" className="py-24 px-6 section-gradient-2 relative overflow-hidden">
        {/* Decorative blobs */}
        <div className="deco-blob deco-blob-violet w-[450px] h-[450px] top-0 -right-40 opacity-20"></div>
        <div className="deco-blob deco-blob-blue w-[350px] h-[350px] bottom-20 -left-20 opacity-20"></div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-20 animate-fade-in-up">
            <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-emerald-100 via-sky-100 to-violet-100 text-emerald-700 text-sm font-bold mb-5 border border-sky-200">
              <Leaf className="w-4 h-4 text-emerald-500" />
              YOUR GREEN TOOLKIT
            </span>
            <h2 className="text-4xl md:text-5xl font-black mb-5 text-slate-900">
              Pick Your Tool. <span className="text-ocean">Keep Your Workflow.</span>
            </h2>
            <p className="text-slate-600 text-lg max-w-2xl mx-auto">
              No new software to learn. We integrate directly into the tools you already use—Excel, Revit, Chrome.
            </p>
          </div>

          {/* Tools Grid with Premium Cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Tool 1: Excel Carbon Audit */}
            <div className="card-rainbow-border group hover:scale-[1.02] transition-all duration-500">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-50 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-emerald-200/50">
                <FileSpreadsheet className="w-8 h-8 text-emerald-700" />
              </div>
              <h3 className="text-2xl font-black mb-3 text-slate-900 group-hover:text-emerald-700 transition-colors">Excel Audit</h3>
              <p className="text-slate-600 mb-6 text-base leading-relaxed">
                Upload your BOM. Get instant carbon scores, health grades, and greener alternatives—all without leaving Excel.
              </p>
              <div className="space-y-2 mb-6 text-sm text-slate-700">
                <p className="flex items-center gap-2"><span className="text-emerald-500 font-bold">✓</span> Embodied carbon (kgCO2e)</p>
                <p className="flex items-center gap-2"><span className="text-emerald-500 font-bold">✓</span> Health hazard detection</p>
                <p className="flex items-center gap-2"><span className="text-emerald-500 font-bold">✓</span> One-click alternatives</p>
              </div>
              <Link href="/excel-addin" className="inline-flex items-center gap-2 font-bold text-emerald-700 hover:text-emerald-800 hover:gap-3 transition-all">
                Launch Audit <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Tool 2: Chrome Extension */}
            <div className="card-rainbow-border group hover:scale-[1.02] transition-all duration-500">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-100 to-sky-50 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-sky-200/50">
                <Chrome className="w-8 h-8 text-sky-700" />
              </div>
              <h3 className="text-2xl font-black mb-3 text-slate-900 group-hover:text-sky-700 transition-colors">Browser Extension</h3>
              <p className="text-slate-600 mb-6 text-base leading-relaxed">
                Shopping for materials online? We overlay sustainability data on any supplier site—instantly.
              </p>
              <div className="space-y-2 mb-6 text-sm text-slate-700">
                <p className="flex items-center gap-2"><span className="text-sky-500 font-bold">✓</span> Real-time EPD lookups</p>
                <p className="flex items-center gap-2"><span className="text-sky-500 font-bold">✓</span> Price + carbon comparison</p>
                <p className="flex items-center gap-2"><span className="text-sky-500 font-bold">✓</span> Works on any website</p>
              </div>
              <Link href="/chrome-extension" className="inline-flex items-center gap-2 font-bold text-sky-700 hover:text-sky-800 hover:gap-3 transition-all">
                Get Extension <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Tool 3: Revit Plugin */}
            <div className="card-rainbow-border group hover:scale-[1.02] transition-all duration-500">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-100 to-violet-50 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-violet-200/50">
                <Box className="w-8 h-8 text-violet-700" />
              </div>
              <h3 className="text-2xl font-black mb-3 text-slate-900 group-hover:text-violet-700 transition-colors">Revit Plugin</h3>
              <p className="text-slate-600 mb-6 text-base leading-relaxed">
                The &quot;spellchecker&quot; for LEED. Scan your model in real-time and catch compliance issues before they cost you.
              </p>
              <div className="space-y-2 mb-6 text-sm text-slate-700">
                <p className="flex items-center gap-2"><span className="text-violet-500 font-bold">✓</span> Live model scanning</p>
                <p className="flex items-center gap-2"><span className="text-violet-500 font-bold">✓</span> LEED point tracking</p>
                <p className="flex items-center gap-2"><span className="text-violet-500 font-bold">✓</span> Bulk material swaps</p>
              </div>
              <Link href="/revit-plugin" className="inline-flex items-center gap-2 font-bold text-violet-700 hover:text-violet-800 hover:gap-3 transition-all">
                Download Plugin <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Tool 4: Submittal Generator */}
            <div className="card-rainbow-border group hover:scale-[1.02] transition-all duration-500">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-100 to-amber-50 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-amber-200/50">
                <FileText className="w-8 h-8 text-amber-700" />
              </div>
              <h3 className="text-2xl font-black mb-3 text-slate-900 group-hover:text-amber-700 transition-colors">Submittal Generator</h3>
              <p className="text-slate-600 mb-6 text-base leading-relaxed">
                Drop in a spec PDF. Get a complete submittal package with EPD-backed products—in minutes, not days.
              </p>
              <div className="space-y-2 mb-6 text-sm text-slate-700">
                <p className="flex items-center gap-2"><span className="text-amber-500 font-bold">✓</span> AI spec extraction</p>
                <p className="flex items-center gap-2"><span className="text-amber-500 font-bold">✓</span> Auto product matching</p>
                <p className="flex items-center gap-2"><span className="text-amber-500 font-bold">✓</span> Ready-to-send PDFs</p>
              </div>
              <Link href="/tools/submittal-generator" className="inline-flex items-center gap-2 font-bold text-amber-700 hover:text-amber-800 hover:gap-3 transition-all">
                Try It Now <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section - Premium Style */}
      <section className="py-24 px-6 bg-mesh-gradient relative overflow-hidden">
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-5">
              Easy as <span className="text-cosmic">1-2-3</span>
            </h2>
            <p className="text-lg text-slate-600">
              No training required. No workflow changes. Just results.
            </p>
          </div>

          <div className="space-y-8 md:space-y-0 md:grid md:grid-cols-3 md:gap-10">
            {[
              {
                step: 1,
                title: "Connect",
                desc: "Install our Excel add-in, Chrome extension, or Revit plugin. Takes under 2 minutes.",
                icon: "🔌",
                color: "emerald"
              },
              {
                step: 2,
                title: "Work Normally",
                desc: "Do your job like always. Select materials, browse suppliers, design your model.",
                icon: "💼",
                color: "cyan"
              },
              {
                step: 3,
                title: "Get Green Insights",
                desc: "Carbon scores, certifications, and better alternatives appear automatically. Done.",
                icon: "🌱",
                color: "violet"
              },
            ].map((item) => (
              <div key={item.step} className="card-vibrant p-8 text-center relative group">
                <div className={`absolute -top-5 left-1/2 transform -translate-x-1/2 w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-lg shadow-lg ${item.color === 'emerald' ? 'bg-gradient-to-br from-emerald-500 to-teal-500 shadow-emerald-300/50' :
                    item.color === 'cyan' ? 'bg-gradient-to-br from-cyan-500 to-blue-500 shadow-cyan-300/50' :
                      'bg-gradient-to-br from-violet-500 to-purple-500 shadow-violet-300/50'
                  }`}>
                  {item.step}
                </div>
                <span className="text-5xl mb-5 block group-hover:scale-110 transition-transform duration-300">{item.icon}</span>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{item.title}</h3>
                <p className="text-slate-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof / Stats - Premium Aurora Bar */}
      <section className="py-20 px-6 stats-bar-premium text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 text-center">
            <div className="stat-item">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Globe className="w-6 h-6 text-white/80" />
              </div>
              <p className="text-4xl md:text-5xl font-black text-white mb-1">50K+</p>
              <p className="text-white/80 text-sm font-medium">EPD Products</p>
            </div>
            <div className="stat-item">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Zap className="w-6 h-6 text-white/80" />
              </div>
              <p className="text-4xl md:text-5xl font-black text-white mb-1">85%</p>
              <p className="text-white/80 text-sm font-medium">Time Saved</p>
            </div>
            <div className="stat-item">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Star className="w-6 h-6 text-white/80" />
              </div>
              <p className="text-4xl md:text-5xl font-black text-white mb-1">$0</p>
              <p className="text-white/80 text-sm font-medium">To Get Started</p>
            </div>
            <div className="stat-item">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Award className="w-6 h-6 text-white/80" />
              </div>
              <p className="text-4xl md:text-5xl font-black text-white mb-1">24/7</p>
              <p className="text-white/80 text-sm font-medium">Data Updates</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA - Premium Style */}
      <section className="py-28 px-6 section-gradient-3 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="deco-blob deco-blob-emerald w-[400px] h-[400px] -top-20 -left-20 opacity-20"></div>
        <div className="deco-blob deco-blob-violet w-[350px] h-[350px] -bottom-20 -right-20 opacity-20"></div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="cta-premium p-10 md:p-14">
            <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-emerald-100 via-cyan-100 to-violet-100 text-emerald-700 text-sm font-bold mb-8 border border-emerald-200">
              <Sparkles className="w-4 h-4" />
              START TODAY
            </span>
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-5">
              Ready to Make Green <span className="text-aurora">Easy</span>?
            </h2>
            <p className="text-lg text-slate-600 mb-10 max-w-xl mx-auto">
              Join the teams who&apos;ve stopped wrestling with spreadsheets and started winning green building projects.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-5">
              <Link href="/login" className="btn-aurora group shimmer">
                <Sparkles className="w-5 h-5" />
                <span>Get Started Free</span>
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link href="/how-it-works" className="btn-cosmic">
                See a Demo
              </Link>
            </div>
            <p className="mt-8 text-sm text-slate-500">
              No credit card required • Setup in 5 minutes • Cancel anytime
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
