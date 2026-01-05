import TrustBadges from "./components/TrustBadges";
import Link from "next/link";

const STATS = [
  { value: "50+", label: "Verified Suppliers" },
  { value: "Fast", label: "RFQ Distribution" },
  { value: "24/7", label: "Verification Checks" },
] as const;

export default function Home() {
  return (
    <div className="gc-page">
      <div className="gc-container py-16 pb-20">
        {/* Hero Section */}
        <section className="text-center mb-12">
          <h1 className="gc-hero-title gc-animate-fade-in">
            <span className="text-[var(--gc-slate-900)] font-black">
              The Trust Layer
            </span>
            <br />
            <span className="font-black text-transparent bg-clip-text bg-gradient-to-br from-[var(--gc-emerald-600)] to-[var(--gc-teal-600)]">
              for Sustainable Commerce
            </span>
          </h1>

          <p className="gc-hero-subtitle gc-animate-fade-in gc-stagger-1 mt-5 mb-0">
            Connect verified suppliers with architects &amp; builders. Automated
            certification verification. Real-time material sourcing powered by
            LEED, EPD, FSC, and more.
          </p>
        </section>

        {/* CTA Buttons */}
        <div className="gc-animate-fade-in gc-stagger-2 flex justify-center gap-3.5 flex-wrap mb-9">
          <Link
            href="/login?type=supplier"
            className="gc-btn gc-btn-primary py-4 px-6 text-base"
          >
            Join as Supplier
          </Link>
          <Link
            href="/login?type=architect"
            className="gc-btn gc-btn-secondary py-4 px-6 text-base"
          >
            Join as Architect
          </Link>
        </div>

        {/* Trust Badges */}
        <div className="gc-animate-fade-in gc-stagger-3 max-w-5xl mx-auto mb-8">
          <TrustBadges variant="full" size="md" />
        </div>

        {/* Stats Grid */}
        <div className="gc-animate-fade-in gc-stagger-4 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 max-w-[800px] mx-auto">
          {STATS.map((stat) => (
            <div key={stat.label} className="gc-card gc-card-hover gc-stat">
              <div className="gc-stat-value">{stat.value}</div>
              <div className="gc-stat-label">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Features Section */}
        <section className="mt-20">
          <h2 className="text-center text-[clamp(1.5rem,4vw,2rem)] font-extrabold text-[var(--gc-slate-900)] mb-3">
            Why GreenChainz?
          </h2>
          <p className="text-center text-[var(--gc-slate-600)] max-w-2xl mx-auto mb-10 leading-[1.7]">
            We&apos;re building the infrastructure for sustainable
            procurement—connecting data, certifications, and suppliers in one
            seamless platform.
          </p>

          <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-5 max-w-5xl mx-auto">
            {[
              {
                icon: (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-7 h-7"
                  >
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                ),
                title: "Verified Certifications",
                desc: "Every supplier is validated against LEED, FSC, EPD, and other gold-standard certifications.",
              },
              {
                icon: (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-7 h-7"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                ),
                title: "Fast RFQ Distribution",
                desc: "Location-based matching delivers your RFQs to the right suppliers—fast and efficiently.",
              },
              {
                icon: (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-7 h-7"
                  >
                    <path d="M3 3v18h18" />
                    <path d="m19 9-5 5-4-4-3 3" />
                  </svg>
                ),
                title: "Sustainability Scoring",
                desc: "Real-time dashboards show project-level LEED points, carbon footprint, and EPD metrics.",
              },
            ].map((feature) => (
              <div key={feature.title} className="gc-card gc-card-hover p-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--gc-emerald-100)] to-[var(--gc-teal-100)] flex items-center justify-center text-[var(--gc-emerald-700)] mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-extrabold text-[var(--gc-slate-900)] mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-[var(--gc-slate-600)] leading-[1.6] m-0">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Banner */}
        <section className="gc-card mt-20 py-12 px-8 text-center bg-gradient-to-br from-[rgba(16,185,129,0.08)] to-[rgba(20,184,166,0.06)]">
          <h2 className="text-[clamp(1.5rem,4vw,2rem)] font-extrabold text-[var(--gc-slate-900)] mb-3">
            Ready to streamline your sourcing?
          </h2>
          <p className="text-[var(--gc-slate-600)] max-w-[520px] mx-auto mb-6 leading-[1.7]">
            Join architects and suppliers who trust GreenChainz for verified,
            sustainable materials.
          </p>
          <div className="flex justify-center gap-3 flex-wrap">
            <Link
              href="/rfqs/create"
              className="gc-btn gc-btn-primary py-3.5 px-5.5 text-[15px]"
            >
              Create Your First RFQ
            </Link>
            <Link
              href="/how-it-works"
              className="gc-btn gc-btn-ghost py-3.5 px-5.5 text-[15px]"
            >
              Learn More →
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
