'use client'
import Link from 'next/link'

export default function HowItWorksPage() {
    const steps = [
        { title: 'Sign Up', description: 'Create your account as an architect or supplier. Quick setup in minutes.' },
        { title: 'Connect', description: 'Architects create RFQs. Suppliers list certified materials and capabilities.' },
        { title: 'Verify', description: 'Automated certification checks against LEED, FSC, EPD, and more data providers.' },
        { title: 'Match', description: 'Smart location-based matching connects architects with qualified suppliers.' },
        { title: 'Transact', description: 'Secure quotes, negotiate terms, and complete orders with trust and transparency.' },
        { title: 'Track', description: 'Monitor sustainability metrics, LEED points, and project carbon footprint in real-time.' }
    ]

    return (
        <div className="gc-page">
            <div className="gc-container py-20">
                <div className="max-w-4xl mx-auto text-center mb-16">
                    <h1 className="gc-hero-title mb-6">How It Works</h1>
                    <p className="gc-hero-subtitle">From sign-up to verified sustainable sourcing in six simple steps.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto mb-12">
                    {steps.map((step, i) => (
                        <div key={i} className="gc-card gc-card-hover p-8">
                            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white text-2xl font-black flex items-center justify-center mb-4 shadow-lg">{i + 1}</div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3">{step.title}</h3>
                            <p className="text-slate-600 leading-relaxed">{step.description}</p>
                        </div>
                    ))}
                </div>

                <div className="gc-card max-w-3xl mx-auto p-8 text-center bg-gradient-to-br from-emerald-50 to-teal-50">
                    <h2 className="text-2xl font-bold text-slate-900 mb-4">Ready to Get Started?</h2>
                    <p className="text-slate-600 mb-6">Join hundreds of architects and suppliers using GreenChainz for verified sustainable materials.</p>
                    <div className="flex justify-center gap-4 flex-wrap">
                        <Link href="/login?type=supplier" className="gc-btn gc-btn-primary">Join as Supplier</Link>
                        <Link href="/login?type=architect" className="gc-btn gc-btn-secondary">Join as Architect</Link>
                    </div>
                </div>
            </div>
            )
}
