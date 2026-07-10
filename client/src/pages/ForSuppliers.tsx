// client/src/pages/ForSuppliers.tsx
//
// Public supplier acquisition / ROI landing page.
//
// Purpose: convert a cold supplier (manufacturer, fabricator, distributor) into
// a registered, verified GreenChainz supplier. This is the top of the platform's
// single revenue lane — a verified supplier winning a spec they otherwise would
// not have won.
//
// Honesty rule: this page makes NO invented performance claims. Marketplace
// numbers are framed explicitly as founding-pilot goals, and the ROI figures
// come from the interactive calculator driven by the supplier's own inputs.

import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SEOHead from '@/components/SEOHead';
import { SupplierROICalculator } from '@/components/SupplierROICalculator';
import {
  ArrowRight,
  MapPin,
  FileCheck2,
  Zap,
  ShieldCheck,
  Search,
  Upload,
  Target,
  Clock,
  Eye,
  CheckCircle2,
  Leaf,
} from 'lucide-react';

// ── CTAs (all real destinations — no placeholders) ─────────────────────────────
const REGISTER_PATH = '/supplier/register';
const DEMO_MAILTO =
  'mailto:founder@greenchainz.com?subject=GreenChainz%20supplier%20walkthrough&body=Hi%20Jerit%2C%20I%27d%20like%20a%2020-minute%20walkthrough%20of%20how%20GreenChainz%20routes%20low-carbon%20RFQs%20to%20suppliers.';

const FOUNDING_TOTAL = 50; // founding supplier cohort size (matches Pricing page)

// ── Content ─────────────────────────────────────────────────────────────────
const PAINS = [
  {
    icon: Eye,
    title: 'You find out after the spec is written',
    body: 'By the time an RFQ hits your inbox, the material is already chosen. You are quoting to lose — competing on price for a spec you never had a chance to shape.',
  },
  {
    icon: FileCheck2,
    title: 'Your EPDs are trapped in PDFs',
    body: 'Your environmental data lives in documents no architect can compare against a competitor. Great sustainability performance you can not prove in the moment of decision is invisible.',
  },
  {
    icon: Clock,
    title: 'You waste hours qualifying dead leads',
    body: 'Cold directory inquiries and RFPs outside your delivery radius eat your team’s time. Most never had a real chance of converting.',
  },
];

const VALUE = [
  {
    icon: MapPin,
    title: 'Qualified RFQs, not cold leads',
    body: 'Distance-aware routing only sends you RFQs you can actually deliver to. Every request is a project with a real material need in your service area.',
  },
  {
    icon: Upload,
    title: 'Upload one EPD — we do the rest',
    body: 'Drop in your EPD or product datasheet PDF. Azure Document Intelligence + GPT-4o read it and pre-fill your profile: GWP, certifications, EPD number, program operator, validity, recycled content, and facility location. Verified profile in minutes, not weeks.',
  },
  {
    icon: Zap,
    title: 'Get specified inside Revit',
    body: 'When an architect’s design element goes over carbon budget, the SWAP Engine surfaces validated alternatives that pass structural, fire, and code checks. A verified product is how you become the alternative that gets specified.',
  },
  {
    icon: ShieldCheck,
    title: 'Ranked on carbon and compliance — not ad spend',
    body: 'You do not buy your way to the top. Verified EPD performance and compliance readiness decide ranking, so a genuinely lower-carbon product wins the placement.',
  },
];

const STEPS = [
  {
    n: '1',
    icon: ShieldCheck,
    title: 'Register and get verified',
    body: 'Create your supplier account and claim your company profile. Verification is what makes architects trust — and specify — your products.',
  },
  {
    n: '2',
    icon: Upload,
    title: 'Upload your EPDs',
    body: 'We parse them automatically into structured, comparable data. No re-keying the same numbers into yet another portal.',
  },
  {
    n: '3',
    icon: Target,
    title: 'Receive matched RFQs and quote',
    body: 'Qualified requests land in your dashboard. Respond fast, win specs, and track your pipeline — all in one place.',
  },
];

export default function ForSuppliers() {
  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead
        title="For Suppliers — Win Low-Carbon Building Specs | GreenChainz"
        description="GreenChainz routes qualified, distance-aware RFQs to verified sustainable-material suppliers and gets your products specified inside Revit. Upload one EPD, get a verified profile in minutes, and win the low-carbon specs you’re invisible to today."
        canonicalPath="/for-suppliers"
      />
      <Header />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative py-20 md:py-28 bg-gradient-to-b from-background to-secondary/20">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center space-y-7">
            <Badge variant="outline" className="border-primary/40 text-primary">
              <Leaf className="w-3.5 h-3.5 mr-1.5" />
              For manufacturers, fabricators &amp; distributors
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold text-foreground leading-tight">
              Win the low-carbon specs you&rsquo;re{' '}
              <span className="text-primary">invisible to</span> today.
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
              Architects decide which materials go into a building long before an RFQ goes out.
              GreenChainz puts your verified products in front of them at that moment — then routes
              qualified, deliverable RFQs straight to you.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <Link href={REGISTER_PATH}>
                <Button
                  size="lg"
                  className="text-lg px-8 py-6 bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-[0_0_20px_rgba(159,232,112,0.6)] transition-all duration-300"
                >
                  Claim a founding supplier slot
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <a href={DEMO_MAILTO}>
                <Button size="lg" variant="outline" className="text-lg px-8 py-6">
                  Book a 20-min walkthrough
                </Button>
              </a>
            </div>
            <p className="text-sm text-muted-foreground pt-1">
              Founding cohort limited to {FOUNDING_TOTAL} suppliers &middot; Free through the pilot &middot; No credit card
            </p>
          </div>
        </div>
      </section>

      {/* ── Problem framing ──────────────────────────────────────────────── */}
      <section className="py-16 md:py-20 border-t border-border">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Why great sustainable suppliers still lose
            </h2>
            <p className="text-muted-foreground mt-3">
              It is rarely the product. It is the timing, the data, and the noise.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {PAINS.map(({ icon: Icon, title, body }) => (
              <Card key={title} className="p-6 space-y-3">
                <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-destructive" />
                </div>
                <h3 className="font-semibold text-foreground">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Value props ──────────────────────────────────────────────────── */}
      <section className="py-16 md:py-20 bg-secondary/20 border-t border-border">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              What GreenChainz does for your sales team
            </h2>
            <p className="text-muted-foreground mt-3">
              Not another directory listing. A decision engine that puts you in front of the spec.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {VALUE.map(({ icon: Icon, title, body }) => (
              <Card key={title} className="p-6 flex gap-4">
                <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-semibold text-foreground">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── ROI model ────────────────────────────────────────────────────── */}
      <section className="py-16 md:py-20 border-t border-border">
        <div className="container">
          <div className="max-w-5xl mx-auto">
            <div className="max-w-2xl mb-8">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                Model your return
              </h2>
              <p className="text-muted-foreground mt-3">
                Plug in your own numbers. One won order at a typical building-materials
                order size pays back the subscription many times over. These figures are a
                model driven by your inputs — not a guarantee.
              </p>
            </div>
            <SupplierROICalculator />
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section className="py-16 md:py-20 bg-secondary/20 border-t border-border">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Live in three steps
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {STEPS.map(({ n, icon: Icon, title, body }) => (
              <Card key={n} className="p-6 space-y-3 relative">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">
                    {n}
                  </span>
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Founding pilot / honesty framing ─────────────────────────────── */}
      <section className="py-16 md:py-20 border-t border-border">
        <div className="container">
          <Card className="max-w-4xl mx-auto p-8 border-primary/30 bg-primary/5">
            <div className="flex items-start gap-4">
              <Search className="w-6 h-6 text-primary shrink-0 mt-1" />
              <div className="space-y-3">
                <h2 className="text-2xl font-bold text-foreground">
                  Straight talk: we&rsquo;re building the founding cohort now
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  GreenChainz is onboarding its first {FOUNDING_TOTAL} suppliers. We are not going to
                  quote you inflated lead volumes we have not proven yet. Instead, founding suppliers
                  get in free through the pilot, help shape how RFQ matching works, and lock in
                  priority placement as buyer demand grows.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  Our model is simple and honest: <span className="text-foreground font-medium">architects
                  use the platform free, and we only win when you win a spec you otherwise would not have.</span>{' '}
                  That is the entire business.
                </p>
                <div className="flex flex-wrap gap-x-6 gap-y-2 pt-1">
                  {['Free through the pilot', 'Priority placement locked in', 'Shape the roadmap'].map((t) => (
                    <span key={t} className="inline-flex items-center gap-1.5 text-sm text-foreground">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────────── */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-secondary/20 to-background border-t border-border">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h2 className="text-3xl md:text-5xl font-bold text-foreground">
              Stop quoting to lose. Start getting specified.
            </h2>
            <p className="text-lg text-muted-foreground">
              Claim one of {FOUNDING_TOTAL} founding supplier slots and get your verified products in
              front of architects at the moment of decision.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <Link href={REGISTER_PATH}>
                <Button
                  size="lg"
                  className="text-lg px-8 py-6 bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-[0_0_20px_rgba(159,232,112,0.6)] transition-all duration-300"
                >
                  Claim a founding supplier slot
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <a href={DEMO_MAILTO}>
                <Button size="lg" variant="outline" className="text-lg px-8 py-6">
                  Book a 20-min walkthrough
                </Button>
              </a>
            </div>
            <p className="text-sm text-muted-foreground">
              Questions? Email{' '}
              <a href="mailto:founder@greenchainz.com" className="text-primary hover:underline underline-offset-4">
                founder@greenchainz.com
              </a>
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
