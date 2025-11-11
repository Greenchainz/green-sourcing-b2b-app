import { useState } from 'react';
import { Link } from 'react-router-dom';

export function ArchitectDashboard() {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedMaterials, setSelectedMaterials] = useState<number[]>([]);

    const materials = [
        {
            id: 1,
            name: 'Recycled Steel Beams',
            supplier: 'EcoSteel Industries',
            carbonFootprint: '1.2 kg CO₂/kg',
            certifications: ['FSC', 'B Corp'],
            price: '$450/ton',
            leadTime: '14 days',
            rating: 4.8,
            image: '🏗️'
        },
        {
            id: 2,
            name: 'Bamboo Flooring',
            supplier: 'Sustainable Floors Co',
            carbonFootprint: '0.3 kg CO₂/sqft',
            certifications: ['FSC', 'Cradle to Cradle Gold'],
            price: '$8.50/sqft',
            leadTime: '21 days',
            rating: 4.9,
            image: '🎋'
        },
        {
            id: 3,
            name: 'Recycled Glass Tiles',
            supplier: 'GlassWorks Sustainable',
            carbonFootprint: '0.8 kg CO₂/sqft',
            certifications: ['Green Seal', 'LEED Platinum'],
            price: '$12/sqft',
            leadTime: '10 days',
            rating: 4.7,
            image: '✨'
        }
    ];

    const toggleMaterial = (id: number) => {
        setSelectedMaterials(prev =>
            prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
        );
    };

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
                                <a href="#" className="px-3 py-2 rounded-lg bg-sky-500/10 text-sky-400 font-medium">Search</a>
                                <a href="#" className="px-3 py-2 text-slate-400 hover:text-white transition-colors">Projects</a>
                                <a href="#" className="px-3 py-2 text-slate-400 hover:text-white transition-colors">RFQs</a>
                                <a href="#" className="px-3 py-2 text-slate-400 hover:text-white transition-colors">Network</a>
                            </nav>
                        </div>
                        <div className="flex items-center gap-4">
                            <button className="p-2 text-slate-400 hover:text-white transition-colors">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                </svg>
                            </button>
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500" />
                                <span className="text-sm text-slate-300 hidden sm:block">Alex Chen</span>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Welcome Banner */}
                <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-sky-500/10 to-cyan-500/10 border border-sky-500/20">
                    <h1 className="text-2xl font-bold text-white mb-2">Welcome back, Alex 👋</h1>
                    <p className="text-slate-300">You have 3 active projects and 2 pending RFQs</p>
                </div>

                {/* Search & Filters */}
                <div className="mb-8">
                    <div className="flex gap-4 mb-4">
                        <div className="flex-1 relative">
                            <input
                                type="text"
                                placeholder="Search materials, suppliers, certifications..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full px-4 py-3 pl-12 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                            />
                            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <button className="px-6 py-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:border-sky-500 transition-colors flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                            </svg>
                            Filters
                        </button>
                    </div>

                    {/* Quick Filters */}
                    <div className="flex gap-2 flex-wrap">
                        {['FSC Certified', 'B Corp', 'LEED Platinum', 'Cradle to Cradle', 'Low Carbon (<5kg CO₂)', 'Fast Delivery (<14 days)'].map((filter, i) => (
                            <button
                                key={i}
                                className="px-4 py-2 rounded-full bg-slate-900 border border-slate-700 text-slate-300 text-sm hover:border-sky-500 hover:text-sky-400 transition-colors"
                            >
                                {filter}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Comparison Mode */}
                {selectedMaterials.length > 0 && (
                    <div className="mb-6 p-4 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-between">
                        <span className="text-sky-400 font-medium">
                            {selectedMaterials.length} materials selected for comparison
                        </span>
                        <div className="flex gap-3">
                            <button className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium transition-colors">
                                Compare Side-by-Side
                            </button>
                            <button
                                onClick={() => setSelectedMaterials([])}
                                className="px-4 py-2 rounded-lg border border-slate-600 text-slate-300 hover:border-slate-500 transition-colors"
                            >
                                Clear
                            </button>
                        </div>
                    </div>
                )}

                {/* Materials Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {materials.map((material) => (
                        <div
                            key={material.id}
                            className={`p-6 rounded-2xl bg-slate-900 border transition-all ${selectedMaterials.includes(material.id)
                                ? 'border-sky-500 ring-2 ring-sky-500/20'
                                : 'border-slate-800 hover:border-slate-700'
                                }`}
                        >
                            {/* Material Card Header */}
                            <div className="flex items-start justify-between mb-4">
                                <div className="text-4xl">{material.image}</div>
                                <input
                                    type="checkbox"
                                    checked={selectedMaterials.includes(material.id)}
                                    onChange={() => toggleMaterial(material.id)}
                                    className="w-5 h-5 rounded border-slate-600 text-sky-600 focus:ring-sky-500"
                                />
                            </div>

                            <h3 className="text-lg font-bold text-white mb-1">{material.name}</h3>
                            <p className="text-sm text-slate-400 mb-4">{material.supplier}</p>

                            {/* Certifications */}
                            <div className="flex gap-2 mb-4 flex-wrap">
                                {material.certifications.map((cert, i) => (
                                    <span
                                        key={i}
                                        className="px-2 py-1 rounded-md bg-green-500/10 border border-green-500/30 text-green-400 text-xs font-medium"
                                    >
                                        {cert}
                                    </span>
                                ))}
                            </div>

                            {/* Metrics */}
                            <div className="space-y-2 mb-4">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Carbon Footprint:</span>
                                    <span className="text-white font-medium">{material.carbonFootprint}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Price:</span>
                                    <span className="text-white font-medium">{material.price}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Lead Time:</span>
                                    <span className="text-white font-medium">{material.leadTime}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Rating:</span>
                                    <span className="text-yellow-400 font-medium">⭐ {material.rating}</span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2">
                                <button className="flex-1 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium transition-colors">
                                    Send RFQ
                                </button>
                                <button className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:border-slate-600 transition-colors">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Quick Stats */}
                <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Materials Searched', value: '247' },
                        { label: 'RFQs Sent', value: '18' },
                        { label: 'Active Projects', value: '3' },
                        { label: 'Time Saved', value: '32hrs' }
                    ].map((stat, i) => (
                        <div key={i} className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                            <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
                            <div className="text-sm text-slate-400">{stat.label}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
