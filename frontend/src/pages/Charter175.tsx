import { Link } from 'react-router-dom'
import Logo from '../components/Logo'

export default function Charter175() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
            <header className="border-b border-slate-800/50 bg-slate-950/50 backdrop-blur-sm sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <Logo height={40} showText={true} />
                        <nav className="flex items-center gap-6">
                            <Link to="/" className="text-slate-300 hover:text-white transition-colors">Home</Link>
                        </nav>
                    </div>
                </div>
            </header>

            <section className="py-8">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h1 className="text-3xl font-bold text-white mb-4">GreenChained Certified – Charter 175</h1>
                    <p className="text-slate-300 mb-6">This badge content is embedded from a static HTML file. Replace the placeholder file with your provided version for production.</p>

                    <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-900">
                        <iframe
                            src="/badges/charter175/index.html"
                            title="Charter 175 Badge"
                            className="w-full"
                            style={{ minHeight: 900 }}
                        />
                    </div>

                    <div className="mt-6 text-sm text-slate-500">
                        <p>
                            To update this badge, replace the file at <code>/public/badges/charter175/index.html</code> with your latest export.
                        </p>
                    </div>
                </div>
            </section>
        </div>
    )
}
