'use client'

import { useState } from 'react'

export default function ContactPage() {
    const [submitted, setSubmitted] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitted(true)
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
                <h1 className="text-5xl font-bold text-slate-900 mb-6">Contact Us</h1>
                <p className="text-xl text-slate-600 mb-12">Get in touch with the GreenChainz team.</p>

                <div className="bg-white rounded-lg shadow-md p-8">
                    {submitted ? (
                        <div className="text-center py-8">
                            <p className="text-lg text-green-600 font-semibold">Thank you for your message!</p>
                            <p className="text-slate-600 mt-2">We'll get back to you soon.</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-900 mb-2">Name</label>
                                <input type="text" placeholder="Your name" required className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-900 mb-2">Email</label>
                                <input type="email" placeholder="your.email@example.com" required className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-900 mb-2">Message</label>
                                <textarea placeholder="Your message here..." required rows={5} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"></textarea>
                            </div>
                            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition">Send Message</button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    )
}
