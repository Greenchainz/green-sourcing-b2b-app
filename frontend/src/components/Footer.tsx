// frontend/src/components/Footer.tsx
import { Link } from 'react-router-dom';

export default function Footer() {
    return (
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
                            <li><Link to="/privacy-policy" className="text-slate-400 hover:text-sky-400 transition-colors text-sm">Privacy Policy</Link></li>
                            <li><Link to="/terms-of-service" className="text-slate-400 hover:text-sky-400 transition-colors text-sm">Terms of Service</Link></li>
                            <li><Link to="/supplier-agreement" className="text-slate-400 hover:text-sky-400 transition-colors text-sm">Supplier Agreement</Link></li>
                        </ul>
                    </div>
                </div>

                <div className="mt-12 pt-8 border-t border-slate-800 text-center text-slate-500 text-sm">
                    © {new Date().getFullYear()} GreenChainz. All rights reserved.
                </div>
            </div>
        </footer>
    );
}