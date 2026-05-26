import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SEOHead from '@/components/SEOHead';
import {
  Search,
  FileText,
  Globe,
  Box,
  BarChart3,
  Shield,
  Zap,
  Bot,
  Scale,
  Truck,
  TrendingDown,
  ShieldCheck,
  ScanLine,
} from 'lucide-react';

const features = [
  {
    icon: Search,
    title: 'EPD Lookup — 50,000+ Verified EPDs',
    slug: 'epd-lookup',
    description:
      'Instant search across 50,000+ verified Environmental Product Declarations from Building Transparency EC3 and other sources. Filter by material type, carbon footprint, certifications (LEED, WELL, Living Building Challenge), price range, and supplier location.',
    highlights: [
      'Real-time data from Building Transparency EC3',
      'Carbon footprint comparison across materials',
      'Certification verification (LEED, WELL, LBC, Declare)',
      'Facility-specific vs. industry-wide EPD identification',
    ],
  },
  {
    icon: FileText,
    title: 'RFQ Automation — Carbon Impact Before You Commit',
    slug: 'rfq-automation',
    description:
      'Every other carbon tool shows you the impact after design is locked. GreenChainz shows it at the procurement decision moment — before the RFQ goes out, while you still have a choice. Projected kgCO2e (A1–A3) is calculated live from EPD-backed supplier data and displayed on the review screen so architects can spec lower-carbon materials in the same workflow, not a separate audit.',
    highlights: [
      'Live carbon forecast (kgCO2e A1–A3) at RFQ review — before any PO is placed',
      'EPD-backed GWP data from your verified supplier database, EC3 benchmark fallback',
      'LEED MR credit context surfaced per material category, inline',
      'AI parses spec PDFs → matches EPD-verified suppliers automatically',
      'CSI Form 13.1A-compliant submittal generated with every approved RFQ',
    ],
  },
  {
    icon: Truck,
    title: 'Supplier Vetting — No Vendor Goes Dark Mid-Project',
    slug: 'supplier-vetting',
    description:
      'A sustainable spec that falls apart at procurement is just a nice idea. Before any supplier receives an RFQ through GreenChainz, we screen them for delivery reliability, financial health, and inventory readiness — so you\'re not the one chasing them three days before a pour. OTIF rate, lead time variance, and Altman Z-score financial health are visible on every supplier card before you commit.',
    highlights: [
      '95%+ OTIF (On-Time In-Full) required — flagged below 85%, removed below 75%',
      'Altman Z-score financial screening — no vendors on the edge of insolvency',
      'Average lead time + variance shown upfront — set realistic schedules',
      'Real-time inventory visibility for premium suppliers — know before you ask',
      'All vetting data re-checked quarterly by the GreenChainz AI Audit Agent',
    ],
  },
  {
    icon: Globe,
    title: 'Browser Extension — Real-Time Greenwashing Detection',
    slug: 'browser-extension',
    description:
      'The GreenChainz Chrome extension overlays hard compliance data directly on supplier websites as you browse. Catch greenwashing claims, expired EPDs, and unverified environmental statements before they become your liability.',
    highlights: [
      'Overlays compliance data on any supplier website',
      'Flags self-declared vs. third-party verified EPDs',
      'Detects expired or mismatched certifications',
      'One-click add to RFQ cart from any product page',
    ],
  },
  {
    icon: Box,
    title: 'Autodesk Forma Extension + Revit Plugin',
    slug: 'revit-plugin',
    description:
      'Forma Carbon Insights tells your team the building is over its embodied carbon target. It stops there. GreenChainz picks up exactly where it leaves off — surfacing verified lower-carbon alternatives, live EPD data, and supplier RFQs directly inside Forma and Revit. Autodesk built the analysis. We built the solution.',
    highlights: [
      'Works alongside Forma Carbon Insights — procurement layer for every high-carbon flag',
      'Forma Extension — verified material swaps at the earliest design stage',
      'Revit Plugin — live compliance scanning with instant swap suggestions',
      'One-click RFQ to verified suppliers without leaving your BIM workflow',
      'LEED v5 MRp2 documentation generated automatically',
    ],
  },
  {
    icon: BarChart3,
    title: 'Carbon Compare — Side-by-Side Material Analysis',
    slug: 'carbon-compare',
    description:
      'Compare materials head-to-head on carbon footprint, cost, compliance status, and certification coverage. See exactly how each option impacts your project carbon budget and LEED credit eligibility.',
    highlights: [
      'Carbon vs. price trade-off visualization',
      'LEED credit impact analysis per material',
      'Project carbon budget tracking',
      'Export comparison reports for stakeholders',
    ],
  },
  {
    icon: Scale,
    title: 'Material Credit Score — Procurement Decision Metric',
    slug: 'material-credit-score',
    description:
      'A composite metric that aggregates EPD data, compliance status, carbon performance, and certification coverage into a single decision-ready score. Like a credit score for building materials — making procurement decisions quantifiable.',
    highlights: [
      'Single score combining EPD + compliance + carbon data',
      'Sortable and filterable across entire materials database',
      'Transparent methodology — see what drives each score',
      'Benchmark against category averages',
    ],
  },
  {
    icon: Shield,
    title: 'Liability-Proof Compliance Tracking',
    slug: 'compliance-tracking',
    description:
      "Architects reject sustainable alternatives for one reason: liability. If the material fails code review or triggers a warranty claim, it's on them. GreenChainz removes that risk — ICC-ES reports, UL Listings, and third-party verified EPDs are confirmed before any submittal is generated. Every credential is defensive documentation, not just an environmental badge.",
    highlights: [
      'ICC-ES reports on file for bio-based and alternative materials — code review ready',
      'UL Listings verified before submittal generation — not self-declared by manufacturers',
      'EPDs backed by EPD International + EPD Hub — third-party verified, not manufacturer PDFs',
      'LEED v5 MRp2, Buy Clean Act GWP thresholds (BCCA + 5 states), Local Law 97, Title 24 — all tracked automatically',
    ],
  },
  {
    icon: Zap,
    title: 'Assemblies Builder',
    slug: 'assemblies',
    description:
      'Build and manage material assemblies with full compliance data inherited from individual components. See the aggregate carbon footprint, certification status, and regulatory compliance of complete wall systems, floor assemblies, and more.',
    highlights: [
      'Drag-and-drop assembly composition',
      'Aggregate carbon and compliance roll-up',
      'Save and reuse assemblies across projects',
      'Export assembly specs with EPD documentation',
    ],
  },
  {
    icon: TrendingDown,
    title: '25-Year TCO Calculator — OpEx to Property Value',
    slug: 'tco-calculator',
    description:
      'Asset managers and ownership groups need one number: how does this material decision affect the building\'s value? The GreenChainz TCO calculator takes installation cost, maintenance cycles, replacement frequency, and energy savings and produces a 25-year lifecycle cost comparison with payback period. The NOI bridge converts annual OpEx savings directly into property valuation impact at any cap rate — the language ownership actually speaks.',
    highlights: [
      'Side-by-side 25-year cumulative cost chart — standard vs. sustainable',
      'Payback period with year-by-year crossover visualization',
      'Configurable cap rate → lower OpEx = higher property valuation',
      'Maintenance cycle, replacement lifespan, and energy savings all modeled',
      'One-click RFQ to the verified supplier from the results screen',
    ],
  },
  {
    icon: Bot,
    title: 'AI Audit Agent',
    slug: 'ai-audit-agent',
    description:
      'GPT-4o powered sustainability compliance auditing. Upload project specs and get an automated audit of material compliance, EPD coverage gaps, and carbon reduction opportunities — cutting audit time by up to 85%.',
    highlights: [
      'Automated spec review against LEED / Buy Clean / LL97',
      'EPD coverage gap identification',
      'Carbon reduction opportunity scoring',
      'Audit report generation for stakeholder review',
    ],
  },
  {
    icon: ShieldCheck,
    title: 'Buy Clean California Act Compliance — Built Into Every Swap',
    slug: 'bcca-compliance',
    description:
      "California's Buy Clean Act sets hard GWP limits for structural steel, rebar, flat glass, and mineral wool on public projects — and similar laws are live in Colorado, Oregon, Washington, Minnesota, and New Mexico. GreenChainz hard-codes every BCCA threshold directly into the Swap Engine. When you search for an alternative, every candidate is immediately flagged as compliant, non-compliant, or a compliance upgrade over what you currently have specified. No spreadsheet. No manual lookup. The legal limit is built into the recommendation.",
    highlights: [
      'Hard-coded GWP limits for all 5 BCCA-eligible material categories (updated April 2026)',
      'Every swap candidate shows compliance status, GWP margin, and % headroom vs. threshold',
      '"Upgrades compliance" flag surfaces swaps that fix a non-compliant spec in one click',
      'Mineral wool functional-unit comparison flagged automatically — no silent false positives',
      'Covers Buy Clean laws in CA, CO, OR, WA, MN, NM — expanding as new states pass',
    ],
  },
  {
    icon: ScanLine,
    title: 'EPD Auto-Fill — Upload Once, Profile Done',
    slug: 'epd-auto-fill',
    description:
      "Suppliers have EPDs. They hate re-keying them into every platform they join. GreenChainz eliminates that entirely. Upload your EPD or product datasheet PDF — Azure Document Intelligence reads it, GPT-4o structures it, and your profile is pre-filled: GWP values, certifications, EPD number, program operator, validity dates, recycled content, and facility location. You review, adjust if needed, and save. The average supplier goes from zero to verified profile in under three minutes.",
    highlights: [
      'Drag-and-drop EPD, product sheet, or certification PDF — any format accepted',
      'AI extracts GWP A1–A3, GWP A1–C4, EPD number, program, validity dates automatically',
      'Certifications (FSC, GreenGuard, Declare, HPD, Cradle to Cradle) detected and pre-checked',
      'Recycled content percentage and facility location pulled from document text',
      'Confidence score shown per extraction — HIGH / MEDIUM / LOW — so you know what to verify',
    ],
  },
];

export default function Features() {
  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead
        title="Features — GreenChainz | BCCA Compliance, EPD Auto-Fill, SWAP Engine, Revit Plugin"
        description="GreenChainz features: Buy Clean California Act compliance built into every material swap, EPD PDF auto-fill for suppliers, SWAP Engine inside Revit and Forma, distance-aware RFQ routing, blockchain-verified EPDs, and CSI MasterFormat submittal generation."
        canonicalPath="/features"
      />
      <Header />

      {/* Hero */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-background to-secondary/20">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium text-primary mb-2">
              <img src="/brand/autodesk-logo-white.png" alt="Autodesk" className="h-4 w-auto opacity-80" />
              Works with Forma Carbon Insights — the missing procurement layer
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground">
              Spec → Swap → RFQ → Submittal
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Each feature reinforces one thing: a verified decision engine that meets architects inside Revit and carries a material all the way to GC sign-off. Nothing here is a standalone tool. It's a chain.
            </p>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16">
        <div className="container">
          <div className="max-w-5xl mx-auto space-y-12">
            {features.map((feature, index) => (
              <Card
                key={feature.slug}
                id={feature.slug}
                className="p-6 md:p-8 border-border"
              >
                <div className={`flex flex-col md:flex-row gap-6 ${index % 2 === 1 ? 'md:flex-row-reverse' : ''}`}>
                  <div className="shrink-0 flex items-start">
                    <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                      <feature.icon className="w-7 h-7 text-primary" />
                    </div>
                  </div>
                  <div className="flex-1 space-y-3">
                    <h2 className="text-xl md:text-2xl font-bold text-foreground">
                      {feature.title}
                    </h2>
                    <p className="text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                      {feature.highlights.map((h, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <span className="text-primary mt-1 shrink-0">•</span>
                          {h}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-16 bg-secondary/20">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center space-y-4">
            <h2 className="text-2xl font-bold text-foreground">Ready to weaponize your specs?</h2>
            <p className="text-muted-foreground">
              Free to start. No credit card required. Live in 5 minutes.
            </p>
            <div className="flex items-center justify-center gap-4 pt-2">
              <Link href="/get-started">
                <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90">
                  Get Started Free
                </Button>
              </Link>
              <Link href="/pricing">
                <Button variant="outline" size="lg">View Pricing</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
