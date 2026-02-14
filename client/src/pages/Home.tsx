import { Link } from 'wouter';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Hero Section */}
      <section className="relative py-20 md:py-32 bg-gradient-to-b from-background to-secondary/20">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <h1 className="text-4xl md:text-6xl font-bold text-foreground leading-tight">
              Where Being Green{' '}
              <span className="text-primary">Has Never Been So Easy</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Save money. Save the planet. Same workflow.
            </p>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              We plug AI-powered sustainability tools directly into Excel, Revit, and your browser—so you can stay compliant without changing how you work.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link href="/get-started">
                <Button size="lg" className="text-lg px-8 py-6 bg-primary text-primary-foreground hover:bg-primary/90">
                  Start Saving Today →
                </Button>
              </Link>
              <Link href="/about">
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

      {/* Value Proposition */}
      <section className="py-20 bg-card">
        <div className="container">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-primary uppercase tracking-wide mb-2">
              DOLLARS & SENSE
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Green Makes Cents
            </h2>
            <p className="text-lg text-muted-foreground mt-4 max-w-2xl mx-auto">
              Sustainability isn't a luxury—it's a competitive advantage. We make it affordable, accessible, and automatic.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-8 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Cut Compliance Costs</h3>
              <p className="text-muted-foreground">
                No more expensive consultants. No manual data entry. Our AI does the heavy lifting—so your budget stays green too.
              </p>
            </Card>

            <Card className="p-8 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Save Hours Every Week</h3>
              <p className="text-muted-foreground">
                What used to take days now takes minutes. Instant EPD lookups, automated audits, and one-click submittals.
              </p>
            </Card>

            <Card className="p-8 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Stay Ahead of Regulations</h3>
              <p className="text-muted-foreground">
                LEED, Buy Clean, and beyond—we track the rules so you don't have to. Future-proof your projects today.
              </p>
            </Card>
          </div>

          <div className="mt-12 text-center">
            <blockquote className="text-xl italic text-muted-foreground max-w-3xl mx-auto">
              "Every dollar saved is a tree planted.<br />
              Every minute saved is a forest grown."
            </blockquote>
          </div>
        </div>
      </section>

      {/* Tools Section */}
      <section className="py-20">
        <div className="container">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-primary uppercase tracking-wide mb-2">
              YOUR GREEN TOOLKIT
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Pick Your Tool. Keep Your Workflow.
            </h2>
            <p className="text-lg text-muted-foreground mt-4 max-w-2xl mx-auto">
              No new software to learn. We integrate directly into the tools you already use—Excel, Revit, Chrome.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <Card className="p-8 hover:shadow-lg transition-shadow">
              <h3 className="text-2xl font-semibold text-foreground mb-4">Excel Audit</h3>
              <p className="text-muted-foreground mb-6">
                Upload your BOM. Get instant carbon scores, health grades, and greener alternatives—all without leaving Excel.
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
                <Button className="w-full">Launch Audit</Button>
              </Link>
            </Card>

            <Card className="p-8 hover:shadow-lg transition-shadow">
              <h3 className="text-2xl font-semibold text-foreground mb-4">Browser Extension</h3>
              <p className="text-muted-foreground mb-6">
                Shopping for materials online? We overlay sustainability data on any supplier site—instantly.
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
                <Button className="w-full">Get Extension</Button>
              </Link>
            </Card>

            <Card className="p-8 hover:shadow-lg transition-shadow">
              <h3 className="text-2xl font-semibold text-foreground mb-4">Revit Plugin</h3>
              <p className="text-muted-foreground mb-6">
                The "spellchecker" for LEED. Scan your model in real-time and catch compliance issues before they cost you.
              </p>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center gap-2 text-sm">
                  <svg className="w-5 h-5 text-primary flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Live model scanning
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <svg className="w-5 h-5 text-primary flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  LEED point tracking
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <svg className="w-5 h-5 text-primary flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Bulk material swaps
                </li>
              </ul>
              <Link href="/tools/revit">
                <Button className="w-full">Download Plugin</Button>
              </Link>
            </Card>

            <Card className="p-8 hover:shadow-lg transition-shadow">
              <h3 className="text-2xl font-semibold text-foreground mb-4">Submittal Generator</h3>
              <p className="text-muted-foreground mb-6">
                Drop in a spec PDF. Get a complete submittal package with EPD-backed products—in minutes, not days.
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
                <Button className="w-full">Try It Now</Button>
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
              <div className="text-sm text-muted-foreground">EPD Products</div>
            </div>
            <div>
              <div className="text-4xl md:text-5xl font-bold text-primary mb-2">85%</div>
              <div className="text-sm text-muted-foreground">Time Saved</div>
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
              START TODAY
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Ready to Make Green Easy?
            </h2>
            <p className="text-lg text-muted-foreground">
              Join the teams who've stopped wrestling with spreadsheets and started winning green building projects.
            </p>
            <div className="pt-4">
              <Link href="/get-started">
                <Button size="lg" className="text-lg px-8 py-6 bg-primary text-primary-foreground hover:bg-primary/90">
                  Get Started Free
                </Button>
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">
              No credit card required • Setup in 5 minutes • Cancel anytime
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
