import { Link } from 'wouter';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Download,
  CheckCircle2,
  Layers,
  RefreshCw,
  BarChart3,
  Target,
  FileSpreadsheet,
  Link2,
  ExternalLink,
} from 'lucide-react';

// ── UPDATE THIS when the Autodesk App Store listing is live ──────────────────
const DOWNLOAD_URL = "https://apps.autodesk.com/RVT/en/Detail/Index?id=greenchainz"; // TODO: replace with real App Store URL
const GITHUB_REPO_URL = "https://github.com/Greenchainz/greenchainz-revit-plugin";
// ─────────────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Layers,
    title: 'Element-Level Carbon',
    description: 'Select any wall, floor, or beam. See its embodied carbon instantly in the Revit properties panel — no switching tabs.',
  },
  {
    icon: RefreshCw,
    title: 'One-Click Material Swaps',
    description: 'Replace materials with verified greener alternatives from the GreenChainz catalog without touching geometry or schedules.',
  },
  {
    icon: BarChart3,
    title: 'Live LEED v4.1 Tracker',
    description: 'Real-time MR credit progress dashboard as you design. Know your score before the submittal.',
  },
  {
    icon: Target,
    title: 'Carbon Budget Alerts',
    description: 'Set GWP targets per building phase. Get in-model alerts the moment you exceed them.',
  },
  {
    icon: FileSpreadsheet,
    title: 'EPD Export Schedules',
    description: 'Generate material schedules with EPD data, CCPS scores, and direct supplier contact info in one click.',
  },
  {
    icon: Link2,
    title: 'Live GreenChainz Sync',
    description: 'Your material library stays in sync across Revit, Excel, and the GreenChainz web app automatically.',
  },
];

const STEPS = [
  {
    step: '01',
    title: 'Install the Plugin',
    description: 'Download from the Autodesk App Store. Compatible with Revit 2021–2025. No IT ticket needed — installs in under 2 minutes.',
  },
  {
    step: '02',
    title: 'Select Any Element',
    description: 'Click a wall, floor, or structural element. The panel queries its material properties and matches to live EPD data from our catalog.',
  },
  {
    step: '03',
    title: 'Optimize & Export',
    description: 'Swap materials, track LEED credits, and export schedules with full verified sustainability data ready for submittal.',
  },
];

export default function RevitPlugin() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Hero */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.85_0.15_145)] via-[oklch(0.75_0.12_145)] to-[oklch(0.65_0.14_145)] opacity-10" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,oklch(0.80_0.20_145_/_0.3),transparent_50%)]" />

        <div className="container relative z-10">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="inline-block px-4 py-2 rounded-full bg-primary/10 border border-primary/30 backdrop-blur-sm">
                <span className="text-sm font-semibold text-primary">Revit Plugin</span>
              </div>
              <Badge className="bg-green-100 text-green-800 border-green-200">
                Available Now
              </Badge>
            </div>

            <h1 className="text-4xl md:text-6xl font-bold text-foreground leading-tight">
              Sustainable BIM{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[oklch(0.85_0.15_145)] to-[oklch(0.65_0.14_145)]">
                Without Leaving Revit
              </span>
            </h1>

            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Select any element. Get instant carbon calculations, verified EPD data, and LEED credit tracking — all inside Revit 2021–2025.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <a href={DOWNLOAD_URL} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="w-full text-lg px-8 py-6 bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-[0_0_20px_rgba(159,232,112,0.6)] transition-all duration-300 gap-2"
                >
                  <Download className="w-5 h-5" />
                  Download Free — Autodesk App Store
                </Button>
              </a>
              <a href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full text-lg px-8 py-6 gap-2"
                >
                  <ExternalLink className="w-5 h-5" />
                  View on GitHub
                </Button>
              </a>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground pt-2">
              {['Revit 2021–2025', 'Free to install', 'No IT ticket needed', 'Autodesk SDA Partner'].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background to-secondary/20" />
        <div className="container relative z-10">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Carbon is Just Another Parameter
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              The first Revit plugin that treats GWP the same way Revit treats area, volume, and cost.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {FEATURES.map((feature) => {
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
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-secondary/30">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-foreground mb-12">
              Up and Running in 3 Steps
            </h2>

            <div className="space-y-6">
              {STEPS.map((item, index) => (
                <div
                  key={index}
                  className="flex items-start gap-6 p-6 rounded-xl bg-card/60 backdrop-blur-md border border-border/50 hover:shadow-lg transition-all duration-300"
                >
                  <div className="flex-shrink-0 w-14 h-14 rounded-full bg-gradient-to-br from-primary to-[oklch(0.55_0.16_145)] flex items-center justify-center text-xl font-bold text-primary-foreground">
                    {item.step}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-1">{item.title}</h3>
                    <p className="text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.85_0.15_145_/_0.1)] to-[oklch(0.65_0.14_145_/_0.1)]" />
        <div className="container relative z-10">
          <div className="max-w-2xl mx-auto text-center space-y-6">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Ready to Specify Smarter?
            </h2>
            <p className="text-lg text-muted-foreground">
              Free install. Works inside the Revit versions you already have.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href={DOWNLOAD_URL} target="_blank" rel="noopener noreferrer">
                <Button
                  size="lg"
                  className="text-lg px-10 py-6 bg-primary text-primary-foreground hover:bg-primary/90 gap-2 hover:shadow-[0_0_20px_rgba(159,232,112,0.6)] transition-all duration-300"
                >
                  <Download className="w-5 h-5" />
                  Download Now
                </Button>
              </a>
              <Link href="/catalog">
                <Button size="lg" variant="outline" className="text-lg px-10 py-6">
                  Browse the Catalog
                </Button>
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">
              Questions?{' '}
              <Link href="/support" className="text-primary hover:underline">
                Contact support
              </Link>
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
