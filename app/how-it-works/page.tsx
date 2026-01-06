'use client'

export default function HowItWorksPage() {
    const steps = [
        { title: 'Connect', description: 'Integrate with your supply chain' },
        { title: 'Verify', description: 'Get real-time sustainability verification' },
        { title: 'Trust', description: 'Build customer confidence with verified claims' }
    ]

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
                <h1 className="text-5xl font-bold text-slate-900 mb-6">How It Works</h1>
                <p className="text-xl text-slate-600 mb-12">The GreenChainz platform in three simple steps.</p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {steps.map((step, i) => (
                        <div key={i} className="bg-white rounded-lg shadow-md p-8">
                            <div className="text-4xl font-bold text-blue-600 mb-4">{i + 1}</div>
                            <h3 className="text-2xl font-bold text-slate-900 mb-2">{step.title}</h3>
                            <p className="text-slate-600">{step.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
