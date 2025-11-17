import { Link } from 'react-router-dom';
import Logo from '../components/Logo';
import Footer from '../components/Footer';

export default function Terms() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
            <header className="border-b border-slate-800/50 bg-slate-950/50 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <Logo height={40} showText={true} />
                </div>
            </header>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
                <h1 className="text-4xl font-bold text-white mb-6">Terms of Service</h1>
                <p className="text-slate-400 mb-8">Last Updated: November 17, 2025</p>

                <div className="prose prose-invert max-w-none space-y-8">
                    <section className="text-slate-300">
                        <h2 className="text-2xl font-bold text-white mb-4">Platform Rules</h2>
                        <p>You agree not to misuse the GreenChainz platform. This includes engaging in any activity that is illegal, fraudulent, or harmful to others. You will not attempt to compromise the security of the platform, introduce malicious software, or scrape data without authorization.</p>
                    </section>

                    <section className="text-slate-300">
                        <h2 className="text-2xl font-bold text-white mb-4">Supplier Obligations</h2>
                        <p>As a supplier, you are obligated to provide accurate and verifiable information about your products, including all sustainability certifications and data. You must maintain the quality of your listings and fulfill any RFQs you accept in a timely and professional manner.</p>
                    </section>

                    <section className="text-slate-300">
                        <h2 className="text-2xl font-bold text-white mb-4">Buyer Conduct</h2>
                        <p>As a buyer, you agree to use the platform for legitimate business purposes only. You will communicate with suppliers professionally and will not submit fraudulent or misleading RFQs. All interactions should be conducted in good faith.</p>
                    </section>

                    <section className="text-slate-300">
                        <h2 className="text-2xl font-bold text-white mb-4">Dispute Resolution</h2>
                        <p>Any disputes arising between you and GreenChainz will be resolved through binding arbitration. Disputes between buyers and suppliers are to be resolved directly between the parties. GreenChainz may, but is not obligated to, provide assistance in mediating such disputes.</p>
                    </section>

                    <section className="text-slate-300">
                        <h2 className="text-2xl font-bold text-white mb-4">Limitation of Liability</h2>
                        <p>GreenChainz provides the platform on an "as is" basis. We are not responsible for any damages or losses resulting from your use of the platform, including but not limited to lost profits, business interruption, or reputational harm. Our liability in any matter is limited to the amount of fees you have paid to us in the preceding twelve months.</p>
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