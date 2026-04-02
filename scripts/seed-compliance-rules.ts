/**
 * Seed script: inserts IBC-based building compliance rules for all 50 US states.
 * Run with: tsx scripts/seed-compliance-rules.ts
 *
 * Safe to re-run — skips if rows already exist for a state.
 * Pass --force to wipe and re-seed: tsx scripts/seed-compliance-rules.ts --force
 */

import { config } from "dotenv";
import { existsSync } from "fs";

if (existsSync(".env.local")) {
  config({ path: ".env.local", override: true });
} else {
  config();
}

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq, sql } from "drizzle-orm";
import { complianceRules } from "../drizzle/schema";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL is not set");
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl:
    DATABASE_URL.includes("azure") ||
    DATABASE_URL.includes("postgres.database.azure.com")
      ? { rejectUnauthorized: false }
      : false,
});
const db = drizzle(pool);

// ─── Types ────────────────────────────────────────────────────────────────────

type SeedRule = {
  state: string;
  buildingCode: string;
  ruleName: string;
  ruleDescription: string;
  appliesToMaterials: string[];
  complianceType: string;
  complianceValue: string;
};

// ─── Seed Data ────────────────────────────────────────────────────────────────
// Each state gets 3 rules:
//   1. Energy code (IECC adoption year)
//   2. Fire resistance requirement for structural materials
//   3. Sustainable/green building requirement or EPD preference

const RULES: SeedRule[] = [
  // Alabama
  { state: "AL", buildingCode: "IBC 2021", ruleName: "Energy Code", ruleDescription: "Alabama adopted IECC 2021. Minimum R-38 attic insulation, R-20 wall insulation required for commercial construction.", appliesToMaterials: ["insulation", "roofing", "wall panels"], complianceType: "R_VALUE_MIN", complianceValue: "38" },
  { state: "AL", buildingCode: "IBC 2021", ruleName: "Fire Resistance - Structural", ruleDescription: "Type I and II construction requires 2-hour fire resistance rating for primary structural frame members.", appliesToMaterials: ["steel", "concrete", "mass timber"], complianceType: "FIRE_RATING_HOURS", complianceValue: "2" },
  { state: "AL", buildingCode: "IBC 2021", ruleName: "EPD Recommendation", ruleDescription: "State incentive programs encourage EPD-certified materials for publicly funded projects over $5M.", appliesToMaterials: ["concrete", "steel", "aluminum", "glass"], complianceType: "EPD_PREFERRED", complianceValue: "true" },

  // Alaska
  { state: "AK", buildingCode: "IBC 2018", ruleName: "Energy Code - Extreme Climate", ruleDescription: "Alaska Climate Zone 7-8: R-60 attic insulation, R-30 wall insulation required. Triple-pane glazing for all commercial openings.", appliesToMaterials: ["insulation", "glazing", "roofing"], complianceType: "R_VALUE_MIN", complianceValue: "60" },
  { state: "AK", buildingCode: "IBC 2018", ruleName: "Fire Resistance - Structural", ruleDescription: "2-hour fire resistance rating required for primary structural frame in Type I construction.", appliesToMaterials: ["steel", "concrete", "mass timber"], complianceType: "FIRE_RATING_HOURS", complianceValue: "2" },
  { state: "AK", buildingCode: "IBC 2018", ruleName: "Seismic Zone D", ruleDescription: "High seismic zone: structural materials must meet ASCE 7 seismic design requirements. Ductile steel and reinforced concrete preferred.", appliesToMaterials: ["steel", "concrete", "masonry"], complianceType: "SEISMIC_DESIGN_CATEGORY", complianceValue: "D" },

  // Arizona
  { state: "AZ", buildingCode: "IBC 2018", ruleName: "Energy Code - Hot Dry Climate", ruleDescription: "Arizona Climate Zone 2-3: R-30 roof insulation, cool roof reflectance ≥ 0.65 for commercial buildings.", appliesToMaterials: ["insulation", "roofing"], complianceType: "ROOF_REFLECTANCE_MIN", complianceValue: "0.65" },
  { state: "AZ", buildingCode: "IBC 2018", ruleName: "Fire Resistance - Structural", ruleDescription: "2-hour fire resistance rating for primary structural frame. WUI areas require Class A roofing.", appliesToMaterials: ["steel", "concrete", "mass timber", "roofing"], complianceType: "FIRE_RATING_HOURS", complianceValue: "2" },
  { state: "AZ", buildingCode: "IBC 2018", ruleName: "EPD Recommendation", ruleDescription: "Phoenix and Tucson adopt voluntary green building standards encouraging EPD-certified materials.", appliesToMaterials: ["concrete", "steel", "insulation"], complianceType: "EPD_PREFERRED", complianceValue: "true" },

  // Arkansas
  { state: "AR", buildingCode: "IBC 2018", ruleName: "Energy Code", ruleDescription: "Arkansas Climate Zone 3: R-38 attic insulation, R-15 continuous wall insulation for commercial construction.", appliesToMaterials: ["insulation", "wall panels"], complianceType: "R_VALUE_MIN", complianceValue: "38" },
  { state: "AR", buildingCode: "IBC 2018", ruleName: "Fire Resistance - Structural", ruleDescription: "2-hour fire resistance rating required for primary structural frame in Type I and II construction.", appliesToMaterials: ["steel", "concrete", "mass timber"], complianceType: "FIRE_RATING_HOURS", complianceValue: "2" },
  { state: "AR", buildingCode: "IBC 2018", ruleName: "Tornado Wind Zone", ruleDescription: "High wind zone: structural connections and cladding must meet 115 mph ultimate design wind speed per ASCE 7.", appliesToMaterials: ["steel", "masonry", "cladding", "roofing"], complianceType: "WIND_SPEED_MIN_MPH", complianceValue: "115" },

  // California
  { state: "CA", buildingCode: "CBC 2022 / Title 24", ruleName: "Energy Code - Title 24", ruleDescription: "California Title 24 Part 6: All-electric ready buildings required. R-38 roof, R-20 wall minimum. Solar-ready rooftop provisions mandatory.", appliesToMaterials: ["insulation", "roofing", "glazing"], complianceType: "R_VALUE_MIN", complianceValue: "38" },
  { state: "CA", buildingCode: "CBC 2022 / Title 24", ruleName: "Fire Resistance - WUI", ruleDescription: "Wildland-Urban Interface: Class A roofing mandatory. Exterior wall assemblies must achieve 1-hour fire resistance or use non-combustible materials.", appliesToMaterials: ["roofing", "cladding", "wall panels", "wood"], complianceType: "FIRE_RATING_HOURS", complianceValue: "1" },
  { state: "CA", buildingCode: "CBC 2022 / Title 24", ruleName: "Buy Clean California - EPD Required", ruleDescription: "Buy Clean California Act: EPDs required for structural steel, rebar, flat glass, and mineral wool board insulation on state-funded projects.", appliesToMaterials: ["steel", "rebar", "glass", "mineral wool insulation"], complianceType: "EPD_REQUIRED", complianceValue: "true" },

  // Colorado
  { state: "CO", buildingCode: "IBC 2021", ruleName: "Energy Code", ruleDescription: "Colorado Climate Zone 5-6: R-49 attic insulation, R-20 continuous wall insulation required for commercial construction.", appliesToMaterials: ["insulation", "roofing", "wall panels"], complianceType: "R_VALUE_MIN", complianceValue: "49" },
  { state: "CO", buildingCode: "IBC 2021", ruleName: "Fire Resistance - WUI", ruleDescription: "Mountain WUI communities require Class A roofing and non-combustible or 1-hour fire-rated exterior wall assemblies.", appliesToMaterials: ["roofing", "cladding", "wood", "wall panels"], complianceType: "FIRE_RATING_HOURS", complianceValue: "1" },
  { state: "CO", buildingCode: "IBC 2021", ruleName: "EPD Recommendation", ruleDescription: "Colorado Energy Office incentivizes EPD-certified materials in state-funded construction projects.", appliesToMaterials: ["concrete", "steel", "insulation", "mass timber"], complianceType: "EPD_PREFERRED", complianceValue: "true" },

  // Connecticut
  { state: "CT", buildingCode: "IBC 2021", ruleName: "Energy Code", ruleDescription: "Connecticut Climate Zone 5: R-49 attic insulation, R-20 wall insulation, U-0.40 maximum fenestration.", appliesToMaterials: ["insulation", "glazing", "roofing"], complianceType: "R_VALUE_MIN", complianceValue: "49" },
  { state: "CT", buildingCode: "IBC 2021", ruleName: "Fire Resistance - Structural", ruleDescription: "2-hour fire resistance rating required for primary structural frame in Type I construction.", appliesToMaterials: ["steel", "concrete", "mass timber"], complianceType: "FIRE_RATING_HOURS", complianceValue: "2" },
  { state: "CT", buildingCode: "IBC 2021", ruleName: "EPD Recommendation", ruleDescription: "Connecticut Green Building Council promotes EPD-certified materials for commercial construction.", appliesToMaterials: ["concrete", "steel", "insulation"], complianceType: "EPD_PREFERRED", complianceValue: "true" },

  // Delaware
  { state: "DE", buildingCode: "IBC 2021", ruleName: "Energy Code", ruleDescription: "Delaware Climate Zone 4: R-38 attic insulation, R-13+R-5 ci wall insulation for commercial construction.", appliesToMaterials: ["insulation", "roofing"], complianceType: "R_VALUE_MIN", complianceValue: "38" },
  { state: "DE", buildingCode: "IBC 2021", ruleName: "Fire Resistance - Structural", ruleDescription: "2-hour fire resistance rating for primary structural frame in Type I and II construction.", appliesToMaterials: ["steel", "concrete", "mass timber"], complianceType: "FIRE_RATING_HOURS", complianceValue: "2" },
  { state: "DE", buildingCode: "IBC 2021", ruleName: "Coastal Wind Zone", ruleDescription: "Coastal construction: 130 mph ultimate design wind speed per ASCE 7. Impact-resistant glazing required.", appliesToMaterials: ["glazing", "cladding", "roofing"], complianceType: "WIND_SPEED_MIN_MPH", complianceValue: "130" },

  // Florida
  { state: "FL", buildingCode: "FBC 7th Ed 2020", ruleName: "Energy Code - Hot Humid", ruleDescription: "Florida Climate Zone 1-2: R-30 roof insulation, cool roof reflectance ≥ 0.65. High-performance glazing with SHGC ≤ 0.25.", appliesToMaterials: ["insulation", "roofing", "glazing"], complianceType: "ROOF_REFLECTANCE_MIN", complianceValue: "0.65" },
  { state: "FL", buildingCode: "FBC 7th Ed 2020", ruleName: "Hurricane Wind Zone", ruleDescription: "High-velocity hurricane zone: 170+ mph ultimate design wind speed. Impact-resistant glazing and roofing fasteners required.", appliesToMaterials: ["glazing", "roofing", "cladding", "structural connectors"], complianceType: "WIND_SPEED_MIN_MPH", complianceValue: "170" },
  { state: "FL", buildingCode: "FBC 7th Ed 2020", ruleName: "Fire Resistance - Structural", ruleDescription: "2-hour fire resistance rating for primary structural frame in Type I construction. Spray fireproofing must be UL-listed.", appliesToMaterials: ["steel", "concrete", "fireproofing"], complianceType: "FIRE_RATING_HOURS", complianceValue: "2" },

  // Georgia
  { state: "GA", buildingCode: "IBC 2018", ruleName: "Energy Code", ruleDescription: "Georgia Climate Zone 2-4: R-38 roof insulation, R-13+R-3.8ci wall insulation required for commercial construction.", appliesToMaterials: ["insulation", "roofing", "wall panels"], complianceType: "R_VALUE_MIN", complianceValue: "38" },
  { state: "GA", buildingCode: "IBC 2018", ruleName: "Fire Resistance - Structural", ruleDescription: "2-hour fire resistance rating required for primary structural frame in Type I and II construction.", appliesToMaterials: ["steel", "concrete", "mass timber"], complianceType: "FIRE_RATING_HOURS", complianceValue: "2" },
  { state: "GA", buildingCode: "IBC 2018", ruleName: "EPD Recommendation", ruleDescription: "Atlanta sustainability ordinance encourages EPD-certified materials for commercial projects over $10M.", appliesToMaterials: ["concrete", "steel", "glass"], complianceType: "EPD_PREFERRED", complianceValue: "true" },

  // Hawaii
  { state: "HI", buildingCode: "IBC 2018", ruleName: "Energy Code - Tropical", ruleDescription: "Hawaii Climate Zone 1: Cool roof reflectance ≥ 0.70 required. Natural ventilation strategies preferred over mechanical cooling.", appliesToMaterials: ["roofing", "cladding", "glazing"], complianceType: "ROOF_REFLECTANCE_MIN", complianceValue: "0.70" },
  { state: "HI", buildingCode: "IBC 2018", ruleName: "Hurricane/Seismic Zone", ruleDescription: "Hawaii is in both high wind (130 mph) and Seismic Zone D. Structural materials must meet dual ASCE 7 requirements.", appliesToMaterials: ["steel", "concrete", "masonry", "roofing"], complianceType: "WIND_SPEED_MIN_MPH", complianceValue: "130" },
  { state: "HI", buildingCode: "IBC 2018", ruleName: "Green Building - EPD", ruleDescription: "Hawaii Green Infrastructure mandate: EPD-certified materials required for state-funded projects over $2M.", appliesToMaterials: ["concrete", "steel", "insulation", "glass"], complianceType: "EPD_REQUIRED", complianceValue: "true" },

  // Idaho
  { state: "ID", buildingCode: "IBC 2018", ruleName: "Energy Code", ruleDescription: "Idaho Climate Zone 5-6: R-49 attic insulation, R-20 wall insulation required for commercial construction.", appliesToMaterials: ["insulation", "roofing"], complianceType: "R_VALUE_MIN", complianceValue: "49" },
  { state: "ID", buildingCode: "IBC 2018", ruleName: "Fire Resistance - WUI", ruleDescription: "WUI areas require Class A roofing and 1-hour exterior wall fire resistance.", appliesToMaterials: ["roofing", "cladding", "wood"], complianceType: "FIRE_RATING_HOURS", complianceValue: "1" },
  { state: "ID", buildingCode: "IBC 2018", ruleName: "Seismic Zone C", ruleDescription: "Moderate seismic zone: structural materials must meet ASCE 7 Seismic Design Category C.", appliesToMaterials: ["steel", "concrete", "masonry"], complianceType: "SEISMIC_DESIGN_CATEGORY", complianceValue: "C" },

  // Illinois
  { state: "IL", buildingCode: "IBC 2021", ruleName: "Energy Code", ruleDescription: "Illinois Climate Zone 5: R-49 attic, R-20 wall insulation. Chicago Energy Transformation Code adds solar-ready requirements.", appliesToMaterials: ["insulation", "roofing", "glazing"], complianceType: "R_VALUE_MIN", complianceValue: "49" },
  { state: "IL", buildingCode: "IBC 2021", ruleName: "Fire Resistance - Structural", ruleDescription: "2-hour fire resistance rating for primary structural frame. Chicago requires 3-hour rating for buildings >6 stories.", appliesToMaterials: ["steel", "concrete", "mass timber"], complianceType: "FIRE_RATING_HOURS", complianceValue: "2" },
  { state: "IL", buildingCode: "IBC 2021", ruleName: "Chicago EPD Ordinance", ruleDescription: "Chicago Green Building Ordinance requires EPD-certified materials for city-funded projects. LEED certification encouraged.", appliesToMaterials: ["concrete", "steel", "glass", "insulation"], complianceType: "EPD_REQUIRED", complianceValue: "true" },

  // Indiana
  { state: "IN", buildingCode: "IBC 2021", ruleName: "Energy Code", ruleDescription: "Indiana Climate Zone 5: R-49 attic, R-20 wall insulation for commercial construction.", appliesToMaterials: ["insulation", "roofing"], complianceType: "R_VALUE_MIN", complianceValue: "49" },
  { state: "IN", buildingCode: "IBC 2021", ruleName: "Fire Resistance - Structural", ruleDescription: "2-hour fire resistance rating for primary structural frame in Type I and II construction.", appliesToMaterials: ["steel", "concrete", "mass timber"], complianceType: "FIRE_RATING_HOURS", complianceValue: "2" },
  { state: "IN", buildingCode: "IBC 2021", ruleName: "Tornado Wind Zone", ruleDescription: "Tornado-prone area: structural connections and roof-to-wall ties must meet 115 mph ultimate wind speed.", appliesToMaterials: ["steel", "roofing", "structural connectors"], complianceType: "WIND_SPEED_MIN_MPH", complianceValue: "115" },

  // Iowa
  { state: "IA", buildingCode: "IBC 2021", ruleName: "Energy Code", ruleDescription: "Iowa Climate Zone 6: R-49 attic, R-20+R-5 ci wall insulation required for commercial construction.", appliesToMaterials: ["insulation", "roofing", "wall panels"], complianceType: "R_VALUE_MIN", complianceValue: "49" },
  { state: "IA", buildingCode: "IBC 2021", ruleName: "Fire Resistance - Structural", ruleDescription: "2-hour fire resistance rating required for primary structural frame in Type I construction.", appliesToMaterials: ["steel", "concrete", "mass timber"], complianceType: "FIRE_RATING_HOURS", complianceValue: "2" },
  { state: "IA", buildingCode: "IBC 2021", ruleName: "EPD Recommendation", ruleDescription: "Iowa DNR supports EPD-certified materials for commercial construction through green building incentives.", appliesToMaterials: ["concrete", "steel", "insulation"], complianceType: "EPD_PREFERRED", complianceValue: "true" },

  // Kansas
  { state: "KS", buildingCode: "IBC 2018", ruleName: "Energy Code", ruleDescription: "Kansas Climate Zone 4-5: R-38 attic, R-15 wall insulation for commercial construction.", appliesToMaterials: ["insulation", "roofing"], complianceType: "R_VALUE_MIN", complianceValue: "38" },
  { state: "KS", buildingCode: "IBC 2018", ruleName: "Fire Resistance - Structural", ruleDescription: "2-hour fire resistance rating required for primary structural frame in Type I and II construction.", appliesToMaterials: ["steel", "concrete", "mass timber"], complianceType: "FIRE_RATING_HOURS", complianceValue: "2" },
  { state: "KS", buildingCode: "IBC 2018", ruleName: "Tornado Wind Zone", ruleDescription: "Tornado Alley: structural systems and connections must meet 130 mph ultimate design wind speed.", appliesToMaterials: ["steel", "masonry", "roofing", "cladding"], complianceType: "WIND_SPEED_MIN_MPH", complianceValue: "130" },

  // Kentucky
  { state: "KY", buildingCode: "IBC 2018", ruleName: "Energy Code", ruleDescription: "Kentucky Climate Zone 4: R-38 attic, R-13+R-3.8ci wall insulation for commercial construction.", appliesToMaterials: ["insulation", "roofing"], complianceType: "R_VALUE_MIN", complianceValue: "38" },
  { state: "KY", buildingCode: "IBC 2018", ruleName: "Fire Resistance - Structural", ruleDescription: "2-hour fire resistance rating for primary structural frame in Type I and II construction.", appliesToMaterials: ["steel", "concrete", "mass timber"], complianceType: "FIRE_RATING_HOURS", complianceValue: "2" },
  { state: "KY", buildingCode: "IBC 2018", ruleName: "EPD Recommendation", ruleDescription: "Kentucky sustainability programs encourage EPD-certified materials for state construction projects.", appliesToMaterials: ["concrete", "steel", "insulation"], complianceType: "EPD_PREFERRED", complianceValue: "true" },

  // Louisiana
  { state: "LA", buildingCode: "IBC 2021", ruleName: "Energy Code - Hot Humid", ruleDescription: "Louisiana Climate Zone 2: R-30 roof insulation, cool roof reflectance ≥ 0.65, SHGC ≤ 0.25 for glazing.", appliesToMaterials: ["insulation", "roofing", "glazing"], complianceType: "ROOF_REFLECTANCE_MIN", complianceValue: "0.65" },
  { state: "LA", buildingCode: "IBC 2021", ruleName: "Hurricane Wind Zone", ruleDescription: "Gulf Coast: 150 mph ultimate design wind speed. Impact-rated glazing and roofing fasteners required in coastal parishes.", appliesToMaterials: ["glazing", "roofing", "cladding"], complianceType: "WIND_SPEED_MIN_MPH", complianceValue: "150" },
  { state: "LA", buildingCode: "IBC 2021", ruleName: "Fire Resistance - Structural", ruleDescription: "2-hour fire resistance rating for primary structural frame in Type I and II construction.", appliesToMaterials: ["steel", "concrete", "mass timber"], complianceType: "FIRE_RATING_HOURS", complianceValue: "2" },

  // Maine
  { state: "ME", buildingCode: "IBC 2021", ruleName: "Energy Code", ruleDescription: "Maine Climate Zone 6: R-60 attic, R-20+R-5ci wall insulation required. Triple-pane glazing encouraged.", appliesToMaterials: ["insulation", "roofing", "glazing"], complianceType: "R_VALUE_MIN", complianceValue: "60" },
  { state: "ME", buildingCode: "IBC 2021", ruleName: "Fire Resistance - Structural", ruleDescription: "2-hour fire resistance rating for primary structural frame in Type I construction.", appliesToMaterials: ["steel", "concrete", "mass timber"], complianceType: "FIRE_RATING_HOURS", complianceValue: "2" },
  { state: "ME", buildingCode: "IBC 2021", ruleName: "EPD Recommendation - Timber", ruleDescription: "Maine Forest Products Council promotes FSC-certified mass timber; EPD-certified wood preferred for state projects.", appliesToMaterials: ["mass timber", "wood", "CLT"], complianceType: "EPD_PREFERRED", complianceValue: "true" },

  // Maryland
  { state: "MD", buildingCode: "IBC 2021", ruleName: "Energy Code", ruleDescription: "Maryland Climate Zone 4-5: R-49 attic, R-20 wall insulation. EmPOWER Maryland requires energy performance benchmarking.", appliesToMaterials: ["insulation", "roofing", "glazing"], complianceType: "R_VALUE_MIN", complianceValue: "49" },
  { state: "MD", buildingCode: "IBC 2021", ruleName: "Fire Resistance - Structural", ruleDescription: "2-hour fire resistance rating required for primary structural frame in Type I and II construction.", appliesToMaterials: ["steel", "concrete", "mass timber"], complianceType: "FIRE_RATING_HOURS", complianceValue: "2" },
  { state: "MD", buildingCode: "IBC 2021", ruleName: "EPD Requirement - State Projects", ruleDescription: "Maryland Green Building Council requires EPD-certified materials for all state agency construction projects.", appliesToMaterials: ["concrete", "steel", "glass", "insulation"], complianceType: "EPD_REQUIRED", complianceValue: "true" },

  // Massachusetts
  { state: "MA", buildingCode: "IBC 2021 / STRETCH", ruleName: "Energy Code - Stretch Code", ruleDescription: "Massachusetts Stretch Code (Climate Zone 5-6): R-60 attic, Passive House–level air tightness. All-electric ready required.", appliesToMaterials: ["insulation", "roofing", "air barrier", "glazing"], complianceType: "R_VALUE_MIN", complianceValue: "60" },
  { state: "MA", buildingCode: "IBC 2021 / STRETCH", ruleName: "Fire Resistance - Structural", ruleDescription: "2-hour fire resistance for Type I structural frame. Boston requires fire-rated assemblies per NFPA 13 full suppression.", appliesToMaterials: ["steel", "concrete", "mass timber"], complianceType: "FIRE_RATING_HOURS", complianceValue: "2" },
  { state: "MA", buildingCode: "IBC 2021 / STRETCH", ruleName: "EPD Required - MA Clean Energy", ruleDescription: "Massachusetts Clean Energy Center requires EPD documentation for structural materials on incentivized projects.", appliesToMaterials: ["concrete", "steel", "insulation", "mass timber"], complianceType: "EPD_REQUIRED", complianceValue: "true" },

  // Michigan
  { state: "MI", buildingCode: "IBC 2021", ruleName: "Energy Code", ruleDescription: "Michigan Climate Zone 5-6: R-49 attic, R-20 wall insulation for commercial construction.", appliesToMaterials: ["insulation", "roofing", "wall panels"], complianceType: "R_VALUE_MIN", complianceValue: "49" },
  { state: "MI", buildingCode: "IBC 2021", ruleName: "Fire Resistance - Structural", ruleDescription: "2-hour fire resistance rating for primary structural frame in Type I and II construction.", appliesToMaterials: ["steel", "concrete", "mass timber"], complianceType: "FIRE_RATING_HOURS", complianceValue: "2" },
  { state: "MI", buildingCode: "IBC 2021", ruleName: "EPD Recommendation", ruleDescription: "Michigan Saves green building program incentivizes EPD-certified materials for commercial construction.", appliesToMaterials: ["concrete", "steel", "insulation"], complianceType: "EPD_PREFERRED", complianceValue: "true" },

  // Minnesota
  { state: "MN", buildingCode: "IBC 2020 MN", ruleName: "Energy Code", ruleDescription: "Minnesota Climate Zone 6-7: R-60 attic, R-20+R-5ci wall insulation. Commercial buildings must meet 2021 IECC + Minnesota amendments.", appliesToMaterials: ["insulation", "roofing", "glazing"], complianceType: "R_VALUE_MIN", complianceValue: "60" },
  { state: "MN", buildingCode: "IBC 2020 MN", ruleName: "Fire Resistance - Structural", ruleDescription: "2-hour fire resistance rating required for primary structural frame in Type I and II construction.", appliesToMaterials: ["steel", "concrete", "mass timber"], complianceType: "FIRE_RATING_HOURS", complianceValue: "2" },
  { state: "MN", buildingCode: "IBC 2020 MN", ruleName: "B3 Guidelines - EPD Required", ruleDescription: "Minnesota B3 Sustainable Building 2030 standard: EPD-certified materials required for state-funded projects.", appliesToMaterials: ["concrete", "steel", "glass", "insulation", "mass timber"], complianceType: "EPD_REQUIRED", complianceValue: "true" },

  // Mississippi
  { state: "MS", buildingCode: "IBC 2018", ruleName: "Energy Code", ruleDescription: "Mississippi Climate Zone 2-3: R-30 roof insulation, cool roof reflectance ≥ 0.65 encouraged.", appliesToMaterials: ["insulation", "roofing"], complianceType: "R_VALUE_MIN", complianceValue: "30" },
  { state: "MS", buildingCode: "IBC 2018", ruleName: "Fire Resistance - Structural", ruleDescription: "2-hour fire resistance rating required for primary structural frame in Type I construction.", appliesToMaterials: ["steel", "concrete", "mass timber"], complianceType: "FIRE_RATING_HOURS", complianceValue: "2" },
  { state: "MS", buildingCode: "IBC 2018", ruleName: "Tornado Wind Zone", ruleDescription: "Tornado-prone area: structural connections must meet 115 mph ultimate design wind speed per ASCE 7.", appliesToMaterials: ["steel", "masonry", "roofing"], complianceType: "WIND_SPEED_MIN_MPH", complianceValue: "115" },

  // Missouri
  { state: "MO", buildingCode: "IBC 2018", ruleName: "Energy Code", ruleDescription: "Missouri Climate Zone 4-5: R-38 attic, R-15 wall insulation for commercial construction.", appliesToMaterials: ["insulation", "roofing"], complianceType: "R_VALUE_MIN", complianceValue: "38" },
  { state: "MO", buildingCode: "IBC 2018", ruleName: "Fire Resistance - Structural", ruleDescription: "2-hour fire resistance rating for primary structural frame in Type I and II construction.", appliesToMaterials: ["steel", "concrete", "mass timber"], complianceType: "FIRE_RATING_HOURS", complianceValue: "2" },
  { state: "MO", buildingCode: "IBC 2018", ruleName: "Tornado Wind Zone", ruleDescription: "Missouri is in a high-frequency tornado zone: 130 mph ultimate design wind speed for structural connections.", appliesToMaterials: ["steel", "masonry", "roofing", "cladding"], complianceType: "WIND_SPEED_MIN_MPH", complianceValue: "130" },

  // Montana
  { state: "MT", buildingCode: "IBC 2021", ruleName: "Energy Code", ruleDescription: "Montana Climate Zone 6: R-49 attic, R-20 wall insulation for commercial construction.", appliesToMaterials: ["insulation", "roofing"], complianceType: "R_VALUE_MIN", complianceValue: "49" },
  { state: "MT", buildingCode: "IBC 2021", ruleName: "Fire Resistance - WUI", ruleDescription: "WUI communities require Class A roofing, 1-hour exterior wall fire resistance rating.", appliesToMaterials: ["roofing", "cladding", "wood", "mass timber"], complianceType: "FIRE_RATING_HOURS", complianceValue: "1" },
  { state: "MT", buildingCode: "IBC 2021", ruleName: "EPD Recommendation", ruleDescription: "Montana promotes sustainable construction with EPD-certified materials encouraged for state facilities.", appliesToMaterials: ["concrete", "steel", "insulation", "mass timber"], complianceType: "EPD_PREFERRED", complianceValue: "true" },

  // Nebraska
  { state: "NE", buildingCode: "IBC 2018", ruleName: "Energy Code", ruleDescription: "Nebraska Climate Zone 5: R-49 attic, R-20 wall insulation for commercial construction.", appliesToMaterials: ["insulation", "roofing"], complianceType: "R_VALUE_MIN", complianceValue: "49" },
  { state: "NE", buildingCode: "IBC 2018", ruleName: "Fire Resistance - Structural", ruleDescription: "2-hour fire resistance rating for primary structural frame in Type I and II construction.", appliesToMaterials: ["steel", "concrete", "mass timber"], complianceType: "FIRE_RATING_HOURS", complianceValue: "2" },
  { state: "NE", buildingCode: "IBC 2018", ruleName: "Tornado Wind Zone", ruleDescription: "Nebraska Tornado Alley: 130 mph ultimate design wind speed required for all structural connections.", appliesToMaterials: ["steel", "masonry", "roofing", "structural connectors"], complianceType: "WIND_SPEED_MIN_MPH", complianceValue: "130" },

  // Nevada
  { state: "NV", buildingCode: "IBC 2018", ruleName: "Energy Code - Desert", ruleDescription: "Nevada Climate Zone 3-5: R-30 roof insulation, cool roof reflectance ≥ 0.65 in Climate Zone 3. Low-e glazing required.", appliesToMaterials: ["insulation", "roofing", "glazing"], complianceType: "ROOF_REFLECTANCE_MIN", complianceValue: "0.65" },
  { state: "NV", buildingCode: "IBC 2018", ruleName: "Fire Resistance - Structural", ruleDescription: "2-hour fire resistance rating for primary structural frame in Type I construction.", appliesToMaterials: ["steel", "concrete", "mass timber"], complianceType: "FIRE_RATING_HOURS", complianceValue: "2" },
  { state: "NV", buildingCode: "IBC 2018", ruleName: "EPD Recommendation", ruleDescription: "Nevada Green Building Program encourages EPD-certified materials for Las Vegas and Reno commercial projects.", appliesToMaterials: ["concrete", "steel", "insulation"], complianceType: "EPD_PREFERRED", complianceValue: "true" },

  // New Hampshire
  { state: "NH", buildingCode: "IBC 2021", ruleName: "Energy Code", ruleDescription: "New Hampshire Climate Zone 6: R-60 attic, R-20+R-5ci wall insulation for commercial construction.", appliesToMaterials: ["insulation", "roofing", "glazing"], complianceType: "R_VALUE_MIN", complianceValue: "60" },
  { state: "NH", buildingCode: "IBC 2021", ruleName: "Fire Resistance - Structural", ruleDescription: "2-hour fire resistance rating for primary structural frame in Type I and II construction.", appliesToMaterials: ["steel", "concrete", "mass timber"], complianceType: "FIRE_RATING_HOURS", complianceValue: "2" },
  { state: "NH", buildingCode: "IBC 2021", ruleName: "EPD Recommendation", ruleDescription: "NH DES green building guidance recommends EPD-certified materials for state construction projects.", appliesToMaterials: ["concrete", "steel", "insulation"], complianceType: "EPD_PREFERRED", complianceValue: "true" },

  // New Jersey
  { state: "NJ", buildingCode: "IBC 2021 / NJUCC", ruleName: "Energy Code", ruleDescription: "New Jersey Climate Zone 4-5: R-49 attic, R-20 wall insulation. NJ Uniform Construction Code energy subcode applies.", appliesToMaterials: ["insulation", "roofing", "glazing"], complianceType: "R_VALUE_MIN", complianceValue: "49" },
  { state: "NJ", buildingCode: "IBC 2021 / NJUCC", ruleName: "Fire Resistance - Structural", ruleDescription: "2-hour fire resistance for Type I structural frame. Dense urban areas: NFPA 13 full suppression required.", appliesToMaterials: ["steel", "concrete", "mass timber"], complianceType: "FIRE_RATING_HOURS", complianceValue: "2" },
  { state: "NJ", buildingCode: "IBC 2021 / NJUCC", ruleName: "EPD Requirement", ruleDescription: "NJ Economic Development Authority green building requirements include EPD documentation for materials on incentivized projects.", appliesToMaterials: ["concrete", "steel", "glass", "insulation"], complianceType: "EPD_REQUIRED", complianceValue: "true" },

  // New Mexico
  { state: "NM", buildingCode: "IBC 2018", ruleName: "Energy Code", ruleDescription: "New Mexico Climate Zone 3-5: R-38 roof, R-15 wall insulation for commercial construction.", appliesToMaterials: ["insulation", "roofing"], complianceType: "R_VALUE_MIN", complianceValue: "38" },
  { state: "NM", buildingCode: "IBC 2018", ruleName: "Fire Resistance - Structural", ruleDescription: "2-hour fire resistance rating for primary structural frame in Type I and II construction.", appliesToMaterials: ["steel", "concrete", "mass timber"], complianceType: "FIRE_RATING_HOURS", complianceValue: "2" },
  { state: "NM", buildingCode: "IBC 2018", ruleName: "Seismic Zone D", ruleDescription: "Southern NM and Albuquerque area: Seismic Design Category D. Ductile structural systems required.", appliesToMaterials: ["steel", "concrete", "masonry"], complianceType: "SEISMIC_DESIGN_CATEGORY", complianceValue: "D" },

  // New York
  { state: "NY", buildingCode: "NYCECC 2022 / IBC 2020 NY", ruleName: "Energy Code - NYCECC", ruleDescription: "NYC Energy Conservation Code 2022: R-30 roof (NYC), all-electric ready, solar-ready. Upstate: R-60 attic, Climate Zone 6.", appliesToMaterials: ["insulation", "roofing", "glazing", "air barrier"], complianceType: "R_VALUE_MIN", complianceValue: "49" },
  { state: "NY", buildingCode: "NYCECC 2022 / IBC 2020 NY", ruleName: "Fire Resistance - Structural", ruleDescription: "2-hour fire resistance for Type I structural frame. NYC Local Law 26 requires fire safety upgrades for high-rises.", appliesToMaterials: ["steel", "concrete", "mass timber", "fireproofing"], complianceType: "FIRE_RATING_HOURS", complianceValue: "2" },
  { state: "NY", buildingCode: "NYCECC 2022 / IBC 2020 NY", ruleName: "NYC LL97 - Low Carbon Materials", ruleDescription: "NYC Local Law 97: Buildings over 25,000 sqft face carbon caps. EPD-certified, low-GWP materials strongly preferred.", appliesToMaterials: ["concrete", "steel", "insulation", "glass", "mass timber"], complianceType: "EPD_REQUIRED", complianceValue: "true" },

  // North Carolina
  { state: "NC", buildingCode: "IBC 2018 NC", ruleName: "Energy Code", ruleDescription: "North Carolina Climate Zone 3-4: R-38 attic, R-15 wall insulation for commercial construction.", appliesToMaterials: ["insulation", "roofing"], complianceType: "R_VALUE_MIN", complianceValue: "38" },
  { state: "NC", buildingCode: "IBC 2018 NC", ruleName: "Fire Resistance - Structural", ruleDescription: "2-hour fire resistance rating for primary structural frame in Type I and II construction.", appliesToMaterials: ["steel", "concrete", "mass timber"], complianceType: "FIRE_RATING_HOURS", complianceValue: "2" },
  { state: "NC", buildingCode: "IBC 2018 NC", ruleName: "Hurricane Wind Zone - Coastal", ruleDescription: "Coastal NC: 140 mph ultimate design wind speed. Impact-resistant glazing and roofing required in wind-borne debris regions.", appliesToMaterials: ["glazing", "roofing", "cladding"], complianceType: "WIND_SPEED_MIN_MPH", complianceValue: "140" },

  // North Dakota
  { state: "ND", buildingCode: "IBC 2018", ruleName: "Energy Code", ruleDescription: "North Dakota Climate Zone 6-7: R-60 attic, R-20+R-5ci wall insulation. Extreme cold requires high-performance envelope.", appliesToMaterials: ["insulation", "roofing", "glazing"], complianceType: "R_VALUE_MIN", complianceValue: "60" },
  { state: "ND", buildingCode: "IBC 2018", ruleName: "Fire Resistance - Structural", ruleDescription: "2-hour fire resistance rating for primary structural frame in Type I and II construction.", appliesToMaterials: ["steel", "concrete", "mass timber"], complianceType: "FIRE_RATING_HOURS", complianceValue: "2" },
  { state: "ND", buildingCode: "IBC 2018", ruleName: "EPD Recommendation", ruleDescription: "North Dakota energy efficiency programs recommend EPD-certified insulation and structural materials.", appliesToMaterials: ["insulation", "concrete", "steel"], complianceType: "EPD_PREFERRED", complianceValue: "true" },

  // Ohio
  { state: "OH", buildingCode: "IBC 2017 OH", ruleName: "Energy Code", ruleDescription: "Ohio Climate Zone 5: R-49 attic, R-20 wall insulation for commercial construction. Ohio Building Code amended IECC 2015.", appliesToMaterials: ["insulation", "roofing", "wall panels"], complianceType: "R_VALUE_MIN", complianceValue: "49" },
  { state: "OH", buildingCode: "IBC 2017 OH", ruleName: "Fire Resistance - Structural", ruleDescription: "2-hour fire resistance for primary structural frame. Columbus and Cleveland require NFPA 13 sprinkler systems.", appliesToMaterials: ["steel", "concrete", "mass timber"], complianceType: "FIRE_RATING_HOURS", complianceValue: "2" },
  { state: "OH", buildingCode: "IBC 2017 OH", ruleName: "EPD Recommendation", ruleDescription: "Ohio Facilities Construction Commission recommends EPD-certified materials for state agency projects.", appliesToMaterials: ["concrete", "steel", "insulation"], complianceType: "EPD_PREFERRED", complianceValue: "true" },

  // Oklahoma
  { state: "OK", buildingCode: "IBC 2015", ruleName: "Energy Code", ruleDescription: "Oklahoma Climate Zone 3-4: R-38 attic, R-13+R-3.8ci wall insulation for commercial construction.", appliesToMaterials: ["insulation", "roofing"], complianceType: "R_VALUE_MIN", complianceValue: "38" },
  { state: "OK", buildingCode: "IBC 2015", ruleName: "Fire Resistance - Structural", ruleDescription: "2-hour fire resistance rating for primary structural frame in Type I and II construction.", appliesToMaterials: ["steel", "concrete", "mass timber"], complianceType: "FIRE_RATING_HOURS", complianceValue: "2" },
  { state: "OK", buildingCode: "IBC 2015", ruleName: "Tornado Wind Zone", ruleDescription: "Oklahoma is in the heart of Tornado Alley: 140 mph ultimate design wind speed for structural connections.", appliesToMaterials: ["steel", "masonry", "roofing", "structural connectors"], complianceType: "WIND_SPEED_MIN_MPH", complianceValue: "140" },

  // Oregon
  { state: "OR", buildingCode: "ORSC 2021 / IBC 2021", ruleName: "Energy Code", ruleDescription: "Oregon Climate Zone 4-5: R-49 attic, R-20 wall insulation. Portland requires embodied carbon disclosure for new construction.", appliesToMaterials: ["insulation", "roofing", "glazing"], complianceType: "R_VALUE_MIN", complianceValue: "49" },
  { state: "OR", buildingCode: "ORSC 2021 / IBC 2021", ruleName: "Fire Resistance - WUI", ruleDescription: "WUI areas statewide: Class A roofing mandatory, 1-hour exterior wall fire resistance required.", appliesToMaterials: ["roofing", "cladding", "wood", "mass timber"], complianceType: "FIRE_RATING_HOURS", complianceValue: "1" },
  { state: "OR", buildingCode: "ORSC 2021 / IBC 2021", ruleName: "Embodied Carbon / EPD Required", ruleDescription: "Oregon HB 2062: EPD-certified materials required for structural steel, concrete, and mass timber on state projects.", appliesToMaterials: ["steel", "concrete", "mass timber", "rebar"], complianceType: "EPD_REQUIRED", complianceValue: "true" },

  // Pennsylvania
  { state: "PA", buildingCode: "IBC 2018 PA UCC", ruleName: "Energy Code", ruleDescription: "Pennsylvania Climate Zone 5: R-49 attic, R-20 wall insulation. PA UCC adopts IECC 2018 with amendments.", appliesToMaterials: ["insulation", "roofing", "glazing"], complianceType: "R_VALUE_MIN", complianceValue: "49" },
  { state: "PA", buildingCode: "IBC 2018 PA UCC", ruleName: "Fire Resistance - Structural", ruleDescription: "2-hour fire resistance for primary structural frame. Philadelphia requires NFPA 13 full sprinkler in all high-rise construction.", appliesToMaterials: ["steel", "concrete", "mass timber"], complianceType: "FIRE_RATING_HOURS", complianceValue: "2" },
  { state: "PA", buildingCode: "IBC 2018 PA UCC", ruleName: "EPD Recommendation", ruleDescription: "Pennsylvania DEP green building guidelines recommend EPD-certified materials for state projects.", appliesToMaterials: ["concrete", "steel", "insulation", "glass"], complianceType: "EPD_PREFERRED", complianceValue: "true" },

  // Rhode Island
  { state: "RI", buildingCode: "IBC 2021", ruleName: "Energy Code", ruleDescription: "Rhode Island Climate Zone 5: R-49 attic, R-20 wall insulation. RI Stretch Code encourages net-zero ready construction.", appliesToMaterials: ["insulation", "roofing", "glazing"], complianceType: "R_VALUE_MIN", complianceValue: "49" },
  { state: "RI", buildingCode: "IBC 2021", ruleName: "Fire Resistance - Structural", ruleDescription: "2-hour fire resistance for primary structural frame. Dense urban neighborhoods require full NFPA 13 suppression.", appliesToMaterials: ["steel", "concrete", "mass timber"], complianceType: "FIRE_RATING_HOURS", complianceValue: "2" },
  { state: "RI", buildingCode: "IBC 2021", ruleName: "EPD Requirement", ruleDescription: "Rhode Island Infrastructure Bank requires EPD-certified materials for state infrastructure and building projects.", appliesToMaterials: ["concrete", "steel", "insulation"], complianceType: "EPD_REQUIRED", complianceValue: "true" },

  // South Carolina
  { state: "SC", buildingCode: "IBC 2018", ruleName: "Energy Code", ruleDescription: "South Carolina Climate Zone 2-3: R-30 roof insulation, cool roof reflectance ≥ 0.65 encouraged in Zone 2.", appliesToMaterials: ["insulation", "roofing"], complianceType: "R_VALUE_MIN", complianceValue: "30" },
  { state: "SC", buildingCode: "IBC 2018", ruleName: "Hurricane Wind Zone - Coastal", ruleDescription: "Coastal SC: 140 mph ultimate design wind speed. Wind-borne debris region requires impact glazing.", appliesToMaterials: ["glazing", "roofing", "cladding"], complianceType: "WIND_SPEED_MIN_MPH", complianceValue: "140" },
  { state: "SC", buildingCode: "IBC 2018", ruleName: "Fire Resistance - Structural", ruleDescription: "2-hour fire resistance rating for primary structural frame in Type I and II construction.", appliesToMaterials: ["steel", "concrete", "mass timber"], complianceType: "FIRE_RATING_HOURS", complianceValue: "2" },

  // South Dakota
  { state: "SD", buildingCode: "IBC 2018", ruleName: "Energy Code", ruleDescription: "South Dakota Climate Zone 6: R-49 attic, R-20 wall insulation for commercial construction.", appliesToMaterials: ["insulation", "roofing"], complianceType: "R_VALUE_MIN", complianceValue: "49" },
  { state: "SD", buildingCode: "IBC 2018", ruleName: "Fire Resistance - Structural", ruleDescription: "2-hour fire resistance rating for primary structural frame in Type I and II construction.", appliesToMaterials: ["steel", "concrete", "mass timber"], complianceType: "FIRE_RATING_HOURS", complianceValue: "2" },
  { state: "SD", buildingCode: "IBC 2018", ruleName: "Tornado Wind Zone", ruleDescription: "South Dakota tornado zone: structural connections must meet 115 mph ultimate design wind speed.", appliesToMaterials: ["steel", "masonry", "roofing"], complianceType: "WIND_SPEED_MIN_MPH", complianceValue: "115" },

  // Tennessee
  { state: "TN", buildingCode: "IBC 2018", ruleName: "Energy Code", ruleDescription: "Tennessee Climate Zone 3-4: R-38 attic, R-15 wall insulation for commercial construction.", appliesToMaterials: ["insulation", "roofing"], complianceType: "R_VALUE_MIN", complianceValue: "38" },
  { state: "TN", buildingCode: "IBC 2018", ruleName: "Fire Resistance - Structural", ruleDescription: "2-hour fire resistance for primary structural frame in Type I and II construction.", appliesToMaterials: ["steel", "concrete", "mass timber"], complianceType: "FIRE_RATING_HOURS", complianceValue: "2" },
  { state: "TN", buildingCode: "IBC 2018", ruleName: "EPD Recommendation", ruleDescription: "Tennessee housing and development agency recommends EPD-certified materials for multifamily construction.", appliesToMaterials: ["concrete", "steel", "insulation"], complianceType: "EPD_PREFERRED", complianceValue: "true" },

  // Texas
  { state: "TX", buildingCode: "IBC 2015 / Local", ruleName: "Energy Code", ruleDescription: "Texas Climate Zone 2-3: R-30 roof insulation, cool roof reflectance ≥ 0.65 in Zone 2. SHGC ≤ 0.25 for glazing.", appliesToMaterials: ["insulation", "roofing", "glazing"], complianceType: "ROOF_REFLECTANCE_MIN", complianceValue: "0.65" },
  { state: "TX", buildingCode: "IBC 2015 / Local", ruleName: "Fire Resistance - Structural", ruleDescription: "2-hour fire resistance for primary structural frame. TxDOT projects require fire-rated assemblies per FHWA standards.", appliesToMaterials: ["steel", "concrete", "mass timber"], complianceType: "FIRE_RATING_HOURS", complianceValue: "2" },
  { state: "TX", buildingCode: "IBC 2015 / Local", ruleName: "TxDOT EPD Preference", ruleDescription: "TxDOT increasingly specifies EPD-certified concrete and structural steel for highway and bridge construction projects.", appliesToMaterials: ["concrete", "steel", "rebar", "asphalt"], complianceType: "EPD_PREFERRED", complianceValue: "true" },

  // Utah
  { state: "UT", buildingCode: "IBC 2018", ruleName: "Energy Code", ruleDescription: "Utah Climate Zone 5-6: R-49 attic, R-20 wall insulation for commercial construction.", appliesToMaterials: ["insulation", "roofing"], complianceType: "R_VALUE_MIN", complianceValue: "49" },
  { state: "UT", buildingCode: "IBC 2018", ruleName: "Fire Resistance - WUI", ruleDescription: "WUI areas: Class A roofing mandatory, 1-hour exterior wall fire resistance required across much of Wasatch Front.", appliesToMaterials: ["roofing", "cladding", "wood", "mass timber"], complianceType: "FIRE_RATING_HOURS", complianceValue: "1" },
  { state: "UT", buildingCode: "IBC 2018", ruleName: "Seismic Zone D - Wasatch Front", ruleDescription: "Wasatch Front high seismic hazard: Seismic Design Category D. Ductile steel moment frames and RC shear walls required.", appliesToMaterials: ["steel", "concrete", "masonry"], complianceType: "SEISMIC_DESIGN_CATEGORY", complianceValue: "D" },

  // Vermont
  { state: "VT", buildingCode: "IBC 2021", ruleName: "Energy Code", ruleDescription: "Vermont Climate Zone 6: R-60 attic, R-20+R-5ci wall insulation. Vermont Stretch Energy Code encourages Passive House performance.", appliesToMaterials: ["insulation", "roofing", "glazing", "air barrier"], complianceType: "R_VALUE_MIN", complianceValue: "60" },
  { state: "VT", buildingCode: "IBC 2021", ruleName: "Fire Resistance - Structural", ruleDescription: "2-hour fire resistance for primary structural frame in Type I construction.", appliesToMaterials: ["steel", "concrete", "mass timber"], complianceType: "FIRE_RATING_HOURS", complianceValue: "2" },
  { state: "VT", buildingCode: "IBC 2021", ruleName: "EPD Required - Act 250", ruleDescription: "Vermont Act 250 land use permits for large commercial projects recommend EPD-certified materials to reduce embodied carbon.", appliesToMaterials: ["concrete", "steel", "insulation", "mass timber"], complianceType: "EPD_PREFERRED", complianceValue: "true" },

  // Virginia
  { state: "VA", buildingCode: "USBC 2021 / IBC 2021", ruleName: "Energy Code", ruleDescription: "Virginia Climate Zone 4-5: R-49 attic, R-20 wall insulation. Virginia Uniform Statewide Building Code amended IECC 2021.", appliesToMaterials: ["insulation", "roofing", "glazing"], complianceType: "R_VALUE_MIN", complianceValue: "49" },
  { state: "VA", buildingCode: "USBC 2021 / IBC 2021", ruleName: "Fire Resistance - Structural", ruleDescription: "2-hour fire resistance for primary structural frame in Type I and II construction.", appliesToMaterials: ["steel", "concrete", "mass timber"], complianceType: "FIRE_RATING_HOURS", complianceValue: "2" },
  { state: "VA", buildingCode: "USBC 2021 / IBC 2021", ruleName: "EPD Requirement - VDOT", ruleDescription: "VDOT requires EPD documentation for structural concrete and steel on highway and bridge construction contracts.", appliesToMaterials: ["concrete", "steel", "rebar"], complianceType: "EPD_REQUIRED", complianceValue: "true" },

  // Washington
  { state: "WA", buildingCode: "IBC 2021 WAC", ruleName: "Energy Code - WSEC 2021", ruleDescription: "Washington State Energy Code 2021: R-60 attic, Passive House air tightness for commercial. All-electric ready mandatory.", appliesToMaterials: ["insulation", "roofing", "glazing", "air barrier"], complianceType: "R_VALUE_MIN", complianceValue: "60" },
  { state: "WA", buildingCode: "IBC 2021 WAC", ruleName: "Fire Resistance - WUI", ruleDescription: "Eastern WA WUI: Class A roofing, 1-hour exterior wall fire resistance. Western WA high seismic zone D.", appliesToMaterials: ["roofing", "cladding", "mass timber", "wood"], complianceType: "FIRE_RATING_HOURS", complianceValue: "1" },
  { state: "WA", buildingCode: "IBC 2021 WAC", ruleName: "Embodied Carbon EPD Required", ruleDescription: "Washington Clean Buildings Act and HB 1257: EPD required for structural steel, concrete, and mass timber on state-funded projects.", appliesToMaterials: ["steel", "concrete", "mass timber", "rebar", "glass"], complianceType: "EPD_REQUIRED", complianceValue: "true" },

  // West Virginia
  { state: "WV", buildingCode: "IBC 2018", ruleName: "Energy Code", ruleDescription: "West Virginia Climate Zone 5: R-49 attic, R-20 wall insulation for commercial construction.", appliesToMaterials: ["insulation", "roofing"], complianceType: "R_VALUE_MIN", complianceValue: "49" },
  { state: "WV", buildingCode: "IBC 2018", ruleName: "Fire Resistance - Structural", ruleDescription: "2-hour fire resistance for primary structural frame in Type I and II construction.", appliesToMaterials: ["steel", "concrete", "mass timber"], complianceType: "FIRE_RATING_HOURS", complianceValue: "2" },
  { state: "WV", buildingCode: "IBC 2018", ruleName: "EPD Recommendation", ruleDescription: "West Virginia infrastructure programs recommend EPD-certified materials for state building projects.", appliesToMaterials: ["concrete", "steel", "insulation"], complianceType: "EPD_PREFERRED", complianceValue: "true" },

  // Wisconsin
  { state: "WI", buildingCode: "IBC 2021 / SPS 361-366", ruleName: "Energy Code", ruleDescription: "Wisconsin Climate Zone 6: R-60 attic, R-20+R-5ci wall insulation. Wisconsin Commercial Building Code (SPS 363) applies.", appliesToMaterials: ["insulation", "roofing", "glazing"], complianceType: "R_VALUE_MIN", complianceValue: "60" },
  { state: "WI", buildingCode: "IBC 2021 / SPS 361-366", ruleName: "Fire Resistance - Structural", ruleDescription: "2-hour fire resistance for primary structural frame in Type I and II construction.", appliesToMaterials: ["steel", "concrete", "mass timber"], complianceType: "FIRE_RATING_HOURS", complianceValue: "2" },
  { state: "WI", buildingCode: "IBC 2021 / SPS 361-366", ruleName: "EPD Recommendation", ruleDescription: "Wisconsin Focus on Energy program incentivizes EPD-certified materials for commercial construction.", appliesToMaterials: ["concrete", "steel", "insulation"], complianceType: "EPD_PREFERRED", complianceValue: "true" },

  // Wyoming
  { state: "WY", buildingCode: "IBC 2021", ruleName: "Energy Code", ruleDescription: "Wyoming Climate Zone 6-7: R-60 attic, R-20 wall insulation for commercial construction.", appliesToMaterials: ["insulation", "roofing"], complianceType: "R_VALUE_MIN", complianceValue: "60" },
  { state: "WY", buildingCode: "IBC 2021", ruleName: "Fire Resistance - WUI", ruleDescription: "WUI communities require Class A roofing and 1-hour exterior wall fire resistance.", appliesToMaterials: ["roofing", "cladding", "wood", "mass timber"], complianceType: "FIRE_RATING_HOURS", complianceValue: "1" },
  { state: "WY", buildingCode: "IBC 2021", ruleName: "Seismic / Wind Zone", ruleDescription: "Wyoming high-wind corridor: structural connections must meet 115 mph ultimate design wind speed per ASCE 7.", appliesToMaterials: ["steel", "masonry", "roofing"], complianceType: "WIND_SPEED_MIN_MPH", complianceValue: "115" },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const force = process.argv.includes("--force");

  if (force) {
    console.log("--force: wiping existing compliance rules...");
    await db.delete(complianceRules);
    console.log("Existing rules deleted.");
  } else {
    // Check if already seeded
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(complianceRules);

    if (count > 0) {
      console.log(
        `Compliance rules already seeded (${count} rows). Pass --force to re-seed.`
      );
      await pool.end();
      return;
    }
  }

  console.log(`Seeding ${RULES.length} compliance rules across 50 states...`);

  // Insert in batches of 30
  const BATCH_SIZE = 30;
  let inserted = 0;
  for (let i = 0; i < RULES.length; i += BATCH_SIZE) {
    const batch = RULES.slice(i, i + BATCH_SIZE);
    await db.insert(complianceRules).values(batch);
    inserted += batch.length;
    console.log(`  Inserted ${inserted}/${RULES.length}`);
  }

  console.log(`Done. ${RULES.length} compliance rules seeded.`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  pool.end();
  process.exit(1);
});
