import { Link } from 'react-router-dom';

export default function Privacy() {
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
                <h1 className="text-4xl font-bold text-white mb-6">Privacy Policy</h1>
                <p className="text-slate-400 mb-8">Last updated: November 13, 2025</p>

                <div className="prose prose-invert max-w-none space-y-8">
                    <section className="text-slate-300">
                        <h2 className="text-2xl font-bold text-white mb-4">1. Information We Collect</h2>
                        <p className="mb-4">
                            GreenChainz collects information to provide better services to all our users. We collect information in the following ways:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Information you provide (name, email, company details)</li>
                            <li>Usage data (search queries, materials viewed, RFQs sent)</li>
                            <li>Device information (browser type, IP address, location)</li>
                        </ul>
                    </section>

                    <section className="text-slate-300">
                        <h2 className="text-2xl font-bold text-white mb-4">2. How We Use Information</h2>
                        <p className="mb-4">We use the information we collect to:</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Provide, maintain, and improve our services</li>
                            <li>Connect you with verified sustainable suppliers</li>
                            <li>Send you relevant updates and notifications</li>
                            <li>Analyze usage patterns to enhance user experience</li>
                        </ul>
                    </section>

                    <section className="text-slate-300">
                        <h2 className="text-2xl font-bold text-white mb-4">3. Data Sharing</h2>
                        <p className="mb-4">
                            We do not sell your personal information. We share data only with:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Suppliers you contact via RFQs</li>
                            <li>Service providers (hosting, analytics)</li>
                            <li>Legal authorities when required by law</li>
                        </ul>
                    </section>

                    <section className="text-slate-300">
                        <h2 className="text-2xl font-bold text-white mb-4">4. Your Rights</h2>
                        <p className="mb-4">You have the right to:</p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Access your personal data</li>
                            <li>Request data correction or deletion</li>
                            <li>Opt out of marketing communications</li>
                            <li>Export your data</li>
                        </ul>
                    </section>

                    <section className="text-slate-300">
                        <h2 className="text-2xl font-bold text-white mb-4">5. Contact Us</h2>
                        <p>
                            For privacy-related questions, email us at{' '}
                            <a href="mailto:privacy@greenchainz.com" className="text-sky-400 hover:text-sky-300">
                                privacy@greenchainz.com
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
