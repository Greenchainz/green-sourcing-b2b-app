import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronRightIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

// MOCK DATA (replace with Supabase query in Phase 1)
const MOCK_PRODUCT = {
  id: 1,
  name: 'Warmcel Cellulose Insulation',
  company: {
    id: 12,
    name: 'Warmcel Insulation Ltd',
    logo: '/suppliers/warmcel-logo.png',
    location: 'Cornwall, UK'
  },
  images: [
    'https://source.unsplash.com/800x600/?insulation',
    'https://source.unsplash.com/800x600/?construction',
    'https://source.unsplash.com/800x600/?building-materials'
  ],
  description: 'Warmcel is a cellulose fiber insulation made from recycled paper, treated with natural minerals for fire and pest resistance. Ideal for residential and commercial applications.',
  specs: {
    rValue: 3.7,
    materialType: 'Insulation',
    application: ['Residential', 'Commercial'],
    recycledContent: 85,
    vocLevel: 'Low',
    fireRating: 'Class A',
    density: '3.5 lb/ft³'
  },
  certifications: [
    { name: 'FSC', logo: '/certs/fsc.png', number: 'FSC-C123456', expires: '2026-12-31' },
    { name: 'LEED', logo: '/certs/leed.png', credits: 'MR Credit 2' },
    { name: 'B Corp', logo: '/certs/bcorp.png', certified: true }
  ],
  epd: {
    url: '/epds/warmcel-epd-2024.pdf',
    gwp: 4.2, // kg CO2e
    issueDate: '2024-01-15',
    expires: '2029-01-15'
  },
  pricing: {
    range: '$$',
    contactForQuote: true
  }
};

export default function ProductDetailPage() {
  const params = useParams();
  const productId = params?.id;

  const [activeTab, setActiveTab] = useState('overview');
  const [currentImage, setCurrentImage] = useState(0);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [isRFQSubmitted, setRFQSubmitted] = useState(false);

  // In Phase 1: Replace with Supabase query
  const product = MOCK_PRODUCT;

  const handleRequestQuote = (e: React.FormEvent) => {
    e.preventDefault();
    // Phase 1: Submit to Supabase + send email
    console.log('RFQ submitted for product:', product.id);
    setShowQuoteModal(false);
    setRFQSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Breadcrumbs */}
      <div className="bg-muted border-b border-border py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-primary">Home</Link>
            <ChevronRightIcon className="w-4 h-4" />
            <Link to="/search" className="hover:text-primary">Products</Link>
            <ChevronRightIcon className="w-4 h-4" />
            <Link to={`/search?category=${product.specs.materialType}`} className="hover:text-primary">
              {product.specs.materialType}
            </Link>
            <ChevronRightIcon className="w-4 h-4" />
            <span className="text-foreground">{product.name}</span>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Left: Image Gallery */}
          <div>
            {/* Main Image */}
            <div className="aspect-square bg-muted rounded-lg overflow-hidden mb-4">
              <img
                src={product.images[currentImage]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Thumbnails */}
            <div className="grid grid-cols-3 gap-4">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentImage(idx)}
                  className={`aspect-square rounded-lg overflow-hidden border-2 ${
                    currentImage === idx ? 'border-primary' : 'border-border'
                  }`}
                >
                  <img src={img} alt={`View ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Right: Product Info */}
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-4">{product.name}</h1>

            {/* Supplier Info */}
            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-border">
              <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center">
                <span className="text-sm font-medium">{product.company.name.substring(0, 2)}</span>
              </div>
              <div>
                <Link to={`/supplier/${product.company.id}`} className="text-lg font-semibold text-primary hover:underline">
                  {product.company.name}
                </Link>
                <p className="text-sm text-muted-foreground">{product.company.location}</p>
              </div>
            </div>

            {/* Description */}
            <p className="text-foreground leading-relaxed mb-6">
              {product.description}
            </p>

            {/* Key Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6 p-6 bg-muted rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Recycled Content</p>
                <p className="text-2xl font-bold text-primary">{product.specs.recycledContent}%</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Carbon Footprint</p>
                <p className="text-2xl font-bold text-primary">{product.epd.gwp} kg CO₂e</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">R-Value</p>
                <p className="text-2xl font-bold text-foreground">{product.specs.rValue}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">VOC Level</p>
                <p className="text-2xl font-bold text-foreground">{product.specs.vocLevel}</p>
              </div>
            </div>

            {/* Certifications */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-foreground mb-3">Certifications</h3>
              <div className="flex gap-3">
                {product.certifications.map((cert, idx) => (
                  <div key={idx} className="px-4 py-2 bg-primary/10 border border-primary rounded-md">
                    <span className="text-sm font-medium text-primary">{cert.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Success Message */}
            {isRFQSubmitted && (
              <div className="mb-6 p-4 bg-green-100 border border-green-500 rounded-lg">
                <p className="text-green-800 font-semibold">RFQ Sent!</p>
                <p className="text-green-700 text-sm">Your quote request has been sent. {product.company.name} will respond within 48 hours.</p>
              </div>
            )}

            {/* CTA Buttons */}
            <div className="flex gap-4">
              <button
                onClick={() => setShowQuoteModal(true)}
                className="flex-1 px-8 py-4 bg-primary text-white font-semibold rounded-lg hover:bg-primary-hover transition-colors"
              >
                Request Quote
              </button>
              <button className="px-8 py-4 border-2 border-border text-foreground font-semibold rounded-lg hover:bg-muted transition-colors">
                Save to Project
              </button>
            </div>

            {/* EPD Download */}
            <a
              href={product.epd.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 flex items-center gap-2 text-primary hover:underline"
            >
              <DocumentTextIcon className="w-5 h-5" />
              Download Environmental Product Declaration (EPD)
            </a>
          </div>
        </div>

        {/* Tabs Section */}
        <div className="mt-12">
          {/* Tab Headers */}
          <div className="border-b border-border flex gap-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-3 font-medium ${
                activeTab === 'overview'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('specs')}
              className={`px-4 py-3 font-medium ${
                activeTab === 'specs'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Technical Specifications
            </button>
            <button
              onClick={() => setActiveTab('certifications')}
              className={`px-4 py-3 font-medium ${
                activeTab === 'certifications'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Sustainability Data
            </button>
          </div>

          {/* Tab Content */}
          <div className="py-8">
            {activeTab === 'overview' && (
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4">Product Overview</h2>
                <p className="text-foreground leading-relaxed mb-6">
                  {product.description}
                </p>
                <h3 className="text-xl font-semibold text-foreground mb-3">Applications</h3>
                <ul className="list-disc list-inside space-y-2 text-foreground">
                  {product.specs.application.map((app, idx) => (
                    <li key={idx}>{app} construction</li>
                  ))}
                </ul>
              </div>
            )}

            {activeTab === 'specs' && (
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4">Technical Specifications</h2>
                <table className="w-full border-collapse">
                  <tbody>
                    <tr className="border-b border-border">
                      <td className="py-3 font-medium text-foreground">Material Type</td>
                      <td className="py-3 text-muted-foreground">{product.specs.materialType}</td>
                    </tr>
                    <tr className="border-b border-border">
                      <td className="py-3 font-medium text-foreground">R-Value</td>
                      <td className="py-3 text-muted-foreground">{product.specs.rValue} per inch</td>
                    </tr>
                    <tr className="border-b border-border">
                      <td className="py-3 font-medium text-foreground">Density</td>
                      <td className="py-3 text-muted-foreground">{product.specs.density}</td>
                    </tr>
                    <tr className="border-b border-border">
                      <td className="py-3 font-medium text-foreground">Fire Rating</td>
                      <td className="py-3 text-muted-foreground">{product.specs.fireRating}</td>
                    </tr>
                    <tr className="border-b border-border">
                      <td className="py-3 font-medium text-foreground">VOC Level</td>
                      <td className="py-3 text-muted-foreground">{product.specs.vocLevel}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'certifications' && (
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-6">Sustainability Certifications & Data</h2>
                <div className="space-y-6">
                  {product.certifications.map((cert, idx) => (
                    <div key={idx} className="p-6 border border-border rounded-lg">
                      <h3 className="text-lg font-semibold text-foreground mb-2">{cert.name}</h3>
                      {cert.number && <p className="text-sm text-muted-foreground mb-1">Certificate: {cert.number}</p>}
                      {cert.expires && <p className="text-sm text-muted-foreground">Expires: {cert.expires}</p>}
                      {cert.credits && <p className="text-sm text-muted-foreground">LEED Credits: {cert.credits}</p>}
                    </div>
                  ))}
                  <div className="p-6 bg-muted rounded-lg">
                    <h3 className="text-lg font-semibold text-foreground mb-4">Environmental Product Declaration (EPD)</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Global Warming Potential</p>
                        <p className="text-xl font-bold text-primary">{product.epd.gwp} kg CO₂e</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Recycled Content</p>
                        <p className="text-xl font-bold text-primary">{product.specs.recycledContent}%</p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-4">
                      Issued: {product.epd.issueDate} | Expires: {product.epd.expires}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Request Quote Modal */}
      {showQuoteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-8 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-foreground mb-4">Request Quote</h2>
            <p className="text-muted-foreground mb-6">Product: {product.name}</p>
            <form onSubmit={handleRequestQuote} className="space-y-4">
              <input
                type="email"
                placeholder="Your Email"
                required
                className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <input
                type="text"
                placeholder="Company Name"
                required
                className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <textarea
                placeholder="Project Details & Quantity Needed"
                rows={4}
                required
                className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setShowQuoteModal(false)}
                  className="flex-1 px-6 py-3 border-2 border-border text-foreground font-semibold rounded-lg hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-hover transition-colors"
                >
                  Send RFQ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
