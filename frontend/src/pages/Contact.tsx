import { Link } from 'react-router-dom';
import Logo from '../components/Logo';

export default function Contact() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
            <header className="border-b border-slate-800/50 bg-slate-950/50 backdrop-blur-sm sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <Logo height={40} showText={true} />
                        <Link to="/" className="text-slate-300 hover:text-white transition-colors">← Back to Home</Link>
                    </div>
                </div>
            </header>

            <section className="py-20">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="text-4xl font-bold text-white mb-6 text-center">Contact Us</h2>
                    <p className="text-xl text-slate-300 text-center mb-12">
                        Get in touch with the GreenChainz team
                    </p>

                    <div className="grid md:grid-cols-2 gap-8 mb-12">
                        <div className="p-6 rounded-2xl bg-slate-800/50 border border-slate-700">
                            <h3 className="text-xl font-bold text-white mb-4">📧 General Inquiries</h3>
                            <a href="mailto:hello@greenchainz.com" className="text-sky-400 hover:text-sky-300 transition">
                                hello@greenchainz.com
                            </a>
                        </div>

                        <div className="p-6 rounded-2xl bg-slate-800/50 border border-slate-700">
                            <h3 className="text-xl font-bold text-white mb-4">🤝 Partnerships</h3>
                            <a href="mailto:partnerships@greenchainz.com" className="text-sky-400 hover:text-sky-300 transition">
                                partnerships@greenchainz.com
                            </a>
                        </div>

                        <div className="p-6 rounded-2xl bg-slate-800/50 border border-slate-700">
                            <h3 className="text-xl font-bold text-white mb-4">🛠️ Support</h3>
                            <a href="mailto:support@greenchainz.com" className="text-sky-400 hover:text-sky-300 transition">
                                support@greenchainz.com
                            </a>
                        </div>

                        <div className="p-6 rounded-2xl bg-slate-800/50 border border-slate-700">
                            <h3 className="text-xl font-bold text-white mb-4">👨‍💼 Founder</h3>
                            <a href="mailto:founder@greenchainz.com" className="text-sky-400 hover:text-sky-300 transition">
                                founder@greenchainz.com
                            </a>
                        </div>
                    </div>

                    <div className="text-center">
                        <Link
                            to="/signup"
                            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-600 text-white font-semibold text-lg hover:shadow-lg transition-all"
                        >
                            Create an Account
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}
