import { ShieldCheckIcon, ClockIcon, ChartBarIcon } from '@heroicons/react/24/outline';

export default function LandingPageValueProps() {
  return (
    <div className="bg-neutral-dark py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Section 1: Why GreenChainz */}
        <section className="mb-24">
          <h2 className="text-4xl font-bold text-center text-white mb-16">
            Why GreenChainz?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">

            {/* Verified Data */}
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-accent/10 rounded-lg flex items-center justify-center mb-6">
                <ShieldCheckIcon className="w-10 h-10 text-green-accent" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">
                Verified Sustainability Data
              </h3>
              <p className="text-neutral-light leading-relaxed">
                Every product on GreenChainz is backed by third-party verified certifications (LEED, FSC, EPDs).
                No greenwashing—just trusted, comparable data to de-risk your material specifications.
              </p>
            </div>

            {/* Time Savings */}
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-accent/10 rounded-lg flex items-center justify-center mb-6">
                <ClockIcon className="w-10 h-10 text-green-accent" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">
                75% Faster Research
              </h3>
              <p className="text-neutral-light leading-relaxed">
                Stop wasting hours hunting across fragmented supplier websites. Our advanced filters
                (carbon footprint, recycled content, certifications) put the right materials in front of you in seconds.
              </p>
            </div>

            {/* Risk Mitigation */}
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-accent/10 rounded-lg flex items-center justify-center mb-6">
                <ChartBarIcon className="w-10 h-10 text-green-accent" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">
                De-Risk Your Projects
              </h3>
              <p className="text-neutral-light leading-relaxed">
                Make confident, data-backed decisions. Compare lifecycle costs, validate certifications,
                and justify sustainable choices to clients—all in one place.
              </p>
            </div>

          </div>
        </section>

        {/* Section 2: How It Works */}
        <section className="mb-24">
          <h2 className="text-4xl font-bold text-center text-white mb-16">
            How It Works
          </h2>
          <div className="relative">
            {/* Desktop: Horizontal with arrows */}
            <div className="hidden md:flex items-center justify-between gap-8">

              {/* Step 1 */}
              <div className="flex-1 text-center">
                <div className="mx-auto w-20 h-20 bg-green-accent text-white rounded-full flex items-center justify-center text-3xl font-bold mb-6">
                  1
                </div>
                <h3 className="text-xl font-semibold text-white mb-4">
                  Search & Filter
                </h3>
                <p className="text-neutral-light">
                  Use advanced filters to find materials by type, application, certifications,
                  and sustainability metrics like carbon footprint.
                </p>
              </div>

              {/* Arrow */}
              <svg className="w-12 h-12 text-green-accent flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>

              {/* Step 2 */}
              <div className="flex-1 text-center">
                <div className="mx-auto w-20 h-20 bg-green-accent text-white rounded-full flex items-center justify-center text-3xl font-bold mb-6">
                  2
                </div>
                <h3 className="text-xl font-semibold text-white mb-4">
                  Compare Products
                </h3>
                <p className="text-neutral-light">
                  View side-by-side comparisons of specs, certifications, and lifecycle costs.
                  Download EPDs and technical data sheets instantly.
                </p>
              </div>

              {/* Arrow */}
              <svg className="w-12 h-12 text-green-accent flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>

              {/* Step 3 */}
              <div className="flex-1 text-center">
                <div className="mx-auto w-20 h-20 bg-green-accent text-white rounded-full flex items-center justify-center text-3xl font-bold mb-6">
                  3
                </div>
                <h3 className="text-xl font-semibold text-white mb-4">
                  Request Quote
                </h3>
                <p className="text-neutral-light">
                  Send a direct RFQ to verified suppliers. Manage all communications in your dashboard.
                  No more phone tag or lost emails.
                </p>
              </div>

            </div>

            {/* Mobile: Vertical stack */}
            <div className="md:hidden space-y-12">
              {/* Repeat 3 steps without arrows, stacked vertically */}
              {/* (Same content as above, just in flex-col) */}
            </div>

          </div>
        </section>

        {/* Section 3: Trusted By */}
        <section>
          <h2 className="text-4xl font-bold text-center text-white mb-12">
            Trusted By Industry Leaders
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
            {[
              'Insulation Manufacturers',
              'Architecture Firms',
              'Flooring Suppliers',
              'Roofing Innovators',
              'Green Contractors',
              'Material Scientists'
            ].map((category, idx) => (
              <div
                key={idx}
                className="h-20 bg-neutral-dark border-2 border-dashed border-neutral-medium rounded-lg flex items-center justify-center"
              >
                <p className="text-sm text-neutral-light font-medium">{category}</p>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
