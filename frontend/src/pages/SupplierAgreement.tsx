import { Link } from 'react-router-dom';
import Logo from '../components/Logo';
import Footer from '../components/Footer';

export default function SupplierAgreement() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
            <header className="border-b border-slate-800/50 bg-slate-950/50 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <Logo height={40} showText={true} />
                </div>
            </header>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
                <h1 className="text-4xl font-bold text-white mb-6">Supplier Agreement</h1>
                <p className="text-slate-400 mb-8">Last Updated: November 17, 2025</p>

                <div className="prose prose-invert max-w-none space-y-8">
                    <section className="text-slate-300">
                        <h2 className="text-2xl font-bold text-white mb-4">1. Scope of Services</h2>
                        <p>
                            This agreement governs your use of the GreenChainz platform as a supplier. By registering as a supplier, you agree to provide accurate and up-to-date information about your products, including all relevant certifications and sustainability data. You will have access to our marketplace to list your products and connect with potential buyers.
                        </p>
                    </section>

                    <section className="text-slate-300">
                        <h2 className="text-2xl font-bold text-white mb-4">2. Payment Terms</h2>
                        <p>
                            GreenChainz offers a tiered subscription model for suppliers. Subscription fees are billed on a recurring basis (monthly or annually) as selected at the time of registration. All fees are non-refundable, except as required by law. Failure to pay subscription fees may result in the suspension or termination of your account.
                        </p>
                    </section>

                    <section className="text-slate-300">
                        <h2 className="text-2xl font-bold text-white mb-4">3. Quality Standards</h2>
                        <p>
                            You agree to maintain the highest standards of quality for all products listed on the GreenChainz platform. All sustainability claims, certifications, and product data must be accurate, verifiable, and comply with all applicable laws and regulations. We reserve the right to remove any listings that do not meet our quality standards or that we believe to be misleading.
                        </p>
                    </section>

                    <section className="text-slate-300">
                        <h2 className="text-2xl font-bold text-white mb-4">4. Confidentiality</h2>
                        <p>
                            During the course of our business relationship, you may have access to confidential information, including but not limited to our business practices, customer lists, and platform technology. You agree to keep this information confidential and not to disclose it to any third party without our prior written consent.
                        </p>
                    </section>

                    <section className="text-slate-300">
                        <h2 className="text-2xl font-bold text-white mb-4">5. Term and Termination</h2>
                        <p>
                            This agreement will remain in effect as long as you maintain a supplier account on the GreenChainz platform. We may terminate or suspend your account at any time, without notice, for any reason, including but not limited to a breach of this agreement. You may cancel your subscription at any time, but you will not be entitled to a refund for any fees already paid.
                        </p>
                    </section>
                </div>

                <div className="mt-12 text-center">
                    <Link to="/" className="text-sky-400 hover:text-sky-300 transition">
                        ← Back to Home
                    </Link>
                </div>
            </div>
            <Footer />
        </div>
    );
}