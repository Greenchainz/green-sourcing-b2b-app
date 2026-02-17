import Link from "next/link";
import { FileSpreadsheet, CheckCircle } from "lucide-react";

export default function ExcelAuditPage() {
    return (
        <div className="min-h-screen bg-[#0a0a0a]">
            {/* Hero */}
            <section className="bg-gradient-to-r from-green-700 to-emerald-700 text-white py-20 px-6">
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center gap-4 mb-8">
                        <FileSpreadsheet className="w-12 h-12" />
                        <h1 className="text-5xl font-black">Excel Carbon Audit</h1>
                    </div>
                    <p className="text-xl text-green-50 mb-8">
                        Audit your Bill of Materials for embodied carbon, health hazards,
                        and green alternatives—all in one Excel sheet.
                    </p>
                    <div className="flex gap-4 flex-wrap">
                        <button className="bg-[#111111] text-green-700 px-8 py-4 rounded-lg font-bold hover:bg-green-50">
                            Add to Excel Now
                        </button>
                        <Link href="#how-it-works" className="border-2 border-white text-white px-8 py-4 rounded-lg font-bold hover:bg-green-600">
                            See How It Works
                        </Link>
                    </div>
                </div>
            </section>

            {/* Features */}
            <section className="py-20 px-6">
                <div className="max-w-5xl mx-auto">
                    <h2 className="text-4xl font-black text-center mb-16 text-white">
                        What You Get
                    </h2>
                    <div className="grid md:grid-cols-2 gap-8">
                        {[
                            {
                                title: "Carbon Score",
                                desc: "Real-time embodied carbon (kgCO2e) for every material. EC3 data + 50K+ verified EPDs.",
                            },
                            {
                                title: "Health Grade",
                                desc: "Grade A (Safe), C (Caution), or F (Toxic). Detects formaldehyde, PVC, mercury, and more.",
                            },
                            {
                                title: "Red List Status",
                                desc: "Is your material Red List Free? Approved? Or missing certifications? We show you.",
                            },
                            {
                                title: "Green Alternatives",
                                desc: "Click to see low-carbon swaps with cost + carbon comparison in real-time.",
                            },
                        ].map((feature) => (
                            <div key={feature.title} className="bg-[#111111] p-8 rounded-xl shadow-sm border border-white/5">
                                <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                                <p className="text-slate-400 leading-relaxed">{feature.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section id="how-it-works" className="bg-[#111111] py-20 px-6">
                <div className="max-w-5xl mx-auto">
                    <h2 className="text-4xl font-black text-center mb-16 text-white">
                        3 Steps to Audit Your BOM
                    </h2>
                    <div className="space-y-12">
                        {[
                            {
                                step: 1,
                                title: "Copy Your Material List",
                                desc: "Paste your Excel BOM (any column of material names).",
                            },
                            {
                                step: 2,
                                title: "Click 'Run Audit'",
                                desc: "Our AI instantly matches your materials to verified EPD data.",
                            },
                            {
                                step: 3,
                                title: "See Results Instantly",
                                desc: "We append 3 columns: Carbon, Health Grade, and Compliance Status.",
                            },
                        ].map((item) => (
                            <div key={item.step} className="flex gap-6 items-start">
                                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-green-600 text-white flex items-center justify-center font-black text-xl">
                                    {item.step}
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold text-white mb-2">{item.title}</h3>
                                    <p className="text-slate-400 text-lg leading-relaxed">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Requirements */}
            <section className="py-20 px-6 bg-[#0a0a0a]">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-3xl font-black text-center mb-12 text-white">
                        System Requirements
                    </h2>
                    <div className="bg-[#111111] p-8 rounded-xl border border-[#aaff00]/10">
                        <ul className="space-y-4">
                            {[
                                "Microsoft Excel Online (Web) or Excel Desktop 2019+",
                                "Windows 10+ or macOS 10.15+",
                                "Internet connection (data pulls from Building Transparency in real-time)",
                                "Free GreenChainz account (sign up below)",
                            ].map((req) => (
                                <li key={req} className="flex items-center gap-3">
                                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                                    <span className="text-slate-300">{req}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </section>

            {/* FAQ */}
            <section className="py-20 px-6">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-3xl font-black text-center mb-12 text-white">
                        Frequently Asked Questions
                    </h2>
                    <div className="space-y-6">
                        {[
                            {
                                q: "Does it work with my existing Excel file?",
                                a: "Yes! Upload any Excel file with a column of material names. We append results to the right.",
                            },
                            {
                                q: "Is my data private?",
                                a: "Your material names are sent to our servers for matching. We don't store them; results are deleted after 30 days.",
                            },
                            {
                                q: "What if a material isn't found?",
                                a: "We tell you. Then you can manually add it or we'll scrape the web for EPD data in real-time.",
                            },
                            {
                                q: "Can I export the results?",
                                a: "Yes! Results stay in Excel. Save the file normally. No special export needed.",
                            },
                        ].map((item) => (
                            <div key={item.q} className="bg-[#111111] p-6 rounded-xl border border-[#aaff00]/10">
                                <h3 className="font-bold text-white mb-3">{item.q}</h3>
                                <p className="text-slate-400">{item.a}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="bg-green-700 text-white py-20 px-6">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-4xl font-black mb-6">Ready to Audit Your Materials?</h2>
                    <p className="text-xl text-green-50 mb-8">
                        Free to start. Premium features coming soon.
                    </p>
                    <button className="bg-[#111111] text-green-700 px-10 py-4 rounded-lg font-bold text-lg hover:bg-green-50 inline-block">
                        Add to Excel Now
                    </button>
                </div>
            </section>
        </div>
    );
}
