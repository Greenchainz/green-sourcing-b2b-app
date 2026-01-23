'use client'

export default function TermsPage() {
    return (
        <div className="gc-page min-h-screen">
            <div className="gc-container py-20">
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="mb-12">
                        <h1 className="text-5xl font-bold text-slate-900 mb-4">Terms of Service</h1>
                        <p className="text-lg text-slate-600">
                            Last updated: <span className="font-semibold">January 2026</span>
                        </p>
                        <p className="text-slate-600 mt-4">
                            These Terms of Service govern your use of the GreenChainz B2B marketplace platform.
                        </p>
                    </div>

                    {/* Content */}
                    <div className="gc-card p-8 space-y-8 text-slate-700">
                        
                        {/* Acceptance of Terms */}
                        <section>
                            <h2 className="text-2xl font-bold text-slate-900 mb-4">1. Acceptance of Terms</h2>
                            <p className="mb-3">
                                By accessing or using GreenChainz ("the Platform," "Service," "we," "us," or "our"), you agree to be bound by these Terms of Service ("Terms") and our Privacy Policy.
                            </p>
                            <p className="mb-3">
                                If you do not agree to these Terms, you may not use the Platform.
                            </p>
                            <p>
                                <strong>Eligibility:</strong> You must be at least 18 years old and have the legal authority to enter into binding contracts to use GreenChainz. By using the Platform, you represent and warrant that you meet these requirements.
                            </p>
                        </section>

                        {/* User Accounts */}
                        <section>
                            <h2 className="text-2xl font-bold text-slate-900 mb-4">2. User Accounts</h2>
                            
                            <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">2.1 Account Types</h3>
                            <p className="mb-3">GreenChainz offers two types of accounts:</p>
                            <ul className="list-disc pl-6 space-y-2 mb-4">
                                <li>
                                    <strong>Architects (Buyers):</strong> Create Requests for Quotes (RFQs) to source verified sustainable materials. LinkedIn verification required for RFQ creation.
                                </li>
                                <li>
                                    <strong>Suppliers:</strong> List certified sustainable products and respond to RFQs. Must provide valid sustainability certifications.
                                </li>
                            </ul>

                            <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">2.2 Account Security</h3>
                            <p className="mb-3">You are responsible for:</p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>Maintaining the confidentiality of your account credentials</li>
                                <li>All activities that occur under your account</li>
                                <li>Notifying us immediately of any unauthorized access</li>
                            </ul>

                            <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">2.3 LinkedIn Verification</h3>
                            <p>
                                Architect accounts must be verified via LinkedIn OAuth to create RFQs. This ensures the integrity of our marketplace and prevents fraudulent requests. We only access the information you authorize through LinkedIn's consent screen.
                            </p>
                        </section>

                        {/* RFQ System */}
                        <section>
                            <h2 className="text-2xl font-bold text-slate-900 mb-4">3. RFQ System and Deposits</h2>
                            
                            <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">3.1 RFQ Deposit Requirement</h3>
                            <p className="mb-3">
                                To create a Request for Quote (RFQ), architects must pay a <strong>$50 refundable deposit</strong> per RFQ.
                            </p>
                            <p className="mb-3">
                                <strong>Purpose:</strong> The deposit ensures serious intent and reduces spam, protecting suppliers from fraudulent requests.
                            </p>

                            <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">3.2 Refund Policy</h3>
                            <p className="mb-3">Refunds are issued under the following conditions:</p>
                            <div className="bg-emerald-50 p-4 rounded-lg space-y-3 mb-4">
                                <div>
                                    <p className="font-semibold text-slate-900">✅ Full Refund (100%)</p>
                                    <ul className="list-disc pl-6 text-slate-700 mt-2 space-y-1">
                                        <li>No qualified supplier responses received within <strong>14 days</strong></li>
                                        <li>RFQ withdrawn within <strong>48 hours</strong> of creation</li>
                                    </ul>
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-900">❌ No Refund</p>
                                    <ul className="list-disc pl-6 text-slate-700 mt-2 space-y-1">
                                        <li>Supplier responses received and ignored by the buyer</li>
                                        <li>RFQ withdrawn after 48 hours with pending responses</li>
                                        <li>Buyer engages with suppliers but chooses not to proceed (business decision)</li>
                                    </ul>
                                </div>
                            </div>
                            <p className="text-sm text-slate-600">
                                Refunds are processed within 5-10 business days to the original payment method.
                            </p>

                            <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">3.3 Payment Processing</h3>
                            <p>
                                All payments are processed securely. We do not store credit card information on our servers.
                            </p>
                        </section>

                        {/* Verification Standards */}
                        <section>
                            <h2 className="text-2xl font-bold text-slate-900 mb-4">4. Verification Standards</h2>
                            
                            <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">4.1 Supplier Certification Requirements</h3>
                            <p className="mb-3">Suppliers must provide valid certifications, including but not limited to:</p>
                            <ul className="list-disc pl-6 space-y-2 mb-4">
                                <li><strong>FSC (Forest Stewardship Council):</strong> For wood and paper products</li>
                                <li><strong>EPD (Environmental Product Declaration):</strong> For carbon footprint transparency</li>
                                <li><strong>LEED Credits:</strong> Documentation of LEED-eligible products</li>
                                <li><strong>Cradle to Cradle, Green Seal, ISO 14001, etc.</strong></li>
                            </ul>

                            <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">4.2 Automated Verification</h3>
                            <p className="mb-3">
                                GreenChainz uses third-party APIs and Azure Document Intelligence to verify certifications. However, verification is provided <strong>"as is"</strong> and we do not guarantee the accuracy of third-party data.
                            </p>

                            <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">4.3 False Certification Claims</h3>
                            <p className="mb-3">
                                <strong>Zero tolerance policy:</strong> Suppliers who upload false or fraudulent certifications will face <strong>immediate account suspension</strong> and potential legal action.
                            </p>
                            <p>
                                Greenwashing (misleading sustainability claims) undermines the integrity of our marketplace and is strictly prohibited.
                            </p>
                        </section>

                        {/* Prohibited Activities */}
                        <section>
                            <h2 className="text-2xl font-bold text-slate-900 mb-4">5. Prohibited Activities</h2>
                            <p className="mb-4">You agree NOT to:</p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li><strong>Greenwashing:</strong> Make false or misleading sustainability claims about products or certifications</li>
                                <li><strong>Copyright Infringement:</strong> Upload materials (images, documents, text) without proper authorization</li>
                                <li><strong>Scraping/Automation:</strong> Use bots, scrapers, or automated tools to extract data from the Platform</li>
                                <li><strong>Harassment:</strong> Engage in abusive, discriminatory, or threatening behavior toward other users</li>
                                <li><strong>Anti-Competitive Behavior:</strong> Price fixing, collusion, or other anti-trust violations</li>
                                <li><strong>Spam:</strong> Send unsolicited messages or promotional content through the Platform</li>
                                <li><strong>Reverse Engineering:</strong> Attempt to decompile, reverse engineer, or access the Platform's source code</li>
                            </ul>
                            <p className="mt-4 text-sm text-slate-600">
                                Violation of these prohibitions may result in account suspension, termination, and/or legal action.
                            </p>
                        </section>

                        {/* Intellectual Property */}
                        <section>
                            <h2 className="text-2xl font-bold text-slate-900 mb-4">6. Intellectual Property</h2>
                            
                            <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">6.1 User Content Ownership</h3>
                            <p className="mb-3">
                                You retain ownership of all content you upload to GreenChainz (product descriptions, images, documents, certifications).
                            </p>

                            <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">6.2 License to GreenChainz</h3>
                            <p className="mb-3">
                                By uploading content, you grant GreenChainz a <strong>non-exclusive, worldwide, royalty-free license</strong> to:
                            </p>
                            <ul className="list-disc pl-6 space-y-2 mb-4">
                                <li>Display your content on the Platform</li>
                                <li>Process your content for verification (e.g., extract data from PDFs)</li>
                                <li>Use your content for AI training and recommendation algorithms</li>
                            </ul>
                            <p className="text-sm text-slate-600">
                                This license terminates when you delete your content or close your account (subject to backup retention policies).
                            </p>

                            <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">6.3 GreenChainz Platform IP</h3>
                            <p>
                                GreenChainz owns all intellectual property rights to the Platform, including but not limited to:
                            </p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>Source code, algorithms, and AI models</li>
                                <li>GreenChainz brand, logo, and design elements</li>
                                <li>Verification scoring methodology</li>
                            </ul>
                        </section>

                        {/* Limitation of Liability */}
                        <section>
                            <h2 className="text-2xl font-bold text-slate-900 mb-4">7. Limitation of Liability</h2>
                            
                            <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">7.1 Marketplace Platform Role</h3>
                            <p className="mb-4">
                                GreenChainz is a <strong>marketplace platform</strong> that connects buyers and suppliers. We are <strong>NOT</strong> a party to transactions between users and are not liable for:
                            </p>
                            <ul className="list-disc pl-6 space-y-2 mb-4">
                                <li><strong>Product Quality:</strong> Defects, delays, or non-delivery of materials purchased through the Platform</li>
                                <li><strong>Certification Accuracy:</strong> Errors in third-party certification data (FSC, EPD, etc.)</li>
                                <li><strong>Business Losses:</strong> Lost profits, project delays, or opportunity costs from failed transactions</li>
                                <li><strong>User Conduct:</strong> Disputes, breaches of contract, or illegal activity between users</li>
                            </ul>

                            <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">7.2 Maximum Liability Cap</h3>
                            <p className="mb-3">
                                To the fullest extent permitted by law, GreenChainz's total liability for any claims arising from your use of the Platform is limited to:
                            </p>
                            <div className="bg-slate-50 p-4 rounded-lg">
                                <p className="font-semibold text-slate-900">
                                    The amount you paid to GreenChainz in the 12 months preceding the claim (e.g., RFQ deposits, subscription fees).
                                </p>
                            </div>

                            <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">7.3 Disclaimer of Warranties</h3>
                            <p>
                                THE PLATFORM IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.
                            </p>
                        </section>

                        {/* Dispute Resolution */}
                        <section>
                            <h2 className="text-2xl font-bold text-slate-900 mb-4">8. Dispute Resolution</h2>
                            
                            <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">8.1 Informal Resolution</h3>
                            <p className="mb-3">
                                Before initiating legal action, you agree to attempt informal resolution by contacting us at{' '}
                                <a href="mailto:legal@greenchainz.com" className="text-emerald-600 hover:text-emerald-700 underline">
                                    legal@greenchainz.com
                                </a>{' '}
                                and negotiating in good faith for <strong>30 days</strong>.
                            </p>

                            <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">8.2 Binding Arbitration</h3>
                            <p className="mb-3">
                                If informal resolution fails, disputes will be resolved through <strong>binding arbitration</strong> administered by <strong>JAMS (Judicial Arbitration and Mediation Services)</strong> in accordance with its Comprehensive Arbitration Rules.
                            </p>
                            <ul className="list-disc pl-6 space-y-2 mb-4">
                                <li><strong>Location:</strong> Seattle, Washington</li>
                                <li><strong>Governing Law:</strong> Washington State law</li>
                                <li><strong>Language:</strong> English</li>
                                <li><strong>Costs:</strong> Each party pays their own legal fees unless otherwise awarded by the arbitrator</li>
                            </ul>

                            <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">8.3 Class Action Waiver</h3>
                            <p>
                                You agree to resolve disputes on an <strong>individual basis</strong> and waive the right to participate in class actions, class arbitrations, or representative actions.
                            </p>
                        </section>

                        {/* Termination */}
                        <section>
                            <h2 className="text-2xl font-bold text-slate-900 mb-4">9. Termination</h2>
                            
                            <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">9.1 Termination by Users</h3>
                            <p>
                                You may terminate your account at any time through your account settings or by contacting us at{' '}
                                <a href="mailto:founder@greenchainz.com" className="text-emerald-600 hover:text-emerald-700 underline">
                                    founder@greenchainz.com
                                </a>.
                            </p>

                            <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">9.2 Termination by GreenChainz</h3>
                            <p className="mb-3">
                                We may suspend or terminate your account immediately, without prior notice, if you:
                            </p>
                            <ul className="list-disc pl-6 space-y-2 mb-4">
                                <li>Violate these Terms of Service</li>
                                <li>Upload false certifications or engage in greenwashing</li>
                                <li>Engage in fraudulent or illegal activity</li>
                                <li>Harass other users or staff</li>
                            </ul>

                            <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">9.3 Data Deletion</h3>
                            <p>
                                Upon account termination, your data will be deleted in accordance with our <strong>90-day grace period</strong> policy (see Privacy Policy). Transaction records are retained for 7 years for legal compliance.
                            </p>
                        </section>

                        {/* Changes to Terms */}
                        <section>
                            <h2 className="text-2xl font-bold text-slate-900 mb-4">10. Changes to Terms</h2>
                            <p className="mb-3">
                                We may update these Terms of Service from time to time. We will notify you of significant changes via:
                            </p>
                            <ul className="list-disc pl-6 space-y-2 mb-4">
                                <li>Email to your registered email address</li>
                                <li>Prominent notice on the Platform homepage</li>
                                <li>At least <strong>30 days advance notice</strong> for material changes</li>
                            </ul>
                            <p>
                                Continued use of the Platform after changes are posted constitutes acceptance of the updated Terms.
                            </p>
                        </section>

                        {/* Miscellaneous */}
                        <section>
                            <h2 className="text-2xl font-bold text-slate-900 mb-4">11. Miscellaneous</h2>
                            
                            <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">11.1 Governing Law</h3>
                            <p>
                                These Terms are governed by the laws of the State of <strong>Washington</strong>, without regard to its conflict of law provisions.
                            </p>

                            <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">11.2 Severability</h3>
                            <p>
                                If any provision of these Terms is found to be invalid or unenforceable, the remaining provisions will continue in full force and effect.
                            </p>

                            <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">11.3 Entire Agreement</h3>
                            <p>
                                These Terms, together with our Privacy Policy, constitute the entire agreement between you and GreenChainz regarding the Platform.
                            </p>

                            <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">11.4 Assignment</h3>
                            <p>
                                You may not assign or transfer these Terms without our prior written consent. We may assign these Terms to any successor entity.
                            </p>
                        </section>

                        {/* Contact */}
                        <section className="border-t border-slate-200 pt-8">
                            <h2 className="text-2xl font-bold text-slate-900 mb-4">12. Contact Information</h2>
                            <p className="mb-4">
                                For questions about these Terms of Service, contact:
                            </p>
                            <div className="bg-emerald-50 p-6 rounded-lg">
                                <p className="font-semibold text-slate-900 mb-2">GreenChainz Legal Team</p>
                                <p className="text-slate-700">
                                    Legal inquiries:{' '}
                                    <a href="mailto:legal@greenchainz.com" className="text-emerald-600 hover:text-emerald-700 underline font-semibold">
                                        legal@greenchainz.com
                                    </a>
                                </p>
                                <p className="text-slate-700 mt-1">
                                    General support:{' '}
                                    <a href="mailto:founder@greenchainz.com" className="text-emerald-600 hover:text-emerald-700 underline">
                                        founder@greenchainz.com
                                    </a>
                                </p>
                            </div>
                        </section>

                    </div>
                </div>
            </div>
        </div>
    )
}
