'use client'

export default function CareersPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
                <h1 className="text-5xl font-bold text-slate-900 mb-6">Careers</h1>
                <p className="text-xl text-slate-600 mb-12">Join us in building the trust layer for sustainable commerce.</p>

                <div className="bg-white rounded-lg shadow-md p-8">
                    <p className="text-slate-600 mb-4">We're hiring! Check back soon for open positions.</p>
                    <p className="text-slate-600">In the meantime, contact us at <a href="mailto:careers@greenchainz.com" className="text-blue-600 hover:text-blue-700">careers@greenchainz.com</a></p>
                </div>
            </div>
        </div>
    )
}
