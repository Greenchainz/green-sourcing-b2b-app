'use client'

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
                <h1 className="text-5xl font-bold text-slate-900 mb-6">Privacy Policy</h1>
                <p className="text-slate-600 mb-12">Last updated: January 2026</p>

                <div className="bg-white rounded-lg shadow-md p-8 space-y-6 text-slate-600">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-3">Introduction</h2>
                        <p>GreenChainz is committed to protecting your privacy and ensuring you have a positive experience on our platform.</p>
                    </div>

                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-3">Information Collection</h2>
                        <p>We collect information you provide directly, including account information and usage data.</p>
                    </div>

                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-3">Data Protection</h2>
                        <p>Your data is protected with industry-standard encryption and security measures.</p>
                    </div>

                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-3">Contact Us</h2>
                        <p>For privacy questions, contact us at <a href="mailto:privacy@greenchainz.com" className="text-blue-600 hover:text-blue-700">privacy@greenchainz.com</a></p>
                    </div>
                </div>
            </div>
        </div>
    )
}
