import React from 'react';
import { Product as MockProduct } from '../../mocks/supplierData';
import ProductCard from '../ProductCard';
import { Product as ProductCardType } from '../../types';

interface SupplierProductsProps {
  products: MockProduct[];
  supplierName: string;
}

const SupplierProducts: React.FC<SupplierProductsProps> = ({ products, supplierName }) => {

  const adaptedProducts: ProductCardType[] = products.map(p => ({
    ...p,
    id: p.id,
    description: `A product from ${supplierName}`,
    supplier_id: supplierName,
    material_type: 'Mixed',
    recycled_content: p.recycledContent,
    image_url: `https://via.placeholder.com/400x300.png?text=${encodeURIComponent(p.name)}`,
  }));

  const handleRequestQuote = (productId: string) => {
    console.log(`Requesting quote for product ID: ${productId}`);
    alert(`MVP: Request Quote for product ${productId}`);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-900">Products</h2>
        <button className="text-primary font-semibold hover:underline">
          View All Products ({products.length})
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {adaptedProducts.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            supplierName={supplierName}
            onRequestQuote={handleRequestQuote}
          />
        ))}
      </div>
    </div>
  );
};

export default SupplierProducts;
