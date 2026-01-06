'use client'

export default function BlogPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
                <h1 className="text-5xl font-bold text-slate-900 mb-6">Blog</h1>
                <p className="text-xl text-slate-600 mb-12">Insights on sustainable sourcing and supply chain transparency.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition">
                        <h3 className="text-lg font-semibold text-slate-900 mb-2">Coming Soon</h3>
                        <p className="text-slate-600">Blog articles and industry insights coming soon.</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
