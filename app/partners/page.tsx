'use client'
import Link from 'next/link'
import TrustBadges from '../components/TrustBadges'

export default function PartnersPage() {
    return (
        <div className="gc-page">
            <div className="gc-container py-20">
                <div className="max-w-4xl mx-auto text-center mb-16">
                    <h1 className="gc-hero-title mb-6">Partner Program</h1>
                    <p className="gc-hero-subtitle">Join us in building the future of sustainable commerce. Integrate, resell, or provide data through our partner ecosystem.</p>
                </div>

                <div className="max-w-4xl mx-auto mb-12">
                    <TrustBadges variant="full" size="md" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto mb-12">
                    <div className="gc-card gc-card-hover p-8 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-3">Data Providers</h3>
                        <p className="text-slate-600 mb-4">Partner with us to provide certification and sustainability data. FSC, LEED, EPD, B Corp, and more.</p>
                        <Link href="/contact" className="text-emerald-600 hover:text-emerald-700 font-semibold text-sm">Become a Provider →</Link>
                    </div>

                    <div className="gc-card gc-card-hover p-8 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-3">Technology Partners</h3>
                        <p className="text-slate-600 mb-4">Integrate GreenChainz with ERP, BIM, project management, and procurement platforms.</p>
                        <Link href="/contact" className="text-emerald-600 hover:text-emerald-700 font-semibold text-sm">Explore Integration →</Link>
                    </div>

                    <div className="gc-card gc-card-hover p-8 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-3">Reseller Program</h3>
                        <p className="text-slate-600 mb-4">Bring GreenChainz to your customers. Competitive margins and dedicated partner support.</p>
                        <Link href="/contact" className="text-emerald-600 hover:text-emerald-700 font-semibold text-sm">Join as Reseller →</Link>
                    </div>
                </div>

                <div className="gc-card max-w-3xl mx-auto p-8 text-center bg-gradient-to-br from-emerald-50 to-teal-50">
                    <h2 className="text-2xl font-bold text-slate-900 mb-4">Interested in Partnering?</h2>
                    <p className="text-slate-600 mb-6">Let's discuss how we can work together to advance sustainable commerce.</p>
                    <Link href="/contact" className="gc-btn gc-btn-primary">Contact Partnerships Team</Link>
                </div>
            </div>
            )
}
