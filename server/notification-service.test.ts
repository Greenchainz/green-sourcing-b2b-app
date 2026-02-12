import { describe, it, expect, vi } from "vitest";
import {
  sendInAppNotification,
  sendEmailNotification,
  sendSmsNotification,
  sendNotification,
  generateNotificationContent,
  generateRfqMatchEmail,
  generateBidAcceptedEmail,
  generateNewMessageEmail,
  markNotificationAsRead,
  getUnreadNotifications,
} from "./notification-service";

describe("Notification Service", () => {
  describe("generateNotificationContent", () => {
    it("should generate rfq_match notification", () => {
      const result = generateNotificationContent("rfq_match", {
        projectName: "Downtown Office",
        buyerName: "ABC Corp",
        location: "New York, NY",
        materialCount: 5,
      });

      expect(result.title).toContain("Downtown Office");
      expect(result.content).toContain("ABC Corp");
      expect(result.content).toContain("New York, NY");
    });

    it("should generate new_message notification", () => {
      const result = generateNotificationContent("new_message", {
        senderName: "John Doe",
        messagePreview: "Can you confirm delivery?",
      });

      expect(result.title).toContain("John Doe");
      expect(result.content).toContain("Can you confirm delivery?");
    });

    it("should generate bid_accepted notification", () => {
      const result = generateNotificationContent("bid_accepted", {
        projectName: "Office Renovation",
        bidPrice: 50000,
      });

      expect(result.title).toContain("accepted");
      expect(result.content).toContain("Office Renovation");
    });

    it("should generate bid_rejected notification", () => {
      const result = generateNotificationContent("bid_rejected", {
        projectName: "Office Renovation",
      });

      expect(result.title).toContain("not selected");
      expect(result.content).toContain("Office Renovation");
    });

    it("should generate rfq_closed notification", () => {
      const result = generateNotificationContent("rfq_closed", {
        projectName: "Office Renovation",
        winningBid: 45000,
        winningSupplier: "BuildRight",
      });

      expect(result.title).toContain("Closed");
      expect(result.content).toContain("BuildRight");
    });

    it("should handle missing data gracefully", () => {
      const result = generateNotificationContent("rfq_match", {});

      expect(result.title).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content).toContain("a buyer");
    });
  });

  describe("Email notification generation", () => {
    it("should generate rfq_match email", () => {
      const email = generateRfqMatchEmail({
        supplierName: "BuildRight",
        projectName: "Downtown Office",
        location: "New York, NY",
        materials: ["Insulation", "Drywall"],
        dueDate: "2026-02-28",
        matchScore: 95,
      });

      expect(email).toContain("BuildRight");
      expect(email).toContain("Downtown Office");
      expect(email).toBeTruthy();
    });

    it("should generate bid_accepted email", () => {
      const email = generateBidAcceptedEmail({
        supplierName: "BuildRight",
        projectName: "Downtown Office",
        bidPrice: 50000,
        leadDays: 14,
      });

      expect(email).toContain("BuildRight");
      expect(email).toContain("Downtown Office");
      expect(email).toBeTruthy();
    });

    it("should generate new_message email", () => {
      const email = generateNewMessageEmail({
        recipientName: "John",
        senderName: "Jane",
        messagePreview: "Can you confirm?",
        projectName: "Office Renovation",
      });

      expect(email).toContain("Jane");
      expect(email).toContain("Office Renovation");
      expect(email).toBeTruthy();
    });
  });

  describe("Notification sending", () => {
    it("should handle missing email gracefully", async () => {
      const result = await sendEmailNotification({
        userId: 1,
        type: "rfq_match",
        title: "Test",
        content: "Test content",
      });

      expect(result.success).toBe(false);
    });

    it("should handle missing phone gracefully", async () => {
      const result = await sendSmsNotification({
        userId: 1,
        type: "rfq_match",
        title: "Test",
        content: "Test content",
      });

      expect(result.success).toBe(false);
    });

    it("should log email notification when provided", async () => {
      const consoleSpy = vi.spyOn(console, "log");
      
      await sendEmailNotification({
        userId: 1,
        type: "rfq_match",
        title: "Test",
        content: "Test content",
        email: "test@example.com",
      });

      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it("should log SMS notification when provided", async () => {
      const consoleSpy = vi.spyOn(console, "log");
      
      await sendSmsNotification({
        userId: 1,
        type: "rfq_match",
        title: "Test",
        content: "Test content",
        phone: "+1234567890",
      });

      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe("Notification content validation", () => {
    it("should have proper title format for all types", () => {
      const types: Array<"rfq_match" | "new_message" | "bid_accepted" | "bid_rejected" | "rfq_closed"> = [
        "rfq_match",
        "new_message",
        "bid_accepted",
        "bid_rejected",
        "rfq_closed",
      ];

      types.forEach((type) => {
        const result = generateNotificationContent(type, {
          projectName: "Test Project",
          buyerName: "Test Buyer",
          senderName: "Test Sender",
          bidPrice: 50000,
          winningSupplier: "Test Supplier",
        });

        expect(result.title).toBeTruthy();
        expect(result.title.length).toBeGreaterThan(0);
        expect(result.content).toBeTruthy();
        expect(result.content.length).toBeGreaterThan(0);
      });
    });
  });
});
