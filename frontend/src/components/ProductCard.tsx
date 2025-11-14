// frontend/src/components/ProductCard.tsx
import React from 'react';
import { Product } from '../types';

// Assuming we'll have a separate type for supplier info later
// For now, we'll pass the supplier name as a prop.
type ProductCardProps = {
  product: Product;
  supplierName: string;
  onRequestQuote: (productId: string) => void;
};

// Placeholder for certification icons.
// In a real app, these would likely be imported SVGs or an icon font.
const CertificationIcon: React.FC<{ name: string }> = ({ name }) => {
  // A real implementation would map names to actual icons
  return (
    <div className="bg-gray-200 text-gray-700 text-xs font-semibold mr-2 px-2.5 py-0.5 rounded-full">
      {name}
    </div>
  );
};

const ProductCard: React.FC<ProductCardProps> = ({ product, supplierName, onRequestQuote }) => {
  const {
    name,
    image_url,
    sustainability_data,
    certifications,
    epd_link
  } = product;

  const recycledContent = sustainability_data?.recycled_content;
  const gwp = sustainability_data?.gwp_fossil;
  const isVerified = !!epd_link;

  return (
    <div className="bg-white shadow-lg rounded-lg overflow-hidden transform transition duration-500 hover:scale-105 hover:shadow-2xl flex flex-col">
      <div className="relative">
        <img
          className="w-full h-48 object-cover"
          src={image_url || 'https://via.placeholder.com/400x300.png?text=No+Image'}
          alt={name}
        />
        {isVerified && (
          <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
            Verified
          </div>
        )}
      </div>
      <div className="p-4 flex-grow flex flex-col">
        <h3 className="text-sm text-gray-500 uppercase tracking-wide">{supplierName}</h3>
        <h2 className="text-lg font-bold text-gray-800 truncate">{name}</h2>

        <div className="mt-4 flex-grow">
          <p className="text-sm text-gray-600 font-semibold">Sustainability</p>
          <div className="mt-2 text-xs text-gray-500 space-y-1">
            {recycledContent !== undefined && (
              <p>
                <span className="font-bold">{recycledContent}%</span> Recycled Content
              </p>
            )}
            {gwp !== undefined && (
              <p>
                <span className="font-bold">{gwp}</span> kg CO₂e/unit (GWP)
              </p>
            )}
          </div>
        </div>

        <div className="mt-4">
            <p className="text-sm text-gray-600 font-semibold mb-2">Certifications</p>
            <div className="flex flex-wrap items-center">
                {certifications?.length ? (
                    certifications.map(cert => <CertificationIcon key={cert} name={cert} />)
                ) : (
                    <p className="text-xs text-gray-400">No certifications listed.</p>
                )}
            </div>
        </div>
      </div>
       <div className="p-4 pt-0">
         <button
            onClick={() => onRequestQuote(product.id)}
            className="w-full bg-green-700 text-white py-2 px-4 rounded-lg hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-green-700 focus:ring-opacity-50 transition-colors"
          >
            Request Quote
          </button>
        </div>
    </div>
  );
};

export default ProductCard;
