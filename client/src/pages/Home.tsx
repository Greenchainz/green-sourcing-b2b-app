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
        title="EPD Lookup & Sustainable Materials Procurement Software — GreenChainz"
        description="GreenChainz is the B2B procurement platform for architects and contractors delivering instant EPD lookups, automated RFQs, and real-time LEED/Buy Clean/Title 24 compliance — inside Autodesk Forma, Revit, Excel, and your browser."
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
              Forma Carbon Insights{' '}
              <span className="text-primary">Finds the Problem.</span>
              <br />GreenChainz{' '}
              <span className="text-primary">Solves It.</span>
            </h1>
            <p className="text-xl font-semibold text-muted-foreground max-w-2xl mx-auto">
              Autodesk moved every architect into a carbon-aware workflow. GreenChainz is the verified procurement layer they land on next.
            </p>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Forma Carbon Insights tells your team the building is 15% over its embodied carbon target. It doesn't tell you which supplier has the verified lower-carbon alternative, what the EPD says, or how to get a compliant quote. That's us.
            </p>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              EPD-verified materials, one-click RFQs, and LEED-ready submittals — directly inside Autodesk Forma and Revit, before the slow suppliers even know a project exists.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link href="/get-started">
                <Button size="lg" className="text-lg px-8 py-6 bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-[0_0_20px_rgba(159,232,112,0.6)] transition-all duration-300">
                  Get Bulletproof Specs →
                </Button>
              </Link>
              <Link href="/how-it-works">
                <Button size="lg" variant="outline" className="text-lg px-8 py-6">
                  See How It Works
                </Button>
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

      {/* Value Proposition */}
      <section className="py-20 bg-card">
        <div className="container">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-primary uppercase tracking-wide mb-2">
              THE HONEST CALCULUS
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Liability-Free. Code-Compliant. No Excuses.
            </h2>
            <p className="text-lg text-muted-foreground mt-4 max-w-2xl mx-auto">
              You care about both. The planet and the liability exposure. GreenChainz doesn't make you choose. Bulletproof EPD data protects you from toxic tort claims and advances projects worth building. Winning both is the point.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-8 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Kill the Consultant Bill</h3>
              <p className="text-muted-foreground">
                No more $500/hr consultants hunting EPDs. Our AI does the heavy lifting. Your GC doesn't need to know it used to take three days.
              </p>
            </Card>

            <Card className="p-8 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">BIM In. RFQ Out. Done.</h3>
              <p className="text-muted-foreground">
                What used to require a junior PM, two spreadsheets, and a prayer now takes minutes. Instant EPD lookups, automated RFQs, one-click submittals.
              </p>
            </Card>

            <Card className="p-8 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Compliance Is a Weapon. Wield It.</h3>
              <p className="text-muted-foreground">
                Local Law 97. Title 24. LEED v5. Buy Clean. We track every moving target so you show up to every bid with bulletproof data.
              </p>
            </Card>
          </div>

          <div className="mt-12 text-center">
            <blockquote className="text-xl italic text-muted-foreground max-w-3xl mx-auto">
              "The architect who specs faster wins the project.<br />
              The supplier who responds fastest wins the bid.<br />
              Everyone else goes home."
            </blockquote>
          </div>
        </div>
      </section>

      {/* Tools Section */}
      <section className="py-20">
        <div className="container">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-primary uppercase tracking-wide mb-2">
              THE ARSENAL
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Four Ways to Outmaneuver Legacy Procurement.
            </h2>
            <p className="text-lg text-muted-foreground mt-4 max-w-2xl mx-auto">
              No bloated ERP. No begging for quotes. Just compliance data injected directly into the tools you already use.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <Card className="p-8 hover:shadow-lg transition-shadow">
              <h3 className="text-2xl font-semibold text-foreground mb-4">Excel Audit</h3>
              <p className="text-muted-foreground mb-6">
                Drop your BOM. Get weaponized compliance data—EPD scores, carbon calculations, code-ready alternatives—without leaving Excel.
              </p>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center gap-2 text-sm">
                  <svg className="w-5 h-5 text-primary flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Embodied carbon (kgCO2e)
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <svg className="w-5 h-5 text-primary flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Health hazard detection
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <svg className="w-5 h-5 text-primary flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  One-click alternatives
                </li>
              </ul>
              <Link href="/tools/excel">
                <Button className="w-full">Extract Assembly Data</Button>
              </Link>
            </Card>

            <Card className="p-8 hover:shadow-lg transition-shadow">
              <h3 className="text-2xl font-semibold text-foreground mb-4">Browser Extension</h3>
              <p className="text-muted-foreground mb-6">
                We overlay hard compliance data directly on supplier sites. Catch greenwashing claims before they become your liability.
              </p>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center gap-2 text-sm">
                  <svg className="w-5 h-5 text-primary flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Real-time EPD lookups
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <svg className="w-5 h-5 text-primary flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Price + carbon comparison
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <svg className="w-5 h-5 text-primary flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Works on any website
                </li>
              </ul>
              <Link href="/tools/extension">
                <Button className="w-full">Deploy the Extension</Button>
              </Link>
            </Card>

            <Card className="p-8 hover:shadow-lg transition-shadow border-primary/30 bg-primary/5">
              <div className="text-xs font-semibold text-primary uppercase tracking-wide mb-3">Works with Forma Carbon Insights</div>
              <h3 className="text-2xl font-semibold text-foreground mb-4">Autodesk Forma + Revit</h3>
              <p className="text-muted-foreground mb-6">
                Forma Carbon Insights tells you the building is over its carbon target. GreenChainz shows you the verified lower-carbon alternative and connects you to the supplier — without leaving Forma.
              </p>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center gap-2 text-sm">
                  <svg className="w-5 h-5 text-primary flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Forma Extension — verified swaps for high-carbon elements
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <svg className="w-5 h-5 text-primary flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Revit Plugin — live compliance scanning &amp; bulk swaps
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <svg className="w-5 h-5 text-primary flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  One-click RFQ to verified suppliers — from inside your BIM
                </li>
              </ul>
              <Link href="/tools/revit">
                <Button className="w-full">See the Integration</Button>
              </Link>
            </Card>

            <Card className="p-8 hover:shadow-lg transition-shadow">
              <h3 className="text-2xl font-semibold text-foreground mb-4">Submittal Generator</h3>
              <p className="text-muted-foreground mb-6">
                Feed it a spec. It generates a complete LEED submittal package with EPD-backed products. Reviewers get nothing to reject.
              </p>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center gap-2 text-sm">
                  <svg className="w-5 h-5 text-primary flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  AI spec extraction
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <svg className="w-5 h-5 text-primary flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Auto product matching
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <svg className="w-5 h-5 text-primary flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Ready-to-send PDFs
                </li>
              </ul>
              <Link href="/tools/submittal">
                <Button className="w-full">Force the Submittal</Button>
              </Link>
            </Card>
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
              THE SPEC ADVANTAGE
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              The Architect Who Specs Faster Wins the Project.
            </h2>
            <p className="text-lg text-muted-foreground">
              Procurement teams drowning in manual RFQs and architects waiting days for quotes are bleeding time and projects to competitors who've already switched. In five minutes, not five days.
            </p>
            <div className="pt-4">
              <Link href="/get-started">
                <Button size="lg" className="text-lg px-8 py-6 bg-primary text-primary-foreground hover:bg-primary/90">
                  Run a Free Compliance Check
                </Button>
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">
              No credit card required • Live in 5 minutes • Cancel anytime
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
                  What is an EPD and why do architects need it?
                  <svg className="w-5 h-5 text-muted-foreground group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </summary>
                <p className="mt-3 text-muted-foreground text-sm leading-relaxed">
                  An EPD (Environmental Product Declaration) is a third-party verified document that quantifies the environmental impact of a building material across its entire life cycle. Architects need EPDs because LEED v5 now makes embodied carbon quantification mandatory for all new construction projects. Without verified EPDs, architects face compliance failures, audit risks, and potential liability exposure.
                </p>
              </details>

              <details className="group border border-border rounded-lg p-4 bg-card">
                <summary className="font-semibold text-foreground cursor-pointer list-none flex items-center justify-between">
                  How does GreenChainz help architects find verified EPDs?
                  <svg className="w-5 h-5 text-muted-foreground group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </summary>
                <p className="mt-3 text-muted-foreground text-sm leading-relaxed">
                  GreenChainz provides instant lookup across 50,000+ verified EPDs directly inside Excel, Revit, and your web browser. Search by material type, carbon footprint, certification, and compliance requirement. The browser extension also overlays compliance data on supplier websites in real time, catching greenwashing claims before they become a liability.
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
                  How is GreenChainz different from EC3 or One Click LCA?
                  <svg className="w-5 h-5 text-muted-foreground group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </summary>
                <p className="mt-3 text-muted-foreground text-sm leading-relaxed">
                  EC3 and One Click LCA are carbon calculation tools — they tell you the carbon impact of a material but stop there. GreenChainz is the procurement execution layer that turns EPD data into live supplier quotes. Where EC3 ends at data lookup and One Click LCA ends at compliance reporting, GreenChainz continues into automated RFQ generation, greenwashing detection, and direct supplier connection. EC3 is a GreenChainz data partner, and GreenChainz extends into Autodesk Forma and Revit so architects can source verified green materials without leaving their BIM workflow.
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
