/**
 * Seed script: inserts 2 materials + technical specs for swap validation testing.
 * Run with: npx tsx scripts/seed-swap-test.ts
 *
 * Material 1 (incumbent): Type III Portland Cement Concrete — id will be returned
 * Material 2 (sustainable): 50% SCM Blended Cement Concrete — id will be returned
 *
 * After running, use the returned IDs to call validateMaterialSwap, then generateCsiForm.
 */

import { config } from 'dotenv';
import { existsSync } from 'fs';

if (existsSync('.env.local')) {
  config({ path: '.env.local', override: true });
} else {
  config();
}

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { materials, materialTechnicalSpecs } from '../drizzle/schema';

async function seed() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  const db = drizzle(pool);

  console.log('\n[Seed] Inserting incumbent material: Type III Portland Cement Concrete...');

  const [incumbent] = await db.insert(materials).values({
    name: 'Type III Portland Cement Concrete',
    productName: 'Standard High-Early Strength Concrete Mix',
    category: 'Concrete',
    subcategory: 'Ready-Mix',
    description: 'ASTM C150 Type III high-early strength portland cement concrete, 4000 psi compressive strength at 28 days.',
    gwpValue: '400.0000',
    gwpUnit: 'kg CO2e/m3',
    declaredUnit: 'm3',
    fireRating: '2-hour',
    fireRatingStandard: 'ASTM E119',
    rValue: '0.10',
    complianceGrade: 'C',
    hasEpd: false,
    hasHpd: false,
    usManufactured: true,
    onRedList: false,
    recycledContentPct: '0.00',
    leadTimeDays: 7,
    dataSource: 'GreenChainz-Seed',
    verified: false,
    astmStandards: 'ASTM C150, ASTM C94',
    meetsTitle24: true,
    meetsIecc: true,
    expectedLifecycleYears: 50,
    warrantyYears: 1,
  }).returning({ id: materials.id, name: materials.name });

  console.log(`[Seed] ✅ Incumbent: ${incumbent.name} (ID: ${incumbent.id})`);

  const [sustainable] = await db.insert(materials).values({
    name: '50% SCM Blended Cement Concrete',
    productName: 'GreenMix SCM-50 Low-Carbon Concrete',
    category: 'Concrete',
    subcategory: 'Ready-Mix',
    description: 'Low-carbon concrete with 50% supplementary cementitious materials (fly ash / slag). ASTM C595 compliant. Equivalent 4000 psi strength at 28 days.',
    epdNumber: 'EPD-GCZ-SCM50-2025',
    epdUrl: 'https://www.buildingtransparency.org/epds/sample-scm50',
    gwpValue: '200.0000',
    gwpUnit: 'kg CO2e/m3',
    declaredUnit: 'm3',
    fireRating: '2-hour',
    fireRatingStandard: 'ASTM E119',
    rValue: '0.10',
    complianceGrade: 'A',
    hasEpd: true,
    hasHpd: false,
    hasGreenguard: false,
    usManufactured: true,
    onRedList: false,
    recycledContentPct: '50.00',
    leadTimeDays: 10,
    dataSource: 'GreenChainz-Seed',
    verified: true,
    astmStandards: 'ASTM C595, ASTM C94, ASTM C1157',
    meetsTitle24: true,
    meetsIecc: true,
    leedCredits: 'MR Credit: Building Product Disclosure and Optimization – Environmental Product Declarations',
    expectedLifecycleYears: 50,
    warrantyYears: 1,
  }).returning({ id: materials.id, name: materials.name });

  console.log(`[Seed] ✅ Sustainable: ${sustainable.name} (ID: ${sustainable.id})`);

  // ── Technical Specs ──────────────────────────────────────────────────────
  console.log('\n[Seed] Inserting technical specs...');

  await db.insert(materialTechnicalSpecs).values({
    materialId: incumbent.id,
    astmCodes: ['ASTM C150', 'ASTM C94', 'ASTM E119'],
    fireRating: '2-hour',
    fireRatingStandard: 'ASTM E119',
    compressiveStrengthPsi: 4000,
    modulusOfElasticityKsi: 3600,
    tensileStrengthPsi: 400,
    rValuePerInch: '0.10',
    thermalUValue: '1.7300',
    weightPerUnit: '145.00',       // pcf
    cureTimeHours: 672,            // 28 days
    laborUnits: '1.00',
    leadTimeDays: 7,
    otifPercentage: '92.00',
    warrantyYears: 1,
    expectedLifespanYears: 50,
    dataSource: 'GreenChainz-Seed',
    dataConfidence: 80,
    lastVerifiedAt: new Date(),
  });

  console.log(`[Seed] ✅ Incumbent specs inserted`);

  await db.insert(materialTechnicalSpecs).values({
    materialId: sustainable.id,
    astmCodes: ['ASTM C595', 'ASTM C94', 'ASTM C1157', 'ASTM E119'],
    fireRating: '2-hour',
    fireRatingStandard: 'ASTM E119',
    compressiveStrengthPsi: 4000,
    modulusOfElasticityKsi: 3500,
    tensileStrengthPsi: 390,
    rValuePerInch: '0.10',
    thermalUValue: '1.7300',
    weightPerUnit: '143.00',
    cureTimeHours: 672,
    laborUnits: '1.00',
    leadTimeDays: 10,
    otifPercentage: '90.00',
    warrantyYears: 1,
    expectedLifespanYears: 50,
    dataSource: 'GreenChainz-Seed',
    dataConfidence: 85,
    lastVerifiedAt: new Date(),
  });

  console.log(`[Seed] ✅ Sustainable specs inserted`);

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  SEED COMPLETE — copy these IDs for your next commands       ║
╠══════════════════════════════════════════════════════════════╣
║  Incumbent material ID  : ${String(incumbent.id).padEnd(34)}║
║  Sustainable material ID: ${String(sustainable.id).padEnd(34)}║
╚══════════════════════════════════════════════════════════════╝

Next step — validate the swap:
  curl -X POST http://localhost:3000/api/trpc/swapValidation.validateMaterialSwap \\
    -H "Content-Type: application/json" \\
    -d '{"json":{"incumbentMaterialId":${incumbent.id},"sustainableMaterialId":${sustainable.id},"saveResult":true}}'
`);

  await pool.end();
}

seed().catch((err) => {
  console.error('[Seed] FAILED:', err);
  process.exit(1);
});
