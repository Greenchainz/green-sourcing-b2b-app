import { Link } from 'react-router-dom';
import Logo from '../components/Logo';
import Footer from '../components/Footer';

export default function Privacy() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
            <header className="border-b border-slate-800/50 bg-slate-950/50 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <Logo height={40} showText={true} />
                </div>
            </header>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
                <h1 className="text-4xl font-bold text-white mb-6">Privacy Policy</h1>
                <p className="text-slate-400 mb-8">Last Updated: November 17, 2025</p>

                <div className="prose prose-invert max-w-none space-y-8">
                    <section className="text-slate-300">
                        <h2 className="text-2xl font-bold text-white mb-4">Data Collection</h2>
                        <p>We collect information you provide directly to us, such as when you create an account, submit a request for quotation (RFQ), or communicate with us. This information may include your name, email address, company name, and project details. We also automatically collect technical data, such as your IP address, browser type, and usage information through cookies and similar technologies.</p>
                    </section>

                    <section className="text-slate-300">
                        <h2 className="text-2xl font-bold text-white mb-4">Use of Data</h2>
                        <p>Your data is used to operate and maintain the GreenChainz platform, to facilitate communication between buyers and suppliers, to process transactions, to improve our services, and to send you relevant marketing communications, which you can opt out of at any time.</p>
                    </section>

                    <section className="text-slate-300">
                        <h2 className="text-2xl font-bold text-white mb-4">Data Sharing and Disclosure</h2>
                        <p>We do not sell your personal data. We may share your information with third-party service providers who perform services on our behalf, such as payment processing and data analytics. We may also share information with suppliers when you submit an RFQ. We will disclose your information where required by law.</p>
                    </section>

                    <section className="text-slate-300">
                        <h2 className="text-2xl font-bold text-white mb-4">User Rights (GDPR/CCPA)</h2>
                        <p>You have the right to access, correct, or delete your personal data. You also have the right to restrict or object to certain processing activities and to request a portable copy of your data. To exercise these rights, please contact us. If you are a California resident, you have specific rights under the CCPA, including the right to know what personal information is being collected and the right to opt-out of the sale of your personal information.</p>
                    </section>

                    <section className="text-slate-300">
                        <h2 className="text-2xl font-bold text-white mb-4">Contact</h2>
                        <p>
                            If you have any questions or concerns about this Privacy Policy, please contact us at <a href="mailto:privacy@greenchainz.com" className="text-sky-400 hover:text-sky-300">privacy@greenchainz.com</a>.
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