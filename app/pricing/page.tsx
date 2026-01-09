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
                <div className="max-w-4xl mx-auto text-center mb-16 animate-fade-in-up">
                    <h1 className="gc-hero-title mb-6">
                        Pricing <span className="text-gradient">Plans</span>
                    </h1>
                    <p className="gc-hero-subtitle">Choose the plan that fits your business. Always transparent, no hidden fees.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-12">
                    {plans.map((plan, i) => (
                        <div 
                            key={i} 
                            className={`card-premium relative overflow-hidden animate-fade-in-up ${plan.popular ? 'shadow-glow' : ''}`}
                            style={{ 
                                animationDelay: `${i * 0.1}s`,
                                border: plan.popular ? '2px solid transparent' : undefined,
                                backgroundImage: plan.popular ? 'linear-gradient(white, white), linear-gradient(135deg, #10b981, #06b6d4)' : undefined,
                                backgroundOrigin: plan.popular ? 'border-box' : undefined,
                                backgroundClip: plan.popular ? 'padding-box, border-box' : undefined,
                            }}
                        >
                            {plan.popular && (
                                <div className="absolute top-0 right-0 bg-gradient-to-r from-brand-600 to-ocean-500 text-white text-xs font-bold px-4 py-1 rounded-bl-lg shadow-md">
                                    MOST POPULAR
                                </div>
                            )}
                            <div className={plan.popular ? 'pt-6' : ''}>
                                <h3 className="text-2xl font-black text-slate-900 mb-2">{plan.name}</h3>
                                <div className="mb-6">
                                    <span className="text-5xl font-black text-gradient inline-block">{plan.price}</span>
                                    <span className="text-slate-500 ml-1">{plan.period}</span>
                                </div>
                                <ul className="space-y-3 mb-8">
                                    {plan.features.map((feature, j) => (
                                        <li key={j} className="flex items-start text-slate-600 group">
                                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-50 flex items-center justify-center mr-3 flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform">
                                                <svg className="w-3 h-3 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                </svg>
                                            </div>
                                            <span className="group-hover:text-slate-900 transition-colors">{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                                <Link
                                    href={plan.name === 'Enterprise' ? '/contact' : '/login'}
                                    className={`block w-full text-center ${plan.popular ? 'btn-premium' : 'card-glass text-brand-700 font-bold py-3 px-6 rounded-xl hover:scale-105 active:scale-95 transition-all'}`}
                                >
                                    {plan.cta}
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="text-center text-slate-600 max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: '0.4s' }}>
                    <p className="mb-4">All plans include secure payment processing, data encryption, and regular platform updates.</p>
                    <Link href="/contact" className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-semibold group hover:gap-3 transition-all">
                        Have questions? Contact our sales team 
                        <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                    </Link>
                </div>
            </div>
        </div>
    )
}
