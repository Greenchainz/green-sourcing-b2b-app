'use client'

export default function SupplierAgreementPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
                <h1 className="text-5xl font-bold text-slate-900 mb-6">Supplier Agreement</h1>
                <p className="text-slate-600 mb-12">Last updated: January 2026</p>

                <div className="bg-white rounded-lg shadow-md p-8 space-y-6 text-slate-600">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-3">Agreement Overview</h2>
                        <p>This Supplier Agreement establishes the terms and conditions for suppliers using the GreenChainz platform.</p>
                    </div>

                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-3">Supplier Responsibilities</h2>
                        <ul className="list-disc list-inside space-y-2">
                            <li>Maintain accurate product and sustainability information</li>
                            <li>Comply with all applicable laws and regulations</li>
                            <li>Respond to verification requests in a timely manner</li>
                            <li>Update certifications and compliance documentation</li>
                        </ul>
                    </div>

                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-3">Data Privacy</h2>
                        <p>Supplier data is protected and only shared with authorized buyers through the GreenChainz platform.</p>
                    </div>

                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-3">Verification Process</h2>
                        <p>GreenChainz verifies supplier claims through multiple data providers and certification bodies to ensure accuracy and authenticity.</p>
                    </div>

                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-3">Contact</h2>
                        <p>For questions about this agreement, contact us at <a href="mailto:suppliers@greenchainz.com" className="text-blue-600 hover:text-blue-700">suppliers@greenchainz.com</a></p>
                    </div>
                </div>
            </div>
        </div>
    )
}
