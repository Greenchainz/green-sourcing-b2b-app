import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  registerSupplier,
  getSupplierProfile,
  updateSupplierProfile,
  getSubscriptionTier,
  upgradeToPremium,
  downgradeToFree,
} from "./supplier-service";

describe("Supplier Service", () => {
  const mockInput = {
    userId: 1,
    companyName: "GreenMaterials Inc",
    email: "contact@greenmaterials.com",
    phone: "+1-555-0123",
    address: "123 Eco St",
    city: "Portland",
    state: "OR",
    zipCode: "97201",
    country: "USA",
    website: "https://greenmaterials.com",
  };

  describe("registerSupplier", () => {
    it("should register a new supplier with all fields", async () => {
      const profile = await registerSupplier(mockInput);
      expect(profile).toBeDefined();
      expect(profile.companyName).toBe("GreenMaterials Inc");
      expect(profile.email).toBe("contact@greenmaterials.com");
      expect(profile.city).toBe("Portland");
      expect(profile.isPremium).toBe(false);
      expect(profile.verified).toBe(false);
    });

    it("should throw error if supplier already exists for user", async () => {
      await registerSupplier(mockInput);
      await expect(registerSupplier(mockInput)).rejects.toThrow(
        "Supplier profile already exists for this user"
      );
    });

    it("should create free subscription by default", async () => {
      const profile = await registerSupplier(mockInput);
      const tier = await getSubscriptionTier(profile.id);
      expect(tier).toBe("free");
    });
  });

  describe("getSupplierProfile", () => {
    it("should retrieve supplier profile by user ID", async () => {
      const registered = await registerSupplier(mockInput);
      const profile = await getSupplierProfile(mockInput.userId);
      expect(profile).toBeDefined();
      expect(profile?.id).toBe(registered.id);
      expect(profile?.companyName).toBe("GreenMaterials Inc");
    });

    it("should return null if supplier not found", async () => {
      const profile = await getSupplierProfile(99999);
      expect(profile).toBeNull();
    });
  });

  describe("updateSupplierProfile", () => {
    it("should update supplier profile fields", async () => {
      await registerSupplier(mockInput);
      const updated = await updateSupplierProfile(mockInput.userId, {
        companyName: "GreenMaterials Pro",
        phone: "+1-555-9999",
      });
      expect(updated.companyName).toBe("GreenMaterials Pro");
      expect(updated.phone).toBe("+1-555-9999");
    });

    it("should throw error if supplier not found", async () => {
      await expect(
        updateSupplierProfile(99999, { companyName: "Test" })
      ).rejects.toThrow("Supplier profile not found");
    });

    it("should preserve unchanged fields", async () => {
      await registerSupplier(mockInput);
      const updated = await updateSupplierProfile(mockInput.userId, {
        companyName: "Updated Name",
      });
      expect(updated.email).toBe(mockInput.email);
      expect(updated.city).toBe(mockInput.city);
    });
  });

  describe("getSubscriptionTier", () => {
    it("should return free tier for new suppliers", async () => {
      const profile = await registerSupplier(mockInput);
      const tier = await getSubscriptionTier(profile.id);
      expect(tier).toBe("free");
    });

    it("should return premium tier if subscription is active", async () => {
      const profile = await registerSupplier(mockInput);
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      await upgradeToPremium(profile.id, "sub_123", "cus_123", futureDate);
      const tier = await getSubscriptionTier(profile.id);
      expect(tier).toBe("premium");
    });

    it("should return free tier if premium subscription expired", async () => {
      const profile = await registerSupplier(mockInput);
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 30);
      await upgradeToPremium(profile.id, "sub_123", "cus_123", pastDate);
      const tier = await getSubscriptionTier(profile.id);
      expect(tier).toBe("free");
    });
  });

  describe("upgradeToPremium", () => {
    it("should upgrade supplier to premium tier", async () => {
      const profile = await registerSupplier(mockInput);
      const renewalDate = new Date();
      renewalDate.setDate(renewalDate.getDate() + 30);
      await upgradeToPremium(profile.id, "sub_123", "cus_123", renewalDate);
      const updated = await getSupplierProfile(mockInput.userId);
      expect(updated?.isPremium).toBe(true);
    });

    it("should store Stripe subscription details", async () => {
      const profile = await registerSupplier(mockInput);
      const renewalDate = new Date();
      renewalDate.setDate(renewalDate.getDate() + 30);
      await upgradeToPremium(profile.id, "sub_456", "cus_456", renewalDate);
      const updated = await getSupplierProfile(mockInput.userId);
      expect(updated?.premiumExpiresAt).toBeDefined();
    });
  });

  describe("downgradeToFree", () => {
    it("should downgrade supplier from premium to free", async () => {
      const profile = await registerSupplier(mockInput);
      const renewalDate = new Date();
      renewalDate.setDate(renewalDate.getDate() + 30);
      await upgradeToPremium(profile.id, "sub_123", "cus_123", renewalDate);
      await downgradeToFree(profile.id);
      const updated = await getSupplierProfile(mockInput.userId);
      expect(updated?.isPremium).toBe(false);
      const tier = await getSubscriptionTier(profile.id);
      expect(tier).toBe("free");
    });

    it("should clear Stripe subscription details", async () => {
      const profile = await registerSupplier(mockInput);
      const renewalDate = new Date();
      renewalDate.setDate(renewalDate.getDate() + 30);
      await upgradeToPremium(profile.id, "sub_123", "cus_123", renewalDate);
      await downgradeToFree(profile.id);
      const updated = await getSupplierProfile(mockInput.userId);
      expect(updated?.premiumExpiresAt).toBeUndefined();
    });
  });
});
