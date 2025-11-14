import { useState } from 'react';
import { Product, RFQ } from '../types';
import './SupplierDashboard.css';
import { Header } from './Header';
import { StatsOverview } from './StatsOverview';
import { ProductsTab } from './ProductsTab';
import { RfqsTab } from './RfqsTab';

export function SupplierDashboard() {
    const [activeTab, setActiveTab] = useState<'products' | 'analytics' | 'rfqs'>('products');

    const products: Product[] = [
        { id: 1, name: 'Recycled PET Bottles', views: 1247, rfqs: 23, status: 'Active', certifications: ['FSC', 'B Corp'] },
        { id: 2, name: 'Bamboo Composite Panels', views: 892, rfqs: 15, status: 'Active', certifications: ['Cradle to Cradle'] },
        { id: 3, name: 'Bio-Based Insulation', views: 654, rfqs: 8, status: 'Pending Review', certifications: [] }
    ];

    const rfqs: RFQ[] = [
        { company: 'Studio Architects', project: 'Commercial Office Renovation', product: 'Bamboo Panels', date: '2 hours ago', status: 'New' },
        { company: 'Green Design Co', project: 'Residential Complex', product: 'Recycled PET', date: '1 day ago', status: 'Responded' },
        { company: 'EcoBuilders LLC', project: 'School Building', product: 'Bio Insulation', date: '3 days ago', status: 'In Discussion' }
    ];

    return (
        <div className="min-h-screen bg-slate-950">
            <Header />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <StatsOverview />
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
                {activeTab === 'products' && <ProductsTab products={products} />}
                {activeTab === 'rfqs' && <RfqsTab rfqs={rfqs} />}
            </div>
        </div>
    );
}
