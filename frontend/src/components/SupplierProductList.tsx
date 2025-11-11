// FILE: frontend/src/components/SupplierProductList.tsx
// PURPOSE: Display and manage supplier's product catalog

import { useState, useEffect } from 'react';
import api from '../lib/api';

interface Material {
    compositionId?: number;
    materialName: string;
    percentage: number | null;
    isRecycled: boolean;
    isBioBased: boolean;
    sourceRegion: string | null;
}

interface Product {
    productId: number;
    productName: string;
    description: string | null;
    sku: string | null;
    unitPrice: number | null;
    currency: string;
    leadTimeDays: number | null;
    categoryName: string | null;
    createdAt: string;
    materials: Material[];
}

interface ProductFormData {
    productName: string;
    description: string;
    categoryName: string;
    sku: string;
    unitPrice: string;
    currency: string;
    leadTimeDays: string;
    materials: Material[];
}

export default function SupplierProductList({ supplierId }: { supplierId: number }) {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [formData, setFormData] = useState<ProductFormData>({
        productName: '',
        description: '',
        categoryName: '',
        sku: '',
        unitPrice: '',
        currency: 'USD',
        leadTimeDays: '',
        materials: []
    });
    const [newMaterial, setNewMaterial] = useState<Material>({
        materialName: '',
        percentage: null,
        isRecycled: false,
        isBioBased: false,
        sourceRegion: null
    });

    useEffect(() => {
        fetchProducts();
    }, [supplierId]);

    const fetchProducts = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/suppliers/${supplierId}/products`);
            setProducts(response.data.products);
        } catch (err) {
            console.error('Failed to fetch products:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddMaterial = () => {
        if (!newMaterial.materialName) return;
        setFormData({
            ...formData,
            materials: [...formData.materials, newMaterial]
        });
        setNewMaterial({
            materialName: '',
            percentage: null,
            isRecycled: false,
            isBioBased: false,
            sourceRegion: null
        });
    };

    const handleRemoveMaterial = (index: number) => {
        setFormData({
            ...formData,
            materials: formData.materials.filter((_, i) => i !== index)
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            await api.post('/me/products', {
                productName: formData.productName,
                description: formData.description || null,
                categoryName: formData.categoryName || null,
                sku: formData.sku || null,
                unitPrice: formData.unitPrice ? parseFloat(formData.unitPrice) : null,
                currency: formData.currency,
                leadTimeDays: formData.leadTimeDays ? parseInt(formData.leadTimeDays) : null,
                materials: formData.materials.length > 0 ? formData.materials : null
            });

            // Reset form and refresh products
            setFormData({
                productName: '',
                description: '',
                categoryName: '',
                sku: '',
                unitPrice: '',
                currency: 'USD',
                leadTimeDays: '',
                materials: []
            });
            setShowAddForm(false);
            fetchProducts();
        } catch (err: any) {
            console.error('Failed to create product:', err);
            alert(err.response?.data?.error || 'Failed to create product');
        }
    };

    if (loading) {
        return <div className="text-center text-green-primary">Loading products...</div>;
    }

    return (
        <div className="card">
            <div className="flex justify-between items-center mb-4 border-b-2 border-green-light pb-2">
                <h2 className="text-2xl font-semibold text-green-secondary">My Product Catalog</h2>
                <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="px-4 py-2 bg-green-primary text-white rounded hover:bg-green-secondary transition-colors"
                >
                    {showAddForm ? 'Cancel' : '+ Add Product'}
                </button>
            </div>

            {/* Add Product Form */}
            {showAddForm && (
                <form onSubmit={handleSubmit} className="mb-6 p-4 bg-green-light/10 rounded border border-green-light">
                    <h3 className="text-lg font-semibold text-neutral-dark mb-4">Add New Product</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-semibold text-neutral-dark mb-1">
                                Product Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.productName}
                                onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                                className="w-full px-3 py-2 border border-neutral-light rounded focus:outline-none focus:ring-2 focus:ring-green-primary"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-neutral-dark mb-1">Category</label>
                            <input
                                type="text"
                                value={formData.categoryName}
                                onChange={(e) => setFormData({ ...formData, categoryName: e.target.value })}
                                className="w-full px-3 py-2 border border-neutral-light rounded focus:outline-none focus:ring-2 focus:ring-green-primary"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-neutral-dark mb-1">SKU</label>
                            <input
                                type="text"
                                value={formData.sku}
                                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                                className="w-full px-3 py-2 border border-neutral-light rounded focus:outline-none focus:ring-2 focus:ring-green-primary"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-neutral-dark mb-1">Unit Price</label>
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData.unitPrice}
                                    onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                                    className="flex-1 px-3 py-2 border border-neutral-light rounded focus:outline-none focus:ring-2 focus:ring-green-primary"
                                />
                                <select
                                    value={formData.currency}
                                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                                    className="px-3 py-2 border border-neutral-light rounded focus:outline-none focus:ring-2 focus:ring-green-primary"
                                >
                                    <option value="USD">USD</option>
                                    <option value="EUR">EUR</option>
                                    <option value="GBP">GBP</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-neutral-dark mb-1">Lead Time (days)</label>
                            <input
                                type="number"
                                value={formData.leadTimeDays}
                                onChange={(e) => setFormData({ ...formData, leadTimeDays: e.target.value })}
                                className="w-full px-3 py-2 border border-neutral-light rounded focus:outline-none focus:ring-2 focus:ring-green-primary"
                            />
                        </div>
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm font-semibold text-neutral-dark mb-1">Description</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows={3}
                            className="w-full px-3 py-2 border border-neutral-light rounded focus:outline-none focus:ring-2 focus:ring-green-primary"
                        />
                    </div>

                    {/* Materials Section */}
                    <div className="mb-4">
                        <h4 className="text-md font-semibold text-neutral-dark mb-2">Materials Composition</h4>

                        {formData.materials.length > 0 && (
                            <div className="mb-3 space-y-2">
                                {formData.materials.map((material, index) => (
                                    <div key={index} className="flex items-center gap-2 p-2 bg-white rounded border">
                                        <span className="flex-1 text-sm">{material.materialName}</span>
                                        {material.percentage && <span className="text-sm text-neutral-medium">{material.percentage}%</span>}
                                        {material.isRecycled && <span className="text-xs bg-green-accent/20 text-green-primary px-2 py-1 rounded">Recycled</span>}
                                        {material.isBioBased && <span className="text-xs bg-green-accent/20 text-green-primary px-2 py-1 rounded">Bio-based</span>}
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveMaterial(index)}
                                            className="text-red-500 hover:text-red-700"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
                            <div className="md:col-span-2">
                                <input
                                    type="text"
                                    placeholder="Material name"
                                    value={newMaterial.materialName}
                                    onChange={(e) => setNewMaterial({ ...newMaterial, materialName: e.target.value })}
                                    className="w-full px-3 py-2 border border-neutral-light rounded focus:outline-none focus:ring-2 focus:ring-green-primary"
                                />
                            </div>
                            <div>
                                <input
                                    type="number"
                                    placeholder="% (optional)"
                                    value={newMaterial.percentage || ''}
                                    onChange={(e) => setNewMaterial({ ...newMaterial, percentage: e.target.value ? parseFloat(e.target.value) : null })}
                                    className="w-full px-3 py-2 border border-neutral-light rounded focus:outline-none focus:ring-2 focus:ring-green-primary"
                                />
                            </div>
                            <div className="flex gap-2">
                                <label className="flex items-center text-sm">
                                    <input
                                        type="checkbox"
                                        checked={newMaterial.isRecycled}
                                        onChange={(e) => setNewMaterial({ ...newMaterial, isRecycled: e.target.checked })}
                                        className="mr-1"
                                    />
                                    Recycled
                                </label>
                                <label className="flex items-center text-sm">
                                    <input
                                        type="checkbox"
                                        checked={newMaterial.isBioBased}
                                        onChange={(e) => setNewMaterial({ ...newMaterial, isBioBased: e.target.checked })}
                                        className="mr-1"
                                    />
                                    Bio-based
                                </label>
                            </div>
                            <button
                                type="button"
                                onClick={handleAddMaterial}
                                className="px-3 py-2 bg-neutral-light text-neutral-dark rounded hover:bg-neutral-medium transition-colors"
                            >
                                + Add
                            </button>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setShowAddForm(false)}
                            className="px-4 py-2 border border-neutral-light text-neutral-dark rounded hover:bg-neutral-light transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-green-primary text-white rounded hover:bg-green-secondary transition-colors"
                        >
                            Create Product
                        </button>
                    </div>
                </form>
            )}

            {/* Products List */}
            {products.length === 0 ? (
                <p className="text-neutral-medium italic">No products in catalog yet.</p>
            ) : (
                <div className="space-y-4">
                    {products.map((product) => (
                        <div key={product.productId} className="p-4 border border-neutral-light rounded hover:bg-green-light/5 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h3 className="text-lg font-semibold text-green-primary">{product.productName}</h3>
                                    {product.categoryName && (
                                        <span className="text-xs bg-neutral-light text-neutral-dark px-2 py-1 rounded">{product.categoryName}</span>
                                    )}
                                </div>
                                <div className="text-right">
                                    {product.unitPrice && (
                                        <p className="text-lg font-bold text-neutral-dark">
                                            {product.currency} {product.unitPrice.toFixed(2)}
                                        </p>
                                    )}
                                    {product.sku && <p className="text-xs text-neutral-medium">SKU: {product.sku}</p>}
                                </div>
                            </div>

                            {product.description && (
                                <p className="text-sm text-neutral-dark mb-2">{product.description}</p>
                            )}

                            {product.leadTimeDays && (
                                <p className="text-sm text-neutral-medium mb-2">Lead Time: {product.leadTimeDays} days</p>
                            )}

                            {product.materials && product.materials.length > 0 && (
                                <div className="mt-3">
                                    <h4 className="text-sm font-semibold text-neutral-dark mb-1">Materials:</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {product.materials.map((material, idx) => (
                                            <div key={idx} className="text-xs bg-green-light/20 px-2 py-1 rounded border border-green-light">
                                                {material.materialName}
                                                {material.percentage && ` (${material.percentage}%)`}
                                                {material.isRecycled && ' ♻️'}
                                                {material.isBioBased && ' 🌱'}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
