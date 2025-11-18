import { Link } from 'react-router-dom';

const VALUE_PROPS = [
  {
    icon: '🛡️',
    title: 'Verified Sustainability Data',
    description: 'Every product is cross-referenced with official certification databases. No greenwashing, just facts.',
    stat: '500+ Verified Products'
  },
  {
    icon: '⏱️',
    title: 'Save 10+ Hours Per Project',
    description: 'Compare products side-by-side with apples-to-apples sustainability metrics. One platform, all the data.',
    stat: '75% Faster Sourcing'
  },
  {
    icon: '📊',
    title: 'Reduce Compliance Risk',
    description: 'All certifications verified. Download EPDs, compliance reports, and audit trails for every material.',
    stat: '100% LEED Compliant'
  }
];

export default function WhySection() {
  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Heading */}
        <h2 className="text-4xl font-bold text-center text-gray-900 mb-16">
          Why Choose GreenChainz?
        </h2>

        {/* 3-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {VALUE_PROPS.map((prop, idx) => (
            <div
              key={idx}
              className="bg-white p-8 rounded-xl shadow-md transition-all duration-300 hover:shadow-2xl hover:-translate-y-2"
            >
              {/* Icon */}
              <div className="text-5xl mb-4">{prop.icon}</div>

              {/* Title */}
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                {prop.title}
              </h3>

              {/* Description */}
              <p className="text-gray-600 mb-4 leading-relaxed">
                {prop.description}
              </p>

              {/* Stat */}
              <div className="text-sm font-semibold text-primary">
                {prop.stat}
              </div>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div className="mt-12 flex justify-center gap-6">
          <Link
            to="/how-it-works"
            className="px-8 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors"
          >
            See How It Works
          </Link>
          <Link
            to="/search"
            className="px-8 py-3 border-2 border-primary text-primary font-semibold rounded-lg hover:bg-primary/5 transition-colors"
          >
            Browse Products
          </Link>
        </div>
      </div>
    </section>
  );
}
