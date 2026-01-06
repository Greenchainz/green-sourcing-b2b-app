'use client'

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
                <h1 className="text-5xl font-bold text-slate-900 mb-6">About GreenChainz</h1>
                <p className="text-xl text-slate-600 mb-12">Building the global trust layer for sustainable commerce.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-white rounded-lg shadow-md p-8">
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">Our Mission</h2>
                        <p className="text-slate-600">To verify and celebrate verified sustainable sourcing globally.</p>
                    </div>

                    <div className="bg-white rounded-lg shadow-md p-8">
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">Our Vision</h2>
                        <p className="text-slate-600">A world where sustainable sourcing is the standard, not the exception.</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
