import { Link } from 'react-router-dom';
import Logo from '../components/Logo';
import LandingPageValueProps from '../components/LandingPageValueProps';

export function LandingPage() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
            {/* Hero Section */}
            <header className="border-b border-slate-800/50 bg-slate-950/50 backdrop-blur-sm sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <Logo height={40} showText={true} />
                        <nav className="flex items-center gap-6">
                            <Link to="/survey/architect" className="text-slate-300 hover:text-white transition-colors">Take Survey</Link>
                            <Link to="/login" className="text-slate-300 hover:text-white transition-colors">Sign In</Link>
                            <Link
                                to="/login"
                                className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium transition-colors"
                            >
                                Get Started
                            </Link>
                        </nav>
                    </div>
                </div>
            </header>

            {/* Hero Banner */}
            <section className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-sky-500/10 via-transparent to-cyan-500/10" />
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32 relative">
                    <div className="text-center max-w-4xl mx-auto">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-sm font-medium mb-8">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500" />
                            </span>
                            Now accepting Charter 175 members
                        </div>

                        <h2 className="text-5xl lg:text-7xl font-extrabold text-white mb-6 leading-tight">
                            Sourcing Sustainable Materials{' '}
                            <span className="bg-gradient-to-r from-sky-400 to-cyan-400 bg-clip-text text-transparent">
                                Made Simple
                            </span>
                        </h2>

                        <p className="text-xl text-slate-300 mb-12 max-w-2xl mx-auto leading-relaxed">
                            The global trust layer for sustainable commerce. Connect verified suppliers with
                            forward-thinking architects. Zero greenwashing. Total transparency.
                        </p>

                        {/* Dual CTAs */}
                        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
                            <Link
                                to="/survey/architect"
                                className="group relative px-8 py-4 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-600 text-white font-semibold text-lg shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 transition-all duration-300 hover:scale-105 w-full sm:w-auto"
                            >
                                <span className="flex items-center gap-2 justify-center">
                                    🏗️ Complete Survey
                                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                    </svg>
                                </span>
                            </Link>

                            <a
                                href="mailto:partnerships@greenchainz.com"
                                className="group px-8 py-4 rounded-xl border-2 border-sky-500/50 text-sky-400 font-semibold text-lg hover:bg-sky-500/10 hover:border-sky-500 transition-all duration-300 hover:scale-105 w-full sm:w-auto"
                            >
                                <span className="flex items-center gap-2 justify-center">
                                    🌱 Become a Supplier
                                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                    </svg>
                                </span>
                            </a>
                        </div>

                        <a
                            href="mailto:partnerships@greenchainz.com"
                            className="inline-flex items-center gap-2 text-slate-400 hover:text-sky-400 transition-colors text-sm"
                        >
                            <span>Become a Data Provider Partner</span>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </a>
                    </div>
                </div>
            </section>

            <LandingPageValueProps />

            {/* Final CTA */}
            <section className="py-20">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h3 className="text-4xl font-bold text-white mb-6">Ready to Transform Your Supply Chain?</h3>
                    <p className="text-xl text-slate-300 mb-8">
                        Join the global movement toward verified sustainable sourcing
                    </p>
                    <Link
                        to="/signup"
                        className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-600 text-white font-semibold text-lg shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 transition-all hover:scale-105"
                    >
                        Get Started Free
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-slate-800 bg-slate-950 py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid md:grid-cols-4 gap-8">
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-cyan-400" />
                                <span className="font-bold text-white">GreenChainz</span>
                            </div>
                            <p className="text-slate-400 text-sm">
                                Global Trust Layer for Sustainable Commerce
                            </p>
                        </div>

                        <div>
                            <h4 className="font-semibold text-white mb-4">Product</h4>
                            <ul className="space-y-2">
                                <li><Link to="/features" className="text-slate-400 hover:text-sky-400 transition-colors text-sm">Features</Link></li>
                                <li><Link to="/survey/architect" className="text-slate-400 hover:text-sky-400 transition-colors text-sm">Take Survey</Link></li>
                                <li><Link to="/signup" className="text-slate-400 hover:text-sky-400 transition-colors text-sm">Sign Up</Link></li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-semibold text-white mb-4">Company</h4>
                            <ul className="space-y-2">
                                <li><Link to="/contact" className="text-slate-400 hover:text-sky-400 transition-colors text-sm">Contact</Link></li>
                                <li><a href="mailto:partnerships@greenchainz.com" className="text-slate-400 hover:text-sky-400 transition-colors text-sm">Partnerships</a></li>
                                <li><a href="mailto:hello@greenchainz.com" className="text-slate-400 hover:text-sky-400 transition-colors text-sm">Support</a></li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-semibold text-white mb-4">Legal</h4>
                            <ul className="space-y-2">
                                <li><Link to="/privacy" className="text-slate-400 hover:text-sky-400 transition-colors text-sm">Privacy</Link></li>
                                <li><Link to="/terms" className="text-slate-400 hover:text-sky-400 transition-colors text-sm">Terms</Link></li>
                            </ul>
                        </div>
                    </div>

                    <div className="mt-12 pt-8 border-t border-slate-800 text-center text-slate-500 text-sm">
                        © {new Date().getFullYear()} GreenChainz. All rights reserved.
                    </div>
                </div>
            </footer>
        </div>
    );
}
