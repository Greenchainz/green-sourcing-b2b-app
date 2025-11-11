import { useState } from 'react';
import { Link } from 'react-router-dom';

export function AdminConsole() {
    const [activeTab, setActiveTab] = useState<'onboarding' | 'mous' | 'insights' | 'financials'>('onboarding');

    const onboardingQueue = [
        { id: 1, name: 'Sarah Chen', email: 'sarah@studio-architects.com', type: 'Architect', status: 'Pending', date: '2 hours ago' },
        { id: 2, name: 'EcoMaterials Inc', email: 'contact@ecomaterials.com', type: 'Supplier', status: 'Approved', date: '5 hours ago' },
        { id: 3, name: 'Marcus Rivera', email: 'marcus@greenconsult.com', type: 'Data Provider', status: 'In Review', date: '1 day ago' }
    ];

    const mous = [
        { id: 1, partner: 'Patagonia', type: 'Founding 50 Supplier', status: 'Signed', date: '2024-10-15', stage: 'Active' },
        { id: 2, partner: 'Building Transparency', type: 'Data Provider', status: 'Sent', date: '2024-11-01', stage: 'Pending Signature' },
        { id: 3, partner: 'Interface Carpets', type: 'Founding 50 Supplier', status: 'Draft', date: '2024-11-03', stage: 'In Negotiation' }
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
                                <span className="font-bold text-white">GreenChainz Admin</span>
                            </Link>
                            <span className="px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold">
                                ADMIN CONSOLE
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-pink-500" />
                            <span className="text-sm text-slate-300 hidden sm:block">Admin User</span>
                        </div>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Key Metrics Dashboard */}
                <div className="grid md:grid-cols-4 gap-6 mb-8">
                    {[
                        { label: 'Total Users', value: '1,842', change: '+12%', icon: '👥', color: 'sky' },
                        { label: 'Pending Approvals', value: '14', change: '+3', icon: '⏳', color: 'yellow' },
                        { label: 'Active MOUs', value: '47', change: '+5', icon: '📄', color: 'green' },
                        { label: 'Conversion Rate', value: '68%', change: '+4%', icon: '📈', color: 'purple' }
                    ].map((metric, i) => (
                        <div key={i} className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-2xl">{metric.icon}</span>
                                <span className={`text-sm font-medium ${metric.change.startsWith('+') ? 'text-green-400' : 'text-slate-500'}`}>
                                    {metric.change}
                                </span>
                            </div>
                            <div className="text-3xl font-bold text-white mb-1">{metric.value}</div>
                            <div className="text-sm text-slate-400">{metric.label}</div>
                        </div>
                    ))}
                </div>

                {/* Tabs */}
                <div className="mb-6 border-b border-slate-800">
                    <div className="flex gap-6">
                        {(['onboarding', 'mous', 'insights', 'financials'] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`pb-4 px-2 font-medium capitalize transition-colors ${activeTab === tab
                                    ? 'text-sky-400 border-b-2 border-sky-400'
                                    : 'text-slate-400 hover:text-slate-300'
                                    }`}
                            >
                                {tab === 'mous' ? 'MOUs' : tab}
                            </button>
                        ))}
                    </div>
                </div>                {/* Onboarding Queue */}
                {activeTab === 'onboarding' && (
                    <div>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-white">User Onboarding Queue</h2>
                            <button className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:border-slate-600 transition-colors flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                                </svg>
                                Filter
                            </button>
                        </div>

                        <div className="space-y-4">
                            {onboardingQueue.map((user) => (
                                <div key={user.id} className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="text-lg font-bold text-white">{user.name}</h3>
                                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${user.status === 'Approved' ? 'bg-green-500/10 border border-green-500/30 text-green-400' :
                                                    user.status === 'Pending' ? 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-400' :
                                                        'bg-sky-500/10 border border-sky-500/30 text-sky-400'
                                                    }`}>
                                                    {user.status}
                                                </span>
                                                <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-400 text-xs">
                                                    {user.type}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-6 text-sm text-slate-400">
                                                <span>📧 {user.email}</span>
                                                <span>🕐 {user.date}</span>
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            {user.status === 'Pending' && (
                                                <>
                                                    <button className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white font-medium transition-colors">
                                                        Approve
                                                    </button>
                                                    <button className="px-4 py-2 rounded-lg border border-red-600 text-red-400 hover:bg-red-600 hover:text-white transition-colors">
                                                        Reject
                                                    </button>
                                                </>
                                            )}
                                            <button className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:border-slate-600 transition-colors">
                                                View Details
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* MOU Tracking */}
                {activeTab === 'mous' && (
                    <div>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-white">MOU Management</h2>
                            <button className="px-6 py-3 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium transition-colors flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Generate New MOU
                            </button>
                        </div>

                        <div className="space-y-4">
                            {mous.map((mou) => (
                                <div key={mou.id} className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="text-lg font-bold text-white">{mou.partner}</h3>
                                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${mou.status === 'Signed' ? 'bg-green-500/10 border border-green-500/30 text-green-400' :
                                                    mou.status === 'Sent' ? 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-400' :
                                                        'bg-slate-700 border border-slate-600 text-slate-400'
                                                    }`}>
                                                    {mou.status}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-4 text-sm">
                                                <div>
                                                    <span className="text-slate-500">Type:</span>
                                                    <span className="ml-2 text-slate-300">{mou.type}</span>
                                                </div>
                                                <div>
                                                    <span className="text-slate-500">Date:</span>
                                                    <span className="ml-2 text-slate-300">{mou.date}</span>
                                                </div>
                                                <div>
                                                    <span className="text-slate-500">Stage:</span>
                                                    <span className="ml-2 text-slate-300">{mou.stage}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <button className="p-2 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:border-slate-600 transition-colors">
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                            </button>
                                            <button className="p-2 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:border-slate-600 transition-colors">
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                </svg>
                                            </button>
                                            <button className="p-2 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:border-slate-600 transition-colors">
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Insights Dashboard */}
                {activeTab === 'insights' && (
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-6">Platform Insights</h2>

                        <div className="grid md:grid-cols-2 gap-6 mb-6">
                            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
                                <h3 className="text-lg font-semibold text-white mb-4">User Growth (7 days)</h3>
                                <div className="h-48 flex items-end justify-around gap-2">
                                    {[34, 45, 52, 48, 67, 78, 92].map((height, i) => (
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
                                <h3 className="text-lg font-semibold text-white mb-4">User Distribution</h3>
                                <div className="space-y-4">
                                    {[
                                        { role: 'Architects', count: 847, percentage: 46 },
                                        { role: 'Suppliers', count: 623, percentage: 34 },
                                        { role: 'Data Providers', count: 372, percentage: 20 }
                                    ].map((item, i) => (
                                        <div key={i}>
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-slate-300">{item.role}</span>
                                                <span className="text-white font-medium">{item.count}</span>
                                            </div>
                                            <div className="w-full bg-slate-800 rounded-full h-2">
                                                <div
                                                    className="bg-gradient-to-r from-sky-500 to-cyan-500 h-2 rounded-full transition-all"
                                                    style={{ width: `${item.percentage}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-3 gap-6">
                            {[
                                { label: 'Avg. Response Rate', value: '68%', desc: 'Survey completion' },
                                { label: 'Data Coverage', value: '12,400', desc: 'Product listings' },
                                { label: 'Active Projects', value: '247', desc: 'In progress' }
                            ].map((stat, i) => (
                                <div key={i} className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
                                    <div className="text-3xl font-bold text-white mb-2">{stat.value}</div>
                                    <div className="text-lg text-slate-300 mb-1">{stat.label}</div>
                                    <div className="text-sm text-slate-500">{stat.desc}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Financials Dashboard */}
                {activeTab === 'financials' && (
                    <div>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-white">Financial Dashboard & KPIs</h2>
                            <div className="flex gap-2">
                                <button className="px-4 py-2 rounded-lg bg-sky-500 text-white hover:bg-sky-600 transition-colors">
                                    Export to Excel
                                </button>
                                <button className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:border-slate-600 transition-colors">
                                    Filter Period
                                </button>
                            </div>
                        </div>

                        {/* Key Financial Metrics */}
                        <div className="grid md:grid-cols-4 gap-6 mb-8">
                            {[
                                { label: 'MRR (Monthly Recurring Revenue)', value: '$16,240', target: '$28,000', progress: 58, icon: '💰', trend: '+34%' },
                                { label: 'Cash Position', value: '$60,520', target: 'Break-even', progress: 100, icon: '🏦', trend: '+148%' },
                                { label: 'Paying Suppliers', value: '58', target: '100', progress: 58, icon: '🏭', trend: '+23' },
                                { label: 'Gross Margin', value: '82%', target: '85%', progress: 96, icon: '📊', trend: '+3%' }
                            ].map((metric, i) => (
                                <div key={i} className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-900/50 border border-slate-800">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-3xl">{metric.icon}</span>
                                        <span className="px-2 py-1 rounded-full bg-green-500/10 border border-green-500/30 text-green-400 text-xs font-bold">
                                            {metric.trend}
                                        </span>
                                    </div>
                                    <div className="text-3xl font-bold text-white mb-1">{metric.value}</div>
                                    <div className="text-sm text-slate-400 mb-3">{metric.label}</div>
                                    <div className="flex items-center gap-2 text-xs">
                                        <div className="flex-1 bg-slate-800 rounded-full h-1.5">
                                            <div
                                                className="bg-gradient-to-r from-sky-500 to-cyan-500 h-1.5 rounded-full"
                                                style={{ width: `${metric.progress}%` }}
                                            />
                                        </div>
                                        <span className="text-slate-500">{metric.target}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* SaaS Metrics Grid */}
                        <div className="grid md:grid-cols-3 gap-6 mb-8">
                            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold text-white">CAC vs LTV</h3>
                                    <span className="text-xs px-2 py-1 rounded bg-green-500/10 text-green-400 border border-green-500/30">
                                        Healthy 3.2:1
                                    </span>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm text-slate-400">Customer Acquisition Cost</span>
                                            <span className="text-lg font-bold text-white">$125</span>
                                        </div>
                                        <div className="text-xs text-slate-500">Marketing + Sales per customer</div>
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm text-slate-400">Lifetime Value</span>
                                            <span className="text-lg font-bold text-white">$3,360</span>
                                        </div>
                                        <div className="text-xs text-slate-500">Avg $280/mo × 12 months</div>
                                    </div>
                                    <div className="pt-3 border-t border-slate-800">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-slate-300">LTV:CAC Ratio</span>
                                            <span className="text-2xl font-bold text-green-400">3.2:1</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
                                <h3 className="text-lg font-semibold text-white mb-4">Churn Analysis</h3>
                                <div className="space-y-4">
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm text-slate-400">Monthly Churn Rate</span>
                                            <span className="text-lg font-bold text-green-400">2.1%</span>
                                        </div>
                                        <div className="w-full bg-slate-800 rounded-full h-2">
                                            <div className="bg-green-500 h-2 rounded-full" style={{ width: '2.1%' }} />
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm text-slate-400">Customers Lost (M12)</span>
                                            <span className="text-lg font-bold text-white">1</span>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm text-slate-400">Retention Rate</span>
                                            <span className="text-lg font-bold text-sky-400">97.9%</span>
                                        </div>
                                    </div>
                                    <div className="pt-3 border-t border-slate-800 text-xs text-slate-500">
                                        Target: &lt;3% monthly churn ✓
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
                                <h3 className="text-lg font-semibold text-white mb-4">Activation Metrics</h3>
                                <div className="space-y-4">
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm text-slate-400">User Activation Rate</span>
                                            <span className="text-lg font-bold text-white">73%</span>
                                        </div>
                                        <div className="text-xs text-slate-500 mb-2">Signup → First RFQ/Upload</div>
                                        <div className="w-full bg-slate-800 rounded-full h-2">
                                            <div className="bg-sky-500 h-2 rounded-full" style={{ width: '73%' }} />
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm text-slate-400">RFQ Response Rate</span>
                                            <span className="text-lg font-bold text-white">68%</span>
                                        </div>
                                        <div className="w-full bg-slate-800 rounded-full h-2">
                                            <div className="bg-cyan-500 h-2 rounded-full" style={{ width: '68%' }} />
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm text-slate-400">Free → Paid Conversion</span>
                                            <span className="text-lg font-bold text-white">34%</span>
                                        </div>
                                        <div className="w-full bg-slate-800 rounded-full h-2">
                                            <div className="bg-purple-500 h-2 rounded-full" style={{ width: '34%' }} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Cash Flow Chart */}
                        <div className="grid md:grid-cols-2 gap-6 mb-8">
                            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
                                <h3 className="text-lg font-semibold text-white mb-4">Monthly Cash Flow (Year 1)</h3>
                                <div className="h-64 flex items-end justify-around gap-1">
                                    {[
                                        { month: 'M1', revenue: 0, expenses: 2050, net: -2050 },
                                        { month: 'M2', revenue: 0, expenses: 2050, net: -2050 },
                                        { month: 'M3', revenue: 0, expenses: 2050, net: -2050 },
                                        { month: 'M4', revenue: 1960, expenses: 2050, net: -90 },
                                        { month: 'M5', revenue: 1960, expenses: 2100, net: -140 },
                                        { month: 'M6', revenue: 4760, expenses: 2350, net: 2410 },
                                        { month: 'M7', revenue: 4760, expenses: 2350, net: 2410 },
                                        { month: 'M8', revenue: 4760, expenses: 2600, net: 2160 },
                                        { month: 'M9', revenue: 8960, expenses: 2850, net: 6110 },
                                        { month: 'M10', revenue: 8960, expenses: 2850, net: 6110 },
                                        { month: 'M11', revenue: 12960, expenses: 3000, net: 9960 },
                                        { month: 'M12', revenue: 16240, expenses: 3500, net: 12740 }
                                    ].map((data, i) => {
                                        const maxNet = 12740;
                                        const heightPercent = data.net > 0 ? (data.net / maxNet) * 100 : 0;
                                        const isNegative = data.net < 0;
                                        return (
                                            <div key={i} className="flex-1 flex flex-col items-center gap-2 group relative">
                                                <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 p-2 rounded text-xs whitespace-nowrap">
                                                    <div className="text-green-400">Rev: ${data.revenue.toLocaleString()}</div>
                                                    <div className="text-red-400">Exp: ${data.expenses.toLocaleString()}</div>
                                                    <div className={data.net >= 0 ? 'text-green-400' : 'text-red-400'}>
                                                        Net: ${data.net.toLocaleString()}
                                                    </div>
                                                </div>
                                                {isNegative ? (
                                                    <div className="w-full bg-red-500/30 rounded-t-lg h-2" />
                                                ) : (
                                                    <div
                                                        className="w-full bg-gradient-to-t from-green-500 to-emerald-500 rounded-t-lg transition-all hover:opacity-80"
                                                        style={{ height: `${heightPercent}%`, minHeight: heightPercent > 0 ? '8px' : '0' }}
                                                    />
                                                )}
                                                <span className="text-xs text-slate-500">{data.month}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="mt-4 pt-4 border-t border-slate-800 text-sm text-slate-400">
                                    <div className="flex items-center justify-between">
                                        <span>Break-even achieved:</span>
                                        <span className="font-bold text-green-400">Month 6-7</span>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
                                <h3 className="text-lg font-semibold text-white mb-4">Revenue Breakdown (M12)</h3>
                                <div className="space-y-4 mb-6">
                                    {[
                                        { source: 'Pro Subscriptions ($199/mo)', amount: 7960, percent: 49, color: 'sky' },
                                        { source: 'Premium Subscriptions ($499/mo)', amount: 8982, percent: 55, color: 'purple' },
                                        { source: 'Transaction Fees (2%)', amount: 298, percent: 2, color: 'cyan' }
                                    ].map((rev, i) => (
                                        <div key={i}>
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm text-slate-300">{rev.source}</span>
                                                <span className="font-bold text-white">${rev.amount.toLocaleString()}</span>
                                            </div>
                                            <div className="w-full bg-slate-800 rounded-full h-2">
                                                <div
                                                    className={`bg-gradient-to-r from-${rev.color}-500 to-${rev.color}-400 h-2 rounded-full`}
                                                    style={{ width: `${rev.percent}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="pt-4 border-t border-slate-800">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-lg font-semibold text-slate-300">Total MRR</span>
                                        <span className="text-3xl font-bold text-white">$16,240</span>
                                    </div>
                                    <div className="text-sm text-slate-500">40 Pro + 18 Premium suppliers</div>
                                </div>
                            </div>
                        </div>

                        {/* Banking KPIs Table */}
                        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
                            <h3 className="text-lg font-semibold text-white mb-4">Banking & Investor KPIs</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="border-b border-slate-800">
                                        <tr className="text-left">
                                            <th className="pb-3 text-slate-400 font-medium">Metric</th>
                                            <th className="pb-3 text-slate-400 font-medium">Current Value</th>
                                            <th className="pb-3 text-slate-400 font-medium">Target (Y1)</th>
                                            <th className="pb-3 text-slate-400 font-medium">Status</th>
                                            <th className="pb-3 text-slate-400 font-medium">Trend</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800">
                                        {[
                                            { metric: 'Monthly Recurring Revenue (MRR)', current: '$16,240', target: '$28,000', status: 'On Track', trend: '+34%' },
                                            { metric: 'Customer Acquisition Cost (CAC)', current: '$125', target: '<$150', status: 'Excellent', trend: '-12%' },
                                            { metric: 'Lifetime Value (LTV)', current: '$3,360', target: '>$3,000', status: 'Exceeded', trend: '+8%' },
                                            { metric: 'LTV:CAC Ratio', current: '3.2:1', target: '>3:1', status: 'Healthy', trend: '+0.4' },
                                            { metric: 'Gross Margin', current: '82%', target: '>75%', status: 'Strong', trend: '+3%' },
                                            { metric: 'Monthly Churn Rate', current: '2.1%', target: '<3%', status: 'Excellent', trend: '-0.5%' },
                                            { metric: 'User Activation Rate', current: '73%', target: '>65%', status: 'Strong', trend: '+8%' },
                                            { metric: 'RFQ Response Rate', current: '68%', target: '>60%', status: 'Good', trend: '+5%' },
                                            { metric: 'Monthly Active Users (MAU)', current: '1,247', target: '1,500', status: 'On Track', trend: '+23%' },
                                            { metric: 'Conversion Rate (Free→Paid)', current: '34%', target: '>30%', status: 'Strong', trend: '+6%' },
                                            { metric: 'Average Deal Size', current: '$4,200', target: '$3,500', status: 'Exceeded', trend: '+12%' },
                                            { metric: 'Cash Runway (months)', current: '18', target: '>12', status: 'Secure', trend: '+3' },
                                            { metric: 'Burn Rate', current: '$500/mo', target: '<$2,000', status: 'Excellent', trend: '-40%' }
                                        ].map((kpi, i) => (
                                            <tr key={i} className="hover:bg-slate-800/30">
                                                <td className="py-3 text-slate-300">{kpi.metric}</td>
                                                <td className="py-3 font-bold text-white">{kpi.current}</td>
                                                <td className="py-3 text-slate-400">{kpi.target}</td>
                                                <td className="py-3">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${kpi.status === 'Excellent' || kpi.status === 'Exceeded' ? 'bg-green-500/10 text-green-400 border border-green-500/30' :
                                                        kpi.status === 'Strong' || kpi.status === 'Healthy' || kpi.status === 'Secure' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30' :
                                                            kpi.status === 'Good' || kpi.status === 'On Track' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' :
                                                                'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30'
                                                        }`}>
                                                        {kpi.status}
                                                    </span>
                                                </td>
                                                <td className="py-3">
                                                    <span className={`font-medium ${kpi.trend.startsWith('+') || kpi.trend.startsWith('-') && kpi.metric.includes('Churn') || kpi.metric.includes('CAC') || kpi.metric.includes('Burn') ? 'text-green-400' : 'text-slate-400'
                                                        }`}>
                                                        {kpi.trend}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="mt-6 p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                                <div className="flex items-start gap-3">
                                    <span className="text-2xl">✓</span>
                                    <div>
                                        <div className="font-bold text-green-400 mb-1">Investor Ready Status</div>
                                        <div className="text-sm text-slate-300">
                                            All key metrics on track. Break-even achieved Month 6. Cash flow positive.
                                            Strong unit economics (LTV:CAC 3.2:1, 82% gross margin). Low churn (2.1%).
                                            Platform demonstrates product-market fit with 73% activation rate.
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
