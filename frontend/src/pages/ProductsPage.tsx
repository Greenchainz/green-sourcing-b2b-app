import React from 'react';
import SearchBar from '../components/SearchBar';

const ProductsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Sustainable Building Products
          </h1>
          <p className="mt-2 text-gray-600">
            Browse verified sustainable materials from certified suppliers
          </p>
        </div>
        <SearchBar />
      </div>
    </div>
  );
};

export default ProductsPage;
