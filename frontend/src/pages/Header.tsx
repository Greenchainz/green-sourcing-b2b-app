import { Link } from 'react-router-dom';

export function Header() {
    return (
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
                            <Link to="/rfq-history" className="px-3 py-2 text-slate-400 hover:text-white transition-colors">RFQs</Link>
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
    )
}
