export function StatsOverview() {
    return (
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
    )
}
