/**
 * Seed script: upserts all 11 EWS wall assembly records for facade embodied carbon analysis.
 * Run with: tsx scripts/seed-ews-assemblies.ts
 *
 * gwpPer1000sf and carbonTier are always computed via utility — never hardcoded.
 * Safe to re-run (upsert keyed on name).
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
import { materialAssemblySpecs } from '../drizzle/schema';
import { calculateGwpPer1000sf, calculateCarbonTier } from '../lib/utils/carbon-tier';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

interface EwsAssemblyInput {
  name: string;
  epdNumber: string | null;
  gwpA1A3: number;
  gwpDeclaredUnit: string;
  gwpMsfFactor: number;
  assemblyTypeTags: string[];
  framingTypeTags: string[];
  exteriorFinishTags: string[];
  certificationTags: string[];
}

const EWS_ASSEMBLIES: EwsAssemblyInput[] = [
  {
    name: 'EWS-1A Unitized Vision',
    epdNumber: 'SCS-EPD-08787',
    gwpA1A3: 55.7,
    gwpDeclaredUnit: 'm2',
    gwpMsfFactor: 92.903,
    assemblyTypeTags: ['unitized-vision'],
    framingTypeTags: ['unitized-framing'],
    exteriorFinishTags: ['vision-igu-low-e'],
    certificationTags: ['epd-verified'],
  },
  {
    name: 'EWS-1A Unitized Shadowbox',
    epdNumber: 'SCS-EPD-08787',
    gwpA1A3: 55.7,
    gwpDeclaredUnit: 'm2',
    gwpMsfFactor: 92.903,
    assemblyTypeTags: ['unitized-shadowbox'],
    framingTypeTags: ['unitized-framing'],
    exteriorFinishTags: ['vision-igu-low-e'],
    certificationTags: ['epd-verified'],
  },
  {
    name: 'EWS-1A Unitized Spandrel',
    epdNumber: 'SCS-EPD-08787',
    gwpA1A3: 25.4,
    gwpDeclaredUnit: 'm2',
    gwpMsfFactor: 92.903,
    assemblyTypeTags: ['unitized-spandrel'],
    framingTypeTags: ['unitized-framing'],
    exteriorFinishTags: ['spandrel-glass'],
    certificationTags: ['epd-verified'],
  },
  {
    name: 'EWS-1B Unitized Vision Fritted',
    epdNumber: 'SCS-EPD-08787',
    gwpA1A3: 80.0,
    gwpDeclaredUnit: 'm2',
    gwpMsfFactor: 92.903,
    assemblyTypeTags: ['unitized-vision-fritted'],
    framingTypeTags: ['unitized-framing'],
    exteriorFinishTags: ['vision-igu-fritted'],
    certificationTags: ['epd-verified'],
  },
  {
    name: 'EWS-2A Granite Panel - CFMF',
    epdNumber: 'POL-20230131-006',
    gwpA1A3: 39.1,
    gwpDeclaredUnit: 'm2',
    gwpMsfFactor: 92.903,
    assemblyTypeTags: ['stone-panel-granite'],
    framingTypeTags: ['cfmf-studs'],
    exteriorFinishTags: ['granite-veneer'],
    certificationTags: ['epd-verified'],
  },
  {
    name: 'EWS-2B Limestone Panel - CFMF',
    epdNumber: 'CEPMC-Limestone-2020',
    gwpA1A3: 29.2,
    gwpDeclaredUnit: 'm2',
    gwpMsfFactor: 92.903,
    assemblyTypeTags: ['stone-panel-limestone'],
    framingTypeTags: ['cfmf-studs'],
    exteriorFinishTags: ['limestone-veneer'],
    certificationTags: ['epd-verified'],
  },
  {
    name: 'EWS-2B Sandstone Panel - CFMF',
    epdNumber: '4787352986.101.1',
    gwpA1A3: 24.0,
    gwpDeclaredUnit: 'm2',
    gwpMsfFactor: 92.903,
    assemblyTypeTags: ['stone-panel-sandstone'],
    framingTypeTags: ['cfmf-studs'],
    exteriorFinishTags: ['sandstone-veneer'],
    certificationTags: ['epd-verified'],
  },
  {
    name: 'EWS-3A Terracotta Panel - CFMF',
    epdNumber: null,
    gwpA1A3: 111.0,
    gwpDeclaredUnit: 'm2',
    gwpMsfFactor: 92.903,
    assemblyTypeTags: ['stone-panel-terracotta'],
    framingTypeTags: ['cfmf-studs'],
    exteriorFinishTags: ['terracotta-cladding'],
    certificationTags: [],
  },
  {
    name: 'EWS-3B UHPC Panel - CFMF',
    epdNumber: 'EN15804-Ductal',
    gwpA1A3: 14.9,
    gwpDeclaredUnit: 'm2',
    gwpMsfFactor: 92.903,
    assemblyTypeTags: ['uhpc-panel'],
    framingTypeTags: ['cfmf-studs'],
    exteriorFinishTags: ['uhpc-cladding'],
    certificationTags: ['epd-verified'],
  },
  {
    name: 'EWS-3C GFRC Panel - CFMF',
    epdNumber: 'EPD-IES-0016163',
    gwpA1A3: 818.0,
    gwpDeclaredUnit: 'metric_ton',
    gwpMsfFactor: 4.64,
    assemblyTypeTags: ['gfrc-panel'],
    framingTypeTags: ['cfmf-studs'],
    exteriorFinishTags: ['gfrc-cladding'],
    certificationTags: ['epd-verified'],
  },
  {
    name: 'EWS-5 Aluminum Metal Panel - CFMF',
    epdNumber: 'SCS-EPD-10200',
    gwpA1A3: 10.62,
    gwpDeclaredUnit: '100m2',
    gwpMsfFactor: 1000,
    assemblyTypeTags: ['metal-panel-aluminum'],
    framingTypeTags: ['cfmf-studs'],
    exteriorFinishTags: ['aluminum-plate'],
    certificationTags: ['epd-verified'],
  },
];

async function seedEwsAssemblies(): Promise<void> {
  console.log('[Seed] Starting EWS assembly upsert...\n');

  const rows = EWS_ASSEMBLIES.map((assembly) => {
    const gwpPer1000sf = calculateGwpPer1000sf(assembly.gwpA1A3, assembly.gwpMsfFactor);
    const carbonTier = calculateCarbonTier(gwpPer1000sf);
    return {
      name: assembly.name,
      category: 'Exterior Wall System',
      epdNumber: assembly.epdNumber,
      gwpA1A3: String(assembly.gwpA1A3),
      gwpDeclaredUnit: assembly.gwpDeclaredUnit,
      gwpMsfFactor: String(assembly.gwpMsfFactor),
      gwpPer1000sf: String(gwpPer1000sf),
      carbonTier,
      assemblyTypeTags: assembly.assemblyTypeTags,
      framingTypeTags: assembly.framingTypeTags,
      exteriorFinishTags: assembly.exteriorFinishTags,
      certificationTags: assembly.certificationTags,
    };
  });

  await db
    .insert(materialAssemblySpecs)
    .values(rows)
    .onConflictDoUpdate({
      target: materialAssemblySpecs.name,
      set: { updatedAt: new Date() },
    });

  rows.forEach((r) =>
    console.log(`[Seed] ✅ ${r.name} | gwpPer1000sf=${r.gwpPer1000sf} | tier=${r.carbonTier}`)
  );

  console.log(`\n[Seed] Done. Upserted ${EWS_ASSEMBLIES.length} EWS assemblies.`);
}

seedEwsAssemblies()
  .catch((err) => {
    console.error('[Seed] FAILED:', err);
    process.exit(1);
  })
  .finally(() => pool.end());
