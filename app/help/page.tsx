'use client'

export default function HelpPage() {
    const faqs = [
        { q: 'How do I get started?', a: 'Sign up for an account and connect your supply chain data.' },
        { q: 'What verification methods are available?', a: 'We support multiple verification data providers including FSC, B Corp, and EC3.' },
        { q: 'Can I integrate with my existing systems?', a: 'Yes, we provide API access for seamless integration.' }
    ]

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
                <h1 className="text-5xl font-bold text-slate-900 mb-6">Help & Support</h1>
                <p className="text-xl text-slate-600 mb-12">Find answers to common questions.</p>

                <div className="space-y-6">
                    {faqs.map((faq, i) => (
                        <div key={i} className="bg-white rounded-lg shadow-md p-6">
                            <h3 className="text-lg font-bold text-slate-900 mb-2">{faq.q}</h3>
                            <p className="text-slate-600">{faq.a}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
