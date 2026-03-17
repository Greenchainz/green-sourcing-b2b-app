import { describe, it, expect, beforeEach } from "vitest";
import { getDb } from "./db";
import { users, subscriptions } from "../drizzle/schema";
import {
  getUserSubscription,
  getUserTier,
  activateSubscription,
  renewSubscription,
  cancelSubscription,
  suspendSubscription,
  reinstateSubscription,
  userHasAccess,
  updateUserTier,
  type SubscriptionWebhookPayload,
} from "./microsoft-subscription-service";

describe("Microsoft Subscription Service", () => {
  let testUserId: number;
  let testSubscriptionId: string;

  beforeEach(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Clean up test data
    await db.delete(subscriptions);
    await db.delete(users);

    // Create test user
    const userResult = await db.insert(users).values({
      openId: "test-user-123",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "microsoft",
      role: "user",
    });

    testUserId = Number(userResult[0].insertId);
    testSubscriptionId = `test-sub-${Date.now()}`;
  });

  describe("getUserSubscription", () => {
    it("should return null when user has no subscription", async () => {
      const subscription = await getUserSubscription(testUserId);
      expect(subscription).toBeNull();
    });

    it("should return active subscription for user", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.insert(subscriptions).values({
        userId: testUserId,
        microsoftSubscriptionId: testSubscriptionId,
        tier: "standard",
        status: "active",
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      });

      const subscription = await getUserSubscription(testUserId);
      expect(subscription).not.toBeNull();
      expect(subscription?.tier).toBe("standard");
      expect(subscription?.status).toBe("active");
    });
  });

  describe("getUserTier", () => {
    it("should return 'free' for user with no subscription", async () => {
      const tier = await getUserTier(testUserId);
      expect(tier).toBe("free");
    });

    it("should return correct tier for subscribed user", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.insert(subscriptions).values({
        userId: testUserId,
        microsoftSubscriptionId: testSubscriptionId,
        tier: "premium",
        status: "active",
        startDate: new Date(),
      });

      const tier = await getUserTier(testUserId);
      expect(tier).toBe("premium");
    });
  });

  describe("activateSubscription", () => {
    it("should create new subscription on activation", async () => {
      const payload: SubscriptionWebhookPayload = {
        action: "activate",
        subscriptionId: testSubscriptionId,
        planId: "greenchainz-standard",
        quantity: 1,
        purchaser: {
          emailId: "test@example.com",
          objectId: "test-user-123",
          tenantId: "test-tenant",
        },
        term: {
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
      };

      const subscription = await activateSubscription(testUserId, payload);

      expect(subscription).not.toBeNull();
      expect(subscription.tier).toBe("standard");
      expect(subscription.status).toBe("active");
      expect(subscription.microsoftSubscriptionId).toBe(testSubscriptionId);
    });

    it("should update existing subscription on re-activation", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Create existing subscription
      await db.insert(subscriptions).values({
        userId: testUserId,
        microsoftSubscriptionId: testSubscriptionId,
        tier: "free",
        status: "cancelled",
        startDate: new Date(),
      });

      const payload: SubscriptionWebhookPayload = {
        action: "activate",
        subscriptionId: testSubscriptionId,
        planId: "greenchainz-premium",
        quantity: 1,
        purchaser: {
          emailId: "test@example.com",
          objectId: "test-user-123",
          tenantId: "test-tenant",
        },
        term: {
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
      };

      const subscription = await activateSubscription(testUserId, payload);

      expect(subscription.tier).toBe("premium");
      expect(subscription.status).toBe("active");
    });
  });

  describe("renewSubscription", () => {
    it("should renew existing subscription", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.insert(subscriptions).values({
        userId: testUserId,
        microsoftSubscriptionId: testSubscriptionId,
        tier: "standard",
        status: "active",
        startDate: new Date(),
        endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
      });

      const payload: SubscriptionWebhookPayload = {
        action: "renew",
        subscriptionId: testSubscriptionId,
        planId: "greenchainz-standard",
        quantity: 1,
        purchaser: {
          emailId: "test@example.com",
          objectId: "test-user-123",
          tenantId: "test-tenant",
        },
        term: {
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toISOString(), // 35 days from now
        },
      };

      const renewed = await renewSubscription(payload);

      expect(renewed).not.toBeNull();
      expect(renewed?.status).toBe("active");
      expect(renewed?.lastRenewalDate).not.toBeNull();
    });

    it("should return null for non-existent subscription", async () => {
      const payload: SubscriptionWebhookPayload = {
        action: "renew",
        subscriptionId: "non-existent-sub",
        planId: "greenchainz-standard",
        quantity: 1,
        purchaser: {
          emailId: "test@example.com",
          objectId: "test-user-123",
          tenantId: "test-tenant",
        },
        term: {
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
      };

      const renewed = await renewSubscription(payload);
      expect(renewed).toBeNull();
    });
  });

  describe("cancelSubscription", () => {
    it("should cancel active subscription", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.insert(subscriptions).values({
        userId: testUserId,
        microsoftSubscriptionId: testSubscriptionId,
        tier: "standard",
        status: "active",
        startDate: new Date(),
      });

      const cancelled = await cancelSubscription(testSubscriptionId);

      expect(cancelled).not.toBeNull();
      expect(cancelled?.status).toBe("cancelled");
    });
  });

  describe("suspendSubscription", () => {
    it("should suspend active subscription", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.insert(subscriptions).values({
        userId: testUserId,
        microsoftSubscriptionId: testSubscriptionId,
        tier: "premium",
        status: "active",
        startDate: new Date(),
      });

      const suspended = await suspendSubscription(testSubscriptionId);

      expect(suspended).not.toBeNull();
      expect(suspended?.status).toBe("suspended");
    });
  });

  describe("reinstateSubscription", () => {
    it("should reinstate suspended subscription", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.insert(subscriptions).values({
        userId: testUserId,
        microsoftSubscriptionId: testSubscriptionId,
        tier: "standard",
        status: "suspended",
        startDate: new Date(),
      });

      const reinstated = await reinstateSubscription(testSubscriptionId);

      expect(reinstated).not.toBeNull();
      expect(reinstated?.status).toBe("active");
    });
  });

  describe("userHasAccess", () => {
    it("should return true for free tier when checking free access", async () => {
      const hasAccess = await userHasAccess(testUserId, "free");
      expect(hasAccess).toBe(true);
    });

    it("should return false for free tier when checking standard access", async () => {
      const hasAccess = await userHasAccess(testUserId, "standard");
      expect(hasAccess).toBe(false);
    });

    it("should return true for premium tier when checking any tier", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.insert(subscriptions).values({
        userId: testUserId,
        microsoftSubscriptionId: testSubscriptionId,
        tier: "premium",
        status: "active",
        startDate: new Date(),
      });

      const hasFreeAccess = await userHasAccess(testUserId, "free");
      const hasStandardAccess = await userHasAccess(testUserId, "standard");
      const hasPremiumAccess = await userHasAccess(testUserId, "premium");

      expect(hasFreeAccess).toBe(true);
      expect(hasStandardAccess).toBe(true);
      expect(hasPremiumAccess).toBe(true);
    });
  });

  describe("updateUserTier", () => {
    it("should create new subscription when user has none", async () => {
      const updated = await updateUserTier(testUserId, "standard");

      expect(updated).not.toBeNull();
      expect(updated?.tier).toBe("standard");
      expect(updated?.status).toBe("active");
    });

    it("should update existing subscription tier", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.insert(subscriptions).values({
        userId: testUserId,
        microsoftSubscriptionId: testSubscriptionId,
        tier: "free",
        status: "active",
        startDate: new Date(),
      });

      const updated = await updateUserTier(testUserId, "premium");

      expect(updated).not.toBeNull();
      expect(updated?.tier).toBe("premium");
    });
  });
});
