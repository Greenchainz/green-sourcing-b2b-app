// src/pages/ProductDetailPage.tsx
import { useState } from 'react';
import type { Product, Supplier, RFQData } from '../types';
import RFQModal from '../components/RFQModal';

// Sample Data
const sampleSupplier: Supplier = {
  id: 'sup_123',
  name: 'EcoBuild Materials',
  location: 'Green Valley, CA',
  description: 'Leading provider of sustainable and eco-friendly building materials.',
  logo_url: 'https://via.placeholder.com/150'
};

const sampleProduct: Product = {
  id: 'prod_456',
  name: 'EcoTherm Insulation',
  description: 'High-performance, eco-friendly insulation made from 80% recycled materials.',
  supplier_id: 'sup_123',
  images: [
    'https://via.placeholder.com/600x400.png?text=Product+Image+1',
    'https://via.placeholder.com/600x400.png?text=Product+Image+2',
    'https://via.placeholder.com/600x400.png?text=Product+Image+3',
  ],
  specs: {
    'R-Value': 'R-15',
    'Fire Rating': 'Class A',
    'Material': 'Recycled Denim',
    'Thickness': '3.5 inches'
  },
  sustainability_data: {
    gwp: 5.2,
    recycled_content: 80,
    water_usage: 10,
    voc_level: 0.5,
    epd_link: 'https://example.com/epd_document.pdf',
    certifications: ['LEED', 'Green Seal']
  },
  supplier: sampleSupplier
};

export default function ProductDetailPage() {
  const [isModalOpen, setModalOpen] = useState(false);
  const product = sampleProduct; // In a real app, you'd fetch this data

  const handleRFQSubmit = (rfqData: RFQData) => {
    console.log('RFQ Submitted', rfqData);
    setModalOpen(false);
    // Here you would typically send the data to your backend
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">{product.name}</h1>
            <div className="flex items-center mt-2">
              <img src={product.supplier?.logo_url} alt={product.supplier?.name} className="h-8 w-8 rounded-full mr-3" />
              <span className="text-lg text-gray-600">{product.supplier?.name}</span>
            </div>
          </div>
          {product.sustainability_data.epd_link && (
            <div className="flex-shrink-0">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 border border-green-300">
                <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 18.25a11.954 11.954 0 007.834-13.251A1 1 0 0016.5 3.5v-.667a1 1 0 00-1-1h-.333a1 1 0 00-1 1v.208a9.955 9.955 0 00-6.333 0V1.833a1 1 0 00-1-1H6.5a1 1 0 00-1 1v.667a1 1 0 00.666 1.499z" clipRule="evenodd"></path></svg>
                Verified EPD
              </span>
            </div>
          )}
        </div>

        {/* Image Gallery & Main Info */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3">
            <div className="aspect-w-16 aspect-h-9 rounded-lg overflow-hidden shadow-lg mb-4">
              <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {product.images.slice(1).map((img, index) => (
                <div key={index} className="aspect-w-16 aspect-h-9 rounded-lg overflow-hidden shadow">
                  <img src={img} alt={`${product.name} ${index + 2}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">Request a Quote</h2>
              <p className="text-gray-600 mb-6">Get pricing and availability for your project from the supplier.</p>
              <button
                onClick={() => setModalOpen(true)}
                className="w-full px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors text-lg">
                Request Quote
              </button>
            </div>
          </div>
        </div>

        {/* Detailed Info Sections */}
        <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Specs Table */}
          <div>
            <h3 className="text-2xl font-semibold text-gray-800 mb-4">Technical Specifications</h3>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <tbody className="bg-white divide-y divide-gray-200">
                  {Object.entries(product.specs).map(([key, value]) => (
                    <tr key={key}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500">{key}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sustainability Data */}
          <div>
            <h3 className="text-2xl font-semibold text-gray-800 mb-4">Sustainability Data</h3>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <tbody className="bg-white divide-y divide-gray-200">
                  {Object.entries(product.sustainability_data).map(([key, value]) => (
                    <tr key={key}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500 capitalize">{key.replace('_', ' ')}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {key === 'epd_link' ? <a href={value as string} className="text-green-600 hover:underline">View Document</a> : value?.toString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Supplier Info */}
        <div className="mt-12">
          <h3 className="text-2xl font-semibold text-gray-800 mb-4">About the Supplier</h3>
          <div className="bg-white p-6 rounded-lg shadow flex items-center">
            <img src={product.supplier?.logo_url} alt={product.supplier?.name} className="h-20 w-20 rounded-full mr-6" />
            <div>
              <h4 className="text-xl font-bold text-gray-900">{product.supplier?.name}</h4>
              <p className="text-gray-600">{product.supplier?.location}</p>
              <p className="mt-2 text-gray-600">{product.supplier?.description}</p>
            </div>
          </div>
        </div>
      </div>
      <RFQModal
        isOpen={isModalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleRFQSubmit}
        productName={product.name}
      />
    </div>
  );
}
