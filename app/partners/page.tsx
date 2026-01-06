'use client'

export default function PartnersPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
                <h1 className="text-5xl font-bold text-slate-900 mb-6">Partners</h1>
                <p className="text-xl text-slate-600 mb-12">Collaborating to build a sustainable future.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <div className="bg-white rounded-lg shadow-md p-8 text-center">
                        <h3 className="text-xl font-bold text-slate-900 mb-2">Data Providers</h3>
                        <p className="text-slate-600">FSC, B Corp, EC3, and more</p>
                    </div>

                    <div className="bg-white rounded-lg shadow-md p-8 text-center">
                        <h3 className="text-xl font-bold text-slate-900 mb-2">Integration Partners</h3>
                        <p className="text-slate-600">ERP, supply chain, and commerce platforms</p>
                    </div>

                    <div className="bg-white rounded-lg shadow-md p-8 text-center">
                        <h3 className="text-xl font-bold text-slate-900 mb-2">Resellers</h3>
                        <p className="text-slate-600">Bring GreenChainz to your customers</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
