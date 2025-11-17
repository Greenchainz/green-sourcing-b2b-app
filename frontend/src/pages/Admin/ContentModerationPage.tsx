import React, { useState } from 'react';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import AdminSidebar from '../../components/Admin/AdminSidebar';

// MOCK DATA
const MOCK_PENDING_SUPPLIERS = [
  {
    id: 1,
    companyName: 'Warmcel Insulation Ltd',
    contactEmail: 'info@warmcel.com',
    location: 'Cornwall, UK',
    certifications: ['FSC', 'B Corp'],
    submittedAt: '2025-11-15',
    status: 'Pending'
  },
  {
    id: 2,
    companyName: 'Greenfiber Inc',
    contactEmail: 'sales@greenfiber.com',
    location: 'Seattle, WA',
    certifications: ['LEED'],
    submittedAt: '2025-11-14',
    status: 'Pending'
  }
];

const MOCK_PENDING_PRODUCTS = [
  {
    id: 1,
    name: 'Warmcel Cellulose Insulation',
    company: 'Warmcel Insulation Ltd',
    materialType: 'Insulation',
    recycledContent: 85,
    certifications: ['FSC'],
    submittedAt: '2025-11-16',
    status: 'Pending'
  }
];

export default function ContentModerationPage() {
  const [suppliers, setSuppliers] = useState(MOCK_PENDING_SUPPLIERS);
  const [products, setProducts] = useState(MOCK_PENDING_PRODUCTS);
  const [activeTab, setActiveTab] = useState('suppliers');

  const handleApproveSupplier = (id) => {
    // Phase 1: Update Supabase status to 'Approved'
    setSuppliers(suppliers.filter(s => s.id !== id));
    alert('Supplier approved!');
  };

  const handleRejectSupplier = (id) => {
    // Phase 1: Update Supabase status to 'Rejected', send email
    setSuppliers(suppliers.filter(s => s.id !== id));
    alert('Supplier rejected.');
  };

  const handleApproveProduct = (id) => {
    setProducts(products.filter(p => p.id !== id));
    alert('Product approved!');
  };

  const handleRejectProduct = (id) => {
    setProducts(products.filter(p => p.id !== id));
    alert('Product rejected.');
  };

  return (
    <div className="min-h-screen bg-background flex">
      <AdminSidebar />

      <main className="flex-1 p-8">
        <h1 className="text-3xl font-bold text-foreground mb-8">Content Moderation</h1>

        {/* Tabs */}
        <div className="border-b border-border mb-6 flex gap-8">
          <button
            onClick={() => setActiveTab('suppliers')}
            className={`px-4 py-3 font-medium ${
              activeTab === 'suppliers'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Pending Suppliers ({suppliers.length})
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`px-4 py-3 font-medium ${
              activeTab === 'products'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Pending Products ({products.length})
          </button>
        </div>

        {/* Suppliers Tab */}
        {activeTab === 'suppliers' && (
          <div className="bg-background border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted border-b border-border">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Company</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Location</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Certifications</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Submitted</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map(supplier => (
                  <tr key={supplier.id} className="border-b border-border last:border-0">
                    <td className="px-6 py-4">
                      <p className="font-medium text-foreground">{supplier.companyName}</p>
                      <p className="text-sm text-muted-foreground">{supplier.contactEmail}</p>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{supplier.location}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {supplier.certifications.map(cert => (
                          <span key={cert} className="px-2 py-1 bg-primary-light text-primary text-xs rounded">
                            {cert}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{supplier.submittedAt}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleApproveSupplier(supplier.id)}
                          className="p-2 bg-primary-light text-primary rounded-md hover:bg-primary-hover transition-colors"
                        >
                          <CheckIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleRejectSupplier(supplier.id)}
                          className="p-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 transition-colors"
                        >
                          <XMarkIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Products Tab */}
        {activeTab === 'products' && (
          <div className="bg-background border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted border-b border-border">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Product</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Company</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Material Type</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Recycled %</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map(product => (
                  <tr key={product.id} className="border-b border-border last:border-0">
                    <td className="px-6 py-4 font-medium text-foreground">{product.name}</td>
                    <td className="px-6 py-4 text-muted-foreground">{product.company}</td>
                    <td className="px-6 py-4 text-muted-foreground">{product.materialType}</td>
                    <td className="px-6 py-4 text-muted-foreground">{product.recycledContent}%</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleApproveProduct(product.id)}
                          className="p-2 bg-primary-light text-primary rounded-md hover:bg-primary-hover transition-colors"
                        >
                          <CheckIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleRejectProduct(product.id)}
                          className="p-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 transition-colors"
                        >
                          <XMarkIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </main>
    </div>
  );
}
