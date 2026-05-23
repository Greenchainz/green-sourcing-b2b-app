// client/src/pages/Pricing.tsx
//
// Pricing page — aligned with actual Microsoft AppSource transactable plans.
// Plan IDs: greenchainz-free ($0), greenchainz-standard ($99/mo), greenchainz-premium ($299/mo)
// Primary purchase rail: Microsoft AppSource (enterprise Azure spend drawdown)

import { useState, useMemo } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SEOHead from '@/components/SEOHead';
import {
  Check,
  X,
  TrendingUp,
  Clock,
  AlertTriangle,
  ChevronRight,
  Zap,
  Shield,
  Star,
  ExternalLink,
  Building2,
  MessageSquare,
  Video,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Config ────────────────────────────────────────────────────────────────────

const APPSOURCE_URL =
  'https://appsource.microsoft.com/en-us/product/web-apps/jeritnorville.greenchainz';

const FOUNDING_SLOTS_CLAIMED = 12;
const FOUNDING_TOTAL = 50;
const FOUNDING_DEADLINE = new Date('2026-06-01');
const CSRD_DEADLINE = new Date('2027-01-01');

function daysUntil(d: Date) {
  return Math.max(0, Math.ceil((d.getTime() - Date.now()) / 86_400_000));
}

// ── Plans ─────────────────────────────────────────────────────────────────────

const PLANS = [
  {
    id: 'greenchainz-free',
    name: 'Free',
    tagline: 'For architects. Forever.',
    price: '$0',
    period: '',
    note: 'No credit card. No expiry.',
    description:
      'Every core tool an architect needs to spec, verify, and submit sustainable materials — including the Revit plugin, SWAP Engine, and full EPD database.',
    cta: 'Get Started Free',
    ctaLink: '/get-started',
    ctaExternal: false,
    highlight: false,
    badge: null as string | null,
    features: [
      'Unlimited EPD lookups — 50,000+ verified EPDs (EC3 + EPD International)',
      'Unlimited RFQ generation and tracking',
      'Revit plugin + Autodesk Forma extension',
      'SWAP Engine — lower-carbon alternatives, inside Revit',
      'Submittal Generator — CSI Form 13.1A auto-fill',
      'Excel BOM Audit — carbon footprint on any BOM',
      'Carbon forecast at RFQ review (A1–A3 before PO)',
      'Material Credit Scores + side-by-side carbon compare',
      'LEED v5, Buy Clean, Local Law 97, Title 24 flags',
    ],
    blocked: [
      'Direct messaging with suppliers',
      'Video calls with suppliers',
      'Priority RFQ matching',
      'SWAP Engine — supplier inclusion',
    ],
  },
  {
    id: 'greenchainz-standard',
    name: 'Standard',
    tagline: 'Priority access. Direct line.',
    price: '$99',
    period: '/month',
    note: '$1,188/yr · 14-day free trial · cancel anytime',
    description:
      'Unlocks two-way communication between architects and verified suppliers, priority RFQ routing, and SWAP Engine inclusion for manufacturers — the channel where specs get won.',
    cta: 'Buy on Microsoft AppSource',
    ctaLink: APPSOURCE_URL,
    ctaExternal: true,
    highlight: true,
    badge: 'Most Popular',
    features: [
      'Everything in Free, plus:',
      'Priority RFQ matching — your materials surface first',
      'SWAP Engine inclusion — surface when architects spec your category',
      'Direct messaging with architects/suppliers (50/month)',
      'Video calls with buyers (10 hrs/month)',
      'Supplier Verified badge on your profile',
      'Advanced analytics — views, searches, RFQ impressions',
      'Unlimited materials + EPD document hosting',
      'Email support (24-hr response)',
    ],
    blocked: [
      'Unlimited messaging',
      'Video HD recording & group calls',
    ],
  },
  {
    id: 'greenchainz-premium',
    name: 'Premium',
    tagline: 'Unlimited. Enterprise-grade.',
    price: '$299',
    period: '/month',
    note: '$3,588/yr · includes everything',
    description:
      'For manufacturers and large AEC firms who need unlimited communication, API access, AI-powered EPD audit, and the dedicated support SLA that procurement teams require.',
    cta: 'Buy on Microsoft AppSource',
    ctaLink: APPSOURCE_URL,
    ctaExternal: true,
    highlight: false,
    badge: 'For Manufacturers & Enterprise AEC',
    features: [
      'Everything in Standard, plus:',
      'Unlimited direct messaging',
      'Video calls (50 hrs/month) with HD recording',
      'Group video calls — pitch multiple buyers at once',
      'AI Audit Agent — automated EPD validation & gap detection',
      'API access — integrate RFQs with your ERP or CRM',
      'Multi-user team management',
      'Advanced export — compliance reports, carbon summaries',
      'Priority support (4-hr SLA)',
    ],
    blocked: [],
  },
] as const;

// ── Competitor comparison ─────────────────────────────────────────────────────

const COMPARE_ROWS = [
  { feature: 'Carbon data at RFQ decision moment (before PO)', gc: true,  procore: false, ec3: false, manual: false },
  { feature: 'Supplier OTIF + Altman Z-score financial vetting', gc: true,  procore: false, ec3: false, manual: false },
  { feature: 'Works inside Revit + Autodesk Forma', gc: true,  procore: false, ec3: false, manual: false },
  { feature: 'ICC-ES + UL Listings in every submittal', gc: true,  procore: false, ec3: false, manual: false },
  { feature: 'CSI Form 13.1A auto-generated', gc: true,  procore: false, ec3: false, manual: false },
  { feature: 'EPD verified by EPD International / EPD Hub', gc: true,  procore: 'partial', ec3: true,  manual: false },
  { feature: '25-year TCO + NOI impact calculator', gc: true,  procore: false, ec3: false, manual: false },
  { feature: 'Distance-aware RFQ routing', gc: true,  procore: false, ec3: false, manual: false },
  { feature: 'Transactable via Microsoft AppSource', gc: true,  procore: false, ec3: false, manual: false },
  { feature: 'Free for architects (core tools)', gc: true,  procore: false, ec3: true,  manual: true  },
];

// ── ROI Calculator ────────────────────────────────────────────────────────────

function SupplierROICalculator() {
  const [plan, setPlan] = useState<'standard' | 'premium'>('standard');
  const [avgOrder, setAvgOrder] = useState('50000');
  const [monthlyRfqs, setMonthlyRfqs] = useState('8');
  const [convRate, setConvRate] = useState('12');

  const annualSub = plan === 'standard' ? 99 * 12 : 299 * 12;
  const txFee = 3;

  const result = useMemo(() => {
    const order = Number(avgOrder) || 0;
    const rfqs  = Number(monthlyRfqs) || 0;
    const conv  = (Number(convRate) || 0) / 100;
    const monthlyWins = rfqs * conv;
    const annualWins  = monthlyWins * 12;
    const annualRev   = annualWins * order;
    const annualTxFees = annualRev * (txFee / 100);
    const totalCost    = annualSub + annualTxFees;
    const roi          = totalCost > 0 ? annualRev / totalCost : 0;
    return { annualWins, annualRev, annualTxFees, totalCost, roi };
  }, [avgOrder, monthlyRfqs, convRate, annualSub]);

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <TrendingUp className="w-4 h-4 text-primary" />
        <p className="text-sm font-semibold text-foreground">Supplier ROI Calculator</p>
        <div className="ml-auto flex gap-1">
          {(['standard', 'premium'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPlan(p)}
              className={cn(
                'text-[11px] font-medium px-2.5 py-1 rounded border transition-colors capitalize',
                plan === p
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:border-primary/40'
              )}
            >
              {p === 'standard' ? 'Standard $99/mo' : 'Premium $299/mo'}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Avg order size ($)</Label>
          <Input type="number" value={avgOrder} onChange={e => setAvgOrder(e.target.value)} className="h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">RFQs / month</Label>
          <Input type="number" value={monthlyRfqs} onChange={e => setMonthlyRfqs(e.target.value)} className="h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Conversion rate (%)</Label>
          <Input type="number" value={convRate} onChange={e => setConvRate(e.target.value)} className="h-8 text-sm" />
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
        {[
          { label: 'Annual orders won', value: result.annualWins.toFixed(1) },
          { label: 'Annual revenue', value: fmt(result.annualRev) },
          { label: 'Total platform cost', value: fmt(result.totalCost) },
          { label: 'Expected ROI', value: `${result.roi.toFixed(0)}x`, highlight: true },
        ].map(({ label, value, highlight }) => (
          <div key={label} className={`rounded-lg p-3 text-center ${highlight ? 'bg-primary text-primary-foreground' : 'bg-background border border-border'}`}>
            <p className={`text-lg font-bold ${highlight ? '' : 'text-foreground'}`}>{value}</p>
            <p className={`text-[10px] mt-0.5 ${highlight ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>{label}</p>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground">
        Based on {convRate}% conversion of {monthlyRfqs} monthly inbound RFQs at ${Number(avgOrder).toLocaleString()} avg order.
        Platform cost = ${annualSub.toLocaleString()}/yr subscription + {txFee}% transaction fee on won orders.
        Industry avg conversion for verified B2B suppliers: 10–15%.
      </p>
    </div>
  );
}

// ── Plan card ─────────────────────────────────────────────────────────────────

function PlanCard({ plan }: { plan: typeof PLANS[number] }) {
  return (
    <Card
      className={cn(
        'p-6 flex flex-col relative',
        plan.highlight
          ? 'border-primary shadow-lg shadow-primary/10 ring-1 ring-primary/20'
          : 'border-border',
      )}
    >
      {plan.highlight && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded-full whitespace-nowrap">
          ★ Best Value
        </div>
      )}
      {plan.badge && !plan.highlight && (
        <Badge className="self-start mb-2 text-[10px] bg-secondary text-secondary-foreground border-border">
          {plan.badge}
        </Badge>
      )}

      <div className="mb-4">
        <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
        <p className="text-xs font-semibold text-primary uppercase tracking-wide mt-0.5">{plan.tagline}</p>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-3xl font-bold">{plan.price}</span>
          {plan.period && <span className="text-sm text-muted-foreground">{plan.period}</span>}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{plan.note}</p>
        <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
      </div>

      <ul className="space-y-2 mb-6 flex-1">
        {plan.features.map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <span className={cn(
              i === 0 && f.startsWith('Everything') ? 'font-medium text-foreground' : 'text-muted-foreground'
            )}>
              {f}
            </span>
          </li>
        ))}
        {plan.blocked.map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-sm opacity-35">
            <X className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="text-muted-foreground">{f}</span>
          </li>
        ))}
      </ul>

      {plan.ctaExternal ? (
        <a href={plan.ctaLink} target="_blank" rel="noopener noreferrer">
          <Button className="w-full gap-1.5" size="lg" variant={plan.highlight ? 'default' : 'outline'}>
            {plan.cta}
            <ExternalLink className="w-3.5 h-3.5" />
          </Button>
        </a>
      ) : (
        <Link href={plan.ctaLink}>
          <Button className="w-full" size="lg" variant="outline">
            {plan.cta}
          </Button>
        </Link>
      )}
      {plan.ctaExternal && (
        <p className="text-[10px] text-muted-foreground text-center mt-2 flex items-center justify-center gap-1">
          <img src="/brand/microsoft-logo.svg" alt="Microsoft" className="h-3 w-auto opacity-60" />
          Transacts through Microsoft Marketplace
        </p>
      )}
      {plan.name === 'Standard' && (
        <p className="text-[10px] text-muted-foreground text-center mt-1">14-day free trial · no credit card</p>
      )}
    </Card>
  );
}

// ── Comparison table ──────────────────────────────────────────────────────────

function CompareTable() {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/50">
            <th className="text-left p-3 font-semibold text-foreground w-1/2">Feature</th>
            <th className="text-center p-3 font-semibold text-primary">GreenChainz</th>
            <th className="text-center p-3 font-semibold text-muted-foreground">Procore + Gravity</th>
            <th className="text-center p-3 font-semibold text-muted-foreground">EC3 Only</th>
            <th className="text-center p-3 font-semibold text-muted-foreground">Manual</th>
          </tr>
        </thead>
        <tbody>
          {COMPARE_ROWS.map((row, i) => (
            <tr key={row.feature} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
              <td className="p-3 text-muted-foreground">{row.feature}</td>
              {[row.gc, row.procore, row.ec3, row.manual].map((val, j) => (
                <td key={j} className="p-3 text-center">
                  {val === true  && <Check className="w-4 h-4 text-primary mx-auto" />}
                  {val === false && <X className="w-4 h-4 text-muted-foreground/40 mx-auto" />}
                  {val === 'partial' && <span className="text-xs text-amber-600 font-medium">Partial</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Pricing() {
  const [showCompare, setShowCompare] = useState(false);

  const slotsLeft = FOUNDING_TOTAL - FOUNDING_SLOTS_CLAIMED;
  const daysToDeadline = daysUntil(FOUNDING_DEADLINE);
  const daysToCSRD = daysUntil(CSRD_DEADLINE);

  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead
        title="Pricing — GreenChainz | Free for Architects · $99/mo Standard · $299/mo Premium"
        description="GreenChainz is free for architects. Standard ($99/mo) and Premium ($299/mo) unlock priority RFQ matching, SWAP Engine inclusion, and supplier-architect communication — transactable through Microsoft AppSource."
        canonicalPath="/pricing"
      />
      <Header />

      {/* Hero */}
      <section className="py-14 md:py-20 bg-gradient-to-b from-background to-secondary/20 border-b border-border">
        <div className="container max-w-4xl text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground">
            Free for architects.<br />
            <span className="text-primary">$99/mo pays for itself</span> in one RFQ.
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            73% of B2B buyers search digitally first. If you're not in the carbon calculator when an architect specs your category, you don't exist to them. Standard changes that.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-5 text-sm text-muted-foreground pt-1">
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-primary" /> Architects free forever</span>
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-primary" /> 14-day free trial on paid plans</span>
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-primary" /> Cancel anytime</span>
            <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-primary" /> Transacts via Microsoft AppSource</span>
          </div>
        </div>
      </section>

      {/* Regulatory urgency ticker */}
      <div className="bg-amber-950 text-amber-100 py-2.5">
        <div className="container flex flex-col sm:flex-row items-center justify-center gap-4 text-xs font-medium">
          <span className="flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            CSRD Compliance Deadline: Jan 1, 2027 —
            <strong className="text-amber-300">{daysToCSRD} days</strong>
            — EPD verification backlogs already 6+ months
          </span>
          <span className="hidden sm:block text-amber-700">|</span>
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            EU Green Claims Directive finalizing Q4 2026
          </span>
        </div>
      </div>

      {/* Microsoft AppSource callout */}
      <section className="py-6 border-b border-border bg-muted/20">
        <div className="container max-w-4xl">
          <div className="rounded-xl border border-border bg-card p-4 flex flex-col sm:flex-row items-center gap-4 text-sm">
            <div className="flex items-center gap-3 shrink-0">
              <img src="/brand/microsoft-logo.svg" alt="Microsoft" className="h-5 w-auto opacity-80" />
              <span className="font-semibold text-foreground">Available on Microsoft AppSource</span>
            </div>
            <div className="flex-1 text-muted-foreground text-xs leading-relaxed">
              GreenChainz is a transactable SaaS app on the Microsoft Marketplace.
              Enterprise buyers can draw down existing Azure spend commitments — no new PO, no new vendor approval process.
              Microsoft handles billing, tax compliance, and invoicing in 140+ markets.
            </div>
            <a
              href={APPSOURCE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0"
            >
              <Button variant="outline" size="sm" className="gap-1.5 whitespace-nowrap">
                View on AppSource
                <ExternalLink className="w-3 h-3" />
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Founding 50 banner */}
      <section className="py-4 bg-primary/5 border-b border-primary/20">
        <div className="container max-w-4xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Star className="w-5 h-5 text-primary shrink-0" />
              <div>
                <p className="font-bold text-foreground flex items-center gap-2 text-sm">
                  Founding Supplier Program
                  <Badge className="bg-primary text-primary-foreground text-[10px]">
                    {slotsLeft} of {FOUNDING_TOTAL} slots remaining
                  </Badge>
                </p>
                <p className="text-xs text-muted-foreground">
                  Lock in Standard at $99/mo before <strong>June 1, 2026</strong>. Price increases to $149/mo in Q3 2026. Founding suppliers get permanent rate-lock.
                </p>
              </div>
            </div>
            <div className="text-center shrink-0">
              <p className="text-2xl font-bold text-primary">{daysToDeadline}</p>
              <p className="text-xs text-muted-foreground">days to lock in</p>
            </div>
          </div>
        </div>
      </section>

      {/* Plans */}
      <section className="py-14">
        <div className="container max-w-6xl mx-auto">

          {/* Persona quick-scan */}
          <div className="grid sm:grid-cols-3 gap-4 mb-10 max-w-4xl mx-auto">
            {[
              {
                icon: Building2,
                persona: 'Architects & Specifiers',
                plan: 'Free forever',
                note: 'Full EPD database, Revit plugin, SWAP Engine, submittal generator — no paywall.',
              },
              {
                icon: MessageSquare,
                persona: 'Suppliers & Manufacturers',
                plan: 'Standard — $99/mo',
                note: 'Priority RFQ routing, SWAP Engine inclusion, direct messaging with architects who are actively specifying.',
              },
              {
                icon: Video,
                persona: 'Enterprise AEC & Manufacturers',
                plan: 'Premium — $299/mo',
                note: 'Unlimited communication, AI Audit Agent, API integration, group calls, 4-hr SLA.',
              },
            ].map(({ icon: Icon, persona, plan, note }) => (
              <div key={persona} className="rounded-lg border border-border bg-card p-4 text-sm">
                <div className="flex items-center gap-2 mb-1.5">
                  <Icon className="w-4 h-4 text-primary" />
                  <p className="font-semibold text-foreground">{persona}</p>
                </div>
                <p className="text-primary font-medium text-xs mb-1">{plan}</p>
                <p className="text-muted-foreground text-xs leading-relaxed">{note}</p>
              </div>
            ))}
          </div>

          {/* Plan cards */}
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {PLANS.map((plan) => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </div>

          {/* SWAP Engine pitch */}
          <div className="mt-8 max-w-5xl mx-auto rounded-xl border border-emerald-200 bg-emerald-950 text-white p-6">
            <div className="flex items-start gap-4">
              <Zap className="w-5 h-5 text-emerald-400 shrink-0 mt-1" />
              <div>
                <p className="font-bold text-white mb-2">We're your technical sales rep — inside the architect's computer.</p>
                <p className="text-emerald-100/80 text-sm mb-3">
                  When an architect searches "Generic Concrete 4000 PSI" in Revit, the GreenChainz SWAP Engine surfaces:{' '}
                  <em className="text-emerald-300">"Achieve 4000 PSI with 40% less carbon using [Your Product]. ASTM C150 compliance report attached."</em>
                </p>
                <p className="text-sm text-emerald-100/80">
                  Standard and Premium suppliers are included in SWAP Engine results. Free tier is not.
                  That's the difference between being in the conversation and being invisible to it.
                </p>
              </div>
            </div>
          </div>

          {/* Liability framing */}
          <div className="mt-6 max-w-5xl mx-auto rounded-xl border border-border bg-card p-5 flex items-start gap-4">
            <Shield className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-foreground">Why architects get everything free.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Architects' #1 fear with sustainable materials is liability — code review failure, warranty claims, EPD fraud.
                GreenChainz removes it: ICC-ES reports, UL Listings, and EPD International verification are confirmed before any submittal generates.
                We acquire architects by solving their problem at no cost. Suppliers pay to reach them.
                That's the model.
              </p>
            </div>
          </div>

          {/* ROI Calculator */}
          <div className="mt-8 max-w-5xl mx-auto">
            <h3 className="text-base font-semibold text-foreground mb-3">Supplier ROI at current pricing</h3>
            <SupplierROICalculator />
          </div>

          {/* Stats */}
          <div className="mt-8 max-w-5xl mx-auto grid grid-cols-3 gap-3 text-center">
            {[
              { stat: '31x', label: 'expected ROI for Standard suppliers at industry avg conversion ($50K order, 12% conv rate)' },
              { stat: '1 win', label: 'at $50K avg order = 42 months of Standard subscription paid back in a single deal' },
              { stat: '$0 new PO', label: 'for enterprise buyers — draw down existing Azure spend commitment via AppSource' },
            ].map(({ stat, label }) => (
              <div key={stat} className="rounded-lg border border-border bg-card p-4">
                <p className="text-2xl md:text-3xl font-bold text-primary">{stat}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{label}</p>
              </div>
            ))}
          </div>

          {/* Comparison table */}
          <div className="mt-10 max-w-5xl mx-auto space-y-3">
            <button
              onClick={() => setShowCompare(!showCompare)}
              className="flex items-center gap-2 text-sm font-medium text-primary hover:underline mx-auto"
            >
              {showCompare ? '▲ Hide' : '▼ Show'} GreenChainz vs. Procore+Gravity vs. EC3 vs. Manual
            </button>
            {showCompare && <CompareTable />}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-16 bg-secondary/20">
        <div className="container max-w-3xl text-center space-y-5">
          <h2 className="text-2xl font-bold text-foreground">
            {slotsLeft} Founding Supplier spots left at $99/mo.
          </h2>
          <p className="text-muted-foreground">
            After June 1, 2026, Standard goes to $149/mo. Lock in now.
            Architects get every tool free — always.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href={APPSOURCE_URL} target="_blank" rel="noopener noreferrer">
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5">
                Claim Founding Spot on AppSource
                <ExternalLink className="w-4 h-4" />
              </Button>
            </a>
            <Link href="/get-started">
              <Button size="lg" variant="outline">Start Free as Architect</Button>
            </Link>
          </div>
          <p className="text-sm text-muted-foreground">
            Need volume licensing, multi-site API access, or enterprise procurement integration?{' '}
            <Link href="/support" className="text-primary hover:underline font-medium">
              Talk to Jerit <ChevronRight className="inline w-3 h-3" />
            </Link>
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
