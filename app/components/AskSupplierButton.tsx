'use client'

import { useState } from 'react'
import { isPremiumTier } from '@/lib/utils/supplierTier'

interface AskSupplierButtonProps {
  productId: string
  productName: string
  supplierName: string
  supplierId: string
  supplierTier?: string
  userRole?: string
  userLayer?: string
}

// Role-specific data request mappings based on Decision Maker layer
const getRoleSpecificDataRequest = (userLayer?: string, userRole?: string): string => {
  if (userLayer) {
    // Use Decision Maker layer for more specific matching
    if (userLayer.includes('Financial') || userLayer.includes('Quantity Surveyor')) {
      return 'pricing breakdown and ROI data'
    }
    if (userLayer.includes('Design') || userLayer.includes('Architect')) {
      return 'color samples, texture options, and aesthetic specifications'
    }
    if (userLayer.includes('Sustainability')) {
      return 'EPD documentation and carbon footprint data'
    }
    if (userLayer.includes('Procurement') || userLayer.includes('Project Manager')) {
      return 'lead times, MOQ, and delivery logistics'
    }
    if (userLayer.includes('Technical') || userLayer.includes('Engineer')) {
      return 'technical specifications and compliance certifications'
    }
  }

  // Fallback to basic role mapping
  if (userRole) {
    const roleLower = userRole.toLowerCase()
    if (roleLower.includes('architect') || roleLower.includes('design')) {
      return 'color samples, texture options, and aesthetic specifications'
    }
    if (roleLower.includes('engineer') || roleLower.includes('technical')) {
      return 'technical specifications and compliance certifications'
    }
    if (roleLower.includes('buyer') || roleLower.includes('procurement')) {
      return 'lead times, MOQ, and delivery logistics'
    }
    if (roleLower.includes('supplier')) {
      return 'product details and specifications'
    }
  }

  // Default generic request
  return 'detailed product information'
}

export default function AskSupplierButton({
  productId,
  productName,
  supplierName,
  supplierId,
  supplierTier,
  userRole,
  userLayer,
}: AskSupplierButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleAskSupplier = async () => {
    setIsLoading(true)

    try {
      // Get role-specific data request
      const dataRequest = getRoleSpecificDataRequest(userLayer, userRole)
      const isPremium = isPremiumTier(supplierTier)

      // Build the pre-filled message
      let message = `Hi, I am looking at "${productName}" and need ${dataRequest}.`

      // Add routing note for non-premium suppliers
      if (!isPremium) {
        message += `\n\n[Note: This message will be routed through our Concierge team to ${supplierName}]`
      } else {
        message += `\n\n[Direct conversation with ${supplierName}]`
      }

      // Track analytics event
      if (typeof window !== 'undefined' && (window as Window & { Intercom?: (action: string, event: string, data: Record<string, unknown>) => void }).Intercom) {
        ((window as unknown) as { Intercom: (action: string, event: string, data: Record<string, unknown>) => void }).Intercom('trackEvent', 'ask-supplier-clicked', {
          product_id: productId,
          product_name: productName,
          supplier_id: supplierId,
          supplier_name: supplierName,
          supplier_tier: supplierTier || 'unknown',
          user_role: userRole,
          user_layer: userLayer,
          data_request: dataRequest,
          is_premium_supplier: isPremium,
        })
      }

      // Route conversation via backend API
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'
      
      // Safely access localStorage (client-side only)
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null

      if (token) {
        try {
          const response = await fetch(`${backendUrl}/api/v1/intercom/route-conversation`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            credentials: 'include',
            body: JSON.stringify({
              supplierId,
              message,
              productId,
              productName,
            }),
          })

          if (response.ok) {
            const data = await response.json()
            console.log('[AskSupplier] Conversation routed:', data)
          } else {
            console.warn('[AskSupplier] Failed to route conversation via API, opening Intercom directly')
          }
        } catch (apiError) {
          console.error('[AskSupplier] API error, opening Intercom directly:', apiError)
        }
      }

      // Open Intercom with pre-filled message
      if (typeof window !== 'undefined' && (window as Window & { Intercom?: (action: string, message: string) => void }).Intercom) {
        ((window as unknown) as { Intercom: (action: string, message: string) => void }).Intercom('showNewMessage', message)
      } else {
        console.warn('[AskSupplier] Intercom not available')
        alert('Chat is not available. Please contact support.')
      }
    } catch (error) {
      console.error('[AskSupplier] Error:', error)
      alert('Failed to open chat. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleAskSupplier}
      disabled={isLoading}
      className="inline-flex items-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {isLoading ? (
        <>
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          Opening...
        </>
      ) : (
        <>
          <svg
            className="-ml-1 mr-2 h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
            />
          </svg>
          Ask Supplier
        </>
      )}
    </button>
  )
}
