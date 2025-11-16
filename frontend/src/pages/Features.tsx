import { Link } from 'react-router-dom';
import Logo from '../components/Logo';

export default function Features() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
            {/* Header */}
            <header className="border-b border-slate-800/50 bg-slate-950/50 backdrop-blur-sm sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <Logo height={40} showText={true} />
                        <nav className="flex items-center gap-6">
                            <Link to="/" className="text-slate-300 hover:text-white transition-colors">Home</Link>
                            <Link to="/login" className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-medium transition-colors">
                                Sign In
                            </Link>
                        </nav>
                    </div>
                </div>
            </header>

            {/* Hero */}
            <section className="py-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="text-5xl font-bold text-white mb-6 text-center">Platform Features</h2>
                    <p className="text-xl text-slate-300 text-center mb-16 max-w-3xl mx-auto">
                        Everything you need to source, compare, and procure sustainable building materials with confidence
                    </p>

                    {/* Features Grid */}
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {features.map((feature, i) => (
                            <div key={i} className="p-6 rounded-2xl bg-slate-800/50 border border-slate-700/50 hover:border-sky-500/50 transition-all">
                                <div className="text-4xl mb-4">{feature.icon}</div>
                                <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                                <p className="text-slate-400 mb-4">{feature.description}</p>
                                {feature.items && (
                                    <ul className="space-y-2">
                                        {feature.items.map((item, j) => (
                                            <li key={j} className="flex items-start gap-2 text-sm text-slate-300">
                                                <span className="text-sky-400 mt-1">✓</span>
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-20 bg-slate-900/50">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h3 className="text-3xl font-bold text-white mb-6">Ready to Get Started?</h3>
                    <p className="text-xl text-slate-300 mb-8">
                        Join GreenChainz and transform your sustainable sourcing workflow
                    </p>
                    <Link
                        to="/signup"
                        className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-600 text-white font-semibold text-lg shadow-lg shadow-sky-500/25 hover:shadow-sky-500/40 transition-all hover:scale-105"
                    >
                        Start Free Trial
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                    </Link>
                </div>
            </section>
        </div>
    );
}

const features = [
    {
        icon: '🔍',
        title: 'Advanced Search & Filtering',
        description: 'Find exactly what you need with powerful search tools',
        items: [
            'Filter by carbon footprint',
            'Search by certification (FSC, B Corp, LEED)',
            'Performance specifications',
            'Lead time and availability',
            'Price range filtering'
        ]
    },
    {
        icon: '📊',
        title: 'Side-by-Side Comparison',
        description: 'Compare materials across all sustainability metrics',
        items: [
            'Visual comparison charts',
            'Carbon footprint comparison',
            'Cost analysis',
            'Certification validation',
            'Export comparison reports'
        ]
    },
    {
        icon: '✉️',
        title: 'Instant RFQ System',
        description: 'Send requests for quotes directly to suppliers',
        items: [
            'One-click RFQ submission',
            'Track quote status',
            'Message suppliers directly',
            'Automated follow-ups',
            'Proposal management'
        ]
    },
    {
        icon: '✅',
        title: 'Verified Suppliers Only',
        description: 'Every supplier is vetted and certified',
        items: [
            'Third-party verification',
            'Live certification status',
            'Supplier ratings & reviews',
            'Compliance tracking',
            'Audit trail'
        ]
    },
    {
        icon: '📈',
        title: 'Sustainability Analytics',
        description: 'Track your project\'s environmental impact',
        items: [
            'Carbon footprint dashboard',
            'Sustainability score',
            'LEED credit tracking',
            'ESG reporting',
            'Impact visualization'
        ]
    },
    {
        icon: '🔐',
        title: 'Secure Collaboration',
        description: 'Work seamlessly with your team',
        items: [
            'Team workspaces',
            'Role-based access',
            'Project folders',
            'Shared specifications',
            'Comment threads'
        ]
    },
    {
        icon: '🌍',
        title: 'Global Data Integration',
        description: 'Connected to leading sustainability databases',
        items: [
            'Building Transparency EC3',
            'FSC certification data',
            'B Corp directory',
            'EPD databases',
            'Custom API integrations'
        ]
    },
    {
        icon: '📱',
        title: 'Mobile Access',
        description: 'Work from anywhere, on any device',
        items: [
            'Responsive web app',
            'iOS & Android support',
            'Offline mode',
            'Push notifications',
            'Mobile-optimized UI'
        ]
    },
    {
        icon: '🤝',
        title: 'Vendor Management',
        description: 'Streamline your supplier relationships',
        items: [
            'Vendor profiles',
            'Contract management',
            'Performance tracking',
            'Payment integration',
            'Order history'
        ]
    }
];
