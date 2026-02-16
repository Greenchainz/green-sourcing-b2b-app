/**
 * Pricing Data Service
 * 
 * Handles database operations for scraped pricing data from TXDOT and other sources
 */

import { getDb } from '../db';
import { pricingData, materials } from '../../drizzle/schema';
import { eq, and, desc } from 'drizzle-orm';
import type { ScrapedPricingData } from './txdotScraper';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface StorePricingDataResult {
  success: boolean;
  recordsInserted: number;
  recordsSkipped: number;
  errors: string[];
}

// ─── Material Matching ──────────────────────────────────────────────────────

/**
 * Finds or creates a material by category name
 * Returns material ID for linking pricing data
 */
async function findOrCreateMaterial(categoryName: string): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  // Try to find existing material by name
  const existing = await db
    .select({ id: materials.id })
    .from(materials)
    .where(eq(materials.name, categoryName))
    .limit(1);
  
  if (existing.length > 0) {
    return existing[0].id;
  }
  
  // Create new material placeholder
  const [newMaterial] = await db.insert(materials).values({
    name: categoryName,
    description: `Auto-generated from TXDOT bid tab scraper`,
    category: 'Construction Materials',
    subcategory: categoryName,
    pricePerUnit: '0', // Will be updated with average pricing
    priceUnit: 'Various',
    leadTimeDays: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  
  return newMaterial.insertId;
}

// ─── Pricing Data Storage ───────────────────────────────────────────────────

/**
 * Stores scraped pricing data in the database
 * Handles material matching and duplicate detection
 */
export async function storePricingData(
  scrapedData: ScrapedPricingData[]
): Promise<StorePricingDataResult> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const result: StorePricingDataResult = {
    success: true,
    recordsInserted: 0,
    recordsSkipped: 0,
    errors: [],
  };
  
  for (const data of scrapedData) {
    try {
      // Find or create material
      const materialId = await findOrCreateMaterial(data.materialCategory);
      
      // Check for duplicate pricing data
      // Skip if we already have pricing from the same source/contract
      const existing = await db
        .select({ id: pricingData.id })
        .from(pricingData)
        .where(
          and(
            eq(pricingData.materialId, materialId),
            eq(pricingData.source, data.source),
            eq(pricingData.contractNumber, data.contractNumber || '')
          )
        )
        .limit(1);
      
      if (existing.length > 0) {
        result.recordsSkipped++;
        continue;
      }
      
      // Insert pricing data
      await db.insert(pricingData).values({
        materialId,
        pricePerUnit: data.pricePerUnit.toString(),
        unit: data.unit,
        currency: 'USD',
        state: data.state,
        city: null,
        zipCode: null,
        county: data.county,
        source: data.source,
        sourceDate: data.sourceDate,
        sourceUrl: data.sourceUrl,
        projectName: data.projectName,
        contractNumber: data.contractNumber,
        laborRatePerHour: null,
        totalLaborCost: null,
        dataConfidence: data.dataConfidence,
        isActive: true,
        expiresAt: null, // Set expiration date 6 months from source date
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      result.recordsInserted++;
    } catch (error) {
      result.success = false;
      result.errors.push(`Error storing pricing data for ${data.materialCategory}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  return result;
}

/**
 * Gets pricing data for a specific material
 */
export async function getMaterialPricing(materialId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  return db
    .select()
    .from(pricingData)
    .where(
      and(
        eq(pricingData.materialId, materialId),
        eq(pricingData.isActive, true)
      )
    )
    .orderBy(desc(pricingData.sourceDate));
}

/**
 * Gets pricing data by state and county
 */
export async function getRegionalPricing(state: string, county?: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const conditions = [
    eq(pricingData.state, state),
    eq(pricingData.isActive, true),
  ];
  
  if (county) {
    conditions.push(eq(pricingData.county, county));
  }
  
  return db
    .select()
    .from(pricingData)
    .where(and(...conditions))
    .orderBy(desc(pricingData.sourceDate));
}

/**
 * Updates material average pricing based on regional data
 */
export async function updateMaterialAveragePricing(materialId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const pricing = await getMaterialPricing(materialId);
  
  if (pricing.length === 0) {
    return;
  }
  
  // Calculate average price
  const totalPrice = pricing.reduce((sum: number, p: any) => sum + parseFloat(p.pricePerUnit), 0);
  const averagePrice = totalPrice / pricing.length;
  
  // Update material with average price
  await db
    .update(materials)
    .set({
      pricePerUnit: averagePrice.toString(),
      updatedAt: new Date(),
    })
    .where(eq(materials.id, materialId));
}

/**
 * Batch update all material average pricing
 */
export async function updateAllMaterialAveragePricing() {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  
  const allMaterials = await db.select({ id: materials.id }).from(materials);
  
  for (const material of allMaterials) {
    await updateMaterialAveragePricing(material.id);
  }
}
