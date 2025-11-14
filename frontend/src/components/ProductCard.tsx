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
    </div>
  );
};

export default ProductCard;
