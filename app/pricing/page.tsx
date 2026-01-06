'use client'

export default function PricingPage() {
    const plans = [
        { name: 'Starter', price: '$29/mo', features: ['Basic verification', 'Up to 10 SKUs', 'Email support'] },
        { name: 'Professional', price: '$99/mo', features: ['Full verification', 'Unlimited SKUs', 'Priority support'] },
        { name: 'Enterprise', price: 'Custom', features: ['Custom solutions', 'Dedicated account', '24/7 support'] }
    ]

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
                <h1 className="text-5xl font-bold text-slate-900 mb-6">Pricing</h1>
                <p className="text-xl text-slate-600 mb-12">Choose the plan that fits your business.</p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {plans.map((plan, i) => (
                        <div key={i} className="bg-white rounded-lg shadow-md p-8 hover:shadow-lg transition">
                            <h3 className="text-2xl font-bold text-slate-900 mb-2">{plan.name}</h3>
                            <p className="text-3xl font-bold text-blue-600 mb-6">{plan.price}</p>
                            <ul className="space-y-3">
                                {plan.features.map((feature, j) => (
                                    <li key={j} className="flex items-center text-slate-600">
                                        <span className="text-green-600 mr-3">✓</span>
                                        {feature}
                                    </li>
                                ))}
                            </ul>
                            <button className="w-full mt-8 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition">Get Started</button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
