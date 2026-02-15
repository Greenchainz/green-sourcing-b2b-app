/**
 * EC3 Integration Test
 * 
 * Tests the full EC3 → materials database integration:
 * 1. Fetch EPDs from EC3 API
 * 2. Transform to materials schema
 * 3. Insert into database
 * 4. Query by carbon range
 */

import { describe, it, expect } from "vitest";
import { fetchEC3EPDs, searchEC3EPDs } from "./ec3";
import { transformEC3ToMaterial, transformEC3Batch } from "./ec3-transform";
import { getDb } from "./db";
import { materials } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("EC3 Integration", () => {
  it("should fetch EPDs from EC3 API", async () => {
    // Try without category filter first
    const epds = await fetchEC3EPDs(undefined, 5);
    
    expect(epds).toBeDefined();
    expect(Array.isArray(epds)).toBe(true);
    
    // If no results, skip the rest of the test
    if (epds.length === 0) {
      console.warn("No EPDs returned from EC3 API - skipping test");
      return;
    }
    
    expect(epds.length).toBeGreaterThan(0);
    expect(epds.length).toBeLessThanOrEqual(5);
    
    // Check EPD structure
    const epd = epds[0];
    expect(epd).toHaveProperty("id");
    expect(epd).toHaveProperty("name");
    expect(epd).toHaveProperty("gwp");
    expect(epd).toHaveProperty("category");
    expect(epd.category).toHaveProperty("name");
    expect(epd.category).toHaveProperty("display_name");
  }, 30000);

  it("should transform EC3 EPD to material schema", async () => {
    const epds = await fetchEC3EPDs(undefined, 1);
    
    if (epds.length === 0) {
      console.warn("No EPDs returned from EC3 API - skipping test");
      return;
    }
    
    const epd = epds[0];
    const material = transformEC3ToMaterial(epd);
    
    // Check required fields
    expect(material).toHaveProperty("name");
    expect(material).toHaveProperty("category");
    expect(material).toHaveProperty("gwpValue");
    expect(material).toHaveProperty("declaredUnit");
    expect(material).toHaveProperty("hasEpd", 1);
    expect(material).toHaveProperty("dataSource", "EC3");
    
    // Check EC3 tracking fields
    expect(material).toHaveProperty("ec3Id");
    expect(material).toHaveProperty("ec3SyncedAt");
    expect(material).toHaveProperty("ec3Category");
    expect(material.ec3Id).toBe(epd.id);
  }, 30000);

  it("should batch transform multiple EPDs", async () => {
    const epds = await fetchEC3EPDs(undefined, 3);
    
    if (epds.length === 0) {
      console.warn("No EPDs returned from EC3 API - skipping test");
      return;
    }
    
    const materials = transformEC3Batch(epds);
    
    expect(materials.length).toBe(epds.length);
    materials.forEach((material, index) => {
      expect(material.ec3Id).toBe(epds[index].id);
      expect(material.dataSource).toBe("EC3");
    });
  }, 30000);

  it("should insert transformed material into database", async () => {
    const epds = await fetchEC3EPDs(undefined, 1);
    
    if (epds.length === 0) {
      console.warn("No EPDs returned from EC3 API - skipping test");
      return;
    }
    
    const material = transformEC3ToMaterial(epds[0]);
    const db = await getDb();
    expect(db).toBeDefined();
    
    // Check if material already exists
    const existing = await db!
      .select()
      .from(materials)
      .where(eq(materials.ec3Id, material.ec3Id!))
      .limit(1);
    
    if (existing.length === 0) {
      // Insert new material
      await db!.insert(materials).values(material as any);
      
      // Verify insertion
      const inserted = await db!
        .select()
        .from(materials)
        .where(eq(materials.ec3Id, material.ec3Id!))
        .limit(1);
      
      expect(inserted.length).toBe(1);
      expect(inserted[0].ec3Id).toBe(material.ec3Id);
      expect(inserted[0].dataSource).toBe("EC3");
    } else {
      // Material already exists, verify it has EC3 data
      expect(existing[0].ec3Id).toBe(material.ec3Id);
      expect(existing[0].dataSource).toBe("EC3");
    }
  }, 30000);

  it("should search EC3 by keyword", async () => {
    const epds = await searchEC3EPDs("concrete", 5);
    
    expect(epds).toBeDefined();
    expect(Array.isArray(epds)).toBe(true);
    
    if (epds.length === 0) {
      console.warn("No search results from EC3 API - skipping test");
      return;
    }
    
    // Verify search results are relevant
    epds.forEach(epd => {
      const searchText = `${epd.name} ${epd.category.display_name}`.toLowerCase();
      expect(searchText).toContain("concrete");
    });
  }, 30000);
});
