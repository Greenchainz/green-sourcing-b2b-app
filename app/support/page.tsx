'use client'
import { useState } from 'react'

export default function SupportPage() {
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' })
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1000))
    setSubmitted(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-slate-900 mb-4">Support & Help</h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Our team is here to help you get the most out of GreenChainz. Reach out through any of the channels below.
          </p>
        </div>

        {/* Contact Methods */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {/* Email */}
          <div className="bg-white rounded-2xl shadow-md p-8 text-center hover:shadow-lg transition-shadow">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Email Support</h3>
            <p className="text-slate-600 text-sm mb-4">Response within 24 hours on business days</p>
            <a
              href="mailto:support@greenchainz.com"
              className="text-green-600 font-semibold hover:text-green-700 transition-colors"
            >
              support@greenchainz.com
            </a>
          </div>

          {/* Phone */}
          <div className="bg-white rounded-2xl shadow-md p-8 text-center hover:shadow-lg transition-shadow">
            <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Phone Support</h3>
            <p className="text-slate-600 text-sm mb-4">Mon–Fri, 9 AM – 5 PM CT</p>
            <a
              href="tel:+15125550100"
              className="text-blue-600 font-semibold hover:text-blue-700 transition-colors"
            >
              +1 (512) 555-0100
            </a>
          </div>

          {/* Documentation */}
          <div className="bg-white rounded-2xl shadow-md p-8 text-center hover:shadow-lg transition-shadow">
            <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Documentation</h3>
            <p className="text-slate-600 text-sm mb-4">Guides, API docs, and tutorials</p>
            <a
              href="/help"
              className="text-purple-600 font-semibold hover:text-purple-700 transition-colors"
            >
              Visit Help Center →
            </a>
          </div>
        </div>

        {/* Contact Form */}
        <div className="bg-white rounded-2xl shadow-md p-10">
          <h2 className="text-3xl font-bold text-slate-900 mb-2">Send Us a Message</h2>
          <p className="text-slate-600 mb-8">Fill out the form below and we&apos;ll get back to you as soon as possible.</p>

          {submitted ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Message Sent!</h3>
              <p className="text-slate-600">We&apos;ll respond to {formData.email} within 24 hours.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                    placeholder="Jane Smith"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                    placeholder="jane@company.com"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Subject *</label>
                <select
                  required
                  value={formData.subject}
                  onChange={e => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                >
                  <option value="">Select a topic...</option>
                  <option value="account">Account & Billing</option>
                  <option value="technical">Technical Issue</option>
                  <option value="rfq">RFQ & Procurement</option>
                  <option value="supplier">Supplier Onboarding</option>
                  <option value="epd">EPD & Certifications</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Message *</label>
                <textarea
                  required
                  rows={5}
                  value={formData.message}
                  onChange={e => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition resize-none"
                  placeholder="Describe your issue or question in detail..."
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-bold py-4 px-8 rounded-lg transition-colors text-lg"
              >
                {loading ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          )}
        </div>

        {/* FAQ Section */}
        <div className="mt-16">
          <h2 className="text-3xl font-bold text-slate-900 mb-8 text-center">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {[
              {
                q: 'How do I get started with GreenChainz?',
                a: 'Sign up for a free account, complete your profile, and start searching our catalog of 500+ verified sustainable building materials. You can submit your first RFQ in minutes.'
              },
              {
                q: 'How are materials verified for sustainability?',
                a: 'All materials are scored using our proprietary Composite Compliance-Performance Score (CCPS), which evaluates EPD data, certifications (LEED, BREEAM, Living Building Challenge), carbon footprint, and third-party verification.'
              },
              {
                q: 'Can I integrate GreenChainz with Autodesk Revit?',
                a: 'Yes! Our Revit plugin allows you to search and specify sustainable materials directly within your BIM workflow. Download it from the Autodesk App Store or our integrations page.'
              },
              {
                q: 'How does the RFQ process work?',
                a: 'Add materials to your RFQ cart, enter project details, and submit. GreenChainz automatically matches your request with qualified suppliers and sends you competitive bids within 48 hours.'
              },
              {
                q: 'Is GreenChainz available on Microsoft AppSource?',
                a: 'Yes, GreenChainz is available on Microsoft AppSource and integrates with Microsoft 365 and Azure environments for enterprise procurement teams.'
              }
            ].map((faq, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
                <h3 className="text-lg font-bold text-slate-900 mb-2">{faq.q}</h3>
                <p className="text-slate-600">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
