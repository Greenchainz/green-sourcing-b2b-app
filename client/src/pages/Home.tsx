import { Link } from 'wouter';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import Header from '../components/Header';
import Footer from '../components/Footer';
import SEOHead from '../components/SEOHead';
import StructuredData, { homepageSchema, faqPageSchema } from '../components/StructuredData';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead
        title="Spec to Submittal — Verified Sustainable Materials | GreenChainz"
        description="GreenChainz is a verified decision engine for building materials. SWAP Engine inside Revit suggests validated alternatives. Distance-aware RFQ routing finds suppliers who can actually deliver. CSI-formatted submittals close the deal."
        canonicalPath="/"
      />
      <StructuredData data={homepageSchema} />
      <StructuredData data={faqPageSchema} />
      <Header />

      {/* Hero Section */}
      <section className="relative py-20 md:py-32 bg-gradient-to-b from-background to-secondary/20">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <h1 className="text-4xl md:text-6xl font-bold text-foreground leading-tight">
              The only platform that meets architects{' '}
              <span className="text-primary">inside Revit</span>
              {' '}and carries a material from spec to verified submittal.
            </h1>
            <p className="text-xl font-semibold text-muted-foreground max-w-2xl mx-auto">
              Not a directory. A decision engine.
            </p>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              When an element goes over carbon budget, the SWAP Engine surfaces validated alternatives that pass structural, fire, and code checks — then routes an RFQ to suppliers who can actually deliver to your jobsite. The GC-ready submittal is generated automatically.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link href="/rfq/new">
                <Button size="lg" className="text-lg px-8 py-6 bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-[0_0_20px_rgba(159,232,112,0.6)] transition-all duration-300">
                  Submit RFQ →
                </Button>
              </Link>
              <Link href="/tools/revit">
                <Button size="lg" variant="outline" className="text-lg px-8 py-6">
                  Get the Revit Plugin
                </Button>
              </Link>
            </div>
            <div className="pt-2">
              <Link href="/tools/submittal" className="text-sm text-primary hover:underline underline-offset-4 font-medium">
                Generate a Submittal Pack → (free to start)
              </Link>
            </div>
            <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground pt-4">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Free to start
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                No credit card needed
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                5-minute setup
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Built For Strip */}
      <section className="py-6 bg-primary/5 border-b border-border">
        <div className="container">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Built for</p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <span className="px-4 py-1.5 rounded-full border border-primary/30 bg-background text-sm font-medium text-foreground">
                Spec &amp; Design Teams
              </span>
              <span className="px-4 py-1.5 rounded-full border border-primary/30 bg-background text-sm font-medium text-foreground">
                Procurement &amp; Construction
              </span>
              <span className="px-4 py-1.5 rounded-full border border-primary/30 bg-background text-sm font-medium text-foreground">
                Verified Suppliers
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Two-Mode Entry */}
      <section className="py-12 bg-background border-b border-border">
        <div className="container">
          <p className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-8">
            Where do you enter the flow?
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
            <Link href="/tools/revit">
              <div className="group relative rounded-xl border border-primary/40 bg-primary/5 hover:border-primary hover:shadow-md transition-all duration-200 p-6 cursor-pointer text-left h-full">
                <div className="absolute top-3 right-3 text-[10px] font-bold text-primary uppercase tracking-wide bg-primary/10 rounded px-1.5 py-0.5">Primary</div>
                <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center mb-4">
                  <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h3 className="font-semibold text-foreground mb-1">Revit + Forma Plugin</h3>
                <p className="text-sm text-muted-foreground">Element over carbon budget? The SWAP Engine suggests validated alternatives without making you leave Revit. One-click RFQ from inside BIM.</p>
                <p className="text-xs text-primary font-medium mt-3 group-hover:underline">Get the plugin →</p>
              </div>
            </Link>
            <Link href="/rfq/new">
              <div className="group relative rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-md transition-all duration-200 p-6 cursor-pointer text-left h-full">
                <div className="absolute top-3 right-3 text-[10px] font-bold text-emerald-700 uppercase tracking-wide bg-emerald-100 rounded px-1.5 py-0.5">Carbon forecast</div>
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h3 className="font-semibold text-foreground mb-1">Submit RFQ</h3>
                <p className="text-sm text-muted-foreground">See projected kgCO₂e before the RFQ goes out — while you still have a choice. Routes automatically to verified suppliers by material type and jobsite distance.</p>
                <p className="text-xs text-primary font-medium mt-3 group-hover:underline">Submit now →</p>
              </div>
            </Link>
            <Link href="/tools/submittal">
              <div className="group relative rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-md transition-all duration-200 p-6 cursor-pointer text-left h-full">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-foreground mb-1">Generate Submittal Pack</h3>
                <p className="text-sm text-muted-foreground">CSI-formatted submittal with EPD, verification statements, and supplier data — packaged for GC approval. This is the handoff nobody else owns.</p>
                <p className="text-xs text-primary font-medium mt-3 group-hover:underline">Generate now →</p>
              </div>
            </Link>
            <Link href="/tools/tco">
              <div className="group relative rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-md transition-all duration-200 p-6 cursor-pointer text-left h-full">
                <div className="absolute top-3 right-3 text-[10px] font-bold text-blue-700 uppercase tracking-wide bg-blue-100 rounded px-1.5 py-0.5">Asset managers</div>
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-foreground mb-1">25-Year TCO Calculator</h3>
                <p className="text-sm text-muted-foreground">Compare lifecycle costs — maintenance cycles, replacements, energy savings. See payback period and what lower OpEx means for property valuation.</p>
                <p className="text-xs text-primary font-medium mt-3 group-hover:underline">Calculate now →</p>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Trust / Social Proof Bar */}
      <section className="py-10 border-y border-border bg-card/50">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-12">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Trusted by</p>
            <div className="flex flex-wrap items-center justify-center gap-8">
              <div className="flex items-center gap-2 text-muted-foreground">
                <img src="/brand/autodesk-logo-white.png" alt="Autodesk" className="h-5 w-auto opacity-60" />
                <span className="text-xs">Works with Forma Carbon Insights</span>
              </div>
              <div className="text-sm text-muted-foreground font-medium">Building Transparency / EC3</div>
              <div className="text-sm text-muted-foreground font-medium">EPD International</div>
              <a
                href="https://appsource.microsoft.com/en-us/product/web-apps/jeritnorville.greenchainz"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground font-medium hover:text-primary transition-colors"
              >
                Microsoft Marketplace →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Carbon-at-decision-moment callout */}
      <section className="py-16 bg-emerald-950 text-white">
        <div className="container max-w-4xl">
          <div className="flex flex-col md:flex-row items-start gap-10">
            <div className="flex-1">
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-3">
                What nobody else does
              </p>
              <h2 className="text-2xl md:text-3xl font-bold text-white leading-snug mb-4">
                Carbon impact at the procurement decision moment — not after design is locked.
              </h2>
              <p className="text-emerald-100/80 text-base leading-relaxed mb-6">
                Procore, Gravity, and Autodesk's carbon tools show you embodied carbon after the model is signed off. By then the spec is set, the supplier is picked, and changing it costs you a change order.
              </p>
              <p className="text-emerald-100/80 text-base leading-relaxed">
                GreenChainz shows projected kgCO₂e (A1–A3) on the RFQ review screen — before a single purchase order is placed, while the architect still has a choice. EPD-backed figures from your verified supplier database. LEED MR credit context inline. One place. One decision. Done.
              </p>
            </div>
            <div className="flex-shrink-0 w-full md:w-72 rounded-xl border border-emerald-700 bg-emerald-900/60 p-5 space-y-3">
              <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">When you see the number</p>
              <div className="space-y-2.5">
                {[
                  { tool: "Autodesk / Procore", when: "After design is locked", color: "text-red-400" },
                  { tool: "Manual EPD audit", when: "Days after spec is sent", color: "text-amber-400" },
                  { tool: "GreenChainz", when: "Before the RFQ goes out", color: "text-emerald-400" },
                ].map((row) => (
                  <div key={row.tool} className="flex items-center justify-between text-sm">
                    <span className="text-white/70">{row.tool}</span>
                    <span className={`font-semibold ${row.color}`}>{row.when}</span>
                  </div>
                ))}
              </div>
              <div className="pt-2 border-t border-emerald-700">
                <p className="text-xs text-emerald-300/70 leading-relaxed">
                  Earlier = cheaper to fix. Every other tool gives you data. We give you a decision window.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Value Proposition */}
      <section className="py-20 bg-card">
        <div className="container">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-primary uppercase tracking-wide mb-2">
              THE FLOW
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Spec → Swap → RFQ → Submittal. Trust intact at every step.
            </h2>
            <p className="text-lg text-muted-foreground mt-4 max-w-2xl mx-auto">
              Every other tool hands you data and walks away. We carry the material from the moment it's specified to the moment the GC signs off — without losing the verification context along the way.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-8 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Catch It in Revit</h3>
              <p className="text-muted-foreground">
                Forma flags the carbon problem. GreenChainz answers it — validated swap, verified supplier, one-click RFQ — without breaking the architect's workflow. We live where specs get written.
              </p>
            </Card>

            <Card className="p-8 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Swap to Verified</h3>
              <p className="text-muted-foreground">
                The SWAP Engine doesn't show you a catalog. It answers one question: what should I switch to? Alternatives are checked against structural, fire, and code requirements before they're surfaced. Confidence levels are always visible, never hidden.
              </p>
            </Card>

            <Card className="p-8 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Submittal. Done. Liability covered.</h3>
              <p className="text-muted-foreground">
                Architects' #1 fear with sustainable materials: will it fail code review? Every submittal includes UL Listings, ICC-ES reports, and third-party verified EPDs — so reviewers have nothing to reject and you have nothing to defend.
              </p>
            </Card>
          </div>

          <div className="mt-12 text-center">
            <blockquote className="text-xl italic text-muted-foreground max-w-3xl mx-auto">
              "Every other platform gives you data and stops.<br />
              GreenChainz gives you data, the decision, the supplier,<br />
              and the paperwork to close it."
            </blockquote>
          </div>
        </div>
      </section>

      {/* Tools Section */}
      <section className="py-20">
        <div className="container">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-primary uppercase tracking-wide mb-2">
              WHERE WE LIVE
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Inside your tools. Not in a separate tab.
            </h2>
            <p className="text-lg text-muted-foreground mt-4 max-w-2xl mx-auto">
              The decision layer for verified materials — embedded in Revit, Forma, Excel, and your browser. Zero export-then-upload workflows.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Primary moat — spans full width */}
            <Card className="md:col-span-2 p-8 hover:shadow-lg transition-shadow border-primary/40 bg-primary/5">
              <div className="flex flex-col md:flex-row md:items-start gap-6">
                <div className="flex-1">
                  <div className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">Primary Entry Point — Works with Forma Carbon Insights</div>
                  <h3 className="text-2xl font-semibold text-foreground mb-3">Autodesk Forma + Revit Plugin</h3>
                  <p className="text-muted-foreground mb-4">
                    Forma tells you an element is over carbon budget. GreenChainz tells you what to do about it — validated swap, live EPD data, distance-aware RFQ to verified suppliers — all without leaving your BIM environment. Architects specify in Revit. That's where decisions happen. That's where we live.
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-sm">
                      <svg className="w-5 h-5 text-primary flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                      SWAP Engine — verified alternatives with confidence ratings, always visible
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <svg className="w-5 h-5 text-primary flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                      One-click RFQ to verified suppliers — routed by material type and jobsite distance
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <svg className="w-5 h-5 text-primary flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                      LEED v5 MRp2 submittal documentation auto-generated from approved selection
                    </li>
                  </ul>
                </div>
                <div className="md:w-48 flex-shrink-0">
                  <Link href="/tools/revit">
                    <Button className="w-full mb-2">Get the Plugin</Button>
                  </Link>
                  <p className="text-xs text-muted-foreground text-center">Revit 2024+ &amp; Forma</p>
                </div>
              </div>
            </Card>

            <Card className="p-8 hover:shadow-lg transition-shadow">
              <h3 className="text-2xl font-semibold text-foreground mb-4">Submittal Generator</h3>
              <p className="text-muted-foreground mb-4">
                Architects' #1 fear with sustainable materials: will it fail code review or trigger a warranty claim? GreenChainz generates submittals with the documentation that kills that question before it gets asked.
              </p>
              <ul className="space-y-2 mb-4">
                <li className="flex items-center gap-2 text-sm">
                  <svg className="w-5 h-5 text-primary flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                  ICC-ES reports included for all bio-based and alternative materials
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <svg className="w-5 h-5 text-primary flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                  UL Listings verified before submittal generation — not self-declared
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <svg className="w-5 h-5 text-primary flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                  EPDs backed by EPD International + EPD Hub — not manufacturer PDFs
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <svg className="w-5 h-5 text-primary flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                  CSI Form 13.1A format — reviewers have nothing to reject
                </li>
              </ul>
              <Link href="/tools/submittal">
                <Button className="w-full">Generate Submittal Pack</Button>
              </Link>
            </Card>

            <Card className="p-8 hover:shadow-lg transition-shadow">
              <h3 className="text-2xl font-semibold text-foreground mb-4">Excel Audit + Browser Extension</h3>
              <p className="text-muted-foreground mb-6">
                Drop your BOM into Excel — get EPD scores, carbon calculations, and verified alternatives back. Or install the browser extension to overlay hard compliance data on any supplier site and catch greenwashing before it becomes your liability.
              </p>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center gap-2 text-sm">
                  <svg className="w-5 h-5 text-primary flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                  Embodied carbon (kgCO2e) per element, with verified alternatives
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <svg className="w-5 h-5 text-primary flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                  Extension flags self-declared vs. third-party verified EPDs in real time
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <svg className="w-5 h-5 text-primary flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                  Works on any website — no supplier cooperation required
                </li>
              </ul>
              <div className="flex gap-2">
                <Link href="/tools/excel" className="flex-1">
                  <Button className="w-full" variant="outline">Excel Audit</Button>
                </Link>
                <Link href="/tools/extension" className="flex-1">
                  <Button className="w-full" variant="outline">Extension</Button>
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Supplier Vetting Section */}
      <section className="py-16 bg-card border-y border-border">
        <div className="container max-w-4xl">
          <div className="text-center mb-10">
            <p className="text-xs font-bold uppercase tracking-widest text-primary mb-3">
              Who we send your RFQ to
            </p>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground leading-snug mb-3">
              Every supplier is screened before they ever see your project.
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              A sustainable material spec falls apart when the vendor disappears mid-project. Before any supplier receives an RFQ on GreenChainz, we run them through the same checks your procurement team would — so you don't have to.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            <div className="rounded-xl border border-border bg-background p-5">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-foreground mb-1.5">95%+ OTIF Requirement</h3>
              <p className="text-sm text-muted-foreground">
                We track On-Time In-Full delivery rates. Suppliers below 85% are flagged. Below 75% are removed. You see the score on every supplier card — not after you've committed.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-background p-5">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-foreground mb-1.5">Financial Health Check</h3>
              <p className="text-sm text-muted-foreground">
                Altman Z-score financial screening on every verified supplier. No vendors on the edge of insolvency taking your PO and going dark before delivery.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-background p-5">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <h3 className="font-semibold text-foreground mb-1.5">Real-Time Inventory Visibility</h3>
              <p className="text-sm text-muted-foreground">
                Premium suppliers connect live inventory. You know before the RFQ whether they actually have stock — not three days after you sent it and the schedule slipped.
              </p>
            </div>
          </div>
          <div className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-4 text-center">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">The bottom line:</span> a sustainable spec that doesn't survive procurement is just a nice idea. GreenChainz makes sure the supplier can actually deliver it — on time, with the right paperwork, at the right jobsite.
            </p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-primary/5">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl md:text-5xl font-bold text-primary mb-2">50K+</div>
              <div className="text-sm text-muted-foreground">Verified EPDs. Zero Greenwash.</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-bold text-primary mb-2">85%</div>
              <div className="text-sm text-muted-foreground">Admin Time Eliminated</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-bold text-primary mb-2">$0</div>
              <div className="text-sm text-muted-foreground">To Get Started</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-bold text-primary mb-2">24/7</div>
              <div className="text-sm text-muted-foreground">Data Updates</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <p className="text-sm font-semibold text-primary uppercase tracking-wide">
              THE ONLY ONE
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Verified. Inside Revit. Spec to submittal.
            </h2>
            <p className="text-lg text-muted-foreground">
              EC3 gives you data. Mindful Materials gives you a library. GreenChainz gives you a verified supplier who will show up with the right product, the right EPD, and the paperwork to prove it. That's the gap nobody else closes.
            </p>
            <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/rfq/new">
                <Button size="lg" className="text-lg px-8 py-6 bg-primary text-primary-foreground hover:bg-primary/90">
                  Submit Your First RFQ
                </Button>
              </Link>
              <Link href="/tools/revit">
                <Button size="lg" variant="outline" className="text-lg px-8 py-6">
                  Get the Revit Plugin
                </Button>
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">
              Free to start • No credit card required • Live in 5 minutes
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Section — visible content mirrors FAQPage schema for GEO */}
      <section className="py-16 bg-secondary/20">
        <div className="container">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8 text-center">
              Frequently Asked Questions
            </h2>
            <div className="space-y-6">
              <details className="group border border-border rounded-lg p-4 bg-card" open>
                <summary className="font-semibold text-foreground cursor-pointer list-none flex items-center justify-between">
                  What is an EPD and why do project teams need it?
                  <svg className="w-5 h-5 text-muted-foreground group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </summary>
                <p className="mt-3 text-muted-foreground text-sm leading-relaxed">
                  An EPD (Environmental Product Declaration) is a third-party verified document that quantifies the environmental impact of a building material across its entire life cycle. Spec writers, procurement teams, and contractors need EPDs because LEED v5 now makes embodied carbon quantification mandatory for all new construction projects. Without verified EPDs, project teams face compliance failures, audit risks, and potential liability exposure.
                </p>
              </details>

              <details className="group border border-border rounded-lg p-4 bg-card">
                <summary className="font-semibold text-foreground cursor-pointer list-none flex items-center justify-between">
                  How does GreenChainz help teams find and source verified EPDs?
                  <svg className="w-5 h-5 text-muted-foreground group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </summary>
                <p className="mt-3 text-muted-foreground text-sm leading-relaxed">
                  GreenChainz provides instant lookup across 50,000+ verified EPDs directly inside Excel, Revit, and your web browser. Spec writers search by material type, carbon footprint, certification, and compliance requirement. Procurement teams turn selections into structured RFQs in one click. The browser extension overlays compliance data on supplier websites in real time, catching greenwashing claims before they become a liability.
                </p>
              </details>

              <details className="group border border-border rounded-lg p-4 bg-card">
                <summary className="font-semibold text-foreground cursor-pointer list-none flex items-center justify-between">
                  Does GreenChainz support LEED v5 compliance?
                  <svg className="w-5 h-5 text-muted-foreground group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </summary>
                <p className="mt-3 text-muted-foreground text-sm leading-relaxed">
                  Yes. GreenChainz tracks LEED v5, LEED v4.1, Buy Clean California Act, Local Law 97 (NYC), and Title 24 (California). The platform automatically flags materials that meet or fail specific regulatory thresholds and generates compliance documentation for LEED submissions.
                </p>
              </details>

              <details className="group border border-border rounded-lg p-4 bg-card">
                <summary className="font-semibold text-foreground cursor-pointer list-none flex items-center justify-between">
                  What is the Buy Clean Act and how does GreenChainz help?
                  <svg className="w-5 h-5 text-muted-foreground group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </summary>
                <p className="mt-3 text-muted-foreground text-sm leading-relaxed">
                  The Buy Clean Act requires contractors to source building materials that meet maximum allowable Global Warming Potential (GWP) limits verified through facility-specific EPDs. GreenChainz automatically filters materials against Buy Clean thresholds, flags non-compliant products, and connects procurement teams with verified suppliers who meet the requirements.
                </p>
              </details>

              <details className="group border border-border rounded-lg p-4 bg-card">
                <summary className="font-semibold text-foreground cursor-pointer list-none flex items-center justify-between">
                  Is GreenChainz free to use?
                  <svg className="w-5 h-5 text-muted-foreground group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </summary>
                <p className="mt-3 text-muted-foreground text-sm leading-relaxed">
                  Yes, GreenChainz is free to start with no credit card required. Setup takes under 5 minutes. The platform includes EPD lookup, material comparison, and basic RFQ functionality at no cost.
                </p>
              </details>

              <details className="group border border-border rounded-lg p-4 bg-card">
                <summary className="font-semibold text-foreground cursor-pointer list-none flex items-center justify-between">
                  How does the SWAP Engine match suppliers to my project?
                  <svg className="w-5 h-5 text-muted-foreground group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </summary>
                <p className="mt-3 text-muted-foreground text-sm leading-relaxed">
                  The SWAP Engine is GreenChainz's decision-grade matching system. Unlike tools that rank by sustainability score alone, SWAP evaluates every supplier across the full set of criteria that actually drive procurement decisions: spec and code compliance, documentation completeness (EPD depth, HPD, chain-of-custody, submittal readiness), lead time and regional availability, whole-life cost signals, labor productivity, supply chain integrity, and risk defensibility. Sustainability is a weighted dimension inside that scoring — not the objective function. The engine first filters out any supplier that fails a hard gate (wrong category, missing required certification, GWP over threshold, no submittal capability), then ranks the eligible pool. The result is a shortlist of 5–7 options your team can actually approve, source, price, deliver, and defend — with the more sustainable options surfaced where the procurement math supports it.
                </p>
              </details>

              <details className="group border border-border rounded-lg p-4 bg-card">
                <summary className="font-semibold text-foreground cursor-pointer list-none flex items-center justify-between">
                  Does GreenChainz only care about sustainability, or does it understand real procurement constraints?
                  <svg className="w-5 h-5 text-muted-foreground group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </summary>
                <p className="mt-3 text-muted-foreground text-sm leading-relaxed">
                  GreenChainz is built around how procurement actually works — not how sustainability advocates wish it did. The platform scores suppliers across eight dimensions that reflect the real concerns of every role in the building process: spec defensibility for architects and spec writers, whole-life cost and carbon budget compliance for quantity surveyors and asset managers, schedule and labor productivity for GCs and superintendents, total cost of ownership for facility managers, supply chain integrity for CPOs, and sector-specific requirements for healthcare, education, and affordable housing projects. Sustainability is embedded throughout — EPD availability, Buy Clean compliance, Scope 3 disclosure — but it operates as a tiebreaker and differentiator inside realistic procurement logic. The output is not "the greenest supplier." It is "the suppliers that can actually win this specification, ranked by sustainability where the tradeoffs are viable."
                </p>
              </details>

              <details className="group border border-border rounded-lg p-4 bg-card">
                <summary className="font-semibold text-foreground cursor-pointer list-none flex items-center justify-between">
                  How is GreenChainz different from EC3 or One Click LCA?
                  <svg className="w-5 h-5 text-muted-foreground group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </summary>
                <p className="mt-3 text-muted-foreground text-sm leading-relaxed">
                  EC3 and One Click LCA are carbon calculation tools — they tell you the carbon impact of a material but stop there. GreenChainz is the procurement execution layer that turns EPD data into live supplier quotes. Where EC3 ends at data lookup and One Click LCA ends at compliance reporting, GreenChainz continues into automated RFQ generation, greenwashing detection, and direct supplier connection. EC3 is a GreenChainz data partner, and GreenChainz extends into Autodesk Forma and Revit so the full project team — spec writers, procurement, and contractors — can source verified green materials without leaving their existing workflows.
                </p>
              </details>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
