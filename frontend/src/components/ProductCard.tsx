 feature/product-card-component
// frontend/src/components/ProductCard.tsx
import { Product } from '@/types';

 feat/greenchainz-search-bar
import React from 'react';
import { Product } from '../types';
import './ProductCard.css';
 main

interface ProductCardProps {
  product: Product;
}

 feature/product-card-component
export default function ProductCard({ product }: ProductCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden group transition-shadow hover:shadow-lg">
      <div className="relative">
        <img
          src={product.image_url || 'https://via.placeholder.com/300'}
          alt={product.name}
          className="w-full h-48 object-cover"
        />
        <div className="absolute top-2 right-2">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Verified
          </span>
        </div>
      </div>
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-800 truncate" title={product.name}>
          {product.name}
        </h3>
        <p className="text-sm text-gray-600 mb-2">by Supplier Name</p>

        {/* Sustainability Badges */}
        <div className="flex flex-wrap gap-1 my-2">
          {product.sustainability_data.certifications?.map((cert) => (
            <span
              key={cert}
              className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700"
            >
              {cert}
            </span>
          ))}
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <p className="text-lg font-bold text-gray-900">$TBD</p>
            <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium">
                Request Quote
            </button>
        </div>
      </div>
    </div>
  );
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  return (
    <div className="product-card">
      {product.supplier && <img src={product.supplier.logo_url} alt={product.supplier.name} />}
      <h3>{product.name}</h3>
      <p>{product.description}</p>
      <div className="product-card-details">
        <span>{product.material_type}</span>
        <span>{product.application}</span>
      </div>
      {product.certifications && product.certifications.length > 0 && (
        <div className="product-card-certifications">
          {product.certifications.map((cert) => (
            <span key={cert}>{cert}</span>
          ))}
        </div>
      )}

// frontend/src/components/ProductCard.tsx

import React from 'react';
import './ProductCard.css'; // We will create this file in the next step

/**
 * @interface Product
 * @description Defines the structure for a product object.
 */
export interface Product {
  id: string;
  name: string;
  image: string; // URL to the product image
  supplier: string;
  certifications: string[]; // Array of certification names, e.g., ['FSC', 'LEED']
  sustainability_data: {
    recycled_content_percent?: number; // Optional: percentage of recycled content
    carbon_footprint_kg_co2e?: number; // Optional: Global Warming Potential in kg CO2e
    epd_verified: boolean; // True if the product has a verified Environmental Product Declaration
  };
}

// Define the props for the ProductCard component
interface ProductCardProps {
  product: Product;
  onRequestQuote: (productId: string) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onRequestQuote }) => {
  const { name, image, supplier, certifications, sustainability_data } = product;
  const { recycled_content_percent, carbon_footprint_kg_co2e, epd_verified } = sustainability_data;

  // Fallback image handler
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    // In a real app, you'd replace this with a path to a placeholder image
    e.currentTarget.src = 'https://via.placeholder.com/300';
  };

  return (
    <div className="product-card">
      <div className="product-image-container">
        <img src={image} alt={name} className="product-image" onError={handleImageError} />
        {epd_verified && <div className="verified-badge">✓ Verified</div>}
      </div>
      <div className="product-info">
        <h3 className="product-name">{name}</h3>
        <p className="supplier-name">{supplier}</p>
        <div className="sustainability-metrics">
          {recycled_content_percent && (
            <p><strong>Recycled Content:</strong> {recycled_content_percent}%</p>
          )}
          {carbon_footprint_kg_co2e && (
            <p><strong>Carbon Footprint:</strong> {carbon_footprint_kg_co2e} kg CO₂e</p>
          )}
        </div>
        <div className="certification-badges">
          {certifications.map((cert) => (
            <span key={cert} className="certification-badge">{cert}</span>
          ))}
        </div>
      </div>
      <button className="request-quote-btn" onClick={() => onRequestQuote(product.id)}>
        Request Quote
      </button>
main
    </div>
  );
};

export default ProductCard;
 main
