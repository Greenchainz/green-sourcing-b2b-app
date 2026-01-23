'use client'

export default function PrivacyPage() {
    return (
        <div className="gc-page min-h-screen">
            <div className="gc-container py-20">
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="mb-12">
                        <h1 className="text-5xl font-bold text-slate-900 mb-4">Privacy Policy</h1>
                        <p className="text-lg text-slate-600">
                            Last updated: <span className="font-semibold">January 2026</span>
                        </p>
                        <p className="text-slate-600 mt-4">
                            GreenChainz is committed to protecting your privacy and ensuring transparency in how we collect, use, and protect your data.
                        </p>
                    </div>

                    {/* Content */}
                    <div className="gc-card p-8 space-y-8 text-slate-700">
                        
                        {/* Introduction */}
                        <section>
                            <h2 className="text-2xl font-bold text-slate-900 mb-4">1. Introduction</h2>
                            <p className="mb-3">
                                GreenChainz ("we," "our," or "us") operates the GreenChainz B2B marketplace platform. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.
                            </p>
                            <p>
                                By using GreenChainz, you agree to the collection and use of information in accordance with this policy. If you do not agree, please discontinue use of our services.
                            </p>
                        </section>

                        {/* Data Collection */}
                        <section>
                            <h2 className="text-2xl font-bold text-slate-900 mb-4">2. Information We Collect</h2>
                            
                            <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">2.1 Account Information</h3>
                            <p className="mb-3">When you create an account, we collect:</p>
                            <ul className="list-disc pl-6 space-y-2 mb-4">
                                <li><strong>Personal Details:</strong> Name, email address, company name, job title/role</li>
                                <li><strong>Account Type:</strong> Whether you register as an Architect (buyer) or Supplier</li>
                                <li><strong>Company Information:</strong> Business address, phone number, website URL</li>
                            </ul>

                            <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">2.2 LinkedIn OAuth Data</h3>
                            <p className="mb-3">When you authenticate via LinkedIn, we collect:</p>
                            <ul className="list-disc pl-6 space-y-2 mb-4">
                                <li>Name and email address from your LinkedIn profile</li>
                                <li>Company name and job title (for buyer verification)</li>
                                <li>LinkedIn profile URL (to verify professional credentials)</li>
                            </ul>
                            <p className="text-sm text-slate-600">
                                Note: We only collect information you explicitly authorize via LinkedIn's OAuth consent screen. We do not access your LinkedIn connections, messages, or other private data.
                            </p>

                            <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">2.3 Usage Data</h3>
                            <p className="mb-3">We automatically collect information about how you interact with our platform:</p>
                            <ul className="list-disc pl-6 space-y-2 mb-4">
                                <li><strong>RFQ Activity:</strong> Requests for Quotes (RFQs) you create or respond to</li>
                                <li><strong>Search Queries:</strong> Materials, suppliers, and certifications you search for</li>
                                <li><strong>Product Views:</strong> Materials and supplier profiles you view</li>
                                <li><strong>Platform Analytics:</strong> Pages visited, time spent, click patterns (via Azure Application Insights)</li>
                                <li><strong>Device Information:</strong> IP address, browser type, operating system, device identifiers</li>
                            </ul>

                            <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">2.4 Payment Information</h3>
                            <p className="mb-3">
                                Payment processing for RFQ deposits ($50 refundable) is handled securely. We do not store credit card numbers, CVV codes, or other sensitive payment details on our servers.
                            </p>

                            <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">2.5 Uploaded Documents</h3>
                            <p className="mb-3">We collect files you upload, including:</p>
                            <ul className="list-disc pl-6 space-y-2 mb-4">
                                <li><strong>Certifications:</strong> EPDs, FSC certificates, LEED documents</li>
                                <li><strong>Product Documents:</strong> Technical data sheets, product images</li>
                                <li><strong>RFQ Attachments:</strong> Project specifications, drawings, material requirements</li>
                            </ul>
                        </section>

                        {/* Azure Services */}
                        <section>
                            <h2 className="text-2xl font-bold text-slate-900 mb-4">3. Azure Services Data Processing</h2>
                            <p className="mb-4">
                                GreenChainz is built 100% on Microsoft Azure infrastructure. Your data is processed using the following Azure services, all subject to Microsoft's{' '}
                                <a href="https://www.microsoft.com/licensing/docs/view/Online-Services-Terms" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:text-emerald-700 underline">
                                    Data Processing Agreement
                                </a>:
                            </p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li><strong>Azure PostgreSQL (Database):</strong> Stores account information, RFQs, supplier data</li>
                                <li><strong>Azure Redis Cache:</strong> Session data (ephemeral - deleted after logout or 24 hours)</li>
                                <li><strong>Azure Blob Storage:</strong> Uploaded documents, product images, certifications</li>
                                <li><strong>Azure Document Intelligence (Form Recognizer):</strong> Processes PDFs to extract certification data</li>
                                <li><strong>Azure AI Foundry (OpenAI):</strong> AI agent interactions for RFQ matching and recommendations</li>
                                <li><strong>Azure Application Insights:</strong> Anonymous usage analytics and error monitoring</li>
                            </ul>
                            <p className="mt-4 text-sm text-slate-600">
                                Data residency: All data is stored in Azure's <strong>US East</strong> region (Virginia) for compliance with US data protection laws.
                            </p>
                        </section>

                        {/* Third-Party Integrations */}
                        <section>
                            <h2 className="text-2xl font-bold text-slate-900 mb-4">4. Third-Party Integrations</h2>
                            <ul className="list-disc pl-6 space-y-3">
                                <li>
                                    <strong>LinkedIn OAuth:</strong> Authenticates architect accounts for RFQ creation.{' '}
                                    <a href="https://www.linkedin.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:text-emerald-700 underline">
                                        Privacy Policy
                                    </a>
                                </li>
                                <li>
                                    <strong>Azure OpenAI:</strong> Processes AI agent queries. Subject to Microsoft's{' '}
                                    <a href="https://azure.microsoft.com/en-us/support/legal/cognitive-services-openai-data-privacy/" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:text-emerald-700 underline">
                                        Azure OpenAI Data Privacy Policy
                                    </a>
                                </li>
                            </ul>
                        </section>

                        {/* Cookies */}
                        <section>
                            <h2 className="text-2xl font-bold text-slate-900 mb-4">5. Cookies and Tracking Technologies</h2>
                            <p className="mb-4">
                                We use <strong>strictly necessary cookies</strong> to provide authentication and security. These cookies are exempt from consent requirements under GDPR Article 6(1)(b) as they are essential to provide the service you requested.
                            </p>
                            
                            <h3 className="text-lg font-semibold text-slate-900 mb-3">Cookies We Use:</h3>
                            <div className="bg-slate-50 p-4 rounded-lg space-y-3">
                                <div>
                                    <p className="font-semibold text-slate-900">next-auth.session-token</p>
                                    <p className="text-sm text-slate-600">Maintains your login session. Expires: 30 days or on logout.</p>
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-900">next-auth.csrf-token</p>
                                    <p className="text-sm text-slate-600">Prevents cross-site request forgery (CSRF) attacks. Expires: Session.</p>
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-900">next-auth.state</p>
                                    <p className="text-sm text-slate-600">Validates OAuth authentication flow (LinkedIn login). Expires: 15 minutes.</p>
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-900">next-auth.callback-url</p>
                                    <p className="text-sm text-slate-600">Stores the URL to redirect after authentication. Expires: Session.</p>
                                </div>
                            </div>
                            
                            <p className="mt-4 text-sm text-slate-600">
                                <strong>No tracking or advertising cookies:</strong> We do not use cookies for tracking, profiling, or marketing purposes. All cookies are deleted when you log out or when your session expires.
                            </p>
                        </section>

                        {/* User Rights (GDPR/CCPA) */}
                        <section>
                            <h2 className="text-2xl font-bold text-slate-900 mb-4">6. Your Privacy Rights</h2>
                            <p className="mb-4">
                                Under GDPR (Europe) and CCPA (California), you have the following rights:
                            </p>
                            
                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-900 mb-2">Right to Access</h3>
                                    <p className="text-slate-700">Request a copy of all personal data we hold about you. We'll provide this in a structured, machine-readable format (JSON or CSV).</p>
                                </div>
                                
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-900 mb-2">Right to Deletion ("Right to Be Forgotten")</h3>
                                    <p className="text-slate-700">Request permanent deletion of your account and all associated data. See Section 7 (Data Retention) for details on our deletion process.</p>
                                </div>
                                
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-900 mb-2">Right to Data Portability</h3>
                                    <p className="text-slate-700">Export your data to use with another service. Available formats: JSON, CSV.</p>
                                </div>
                                
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-900 mb-2">Right to Opt-Out of Marketing</h3>
                                    <p className="text-slate-700">We do not send marketing emails without your explicit consent. You can unsubscribe from all non-transactional emails at any time.</p>
                                </div>
                                
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-900 mb-2">Right to Correction</h3>
                                    <p className="text-slate-700">Update incorrect or incomplete personal information via your account settings or by contacting us.</p>
                                </div>
                            </div>
                            
                            <p className="mt-6 font-semibold text-slate-900">
                                To exercise any of these rights, email:{' '}
                                <a href="mailto:privacy@greenchainz.com" className="text-emerald-600 hover:text-emerald-700 underline">
                                    privacy@greenchainz.com
                                </a>
                            </p>
                            <p className="text-sm text-slate-600 mt-2">
                                We will respond within 30 days (GDPR) or 45 days (CCPA).
                            </p>
                        </section>

                        {/* Data Retention */}
                        <section>
                            <h2 className="text-2xl font-bold text-slate-900 mb-4">7. Data Retention</h2>
                            <ul className="list-disc pl-6 space-y-2">
                                <li><strong>Active Accounts:</strong> Data is retained indefinitely while your account is active.</li>
                                <li><strong>Deleted Accounts:</strong> 90-day grace period for account recovery, then permanent deletion from all systems (database, backups, logs).</li>
                                <li><strong>Transaction Records:</strong> Retained for 7 years to comply with financial recordkeeping laws (IRS, SOX).</li>
                                <li><strong>Analytics Data:</strong> Aggregated, anonymized usage data retained for 24 months.</li>
                                <li><strong>Security Logs:</strong> IP addresses, access logs retained for 90 days for fraud prevention and security audits.</li>
                            </ul>
                            <p className="mt-4 text-sm text-slate-600">
                                Note: Transaction records (RFQ payments, invoices) are retained for legal compliance even after account deletion, but are anonymized (names/emails removed).
                            </p>
                        </section>

                        {/* Security */}
                        <section>
                            <h2 className="text-2xl font-bold text-slate-900 mb-4">8. Data Security</h2>
                            <p className="mb-4">We implement industry-standard security measures to protect your data:</p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li><strong>Encryption in Transit:</strong> TLS 1.3 for all data transmitted over the internet</li>
                                <li><strong>Encryption at Rest:</strong> Azure-managed encryption keys (AES-256) for database and storage</li>
                                <li><strong>Authentication:</strong> OAuth 2.0 (LinkedIn) and JWT tokens for secure API access</li>
                                <li><strong>Access Controls:</strong> Role-based access control (RBAC) and least-privilege principle</li>
                                <li><strong>Security Audits:</strong> Quarterly penetration testing and vulnerability scans</li>
                                <li><strong>Compliance:</strong> SOC 2 Type II certification (in progress - expected Q2 2026)</li>
                            </ul>
                            <p className="mt-4 text-sm text-slate-600">
                                Despite our best efforts, no method of transmission over the internet or electronic storage is 100% secure. We cannot guarantee absolute security.
                            </p>
                        </section>

                        {/* Data Sharing */}
                        <section>
                            <h2 className="text-2xl font-bold text-slate-900 mb-4">9. How We Share Your Information</h2>
                            <p className="mb-4">We do not sell your personal data. We share data only in the following circumstances:</p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li><strong>With Other Users:</strong> Your name, company, and contact information are visible to users you engage with (RFQ responses, messages).</li>
                                <li><strong>Service Providers:</strong> Microsoft Azure (infrastructure), LinkedIn (authentication) - all under data processing agreements.</li>
                                <li><strong>Legal Compliance:</strong> If required by law, court order, or government request.</li>
                                <li><strong>Business Transfers:</strong> In the event of a merger, acquisition, or asset sale, user data may be transferred (you will be notified).</li>
                            </ul>
                        </section>

                        {/* Children's Privacy */}
                        <section>
                            <h2 className="text-2xl font-bold text-slate-900 mb-4">10. Children's Privacy</h2>
                            <p>
                                GreenChainz is a B2B platform for professionals. We do not knowingly collect data from individuals under 18 years of age. If we discover we have collected data from a minor, we will delete it immediately.
                            </p>
                        </section>

                        {/* International Data Transfers */}
                        <section>
                            <h2 className="text-2xl font-bold text-slate-900 mb-4">11. International Data Transfers</h2>
                            <p className="mb-3">
                                GreenChainz operates in the United States. If you access our platform from outside the US, your data will be transferred to and processed in the US.
                            </p>
                            <p className="text-sm text-slate-600">
                                For EU users: Microsoft Azure complies with the EU-US Data Privacy Framework and provides Standard Contractual Clauses (SCCs) for data transfers.
                            </p>
                        </section>

                        {/* Changes to Policy */}
                        <section>
                            <h2 className="text-2xl font-bold text-slate-900 mb-4">12. Changes to This Privacy Policy</h2>
                            <p className="mb-3">
                                We may update this Privacy Policy periodically. We will notify you of significant changes via email or a prominent notice on our platform.
                            </p>
                            <p>
                                Continued use of GreenChainz after changes are posted constitutes acceptance of the updated policy.
                            </p>
                        </section>

                        {/* Contact */}
                        <section className="border-t border-slate-200 pt-8">
                            <h2 className="text-2xl font-bold text-slate-900 mb-4">13. Contact Us</h2>
                            <p className="mb-4">
                                For questions about this Privacy Policy or to exercise your privacy rights, contact:
                            </p>
                            <div className="bg-emerald-50 p-6 rounded-lg">
                                <p className="font-semibold text-slate-900 mb-2">GreenChainz Privacy Team</p>
                                <p className="text-slate-700">
                                    Email:{' '}
                                    <a href="mailto:privacy@greenchainz.com" className="text-emerald-600 hover:text-emerald-700 underline font-semibold">
                                        privacy@greenchainz.com
                                    </a>
                                </p>
                                <p className="text-slate-700 mt-1">
                                    General inquiries:{' '}
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
