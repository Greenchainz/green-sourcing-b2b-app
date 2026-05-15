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
        title="Where Sustainable Material Deals Get Made — GreenChainz"
        description="GreenChainz connects project teams and verified suppliers — EPD-backed materials, structured RFQs, and compliance documentation for spec writers, procurement, contractors, and suppliers."
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
              Verified green materials are only useful{' '}
              <span className="text-primary">if you can actually source them.</span>
            </h1>
            <p className="text-xl font-semibold text-muted-foreground max-w-2xl mx-auto">
              GreenChainz is where project teams and verified suppliers connect — and actually do business.
            </p>
            <p className="text-sm text-muted-foreground max-w-2xl mx-auto -mt-4">
              Spec writers, procurement teams, and contractors — all in one workflow.
            </p>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              The data exists. The software exists. What's been missing is the workflow — the conversation, the RFQ, the documentation, the deal. That's what we built.
            </p>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Our SWAP Engine catches the project team at the decision moment and surfaces verified alternatives that meet requirements. From there — direct messaging, RFQs, video calls, and a deal. All in one place.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link href="/materials">
                <Button size="lg" className="text-lg px-8 py-6 bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-[0_0_20px_rgba(159,232,112,0.6)] transition-all duration-300">
                  Explore Materials →
                </Button>
              </Link>
              <Link href="/rfq/new">
                <Button size="lg" variant="outline" className="text-lg px-8 py-6">
                  Submit RFQ — No Shopping Required
                </Button>
              </Link>
            </div>
            <div className="pt-2">
              <Link href="/tools/submittal" className="text-sm text-primary hover:underline underline-offset-4 font-medium">
                Generate a Submittal Pack → (the schedule gate, free to start)
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
            How do you want to start?
          </p>
          <div className="grid md:grid-cols-3 gap-4 max-w-4xl mx-auto">
            <Link href="/materials">
              <div className="group relative rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-md transition-all duration-200 p-6 cursor-pointer text-left h-full">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-foreground mb-1">Explore Materials</h3>
                <p className="text-sm text-muted-foreground">Browse verified sustainable products by category, carbon, and compliance. Get spec-ready sheets.</p>
                <p className="text-xs text-primary font-medium mt-3 group-hover:underline">Browse the catalog →</p>
              </div>
            </Link>
            <Link href="/rfq/new">
              <div className="group relative rounded-xl border border-primary/40 bg-primary/5 hover:border-primary hover:shadow-md transition-all duration-200 p-6 cursor-pointer text-left h-full">
                <div className="absolute top-3 right-3 text-[10px] font-bold text-primary uppercase tracking-wide bg-primary/10 rounded px-1.5 py-0.5">Procurement</div>
                <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center mb-4">
                  <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h3 className="font-semibold text-foreground mb-1">Submit RFQ</h3>
                <p className="text-sm text-muted-foreground">Requirements in. Comparable bids out. No back-and-forth — suppliers respond to a structured format.</p>
                <p className="text-xs text-primary font-medium mt-3 group-hover:underline">Skip the browsing →</p>
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
                <p className="text-sm text-muted-foreground">EPD + compliance docs packaged for approval. Work can't proceed without it — make it pass first time.</p>
                <p className="text-xs text-primary font-medium mt-3 group-hover:underline">Generate now →</p>
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

      {/* Value Proposition */}
      <section className="py-20 bg-card">
        <div className="container">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-primary uppercase tracking-wide mb-2">
              HOW IT WORKS
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              From better spec to real deal — all in one workflow.
            </h2>
            <p className="text-lg text-muted-foreground mt-4 max-w-2xl mx-auto">
              Better documentation. Cleaner compliance. Stronger sourcing decisions. GreenChainz gives your team verified EPD data and connects you with the suppliers who can actually deliver.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-8 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Find the Right Material Fast</h3>
              <p className="text-muted-foreground">
                Search verified materials by carbon, certifications, compliance requirements, and location. No more digging through PDFs or chasing down data sheets.
              </p>
            </Card>

            <Card className="p-8 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Send RFQs Without the Back-and-Forth</h3>
              <p className="text-muted-foreground">
                Turn your material selection into a quote request in one click. Suppliers get a clear RFQ. You get responses you can actually compare — price, carbon, documentation, all in one place.
              </p>
            </Card>

            <Card className="p-8 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Connect and Close the Deal</h3>
              <p className="text-muted-foreground">
                Message suppliers directly, jump on a video call, build the relationship. LEED, Title 24, Buy Clean, Local Law 97 — compliance documentation is there when you need it. The deal is what we're here for.
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
              THE SPEED ADVANTAGE
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              The Team That Specs & Sources Faster Wins the Project.
            </h2>
            <p className="text-lg text-muted-foreground">
              Procurement teams drowning in manual RFQs and spec teams waiting days for quotes are bleeding time — and losing projects to teams who move in minutes, not days.
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
