'use client'
import Link from 'next/link'

export default function DevelopersPage() {
    return (
        <div className="gc-page">
            <div className="gc-container py-20">
                <div className="max-w-4xl mx-auto text-center mb-16">
                    <h1 className="gc-hero-title mb-6">Developer Resources</h1>
                    <p className="gc-hero-subtitle">Build integrations with GreenChainz APIs. Access certification data, supplier catalogs, and RFQ management.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto mb-12">
                    <div className="gc-card gc-card-hover p-8">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center mb-4">
                            <svg className="w-6 h-6 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-3">API Documentation</h3>
                        <p className="text-slate-600 mb-4">RESTful APIs for supplier data, certifications, and RFQ management.</p>
                        <span className="text-sm text-emerald-600 font-semibold">Coming Soon</span>
                    </div>

                    <div className="gc-card gc-card-hover p-8">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center mb-4">
                            <svg className="w-6 h-6 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-3">SDK Libraries</h3>
                        <p className="text-slate-600 mb-4">Official SDKs for Node.js, Python, Ruby, and .NET platforms.</p>
                        <span className="text-sm text-emerald-600 font-semibold">Coming Soon</span>
                    </div>

                    <div className="gc-card gc-card-hover p-8">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center mb-4">
                            <svg className="w-6 h-6 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-3">Webhooks</h3>
                        <p className="text-slate-600 mb-4">Real-time event notifications for RFQ updates and matches.</p>
                        <span className="text-sm text-emerald-600 font-semibold">Coming Soon</span>
                    </div>
                </div>

                <div className="gc-card max-w-3xl mx-auto p-8 text-center bg-gradient-to-br from-slate-50 to-slate-100">
                    <h2 className="text-2xl font-bold text-slate-900 mb-4">Want Early API Access?</h2>
                    <p className="text-slate-600 mb-6">We're currently developing our API platform. Join the waitlist to get notified when it's ready.</p>
                    <Link href="/contact" className="gc-btn gc-btn-primary">Request API Access</Link>
                </div>
            </div>
        </div>
    )
}
