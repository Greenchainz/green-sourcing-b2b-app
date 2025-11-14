import React from 'react';
import { Product } from '../types';
import './ProductCard.css';

interface ProductCardProps {
  product: Product;
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
    </div>
  );
};

export default ProductCard;
