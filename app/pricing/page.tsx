'use client'
import Link from 'next/link'

export default function PricingPage() {
    const plans = [
        {
            name: 'Free',
            price: '$0',
            period: '/month',
            features: ['Browse verified suppliers', 'Basic RFQ creation', 'Email support', 'Standard matching'],
            cta: 'Get Started Free',
            popular: false
        },
        {
            name: 'Professional',
            price: '$99',
            period: '/month',
            features: ['Unlimited RFQs', 'Priority matching', 'Advanced analytics', 'LEED tracking', 'Priority support', 'API access'],
            cta: 'Start Free Trial',
            popular: true
        },
        {
            name: 'Enterprise',
            price: 'Custom',
            period: '',
            features: ['Custom integrations', 'Dedicated account manager', 'White-label options', 'SLA guarantees', '24/7 phone support', 'Custom data feeds'],
            cta: 'Contact Sales',
            popular: false
        }
    ]

    return (
        <div className="gc-page">
            <div className="gc-container py-20">
                <div className="max-w-4xl mx-auto text-center mb-16">
                    <h1 className="gc-hero-title mb-6">Pricing Plans</h1>
                    <p className="gc-hero-subtitle">Choose the plan that fits your business. Always transparent, no hidden fees.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto mb-12">
                    {plans.map((plan, i) => (
                        <div key={i} className={`gc-card p-8 ${plan.popular ? 'border-2 border-emerald-500' : ''}`}>
                            {plan.popular && <div className="text-xs font-bold text-emerald-600 mb-3">MOST POPULAR</div>}
                            <h3 className="text-2xl font-bold text-slate-900 mb-2">{plan.name}</h3>
                            <div className="mb-6">
                                <span className="text-4xl font-black text-emerald-700">{plan.price}</span>
                                <span className="text-slate-500">{plan.period}</span>
                            </div>
                            <ul className="space-y-3 mb-8">
                                {plan.features.map((feature, j) => (
                                    <li key={j} className="flex items-start text-slate-600">
                                        <svg className="w-5 h-5 text-emerald-600 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        {feature}
                                    </li>
                                ))}
                            </ul>
                            <Link
                                href={plan.name === 'Enterprise' ? '/contact' : '/login'}
                                className={`gc-btn w-full text-center ${plan.popular ? 'gc-btn-primary' : 'gc-btn-secondary'}`}
                            >
                                {plan.cta}
                            </Link>
                        </div>
                    ))}
                </div>

                <div className="text-center text-slate-600 max-w-2xl mx-auto">
                    <p className="mb-4">All plans include secure payment processing, data encryption, and regular platform updates.</p>
                    <Link href="/contact" className="text-emerald-600 hover:text-emerald-700 font-semibold">Have questions? Contact our sales team →</Link>
                </div>
            </div>
        </div>
    )
}
