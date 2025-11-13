import { Link } from 'react-router-dom';

export default function Terms() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
            <header className="border-b border-slate-800/50 bg-slate-950/50 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <Link to="/" className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-sky-500 to-cyan-400" />
                        <h1 className="text-2xl font-bold text-white">GreenChainz</h1>
                    </Link>
                </div>
            </header>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
                <h1 className="text-4xl font-bold text-white mb-6">Terms of Service</h1>
                <p className="text-slate-400 mb-8">Last updated: November 13, 2025</p>

                <div className="prose prose-invert max-w-none space-y-8">
                    <section className="text-slate-300">
                        <h2 className="text-2xl font-bold text-white mb-4">1. Acceptance of Terms</h2>
                        <p>
                            By accessing and using GreenChainz, you accept and agree to be bound by these Terms of Service. If you do not agree, please do not use our platform.
                        </p>
                    </section>

                    <section className="text-slate-300">
                        <h2 className="text-2xl font-bold text-white mb-4">2. Description of Service</h2>
                        <p className="mb-4">
                            GreenChainz provides a B2B marketplace platform connecting architects and contractors with verified sustainable building material suppliers. Our services include:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Searchable database of sustainable materials</li>
                            <li>Verification of supplier sustainability claims</li>
                            <li>RFQ submission and management tools</li>
                            <li>Project collaboration features</li>
                        </ul>
                    </section>

                    <section className="text-slate-300">
                        <h2 className="text-2xl font-bold text-white mb-4">3. User Responsibilities</h2>
                        <p className="mb-4">You agree to:</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Provide accurate account information</li>
                            <li>Maintain the security of your account credentials</li>
                            <li>Use the platform for lawful purposes only</li>
                            <li>Not misrepresent your company or sustainability claims</li>
                            <li>Respect intellectual property rights</li>
                        </ul>
                    </section>

                    <section className="text-slate-300">
                        <h2 className="text-2xl font-bold text-white mb-4">4. Supplier Verification</h2>
                        <p>
                            While we verify supplier certifications and sustainability data to the best of our ability, GreenChainz is not liable for inaccuracies or changes in supplier status. Users should conduct their own due diligence.
                        </p>
                    </section>

                    <section className="text-slate-300">
                        <h2 className="text-2xl font-bold text-white mb-4">5. Limitation of Liability</h2>
                        <p>
                            GreenChainz provides the platform "as is" without warranties. We are not liable for indirect damages, lost profits, or third-party claims arising from platform use.
                        </p>
                    </section>

                    <section className="text-slate-300">
                        <h2 className="text-2xl font-bold text-white mb-4">6. Contact</h2>
                        <p>
                            For questions about these Terms, contact us at{' '}
                            <a href="mailto:legal@greenchainz.com" className="text-sky-400 hover:text-sky-300">
                                legal@greenchainz.com
                            </a>
                        </p>
                    </section>
                </div>

                <div className="mt-12 text-center">
                    <Link to="/" className="text-sky-400 hover:text-sky-300 transition">
                        ← Back to Home
                    </Link>
                </div>
            </div>
        </div>
    );
}
