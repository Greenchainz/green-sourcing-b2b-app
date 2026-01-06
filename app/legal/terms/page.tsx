'use client'

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
                <h1 className="text-5xl font-bold text-slate-900 mb-6">Terms of Service</h1>
                <p className="text-slate-600 mb-12">Last updated: January 2026</p>

                <div className="bg-white rounded-lg shadow-md p-8 space-y-6 text-slate-600">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-3">Acceptance of Terms</h2>
                        <p>By using GreenChainz, you agree to these terms and conditions in their entirety.</p>
                    </div>

                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-3">Use License</h2>
                        <p>Permission is granted to temporarily download one copy of the materials for personal, non-commercial transitory viewing only.</p>
                    </div>

                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-3">Limitations</h2>
                        <p>In no event shall GreenChainz or its suppliers be liable for any damages including lost profits arising from the use or inability to use the materials.</p>
                    </div>

                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-3">Contact</h2>
                        <p>For questions about these terms, contact us at <a href="mailto:legal@greenchainz.com" className="text-blue-600 hover:text-blue-700">legal@greenchainz.com</a></p>
                    </div>
                </div>
            </div>
        </div>
    )
}
