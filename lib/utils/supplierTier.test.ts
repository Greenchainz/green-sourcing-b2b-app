import { describe, it, expect } from 'vitest';
import { isFreeTier, isPremiumTier, getRoutingTarget, SUPPLIER_TIERS } from './supplierTier';

describe('supplierTier utils', () => {

  describe('isFreeTier', () => {
    it('returns true when tier is undefined', () => {
      expect(isFreeTier()).toBe(true);
    });

    it('returns true when tier is null', () => {
      expect(isFreeTier(null)).toBe(true);
    });

    it('returns true when tier is FREE', () => {
      expect(isFreeTier(SUPPLIER_TIERS.FREE)).toBe(true);
    });

    it('returns true when tier is STANDARD', () => {
      expect(isFreeTier(SUPPLIER_TIERS.STANDARD)).toBe(true);
    });

    it('returns true when tier is free with mixed case', () => {
      expect(isFreeTier('FrEe')).toBe(true);
    });

    it('returns true when tier is standard with mixed case', () => {
      expect(isFreeTier('StAnDaRd')).toBe(true);
    });

    it('returns false when tier is PREMIUM', () => {
      expect(isFreeTier(SUPPLIER_TIERS.PREMIUM)).toBe(false);
    });

    it('returns false when tier is ENTERPRISE', () => {
      expect(isFreeTier(SUPPLIER_TIERS.ENTERPRISE)).toBe(false);
    });

    it('returns false when tier is PRO', () => {
      expect(isFreeTier(SUPPLIER_TIERS.PRO)).toBe(false);
    });

    it('returns false when tier is SCRAPED', () => {
      expect(isFreeTier(SUPPLIER_TIERS.SCRAPED)).toBe(false);
    });

    it('returns false when tier is unknown', () => {
      expect(isFreeTier('unknown_tier')).toBe(false);
    });
  });

  describe('isPremiumTier', () => {
    it('returns false when tier is undefined', () => {
      expect(isPremiumTier()).toBe(false);
    });

    it('returns false when tier is null', () => {
      expect(isPremiumTier(null)).toBe(false);
    });

    it('returns false when tier is FREE', () => {
      expect(isPremiumTier(SUPPLIER_TIERS.FREE)).toBe(false);
    });

    it('returns false when tier is STANDARD', () => {
      expect(isPremiumTier(SUPPLIER_TIERS.STANDARD)).toBe(false);
    });

    it('returns true when tier is PREMIUM', () => {
      expect(isPremiumTier(SUPPLIER_TIERS.PREMIUM)).toBe(true);
    });

    it('returns true when tier is ENTERPRISE', () => {
      expect(isPremiumTier(SUPPLIER_TIERS.ENTERPRISE)).toBe(true);
    });

    it('returns true when tier is PRO', () => {
      expect(isPremiumTier(SUPPLIER_TIERS.PRO)).toBe(true);
    });

    it('returns false when tier is SCRAPED', () => {
      expect(isPremiumTier(SUPPLIER_TIERS.SCRAPED)).toBe(false);
    });

    it('returns true when tier is premium with mixed case', () => {
      expect(isPremiumTier('pReMiUm')).toBe(true);
    });
  });

  describe('getRoutingTarget', () => {
    it('returns "concierge" for undefined tier', () => {
      expect(getRoutingTarget()).toBe('concierge');
    });

    it('returns "concierge" for null tier', () => {
      expect(getRoutingTarget(null)).toBe('concierge');
    });

    it('returns "concierge" for FREE tier', () => {
      expect(getRoutingTarget(SUPPLIER_TIERS.FREE)).toBe('concierge');
    });

    it('returns "concierge" for STANDARD tier', () => {
      expect(getRoutingTarget(SUPPLIER_TIERS.STANDARD)).toBe('concierge');
    });

    it('returns "supplier" for PREMIUM tier', () => {
      expect(getRoutingTarget(SUPPLIER_TIERS.PREMIUM)).toBe('supplier');
    });

    it('returns "supplier" for ENTERPRISE tier', () => {
      expect(getRoutingTarget(SUPPLIER_TIERS.ENTERPRISE)).toBe('supplier');
    });

    it('returns "supplier" for PRO tier', () => {
      expect(getRoutingTarget(SUPPLIER_TIERS.PRO)).toBe('supplier');
    });

    it('returns "concierge" for SCRAPED tier', () => {
      expect(getRoutingTarget(SUPPLIER_TIERS.SCRAPED)).toBe('concierge');
    });

    it('returns "concierge" for unknown tier', () => {
      expect(getRoutingTarget('unknown_tier')).toBe('concierge');
    });
  });

});
