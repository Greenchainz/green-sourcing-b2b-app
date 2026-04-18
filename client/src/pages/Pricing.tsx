import { useState } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SEOHead from '@/components/SEOHead';
import { Check, X, Building2, HardHat } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Architect plans ───────────────────────────────────────────────────────────

const ARCHITECT_PLANS = [
  {
    name: 'Free',
    price: '$0',
    period: '',
    annualNote: '',
    description: 'Everything you need to find and specify sustainable materials.',
    cta: 'Get Started Free',
    ctaLink: '/get-started',
    highlight: false,
    features: [
      'Unlimited EPD lookups across 50,000+ verified EPDs',
      'Unlimited RFQ generation and tracking',
      'Revit plugin — specify materials in Autodesk Revit',
      'Submittal Generator — CSI 3-part spec PDFs',
      'Excel BOM Audit — carbon footprint on any BOM',
      'SWAP Engine — greener alternatives for any spec',
      'Material Credit Scores and carbon comparison',
      'LEED v5, Buy Clean, and WELL compliance flags',
    ],
    blocked: [
      'Messaging with suppliers',
      'Video calls with suppliers',
    ],
  },
  {
    name: 'Premium',
    price: '$29.99',
    period: '/month',
    annualNote: 'or $23.99/mo billed annually — save 20%',
    description: 'Add direct communication with verified suppliers.',
    cta: 'Start Free Trial',
    ctaLink: '/get-started',
    highlight: true,
    features: [
      'Everything in Free, plus:',
      'Messaging with verified suppliers (300/month)',
      'Video calls with suppliers (15 hours/month)',
      'Priority support',
    ],
    blocked: [],
  },
];

// ── Supplier plans ────────────────────────────────────────────────────────────

const SUPPLIER_PLANS = [
  {
    name: 'Basic',
    price: 'Free',
    period: '',
    annualNote: '',
    description: 'Get listed and start receiving inbound RFQs from architects.',
    cta: 'Create Free Listing',
    ctaLink: '/supplier/register',
    highlight: false,
    features: [
      'Public supplier profile in the GreenChainz catalog',
      'Appear in architect material searches',
      'Respond to inbound RFQs (up to 5/month)',
      'Basic messaging with architects (10/month)',
      'Upload up to 10 materials',
    ],
    blocked: [
      'Verified supplier badge',
      'Priority search placement',
      'Unlimited RFQ responses',
      'Video calls with architects',
      'Analytics dashboard',
      'Bulk material upload',
      'SWAP Engine inclusion',
    ],
  },
  {
    name: 'Professional',
    price: '$99',
    period: '/user/month',
    annualNote: 'or $79/user/mo billed annually — save 20%',
    description: 'For manufacturers and distributors actively responding to LEED and Buy Clean projects.',
    cta: 'Start Free Trial',
    ctaLink: '/supplier/register',
    highlight: true,
    features: [
      'Everything in Basic, plus:',
      'Verified supplier badge',
      'Priority placement in search results',
      'Unlimited RFQ responses',
      'Messaging with architects (300/month)',
      'Video calls with architects (15 hours/month)',
      'Analytics — views, RFQs, engagement',
      'Bulk material upload (unlimited)',
      'SWAP Engine inclusion',
      'EPD document hosting',
      'Email support (24-hour response)',
    ],
    blocked: [],
  },
  {
    name: 'Enterprise',
    price: '$199',
    period: '/user/month',
    annualNote: 'or $159/user/mo billed annually — save 20%',
    description: 'For large manufacturers and distributors with complex sustainability requirements.',
    cta: 'Talk to Sales',
    ctaLink: '/support',
    highlight: false,
    features: [
      'Everything in Professional, plus:',
      'AI Audit Agent — automated EPD validation',
      'Multi-project carbon portfolio tracking',
      'Advanced analytics and reporting',
      'Team management with role-based access',
      'Bulk RFQ creation and management',
      'Priority supplier matching algorithm',
      'API access for enterprise integrations',
      'Dedicated account manager',
      'Priority support (4-hour response)',
    ],
    blocked: [],
  },
];

// ── Plan card ─────────────────────────────────────────────────────────────────

function PlanCard({ plan }: { plan: typeof ARCHITECT_PLANS[number] }) {
  return (
    <Card className={cn(
      'p-6 flex flex-col relative',
      plan.highlight ? 'border-primary shadow-lg shadow-primary/10' : 'border-border'
    )}>
      {plan.highlight && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded-full whitespace-nowrap">
          Most Popular
        </div>
      )}

      <div className="mb-5">
        <h3 className="text-xl font-bold">{plan.name}</h3>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-3xl font-bold">{plan.price}</span>
          {plan.period && <span className="text-sm text-muted-foreground">{plan.period}</span>}
        </div>
        {plan.annualNote && (
          <p className="text-xs text-muted-foreground mt-0.5">{plan.annualNote}</p>
        )}
        <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
      </div>

      <ul className="space-y-2 mb-6 flex-1">
        {plan.features.map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <span className={cn(i === 0 && plan.features[0].startsWith('Everything') ? 'font-medium text-foreground' : 'text-muted-foreground')}>
              {f}
            </span>
          </li>
        ))}
        {plan.blocked.map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-sm opacity-40">
            <X className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="text-muted-foreground">{f}</span>
          </li>
        ))}
      </ul>

      <Link href={plan.ctaLink}>
        <Button
          className="w-full"
          size="lg"
          variant={plan.highlight ? 'default' : 'outline'}
        >
          {plan.cta}
        </Button>
      </Link>
      {plan.highlight && plan.name !== 'Enterprise' && (
        <p className="text-xs text-muted-foreground text-center mt-2">
          14-day free trial · No credit card required
        </p>
      )}
    </Card>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function Pricing() {
  const [tab, setTab] = useState<'architects' | 'suppliers'>('architects');

  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead
        title="Pricing — GreenChainz | Free for Architects. Built for Suppliers."
        description="GreenChainz is free for architects. Suppliers start free and unlock verified placement, unlimited RFQs, messaging, and video calls from $99/month."
        canonicalPath="/pricing"
      />
      <Header />

      {/* Hero */}
      <section className="py-16 md:py-20 bg-gradient-to-b from-background to-secondary/20">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground">
              Price for the Work,<br />Not the Prestige.
            </h1>
            <p className="text-lg text-muted-foreground">
              Architects get every tool free. Suppliers choose the plan that fits their growth.
            </p>
            <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground pt-2">
              <span className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-primary" /> No credit card required
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-primary" /> Cancel anytime
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Tab switcher */}
      <section className="py-10">
        <div className="container max-w-5xl mx-auto">
          <div className="flex gap-2 p-1 bg-muted rounded-lg w-fit mx-auto mb-10">
            <button
              onClick={() => setTab('architects')}
              className={cn(
                'flex items-center gap-2 px-5 py-2 rounded-md text-sm font-medium transition-colors',
                tab === 'architects'
                  ? 'bg-background shadow text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Building2 className="w-4 h-4" /> Architects & AEC
            </button>
            <button
              onClick={() => setTab('suppliers')}
              className={cn(
                'flex items-center gap-2 px-5 py-2 rounded-md text-sm font-medium transition-colors',
                tab === 'suppliers'
                  ? 'bg-background shadow text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <HardHat className="w-4 h-4" /> Suppliers & Manufacturers
            </button>
          </div>

          {tab === 'architects' && (
            <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              {ARCHITECT_PLANS.map((plan) => (
                <PlanCard key={plan.name} plan={plan} />
              ))}
            </div>
          )}

          {tab === 'suppliers' && (
            <div className="grid md:grid-cols-3 gap-6">
              {SUPPLIER_PLANS.map((plan) => (
                <PlanCard key={plan.name} plan={plan} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-16 bg-secondary/20">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center space-y-4">
            <h2 className="text-2xl font-bold">Need something custom?</h2>
            <p className="text-muted-foreground">
              Multi-site deployments, API access, volume licensing, and custom integrations.
              We build around your workflow.
            </p>
            <Link href="/support">
              <Button variant="outline" size="lg">Talk to Jerit</Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
