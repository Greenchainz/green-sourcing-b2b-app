import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Sparkles, Shield, Globe, Zap, Target, Users, Building2 } from "lucide-react";
import SiteHeader from "../components/SiteHeader";
import Footer from "../components/Footer";

export default function AboutPage() {
  return (
    <div className="min-h-screen premium-bg-animated">
      <SiteHeader />

      {/* Hero */}
      <section className="hero-premium relative overflow-hidden text-white py-24 md:py-32 px-6">
        <div className="absolute inset-0 hero-premium-gradient"></div>
        <div className="hero-orb hero-orb-1"></div>
        <div className="hero-orb hero-orb-2"></div>
        <div className="relative z-10 max-w-5xl mx-auto text-center">
          <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 backdrop-blur-sm text-white/90 text-sm font-bold mb-6 border border-white/20">
            <Building2 className="w-4 h-4" />
            ABOUT GREENCHAINZ
          </span>
          <h1 className="text-4xl md:text-6xl font-black mb-6 leading-tight">
            The Global Trust Layer for<br />
            <span className="hero-title-glow">Sustainable Commerce</span>
          </h1>
          <p className="text-xl md:text-2xl max-w-3xl mx-auto text-white/90 leading-relaxed">
            We don&apos;t just help you go green — we enforce the mandates, verify the data, and make compliance automatic.
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20 px-6 section-gradient-1 relative overflow-hidden">
        <div className="deco-blob deco-blob-fern w-[500px] h-[500px] -top-40 -left-40 opacity-30"></div>
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-gc-fern-50 to-gc-teal-50 text-gc-fern-dark text-sm font-bold mb-5 border border-gc-fern-200">
                <Target className="w-4 h-4" />
                OUR MISSION
              </span>
              <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-6">
                Making Sustainability <span className="text-aurora">Non-Negotiable</span>
              </h2>
              <p className="text-lg text-slate-600 leading-relaxed mb-6">
                The AEC industry wastes thousands of hours annually digging through archaic paperwork to verify EPDs, certifications, and LEED compliance. Suppliers with legitimate green products can&apos;t compete against greenwashing marketing claims.
              </p>
              <p className="text-lg text-slate-600 leading-relaxed mb-6">
                GreenChainz is changing that. We plug AI-powered sustainability verification directly into the tools professionals already use — Excel, Revit, and the browser — so compliance happens automatically, not as an afterthought.
              </p>
              <p className="text-lg text-slate-700 font-semibold">
                The current process is the Pony Express. We&apos;re bringing it to the digital age.
              </p>
            </div>
            <div className="relative aspect-video rounded-2xl overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-200 shadow-2xl">
              {/* VIDEO PLACEHOLDER - Replace src with actual video URL */}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-300/50 cursor-pointer hover:scale-110 transition-transform duration-300">
                  <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
                <p className="text-slate-500 text-sm font-medium">Our Story Coming Soon</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* By the Numbers */}
      <section className="py-16 px-6 stats-bar-premium text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 text-center">
            <div>
              <p className="text-4xl md:text-5xl font-black text-white mb-1">$471B</p>
              <p className="text-white/80 text-sm font-medium">Green Construction Market</p>
            </div>
            <div>
              <p className="text-4xl md:text-5xl font-black text-white mb-1">$1T</p>
              <p className="text-white/80 text-sm font-medium">Projected by 2037</p>
            </div>
            <div>
              <p className="text-4xl md:text-5xl font-black text-white mb-1">50K+</p>
              <p className="text-white/80 text-sm font-medium">EPD Products Indexed</p>
            </div>
            <div>
              <p className="text-4xl md:text-5xl font-black text-white mb-1">85%</p>
              <p className="text-white/80 text-sm font-medium">Time Saved on Compliance</p>
            </div>
          </div>
        </div>
      </section>

      {/* What Makes Us Different */}
      <section className="py-24 px-6 bg-white relative overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-5">
              What Makes Us <span className="text-ocean">Different</span>
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              We&apos;re not another green marketing platform. We&apos;re the verification infrastructure.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="feature-card-premium group">
              <div className="feature-icon-premium">
                <Shield className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Data-Verified, Not Self-Reported</h3>
              <p className="text-slate-600 leading-relaxed">
                Every product in our system is backed by verified EPDs, third-party certifications, and real environmental data — not marketing claims.
              </p>
            </div>
            <div className="feature-card-premium group">
              <div className="feature-icon-premium">
                <Zap className="w-8 h-8 text-cyan-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Zero Workflow Disruption</h3>
              <p className="text-slate-600 leading-relaxed">
                Our tools integrate into Excel, Revit, and Chrome. No new software to learn. No process changes. Sustainability data appears where you already work.
              </p>
            </div>
            <div className="feature-card-premium group">
              <div className="feature-icon-premium">
                <Globe className="w-8 h-8 text-violet-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Built for Compliance</h3>
              <p className="text-slate-600 leading-relaxed">
                LEED, Buy Clean Act, BREEAM — we track evolving regulations so you stay ahead. Our AI flags compliance gaps before they become costly problems.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Founder Section */}
      <section className="py-24 px-6 section-gradient-2 relative overflow-hidden">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-emerald-100 to-cyan-100 text-emerald-700 text-sm font-bold mb-6 border border-emerald-200">
            <Users className="w-4 h-4" />
            LEADERSHIP
          </span>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-12">
            Built by Someone Who&apos;s <span className="text-aurora">Been There</span>
          </h2>
          <div className="card-vibrant p-10 text-left">
            <h3 className="text-2xl font-black text-slate-900 mb-2">Jerit Norville</h3>
            <p className="text-gc-fern font-bold mb-6">Founder & CEO</p>
            <p className="text-slate-600 leading-relaxed mb-4">
              Military veteran turned construction professional turned tech entrepreneur. Jerit saw firsthand how the AEC industry struggles with sustainability compliance — the manual processes, the paperwork mountains, the greenwashing that goes unchecked.
            </p>
            <p className="text-slate-600 leading-relaxed">
              GreenChainz was born from that frustration. Built on Azure, powered by AI, and backed by partnerships with Autodesk and Microsoft, the platform is designed to make verified sustainable sourcing as easy as ordering from Amazon.
            </p>
          </div>
        </div>
      </section>

      {/* Partners & Technology */}
      <section className="py-24 px-6 bg-white relative overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-5">
              Powered by Industry Leaders
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              We partner with the organizations that set the standards and provide the data.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 items-center justify-items-center">
            <div className="flex flex-col items-center gap-3 p-6">
              <Image src="/brand/autodesk-sustainability-partner.png" alt="Autodesk Sustainability Tech Partner" width={180} height={60} className="h-12 w-auto object-contain" />
              <span className="text-xs text-slate-500 font-medium">Sustainability Tech Partner</span>
            </div>
            <div className="flex flex-col items-center gap-3 p-6">
              <Image src="/trust/microsoft-partner.png" alt="Microsoft Partner" width={170} height={44} className="h-10 w-auto object-contain" />
              <span className="text-xs text-slate-500 font-medium">ISV Partner</span>
            </div>
            <div className="flex flex-col items-center gap-3 p-6">
              <Image src="/trust/building-transparency.svg" alt="Building Transparency" width={170} height={36} className="h-8 w-auto object-contain" unoptimized />
              <span className="text-xs text-slate-500 font-medium">Data Provider</span>
            </div>
            <div className="flex flex-col items-center gap-3 p-6">
              <Image src="/trust/epd.png" alt="EPD International" width={120} height={48} className="h-10 w-auto object-contain" />
              <span className="text-xs text-slate-500 font-medium">EPD Certification</span>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 items-center justify-items-center mt-4">
            <div className="flex flex-col items-center gap-3 p-6">
              <Image src="/trust/leed.png" alt="LEED" width={132} height={48} className="h-10 w-auto object-contain" />
              <span className="text-xs text-slate-500 font-medium">LEED Compliance</span>
            </div>
            <div className="flex flex-col items-center gap-3 p-6">
              <Image src="/trust/breeam.svg" alt="BREEAM" width={140} height={36} className="h-8 w-auto object-contain" unoptimized />
              <span className="text-xs text-slate-500 font-medium">BREEAM Standards</span>
            </div>
            <div className="flex flex-col items-center gap-3 p-6">
              <Image src="/trust/fsc.png" alt="FSC" width={120} height={48} className="h-10 w-auto object-contain" />
              <span className="text-xs text-slate-500 font-medium">Forest Stewardship</span>
            </div>
            <div className="flex flex-col items-center gap-3 p-6">
              <Image src="/trust/usgbc.png" alt="USGBC" width={132} height={48} className="h-10 w-auto object-contain" />
              <span className="text-xs text-slate-500 font-medium">Green Building Council</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 section-gradient-3 relative overflow-hidden">
        <div className="deco-blob deco-blob-emerald w-[400px] h-[400px] -top-20 -left-20 opacity-20"></div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="cta-premium p-10 md:p-14">
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-5">
              Ready to Join the <span className="text-aurora">Green Revolution</span>?
            </h2>
            <p className="text-lg text-slate-600 mb-10 max-w-xl mx-auto">
              Whether you&apos;re an architect, contractor, or material supplier — GreenChainz makes sustainability simple.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-5">
              <Link href="/login" className="btn-aurora group shimmer">
                <Sparkles className="w-5 h-5" />
                <span>Get Started Free</span>
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link href="/contact" className="btn-cosmic">
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
