import Link from "next/link";
import { ArrowRight, FileSpreadsheet, Chrome, Box, FileText } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-[#1a3f3a] via-[#2d5a52] to-[#1a3f3a] text-white py-20 px-6 text-center">
        <h1 className="text-5xl md:text-6xl font-black mb-6">
          Stop Searching.<br />Start Auditing.
        </h1>
        <p className="text-xl md:text-2xl max-w-3xl mx-auto mb-10 text-slate-200 leading-relaxed">
          GreenChainz is a suite of AI-powered tools that plug directly into
          Excel, Revit, and your browser to automate your sustainability compliance.
        </p>
        <p className="text-lg text-slate-300 mb-10">
          Don't change your workflow. We just make it green.
        </p>
        <div className="flex justify-center gap-4 flex-wrap">
          <Link
            href="/signup"
            className="bg-[#2db648] hover:bg-green-600 text-white px-8 py-4 rounded-lg font-bold text-lg transition-all transform hover:scale-105"
          >
            Get the Toolkit (Free)
          </Link>
          <Link
            href="#tools"
            className="border-2 border-white hover:bg-white hover:text-slate-900 text-white px-8 py-4 rounded-lg font-bold text-lg transition-all"
          >
            See the Tools
          </Link>
        </div>
      </section>

      {/* Tools Section */}
      <section id="tools" className="py-20 px-6 max-w-7xl mx-auto">
        <h2 className="text-4xl md:text-5xl font-black text-center mb-4 text-slate-900">
          Choose Your Weapon
        </h2>
        <p className="text-center text-slate-600 text-lg mb-16 max-w-2xl mx-auto">
          Each tool brings sustainability intelligence directly into the software
          you already use—no new workflows, no learning curve.
        </p>

        {/* Tools Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Tool 1: Excel Carbon Audit */}
          <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-lg transition-shadow border border-slate-100">
            <div className="bg-green-100 w-16 h-16 rounded-xl flex items-center justify-center mb-6">
              <FileSpreadsheet className="w-8 h-8 text-green-700" />
            </div>
            <h3 className="text-2xl font-black mb-3 text-slate-900">Excel Audit</h3>
            <p className="text-slate-600 mb-6 text-base leading-relaxed">
              Upload your Bill of Materials (BOM). Our AI matches generic product names
              to verified low-carbon alternatives and identifies health hazards instantly.
            </p>
            <div className="space-y-2 mb-6 text-sm text-slate-700">
              <p className="flex items-center gap-2"><span className="text-green-600">✓</span> Embodied carbon (kgCO2e)</p>
              <p className="flex items-center gap-2"><span className="text-green-600">✓</span> Health grade &amp; toxins</p>
              <p className="flex items-center gap-2"><span className="text-green-600">✓</span> Red List certifications</p>
            </div>
            <Link href="/excel-addin" className="text-green-700 font-bold flex items-center gap-2 hover:gap-3 transition-all">
              Launch Audit <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Tool 2: Chrome Extension */}
          <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-lg transition-shadow border border-slate-100">
            <div className="bg-blue-100 w-16 h-16 rounded-xl flex items-center justify-center mb-6">
              <Chrome className="w-8 h-8 text-blue-700" />
            </div>
            <h3 className="text-2xl font-black mb-3 text-slate-900">Sweets Interceptor</h3>
            <p className="text-slate-600 mb-6 text-base leading-relaxed">
              Browsing Sweets, Material Bank, or supplier specs? We overlay real-time
              sustainability data and flag high-carbon materials directly on their site.
            </p>
            <div className="space-y-2 mb-6 text-sm text-slate-700">
              <p className="flex items-center gap-2"><span className="text-blue-600">✓</span> Real-time EPD lookups</p>
              <p className="flex items-center gap-2"><span className="text-blue-600">✓</span> Price + carbon comparison</p>
              <p className="flex items-center gap-2"><span className="text-blue-600">✓</span> Green alternative suggestions</p>
            </div>
            <Link href="/chrome-extension" className="text-blue-700 font-bold flex items-center gap-2 hover:gap-3 transition-all">
              Install Extension <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Tool 3: Revit Plugin */}
          <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-lg transition-shadow border border-slate-100">
            <div className="bg-purple-100 w-16 h-16 rounded-xl flex items-center justify-center mb-6">
              <Box className="w-8 h-8 text-purple-700" />
            </div>
            <h3 className="text-2xl font-black mb-3 text-slate-900">Revit Compliance</h3>
            <p className="text-slate-600 mb-6 text-base leading-relaxed">
              The "Spellchecker" for LEED. Scan your 3D model in real-time to identify
              missing EPDs, high-carbon materials, and LEED-ineligible products.
            </p>
            <div className="space-y-2 mb-6 text-sm text-slate-700">
              <p className="flex items-center gap-2"><span className="text-purple-600">✓</span> Real-time model scanning</p>
              <p className="flex items-center gap-2"><span className="text-purple-600">✓</span> LEED point calculations</p>
              <p className="flex items-center gap-2"><span className="text-purple-600">✓</span> Bulk material replacement</p>
            </div>
            <Link href="/revit-plugin" className="text-purple-700 font-bold flex items-center gap-2 hover:gap-3 transition-all">
              Download Plugin <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Tool 4: Submittal Auto-Generator */}
          <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-lg transition-shadow border border-slate-100">
            <div className="bg-amber-100 w-16 h-16 rounded-xl flex items-center justify-center mb-6">
              <FileText className="w-8 h-8 text-amber-700" />
            </div>
            <h3 className="text-2xl font-black mb-3 text-slate-900">Submittal Generator</h3>
            <p className="text-slate-600 mb-6 text-base leading-relaxed">
              Drag in a spec book PDF. We extract requirements, find compliant products with EPDs,
              and deliver a polished submittal package—cover, comparison, and attachments.
            </p>
            <div className="space-y-2 mb-6 text-sm text-slate-700">
              <p className="flex items-center gap-2"><span className="text-amber-600">✓</span> Azure Document Intelligence parsing</p>
              <p className="flex items-center gap-2"><span className="text-amber-600">✓</span> Azure OpenAI criteria extraction</p>
              <p className="flex items-center gap-2"><span className="text-amber-600">✓</span> EPD-backed PDF package</p>
            </div>
            <Link href="/tools/submittal-generator" className="text-amber-700 font-bold flex items-center gap-2 hover:gap-3 transition-all">
              Try It Now <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* How It Works Section */}
        <section className="bg-white py-20 px-6 mt-20 rounded-2xl">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-4xl font-black text-center mb-16 text-slate-900">
              How It Works (The Magic Behind the Scenes)
            </h2>

            <div className="space-y-12">
              {[
                { step: 1, title: "You Select Materials", desc: "Copy/paste your material list into Excel, browse Sweets, or load your Revit model." },
                { step: 2, title: "Azure AI Matches Data", desc: "Our LLM cleans messy supplier names and fuzzy matches them against 50K+ EPD products." },
                { step: 3, title: "Real-Time Certification Lookup", desc: "We pull live data from Building Transparency, HPD, Declare, FSC, and other databases." },
                { step: 4, title: "Actionable Insights Appear", desc: "Carbon scores, health grades, and green alternatives pop up instantly—no waiting." },
              ].map((item) => (
                <div key={item.step} className="flex gap-8 items-start">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-12 w-12 rounded-full bg-green-600 text-white font-black text-lg">
                      {item.step}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">{item.title}</h3>
                    <p className="text-slate-600 text-base leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Data Sources Banner */}
        <section className="bg-gradient-to-r from-slate-900 to-slate-800 text-white py-16 px-6 mt-20 rounded-2xl">
          <div className="max-w-5xl mx-auto text-center">
            <h2 className="text-3xl font-black mb-6">Powered by the Best Data Sources</h2>
            <p className="text-slate-200 mb-10 text-lg">
              We aggregate EPD data from Building Transparency (EC3), HPD databases,
              FSC, LEED, and more. Always fresh. Always verified.
            </p>
            <div className="grid md:grid-cols-4 gap-6 text-sm">
              <div><p className="font-bold">Building Transparency</p><p className="text-slate-400">EC3 Platform</p></div>
              <div><p className="font-bold">Health Data</p><p className="text-slate-400">HPD + Declare</p></div>
              <div><p className="font-bold">Certifications</p><p className="text-slate-400">FSC, GOTS, C2C</p></div>
              <div><p className="font-bold">Compliance</p><p className="text-slate-400">LEED + Living Building</p></div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20 px-6">
          <div className="max-w-4xl mx-auto text-center bg-green-50 p-12 rounded-2xl border-2 border-green-200">
            <h2 className="text-3xl font-black text-slate-900 mb-4">Ready to Build Green (For Real)?</h2>
            <p className="text-slate-600 mb-8 text-lg">Start with a free account. No credit card. Pick your tool. Audit your materials.</p>
            <Link href="/signup" className="inline-block bg-green-600 hover:bg-green-700 text-white px-10 py-4 rounded-lg font-bold text-lg transition-all transform hover:scale-105">
              Get Started Free
            </Link>
          </div>
        </section>
      </section>
    </div>
  );
}
