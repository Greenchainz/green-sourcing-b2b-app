'use client'
import Link from 'next/link'

export default function BlogPage() {
    return (
        <div className="gc-page">
            <div className="gc-container py-20">
                <div className="max-w-4xl mx-auto text-center mb-12">
                    <h1 className="gc-hero-title mb-6">Blog & Insights</h1>
                    <p className="gc-hero-subtitle">Latest news, insights, and best practices for sustainable sourcing and supply chain transparency.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
                    <div className="gc-card gc-card-hover p-6">
                        <div className="text-sm font-bold text-emerald-600 mb-2">COMING SOON</div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2">Industry Insights</h3>
                        <p className="text-slate-600 text-sm mb-4">Expert perspectives on sustainable building and green materials sourcing.</p>
                        <div className="text-xs text-slate-500">Articles launching soon</div>
                    </div>

                    <div className="gc-card gc-card-hover p-6">
                        <div className="text-sm font-bold text-emerald-600 mb-2">COMING SOON</div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2">Product Updates</h3>
                        <p className="text-slate-600 text-sm mb-4">New features and platform enhancements from the GreenChainz team.</p>
                        <div className="text-xs text-slate-500">Updates launching soon</div>
                    </div>

                    <div className="gc-card gc-card-hover p-6">
                        <div className="text-sm font-bold text-emerald-600 mb-2">COMING SOON</div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2">Case Studies</h3>
                        <p className="text-slate-600 text-sm mb-4">Success stories from architects and suppliers using GreenChainz.</p>
                        <div className="text-xs text-slate-500">Stories launching soon</div>
                    </div>
                </div>

                <div className="text-center mt-12">
                    <p className="text-slate-600 mb-6">Want to stay updated?</p>
                    <Link href="/contact" className="gc-btn gc-btn-primary">Contact Us</Link>
                </div>
            </div>
        </div>
    );
}
