/**
 * Supplier Tier Utilities
 * 
 * Shared constants and utilities for supplier tier handling
 * Used across frontend and backend for consistent tier logic
 */

/**
 * Supplier tier levels
 */
export const SUPPLIER_TIERS = {
  FREE: 'free',
  STANDARD: 'standard',
  PREMIUM: 'premium',
  ENTERPRISE: 'enterprise',
  PRO: 'pro',
  SCRAPED: 'scraped', // Shadow suppliers
} as const

/**
 * Premium tier levels that get direct routing
 */
export const PREMIUM_TIERS = [
  SUPPLIER_TIERS.PREMIUM,
  SUPPLIER_TIERS.ENTERPRISE,
  SUPPLIER_TIERS.PRO,
] as const

/**
 * Check if a supplier tier is premium (gets direct routing to supplier team)
 * 
 * @param tier - Supplier tier string (case-insensitive)
 * @returns true if premium/enterprise/pro tier
 */
export function isPremiumTier(tier?: string | null): boolean {
  if (!tier) return false
  const tierLower = tier.toLowerCase()
  return PREMIUM_TIERS.includes(tierLower as any)
}

/**
 * Check if a supplier tier is free/standard (routes to concierge)
 * 
 * @param tier - Supplier tier string (case-insensitive)
 * @returns true if free/standard tier or unknown
 */
export function isFreeTier(tier?: string | null): boolean {
  if (!tier) return true
  const tierLower = tier.toLowerCase()
  return tierLower === SUPPLIER_TIERS.FREE || tierLower === SUPPLIER_TIERS.STANDARD
}

/**
 * Get routing target based on tier
 * 
 * @param tier - Supplier tier string
 * @returns 'supplier' or 'concierge'
 */
export function getRoutingTarget(tier?: string | null): 'supplier' | 'concierge' {
  return isPremiumTier(tier) ? 'supplier' : 'concierge'
}
