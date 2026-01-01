// frontend/src/pages/ProductDemoPage.tsx

import ProductCard, { Product } from '../components/ProductCard';
import './ProductDemoPage.css'; // We'll create this for layout

const ProductDemoPage: React.FC = () => {
  // Sample product data
  const sampleProducts: Product[] = [
    {
      id: 'prod-001',
      name: 'Eco-Friendly Insulation',
      image: 'https://via.placeholder.com/300x225/2d6a4f/ffffff?text=Eco+Insulation',
      supplier: 'GreenBuild Supplies',
      certifications: ['FSC', 'LEED'],
      sustainability_data: {
        recycled_content_percent: 85,
        carbon_footprint_kg_co2e: 5.2,
        epd_verified: true,
      },
    },
    {
      id: 'prod-002',
      name: 'Recycled Steel Beams',
      image: 'https://via.placeholder.com/300x225/4a5568/ffffff?text=Steel+Beams',
      supplier: 'Sustainable Structures Inc.',
      certifications: ['C2C', 'BREEAM'],
      sustainability_data: {
        recycled_content_percent: 95,
        epd_verified: true,
      },
    },
    {
      id: 'prod-003',
      name: 'Low-VOC Paint',
      image: 'https://via.placeholder.com/300x225/f7fafc/333333?text=Low-VOC+Paint',
      supplier: 'PureCoat Paints',
      certifications: ['GREENGUARD Gold'],
      sustainability_data: {
        carbon_footprint_kg_co2e: 1.5,
        epd_verified: false,
      },
    },
  ];

  const handleRequestQuote = (productId: string) => {
    alert(`Requesting quote for product ID: ${productId}`);
    // In a real app, this would trigger a modal or navigate to a form
  };

  return (
    <div className="product-demo-page">
      <h1>Product Showcase</h1>
      <div className="product-grid">
        {sampleProducts.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onRequestQuote={handleRequestQuote}
          />
        ))}
      </div>
    </div>
  );
};

export default ProductDemoPage;
