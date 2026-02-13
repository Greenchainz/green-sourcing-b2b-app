/**
 * GreenChainz Business Logic Library
 *
 * Barrel export for all ported business logic services.
 * Import from "lib/greenchainz" in your API routes.
 *
 * Example:
 *   import { calculateCcps, PERSONA_WEIGHT_PRESETS } from "@/lib/greenchainz";
 *   import { findSwapCandidates } from "@/lib/greenchainz/matching/material-swap";
 */

// ─── Scoring ─────────────────────────────────────────────────────────────────
export {
  calculateCcps,
  calcCarbonScore,
  calcComplianceScore,
  calcCertificationScore,
  calcCostScore,
  calcSupplyChainScore,
  calcHealthScore,
  calcSourcingDifficulty,
  calcCarbonDelta,
  personaToWeights,
  PERSONA_WEIGHT_PRESETS,
  type CcpsBreakdown,
  type CcpsMaterial,
  type CcpsBaseline,
  type PersonaWeights,
} from "./scoring/ccps-engine";

// ─── Material Swap Matching ──────────────────────────────────────────────────
export {
  findSwapCandidates,
  calculateSwapScore,
  saveSwapRecommendation,
  getSavedSwaps,
  trackSwapUsage,
  type SwapCandidate,
  type SwapScoreResult,
} from "./matching/material-swap";

// ─── Azure Maps ──────────────────────────────────────────────────────────────
export {
  geocodeAddress,
  calculateDistance,
  calculateRoute,
  getDistanceScore,
  type Coordinates,
  type DistanceResult,
  type RouteResult,
} from "./matching/azure-maps";

// ─── RFQ Supplier Matching ──────────────────────────────────────────────────
export {
  calculateSupplierMatchScore,
  findMatchingSuppliers,
  type SupplierMatchResult,
} from "./matching/rfq-supplier-match";

// ─── Notifications ───────────────────────────────────────────────────────────
export {
  sendInAppNotification,
  markNotificationAsRead,
  getUnreadNotifications,
  getUnreadNotificationCount,
  markAllNotificationsAsRead,
  generateNotificationContent,
  generateRfqMatchEmail,
  generateBidAcceptedEmail,
  generateNewMessageEmail,
  type NotificationType,
  type NotificationPayload,
} from "./notifications/notification-service";

// ─── Subscriptions & Tier Management ─────────────────────────────────────────
export {
  TIER_LIMITS,
  getBuyerSubscription,
  getSupplierSubscription,
  createBuyerSubscription,
  upgradeBuyerSubscription,
  upgradeSupplierSubscription,
  cancelBuyerSubscription,
  cancelSupplierSubscription,
  checkBuyerFeatureAccess,
  checkSupplierFeatureAccess,
  getBuyerTierLimits,
  getSupplierTierLimits,
} from "./marketplace/subscription-service";

// ─── Usage Tracking ──────────────────────────────────────────────────────────
export {
  trackBuyerUsage,
  trackSupplierUsage,
  getBuyerUsage,
  getSupplierUsage,
  checkBuyerUsageLimit,
  checkSupplierUsageLimit,
} from "./marketplace/usage-tracking";

// ─── Microsoft Marketplace Metering ──────────────────────────────────────────
export {
  reportUsageEvent,
  reportBuyerUsage,
  type MeteringDimension,
  type UsageEvent,
  type UsageEventResult,
} from "./marketplace/metering-service";
