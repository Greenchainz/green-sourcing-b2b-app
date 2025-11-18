// Placeholder for frontend/src/pages/SupplierProfilePage.tsx
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import ReviewsSection from '../components/Reviews/ReviewsSection';

// MOCK DATA - In a real scenario, this would be fetched based on the ID
const MOCK_SUPPLIER = {
  id: 12,
  name: 'Warmcel Insulation Ltd',
  location: 'Cornwall, UK',
  description: 'Leading provider of high-performance, recycled cellulose insulation.',
};

export default function SupplierProfilePage() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('reviews');

  // In a real implementation, you would fetch supplier data here based on `id`
  const supplier = MOCK_SUPPLIER;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Supplier Header */}
        <div className="mb-8 pb-8 border-b border-border">
          <h1 className="text-4xl font-bold text-foreground mb-2">{supplier.name}</h1>
          <p className="text-lg text-muted-foreground">{supplier.location}</p>
          <p className="mt-4 text-foreground leading-relaxed">{supplier.description}</p>
        </div>

        {/* Tabs Section */}
        <div>
          {/* Tab Headers */}
          <div className="border-b border-border flex gap-8">
             <button
              onClick={() => setActiveTab('products')}
              className={`px-4 py-3 font-medium ${
                activeTab === 'products'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Products
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`px-4 py-3 font-medium ${
                activeTab === 'reviews'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Reviews
            </button>
          </div>

          {/* Tab Content */}
          <div className="py-8">
            {activeTab === 'products' && (
              <div className="text-center py-12 bg-muted rounded-lg">
                <h3 className="text-xl font-semibold text-foreground">Supplier Products</h3>
                <p className="text-muted-foreground mt-2">Product listings will be displayed here.</p>
              </div>
            )}
            {activeTab === 'reviews' && (
              <ReviewsSection itemId={supplier.id} itemType="supplier" itemName={supplier.name} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
