import { useAuth } from '../context/AuthContext';

export function ArchitectDashboard() {
    const { user } = useAuth();

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            {/* Header */}
            <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-cyan-400" />
                                <span className="font-bold text-white">GreenChainz</span>
                            </div>
                        </div>
                         <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500" />
                                <span className="text-sm text-slate-300 hidden sm:block">{user?.email}</span>
                            </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Welcome Banner */}
                <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-sky-500/10 to-cyan-500/10 border border-sky-500/20">
                    <h1 className="text-2xl font-bold text-white mb-2">Welcome, {user?.user_metadata?.first_name || user?.email} 👋</h1>
                    <p className="text-slate-300">This is your dashboard. The full materials catalog is coming soon.</p>
                </div>

                {/* Search Bar */}
                <div className="mb-8">
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            placeholder="Search materials, suppliers, certifications..."
                            className="w-full px-4 py-3 pl-12 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                        />
                        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                </div>

                {/* Placeholder */}
                <div className="text-center py-16 border-2 border-dashed border-slate-800 rounded-2xl">
                    <p className="text-slate-400">Catalog loading...</p>
                </div>
            </main>
        </div>
    );
}
