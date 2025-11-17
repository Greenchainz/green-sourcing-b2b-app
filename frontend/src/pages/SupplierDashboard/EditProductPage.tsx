import React from 'react';
import { Link, useParams } from 'react-router-dom';
import Sidebar from '../../components/SupplierDashboard/Sidebar';

export default function EditProductPage() {
  const { id } = useParams();

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <main className="flex-1 p-8">
        <h1 className="text-3xl font-bold text-foreground mb-8">
          Edit Product (ID: {id})
        </h1>
        <div className="max-w-3xl bg-background border border-border rounded-lg p-8 text-center">
          <p className="text-muted-foreground mb-4">
            The full form for editing products will be implemented in a future workstream.
          </p>
          <Link
            to="/dashboard/supplier/products"
            className="text-primary hover:underline"
          >
            &larr; Back to My Products
          </Link>
        </div>
      </main>
    </div>
  );
}
