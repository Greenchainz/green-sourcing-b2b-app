/**
 * Materials Seed Service
 *
 * Populates the materials table from EC3 (Building Transparency) for the
 * key construction material categories GreenChainz targets.
 *
 * Called from:
 *   - POST /api/admin/seed-materials  (manual trigger, admin only)
 *   - azure-functions/scraper-timer   (daily at 2 AM UTC)
 *
 * Strategy:
 *   1. Fetch EPDs from EC3 for each priority category
 *   2. Transform to GreenChainz materials schema
 *   3. Upsert (insert new, update existing by ec3Id)
 *   4. Return a summary of what was created/updated
 */

import { getDb } from "./db";
import { materials } from "../drizzle/schema";
import { eq, inArray } from "drizzle-orm";
import { fetchEC3EPDs, type EC3EPD } from "./ec3";
import { transformEC3Batch } from "./ec3-transform";

/**
 * EC3 category names — matched to EC3 API category filter values.
 * Ordered by AEC market volume. Covers ~95% of GreenChainz target materials.
 *
 * CSI MasterFormat alignment:
 *   03xxxx → Concrete, Rebar, Fly Ash/Slag
 *   05xxxx → Steel, Rebar, Aluminum
 *   06xxxx → Wood (CLT, Glulam, LVL, Dimensional)
 *   07xxxx → Insulation, Roofing, Air Barriers
 *   08xxxx → Glass, Glazing
 *   09xxxx → Gypsum Board, Flooring, Ceilings, Paint
 *   04xxxx → Masonry (CMU, Brick)
 */
const SEED_CATEGORIES: Array<{ name: string; ec3Category: string }> = [
  // High-volume structural
  { name: "Ready-Mix Concrete",        ec3Category: "ReadyMix" },
  { name: "Precast Concrete",           ec3Category: "PrecastConcrete" },
  { name: "Structural Steel",           ec3Category: "StructuralSteel" },
  { name: "Rebar",                      ec3Category: "Rebar" },
  { name: "Cold-Formed Steel",          ec3Category: "ColdFormedSteel" },
  // Wood / mass timber
  { name: "Dimensional Lumber",         ec3Category: "DimensionalLumber" },
  { name: "Cross-Laminated Timber",     ec3Category: "Clt" },
  { name: "Glulam",                     ec3Category: "Glulam" },
  { name: "LVL / Structural Composite", ec3Category: "StructuralCompositeProducts" },
  // Envelope & insulation
  { name: "Mineral Wool Insulation",    ec3Category: "MineralWool" },
  { name: "Fiberglass Insulation",      ec3Category: "FiberglassInsulation" },
  { name: "Rigid Foam Insulation",      ec3Category: "RigidFoam" },
  { name: "Roofing Membranes",          ec3Category: "RoofingMembrane" },
  // Masonry / façade
  { name: "Concrete Masonry Units",     ec3Category: "ConcreteMasonryUnits" },
  { name: "Brick",                      ec3Category: "Brick" },
  { name: "Flat Glass / Glazing",       ec3Category: "FlatGlass" },
  { name: "Aluminum Extrusions",        ec3Category: "AluminumExtrusions" },
  // Interior finishes
  { name: "Gypsum Board",               ec3Category: "GypsumBoard" },
  { name: "Flooring",                   ec3Category: "Flooring" },
  { name: "Acoustical Ceiling Tiles",   ec3Category: "AcousticalCeilingTiles" },
  // Supplementary cementitious
  { name: "Fly Ash",                    ec3Category: "FlyAsh" },
  { name: "Slag Cement",                ec3Category: "SlagCement" },
  { name: "Silica Fume",                ec3Category: "SilicaFume" },
];

const EPDS_PER_PAGE = 100;  // EC3 max page size
const MAX_PAGES     = 5;    // Cap at 500 EPDs per category to avoid runaway jobs

export interface SeedResult {
  success: boolean;
  totalFetched: number;
  created: number;
  updated: number;
  errors: string[];
  categoriesProcessed: string[];
}

/**
 * Paginate through all EPDs for a given EC3 category.
 * Stops when EC3 returns no results, returns null `next`, or we hit MAX_PAGES.
 */
async function fetchAllEPDsForCategory(ec3Category: string): Promise<EC3EPD[]> {
  const all: EC3EPD[] = [];

  for (let page = 1; page <= MAX_PAGES; page++) {
    // fetchEC3EPDs appends page_size + optional offset/page param