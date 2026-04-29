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
    title: 'Automated RFQ System — BOM Drop to Instant Quotes',
    slug: 'rfq-automation',
    description:
      'Drop your Bill of Materials (BOM) and get compliance-ready supplier quotes without leaving Excel. No more manual RFQs, no more 3-day wait for callbacks. AI-powered validation ensures completeness before submission.',
    highlights: [
      'Upload BOM from Excel — instant RFQ generation',
      'AI-powered completeness validation',
      'Automatic CSI MasterFormat categorization',
      'Multi-material RFQ support with compliance flags',
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
    title: 'Regulatory Compliance Tracking',
    slug: 'compliance-tracking',
    description:
      'Track compliance across every moving regulatory target: LEED v5, Buy Clean California Act, Local Law 97 (NYC), Title 24 (California), and more. Automatic alerts when regulations change or materials fall out of compliance.',
    highlights: [
      'LEED v5 mandatory embodied carbon (MRp2) tracking',
      'Buy Clean Act GWP threshold monitoring',
      'Local Law 97 building emissions compliance',
      'Title 24 California energy code alignment',
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
];

export default function Features() {
  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead
        title="Features — GreenChainz | EPD Lookup, RFQ Automation, Autodesk Forma Extension, Revit Plugin"
        description="GreenChainz features: 100,000+ EPD lookup via EC3, automated RFQ from Excel BOMs, Autodesk Forma Extension, Revit Plugin, Chrome greenwashing detection, Carbon Compare, Material Credit Scores, LEED v5/Buy Clean compliance, and AI Audit Agent."
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
              The Arsenal
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Autodesk moved the audience into the room. GreenChainz is the booth — verified procurement for every carbon problem Forma Carbon Insights surfaces.
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
