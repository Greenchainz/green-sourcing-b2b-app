// frontend/src/pages/ProductsPage.tsx
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Product } from '../types';
import ProductCard from '../components/ProductCard';
import SearchBar from '../components/SearchBar';

export default function ProductsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchProducts() {
            try {
                const { data, error } = await supabase
                    .from('products')
                    .select('*, supplier:suppliers(*)')
                    .order('created_at', { ascending: false })
                    .limit(50);

                if (error) throw error;
                setProducts(data || []);
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Unknown error';
                console.error('Error fetching products:', message);
                setError(message);
            } finally {
                setLoading(false);
            }
        }

        fetchProducts();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading products...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="max-w-md bg-red-50 border border-red-200 rounded-lg p-6">
                    <h3 className="text-red-800 font-semibold mb-2">Error Loading Products</h3>
                    <p className="text-red-600">{error}</p>
                    <p className="text-sm text-red-500 mt-4">
                        Make sure your Supabase credentials are configured in .env.local
                    </p>
                </div>
            </div>
        );
    }

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

                {products.length === 0 ? (
                    <div className="bg-white rounded-lg shadow p-12 text-center mt-8">
                        <svg
                            className="mx-auto h-12 w-12 text-gray-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                            />
                        </svg>
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No products</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            Get started by running the SQL setup script in Supabase.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
                        {products.map((product) => (
                            <ProductCard
                                key={product.id}
                                product={product}
                                supplierName={product.supplier?.name || 'Unknown Supplier'}
                                onRequestQuote={() => { }}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
