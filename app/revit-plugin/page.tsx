import Link from "next/link";
import { Box, Download } from "lucide-react";

export default function RevitPage() {
    return (
        <div className="min-h-screen bg-slate-50">
            {/* Hero */}
            <section className="bg-gradient-to-r from-purple-700 to-indigo-700 text-white py-20 px-6">
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center gap-4 mb-8">
                        <Box className="w-12 h-12" />
                        <h1 className="text-5xl font-black">Revit Compliance Plugin</h1>
                    </div>
                    <p className="text-xl text-purple-50 mb-8">
                        The "Spellchecker" for LEED. Scan your 3D model in real-time to identify
                        missing EPDs, high-carbon materials, and LEED-ineligible products.
                    </p>
                    <div className="flex gap-4 flex-wrap">
                        <button className="bg-white text-purple-700 px-8 py-4 rounded-lg font-bold hover:bg-purple-50 flex items-center gap-2">
                            <Download className="w-5 h-5" />
                            Download Plugin
                        </button>
                        <Link href="#how-it-works" className="border-2 border-white text-white px-8 py-4 rounded-lg font-bold hover:bg-purple-600">
                            See How It Works
                        </Link>
                    </div>
                </div>
            </section>

            {/* What It Does */}
            <section className="py-20 px-6">
                <div className="max-w-5xl mx-auto">
                    <h2 className="text-4xl font-black text-center mb-16 text-slate-900">
                        Real-Time Model Scanning
                    </h2>
                    <div className="grid md:grid-cols-2 gap-8">
                        {[
                            {
                                title: "Scan Your Entire Model",
                                desc: "Load your Revit project. Plugin scans every material in seconds.",
                            },
                            {
                                title: "Find Missing EPDs",
                                desc: "Highlights materials that don't have Environmental Product Declarations.",
                            },
                            {
                                title: "Calculate Carbon Footprint",
                                desc: "See total project embodied carbon + LEED carbon credit potential.",
                            },
                            {
                                title: "Bulk Replacement",
                                desc: "Swap high-carbon materials to green alternatives. Update model in batch.",
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

            {/* How It Works */}
            <section id="how-it-works" className="bg-white py-20 px-6">
                <div className="max-w-5xl mx-auto">
                    <h2 className="text-4xl font-black text-center mb-16 text-slate-900">
                        Installation & Setup
                    </h2>
                    <div className="space-y-12">
                        {[
                            {
                                step: 1,
                                title: "Download and Install",
                                desc: "Download the .addin file. Copy to your Revit Add-ins folder.",
                            },
                            {
                                step: 2,
                                title: "Open Your Revit Model",
                                desc: "Launch Revit and open a project. Plugin loads in the ribbon.",
                            },
                            {
                                step: 3,
                                title: "Click 'Scan Materials'",
                                desc: "Plugin reads every material in your model (takes 5-30 seconds depending on size).",
                            },
                            {
                                step: 4,
                                title: "Review & Replace",
                                desc: "See a report of missing EPDs + carbon score. Click to replace materials.",
                            },
                        ].map((item) => (
                            <div key={item.step} className="flex gap-6 items-start">
                                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-purple-600 text-white flex items-center justify-center font-black text-xl">
                                    {item.step}
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold text-slate-900 mb-2">{item.title}</h3>
                                    <p className="text-slate-600 text-lg leading-relaxed">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Technical Details */}
            <section className="bg-slate-50 py-20 px-6">
                <div className="max-w-5xl mx-auto">
                    <h2 className="text-3xl font-black text-center mb-12 text-slate-900">
                        System Requirements
                    </h2>
                    <div className="grid md:grid-cols-2 gap-8">
                        {[
                            {
                                title: "Revit Versions",
                                items: ["Revit 2022+", "Desktop only (no Revit Cloud support yet)"],
                            },
                            {
                                title: "Operating System",
                                items: ["Windows 10/11 only", "2GB+ RAM recommended"],
                            },
                        ].map((req) => (
                            <div key={req.title} className="bg-white p-8 rounded-xl border border-slate-200">
                                <h3 className="font-bold text-slate-900 mb-4">{req.title}</h3>
                                <ul className="space-y-2">
                                    {req.items.map((item) => (
                                        <li key={item} className="text-slate-700">• {item}</li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* LEED Integration */}
            <section className="py-20 px-6">
                <div className="max-w-5xl mx-auto">
                    <h2 className="text-4xl font-black text-center mb-12 text-slate-900">
                        LEED Credit Calculation
                    </h2>
                    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-10 rounded-xl border-2 border-purple-200">
                        <p className="text-lg text-slate-700 mb-6">
                            The plugin automatically calculates your project's eligibility for:
                        </p>
                        <ul className="grid md:grid-cols-2 gap-6">
                            {[
                                "LEED EQc2: Low-Emitting Materials",
                                "LEED MRc1: Recycled Content",
                                "LEED MRc3: Regional Materials",
                                "LEED MRc4: Material Reuse",
                                "LEED EAc5: Renewable Energy",
                                "LEED Embodied Carbon Credit",
                            ].map((credit) => (
                                <li key={credit} className="text-slate-700 flex items-start gap-3">
                                    <span className="text-purple-600 font-bold mt-1">✓</span>
                                    {credit}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="bg-purple-700 text-white py-20 px-6">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-4xl font-black mb-6">Ready to Audit Your Models?</h2>
                    <p className="text-xl text-purple-50 mb-8">
                        Free for non-commercial use. Professional licensing available.
                    </p>
                    <button className="bg-white text-purple-700 px-10 py-4 rounded-lg font-bold text-lg hover:bg-purple-50 inline-block flex items-center gap-2 mx-auto">
                        <Download className="w-5 h-5" />
                        Download Revit Plugin
                    </button>
                </div>
            </section>
        </div>
    );
}
