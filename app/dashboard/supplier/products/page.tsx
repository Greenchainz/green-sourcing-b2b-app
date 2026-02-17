'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Filter, MoreHorizontal, AlertCircle, CheckCircle } from 'lucide-react';

interface Product {
  id: string;
  name?: string;
  category?: string;
  status?: string;
  carbon_footprint?: number;
  source?: string;
  image_url?: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/supplier/products')
      .then(res => res.json())
      .then(data => {
        setProducts(data);
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Product Catalog</h2>
          <p className="text-slate-500">Manage your sustainable materials and certifications.</p>
        </div>
        <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors">
          <Plus size={18} />
          Add Product
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center bg-[#111111] p-2 rounded-lg border border-[#aaff00]/10 w-fit">
        <button className="px-3 py-1.5 text-sm font-medium text-slate-300 bg-[#1a1a1a] rounded-md">All</button>
        <button className="px-3 py-1.5 text-sm font-medium text-slate-500 hover:text-slate-300">Approved</button>
        <button className="px-3 py-1.5 text-sm font-medium text-slate-500 hover:text-slate-300">Drafts</button>
        <div className="w-px h-4 bg-[#1a1a1a] mx-2"></div>
        <button className="flex items-center gap-2 text-sm text-slate-500 px-2">
          <Filter size={14} /> Filter
        </button>
      </div>

      {/* Table */}
      <div className="bg-[#111111] rounded-xl shadow-sm border border-[#aaff00]/10 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-[#0a0a0a] border-b border-[#aaff00]/10">
            <tr>
              <th className="px-6 py-4 font-semibold text-sm text-slate-400">Product</th>
              <th className="px-6 py-4 font-semibold text-sm text-slate-400">Category</th>
              <th className="px-6 py-4 font-semibold text-sm text-slate-400">Carbon (kgCO2e)</th>
              <th className="px-6 py-4 font-semibold text-sm text-slate-400">Status</th>
              <th className="px-6 py-4 font-semibold text-sm text-slate-400">Source</th>
              <th className="px-6 py-4 font-semibold text-sm text-slate-400 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={6} className="p-6 text-center text-slate-500">Loading products...</td></tr>
            ) : products.map((product) => (
              <tr key={product.id} className="hover:bg-[#0a0a0a] transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-[#1a1a1a] bg-cover bg-center" style={{ backgroundImage: `url(${product.image_url})` }}></div>
                    <span className="font-medium text-white">{product.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-400">{product.category}</td>
                <td className="px-6 py-4 text-slate-400 font-mono">{product.carbon_footprint}</td>
                <td className="px-6 py-4">
                  <StatusBadge status={product.status ?? 'draft'} />
                </td>
                <td className="px-6 py-4">
                  {product.source === 'scraper' ? (
                    <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full border border-amber-100">
                      <AlertCircle size={12} /> AI Scraped
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full border border-blue-100">
                      <CheckCircle size={12} /> Verified
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="text-slate-400 hover:text-slate-400 p-2">
                    <MoreHorizontal size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    approved: "bg-green-100 text-green-700 border-green-200",
    pending_approval: "bg-amber-100 text-amber-700 border-amber-200",
    draft: "bg-[#1a1a1a] text-slate-300 border-[#aaff00]/10",
    rejected: "bg-red-100 text-red-700 border-red-200",
  };

  const labels: Record<string, string> = {
    approved: "Active",
    pending_approval: "Pending",
    draft: "Draft",
    rejected: "Rejected"
  };

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${styles[status] || styles.draft}`}>
      {labels[status] || status}
    </span>
  );
}
