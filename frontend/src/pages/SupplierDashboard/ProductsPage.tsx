import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import Sidebar from '../../components/SupplierDashboard/Sidebar';

// MOCK DATA
const MOCK_PRODUCTS = [
  {
    id: 1,
    name: 'Warmcel Cellulose Insulation',
    materialType: 'Insulation',
    recycledContent: 85,
    status: 'Published',
    createdAt: '2024-11-01'
  },
  {
    id: 2,
    name: 'Greenfiber Low-VOC Flooring',
    materialType: 'Flooring',
    recycledContent: 60,
    status: 'Draft',
    createdAt: '2024-11-15'
  }
];

export default function ProductsPage() {
  const [products, setProducts] = useState(MOCK_PRODUCTS);

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this product?')) {
      setProducts(products.filter(p => p.id !== id));
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />

      <main className="flex-1 p-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-foreground">My Products</h1>
          <Link
            to="/dashboard/supplier/products/new"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-hover transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            Add Product
          </Link>
        </div>

        {/* Products Table */}
        <div className="bg-background border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted border-b border-border">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Product Name</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Material Type</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Recycled Content</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Status</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map(product => (
                <tr key={product.id} className="border-b border-border last:border-0">
                  <td className="px-6 py-4 text-foreground">{product.name}</td>
                  <td className="px-6 py-4 text-muted-foreground">{product.materialType}</td>
                  <td className="px-6 py-4 text-muted-foreground">{product.recycledContent}%</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      product.status === 'Published'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {product.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        to={`/dashboard/supplier/products/${product.id}/edit`}
                        className="p-2 text-primary hover:bg-primary/10 rounded-md transition-colors"
                      >
                        <PencilIcon className="w-5 h-5" />
                      </Link>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </main>
    </div>
  );
}
