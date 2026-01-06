'use client'
import Link from 'next/link'
import TrustBadges from '../components/TrustBadges'

export default function AboutPage() {
    return (
        <div className="gc-page">
            <div className="gc-container py-20">
                <div className="max-w-4xl mx-auto text-center mb-16">
                    <h1 className="gc-hero-title mb-6">About GreenChainz</h1>
                    <p className="gc-hero-subtitle">Building the global trust layer for sustainable commerce.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto mb-16">
                    <div className="gc-card p-8">
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">Our Mission</h2>
                        <p className="text-slate-600 leading-relaxed">To empower architects and suppliers with verified sustainability data, making green building materials the trusted standard in construction.</p>
                    </div>

                    <div className="gc-card p-8">
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">Our Vision</h2>
                        <p className="text-slate-600 leading-relaxed">A world where sustainable sourcing is the standard, not the exception—powered by transparent, real-time verification.</p>
                    </div>

                    <div className="gc-card p-8">
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">How We Started</h2>
                        <p className="text-slate-600 leading-relaxed">Founded to solve the trust gap in sustainable materials sourcing, connecting verified suppliers with architects who demand transparency.</p>
                    </div>

                    <div className="gc-card p-8">
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">Our Approach</h2>
                        <p className="text-slate-600 leading-relaxed">Automated certification verification powered by LEED, FSC, EPD, and other leading sustainability data providers.</p>
                    </div>
                </div>

                <div className="max-w-4xl mx-auto mb-12">
                    <TrustBadges variant="full" size="md" />
                </div>

                <div className="text-center">
                    <h2 className="text-2xl font-bold text-slate-900 mb-4">Join Our Mission</h2>
                    <p className="text-slate-600 mb-6 max-w-2xl mx-auto">Whether you're an architect seeking verified sustainable materials or a supplier wanting to showcase your certifications, we're here to help.</p>
                    <div className="flex justify-center gap-4 flex-wrap">
                        <Link href="/login" className="gc-btn gc-btn-primary">Get Started</Link>
                        <Link href="/contact" className="gc-btn gc-btn-secondary">Contact Us</Link>
                    </div>
                </div>
            </div>
            )
}
