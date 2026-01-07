import Link from "next/link";
import { Chrome, Download } from "lucide-react";

export default function ExtensionPage() {
    return (
        <div className="min-h-screen bg-slate-50">
            {/* Hero */}
            <section className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-20 px-6">
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center gap-4 mb-8">
                        <Chrome className="w-12 h-12" />
                        <h1 className="text-5xl font-black">Sweets Interceptor</h1>
                    </div>
                    <p className="text-xl text-blue-50 mb-8">
                        Browsing Sweets or Material Bank for products? We overlay real-time
                        sustainability data, carbon scores, and green alternatives right on the page.
                    </p>
                    <div className="flex gap-4 flex-wrap">
                        <a href="https://chrome.google.com/webstore" className="bg-white text-blue-700 px-8 py-4 rounded-lg font-bold hover:bg-blue-50 flex items-center gap-2">
                            <Download className="w-5 h-5" />
                            Install from Chrome Store
                        </a>
                        <Link href="#how-it-works" className="border-2 border-white text-white px-8 py-4 rounded-lg font-bold hover:bg-blue-600">
                            See How It Works
                        </Link>
                    </div>
                </div>
            </section>

            {/* Features */}
            <section className="py-20 px-6">
                <div className="max-w-5xl mx-auto">
                    <h2 className="text-4xl font-black text-center mb-16 text-slate-900">
                        Real-Time Sustainability Data
                    </h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            {
                                title: "Instant Carbon Lookup",
                                desc: "See embodied carbon for any product before you click 'add to cart'.",
                            },
                            {
                                title: "Price vs. Carbon",
                                desc: "Compare cost + carbon side-by-side. Sometimes the greener option costs less.",
                            },
                            {
                                title: "Red List Warnings",
                                desc: "Yellow flag for questionable materials. Green checkmark for verified EPD.",
                            },
                        ].map((feature) => (
                            <div key={feature.title} className="bg-white p-8 rounded-xl shadow-sm border border-slate-100">
                                <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                                <p className="text-slate-600 leading-relaxed">{feature.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Supported Sites */}
            <section className="bg-white py-20 px-6">
                <div className="max-w-5xl mx-auto">
                    <h2 className="text-3xl font-black text-center mb-12 text-slate-900">
                        Works Everywhere Your Architects Shop
                    </h2>
                    <div className="grid md:grid-cols-3 gap-6">
                        {["Sweets", "Material Bank", "Specification.com"].map((site) => (
                            <div key={site} className="bg-slate-50 p-6 rounded-lg text-center border border-slate-200">
                                <p className="font-bold text-slate-900">{site}</p>
                                <p className="text-slate-600 text-sm">Full support</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section id="how-it-works" className="bg-blue-50 py-20 px-6">
                <div className="max-w-5xl mx-auto">
                    <h2 className="text-4xl font-black text-center mb-16 text-slate-900">
                        How It Works
                    </h2>
                    <div className="bg-white p-8 rounded-xl border border-blue-200">
                        <ol className="space-y-6">
                            {[
                                {
                                    title: "Install the Extension",
                                    desc: "One-click install from Chrome Web Store. Takes 10 seconds.",
                                },
                                {
                                    title: "Navigate to Sweets",
                                    desc: "Browse products like you normally would.",
                                },
                                {
                                    title: "See Sustainability Data Appear",
                                    desc: "We inject a small card next to each product showing carbon, health grade, and alternatives.",
                                },
                                {
                                    title: "Click to Learn More",
                                    desc: "Clicking 'Learn More' opens our full comparison page in a new tab.",
                                },
                            ].map((item, idx) => (
                                <li key={item.title} className="flex gap-4">
                                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                                        {idx + 1}
                                    </span>
                                    <div>
                                        <h3 className="font-bold text-slate-900">{item.title}</h3>
                                        <p className="text-slate-600">{item.desc}</p>
                                    </div>
                                </li>
                            ))}
                        </ol>
                    </div>
                </div>
            </section>

            {/* Privacy */}
            <section className="py-20 px-6">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-3xl font-black mb-8 text-slate-900">
                        Privacy First
                    </h2>
                    <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
                        We don't track which products you view. We don't log your browsing.
                        We just add data to the page you're already on.
                    </p>
                </div>
            </section>

            {/* CTA */}
            <section className="bg-blue-700 text-white py-20 px-6">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-4xl font-black mb-6">Start Intercepting</h2>
                    <p className="text-xl text-blue-50 mb-8">
                        Join 10K+ architects already using the Sweets Interceptor.
                    </p>
                    <a href="https://chrome.google.com/webstore" className="bg-white text-blue-700 px-10 py-4 rounded-lg font-bold text-lg hover:bg-blue-50 inline-block flex items-center gap-2">
                        <Download className="w-5 h-5" />
                        Install Extension Free
                    </a>
                </div>
            </section>
        </div>
    );
}
