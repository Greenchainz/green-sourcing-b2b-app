import Link from "next/link";
import { ArrowRight, FileSpreadsheet, Chrome, Box, FileText } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50">
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
      {/* Hero Section with Premium Gradient */}
      <section className="relative overflow-hidden text-white py-24 px-6 text-center" style={{
        background: 'linear-gradient(135deg, #064e3b 0%, #065f46 20%, #047857 40%, #059669 60%, #0891b2 80%, #06b6d4 100%)',
      }}>
        {/* Animated gradient overlay */}
        <div className="absolute inset-0 opacity-30" style={{
          background: 'radial-gradient(ellipse 800px 600px at 50% -20%, rgba(16, 185, 129, 0.4), transparent 70%)',
        }}></div>
        
        <div className="relative z-10 max-w-6xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-black mb-6 animate-fade-in-up" style={{
            letterSpacing: '-0.02em',
            lineHeight: '1.1',
          }}>
            Stop Searching.<br />Start Auditing.
          </h1>
          <p className="text-xl md:text-2xl max-w-3xl mx-auto mb-6 text-white/90 leading-relaxed animate-fade-in-up" style={{
            animationDelay: '0.1s',
          }}>
            GreenChainz is a suite of AI-powered tools that plug directly into
            Excel, Revit, and your browser to automate your sustainability compliance.
          </p>
          <p className="text-lg text-white/80 mb-10 animate-fade-in-up" style={{
            animationDelay: '0.2s',
          }}>
            Don't change your workflow. We just make it green.
          </p>
          <div className="flex justify-center gap-4 flex-wrap animate-fade-in-up" style={{
            animationDelay: '0.3s',
          }}>
            <Link
              href="/signup"
              className="btn-premium relative inline-flex items-center gap-2 group"
            >
              Get the Toolkit (Free)
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="#tools"
              className="card-glass inline-block px-8 py-4 rounded-xl font-bold text-lg hover:scale-105 active:scale-95 transition-all"
            >
              See the Tools
            </Link>
          </div>
        </div>

        {/* Floating decoration elements */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-white/10 rounded-full blur-2xl animate-float"></div>
        <div className="absolute bottom-20 right-10 w-32 h-32 bg-white/10 rounded-full blur-3xl animate-float" style={{
          animationDelay: '1s',
        }}></div>
      </section>

      {/* Tools Section */}
      <section id="tools" className="py-20 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-16 animate-fade-in-up">
          <h2 className="text-4xl md:text-5xl font-black mb-4 text-slate-900">
            Choose Your Weapon
          </h2>
          <p className="text-slate-600 text-lg max-w-2xl mx-auto">
            Each tool brings sustainability intelligence directly into the software
            you already use—no new workflows, no learning curve.
          </p>
        </div>

        {/* Tools Grid with Premium Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Tool 1: Excel Carbon Audit */}
          <div className="card-premium group animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <div className="bg-gradient-to-br from-emerald-100 to-emerald-50 w-16 h-16 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-md">
              <FileSpreadsheet className="w-8 h-8 text-emerald-700" />
            </div>
            <h3 className="text-2xl font-black mb-3 text-slate-900">Excel Audit</h3>
            <p className="text-slate-600 mb-6 text-base leading-relaxed">
              Upload your Bill of Materials (BOM). Our AI matches generic product names
              to verified low-carbon alternatives and identifies health hazards instantly.
            </p>
            <div className="space-y-2 mb-6 text-sm text-slate-700">
              <p className="flex items-center gap-2"><span className="text-emerald-600 font-bold">✓</span> Embodied carbon (kgCO2e)</p>
              <p className="flex items-center gap-2"><span className="text-emerald-600 font-bold">✓</span> Health grade &amp; toxins</p>
              <p className="flex items-center gap-2"><span className="text-emerald-600 font-bold">✓</span> Red List certifications</p>
            </div>
            <Link href="/excel-addin" className="inline-flex items-center gap-2 text-emerald-700 font-bold group/link hover:gap-3 transition-all">
              Launch Audit <ArrowRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Tool 2: Chrome Extension */}
          <div className="card-premium group animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <div className="bg-gradient-to-br from-blue-100 to-blue-50 w-16 h-16 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-md">
              <Chrome className="w-8 h-8 text-blue-700" />
            </div>
            <h3 className="text-2xl font-black mb-3 text-slate-900">Sweets Interceptor</h3>
            <p className="text-slate-600 mb-6 text-base leading-relaxed">
              Browsing Sweets, Material Bank, or supplier specs? We overlay real-time
              sustainability data and flag high-carbon materials directly on their site.
            </p>
            <div className="space-y-2 mb-6 text-sm text-slate-700">
              <p className="flex items-center gap-2"><span className="text-blue-600 font-bold">✓</span> Real-time EPD lookups</p>
              <p className="flex items-center gap-2"><span className="text-blue-600 font-bold">✓</span> Price + carbon comparison</p>
              <p className="flex items-center gap-2"><span className="text-blue-600 font-bold">✓</span> Green alternative suggestions</p>
            </div>
            <Link href="/chrome-extension" className="inline-flex items-center gap-2 text-blue-700 font-bold group/link hover:gap-3 transition-all">
              Install Extension <ArrowRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Tool 3: Revit Plugin */}
          <div className="card-premium group animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <div className="bg-gradient-to-br from-purple-100 to-purple-50 w-16 h-16 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-md">
              <Box className="w-8 h-8 text-purple-700" />
            </div>
            <h3 className="text-2xl font-black mb-3 text-slate-900">Revit Compliance</h3>
            <p className="text-slate-600 mb-6 text-base leading-relaxed">
              The "Spellchecker" for LEED. Scan your 3D model in real-time to identify
              missing EPDs, high-carbon materials, and LEED-ineligible products.
            </p>
            <div className="space-y-2 mb-6 text-sm text-slate-700">
              <p className="flex items-center gap-2"><span className="text-purple-600 font-bold">✓</span> Real-time model scanning</p>
              <p className="flex items-center gap-2"><span className="text-purple-600 font-bold">✓</span> LEED point calculations</p>
              <p className="flex items-center gap-2"><span className="text-purple-600 font-bold">✓</span> Bulk material replacement</p>
            </div>
            <Link href="/revit-plugin" className="inline-flex items-center gap-2 text-purple-700 font-bold group/link hover:gap-3 transition-all">
              Download Plugin <ArrowRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Tool 4: Submittal Auto-Generator */}
          <div className="card-premium group animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            <div className="bg-gradient-to-br from-amber-100 to-amber-50 w-16 h-16 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-md">
              <FileText className="w-8 h-8 text-amber-700" />
            </div>
            <h3 className="text-2xl font-black mb-3 text-slate-900">Submittal Generator</h3>
            <p className="text-slate-600 mb-6 text-base leading-relaxed">
              Drag in a spec book PDF. We extract requirements, find compliant products with EPDs,
              and deliver a polished submittal package—cover, comparison, and attachments.
            </p>
            <div className="space-y-2 mb-6 text-sm text-slate-700">
              <p className="flex items-center gap-2"><span className="text-amber-600 font-bold">✓</span> Azure Document Intelligence parsing</p>
              <p className="flex items-center gap-2"><span className="text-amber-600 font-bold">✓</span> Azure OpenAI criteria extraction</p>
              <p className="flex items-center gap-2"><span className="text-amber-600 font-bold">✓</span> EPD-backed PDF package</p>
            </div>
            <Link href="/tools/submittal-generator" className="inline-flex items-center gap-2 text-amber-700 font-bold group/link hover:gap-3 transition-all">
              Try It Now <ArrowRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>

        {/* How It Works Section */}
        <section className="card-glass py-20 px-6 mt-20 rounded-2xl animate-fade-in-up">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-4xl font-black text-center mb-16 text-slate-900">
              How It Works <span className="text-gradient">(The Magic Behind the Scenes)</span>
            </h2>

            <div className="space-y-12">
              {[
                { step: 1, title: "You Select Materials", desc: "Copy/paste your material list into Excel, browse Sweets, or load your Revit model." },
                { step: 2, title: "Azure AI Matches Data", desc: "Our LLM cleans messy supplier names and fuzzy matches them against 50K+ EPD products." },
                { step: 3, title: "Real-Time Certification Lookup", desc: "We pull live data from Building Transparency, HPD, Declare, FSC, and other databases." },
                { step: 4, title: "Actionable Insights Appear", desc: "Carbon scores, health grades, and green alternatives pop up instantly—no waiting." },
              ].map((item, index) => (
                <div key={item.step} className="flex gap-8 items-start group animate-fade-in-up" style={{ animationDelay: `${0.5 + index * 0.1}s` }}>
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-14 w-14 rounded-full bg-gradient-to-br from-brand-600 to-ocean-500 text-white font-black text-xl shadow-glow group-hover:scale-110 transition-transform">
                      {item.step}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-brand-600 transition-colors">{item.title}</h3>
                    <p className="text-slate-600 text-base leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Data Sources Banner */}
        <section className="relative overflow-hidden py-16 px-6 mt-20 rounded-2xl animate-fade-in-up" style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
        }}>
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}></div>
          <div className="relative z-10 max-w-5xl mx-auto text-center">
            <h2 className="text-3xl font-black mb-6 text-white">Powered by the Best Data Sources</h2>
            <p className="text-slate-200 mb-10 text-lg">
              We aggregate EPD data from Building Transparency (EC3), HPD databases,
              FSC, LEED, and more. Always fresh. Always verified.
            </p>
            <div className="grid md:grid-cols-4 gap-6 text-sm">
              {[
                { title: 'Building Transparency', desc: 'EC3 Platform' },
                { title: 'Health Data', desc: 'HPD + Declare' },
                { title: 'Certifications', desc: 'FSC, GOTS, C2C' },
                { title: 'Compliance', desc: 'LEED + Living Building' },
              ].map((source, index) => (
                <div key={source.title} className="card-glass p-4 hover:scale-105 transition-transform animate-scale-in" style={{ animationDelay: `${0.8 + index * 0.1}s` }}>
                  <p className="font-bold text-white">{source.title}</p>
                  <p className="text-slate-300 mt-1">{source.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20 px-6 animate-fade-in-up">
          <div className="max-w-4xl mx-auto text-center card-premium p-12 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-brand-50 to-ocean-50 opacity-50"></div>
            <div className="relative z-10">
              <h2 className="text-3xl font-black text-slate-900 mb-4">
                Ready to Build Green <span className="text-gradient">(For Real)</span>?
              </h2>
              <p className="text-slate-600 mb-8 text-lg">
                Start with a free account. No credit card. Pick your tool. Audit your materials.
              </p>
              <Link href="/signup" className="btn-premium inline-flex items-center gap-2 group">
                Get Started Free
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </section>
      </section>
    </div>
  );
}
