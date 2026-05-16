// client/src/pages/RevitPlugin.tsx
import { Link } from 'wouter';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import SEOHead from '../components/SEOHead';
import {
  Download,
  CheckCircle2,
  Layers,
  RefreshCw,
  FileText,
  Zap,
  Search,
  BarChart3,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';

const DOWNLOAD_URL = "https://github.com/Greenchainz/greenchainz-revit-plugin/releases/latest";
const FORMA_INSTALL_URL = "https://apps.autodesk.com/FORMA/en/Detail/Index?id=greenchainz";

const REVIT_FEATURES = [
  {
    icon: Layers,
    title: 'SWAP Engine — Element-Level',
    description: 'Select any wall, floor, or structural member. The SWAP Engine queries its material properties against 50K+ verified EPDs and surfaces lower-carbon alternatives with matching certifications — without touching geometry.',
  },
  {
    icon: RefreshCw,
    title: 'Distance-Aware RFQ',
    description: 'One click routes an RFQ to suppliers who can actually reach your jobsite. Concrete, masonry, and heavy materials route to local verified suppliers. Lightweight materials route nationally. No manual filtering.',
  },
  {
    icon: FileText,
    title: 'CSI Submittal — Auto-Generated',
    description: 'After the swap is confirmed, GreenChainz generates the CSI MasterFormat submittal automatically — EPD documentation, verification statements, supplier data. Ready for GC sign-off without a separate assembly step.',
  },
  {
    icon: BarChart3,
    title: 'Live LEED v5 Tracker',
    description: 'Real-time MRp2 credit progress as you design. Know your mandatory embodied carbon compliance status before the submittal — not after it.',
  },
  {
    icon: Zap,
    title: 'Carbon Budget Alerts',
    description: 'Set GWP targets per building phase. In-model alerts the moment you exceed them — at the decision point, not in the audit.',
  },
  {
    icon: FileText,
    title: 'EPD Export Schedules',
    description: 'Generate material schedules with full EPD data, Material Credit Scores, and supplier contact info in one click. Formatted for submittal without reformatting.',
  },
];

const FORMA_FEATURES = [
  {
    icon: Zap,
    title: 'Interceptor Callout',
    description: 'Select any element. When GreenChainz detects a high-carbon material with a verified lower-carbon swap, the Interceptor fires immediately — citing compliance data, not just carbon numbers. One click to RFQ.',
  },
  {
    icon: Search,
    title: 'Material Search in the Left Panel',
    description: 'Search 100K+ verified EPDs by keyword or category without leaving Forma. Filter by GWP ceiling and minimum Material Credit Score. Add to RFQ from the search result.',
  },
  {
    icon: RefreshCw,
    title: 'SWAP Engine — Conceptual Stage',
    description: 'Greener alternatives surface inside Forma at the earliest design stage — before geometry is locked, before RFQ happens, before you\'ve committed to a material at all.',
  },
  {
    icon: BarChart3,
    title: 'Project Scan',
    description: 'Scan the full Forma model for high-carbon elements. Get a prioritized list of swap opportunities ranked by carbon impact — the highest-leverage decisions first.',
  },
];

const REVIT_STEPS = [
  {
    step: '01',
    title: 'Install from Autodesk App Store',
    description: 'Compatible with Revit 2021–2026. No IT ticket. Installs in under 2 minutes.',
  },
  {
    step: '02',
    title: 'Select Any Element',
    description: 'Click a wall, floor, column, or beam. The SWAP Engine queries its material properties and matches to live EPD data from EC3 and EPD International.',
  },
  {
    step: '03',
    title: 'Swap, RFQ, Submittal',
    description: 'Confirm the greener material. GreenChainz routes an RFQ to the closest verified supplier and generates the CSI MasterFormat submittal. Done.',
  },
];

const FORMA_STEPS = [
  {
    step: '01',
    title: 'Install from Autodesk App Store',
    description: 'The GreenChainz extension adds a left search panel and right analysis panel inside Forma. No additional setup.',
  },
  {
    step: '02',
    title: 'Select Any Element in Forma',
    description: 'The right panel detects the material, pulls verified EPD data, and fires the Interceptor callout if a better-performing swap exists.',
  },
  {
    step: '03',
    title: 'RFQ at the Earliest Stage',
    description: 'One click opens the RFQ flow inside Forma — routing to a verified supplier before the design is even finalized.',
  },
];

export default function RevitPlugin() {
  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead
        title="Revit Plugin + Forma Extension — GreenChainz SWAP Engine Inside Autodesk"
        description="GreenChainz lives inside Revit and Autodesk Forma. Select an element, get verified swap suggestions, route a distance-aware RFQ, and generate the CSI submittal automatically."
        canonicalPath="/tools/revit"
      />
      <Header />

      {/* Hero */}
      <section className="relative py-20 md:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.85_0.15_145)] via-[oklch(0.75_0.12_145)] to-[oklch(0.65_0.14_145)] opacity-10" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,oklch(0.80_0.20_145_/_0.3),transparent_50%)]" />

        <div className="container relative z-10">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="inline-block px-4 py-2 rounded-full bg-primary/10 border border-primary/30 backdrop-blur-sm">
                <span className="text-sm font-semibold text-primary">Autodesk SDA Partner</span>
              </div>
              <Badge className="bg-green-100 text-green-800 border-green-200">
                Available Now
              </Badge>
            </div>

            <h1 className="text-4xl md:text-6xl font-bold text-foreground leading-tight">
              The SWAP Engine lives{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[oklch(0.85_0.15_145)] to-[oklch(0.65_0.14_145)]">
                inside your BIM tool.
              </span>
            </h1>

            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Select an element in Revit or Forma. GreenChainz surfaces a verified lower-carbon swap, routes an RFQ to suppliers who can reach your jobsite, and generates the CSI submittal — without switching tabs.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <a href={DOWNLOAD_URL} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="w-full text-lg px-8 py-6 bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-[0_0_20px_rgba(159,232,112,0.6)] transition-all duration-300 gap-2"
                >
                  <Download className="w-5 h-5" />
                  Get the Revit Plugin
                </Button>
              </a>
              <a href={FORMA_INSTALL_URL} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full text-lg px-8 py-6 gap-2"
                >
                  <ExternalLink className="w-5 h-5" />
                  Get the Forma Extension
                </Button>
              </a>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground pt-2">
              {['Revit 2021–2026', 'Autodesk Forma', 'Free to install', 'Autodesk SDA Partner'].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How Forma Carbon Insights and GreenChainz connect */}
      <section className="py-12 bg-secondary/30">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <Card className="p-6 md:p-8 border-primary/20 bg-primary/5">
              <div className="flex flex-col md:flex-row gap-6 items-start">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <ArrowRight className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-primary mb-1">How GreenChainz and Forma Carbon Insights work together</p>
                  <p className="text-foreground font-medium mb-2">
                    Forma Carbon Insights tells you the building is over its embodied carbon target. It stops there.
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    GreenChainz picks up exactly where it leaves off — surfacing verified lower-carbon alternatives, routing RFQs to suppliers who can deliver to your jobsite, and generating the CSI submittal. Autodesk built the analysis layer. We built the procurement layer that acts on it.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* ── REVIT PLUGIN SECTION ──────────────────────────────────────────── */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background to-secondary/20" />
        <div className="container relative z-10">

          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-4 mb-4">
              <div className="inline-block px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-xs font-semibold text-primary">
                Revit Plugin
              </div>
              <Badge variant="secondary">Desktop BIM · Revit 2021–2026</Badge>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Element-level swaps. Distance-aware RFQ. Submittal included.
            </h2>
            <p className="text-lg text-muted-foreground mb-12 max-w-3xl">
              The Revit plugin is the full procurement layer. Select any element — GreenChainz identifies its material, surfaces verified alternatives, routes an RFQ to the closest supplier who can actually deliver, and generates the CSI MasterFormat submittal automatically.
            </p>

            <div className="grid md:grid-cols-3 gap-6 mb-16">
              {REVIT_FEATURES.map((feature) => {
                const Icon = feature.icon;
                return (
                  <Card
                    key={feature.title}
                    className="p-6 bg-card/60 backdrop-blur-md border-border/50 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors duration-300">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                  </Card>
                );
              })}
            </div>

            {/* Revit steps */}
            <h3 className="text-2xl font-bold text-foreground mb-6">Up and running in 3 steps</h3>
            <div className="space-y-4 mb-8">
              {REVIT_STEPS.map((item, index) => (
                <div
                  key={index}
                  className="flex items-start gap-6 p-6 rounded-xl bg-card/60 backdrop-blur-md border border-border/50 hover:shadow-lg transition-all duration-300"
                >
                  <div className="flex-shrink-0 w-14 h-14 rounded-full bg-gradient-to-br from-primary to-[oklch(0.55_0.16_145)] flex items-center justify-center text-xl font-bold text-primary-foreground">
                    {item.step}
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-foreground mb-1">{item.title}</h4>
                    <p className="text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <a href={DOWNLOAD_URL} target="_blank" rel="noopener noreferrer">
              <Button
                size="lg"
                className="text-lg px-10 py-6 bg-primary text-primary-foreground hover:bg-primary/90 gap-2 hover:shadow-[0_0_20px_rgba(159,232,112,0.6)] transition-all duration-300"
              >
                <Download className="w-5 h-5" />
                Download Revit Plugin — Free
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* ── FORMA EXTENSION SECTION ───────────────────────────────────────── */}
      <section className="py-20 bg-secondary/30 relative overflow-hidden">
        <div className="container relative z-10">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-4 mb-4">
              <div className="inline-block px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-xs font-semibold text-primary">
                Forma Extension
              </div>
              <Badge variant="secondary">Autodesk Forma · Web-Based</Badge>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Catch it at the earliest design stage.
            </h2>
            <p className="text-lg text-muted-foreground mb-12 max-w-3xl">
              The Forma extension brings the SWAP Engine into conceptual design — before geometry is locked, before the spec is written. Select any element and the Interceptor fires immediately: what to switch to, why it's compliant, and one click to RFQ.
            </p>

            {/* Interceptor callout */}
            <Card className="p-6 md:p-8 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 mb-12">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-green-700" />
                </div>
                <div>
                  <p className="text-xs font-bold text-green-700 uppercase tracking-wide mb-1">The Interceptor</p>
                  <p className="font-semibold text-foreground mb-2">
                    Select a high-carbon element. GreenChainz fires immediately.
                  </p>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    When GreenChainz detects a material above the carbon threshold with a verified lower-carbon swap available, the Interceptor callout surfaces in the right panel — with the carbon delta, compliance certifications, and an RFQ button. Not a suggestion. An action.
                  </p>
                </div>
              </div>
            </Card>

            <div className="grid md:grid-cols-2 gap-6 mb-16">
              {FORMA_FEATURES.map((feature) => {
                const Icon = feature.icon;
                return (
                  <Card
                    key={feature.title}
                    className="p-6 bg-card/60 backdrop-blur-md border-border/50 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors duration-300">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                  </Card>
                );
              })}
            </div>

            {/* Forma steps */}
            <h3 className="text-2xl font-bold text-foreground mb-6">Up and running in 3 steps</h3>
            <div className="space-y-4 mb-8">
              {FORMA_STEPS.map((item, index) => (
                <div
                  key={index}
                  className="flex items-start gap-6 p-6 rounded-xl bg-card/60 backdrop-blur-md border border-border/50 hover:shadow-lg transition-all duration-300"
                >
                  <div className="flex-shrink-0 w-14 h-14 rounded-full bg-gradient-to-br from-primary to-[oklch(0.55_0.16_145)] flex items-center justify-center text-xl font-bold text-primary-foreground">
                    {item.step}
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-foreground mb-1">{item.title}</h4>
                    <p className="text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <a href={FORMA_INSTALL_URL} target="_blank" rel="noopener noreferrer">
              <Button
                size="lg"
                variant="outline"
                className="text-lg px-10 py-6 gap-2 border-primary/30 hover:bg-primary/5"
              >
                <ExternalLink className="w-5 h-5" />
                Install the Forma Extension — Free
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.85_0.15_145_/_0.1)] to-[oklch(0.65_0.14_145_/_0.1)]" />
        <div className="container relative z-10">
          <div className="max-w-2xl mx-auto text-center space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Spec to submittal. Inside Revit.
            </h2>
            <p className="text-lg text-muted-foreground">
              Free to install. Works inside the Revit versions and Forma projects you already have.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href={DOWNLOAD_URL} target="_blank" rel="noopener noreferrer">
                <Button
                  size="lg"
                  className="text-lg px-10 py-6 bg-primary text-primary-foreground hover:bg-primary/90 gap-2 hover:shadow-[0_0_20px_rgba(159,232,112,0.6)] transition-all duration-300"
                >
                  <Download className="w-5 h-5" />
                  Get the Revit Plugin
                </Button>
              </a>
              <Link href="/rfq">
                <Button size="lg" variant="outline" className="text-lg px-10 py-6">
                  Submit Your First RFQ
                </Button>
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">
              Questions?{' '}
              <Link href="/contact" className="text-primary hover:underline">
                Talk to Jerit
              </Link>
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
