import { useState } from 'react';
import { Link } from 'react-router-dom';

export function SupplierDashboard() {
    const [activeTab, setActiveTab] = useState<'products' | 'analytics' | 'rfqs'>('products');

    const products = [
        { id: 1, name: 'Recycled PET Bottles', views: 1247, rfqs: 23, status: 'Active', certifications: ['FSC', 'B Corp'] },
        { id: 2, name: 'Bamboo Composite Panels', views: 892, rfqs: 15, status: 'Active', certifications: ['Cradle to Cradle'] },
        { id: 3, name: 'Bio-Based Insulation', views: 654, rfqs: 8, status: 'Pending Review', certifications: [] }
    ];

    return (
        <div className="min-h-screen bg-slate-950">
            {/* Header */}
            <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <Link to="/" className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-cyan-400" />
                                <span className="font-bold text-white">GreenChainz</span>
                            </Link>
                            <nav className="hidden md:flex items-center gap-4">
                                <a href="#" className="px-3 py-2 rounded-lg bg-sky-500/10 text-sky-400 font-medium">Dashboard</a>
                                <a href="#" className="px-3 py-2 text-slate-400 hover:text-white transition-colors">Products</a>
                                <a href="#" className="px-3 py-2 text-slate-400 hover:text-white transition-colors">RFQs</a>
                                <a href="#" className="px-3 py-2 text-slate-400 hover:text-white transition-colors">Network</a>
                            </nav>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="px-3 py-1 rounded-full bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 text-yellow-400 text-xs font-bold">
                                🏆 FOUNDING 50
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-500" />
                                <span className="text-sm text-slate-300 hidden sm:block">EcoTech Materials</span>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Stats Overview */}
                <div className="grid md:grid-cols-4 gap-6 mb-8">
                    {[
                        { label: 'Total Views', value: '2,793', change: '+12%', icon: '👀' },
                        { label: 'RFQs Received', value: '46', change: '+8%', icon: '📬' },
                        { label: 'Active Products', value: '12', change: '—', icon: '📦' },
                        { label: 'Network Rank', value: '#7', change: '+2', icon: '🏆' }
                    ].map((stat, i) => (
                        <div key={i} className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-2xl">{stat.icon}</span>
                                <span className={`text-sm font-medium ${stat.change.startsWith('+') ? 'text-green-400' : 'text-slate-500'}`}>
                                    {stat.change}
                                </span>
                            </div>
                            <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                            <div className="text-sm text-slate-400">{stat.label}</div>
                        </div>
                    ))}
                </div>

                {/* Certification Group Buy Banner */}
                <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <h3 className="text-xl font-bold text-white mb-2">🎯 Join Group Certification Program</h3>
                            <p className="text-slate-300 mb-4">
                                Save 40% on FSC and B Corp certifications by joining our group processing program.
                                Next batch closes in 14 days.
                            </p>
                            <button className="px-6 py-3 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors">
                                Request Group Certification
                            </button>
                        </div>
                        <div className="hidden lg:block text-6xl">🌟</div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="mb-6 border-b border-slate-800">
                    <div className="flex gap-6">
                        {(['products', 'analytics', 'rfqs'] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`pb-4 px-2 font-medium capitalize transition-colors ${activeTab === tab
                                        ? 'text-sky-400 border-b-2 border-sky-400'
                                        : 'text-slate-400 hover:text-slate-300'
                                    }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Products Tab */}
                {activeTab === 'products' && (
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
                )}

                {/* Analytics Tab */}
                {activeTab === 'analytics' && (
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-6">Performance Analytics</h2>

                        <div className="grid md:grid-cols-2 gap-6 mb-6">
                            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
                                <h3 className="text-lg font-semibold text-white mb-4">Views Over Time</h3>
                                <div className="h-64 flex items-end justify-around gap-2">
                                    {[45, 62, 58, 71, 83, 92, 78].map((height, i) => (
                                        <div key={i} className="flex-1 flex flex-col items-center gap-2">
                                            <div
                                                className="w-full bg-gradient-to-t from-sky-500 to-cyan-500 rounded-t-lg transition-all hover:opacity-80"
                                                style={{ height: `${height}%` }}
                                            />
                                            <span className="text-xs text-slate-500">D{i + 1}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
                                <h3 className="text-lg font-semibold text-white mb-4">Top Performing Products</h3>
                                <div className="space-y-4">
                                    {products.slice(0, 3).map((product, i) => (
                                        <div key={i} className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm">
                                                    #{i + 1}
                                                </div>
                                                <span className="text-slate-300">{product.name}</span>
                                            </div>
                                            <span className="text-sky-400 font-medium">{product.views}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
                            <h3 className="text-lg font-semibold text-white mb-4">Supplier Leaderboard Position</h3>
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-slate-400">Your Rank:</span>
                                <span className="text-3xl font-bold text-sky-400">#7</span>
                            </div>
                            <div className="w-full bg-slate-800 rounded-full h-3">
                                <div className="bg-gradient-to-r from-sky-500 to-cyan-500 h-3 rounded-full" style={{ width: '86%' }} />
                            </div>
                            <p className="text-sm text-slate-500 mt-2">Top 15% of all suppliers</p>
                        </div>
                    </div>
                )}

                {/* RFQs Tab */}
                {activeTab === 'rfqs' && (
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-6">Recent RFQs</h2>
                        <div className="space-y-4">
                            {[
                                { company: 'Studio Architects', project: 'Commercial Office Renovation', product: 'Bamboo Panels', date: '2 hours ago', status: 'New' },
                                { company: 'Green Design Co', project: 'Residential Complex', product: 'Recycled PET', date: '1 day ago', status: 'Responded' },
                                { company: 'EcoBuilders LLC', project: 'School Building', product: 'Bio Insulation', date: '3 days ago', status: 'In Discussion' }
                            ].map((rfq, i) => (
                                <div key={i} className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <h3 className="text-lg font-bold text-white mb-1">{rfq.company}</h3>
                                            <p className="text-slate-400 text-sm">{rfq.project}</p>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${rfq.status === 'New' ? 'bg-sky-500/10 border border-sky-500/30 text-sky-400' :
                                                rfq.status === 'Responded' ? 'bg-green-500/10 border border-green-500/30 text-green-400' :
                                                    'bg-yellow-500/10 border border-yellow-500/30 text-yellow-400'
                                            }`}>
                                            {rfq.status}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-500">Product: {rfq.product}</span>
                                        <span className="text-slate-500">{rfq.date}</span>
                                    </div>
                                    <div className="mt-4 flex gap-3">
                                        <button className="flex-1 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium transition-colors">
                                            Respond
                                        </button>
                                        <button className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:border-slate-600 transition-colors">
                                            View Details
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
