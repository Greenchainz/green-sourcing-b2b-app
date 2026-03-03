import { useState } from "react";
import { Mail, MessageSquare, Send, CheckCircle, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function Support() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const contactMutation = trpc.leads.submit.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      setFormData({ name: "", email: "", subject: "", message: "" });
      setTimeout(() => setSubmitted(false), 5000);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    contactMutation.mutate({
      email: formData.email,
      name: formData.name,
      company: "",
      source: `Support: ${formData.subject} - ${formData.message}`,
    });
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-forest-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="container mx-auto px-4 py-6">
          <a href="/" className="text-2xl font-bold text-forest-700">
            GreenChainz
          </a>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          {/* Page Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-slate-900 mb-4">
              How Can We Help?
            </h1>
            <p className="text-lg text-slate-600">
              Get in touch with our team for support, questions, or feedback
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Contact Methods */}
            <div className="space-y-6">
              <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                <div className="flex items-start space-x-4">
                  <div className="p-3 bg-forest-50 rounded-lg">
                    <Mail className="h-6 w-6 text-forest-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-2">
                      Email Support
                    </h3>
                    <p className="text-slate-600 text-sm mb-3">
                      Send us an email and we'll respond within 24 hours
                    </p>
                    <a
                      href="mailto:founder@greenchainz.com"
                      className="text-forest-600 hover:text-forest-700 font-medium text-sm"
                    >
                      founder@greenchainz.com
                    </a>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                <div className="flex items-start space-x-4">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <MessageSquare className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-2">
                      Live Chat
                    </h3>
                    <p className="text-slate-600 text-sm mb-3">
                      Chat with ChainBot AI for instant answers to common
                      questions
                    </p>
                    <button
                      onClick={() => {
                        // ChainBot widget should be available globally
                        const chainbotButton = document.querySelector(
                          '[data-chainbot-trigger]'
                        ) as HTMLButtonElement;
                        if (chainbotButton) chainbotButton.click();
                      }}
                      className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                    >
                      Open Chat Widget →
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-forest-600 to-forest-800 rounded-xl p-6 text-white">
                <h3 className="font-bold text-lg mb-2">Business Hours</h3>
                <p className="text-forest-100 text-sm mb-4">
                  Monday - Friday: 9:00 AM - 6:00 PM EST
                  <br />
                  Saturday - Sunday: Closed
                </p>
                <p className="text-forest-200 text-xs">
                  Emergency support available 24/7 for premium subscribers
                </p>
              </div>
            </div>

            {/* Contact Form */}
            <div className="bg-white rounded-xl p-8 border border-slate-200 shadow-sm">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">
                Send Us a Message
              </h2>

              {submitted ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">
                    Message Sent!
                  </h3>
                  <p className="text-slate-600">
                    We'll get back to you within 24 hours.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label
                      htmlFor="name"
                      className="block text-sm font-medium text-slate-700 mb-1"
                    >
                      Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-forest-500 focus:border-transparent"
                      placeholder="Your name"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-slate-700 mb-1"
                    >
                      Email *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-forest-500 focus:border-transparent"
                      placeholder="your@email.com"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="subject"
                      className="block text-sm font-medium text-slate-700 mb-1"
                    >
                      Subject *
                    </label>
                    <input
                      type="text"
                      id="subject"
                      name="subject"
                      required
                      value={formData.subject}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-forest-500 focus:border-transparent"
                      placeholder="How can we help?"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="message"
                      className="block text-sm font-medium text-slate-700 mb-1"
                    >
                      Message *
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      required
                      rows={5}
                      value={formData.message}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-forest-500 focus:border-transparent resize-none"
                      placeholder="Tell us more about your question or issue..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={contactMutation.isPending}
                    className="w-full bg-forest-600 hover:bg-forest-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {contactMutation.isPending ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-5 w-5" />
                        <span>Send Message</span>
                      </>
                    )}
                  </button>

                  {contactMutation.isError && (
                    <p className="text-red-600 text-sm text-center">
                      Failed to send message. Please try again or email us
                      directly.
                    </p>
                  )}
                </form>
              )}
            </div>
          </div>

          {/* FAQ Section */}
          <div className="mt-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-8 text-center">
              Frequently Asked Questions
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl p-6 border border-slate-200">
                <h3 className="font-semibold text-slate-900 mb-2">
                  How do I get started with GreenChainz?
                </h3>
                <p className="text-slate-600 text-sm">
                  Sign up for a free account and start browsing our verified
                  sustainable materials catalog. You can create RFQs, compare
                  materials, and connect with suppliers immediately.
                </p>
              </div>

              <div className="bg-white rounded-xl p-6 border border-slate-200">
                <h3 className="font-semibold text-slate-900 mb-2">
                  What certifications do you verify?
                </h3>
                <p className="text-slate-600 text-sm">
                  We verify EPDs, HPDs, Declare labels, Green Guard
                  certifications, and other third-party sustainability
                  credentials through our partnerships with Building
                  Transparency and EPD International.
                </p>
              </div>

              <div className="bg-white rounded-xl p-6 border border-slate-200">
                <h3 className="font-semibold text-slate-900 mb-2">
                  How does pricing work?
                </h3>
                <p className="text-slate-600 text-sm">
                  GreenChainz is free for buyers. Suppliers pay a subscription
                  fee to list products and respond to RFQs. Premium tiers offer
                  priority placement and advanced analytics.
                </p>
              </div>

              <div className="bg-white rounded-xl p-6 border border-slate-200">
                <h3 className="font-semibold text-slate-900 mb-2">
                  Can I integrate with my existing tools?
                </h3>
                <p className="text-slate-600 text-sm">
                  Yes! We offer integrations with Revit, Excel, and browser
                  extensions. Our API is also available for custom integrations
                  with your procurement systems.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-slate-900 text-white py-8 mt-16">
        <div className="container mx-auto px-4 text-center">
          <p className="text-slate-400 text-sm">
            © 2026 GreenChainz Inc. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
