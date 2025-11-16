import type { Product } from '../types';

export function ProductsTab({ products }: { products: Product[] }) {
    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Your Products</h2>
                <button className="px-6 py-3 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium transition-colors flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Product
                </button>
            </div>

            <div className="space-y-4">
                {products.map((product) => (
                    <div key={product.id} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors">
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <h3 className="text-lg font-bold text-white">{product.name}</h3>
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${product.status === 'Active'
                                        ? 'bg-green-500/10 border border-green-500/30 text-green-400'
                                        : 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-400'
                                        }`}>
                                        {product.status}
                                    </span>
                                </div>

                                <div className="flex items-center gap-6 text-sm">
                                    <span className="text-slate-400">
                                        👁️ {product.views.toLocaleString()} views
                                    </span>
                                    <span className="text-slate-400">
                                        📬 {product.rfqs} RFQs
                                    </span>
                                    {product.certifications.length > 0 && (
                                        <div className="flex gap-2">
                                            {product.certifications.map((cert, i) => (
                                                <span key={i} className="px-2 py-1 rounded bg-green-500/10 border border-green-500/30 text-green-400 text-xs">
                                                    {cert}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button className="p-2 rounded-lg border border-slate-700 text-slate-400 hover:border-slate-600 hover:text-white transition-colors">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                </button>
                                <button className="p-2 rounded-lg border border-slate-700 text-slate-400 hover:border-red-600 hover:text-red-400 transition-colors">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
