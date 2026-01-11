import Link from "next/link";
import Image from "next/image";
import { ArrowRight, FileSpreadsheet, Chrome, Box, FileText, DollarSign, Leaf, Zap, Shield, TrendingDown, CheckCircle2 } from "lucide-react";
import SiteHeader from "./components/SiteHeader";
import Footer from "./components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-money-50 to-white">
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
              "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday"],
              "opens": "09:00",
              "closes": "17:00"
            }
          })
        }}
      />
      
      <SiteHeader />

      {/* Hero Section - Dollar Bill Green Theme */}
      <section className="hero-section relative overflow-hidden text-white py-28 md:py-36 px-6 text-center">
        {/* Animated money-green gradient background */}
        <div className="absolute inset-0 hero-gradient"></div>
        
        {/* Subtle pattern overlay (like dollar bill engraving) */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}></div>
        
        {/* Glowing orbs */}
        <div className="glow-orb glow-orb-1"></div>
        <div className="glow-orb glow-orb-2"></div>
        <div className="glow-orb glow-orb-3"></div>
        
        <div className="relative z-10 max-w-6xl mx-auto">
          {/* Logo with glow effect */}
          <div className="flex justify-center mb-8 animate-fade-in-up">
            <div className="logo-glow-container">
              <Image
                src="/brand/greenchainz-logo-full.png"
                alt="GreenChainz"
                width={280}
                height={70}
                priority
                className="h-16 md:h-20 w-auto drop-shadow-2xl"
              />
            </div>
          </div>

          {/* Main Tagline */}
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-black mb-6 animate-fade-in-up hero-title" style={{
            animationDelay: '0.1s',
          }}>
            Where Being Green<br />
            <span className="text-glow">Has Never Been So Easy</span>
          </h1>
          
          {/* Value proposition */}
          <p className="text-xl md:text-2xl max-w-3xl mx-auto mb-4 text-white/95 leading-relaxed animate-fade-in-up font-medium" style={{
            animationDelay: '0.2s',
          }}>
            Save money. Save the planet. Same workflow.
          </p>
          
          <p className="text-lg md:text-xl max-w-2xl mx-auto mb-10 text-white/80 leading-relaxed animate-fade-in-up" style={{
            animationDelay: '0.3s',
          }}>
            We plug AI-powered sustainability tools directly into Excel, Revit, and your browser—so you can stay compliant without changing how you work.
          </p>
          
          {/* CTA Buttons with glow */}
          <div className="flex justify-center gap-4 flex-wrap animate-fade-in-up" style={{
            animationDelay: '0.4s',
          }}>
            <Link
              href="/signup"
              className="btn-money group"
            >
              <span className="flex items-center gap-2">
                Start Saving Today
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
            <Link
              href="#tools"
              className="btn-glass"
            >
              See How It Works
            </Link>
          </div>
          
          {/* Trust indicators */}
          <div className="mt-12 flex flex-wrap justify-center gap-6 md:gap-10 text-white/70 text-sm animate-fade-in-up" style={{
            animationDelay: '0.5s',
          }}>
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-money-300" />
              Free to start
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-money-300" />
              No credit card needed
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-money-300" />
              5-minute setup
            </span>
          </div>
        </div>
      </section>

      {/* Value Props Section - "Dollars and Sense" */}
      <section className="py-20 px-6 bg-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-money-50/50 to-transparent"></div>
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-money-100 text-money-700 text-sm font-bold mb-4">
              <DollarSign className="w-4 h-4" />
              DOLLARS &amp; SENSE
            </span>
            <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-4">
              Green Makes <span className="text-money-600">Cents</span>
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Sustainability isn't a luxury—it's a competitive advantage. We make it affordable, accessible, and automatic.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Card 1 */}
            <div className="value-card group">
              <div className="value-card-icon bg-money-100 group-hover:bg-money-200">
                <TrendingDown className="w-8 h-8 text-money-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Cut Compliance Costs</h3>
              <p className="text-slate-600 leading-relaxed">
                No more expensive consultants. No manual data entry. Our AI does the heavy lifting—so your budget stays green too.
              </p>
            </div>
            
            {/* Card 2 */}
            <div className="value-card group">
              <div className="value-card-icon bg-money-100 group-hover:bg-money-200">
                <Zap className="w-8 h-8 text-money-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Save Hours Every Week</h3>
              <p className="text-slate-600 leading-relaxed">
                What used to take days now takes minutes. Instant EPD lookups, automated audits, and one-click submittals.
              </p>
            </div>
            
            {/* Card 3 */}
            <div className="value-card group">
              <div className="value-card-icon bg-money-100 group-hover:bg-money-200">
                <Shield className="w-8 h-8 text-money-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Stay Ahead of Regulations</h3>
              <p className="text-slate-600 leading-relaxed">
                LEED, Buy Clean, and beyond—we track the rules so you don't have to. Future-proof your projects today.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Catchy Slogan Banner */}
      <section className="slogan-banner py-12 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-2xl md:text-3xl font-black text-white tracking-tight">
            "Every dollar saved is a tree planted. Every minute saved is a forest grown."
          </p>
        </div>
      </section>

      {/* Tools Section */}
      <section id="tools" className="py-20 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-16 animate-fade-in-up">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 text-slate-700 text-sm font-bold mb-4">
            <Leaf className="w-4 h-4 text-money-500" />
            YOUR GREEN TOOLKIT
          </span>
          <h2 className="text-3xl md:text-5xl font-black mb-4 text-slate-900">
            Pick Your Tool. <span className="text-money-600">Keep Your Workflow.</span>
          </h2>
          <p className="text-slate-600 text-lg max-w-2xl mx-auto">
            No new software to learn. We integrate directly into the tools you already use—Excel, Revit, Chrome.
          </p>
        </div>

        {/* Tools Grid with Premium Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Tool 1: Excel Carbon Audit */}
          <div className="tool-card group">
            <div className="tool-icon bg-gradient-to-br from-money-100 to-money-50">
              <FileSpreadsheet className="w-8 h-8 text-money-700" />
            </div>
            <h3 className="text-2xl font-black mb-3 text-slate-900 group-hover:text-money-700 transition-colors">Excel Audit</h3>
            <p className="text-slate-600 mb-6 text-base leading-relaxed">
              Upload your BOM. Get instant carbon scores, health grades, and greener alternatives—all without leaving Excel.
            </p>
            <div className="space-y-2 mb-6 text-sm text-slate-700">
              <p className="flex items-center gap-2"><span className="text-money-500 font-bold">✓</span> Embodied carbon (kgCO2e)</p>
              <p className="flex items-center gap-2"><span className="text-money-500 font-bold">✓</span> Health hazard detection</p>
              <p className="flex items-center gap-2"><span className="text-money-500 font-bold">✓</span> One-click alternatives</p>
            </div>
            <Link href="/excel-addin" className="tool-link">
              Launch Audit <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Tool 2: Chrome Extension */}
          <div className="tool-card group">
            <div className="tool-icon bg-gradient-to-br from-sky-100 to-sky-50">
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
            <Link href="/chrome-extension" className="tool-link text-sky-700 hover:text-sky-800">
              Get Extension <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Tool 3: Revit Plugin */}
          <div className="tool-card group">
            <div className="tool-icon bg-gradient-to-br from-violet-100 to-violet-50">
              <Box className="w-8 h-8 text-violet-700" />
            </div>
            <h3 className="text-2xl font-black mb-3 text-slate-900 group-hover:text-violet-700 transition-colors">Revit Plugin</h3>
            <p className="text-slate-600 mb-6 text-base leading-relaxed">
              The "spellchecker" for LEED. Scan your model in real-time and catch compliance issues before they cost you.
            </p>
            <div className="space-y-2 mb-6 text-sm text-slate-700">
              <p className="flex items-center gap-2"><span className="text-violet-500 font-bold">✓</span> Live model scanning</p>
              <p className="flex items-center gap-2"><span className="text-violet-500 font-bold">✓</span> LEED point tracking</p>
              <p className="flex items-center gap-2"><span className="text-violet-500 font-bold">✓</span> Bulk material swaps</p>
            </div>
            <Link href="/revit-plugin" className="tool-link text-violet-700 hover:text-violet-800">
              Download Plugin <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Tool 4: Submittal Generator */}
          <div className="tool-card group">
            <div className="tool-icon bg-gradient-to-br from-amber-100 to-amber-50">
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
            <Link href="/tools/submittal-generator" className="tool-link text-amber-700 hover:text-amber-800">
              Try It Now <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-6 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-4">
              Easy as <span className="text-money-600">1-2-3</span>
            </h2>
            <p className="text-lg text-slate-600">
              No training required. No workflow changes. Just results.
            </p>
          </div>

          <div className="space-y-8 md:space-y-0 md:grid md:grid-cols-3 md:gap-8">
            {[
              { 
                step: 1, 
                title: "Connect", 
                desc: "Install our Excel add-in, Chrome extension, or Revit plugin. Takes under 2 minutes.",
                icon: "🔌"
              },
              { 
                step: 2, 
                title: "Work Normally", 
                desc: "Do your job like always. Select materials, browse suppliers, design your model.",
                icon: "💼"
              },
              { 
                step: 3, 
                title: "Get Green Insights", 
                desc: "Carbon scores, certifications, and better alternatives appear automatically. Done.",
                icon: "🌱"
              },
            ].map((item) => (
              <div key={item.step} className="how-it-works-card">
                <div className="how-it-works-number">{item.step}</div>
                <span className="text-4xl mb-4 block">{item.icon}</span>
                <h3 className="text-xl font-bold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-slate-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof / Stats */}
      <section className="py-16 px-6 bg-money-900 text-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="stat-item">
              <p className="text-4xl md:text-5xl font-black text-money-300">50K+</p>
              <p className="text-money-100/80 text-sm font-medium mt-1">EPD Products</p>
            </div>
            <div className="stat-item">
              <p className="text-4xl md:text-5xl font-black text-money-300">85%</p>
              <p className="text-money-100/80 text-sm font-medium mt-1">Time Saved</p>
            </div>
            <div className="stat-item">
              <p className="text-4xl md:text-5xl font-black text-money-300">$0</p>
              <p className="text-money-100/80 text-sm font-medium mt-1">To Get Started</p>
            </div>
            <div className="stat-item">
              <p className="text-4xl md:text-5xl font-black text-money-300">24/7</p>
              <p className="text-money-100/80 text-sm font-medium mt-1">Data Updates</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="cta-card">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-money-100 text-money-700 text-sm font-bold mb-6">
              <Leaf className="w-4 h-4" />
              START TODAY
            </span>
            <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-4">
              Ready to Make Green <span className="text-money-600">Easy</span>?
            </h2>
            <p className="text-lg text-slate-600 mb-8 max-w-xl mx-auto">
              Join the teams who've stopped wrestling with spreadsheets and started winning green building projects.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link href="/signup" className="btn-money-large group">
                <span className="flex items-center justify-center gap-2">
                  Get Started Free
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
              <Link href="/how-it-works" className="btn-outline">
                See a Demo
              </Link>
            </div>
            <p className="mt-6 text-sm text-slate-500">
              No credit card required • Setup in 5 minutes • Cancel anytime
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
