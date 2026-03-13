import { describe, it, expect, beforeAll } from "vitest";
import { getDb } from "./db";
import {
  calculateSwapScore,
  findSwapCandidates,
  saveSwapRecommendation,
  getSavedSwaps,
} from "./material-swap-service";
import { materials, materialSwaps } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Material Swap Intelligence", () => {
  let testMaterialId: number;
  let candidateMaterialId: number;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Find two materials in the same category for testing
    const testMaterials = await db
      .select()
      .from(materials)
      .where(eq(materials.category, "Insulation"))
      .limit(2);

    if (testMaterials.length < 2) {
      throw new Error("Need at least 2 insulation materials for swap testing");
    }

    testMaterialId = testMaterials[0].id;
    candidateMaterialId = testMaterials[1].id;
  });

  describe("calculateSwapScore", () => {
    it("should calculate swap score between two materials", async () => {
      const result = await calculateSwapScore(testMaterialId, candidateMaterialId);

      expect(result).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.reason).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(100);
    });

    it("should return zero score for non-existent materials", async () => {
      const result = await calculateSwapScore(99999, 99998);

      expect(result.score).toBe(0);
      expect(result.reason).toContain("not found");
      expect(result.confidence).toBe(0);
    });

    it("should penalize different categories", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Find materials in different categories
      const [mat1, mat2] = await Promise.all([
        db.select().from(materials).where(eq(materials.category, "Insulation")).limit(1).then((r) => r[0]),
        db.select().from(materials).where(eq(materials.category, "Concrete")).limit(1).then((r) => r[0]),
      ]);

      if (!mat1 || !mat2) {
        console.warn("Skipping category penalty test - materials not found");
        return;
      }

      const result = await calculateSwapScore(mat1.id, mat2.id);

      // Different categories should have lower scores
      expect(result.score).toBeLessThan(50);
      expect(result.reason).toContain("Different material category");
    });
  });

  describe("findSwapCandidates", () => {
    it("should find swap candidates for a material", async () => {
      const candidates = await findSwapCandidates(testMaterialId, 5);

      expect(Array.isArray(candidates)).toBe(true);
      expect(candidates.length).toBeGreaterThan(0);
      expect(candidates.length).toBeLessThanOrEqual(5);

      // Verify candidate structure
      const firstCandidate = candidates[0];
      expect(firstCandidate).toHaveProperty("materialId");
      expect(firstCandidate).toHaveProperty("materialName");
      expect(firstCandidate).toHaveProperty("swapScore");
      expect(firstCandidate).toHaveProperty("swapTier");
      expect(firstCandidate).toHaveProperty("swapReason");
      expect(firstCandidate).toHaveProperty("confidence");
    });

    it("should return candidates sorted by score (descending)", async () => {
      const candidates = await findSwapCandidates(testMaterialId, 5);

      if (candidates.length < 2) {
        console.warn("Skipping sort test - not enough candidates");
        return;
      }

      for (let i = 1; i < candidates.length; i++) {
        expect(candidates[i - 1].swapScore).toBeGreaterThanOrEqual(candidates[i].swapScore);
      }
    });

    it("should respect limit parameter", async () => {
      const candidates = await findSwapCandidates(testMaterialId, 3);

      expect(candidates.length).toBeLessThanOrEqual(3);
    });

    it("should return empty array for non-existent material", async () => {
      const candidates = await findSwapCandidates(99999, 5);

      expect(candidates).toEqual([]);
    });

    it("should assign correct tier based on score", async () => {
      const candidates = await findSwapCandidates(testMaterialId, 10);

      for (const candidate of candidates) {
        if (candidate.swapScore >= 80) {
          expect(candidate.swapTier).toBe("best");
        } else if (candidate.swapScore >= 60) {
          expect(candidate.swapTier).toBe("better");
        } else {
          expect(candidate.swapTier).toBe("good");
        }
      }
    });

    it("should include leadTimeDays for each candidate (number or null)", async () => {
      const candidates = await findSwapCandidates(testMaterialId, 5);

      expect(candidates.length).toBeGreaterThan(0);
      for (const candidate of candidates) {
        expect(candidate).toHaveProperty("leadTimeDays");
        expect(
          candidate.leadTimeDays === null || typeof candidate.leadTimeDays === "number"
        ).toBe(true);
      }
    });
  });

  describe("saveSwapRecommendation", () => {
    it("should save a swap recommendation", async () => {
      const swapId = await saveSwapRecommendation(
        testMaterialId,
        candidateMaterialId,
        "Test swap recommendation",
        85,
        "best",
        90,
        "algorithm"
      );

      expect(swapId).toBeGreaterThan(0);

      // Verify it was saved
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const saved = await db
        .select()
        .from(materialSwaps)
        .where(eq(materialSwaps.id, swapId))
        .then((r) => r[0]);

      expect(saved).toBeDefined();
      expect(saved.materialId).toBe(testMaterialId);
      expect(saved.swapMaterialId).toBe(candidateMaterialId);
      expect(parseFloat(saved.swapScore)).toBe(85);
      expect(saved.swapTier).toBe("best");
      expect(saved.createdBy).toBe("algorithm");
    });

    it("should handle agent-created swaps", async () => {
      const swapId = await saveSwapRecommendation(
        testMaterialId,
        candidateMaterialId,
        "Agent recommendation",
        75,
        "better",
        85,
        "agent"
      );

      expect(swapId).toBeGreaterThan(0);

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const saved = await db
        .select()
        .from(materialSwaps)
        .where(eq(materialSwaps.id, swapId))
        .then((r) => r[0]);

      expect(saved.createdBy).toBe("agent");
    });

    it("should handle admin-created swaps", async () => {
      const swapId = await saveSwapRecommendation(
        testMaterialId,
        candidateMaterialId,
        "Admin override",
        95,
        "best",
        100,
        "admin"
      );

      expect(swapId).toBeGreaterThan(0);

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const saved = await db
        .select()
        .from(materialSwaps)
        .where(eq(materialSwaps.id, swapId))
        .then((r) => r[0]);

      expect(saved.createdBy).toBe("admin");
    });
  });

  describe("getSavedSwaps", () => {
    it("should retrieve saved swaps for a material", async () => {
      // First save a swap
      await saveSwapRecommendation(
        testMaterialId,
        candidateMaterialId,
        "Saved swap test",
        80,
        "best",
        85,
        "algorithm"
      );

      // Then retrieve it
      const savedSwaps = await getSavedSwaps(testMaterialId);

      expect(Array.isArray(savedSwaps)).toBe(true);
      expect(savedSwaps.length).toBeGreaterThan(0);

      // Verify structure
      const firstSwap = savedSwaps[0];
      expect(firstSwap).toHaveProperty("swapId");
      expect(firstSwap).toHaveProperty("materialId");
      expect(firstSwap).toHaveProperty("materialName");
      expect(firstSwap).toHaveProperty("swapScore");
      expect(firstSwap).toHaveProperty("swapTier");
      expect(firstSwap).toHaveProperty("swapReason");
      expect(firstSwap).toHaveProperty("confidence");
      expect(firstSwap).toHaveProperty("createdBy");
    });

    it("should return empty array for material with no saved swaps", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Find a material that likely has no swaps
      const materialsTable = materials;
      const materialsList = await db.select().from(materialsTable).limit(1);
      if (materialsList.length === 0) return;

      const unusedMaterialId = materialsList[0].id + 10000; // Use a high ID that likely doesn't exist

      const savedSwaps = await getSavedSwaps(unusedMaterialId);

      expect(savedSwaps).toEqual([]);
    });

    it("should return swaps sorted by score (descending)", async () => {
      // Save multiple swaps with different scores
      await Promise.all([
        saveSwapRecommendation(testMaterialId, candidateMaterialId, "Low score", 60, "better", 70, "algorithm"),
        saveSwapRecommendation(testMaterialId, candidateMaterialId, "High score", 90, "best", 95, "algorithm"),
        saveSwapRecommendation(testMaterialId, candidateMaterialId, "Medium score", 75, "better", 80, "algorithm"),
      ]);

      const savedSwaps = await getSavedSwaps(testMaterialId);

      if (savedSwaps.length < 2) {
        console.warn("Skipping sort test - not enough saved swaps");
        return;
      }

      for (let i = 1; i < savedSwaps.length; i++) {
        expect(savedSwaps[i - 1].swapScore).toBeGreaterThanOrEqual(savedSwaps[i].swapScore);
      }
    });

    it("should include leadTimeDays for each saved swap (number or null)", async () => {
      await saveSwapRecommendation(
        testMaterialId,
        candidateMaterialId,
        "leadTimeDays test swap",
        80,
        "best",
        85,
        "algorithm"
      );

      const savedSwaps = await getSavedSwaps(testMaterialId);

      expect(savedSwaps.length).toBeGreaterThan(0);
      for (const swap of savedSwaps) {
        expect(swap).toHaveProperty("leadTimeDays");
        expect(
          swap.leadTimeDays === null || typeof swap.leadTimeDays === "number"
        ).toBe(true);
      }
    });
  });

  describe("Integration: Full Swap Workflow", () => {
    it("should complete full swap workflow: find → calculate → save → retrieve", async () => {
      // Step 1: Find candidates
      const candidates = await findSwapCandidates(testMaterialId, 3);
      expect(candidates.length).toBeGreaterThan(0);

      const topCandidate = candidates[0];

      // Step 2: Calculate detailed score
      const scoreResult = await calculateSwapScore(testMaterialId, topCandidate.materialId);
      expect(scoreResult.score).toBeGreaterThan(0);

      // Step 3: Save recommendation
      const swapId = await saveSwapRecommendation(
        testMaterialId,
        topCandidate.materialId,
        scoreResult.reason,
        scoreResult.score,
        topCandidate.swapTier,
        scoreResult.confidence,
        "algorithm"
      );
      expect(swapId).toBeGreaterThan(0);

      // Step 4: Retrieve saved swaps
      const savedSwaps = await getSavedSwaps(testMaterialId);
      expect(savedSwaps.length).toBeGreaterThan(0);

      const savedSwap = savedSwaps.find((s) => s.swapId === swapId);
      expect(savedSwap).toBeDefined();
      expect(savedSwap?.materialId).toBe(topCandidate.materialId);
    });
  });
});
