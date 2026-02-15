import { describe, it, expect, beforeEach } from "vitest";
import { db } from "./db";
import { materials, materialSpecs, users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe.skipIf(!db)("Material Spec Submission E2E Tests", () => {
  let testUserId: number;
  let testMaterialId: number;

  beforeEach(async () => {
    if (!db) throw new Error("Database not initialized");

    // Clean up test data
    await db.delete(materialSpecs).where(eq(materialSpecs.submittedBy, 999));
    await db.delete(materials).where(eq(materials.id, 999));
    await db.delete(users).where(eq(users.id, 999));

    // Create test user
    const [user] = await db
      .insert(users)
      .values({
        id: 999,
        openId: "test-user-999",
        name: "Test Supplier",
        email: "supplier@test.com",
        role: "user",
      })
      .returning();
    testUserId = user.id;

    // Create test material
    const [material] = await db
      .insert(materials)
      .values({
        id: 999,
        name: "Test Concrete Mix",
        category: "Concrete",
        subcategory: "Ready Mix",
        description: "Test material for spec submission",
        gwp: "350 kgCO2e",
        declaredUnit: "1 m3",
        manufacturerId: 1,
      })
      .returning();
    testMaterialId = material.id;
  });

  describe("Material Spec Submission", () => {
    it("should submit a complete material spec with all fields", async () => {
      if (!db) throw new Error("Database not initialized");

      const specData = {
        materialId: testMaterialId,
        submittedBy: testUserId,
        // Compliance fields
        fireRating: "Class A",
        fireRatingStandard: "ASTM E84",
        rValue: "R-30",
        thermalUValue: "0.033 W/m²K",
        compressiveStrength: "4000 psi",
        astmStandards: JSON.stringify(["ASTM C150", "ASTM C33"]),
        meetsTitle24: true,
        meetsIecc: true,
        // Cost fields
        pricePerUnit: "125.50",
        priceUnit: "m3",
        leadTimeDays: 14,
        moq: "10 m3",
        bulkPricing: JSON.stringify({ "100+": "115.00", "500+": "110.00" }),
        // Supply chain fields
        usManufactured: true,
        regionalAvailabilityMiles: 250,
        availability: "In Stock",
        localSourcing: true,
        // Health fields
        vocLevel: "Low",
        vocCertification: "SCAQMD Rule 1113",
        toxicity: "Non-toxic",
        indoorAirQuality: "Excellent",
        // Certifications
        hasLeed: true,
        hasDeclare: false,
        hasHpd: true,
        hasFsc: false,
        hasC2c: false,
        hasGreenguard: true,
        // Metadata
        datasheetUrl: "https://example.com/datasheet.pdf",
        notes: "Test submission for E2E testing",
        status: "pending",
      };

      const [spec] = await db.insert(materialSpecs).values(specData).returning();

      expect(spec).toBeDefined();
      expect(spec.materialId).toBe(testMaterialId);
      expect(spec.submittedBy).toBe(testUserId);
      expect(spec.fireRating).toBe("Class A");
      expect(spec.rValue).toBe("R-30");
      expect(spec.pricePerUnit).toBe("125.50");
      expect(spec.leadTimeDays).toBe(14);
      expect(spec.usManufactured).toBe(true);
      expect(spec.vocLevel).toBe("Low");
      expect(spec.hasLeed).toBe(true);
      expect(spec.hasHpd).toBe(true);
      expect(spec.status).toBe("pending");
    });

    it("should submit a minimal spec with only required fields", async () => {
      if (!db) throw new Error("Database not initialized");

      const minimalSpec = {
        materialId: testMaterialId,
        submittedBy: testUserId,
        status: "pending",
      };

      const [spec] = await db.insert(materialSpecs).values(minimalSpec).returning();

      expect(spec).toBeDefined();
      expect(spec.materialId).toBe(testMaterialId);
      expect(spec.submittedBy).toBe(testUserId);
      expect(spec.status).toBe("pending");
    });

    it("should store JSON fields correctly", async () => {
      if (!db) throw new Error("Database not initialized");

      const astmStandards = ["ASTM C150", "ASTM C33", "ASTM C494"];
      const bulkPricing = { "100+": "115.00", "500+": "110.00", "1000+": "105.00" };

      const specData = {
        materialId: testMaterialId,
        submittedBy: testUserId,
        astmStandards: JSON.stringify(astmStandards),
        bulkPricing: JSON.stringify(bulkPricing),
        status: "pending",
      };

      const [spec] = await db.insert(materialSpecs).values(specData).returning();

      expect(spec.astmStandards).toBe(JSON.stringify(astmStandards));
      expect(spec.bulkPricing).toBe(JSON.stringify(bulkPricing));

      // Verify JSON can be parsed back
      const parsedStandards = JSON.parse(spec.astmStandards!);
      const parsedPricing = JSON.parse(spec.bulkPricing!);
      expect(parsedStandards).toEqual(astmStandards);
      expect(parsedPricing).toEqual(bulkPricing);
    });
  });

  describe("Query Material Specs", () => {
    let testSpecId: number;

    beforeEach(async () => {
      if (!db) throw new Error("Database not initialized");

      const [spec] = await db
        .insert(materialSpecs)
        .values({
          materialId: testMaterialId,
          submittedBy: testUserId,
          fireRating: "Class A",
          pricePerUnit: "125.50",
          status: "pending",
        })
        .returning();
      testSpecId = spec.id;
    });

    it("should get specs by material ID", async () => {
      if (!db) throw new Error("Database not initialized");

      const specs = await db
        .select()
        .from(materialSpecs)
        .where(eq(materialSpecs.materialId, testMaterialId));

      expect(specs).toHaveLength(1);
      expect(specs[0].materialId).toBe(testMaterialId);
      expect(specs[0].fireRating).toBe("Class A");
    });

    it("should get specs by supplier ID", async () => {
      if (!db) throw new Error("Database not initialized");

      const specs = await db
        .select()
        .from(materialSpecs)
        .where(eq(materialSpecs.submittedBy, testUserId));

      expect(specs).toHaveLength(1);
      expect(specs[0].submittedBy).toBe(testUserId);
    });

    it("should get pending specs for admin review", async () => {
      if (!db) throw new Error("Database not initialized");

      const pendingSpecs = await db
        .select()
        .from(materialSpecs)
        .where(eq(materialSpecs.status, "pending"));

      expect(pendingSpecs.length).toBeGreaterThan(0);
      expect(pendingSpecs[0].status).toBe("pending");
    });
  });

  describe("Update Material Specs", () => {
    let testSpecId: number;

    beforeEach(async () => {
      if (!db) throw new Error("Database not initialized");

      const [spec] = await db
        .insert(materialSpecs)
        .values({
          materialId: testMaterialId,
          submittedBy: testUserId,
          fireRating: "Class A",
          pricePerUnit: "125.50",
          status: "pending",
        })
        .returning();
      testSpecId = spec.id;
    });

    it("should update spec fields", async () => {
      if (!db) throw new Error("Database not initialized");

      await db
        .update(materialSpecs)
        .set({
          fireRating: "Class B",
          pricePerUnit: "130.00",
          leadTimeDays: 21,
        })
        .where(eq(materialSpecs.id, testSpecId));

      const [updated] = await db
        .select()
        .from(materialSpecs)
        .where(eq(materialSpecs.id, testSpecId));

      expect(updated.fireRating).toBe("Class B");
      expect(updated.pricePerUnit).toBe("130.00");
      expect(updated.leadTimeDays).toBe(21);
    });

    it("should update spec status", async () => {
      if (!db) throw new Error("Database not initialized");

      await db
        .update(materialSpecs)
        .set({ status: "approved" })
        .where(eq(materialSpecs.id, testSpecId));

      const [updated] = await db
        .select()
        .from(materialSpecs)
        .where(eq(materialSpecs.id, testSpecId));

      expect(updated.status).toBe("approved");
    });
  });

  describe("Review Material Specs (Admin)", () => {
    let testSpecId: number;

    beforeEach(async () => {
      if (!db) throw new Error("Database not initialized");

      const [spec] = await db
        .insert(materialSpecs)
        .values({
          materialId: testMaterialId,
          submittedBy: testUserId,
          fireRating: "Class A",
          pricePerUnit: "125.50",
          status: "pending",
        })
        .returning();
      testSpecId = spec.id;
    });

    it("should approve a spec", async () => {
      if (!db) throw new Error("Database not initialized");

      await db
        .update(materialSpecs)
        .set({
          status: "approved",
          reviewedBy: 1, // Admin user ID
          reviewedAt: new Date(),
        })
        .where(eq(materialSpecs.id, testSpecId));

      const [reviewed] = await db
        .select()
        .from(materialSpecs)
        .where(eq(materialSpecs.id, testSpecId));

      expect(reviewed.status).toBe("approved");
      expect(reviewed.reviewedBy).toBe(1);
      expect(reviewed.reviewedAt).toBeDefined();
    });

    it("should reject a spec with feedback", async () => {
      if (!db) throw new Error("Database not initialized");

      await db
        .update(materialSpecs)
        .set({
          status: "rejected",
          reviewedBy: 1,
          reviewedAt: new Date(),
          reviewNotes: "Fire rating documentation missing",
        })
        .where(eq(materialSpecs.id, testSpecId));

      const [reviewed] = await db
        .select()
        .from(materialSpecs)
        .where(eq(materialSpecs.id, testSpecId));

      expect(reviewed.status).toBe("rejected");
      expect(reviewed.reviewNotes).toBe("Fire rating documentation missing");
    });
  });
});
