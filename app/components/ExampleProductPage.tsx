/**
 * Example Product Page Component
 * 
 * Demonstrates the usage of AskSupplierButton component
 * This would typically be used on product detail pages
 */

'use client'

import { useAuth } from '@/lib/auth'
import AskSupplierButton from '../components/AskSupplierButton'

export default function ExampleProductPage() {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="p-8">Loading...</div>
  }

  // Example product data - in production this would come from props or API
  const exampleProduct = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Sustainable Bamboo Flooring',
    supplier: {
      id: '987fcdeb-51a2-43e7-8765-fedcba987654',
      name: 'EcoFloor Solutions',
      tier: 'premium', // Can be 'free', 'standard', 'premium', or 'enterprise'
    },
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Product Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {exampleProduct.name}
            </h1>
            <p className="text-gray-600">
              by <span className="font-medium">{exampleProduct.supplier.name}</span>
              {exampleProduct.supplier.tier && (
                <span className="ml-2 px-2 py-1 text-xs bg-emerald-100 text-emerald-800 rounded-full">
                  {exampleProduct.supplier.tier.toUpperCase()}
                </span>
              )}
            </p>
          </div>

          {/* Product Image Placeholder */}
          <div className="mb-6 bg-gray-200 h-64 rounded-lg flex items-center justify-center">
            <span className="text-gray-500">Product Image</span>
          </div>

          {/* Product Description */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-3">Description</h2>
            <p className="text-gray-700 leading-relaxed">
              Premium sustainable bamboo flooring with excellent durability and eco-friendly certifications.
              Perfect for commercial and residential applications.
            </p>
          </div>

          {/* Product Specifications */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-3">Specifications</h2>
            <ul className="list-disc list-inside text-gray-700 space-y-2">
              <li>Material: 100% sustainably harvested bamboo</li>
              <li>Thickness: 14mm</li>
              <li>Finish: Low-VOC polyurethane</li>
              <li>Certifications: FSC, FloorScore, LEED compliant</li>
            </ul>
          </div>

          {/* User Context Display */}
          {user && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">Your Profile</h3>
              <div className="text-sm text-blue-800 space-y-1">
                <p><strong>Role:</strong> {user.role || 'Not set'}</p>
                {user.layer && <p><strong>Decision Layer:</strong> {user.layer}</p>}
                {user.jobTitle && <p><strong>Job Title:</strong> {user.jobTitle}</p>}
                {user.primaryMotivation && <p><strong>Primary Motivation:</strong> {user.primaryMotivation}</p>}
                <p className="text-xs mt-2 text-blue-600">
                  The "Ask Supplier" button will generate a message tailored to your role and priorities.
                </p>
              </div>
            </div>
          )}

          {/* Ask Supplier Button */}
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <p className="text-sm text-gray-600">
                Have questions about this product?
              </p>
              <p className="text-xs text-gray-500">
                Get instant answers from the supplier based on your role and needs.
              </p>
            </div>
            <AskSupplierButton
              productId={exampleProduct.id}
              productName={exampleProduct.name}
              supplierName={exampleProduct.supplier.name}
              supplierId={exampleProduct.supplier.id}
              supplierTier={exampleProduct.supplier.tier}
              userRole={user?.role}
              userLayer={user?.layer}
            />
          </div>

          {/* Example Messages by Role */}
          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Example messages by role:
            </h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p>
                <strong>Financial Gatekeeper:</strong> "...need pricing breakdown and ROI data"
              </p>
              <p>
                <strong>Design Lead:</strong> "...need color samples, texture options, and aesthetic specifications"
              </p>
              <p>
                <strong>Sustainability Officer:</strong> "...need EPD documentation and carbon footprint data"
              </p>
              <p>
                <strong>Procurement Manager:</strong> "...need lead times, MOQ, and delivery logistics"
              </p>
              <p>
                <strong>Technical Engineer:</strong> "...need technical specifications and compliance certifications"
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
