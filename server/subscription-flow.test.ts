import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getBuyerSubscription,
  upgradeBuyerSubscription,
  cancelBuyerSubscription,
  checkBuyerFeatureAccess,
  getBuyerTierLimits,
} from './subscription-service';
import { trackBuyerUsage, checkBuyerUsageLimit } from './usage-tracking-service';
import { reportUsageEvent } from './marketplace-metering';

// Mock the metering API
vi.mock('./marketplace-metering', () => ({
  reportUsageEvent: vi.fn().mockResolvedValue({
    usageEventId: 'test-event-id',
    status: 'Accepted',
  }),
}));

describe('Premium Subscription Flow', () => {
  const testUserId = 123;
  const msSubscriptionId = 'ms-sub-12345';
  const msPlanId = 'plan-premium';

  describe('Feature Gating', () => {
    it('should deny premium features for free tier', async () => {
      const hasAccess = await checkBuyerFeatureAccess(testUserId, 'hd_video');
      expect(hasAccess).toBe(false);
    });

    it('should return correct tier limits for free tier', async () => {
      const limits = await getBuyerTierLimits(testUserId);
      expect(limits).toBeDefined();
      // Free tier has limited access
      expect(limits?.rfq_submissions).toBeLessThan(999);
    });

    it('should return higher limits for premium tier', async () => {
      await upgradeBuyerSubscription(testUserId, 'premium', msSubscriptionId, msPlanId);
      const limits = await getBuyerTierLimits(testUserId);
      expect(limits).toBeDefined();
      // Premium tier has unlimited or very high limits
      expect(limits?.rfq_submissions).toBeGreaterThanOrEqual(999);
    });
  });

  describe('Usage Tracking & Metering', () => {
    it('should track buyer usage without errors', async () => {
      await expect(
        trackBuyerUsage(testUserId, 'rfq_submission', 1)
      ).resolves.not.toThrow();
    });

    it('should report usage to Microsoft Metering API', async () => {
      await trackBuyerUsage(testUserId, 'ai_query', 5);
      
      expect(reportUsageEvent).toHaveBeenCalled();
      const callArgs = vi.mocked(reportUsageEvent).mock.calls[0]?.[0];
      expect(callArgs?.dimension).toBe('ai_queries');
      expect(callArgs?.quantity).toBe(5);
    });

    it('should map internal dimensions to Microsoft dimensions', async () => {
      await upgradeBuyerSubscription(testUserId, 'premium', msSubscriptionId, msPlanId);
      await trackBuyerUsage(testUserId, 'swap_analysis', 3);
      
      const callArgs = vi.mocked(reportUsageEvent).mock.calls.find(
        call => call[0]?.dimension === 'swap_analyses'
      )?.[0];
      expect(callArgs?.dimension).toBe('swap_analyses');
    });

    it('should handle usage limit checks', async () => {
      // Track usage
      await trackBuyerUsage(testUserId, 'rfq_submission', 1);
      
      // Check if within limit
      const withinLimit = await checkBuyerUsageLimit(
        testUserId,
        'rfq_submission'
      );
      expect(typeof withinLimit).toBe('boolean');
    });

    it('should handle metering API failures gracefully', async () => {
      vi.mocked(reportUsageEvent).mockRejectedValueOnce(new Error('API Error'));
      
      // Should not throw - usage tracking continues
      await expect(
        trackBuyerUsage(testUserId, 'rfq_submission', 1)
      ).resolves.not.toThrow();
    });
  });

  describe('Subscription Tier Transitions', () => {
    it('should upgrade subscription without errors', async () => {
      await expect(
        upgradeBuyerSubscription(testUserId, 'premium', msSubscriptionId, msPlanId)
      ).resolves.not.toThrow();
    });

    it('should cancel subscription without errors', async () => {
      await upgradeBuyerSubscription(testUserId, 'premium', msSubscriptionId, msPlanId);
      await expect(
        cancelBuyerSubscription(testUserId)
      ).resolves.not.toThrow();
    });

    it('should retrieve subscription after upgrade', async () => {
      await upgradeBuyerSubscription(testUserId, 'premium', msSubscriptionId, msPlanId);
      const subscription = await getBuyerSubscription(testUserId);
      expect(subscription).toBeDefined();
    });

    it('should retrieve subscription after cancellation', async () => {
      await upgradeBuyerSubscription(testUserId, 'premium', msSubscriptionId, msPlanId);
      await cancelBuyerSubscription(testUserId);
      const subscription = await getBuyerSubscription(testUserId);
      expect(subscription).toBeDefined();
    });
  });

  describe('Metering API Integration', () => {
    it('should include subscription metadata in metering call', async () => {
      await upgradeBuyerSubscription(testUserId, 'premium', msSubscriptionId, msPlanId);
      await trackBuyerUsage(testUserId, 'material_comparison', 1);
      
      const callArgs = vi.mocked(reportUsageEvent).mock.calls.find(
        call => call[0]?.resourceId === msSubscriptionId
      )?.[0];
      expect(callArgs?.resourceId).toBe(msSubscriptionId);
      expect(callArgs?.planId).toBe(msPlanId);
    });

    it('should report usage with ISO timestamp', async () => {
      await trackBuyerUsage(testUserId, 'ccps_export', 1);
      
      const callArgs = vi.mocked(reportUsageEvent).mock.calls[0]?.[0];
      expect(callArgs?.effectiveStartTime).toBeDefined();
      // Should be ISO 8601 format
      expect(new Date(callArgs?.effectiveStartTime || '').getTime()).toBeGreaterThan(0);
    });
  });

  describe('Tier Limits', () => {
    it('should return tier limits without errors', async () => {
      const freeLimits = await getBuyerTierLimits(testUserId);
      expect(freeLimits).toBeDefined();
    });

    it('should return tier limits after upgrade', async () => {
      await upgradeBuyerSubscription(testUserId, 'premium', msSubscriptionId, msPlanId);
      const premiumLimits = await getBuyerTierLimits(testUserId);
      expect(premiumLimits).toBeDefined();
    });
  });
});
