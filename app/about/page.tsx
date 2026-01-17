'use client'
import Link from 'next/link'
import Image from 'next/image'
import TrustBadges from '../components/TrustBadges'

export default function AboutPage() {
    return (
        <div className="gc-page">
            <div className="gc-container py-20">
                {/* Hero Section */}
                <div className="max-w-4xl mx-auto text-center mb-16">
                    <h1 className="gc-hero-title mb-6">About GreenChainz</h1>
                    <p className="gc-hero-subtitle">Green because it makes business sense. Sustainability compliance that boosts your bottom line.</p>
                </div>

                {/* Founder Story Section */}
                <section className="max-w-5xl mx-auto mb-20">
                    <div className="gc-card p-8 md:p-12 bg-gradient-to-br from-slate-50 to-emerald-50/30">
                        <div className="flex flex-col lg:flex-row gap-8 items-start">
                            {/* Founder Image Placeholder */}
                            <div className="w-full lg:w-1/3 flex-shrink-0">
                                <div className="aspect-square rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center overflow-hidden shadow-lg">
                                    <div className="text-center p-6">
                                        <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-emerald-200 flex items-center justify-center">
                                            <svg className="w-12 h-12 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                        </div>
                                        <p className="text-sm text-emerald-700 font-medium">Jerit Norville</p>
                                        <p className="text-xs text-emerald-600">Founder & CEO</p>
                                    </div>
                                </div>
                                {/* Video Placeholder */}
                                <div className="mt-4 aspect-video rounded-xl bg-slate-200 flex items-center justify-center cursor-pointer hover:bg-slate-300 transition-colors group">
                                    <div className="text-center">
                                        <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-emerald-500 flex items-center justify-center group-hover:bg-emerald-600 transition-colors shadow-lg">
                                            <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M8 5v14l11-7z" />
                                            </svg>
                                        </div>
                                        <p className="text-sm text-slate-600 font-medium">Watch Our Story</p>
                                    </div>
                                </div>
                            </div>

                            {/* Story Content */}
                            <div className="flex-1">
                                <h2 className="text-3xl font-bold text-slate-900 mb-6">From Military Logistics to Supply Chain Revolution</h2>

                                <div className="prose prose-slate max-w-none">
                                    <p className="text-lg text-slate-700 leading-relaxed mb-4">
                                        My journey started in the military, where I handled communications, supply, and logistics. That experience taught me one thing: <strong>efficiency saves lives and money</strong>. Every wasted resource, every delayed shipment—it all adds up.
                                    </p>

                                    <p className="text-slate-600 leading-relaxed mb-4">
                                        After leaving the service, I wandered a bit before settling into construction. Ten years of building taught me a lot about putting things together—and about the frustration that comes with it. The inefficiency of supply chains, the paperwork nightmares, the constant struggle to verify that materials actually met spec. It was chaos hiding behind spreadsheets.
                                    </p>

                                    <p className="text-slate-600 leading-relaxed mb-4">
                                        But after a decade, I needed a new challenge. Something that would push me. I'd always tinkered with computers as an amateur, so I took a deep dive into tech. While going through school, I started thinking about my legacy—how I could make a real difference.
                                    </p>

                                    <p className="text-slate-600 leading-relaxed mb-4">
                                        I wanted work that was challenging and let me sleep well at night. That's when it clicked: I'd seen the supply chain problems firsthand in construction. The waste. The inefficiency. The frustration. With what I was learning about AI, I knew I could do better.
                                    </p>

                                    <p className="text-lg text-slate-700 leading-relaxed font-medium">
                                        <strong>GreenChainz</strong> isn't about saving the world—it's about saving you money while doing the right thing. We're green because it makes business sense. Period.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Video Section Placeholder */}
                <section className="max-w-4xl mx-auto mb-20">
                    <h2 className="text-2xl font-bold text-slate-900 mb-6 text-center">See GreenChainz in Action</h2>
                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Demo Video Placeholder */}
                        <div className="aspect-video rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center cursor-pointer hover:from-slate-200 hover:to-slate-300 transition-all group shadow-md">
                            <div className="text-center">
                                <div className="w-20 h-20 mx-auto mb-3 rounded-full bg-emerald-500 flex items-center justify-center group-hover:bg-emerald-600 transition-colors shadow-lg">
                                    <svg className="w-10 h-10 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M8 5v14l11-7z" />
                                    </svg>
                                </div>
                                <p className="text-slate-700 font-semibold">Product Demo</p>
                                <p className="text-sm text-slate-500">2 min overview</p>
                            </div>
                        </div>
                        {/* Testimonial Video Placeholder */}
                        <div className="aspect-video rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center cursor-pointer hover:from-slate-200 hover:to-slate-300 transition-all group shadow-md">
                            <div className="text-center">
                                <div className="w-20 h-20 mx-auto mb-3 rounded-full bg-emerald-500 flex items-center justify-center group-hover:bg-emerald-600 transition-colors shadow-lg">
                                    <svg className="w-10 h-10 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M8 5v14l11-7z" />
                                    </svg>
                                </div>
                                <p className="text-slate-700 font-semibold">Customer Stories</p>
                                <p className="text-sm text-slate-500">Real results</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Mission & Vision Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto mb-16">
                    <div className="gc-card p-8">
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">Our Mission</h2>
                        <p className="text-slate-600 leading-relaxed">Cut compliance costs, not corners. We automate sustainability auditing so you can meet regulations without breaking the bank—or your workflow.</p>
                    </div>

                    <div className="gc-card p-8">
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">Our Vision</h2>
                        <p className="text-slate-600 leading-relaxed">A construction industry where sustainability compliance is automatic, affordable, and profitable. Green shouldn't be a premium—it should be the standard.</p>
                    </div>
                </div>

                {/* Data Partners Section */}
                <section className="max-w-6xl mx-auto mb-16">
                    <h2 className="text-2xl font-bold text-slate-900 mb-6 text-center">Powered By Industry Leaders</h2>
                    <p className="text-slate-600 text-center mb-8 max-w-2xl mx-auto">We integrate with the platforms and data sources that matter most for sustainability compliance.</p>

                    {/* Partner Logos Row */}
                    <div className="flex flex-wrap justify-center items-center gap-8 mb-12 p-6 bg-slate-50 rounded-2xl">
                        <a href="https://www.usgbc.org/leed" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
                            <Image src="/trust/leed.png" alt="LEED Green Building Certification logo" width={120} height={48} className="h-12 w-auto" />
                        </a>
                        <a href="https://buildingtransparency.org" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
                            <Image src="/trust/building-transparency.svg" alt="Building Transparency organization logo" width={150} height={40} unoptimized className="h-10 w-auto" />
                        </a>
                        <a href="https://www.environdec.com" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
                            <Image src="/trust/epd.png" alt="Environmental Product Declaration (EPD) logo" width={100} height={48} className="h-12 w-auto" />
                        </a>
                        <a href="https://www.autodesk.com/sustainability" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
                            <Image src="/brand/autodesk-logo-white.png" alt="Autodesk company logo" width={120} height={32} className="h-8 w-auto invert" />
                        </a>
                        <a href="https://www.usgbc.org" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
                            <Image src="/trust/usgbc.png" alt="U.S. Green Building Council (USGBC) logo" width={120} height={48} className="h-12 w-auto" />
                        </a>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* LEED */}
                        <a
                            href="https://www.usgbc.org/leed"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="gc-card p-6 hover:shadow-lg transition-shadow group"
                        >
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center overflow-hidden p-2">
                                    <Image
                                        src="/trust/leed.png"
                                        alt="LEED"
                                        width={40}
                                        height={40}
                                        className="object-contain"
                                    />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">LEED Certification</h3>
                            </div>
                            <p className="text-slate-600 text-sm leading-relaxed">Automatic LEED credit tracking and compliance verification. Know your project's certification status in real-time.</p>
                            <span className="inline-flex items-center text-emerald-600 text-sm font-medium mt-3 group-hover:translate-x-1 transition-transform">
                                Learn about LEED →
                            </span>
                        </a>

                        {/* Building Transparency / EC3 */}
                        <a
                            href="https://buildingtransparency.org/ec3"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="gc-card p-6 hover:shadow-lg transition-shadow group"
                        >
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 rounded-lg bg-teal-100 flex items-center justify-center overflow-hidden p-1">
                                    <Image
                                        src="/trust/building-transparency.svg"
                                        alt="Building Transparency"
                                        width={40}
                                        height={40}
                                        unoptimized
                                    />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">EC3 & Building Transparency</h3>
                            </div>
                            <p className="text-slate-600 text-sm leading-relaxed">Access 100,000+ EPDs through the Embodied Carbon in Construction Calculator for accurate carbon scoring.</p>
                            <span className="inline-flex items-center text-emerald-600 text-sm font-medium mt-3 group-hover:translate-x-1 transition-transform">
                                Explore EC3 →
                            </span>
                        </a>

                        {/* EPD */}
                        <a
                            href="https://www.environdec.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="gc-card p-6 hover:shadow-lg transition-shadow group"
                        >
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center overflow-hidden p-2">
                                    <Image
                                        src="/trust/epd.png"
                                        alt="EPD"
                                        width={40}
                                        height={40}
                                        className="object-contain"
                                    />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">Environmental Product Declarations</h3>
                            </div>
                            <p className="text-slate-600 text-sm leading-relaxed">Verified environmental impact data for building materials. Third-party certified lifecycle assessments you can trust.</p>
                            <span className="inline-flex items-center text-emerald-600 text-sm font-medium mt-3 group-hover:translate-x-1 transition-transform">
                                About EPDs →
                            </span>
                        </a>

                        {/* Autodesk */}
                        <a
                            href="https://www.autodesk.com/sustainability"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="gc-card p-6 hover:shadow-lg transition-shadow group"
                        >
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center">
                                    <Image
                                        src="/brand/autodesk-logo-white.png"
                                        alt="Autodesk"
                                        width={32}
                                        height={32}
                                        className="invert opacity-70"
                                    />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">Autodesk Revit</h3>
                            </div>
                            <p className="text-slate-600 text-sm leading-relaxed">Revit plugin integration for real-time LEED compliance checking directly in your BIM workflow.</p>
                            <span className="inline-flex items-center text-emerald-600 text-sm font-medium mt-3 group-hover:translate-x-1 transition-transform">
                                Learn more →
                            </span>
                        </a>

                        {/* USGBC */}
                        <a
                            href="https://www.usgbc.org"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="gc-card p-6 hover:shadow-lg transition-shadow group"
                        >
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center overflow-hidden p-2">
                                    <Image
                                        src="/trust/usgbc.png"
                                        alt="USGBC"
                                        width={40}
                                        height={40}
                                        className="object-contain"
                                    />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">U.S. Green Building Council</h3>
                            </div>
                            <p className="text-slate-600 text-sm leading-relaxed">The organization behind LEED, driving the green building movement and sustainable construction standards.</p>
                            <span className="inline-flex items-center text-emerald-600 text-sm font-medium mt-3 group-hover:translate-x-1 transition-transform">
                                Visit USGBC →
                            </span>
                        </a>

                        {/* FSC */}
                        <a
                            href="https://fsc.org/en"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="gc-card p-6 hover:shadow-lg transition-shadow group"
                        >
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center overflow-hidden p-2">
                                    <Image
                                        src="/trust/fsc.png"
                                        alt="FSC"
                                        width={40}
                                        height={40}
                                        className="object-contain"
                                    />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">Forest Stewardship Council</h3>
                            </div>
                            <p className="text-slate-600 text-sm leading-relaxed">Certified responsibly sourced wood and paper products. Chain of custody verification for sustainable forestry.</p>
                            <span className="inline-flex items-center text-emerald-600 text-sm font-medium mt-3 group-hover:translate-x-1 transition-transform">
                                FSC Certification →
                            </span>
                        </a>
                    </div>
                </section>

                {/* Trust Badges */}
                <div className="max-w-4xl mx-auto mb-12">
                    <TrustBadges variant="full" size="md" />
                </div>

                {/* CTA Section */}
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-slate-900 mb-4">Ready to Cut Compliance Costs?</h2>
                    <p className="text-slate-600 mb-6 max-w-2xl mx-auto">Join teams saving 85% on sustainability compliance. Free to start, no credit card required.</p>
                    <div className="flex justify-center gap-4 flex-wrap">
                        <Link href="/login" className="gc-btn gc-btn-primary">Get Started Free</Link>
                        <Link href="/contact" className="gc-btn gc-btn-secondary">Talk to Sales</Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
