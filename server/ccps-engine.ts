import { db } from './db';
import { 
  materials, 
  ccpsScores, 
  ccpsBaselines, 
  decisionMakerPersonas,
  materialCertifications,
  materialSuppliers,
  manufacturers
} from '../drizzle/ccps-schema';
import { eq, and, sql } from 'drizzle-orm';

/**
 * CCPS (Composite Compliance-Performance Score) Calculation Engine
 * 
 * Calculates material scores across 6 metrics:
 * 1. Carbon Score (25% weight) - Environmental impact vs. baseline
 * 2. Compliance Score (20% weight) - Code compliance, warranties, durability
 * 3. Certification Score (20% weight) - EPD, HPD, FSC, C2C, GREENGUARD, LEED
 * 4. Cost Score (15% weight) - Price vs. category average
 * 5. Supply Chain Score (12% weight) - Lead time, regional availability, US production
 * 6. Health Score (8% weight) - VOC, Red List status, ingredient disclosure, biophilic
 */

export interface CCPSMetrics {
  carbonScore: number;
  complianceScore: number;
  certificationScore: number;
  costScore: number;
  supplyChainScore: number;
  healthScore: number;
  ccpsScore: number;
  sourcingDifficulty: number;
}

export interface CCPSWeights {
  carbon: number;
  compliance: number;
  certification: number;
  cost: number;
  supplyChain: number;
  health: number;
}

// Default weights for all personas
const DEFAULT_WEIGHTS: CCPSWeights = {
  carbon: 25,
  compliance: 20,
  certification: 20,
  cost: 15,
  supplyChain: 12,
  health: 8,
};

// Persona-specific weights
const PERSONA_WEIGHTS: Record<string, CCPSWeights> = {
  'Architect': {
    carbon: 15,
    compliance: 35,
    certification: 20,
    cost: 10,
    supplyChain: 10,
    health: 10,
  },
  'Spec_Writer': {
    carbon: 15,
    compliance: 30,
    certification: 30,
    cost: 10,
    supplyChain: 10,
    health: 5,
  },
  'LEED_AP': {
    carbon: 20,
    compliance: 20,
    certification: 40,
    cost: 10,
    supplyChain: 5,
    health: 5,
  },
  'Interior_Designer': {
    carbon: 10,
    compliance: 15,
    certification: 20,
    cost: 15,
    supplyChain: 15,
    health: 25,
  },
  'Quantity_Surveyor': {
    carbon: 30,
    compliance: 15,
    certification: 10,
    cost: 25,
    supplyChain: 10,
    health: 10,
  },
  'General_Contractor': {
    carbon: 10,
    compliance: 15,
    certification: 5,
    cost: 20,
    supplyChain: 30,
    health: 20,
  },
  'Facility_Manager': {
    carbon: 15,
    compliance: 20,
    certification: 10,
    cost: 15,
    supplyChain: 15,
    health: 25,
  },
};

/**
 * Calculate Carbon Score (0-100)
 * Formula: ((baseline_gwp - product_gwp) / baseline_gwp) * 100
 */
async function calculateCarbonScore(
  materialId: string,
  materialCategory: string,
  productGwp: number | null
): Promise<number> {
  if (!productGwp) return 50; // Neutral score if no data

  
  const baseline = await db
    .select()
    .from(ccpsBaselines)
    .where(eq(ccpsBaselines.category, materialCategory))
    .limit(1);

  if (!baseline.length || !baseline[0].baselineGwpPerUnit) return 50;

  const baselineGwp = parseFloat(baseline[0].baselineGwpPerUnit.toString());
  const score = ((baselineGwp - productGwp) / baselineGwp) * 100;
  
  return Math.max(0, Math.min(100, score)); // Cap at 0-100
}

/**
 * Calculate Compliance Score (0-100)
 * Submetrics: EPD validity, code compliance, warranty, durability
 */
async function calculateComplianceScore(material: any): Promise<number> {
  let score = 0;
  let maxPoints = 100;

  // EPD Validity (0-30 points)
  if (material.hasEpd && material.epdValidUntil) {
    const epdExpiry = new Date(material.epdValidUntil);
    if (epdExpiry > new Date()) {
      score += 30;
    } else {
      score += 10; // Expired EPD still counts for something
    }
  }

  // Code Compliance (0-25 points)
  if (material.fireRating) score += 15;
  if (material.thermalRValue || material.thermalUValue) score += 10;

  // Warranty (0-20 points)
  if (material.manufacturerWarrantyYears) {
    if (material.manufacturerWarrantyYears >= 10) {
      score += 20;
    } else if (material.manufacturerWarrantyYears >= 5) {
      score += 10;
    } else {
      score += 5;
    }
  }

  // Durability (0-25 points)
  if (material.expectedLifecycleYears) {
    if (material.expectedLifecycleYears >= 25) {
      score += 25;
    } else if (material.expectedLifecycleYears >= 15) {
      score += 15;
    } else if (material.expectedLifecycleYears >= 10) {
      score += 10;
    } else {
      score += 5;
    }
  }

  return Math.min(100, score);
}

/**
 * Calculate Certification Score (0-100)
 * Submetrics: EPD, HPD, FSC/C2C, GREENGUARD, LEED contribution
 */
async function calculateCertificationScore(materialId: string): Promise<number> {
  let score = 0;

  // Get all certifications for this material
  
  const certs = await db
    .select()
    .from(materialCertifications)
    .where(eq(materialCertifications.materialId, materialId));

  // EPD (0-25 points)
  if (certs.some((c: any) => c.certificationType === 'EPD')) score += 25;

  // HPD (0-25 points)
  if (certs.some((c: any) => c.certificationType === 'HPD')) score += 25;

  // FSC or C2C (0-20 points)
  if (certs.some((c: any) => c.certificationType === 'FSC' || c.certificationType === 'C2C')) score += 20;

  // GREENGUARD (0-20 points)
  if (certs.some((c: any) => c.certificationType === 'GREENGUARD')) score += 20;

  // LEED Contribution (0-10 points)
  if (certs.some((c: any) => c.leedCreditNumber)) score += 10;

  return Math.min(100, score);
}

/**
 * Calculate Cost Score (0-100)
 * Formula: ((category_avg_price - product_price) / category_avg_price) * 100
 * Can be negative for premium products
 */
async function calculateCostScore(
  materialCategory: string,
  productPrice: number | null
): Promise<number> {
  if (!productPrice) return 50; // Neutral score if no data

  
  const baseline = await db
    .select()
    .from(ccpsBaselines)
    .where(eq(ccpsBaselines.category, materialCategory))
    .limit(1);

  if (!baseline.length || !baseline[0].categoryAvgPrice) return 50;

  const categoryAvgPrice = parseFloat(baseline[0].categoryAvgPrice.toString());
  const score = ((categoryAvgPrice - productPrice) / categoryAvgPrice) * 100;
  
  return score; // Allow negative scores for premium products
}

/**
 * Calculate Supply Chain Score (0-100)
 * Submetrics: Lead time, regional availability, US production, supplier reliability
 */
async function calculateSupplyChainScore(
  materialId: string,
  material: any,
  manufacturerId: string | null
): Promise<number> {
  
  let score = 0;

  // Lead Time (0-30 points)
  if (material.leadTimeDays) {
    if (material.leadTimeDays <= 14) score += 30;
    else if (material.leadTimeDays <= 28) score += 20;
    else if (material.leadTimeDays <= 56) score += 10;
    else score += 5;
  }

  // Regional Availability (0-30 points)
  if (material.regionalAvailabilityMiles) {
    if (material.regionalAvailabilityMiles <= 500) score += 30;
    else if (material.regionalAvailabilityMiles <= 1000) score += 15;
    else score += 5;
  }

  // US Production (0-20 points)
  if (material.usManufactured) score += 20;

  // Supplier Reliability (0-20 points)
  if (manufacturerId) {
    const manufacturer = await db
      .select()
      .from(manufacturers)
      .where(eq(manufacturers.id, manufacturerId))
      .limit(1);

    if (manufacturer.length && manufacturer[0].yearsInBusiness) {
      if (manufacturer[0].yearsInBusiness >= 10) score += 20;
      else if (manufacturer[0].yearsInBusiness >= 5) score += 15;
      else score += 10;
    }
  }

  return Math.min(100, score);
}

/**
 * Calculate Health Score (0-100)
 * Submetrics: VOC emissions, Red List status, ingredient disclosure, biophilic
 */
async function calculateHealthScore(material: any): Promise<number> {
  let score = 0;

  // VOC Emissions (0-25 points)
  if (material.vocCertification) {
    if (material.vocCertification.includes('No-VOC') || material.vocCertification.includes('GREENGUARD')) {
      score += 25;
    } else if (material.vocCertification.includes('Low-VOC')) {
      score += 15;
    } else {
      score += 5;
    }
  }

  // Red List Status (0-25 points)
  if (!material.onRedList) score += 25;

  // Ingredient Disclosure (0-25 points)
  // Assume materials with HPD have ingredient disclosure
  if (material.hasHpd) score += 25;

  // Biophilic Properties (0-25 points)
  // Check if material is natural/biophilic (wood, stone, cork, etc.)
  const biophilicKeywords = ['wood', 'cork', 'stone', 'natural', 'bio', 'moss', 'plant'];
  if (biophilicKeywords.some(keyword => material.name?.toLowerCase().includes(keyword))) {
    score += 25;
  }

  return Math.min(100, score);
}

/**
 * Calculate Sourcing Difficulty (1-5 scale)
 * 1 = Easy to source, 5 = Difficult to source
 */
async function calculateSourcingDifficulty(
  material: any,
  manufacturerId: string | null
): Promise<number> {
  
  let difficulty = 0;

  // Lead Time Factor (0-2)
  if (material.leadTimeDays) {
    if (material.leadTimeDays > 56) difficulty += 2;
    else if (material.leadTimeDays > 28) difficulty += 1;
  }

  // Regional Availability Factor (0-2)
  if (material.regionalAvailabilityMiles) {
    if (material.regionalAvailabilityMiles > 1000) difficulty += 2;
    else if (material.regionalAvailabilityMiles > 500) difficulty += 1;
  }

  // US Production Factor (-1)
  if (material.usManufactured) difficulty -= 1;

  // Supplier Reliability Factor (0-1)
  if (manufacturerId) {
    const manufacturer = await db
      .select()
      .from(manufacturers)
      .where(eq(manufacturers.id, manufacturerId))
      .limit(1);

    if (manufacturer.length && (!manufacturer[0].yearsInBusiness || manufacturer[0].yearsInBusiness < 5)) {
      difficulty += 1;
    }
  }

  // Cap at 1-5 scale
  return Math.max(1, Math.min(5, difficulty));
}

/**
 * Calculate CCPS for a single material and persona
 */
export async function calculateCCPS(
  materialId: string,
  personaName: string = 'Default'
): Promise<CCPSMetrics> {
  // Get material data
  
  const materialData = await db
    .select()
    .from(materials)
    .where(eq(materials.id, materialId))
    .limit(1);

  if (!materialData.length) {
    throw new Error(`Material ${materialId} not found`);
  }

  const material = materialData[0];

  // Calculate individual metric scores
  const carbonScore = await calculateCarbonScore(
    materialId,
    material.category,
    material.globalWarmingPotential ? parseFloat(material.globalWarmingPotential.toString()) : null
  );

  const complianceScore = await calculateComplianceScore(material);
  const certificationScore = await calculateCertificationScore(materialId);
  const costScore = await calculateCostScore(
    material.category,
    material.pricePerUnit ? parseFloat(material.pricePerUnit.toString()) : null
  );
  const supplyChainScore = await calculateSupplyChainScore(
    materialId,
    material,
    material.manufacturerId
  );
  const healthScore = await calculateHealthScore(material);
  const sourcingDifficulty = await calculateSourcingDifficulty(material, material.manufacturerId);

  // Get weights for persona
  const weights = PERSONA_WEIGHTS[personaName] || DEFAULT_WEIGHTS;

  // Calculate weighted CCPS
  const ccpsScore = Math.round(
    (carbonScore * weights.carbon +
      complianceScore * weights.compliance +
      certificationScore * weights.certification +
      costScore * weights.cost +
      supplyChainScore * weights.supplyChain +
      healthScore * weights.health) / 100
  );

  return {
    carbonScore: Math.round(carbonScore),
    complianceScore: Math.round(complianceScore),
    certificationScore: Math.round(certificationScore),
    costScore: Math.round(costScore),
    supplyChainScore: Math.round(supplyChainScore),
    healthScore: Math.round(healthScore),
    ccpsScore: Math.max(0, Math.min(100, ccpsScore)), // Cap at 0-100
    sourcingDifficulty: Math.round(sourcingDifficulty),
  };
}

/**
 * Batch calculate CCPS for all materials and all personas
 */
export async function calculateAllCCPS(): Promise<void> {
  // Get all materials
  
  const allMaterials = await db.select().from(materials);

  // Get all personas
  const allPersonas = await db.select().from(decisionMakerPersonas);

  console.log(`Calculating CCPS for ${allMaterials.length} materials across ${allPersonas.length} personas...`);

  for (const material of allMaterials) {
    for (const persona of allPersonas) {
      try {
        const metrics = await calculateCCPS(material.id, persona.personaName);

        // Save to database
        await db
          .insert(ccpsScores)
          .values({
            materialId: material.id,
            decisionMakerPersona: persona.personaName,
            carbonScore: metrics.carbonScore,
            complianceScore: metrics.complianceScore,
            certificationScore: metrics.certificationScore,
            costScore: metrics.costScore,
            supplyChainScore: metrics.supplyChainScore,
            healthScore: metrics.healthScore,
            ccpsScore: metrics.ccpsScore,
            sourcingDifficulty: metrics.sourcingDifficulty,
            carbonWeight: persona.carbonWeight,
            complianceWeight: persona.complianceWeight,
            certificationWeight: persona.certificationWeight,
            costWeight: persona.costWeight,
            supplyChainWeight: persona.supplyChainWeight,
            healthWeight: persona.healthWeight,
            validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000), // Valid for 24 hours
          })
          .onConflictDoUpdate({
            target: [ccpsScores.materialId, ccpsScores.decisionMakerPersona],
            set: {
              carbonScore: metrics.carbonScore,
              complianceScore: metrics.complianceScore,
              certificationScore: metrics.certificationScore,
              costScore: metrics.costScore,
              supplyChainScore: metrics.supplyChainScore,
              healthScore: metrics.healthScore,
              ccpsScore: metrics.ccpsScore,
              sourcingDifficulty: metrics.sourcingDifficulty,
              calculatedAt: new Date(),
              validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
            },
          });
      } catch (error) {
        console.error(`Error calculating CCPS for material ${material.id}, persona ${persona.personaName}:`, error);
      }
    }
  }

  console.log('CCPS calculation complete');
}

/**
 * Get top N materials by CCPS for a specific persona
 */
export async function getTopMaterialsByPersona(
  personaName: string,
  limit: number = 20
): Promise<any[]> {
  
  return db
    .select({
      material: materials,
      ccps: ccpsScores,
    })
    .from(ccpsScores)
    .innerJoin(materials, eq(ccpsScores.materialId, materials.id))
    .where(eq(ccpsScores.decisionMakerPersona, personaName))
    .orderBy(sql`${ccpsScores.ccpsScore} DESC`)
    .limit(limit);
}

/**
 * Get materials by category and persona
 */
export async function getMaterialsByCategory(
  category: string,
  personaName: string = 'Default',
  limit: number = 50
): Promise<any[]> {
  
  return db
    .select({
      material: materials,
      ccps: ccpsScores,
    })
    .from(materials)
    .leftJoin(
      ccpsScores,
      and(
        eq(ccpsScores.materialId, materials.id),
        eq(ccpsScores.decisionMakerPersona, personaName)
      )
    )
    .where(eq(materials.category, category))
    .orderBy(sql`COALESCE(${ccpsScores.ccpsScore}, 0) DESC`)
    .limit(limit);
}

/**
 * Get material details with all certifications and suppliers
 */
export async function getMaterialDetails(materialId: string): Promise<any> {
  
  const material = await db
    .select()
    .from(materials)
    .where(eq(materials.id, materialId))
    .limit(1);

  if (!material.length) return null;

  const certifications = await db
    .select()
    .from(materialCertifications)
    .where(eq(materialCertifications.materialId, materialId));

  const suppliers = await db
    .select({
      supplier: materialSuppliers,
      manufacturer: manufacturers,
    })
    .from(materialSuppliers)
    .leftJoin(manufacturers, eq(materialSuppliers.supplierId, manufacturers.id))
    .where(eq(materialSuppliers.materialId, materialId));

  const ccpsData = await db
    .select()
    .from(ccpsScores)
    .where(eq(ccpsScores.materialId, materialId));

  return {
    ...material[0],
    certifications,
    suppliers,
    ccpsScores: ccpsData,
  };
}
