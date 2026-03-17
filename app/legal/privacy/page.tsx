'use client'

export default function PrivacyPage() {
  const lastUpdated = new Date().toISOString().split('T')[0]

  return (
    <div className="gc-page min-h-screen">
      <div className="gc-container py-20">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-12">
            <h1 className="text-5xl font-bold text-slate-900 mb-4">Privacy Policy</h1>
            <p className="text-lg text-slate-600">
              Last updated: <span className="font-semibold">{lastUpdated}</span>
            </p>
            <p className="text-slate-600 mt-4">
              GreenChainz is committed to protecting your privacy and ensuring transparency in how we collect, use, and protect your data.
            </p>
          </div>

          {/* Content */}
          <div className="gc-card p-8 space-y-8 text-slate-700">
            {/* Combined Introduction */}
            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">1. Introduction</h2>
              <p className="mb-3">
                GreenChainz ("we," "our," or "us") operates the GreenChainz B2B marketplace platform. This Privacy Policy explains how we collect,
                use, disclose, and safeguard your information when you use our services.
              </p>
              <p>
                By using GreenChainz, you agree to the collection and use of information in accordance with this policy. If you do not agree, please discontinue use of our services.
              </p>
            </section>

            {/* Data Collection */}
            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">2. Information We Collect</h2>

              <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">2.1 Account Information</h3>
              <p className="mb-3">When you create an account, we may collect:</p>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li><strong>Personal Details:</strong> Name, email address, company name, job title/role</li>
                <li><strong>Account Type:</strong> Whether you register as an Architect (buyer) or Supplier</li>
                <li><strong>Company Information:</strong> Business address, phone number, website URL</li>
                <li><strong>SSO Profile Data:</strong> Profile information provided by SSO providers (Microsoft Entra ID, Google, LinkedIn)</li>
              </ul>

              <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">2.2 OAuth / SSO Data</h3>
              <p className="mb-3">When you authenticate via a third-party SSO (LinkedIn, Microsoft Entra ID, Google), we collect only the profile data you consent to share:</p>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li>Name and email address</li>
                <li>Company name and job title (used for buyer verification)</li>
                <li>Profile URL (to verify professional credentials)</li>
              </ul>
              <p className="text-sm text-slate-600">
                Note: We only access data you explicitly authorize via the provider's consent screen. We do not access private messages or connections.
              </p>

              <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">2.3 Usage Data</h3>
              <p className="mb-3">We automatically collect information about how you interact with our platform:</p>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li><strong>RFQ Activity:</strong> Requests for Quotes you create or respond to</li>
                <li><strong>Search Queries:</strong> Materials, suppliers, and certifications you search for</li>
                <li><strong>Product Views:</strong> Materials and supplier profiles you view</li>
                <li><strong>Platform Analytics:</strong> Pages visited, time spent, click patterns (via Azure Application Insights and optionally Google Analytics)</li>
                <li><strong>Device Information:</strong> IP address, browser type, operating system, device identifiers</li>
              </ul>

              <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">2.4 Payment Information</h3>
              <p className="mb-3">
                Payment processing for RFQ deposits and other transactions is handled securely by our payment processors. We do not store credit card numbers, CVV codes, or other sensitive payment details on our servers.
              </p>

              <h3 className="text-xl font-semibold text-slate-900 mb-3 mt-6">2.5 Uploaded Documents</h3>
              <p className="mb-3">We collect files you upload, including:</p>
              <ul className="list-disc pl-6 space-y-2 mb-4">
                <li><strong>Certifications:</strong> EPDs, FSC certificates, LEED documents</li>
                <li><strong>Product Documents:</strong> Technical data sheets, product images</li>
                <li><strong>RFQ Attachments:</strong> Project specifications, drawings, material requirements</li>
              </ul>
            </section>

            {/* Azure + Third-Party */}
            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">3. Cloud & Third-Party Services</h2>
              <p className="mb-4">
                GreenChainz uses a combination of Microsoft Azure services and other third-party tools. All such services operate under their respective Data Processing Agreements and privacy policies.
              </p>

              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Azure PostgreSQL (Database):</strong> Stores account information, RFQs, supplier data</li>
                <li><strong>Azure Redis Cache:</strong> Session data (ephemeral - deleted after logout or 24 hours)</li>
                <li><strong>Azure Blob Storage:</strong> Uploaded documents, product images, certifications</li>
                <li><strong>Azure Document Intelligence:</strong> Processes PDFs to extract certification data</li>
                <li><strong>Azure OpenAI / AI Foundry:</strong> AI agent interactions for RFQ matching and recommendations (subject to Microsoft's OpenAI data privacy terms)</li>
                <li><strong>Azure Application Insights:</strong> Anonymous usage analytics and error monitoring</li>
                <li><strong>Microsoft Communication Services:</strong> Optional chat/support messaging (data hosted in Azure)</li>
                <li><strong>Google Analytics (optional):</strong> Anonymous site analytics (pages visited, time on site). We do not use it to collect personal data unless you have authorized it.</li>
              </ul>

              <p className="mt-4 text-sm text-slate-600">
                Data residency: By default, data is stored in Azure's <strong>US East</strong> region (Virginia) for compliance with US data protection laws unless otherwise stated.
              </p>
            </section>

            {/* Third-Party Integrations Summary */}
            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">4. Third-Party Integrations</h2>
              <ul className="list-disc pl-6 space-y-3">
                <li>
                  <strong>Microsoft Entra ID:</strong> SSO provider (data governed by Microsoft's DPA).
                </li>
                <li>
                  <strong>Google:</strong> SSO provider & Analytics (data governed by Google's Privacy Policy).
                </li>
                <li>
                  <strong>LinkedIn OAuth:</strong> Authenticates architect accounts for RFQ creation.{' '}
                  <a href="https://www.linkedin.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:text-emerald-700 underline">
                    LinkedIn Privacy Policy
                  </a>
                </li>
                <li>
                  <strong>Azure OpenAI:</strong> Processes AI agent queries.{' '}
                  <a href="https://azure.microsoft.com/en-us/support/legal/cognitive-services-openai-data-privacy/" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:text-emerald-700 underline">
                    Azure OpenAI Data Privacy Policy
                  </a>
                </li>
                <li>
                  <strong>Payment Processors:</strong> Third-party payment processors handle card data under their own security controls.
                </li>
              </ul>
            </section>

            {/* Cookies */}
            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">5. Cookies and Tracking Technologies</h2>
              <p className="mb-4">
                We use strictly necessary cookies to provide authentication and security. We may also use analytics cookies to collect anonymous usage data. You can opt out of analytics tracking where applicable.
              </p>

              <h3 className="text-lg font-semibold text-slate-900 mb-3">Cookies We Use</h3>
              <div className="bg-slate-50 p-4 rounded-lg">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left">
                      <th className="pb-2 font-semibold">Cookie</th>
                      <th className="pb-2 font-semibold">Purpose</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="pt-2 align-top"><strong>next-auth.session-token</strong> / <strong>__Secure-authjs.session-token</strong></td>
                      <td className="pt-2">Maintains your login session (first-party, necessary for service).</td>
                    </tr>
                    <tr>
                      <td className="pt-2 align-top"><strong>next-auth.csrf-token</strong></td>
                      <td className="pt-2">Prevents cross-site request forgery (CSRF) attacks.</td>
                    </tr>
                    <tr>
                      <td className="pt-2 align-top"><strong>next-auth.state</strong></td>
                      <td className="pt-2">Validates OAuth authentication flow (SSO login).</td>
                    </tr>
                    <tr>
                      <td className="pt-2 align-top"><strong>next-auth.callback-url</strong></td>
                      <td className="pt-2">Stores the URL to redirect after authentication.</td>
                    </tr>
                    <tr>
                      <td className="pt-2 align-top"><strong>_ga</strong></td>
                      <td className="pt-2">Google Analytics: anonymous usage statistics (if enabled).</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p className="mt-4 text-sm text-slate-600">
                <strong>No tracking or advertising cookies by default:</strong> We do not use cookies for profiling or advertising unless you explicitly opt in. All authentication cookies are cleared on logout or per their expiration.
              </p>
            </section>

            {/* User Rights */}
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
                  <p className="text-slate-700">Request permanent deletion of your account and all associated data. See Section 7 for our deletion timelines.</p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Right to Data Portability</h3>
                  <p className="text-slate-700">Export your data to use with another service. Available formats: JSON, CSV.</p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Right to Opt-Out of Analytics</h3>
                  <p className="text-slate-700">You may opt out of analytics tracking where provided, or contact us to request disabling analytics for your account.</p>
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
                <li><strong>Active Accounts:</strong> Data is retained while your account is active.</li>
                <li><strong>Deleted Accounts:</strong> 90-day grace period for account recovery, then permanent deletion from primary systems; anonymized transaction records may persist as described below.</li>
                <li><strong>Transaction Records:</strong> Retained for 7 years for legal/financial compliance (anonymized where required).</li>
                <li><strong>Analytics Data:</strong> Aggregated, anonymized usage data retained for 24 months.</li>
                <li><strong>Security Logs:</strong> IP addresses and access logs retained for 90 days for fraud prevention and security audits.</li>
              </ul>
              <p className="mt-4 text-sm text-slate-600">
                Note: Transaction records required for compliance (e.g., invoices) are retained even after account deletion, but we anonymize personal identifiers where permitted.
              </p>
            </section>

            {/* Security */}
            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">8. Data Security</h2>
              <p className="mb-4">We implement industry-standard security measures to protect your data:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Encryption in Transit:</strong> TLS 1.3 for all data transmitted over the internet</li>
                <li><strong>Encryption at Rest:</strong> Azure-managed encryption keys (AES-256) for database and storage</li>
                <li><strong>Authentication:</strong> OAuth 2.0 (SSO providers) and JWT tokens for secure API access</li>
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
                <li><strong>Service Providers:</strong> Microsoft Azure, SSO providers, payment processors, analytics providers — all under data processing agreements.</li>
                <li><strong>Legal Compliance:</strong> If required by law, court order, or government request.</li>
                <li><strong>Business Transfers:</strong> In the event of a merger, acquisition, or asset sale, user data may be transferred; you will be notified where required.</li>
              </ul>
            </section>

            {/* Children's Privacy */}
            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">10. Children's Privacy</h2>
              <p>
                GreenChainz is a B2B platform for professionals. We do not knowingly collect data from individuals under 18 years of age. If we discover we have collected data from a minor, we will delete it promptly and notify the appropriate parties as required by law.
              </p>
            </section>

            {/* International Data Transfers */}
            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">11. International Data Transfers</h2>
              <p className="mb-3">
                GreenChainz operates primarily in the United States. If you access our platform from outside the US, your data may be transferred to and processed in the US.
              </p>
              <p className="text-sm text-slate-600">
                For EU users: Microsoft Azure supports the EU-US Data Privacy Framework and provides Standard Contractual Clauses (SCCs) for data transfers where applicable.
              </p>
            </section>

            {/* Changes */}
            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">12. Changes to This Privacy Policy</h2>
              <p className="mb-3">
                We may update this Privacy Policy periodically. We will notify you of significant changes via email or a prominent notice on our platform.
              </p>
              <p>Continued use of GreenChainz after changes are posted constitutes acceptance of the updated policy.</p>
            </section>

            {/* Contact */}
            <section className="border-t border-slate-200 pt-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">13. Contact Us</h2>
              <p className="mb-4">For questions about this Privacy Policy or to exercise your privacy rights, contact:</p>
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
