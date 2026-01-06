'use client'

export default function DevelopersPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
                <h1 className="text-5xl font-bold text-slate-900 mb-6">Developers</h1>
                <p className="text-xl text-slate-600 mb-12">Build with GreenChainz APIs.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-white rounded-lg shadow-md p-8">
                        <h3 className="text-2xl font-bold text-slate-900 mb-4">API Documentation</h3>
                        <p className="text-slate-600 mb-4">Access comprehensive API documentation and SDKs.</p>
                        <a href="#" className="text-blue-600 hover:text-blue-700 font-semibold">View Docs →</a>
                    </div>

                    <div className="bg-white rounded-lg shadow-md p-8">
                        <h3 className="text-2xl font-bold text-slate-900 mb-4">SDK Libraries</h3>
                        <p className="text-slate-600 mb-4">Use our official SDKs for Node.js, Python, and more.</p>
                        <a href="#" className="text-blue-600 hover:text-blue-700 font-semibold">Browse SDKs →</a>
                    </div>
                </div>
            </div>
        </div>
    )
}
