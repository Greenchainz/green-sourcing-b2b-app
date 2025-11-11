// src/pages/ProductsPage.tsx
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Product {
    id: string
    name: string
    description: string
    material_type: string
    category: string
    unit_price: number
    currency: string
    sustainability_data: {
        gwp_fossil?: number
        certifications?: string[]
        recycled_content?: number
        renewable?: boolean
    }
}

export default function ProductsPage() {
    const [products, setProducts] = useState<Product[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        async function fetchProducts() {
            try {
                const { data, error } = await supabase
                    .from('products')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(50)

                if (error) throw error
                setProducts(data || [])
            } catch (err: any) {
                console.error('Error fetching products:', err.message)
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }

        fetchProducts()
    }, [])

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading products...</p>
                </div>
            </div>
        )
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
        )
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">
                        Sustainable Building Products
                    </h1>
                    <p className="mt-2 text-gray-600">
                        Browse verified sustainable materials from certified suppliers
                    </p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="text-sm text-gray-500">Total Products</div>
                        <div className="text-2xl font-bold text-gray-900">{products.length}</div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="text-sm text-gray-500">Avg Carbon Footprint</div>
                        <div className="text-2xl font-bold text-green-600">
                            {products.length > 0
                                ? Math.round(
                                    products.reduce(
                                        (sum, p) => sum + (p.sustainability_data.gwp_fossil || 0),
                                        0
                                    ) / products.length
                                )
                                : 0}{' '}
                            kg CO₂e
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="text-sm text-gray-500">Certified Products</div>
                        <div className="text-2xl font-bold text-blue-600">
                            {
                                products.filter(
                                    (p) => p.sustainability_data.certifications?.length
                                ).length
                            }
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="text-sm text-gray-500">Categories</div>
                        <div className="text-2xl font-bold text-purple-600">
                            {new Set(products.map((p) => p.category)).size}
                        </div>
                    </div>
                </div>

                {/* Products Grid */}
                {products.length === 0 ? (
                    <div className="bg-white rounded-lg shadow p-12 text-center">
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {products.map((product) => (
                            <div
                                key={product.id}
                                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow"
                            >
                                <div className="p-6">
                                    {/* Product Name */}
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                        {product.name}
                                    </h3>

                                    {/* Category & Material */}
                                    <div className="flex gap-2 mb-3">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                            {product.category}
                                        </span>
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                            {product.material_type}
                                        </span>
                                    </div>

                                    {/* Description */}
                                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                                        {product.description}
                                    </p>

                                    {/* Sustainability Metrics */}
                                    <div className="space-y-2 mb-4">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Carbon Footprint:</span>
                                            <span className="font-semibold text-green-600">
                                                {product.sustainability_data.gwp_fossil || 'N/A'} kg CO₂e
                                            </span>
                                        </div>
                                        {product.sustainability_data.recycled_content !== undefined && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-500">Recycled Content:</span>
                                                <span className="font-semibold text-blue-600">
                                                    {product.sustainability_data.recycled_content}%
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Certifications */}
                                    {product.sustainability_data.certifications && product.sustainability_data.certifications.length > 0 && (
                                        <div className="mb-4">
                                            <div className="text-xs text-gray-500 mb-2">Certifications:</div>
                                            <div className="flex flex-wrap gap-1">
                                                {product.sustainability_data.certifications?.map((cert, idx) => (
                                                    <span
                                                        key={idx}
                                                        className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800"
                                                    >
                                                        ✓ {cert}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Price & Action */}
                                    <div className="flex items-center justify-between pt-4 border-t">
                                        <div className="text-lg font-bold text-gray-900">
                                            ${product.unit_price}
                                            <span className="text-sm font-normal text-gray-500">
                                                /{product.currency}
                                            </span>
                                        </div>
                                        <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium">
                                            Request Quote
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
