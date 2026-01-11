import Link from "next/link";
import { ShieldCheck, Clock, BarChart } from "lucide-react";

const VALUE_PROPS = [
  {
    icon: ShieldCheck,
    title: "Verified Sustainability Data",
    description:
      "Every product is cross-referenced with official certification databases. No greenwashing, just facts.",
    stat: "500+ Verified Products",
  },
  {
    icon: Clock,
    title: "Save 10+ Hours Per Project",
    description:
      "Compare products side-by-side with apples-to-apples sustainability metrics. One platform, all the data.",
    stat: "75% Faster Sourcing",
  },
  {
    icon: BarChart,
    title: "Reduce Compliance Risk",
    description:
      "All certifications verified. Download EPDs, compliance reports, and audit trails for every material.",
    stat: "100% LEED Compliant",
  },
];

export default function WhySection() {
  return (
    <section className="py-24 bg-white border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            Why Choose GreenChainz?
          </h2>
          <p className="mt-4 text-xl text-gray-600">
            The standard for sustainable procurement.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {VALUE_PROPS.map((prop, idx) => (
            <div
              key={idx}
              className="group relative bg-white p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              <div className="inline-flex items-center justify-center p-3 rounded-xl bg-emerald-50 text-emerald-600 mb-6 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <prop.icon className="h-8 w-8" />
              </div>

              <h3 className="text-xl font-bold text-gray-900 mb-3">
                {prop.title}
              </h3>

              <p className="text-gray-600 mb-6 leading-relaxed">
                {prop.description}
              </p>

              <div className="flex items-center text-sm font-semibold text-emerald-600">
                {prop.stat}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 flex justify-center gap-6">
          <Link
            href="/how-it-works"
            className="px-8 py-3 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 transition-colors shadow-lg hover:shadow-emerald-500/30"
          >
            See How It Works
          </Link>
          <Link
            href="/search"
            className="px-8 py-3 border border-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
          >
            Browse Products
          </Link>
        </div>
      </div>
    </section>
  );
}
