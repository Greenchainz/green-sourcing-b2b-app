import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SEOHead from '@/components/SEOHead';
import { Check } from 'lucide-react';

const plans = [
  {
    name: 'Starter',
    price: 'Free',
    period: '',
    description: 'For architects and procurement teams getting started with sustainable sourcing.',
    cta: 'Get Started Free',
    ctaLink: '/get-started',
    highlight: false,
    features: [
      'EPD lookup across 50,000+ verified EPDs',
      'Material comparison and carbon scoring',
      'Basic RFQ generation (up to 5/month)',
      'Browser extension — greenwashing detection',
      'LEED v5 / Buy Clean compliance flags',
      'Email support',
    ],
  },
  {
    name: 'Professional',
    price: 'Contact Us',
    period: '',
    description: 'For firms running multiple LEED / Buy Clean projects with active procurement.',
    cta: 'Talk to Sales',
    ctaLink: '/support',
    highlight: true,
    features: [
      'Everything in Starter, plus:',
      'Unlimited RFQ generation',
      'Revit plugin — live compliance scanning',
      'Excel add-in — BOM drop to instant quotes',
      'Carbon Compare dashboard',
      'Material Credit Scores',
      'Supplier response analytics',
      'Priority support',
    ],
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For GCs and architecture firms needing org-wide deployment and compliance reporting.',
    cta: 'Talk to Sales',
    ctaLink: '/support',
    highlight: false,
    features: [
      'Everything in Professional, plus:',
      'Organization-wide deployment',
      'AI Audit Agent — automated compliance auditing',
      'Portfolio carbon tracking & ESG dashboards',
      'Custom integrations (Procore, PlanGrid, etc.)',
      'SSO / Azure AD integration',
      'Dedicated account manager',
      'SLA and uptime guarantees',
    ],
  },
];

export default function Pricing() {
  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead
        title="Pricing — GreenChainz | Free EPD Lookup & Sustainable Procurement Software"
        description="GreenChainz is free to start. No credit card required. EPD lookups, material comparison, and basic RFQs at no cost. Professional and Enterprise plans for teams running LEED v5 and Buy Clean projects."
        canonicalPath="/pricing"
      />
      <Header />

      {/* Hero */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-background to-secondary/20">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground">
              We Price for Scale, Not Prestige.
            </h1>
            <p className="text-lg text-muted-foreground">
              Green building should not be a luxury. Start free, upgrade when your procurement volume demands it.
            </p>
            <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground pt-2">
              <span className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-primary" /> No credit card required
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-primary" /> Live in 5 minutes
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-primary" /> Cancel anytime
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-16">
        <div className="container">
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={`p-6 flex flex-col ${
                  plan.highlight
                    ? 'border-primary shadow-lg shadow-primary/10 relative'
                    : 'border-border'
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded-full">
                    Most Popular
                  </div>
                )}
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-foreground">{plan.name}</h2>
                  <div className="mt-3">
                    <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                    {plan.period && (
                      <span className="text-sm text-muted-foreground ml-1">{plan.period}</span>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link href={plan.ctaLink}>
                  <Button
                    className={`w-full ${
                      plan.highlight
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                        : 'variant-outline'
                    }`}
                    variant={plan.highlight ? 'default' : 'outline'}
                    size="lg"
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-16 bg-secondary/20">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center space-y-4">
            <h2 className="text-2xl font-bold text-foreground">Need something custom?</h2>
            <p className="text-muted-foreground">
              Enterprise deployments, custom integrations, volume licensing — we build for your workflow, not ours.
            </p>
            <Link href="/support">
              <Button variant="outline" size="lg">Contact Sales</Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
