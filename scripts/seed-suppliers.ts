/**
 * Seed script: inserts 60 US sustainable building material suppliers.
 * Run with: tsx scripts/seed-suppliers.ts
 *
 * Safe to re-run — skips if seed rows (userId=0) already exist.
 * Pass --force to wipe and re-seed: tsx scripts/seed-suppliers.ts --force
 * userId = 0 (system/seed row — no real user account).
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
import { suppliers } from "../drizzle/schema";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL is not set");
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes("azure") || DATABASE_URL.includes("postgres.database.azure.com")
    ? { rejectUnauthorized: false }
    : false,
});
const db = drizzle(pool);

// ─── Seed Data ───────────────────────────────────────────────────────────────

type SeedSupplier = {
  userId: number;
  companyName: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  latitude: string;
  longitude: string;
  description: string;
  contactName: string;
  materialCategories: string[];
  certifications: string[];
  sustainabilityScore: string;
  maxOrderValue: string;
  currentCapacity: number;
  isPremium: boolean;
  verified: boolean;
  verificationStatus: "approved" | "pending" | "rejected";
};

const SUPPLIERS: SeedSupplier[] = [
  // ── California ──────────────────────────────────────────────────────────────
  {
    userId: 0, companyName: "Pacific Green Concrete", email: "orders@pacificgreenconcrete.com",
    phone: "415-555-0101", website: "https://pacificgreenconcrete.com",
    address: "1200 Third St", city: "San Francisco", state: "CA", zipCode: "94107", country: "US",
    latitude: "37.7749", longitude: "-122.4194",
    description: "Low-carbon concrete mixes with up to 50% recycled content. EPD-certified blends for LEED and WELL projects.",
    contactName: "Maria Chen",
    materialCategories: ["concrete", "structural"],
    certifications: ["LEED", "EPD", "Cradle to Cradle"],
    sustainabilityScore: "9.20", maxOrderValue: "2500000", currentCapacity: 90, isPremium: true, verified: true, verificationStatus: "approved",
  },
  {
    userId: 0, companyName: "BioTerra Insulation Co.", email: "sales@bioterra-insulation.com",
    phone: "310-555-0202", website: "https://bioterra-insulation.com",
    address: "4500 Aviation Blvd", city: "Los Angeles", state: "CA", zipCode: "90045", country: "US",
    latitude: "33.9617", longitude: "-118.3756",
    description: "Hemp, cork, and recycled denim insulation panels. Zero-VOC and carbon-sequestering options available.",
    contactName: "James Ortega",
    materialCategories: ["insulation"],
    certifications: ["GREENGUARD Gold", "Cradle to Cradle", "EPD"],
    sustainabilityScore: "9.50", maxOrderValue: "1200000", currentCapacity: 85, isPremium: true, verified: true, verificationStatus: "approved",
  },
  {
    userId: 0, companyName: "Redwood Structural Timber", email: "info@redwoodstructural.com",
    phone: "916-555-0303", website: "https://redwoodstructural.com",
    address: "8800 Elder Creek Rd", city: "Sacramento", state: "CA", zipCode: "95828", country: "US",
    latitude: "38.4747", longitude: "-121.4500",
    description: "FSC-certified mass timber, GLT, and NLT panels. Specializes in mid-rise commercial and residential structures.",
    contactName: "Sandra Nguyen",
    materialCategories: ["mass timber", "structural", "wood"],
    certifications: ["FSC", "LEED", "EPD"],
    sustainabilityScore: "9.10", maxOrderValue: "5000000", currentCapacity: 75, isPremium: true, verified: true, verificationStatus: "approved",
  },
  {
    userId: 0, companyName: "SolarSkin Cladding Systems", email: "projects@solarskin.com",
    phone: "619-555-0404", website: "https://solarskin.com",
    address: "2200 Kettner Blvd", city: "San Diego", state: "CA", zipCode: "92101", country: "US",
    latitude: "32.7157", longitude: "-117.1611",
    description: "Building-integrated photovoltaic cladding and high-performance rainscreen systems with recycled aluminum cores.",
    contactName: "Alex Torres",
    materialCategories: ["cladding", "glass", "sustainable"],
    certifications: ["Energy Star", "LEED", "ISO 14001"],
    sustainabilityScore: "8.80", maxOrderValue: "3000000", currentCapacity: 80, isPremium: false, verified: true, verificationStatus: "approved",
  },
  {
    userId: 0, companyName: "Bay Area Recycled Steel", email: "supply@barecycledsteel.com",
    phone: "510-555-0505", website: "https://barecycledsteel.com",
    address: "1050 Harbor Way", city: "Oakland", state: "CA", zipCode: "94607", country: "US",
    latitude: "37.7965", longitude: "-122.2793",
    description: "90%+ recycled-content structural steel, rebar, and decking. Mill certifications and EPDs provided on all orders.",
    contactName: "Derek Washington",
    materialCategories: ["steel", "structural", "recycled"],
    certifications: ["EPD", "ISO 14001", "LEED"],
    sustainabilityScore: "8.60", maxOrderValue: "4000000", currentCapacity: 95, isPremium: false, verified: true, verificationStatus: "approved",
  },

  // ── Texas ────────────────────────────────────────────────────────────────────
  {
    userId: 0, companyName: "Lone Star Green Build", email: "sales@lonestargreenbuild.com",
    phone: "512-555-0601", website: "https://lonestargreenbuild.com",
    address: "6700 Burnet Rd", city: "Austin", state: "TX", zipCode: "78757", country: "US",
    latitude: "30.3516", longitude: "-97.7356",
    description: "Fly-ash concrete, low-e glazing, and bio-based foam insulation for Texas commercial projects.",
    contactName: "Carlos Rivera",
    materialCategories: ["concrete", "glass", "insulation"],
    certifications: ["LEED", "EPD", "Green Seal"],
    sustainabilityScore: "8.40", maxOrderValue: "2000000", currentCapacity: 88, isPremium: true, verified: true, verificationStatus: "approved",
  },
  {
    userId: 0, companyName: "Gulf Coast Sustainable Roofing", email: "info@gcsroofing.com",
    phone: "713-555-0702", website: "https://gcsroofing.com",
    address: "9500 Gulf Freeway", city: "Houston", state: "TX", zipCode: "77017", country: "US",
    latitude: "29.7604", longitude: "-95.3698",
    description: "Cool-roof membranes, recycled rubber roofing, and green roof systems engineered for Gulf Coast humidity.",
    contactName: "Priya Patel",
    materialCategories: ["roofing", "waterproofing"],
    certifications: ["Energy Star", "GREENGUARD Gold", "LEED"],
    sustainabilityScore: "8.20", maxOrderValue: "1800000", currentCapacity: 82, isPremium: false, verified: true, verificationStatus: "approved",
  },
  {
    userId: 0, companyName: "Permian Reclaimed Lumber", email: "orders@permianlumber.com",
    phone: "432-555-0803", website: "https://permianlumber.com",
    address: "3300 Andrews Hwy", city: "Midland", state: "TX", zipCode: "79701", country: "US",
    latitude: "31.9973", longitude: "-102.0779",
    description: "Reclaimed barn wood, railroad timber, and salvaged hardwood for feature walls and flooring.",
    contactName: "Billy Reeves",
    materialCategories: ["wood", "flooring", "recycled"],
    certifications: ["FSC", "LEED"],
    sustainabilityScore: "7.80", maxOrderValue: "800000", currentCapacity: 70, isPremium: false, verified: true, verificationStatus: "approved",
  },
  {
    userId: 0, companyName: "NorthTex Steel Fabricators", email: "bids@northtexsteel.com",
    phone: "214-555-0904", website: "https://northtexsteel.com",
    address: "2100 Walnut Hill Ln", city: "Dallas", state: "TX", zipCode: "75229", country: "US",
    latitude: "32.8772", longitude: "-96.8716",
    description: "Structural steel with third-party verified recycled content. AISC-certified fabrication with EPD documentation.",
    contactName: "Angela Kim",
    materialCategories: ["steel", "structural"],
    certifications: ["EPD", "ISO 14001", "LEED"],
    sustainabilityScore: "8.30", maxOrderValue: "6000000", currentCapacity: 90, isPremium: true, verified: true, verificationStatus: "approved",
  },

  // ── New York ─────────────────────────────────────────────────────────────────
  {
    userId: 0, companyName: "Empire State Insulation", email: "projects@empirestateinsulation.com",
    phone: "212-555-1001", website: "https://empirestateinsulation.com",
    address: "500 W 45th St", city: "New York", state: "NY", zipCode: "10036", country: "US",
    latitude: "40.7128", longitude: "-74.0060",
    description: "Mineral wool, aerogel blankets, and low-GWP spray foam for high-rise retrofit and new construction.",
    contactName: "Rachel Goldberg",
    materialCategories: ["insulation"],
    certifications: ["GREENGUARD Gold", "LEED", "EPD"],
    sustainabilityScore: "8.70", maxOrderValue: "3500000", currentCapacity: 85, isPremium: true, verified: true, verificationStatus: "approved",
  },
  {
    userId: 0, companyName: "Hudson Valley Mass Timber", email: "sales@hvmasstimber.com",
    phone: "845-555-1102", website: "https://hvmasstimber.com",
    address: "120 Water St", city: "Newburgh", state: "NY", zipCode: "12550", country: "US",
    latitude: "41.5034", longitude: "-74.0104",
    description: "CLT and glulam panels from sustainably harvested northeastern hardwoods. NY and NJ delivery.",
    contactName: "Tom Fitzgerald",
    materialCategories: ["mass timber", "structural", "wood"],
    certifications: ["FSC", "LEED", "EPD"],
    sustainabilityScore: "9.00", maxOrderValue: "4500000", currentCapacity: 78, isPremium: true, verified: true, verificationStatus: "approved",
  },
  {
    userId: 0, companyName: "Brooklyn Green Glass", email: "info@brooklyngreenglass.com",
    phone: "718-555-1203", website: "https://brooklyngreenglass.com",
    address: "320 Jay St", city: "Brooklyn", state: "NY", zipCode: "11201", country: "US",
    latitude: "40.6928", longitude: "-73.9870",
    description: "High-performance triple-pane glazing and electrochromic glass systems for energy-efficient facades.",
    contactName: "Lisa Park",
    materialCategories: ["glass", "cladding"],
    certifications: ["Energy Star", "LEED", "GREENGUARD Gold"],
    sustainabilityScore: "8.50", maxOrderValue: "2200000", currentCapacity: 80, isPremium: false, verified: true, verificationStatus: "approved",
  },
  {
    userId: 0, companyName: "TriBoro Recycled Concrete", email: "dispatch@triboroconcrete.com",
    phone: "646-555-1304", website: "https://triboroconcrete.com",
    address: "800 Exterior St", city: "Bronx", state: "NY", zipCode: "10451", country: "US",
    latitude: "40.8448", longitude: "-73.8648",
    description: "Crushed concrete aggregate and SCM blends serving metro NYC infrastructure and vertical construction.",
    contactName: "Marco Reyes",
    materialCategories: ["concrete", "structural", "recycled"],
    certifications: ["EPD", "LEED"],
    sustainabilityScore: "7.90", maxOrderValue: "5000000", currentCapacity: 95, isPremium: false, verified: true, verificationStatus: "approved",
  },

  // ── Florida ──────────────────────────────────────────────────────────────────
  {
    userId: 0, companyName: "Sunshine State Green Roofing", email: "quotes@sunshinestateroofing.com",
    phone: "305-555-1401", website: "https://sunshinestateroofing.com",
    address: "1200 NW 78th Ave", city: "Miami", state: "FL", zipCode: "33126", country: "US",
    latitude: "25.7617", longitude: "-80.1918",
    description: "Impact-rated cool-roof systems and photovoltaic-ready membranes for South Florida's hurricane zone.",
    contactName: "Sofia Morales",
    materialCategories: ["roofing", "waterproofing", "sustainable"],
    certifications: ["Energy Star", "LEED", "Florida Green Building Coalition"],
    sustainabilityScore: "8.10", maxOrderValue: "2000000", currentCapacity: 85, isPremium: false, verified: true, verificationStatus: "approved",
  },
  {
    userId: 0, companyName: "Gulf-Tek Composite Cladding", email: "orders@gulftekcomposite.com",
    phone: "813-555-1502", website: "https://gulftekcomposite.com",
    address: "5500 E Adamo Dr", city: "Tampa", state: "FL", zipCode: "33619", country: "US",
    latitude: "27.9506", longitude: "-82.4572",
    description: "Fiber-cement and recycled HDPE cladding panels with moisture-resistant cores for coastal applications.",
    contactName: "Robert Nash",
    materialCategories: ["cladding", "recycled"],
    certifications: ["GREENGUARD Gold", "LEED"],
    sustainabilityScore: "8.00", maxOrderValue: "1500000", currentCapacity: 88, isPremium: false, verified: true, verificationStatus: "approved",
  },
  {
    userId: 0, companyName: "Orlando Eco Flooring", email: "sales@orlandoecoflooring.com",
    phone: "407-555-1603", website: "https://orlandoecoflooring.com",
    address: "2300 McCoy Rd", city: "Orlando", state: "FL", zipCode: "32809", country: "US",
    latitude: "28.4845", longitude: "-81.3792",
    description: "Bamboo, cork, and recycled tile flooring systems with VOC-free installation adhesives.",
    contactName: "Tanya Williams",
    materialCategories: ["flooring", "sustainable"],
    certifications: ["GREENGUARD Gold", "FSC", "Cradle to Cradle"],
    sustainabilityScore: "8.60", maxOrderValue: "900000", currentCapacity: 75, isPremium: false, verified: true, verificationStatus: "approved",
  },

  // ── Colorado ─────────────────────────────────────────────────────────────────
  {
    userId: 0, companyName: "Rocky Mountain Timber Frame", email: "projects@rmtimberframe.com",
    phone: "303-555-1701", website: "https://rmtimberframe.com",
    address: "4800 Brighton Blvd", city: "Denver", state: "CO", zipCode: "80216", country: "US",
    latitude: "39.7392", longitude: "-104.9903",
    description: "Custom timber framing and CLT panels sourced from beetle-kill pine and FSC-certified Rocky Mountain forests.",
    contactName: "Jake Morrison",
    materialCategories: ["mass timber", "structural", "wood"],
    certifications: ["FSC", "LEED", "EPD", "Cradle to Cradle"],
    sustainabilityScore: "9.30", maxOrderValue: "3500000", currentCapacity: 72, isPremium: true, verified: true, verificationStatus: "approved",
  },
  {
    userId: 0, companyName: "Altitude Insulation Solutions", email: "info@altitudeinsulation.com",
    phone: "719-555-1802", website: "https://altitudeinsulation.com",
    address: "1600 N Weber St", city: "Colorado Springs", state: "CO", zipCode: "80907", country: "US",
    latitude: "38.8339", longitude: "-104.8214",
    description: "High-R spray foam and rigid insulation engineered for Colorado's extreme temperature swings.",
    contactName: "Heather Boyd",
    materialCategories: ["insulation"],
    certifications: ["GREENGUARD Gold", "Energy Star"],
    sustainabilityScore: "7.70", maxOrderValue: "1100000", currentCapacity: 80, isPremium: false, verified: true, verificationStatus: "approved",
  },

  // ── Oregon ────────────────────────────────────────────────────────────────────
  {
    userId: 0, companyName: "Cascadia Wood Products", email: "supply@cascadiawoodproducts.com",
    phone: "503-555-1901", website: "https://cascadiawoodproducts.com",
    address: "2200 NW Nicolai St", city: "Portland", state: "OR", zipCode: "97210", country: "US",
    latitude: "45.5051", longitude: "-122.6750",
    description: "FSC-certified Douglas fir framing, CLT, and engineered wood panels. Specializes in passive house construction.",
    contactName: "Nadia Sullivan",
    materialCategories: ["wood", "mass timber", "structural"],
    certifications: ["FSC", "LEED", "EPD", "Living Building Challenge"],
    sustainabilityScore: "9.60", maxOrderValue: "4000000", currentCapacity: 80, isPremium: true, verified: true, verificationStatus: "approved",
  },
  {
    userId: 0, companyName: "Willamette Green Concrete", email: "orders@willamettegreenconcrete.com",
    phone: "541-555-2002", website: "https://willamettegreenconcrete.com",
    address: "1500 W 6th Ave", city: "Eugene", state: "OR", zipCode: "97402", country: "US",
    latitude: "44.0521", longitude: "-123.0868",
    description: "Geopolymer and slag-cement concrete mixes with 60% lower embodied carbon. EPD on file.",
    contactName: "Sean Brady",
    materialCategories: ["concrete", "structural"],
    certifications: ["EPD", "LEED", "Green Seal"],
    sustainabilityScore: "9.10", maxOrderValue: "2500000", currentCapacity: 85, isPremium: false, verified: true, verificationStatus: "approved",
  },

  // ── Washington ────────────────────────────────────────────────────────────────
  {
    userId: 0, companyName: "Puget Sound Mass Timber", email: "sales@pugetsoundmasstimber.com",
    phone: "206-555-2101", website: "https://pugetsoundmasstimber.com",
    address: "3800 1st Ave S", city: "Seattle", state: "WA", zipCode: "98134", country: "US",
    latitude: "47.6062", longitude: "-122.3321",
    description: "CLT and NLT floor systems for Pacific Northwest commercial and multi-family projects. All panels FSC-certified.",
    contactName: "Karen Yoshida",
    materialCategories: ["mass timber", "structural", "wood"],
    certifications: ["FSC", "LEED", "EPD", "Living Building Challenge"],
    sustainabilityScore: "9.40", maxOrderValue: "5000000", currentCapacity: 78, isPremium: true, verified: true, verificationStatus: "approved",
  },
  {
    userId: 0, companyName: "Evergreen Recycled Steel NW", email: "info@evergreensteelnw.com",
    phone: "253-555-2202", website: "https://evergreensteelnw.com",
    address: "1100 Port of Tacoma Rd", city: "Tacoma", state: "WA", zipCode: "98421", country: "US",
    latitude: "47.2529", longitude: "-122.4443",
    description: "Electric arc furnace steel from 100% scrap — structural shapes, plates, and hollow sections with EPDs.",
    contactName: "Mike Dalton",
    materialCategories: ["steel", "structural", "recycled"],
    certifications: ["EPD", "ISO 14001", "LEED"],
    sustainabilityScore: "8.90", maxOrderValue: "6000000", currentCapacity: 90, isPremium: true, verified: true, verificationStatus: "approved",
  },

  // ── Illinois ──────────────────────────────────────────────────────────────────
  {
    userId: 0, companyName: "Midwest Green Concrete Supply", email: "dispatch@midwestgreenconcrete.com",
    phone: "312-555-2301", website: "https://midwestgreenconcrete.com",
    address: "4400 W 31st St", city: "Chicago", state: "IL", zipCode: "60623", country: "US",
    latitude: "41.8781", longitude: "-87.6298",
    description: "Fly-ash and slag-blended concrete for Chicago's commercial market. ASTM C618 fly ash up to 40% replacement.",
    contactName: "Dominique Harper",
    materialCategories: ["concrete", "structural"],
    certifications: ["EPD", "LEED", "Green Seal"],
    sustainabilityScore: "8.30", maxOrderValue: "3500000", currentCapacity: 92, isPremium: false, verified: true, verificationStatus: "approved",
  },
  {
    userId: 0, companyName: "Prairie Wind Insulation", email: "quotes@prairiewindinsulation.com",
    phone: "217-555-2402", website: "https://prairiewindinsulation.com",
    address: "2800 E Cook St", city: "Springfield", state: "IL", zipCode: "62703", country: "US",
    latitude: "39.8003", longitude: "-89.6537",
    description: "Cellulose and mineral wool blown-in insulation. Recycled newsprint content up to 85%.",
    contactName: "Patricia Gaines",
    materialCategories: ["insulation", "recycled"],
    certifications: ["GREENGUARD Gold", "LEED", "Energy Star"],
    sustainabilityScore: "7.60", maxOrderValue: "700000", currentCapacity: 78, isPremium: false, verified: true, verificationStatus: "approved",
  },

  // ── Massachusetts ─────────────────────────────────────────────────────────────
  {
    userId: 0, companyName: "New England Mass Timber Co.", email: "info@nemasstimber.com",
    phone: "617-555-2501", website: "https://nemasstimber.com",
    address: "100 Seaport Blvd", city: "Boston", state: "MA", zipCode: "02210", country: "US",
    latitude: "42.3601", longitude: "-71.0589",
    description: "CLT, GLT, and DLT panels from New England hardwoods. Expert in Passive House and LBC projects.",
    contactName: "Erica Whitman",
    materialCategories: ["mass timber", "structural", "wood"],
    certifications: ["FSC", "LEED", "EPD", "Living Building Challenge"],
    sustainabilityScore: "9.50", maxOrderValue: "4500000", currentCapacity: 75, isPremium: true, verified: true, verificationStatus: "approved",
  },
  {
    userId: 0, companyName: "Cape Cod Green Glass", email: "sales@capecodgreenglass.com",
    phone: "508-555-2602", website: "https://capecodgreenglass.com",
    address: "500 Main St", city: "Hyannis", state: "MA", zipCode: "02601", country: "US",
    latitude: "41.6523", longitude: "-70.2830",
    description: "Triple-pane and vacuum-insulated glazing for energy-efficient coastal buildings. Condensation-resistant frames.",
    contactName: "Brian McAllister",
    materialCategories: ["glass", "sustainable"],
    certifications: ["Energy Star", "LEED", "GREENGUARD Gold"],
    sustainabilityScore: "8.40", maxOrderValue: "1500000", currentCapacity: 80, isPremium: false, verified: true, verificationStatus: "approved",
  },

  // ── Arizona ────────────────────────────────────────────────────────────────────
  {
    userId: 0, companyName: "Desert Sun Cool Roofing", email: "bids@desertcoroofing.com",
    phone: "602-555-2701", website: "https://desertcoolroofing.com",
    address: "3200 E McDowell Rd", city: "Phoenix", state: "AZ", zipCode: "85008", country: "US",
    latitude: "33.4484", longitude: "-112.0740",
    description: "High-albedo cool roofing systems specifically designed for Sonoran Desert UV and heat exposure.",
    contactName: "Chris Fernandez",
    materialCategories: ["roofing", "waterproofing"],
    certifications: ["Energy Star", "LEED", "Cool Roof Rating Council"],
    sustainabilityScore: "8.20", maxOrderValue: "2000000", currentCapacity: 87, isPremium: false, verified: true, verificationStatus: "approved",
  },
  {
    userId: 0, companyName: "Sonoran Rammed Earth Supply", email: "info@sonoranrammedearth.com",
    phone: "520-555-2802", website: "https://sonoranrammedearth.com",
    address: "1800 S 6th Ave", city: "Tucson", state: "AZ", zipCode: "85713", country: "US",
    latitude: "32.2226", longitude: "-110.9747",
    description: "Rammed earth, adobe, and compressed earth block for thermally massive sustainable structures.",
    contactName: "Alicia Herrera",
    materialCategories: ["structural", "sustainable"],
    certifications: ["LEED", "Living Building Challenge"],
    sustainabilityScore: "9.70", maxOrderValue: "1000000", currentCapacity: 60, isPremium: false, verified: true, verificationStatus: "approved",
  },

  // ── North Carolina ─────────────────────────────────────────────────────────────
  {
    userId: 0, companyName: "Piedmont Sustainable Lumber", email: "orders@piedmontsustainablelumber.com",
    phone: "919-555-2901", website: "https://piedmontsustainablelumber.com",
    address: "2200 Yonkers Rd", city: "Raleigh", state: "NC", zipCode: "27604", country: "US",
    latitude: "35.7796", longitude: "-78.6382",
    description: "Sustainably harvested southern yellow pine and hardwoods with chain-of-custody documentation.",
    contactName: "Fred Johnston",
    materialCategories: ["wood", "flooring", "structural"],
    certifications: ["FSC", "LEED", "SFI"],
    sustainabilityScore: "8.00", maxOrderValue: "2000000", currentCapacity: 85, isPremium: false, verified: true, verificationStatus: "approved",
  },
  {
    userId: 0, companyName: "Queen City Green Build", email: "sales@queencitygreenbuild.com",
    phone: "704-555-3002", website: "https://queencitygreenbuild.com",
    address: "3400 Wilkinson Blvd", city: "Charlotte", state: "NC", zipCode: "28208", country: "US",
    latitude: "35.2271", longitude: "-80.8431",
    description: "Integrated supply of LEED materials — insulation, glass, cladding, and low-carbon concrete for Carolinas market.",
    contactName: "Monica Davis",
    materialCategories: ["insulation", "glass", "cladding", "concrete"],
    certifications: ["LEED", "EPD", "GREENGUARD Gold"],
    sustainabilityScore: "8.10", maxOrderValue: "3000000", currentCapacity: 88, isPremium: true, verified: true, verificationStatus: "approved",
  },

  // ── Georgia ────────────────────────────────────────────────────────────────────
  {
    userId: 0, companyName: "Atlanta Geopolymer Concrete", email: "projects@atlantageopolymer.com",
    phone: "404-555-3101", website: "https://atlantageopolymer.com",
    address: "500 Northside Dr NW", city: "Atlanta", state: "GA", zipCode: "30318", country: "US",
    latitude: "33.7490", longitude: "-84.3880",
    description: "Geopolymer binders and supplementary cementitious mixes with up to 70% embodied carbon reduction.",
    contactName: "Anthony Simmons",
    materialCategories: ["concrete", "structural"],
    certifications: ["EPD", "LEED", "Green Seal"],
    sustainabilityScore: "9.20", maxOrderValue: "3000000", currentCapacity: 90, isPremium: true, verified: true, verificationStatus: "approved",
  },
  {
    userId: 0, companyName: "Georgia Reclaimed Hardwood", email: "info@georgiareclaimedhardwood.com",
    phone: "706-555-3202", website: "https://georgiareclaimedhardwood.com",
    address: "820 Athens Rd", city: "Watkinsville", state: "GA", zipCode: "30677", country: "US",
    latitude: "33.8629", longitude: "-83.4085",
    description: "Reclaimed heart pine, white oak, and Georgia pecan for architectural millwork, flooring, and feature walls.",
    contactName: "Linda Tanner",
    materialCategories: ["wood", "flooring", "recycled"],
    certifications: ["FSC", "LEED", "Cradle to Cradle"],
    sustainabilityScore: "8.90", maxOrderValue: "600000", currentCapacity: 65, isPremium: false, verified: true, verificationStatus: "approved",
  },

  // ── Pennsylvania ──────────────────────────────────────────────────────────────
  {
    userId: 0, companyName: "Philly Steel Recyclers", email: "bids@phillysteel.com",
    phone: "215-555-3301", website: "https://phillysteel.com",
    address: "2600 E Castor Ave", city: "Philadelphia", state: "PA", zipCode: "19134", country: "US",
    latitude: "39.9526", longitude: "-75.1652",
    description: "Structural steel and rebar with 95% recycled content. Serving mid-Atlantic region with same-week delivery.",
    contactName: "Vincent Romano",
    materialCategories: ["steel", "structural", "recycled"],
    certifications: ["EPD", "ISO 14001", "LEED"],
    sustainabilityScore: "8.50", maxOrderValue: "5000000", currentCapacity: 93, isPremium: true, verified: true, verificationStatus: "approved",
  },
  {
    userId: 0, companyName: "Keystone Green Insulation", email: "sales@keystonegreeninsulation.com",
    phone: "412-555-3402", website: "https://keystonegreeninsulation.com",
    address: "1800 Liberty Ave", city: "Pittsburgh", state: "PA", zipCode: "15222", country: "US",
    latitude: "40.4406", longitude: "-79.9959",
    description: "Fiberglass, mineral wool, and cellulose insulation distributed throughout Pennsylvania and surrounding states.",
    contactName: "Carolyn Hess",
    materialCategories: ["insulation"],
    certifications: ["GREENGUARD Gold", "Energy Star", "LEED"],
    sustainabilityScore: "7.80", maxOrderValue: "1200000", currentCapacity: 82, isPremium: false, verified: true, verificationStatus: "approved",
  },

  // ── Ohio ──────────────────────────────────────────────────────────────────────
  {
    userId: 0, companyName: "Great Lakes Fly Ash Concrete", email: "info@greatlakesconcrete.com",
    phone: "614-555-3501", website: "https://greatlakesconcrete.com",
    address: "1500 N 4th St", city: "Columbus", state: "OH", zipCode: "43201", country: "US",
    latitude: "39.9612", longitude: "-82.9988",
    description: "Class C and F fly ash blends for Ohio DOT and commercial projects. Up to 35% OPC replacement.",
    contactName: "Gary Lawson",
    materialCategories: ["concrete", "structural"],
    certifications: ["EPD", "LEED"],
    sustainabilityScore: "7.90", maxOrderValue: "3000000", currentCapacity: 90, isPremium: false, verified: true, verificationStatus: "approved",
  },
  {
    userId: 0, companyName: "Cleveland Sustainable Cladding", email: "projects@clevelandcladding.com",
    phone: "216-555-3602", website: "https://clevelandcladding.com",
    address: "4200 Chester Ave", city: "Cleveland", state: "OH", zipCode: "44103", country: "US",
    latitude: "41.4993", longitude: "-81.6944",
    description: "Terracotta, zinc, and fiber-cement rainscreen panels with 30+ year verified service life.",
    contactName: "Natalie Swanson",
    materialCategories: ["cladding"],
    certifications: ["LEED", "EPD", "ISO 14001"],
    sustainabilityScore: "8.20", maxOrderValue: "2500000", currentCapacity: 80, isPremium: false, verified: true, verificationStatus: "approved",
  },

  // ── Minnesota ─────────────────────────────────────────────────────────────────
  {
    userId: 0, companyName: "North Woods CLT", email: "sales@northwoodsclt.com",
    phone: "612-555-3701", website: "https://northwoodsclt.com",
    address: "700 Washington Ave N", city: "Minneapolis", state: "MN", zipCode: "55401", country: "US",
    latitude: "44.9778", longitude: "-93.2650",
    description: "CLT, NLT, and glulam from sustainably managed Minnesota forests. Deep expertise in cold-climate detailing.",
    contactName: "Erik Larson",
    materialCategories: ["mass timber", "structural", "wood"],
    certifications: ["FSC", "LEED", "EPD"],
    sustainabilityScore: "9.20", maxOrderValue: "4000000", currentCapacity: 76, isPremium: true, verified: true, verificationStatus: "approved",
  },
  {
    userId: 0, companyName: "Twin Cities Mineral Wool", email: "orders@tcmineralwool.com",
    phone: "651-555-3802", website: "https://tcmineralwool.com",
    address: "1700 University Ave W", city: "Saint Paul", state: "MN", zipCode: "55104", country: "US",
    latitude: "44.9537", longitude: "-93.0900",
    description: "Rockwool and slag-wool continuous insulation boards for below-grade, walls, and roofs in Minnesota's Zone 6/7.",
    contactName: "Anna Eriksen",
    materialCategories: ["insulation"],
    certifications: ["GREENGUARD Gold", "LEED", "EPD", "Energy Star"],
    sustainabilityScore: "8.60", maxOrderValue: "1500000", currentCapacity: 83, isPremium: false, verified: true, verificationStatus: "approved",
  },

  // ── Michigan ──────────────────────────────────────────────────────────────────
  {
    userId: 0, companyName: "Motor City Recycled Steel", email: "supply@motorcitysteel.com",
    phone: "313-555-3901", website: "https://motorcitysteel.com",
    address: "4500 W Jefferson Ave", city: "Detroit", state: "MI", zipCode: "48209", country: "US",
    latitude: "42.3314", longitude: "-83.0458",
    description: "Structural steel fabricated from Michigan auto industry scrap. 98% recycled content, EPD documented.",
    contactName: "James Powell",
    materialCategories: ["steel", "structural", "recycled"],
    certifications: ["EPD", "ISO 14001", "LEED"],
    sustainabilityScore: "8.70", maxOrderValue: "5000000", currentCapacity: 88, isPremium: true, verified: true, verificationStatus: "approved",
  },

  // ── Virginia ──────────────────────────────────────────────────────────────────
  {
    userId: 0, companyName: "Blue Ridge Timber Systems", email: "info@blueridgetimber.com",
    phone: "540-555-4001", website: "https://blueridgetimber.com",
    address: "3100 Peters Creek Rd", city: "Roanoke", state: "VA", zipCode: "24019", country: "US",
    latitude: "37.2710", longitude: "-79.9414",
    description: "Timber frame and heavy timber construction using Appalachian hardwoods with SFI and FSC chain of custody.",
    contactName: "William Carter",
    materialCategories: ["wood", "structural", "mass timber"],
    certifications: ["FSC", "SFI", "LEED"],
    sustainabilityScore: "8.50", maxOrderValue: "3000000", currentCapacity: 72, isPremium: false, verified: true, verificationStatus: "approved",
  },
  {
    userId: 0, companyName: "DC Metro Green Glass", email: "bids@dcmetrogreenglass.com",
    phone: "703-555-4102", website: "https://dcmetrogreenglass.com",
    address: "6400 Arlington Blvd", city: "Falls Church", state: "VA", zipCode: "22042", country: "US",
    latitude: "38.8816", longitude: "-77.1711",
    description: "High-performance glazing systems for government and commercial projects. NFRC-certified window and curtainwall assemblies.",
    contactName: "Ellen Kim",
    materialCategories: ["glass", "cladding"],
    certifications: ["Energy Star", "LEED", "GREENGUARD Gold"],
    sustainabilityScore: "8.30", maxOrderValue: "4000000", currentCapacity: 85, isPremium: true, verified: true, verificationStatus: "approved",
  },

  // ── Tennessee ─────────────────────────────────────────────────────────────────
  {
    userId: 0, companyName: "Music City Green Concrete", email: "dispatch@musiccitygreenconcrete.com",
    phone: "615-555-4201", website: "https://musiccitygreenconcrete.com",
    address: "1800 Charlotte Ave", city: "Nashville", state: "TN", zipCode: "37203", country: "US",
    latitude: "36.1627", longitude: "-86.7816",
    description: "Slag-cement and fly-ash blended ready-mix serving Nashville's booming commercial construction sector.",
    contactName: "Josh Martin",
    materialCategories: ["concrete", "structural"],
    certifications: ["EPD", "LEED", "Green Seal"],
    sustainabilityScore: "8.00", maxOrderValue: "2500000", currentCapacity: 90, isPremium: false, verified: true, verificationStatus: "approved",
  },

  // ── Missouri ──────────────────────────────────────────────────────────────────
  {
    userId: 0, companyName: "Gateway City Steel Works", email: "sales@gatewaysteel.com",
    phone: "314-555-4301", website: "https://gatewaysteel.com",
    address: "2900 Chouteau Ave", city: "Saint Louis", state: "MO", zipCode: "63103", country: "US",
    latitude: "38.6270", longitude: "-90.1994",
    description: "EAF steel producer supplying the Midwest with structural shapes and plates — over 90% recycled content.",
    contactName: "Harold Jackson",
    materialCategories: ["steel", "structural", "recycled"],
    certifications: ["EPD", "ISO 14001"],
    sustainabilityScore: "8.10", maxOrderValue: "5000000", currentCapacity: 92, isPremium: false, verified: true, verificationStatus: "approved",
  },

  // ── Indiana ────────────────────────────────────────────────────────────────────
  {
    userId: 0, companyName: "Crossroads Green Insulation", email: "orders@crossroadsinsulation.com",
    phone: "317-555-4401", website: "https://crossroadsinsulation.com",
    address: "3700 Industrial Blvd", city: "Indianapolis", state: "IN", zipCode: "46241", country: "US",
    latitude: "39.7684", longitude: "-86.1581",
    description: "Full-line insulation distributor for Indiana and surrounding states. Specialty in passive house assemblies.",
    contactName: "Lori Chambers",
    materialCategories: ["insulation"],
    certifications: ["GREENGUARD Gold", "LEED", "Energy Star"],
    sustainabilityScore: "7.70", maxOrderValue: "1000000", currentCapacity: 80, isPremium: false, verified: true, verificationStatus: "approved",
  },

  // ── Wisconsin ──────────────────────────────────────────────────────────────────
  {
    userId: 0, companyName: "Badger State Reclaimed Wood", email: "info@badgerstatereclaimedwood.com",
    phone: "414-555-4501", website: "https://badgerstatereclaimedwood.com",
    address: "800 E Greenfield Ave", city: "Milwaukee", state: "WI", zipCode: "53204", country: "US",
    latitude: "43.0389", longitude: "-87.9065",
    description: "Reclaimed barn board, industrial timber, and factory-salvaged hardwood for interior and exterior applications.",
    contactName: "Tim Kowalski",
    materialCategories: ["wood", "flooring", "recycled"],
    certifications: ["FSC", "LEED"],
    sustainabilityScore: "8.30", maxOrderValue: "500000", currentCapacity: 62, isPremium: false, verified: true, verificationStatus: "approved",
  },

  // ── Nevada ─────────────────────────────────────────────────────────────────────
  {
    userId: 0, companyName: "Desert Steel Nevada", email: "bids@desertsteelnv.com",
    phone: "702-555-4601", website: "https://desertsteelnv.com",
    address: "5000 Arville St", city: "Las Vegas", state: "NV", zipCode: "89118", country: "US",
    latitude: "36.1699", longitude: "-115.1398",
    description: "Structural steel and metal decking for the Las Vegas construction market. 85% recycled content standard.",
    contactName: "Nathan Guerrero",
    materialCategories: ["steel", "structural"],
    certifications: ["EPD", "LEED"],
    sustainabilityScore: "7.90", maxOrderValue: "3500000", currentCapacity: 88, isPremium: false, verified: true, verificationStatus: "approved",
  },
  {
    userId: 0, companyName: "Reno Sustainable Cladding", email: "sales@renocladding.com",
    phone: "775-555-4702", website: "https://renocladding.com",
    address: "1400 E 2nd St", city: "Reno", state: "NV", zipCode: "89502", country: "US",
    latitude: "39.5296", longitude: "-119.8138",
    description: "Zinc and aluminum composite rainscreen panels for Nevada's arid climate. Low-maintenance, recyclable at end of life.",
    contactName: "Diana Flores",
    materialCategories: ["cladding", "recycled"],
    certifications: ["LEED", "ISO 14001"],
    sustainabilityScore: "7.80", maxOrderValue: "1500000", currentCapacity: 75, isPremium: false, verified: true, verificationStatus: "approved",
  },

  // ── New Mexico ─────────────────────────────────────────────────────────────────
  {
    userId: 0, companyName: "Land of Enchantment Adobe", email: "info@nmadobe.com",
    phone: "505-555-4801", website: "https://nmadobe.com",
    address: "3200 Cerrillos Rd", city: "Santa Fe", state: "NM", zipCode: "87507", country: "US",
    latitude: "35.6870", longitude: "-105.9378",
    description: "Adobe blocks, rammed earth, and stabilized earth plasters from New Mexico soils. Zero embodied carbon.",
    contactName: "Rosario Valdez",
    materialCategories: ["structural", "sustainable"],
    certifications: ["LEED", "Living Building Challenge"],
    sustainabilityScore: "9.80", maxOrderValue: "500000", currentCapacity: 55, isPremium: false, verified: true, verificationStatus: "approved",
  },

  // ── Maryland / DC Metro ────────────────────────────────────────────────────────
  {
    userId: 0, companyName: "Chesapeake Green Concrete", email: "orders@chesapeakegreenconcrete.com",
    phone: "410-555-4901", website: "https://chesapeakegreenconcrete.com",
    address: "2800 Eastern Blvd", city: "Baltimore", state: "MD", zipCode: "21220", country: "US",
    latitude: "39.2904", longitude: "-76.6122",
    description: "Low-carbon ready-mix serving the mid-Atlantic market with slag and fly-ash blends up to 50% SCM.",
    contactName: "George Banks",
    materialCategories: ["concrete", "structural"],
    certifications: ["EPD", "LEED", "Green Seal"],
    sustainabilityScore: "8.20", maxOrderValue: "3000000", currentCapacity: 90, isPremium: false, verified: true, verificationStatus: "approved",
  },

  // ── Connecticut ────────────────────────────────────────────────────────────────
  {
    userId: 0, companyName: "Yankee Green Building Products", email: "sales@yankeegreenbuild.com",
    phone: "860-555-5001", website: "https://yankeegreenbuild.com",
    address: "1100 New Britain Ave", city: "Hartford", state: "CT", zipCode: "06106", country: "US",
    latitude: "41.7658", longitude: "-72.6851",
    description: "LEED-focused distributor for New England: insulation, windows, and low-carbon concrete additives.",
    contactName: "Susan Holt",
    materialCategories: ["insulation", "glass", "concrete"],
    certifications: ["LEED", "Energy Star", "GREENGUARD Gold"],
    sustainabilityScore: "8.10", maxOrderValue: "1500000", currentCapacity: 80, isPremium: false, verified: true, verificationStatus: "approved",
  },

  // ── South Carolina ─────────────────────────────────────────────────────────────
  {
    userId: 0, companyName: "Lowcountry Sustainable Roofing", email: "info@lowcountryroofing.com",
    phone: "843-555-5101", website: "https://lowcountryroofing.com",
    address: "4500 Savannah Hwy", city: "Charleston", state: "SC", zipCode: "29407", country: "US",
    latitude: "32.7765", longitude: "-79.9311",
    description: "Metal roofing and standing-seam systems with recycled steel content, engineered for coastal wind loads.",
    contactName: "Wesley Brown",
    materialCategories: ["roofing", "steel"],
    certifications: ["Energy Star", "LEED"],
    sustainabilityScore: "7.90", maxOrderValue: "1800000", currentCapacity: 82, isPremium: false, verified: true, verificationStatus: "approved",
  },

  // ── Louisiana ──────────────────────────────────────────────────────────────────
  {
    userId: 0, companyName: "Bayou Geopolymer Concrete", email: "dispatch@bayougeopolymer.com",
    phone: "504-555-5201", website: "https://bayougeopolymer.com",
    address: "3800 Magazine St", city: "New Orleans", state: "LA", zipCode: "70115", country: "US",
    latitude: "29.9511", longitude: "-90.0715",
    description: "Geopolymer concrete for below-grade and marine applications. Excellent sulfate resistance for Louisiana soils.",
    contactName: "Pierre Thibodaux",
    materialCategories: ["concrete", "structural"],
    certifications: ["EPD", "LEED"],
    sustainabilityScore: "8.60", maxOrderValue: "2500000", currentCapacity: 85, isPremium: false, verified: true, verificationStatus: "approved",
  },

  // ── Kansas ─────────────────────────────────────────────────────────────────────
  {
    userId: 0, companyName: "Sunflower State Steel Supply", email: "orders@sunflowersteel.com",
    phone: "316-555-5301", website: "https://sunflowersteel.com",
    address: "2100 S Seneca St", city: "Wichita", state: "KS", zipCode: "67213", country: "US",
    latitude: "37.6922", longitude: "-97.3375",
    description: "Structural steel service center serving Kansas and Oklahoma. High-recycled-content structural shapes and plate.",
    contactName: "Bradley Hughes",
    materialCategories: ["steel", "structural"],
    certifications: ["EPD", "ISO 14001"],
    sustainabilityScore: "7.80", maxOrderValue: "4000000", currentCapacity: 88, isPremium: false, verified: true, verificationStatus: "approved",
  },

  // ── Utah ────────────────────────────────────────────────────────────────────────
  {
    userId: 0, companyName: "Wasatch Green Concrete", email: "bids@wasatchgreenconcrete.com",
    phone: "801-555-5401", website: "https://wasatchgreenconcrete.com",
    address: "2600 S 300 W", city: "Salt Lake City", state: "UT", zipCode: "84115", country: "US",
    latitude: "40.7608", longitude: "-111.8910",
    description: "Ready-mix supplier with high fly-ash blends for Utah's booming commercial market. EPD on all mixes.",
    contactName: "Crystal Jensen",
    materialCategories: ["concrete", "structural"],
    certifications: ["EPD", "LEED"],
    sustainabilityScore: "8.00", maxOrderValue: "2800000", currentCapacity: 90, isPremium: false, verified: true, verificationStatus: "approved",
  },
  {
    userId: 0, companyName: "Red Rock Reclaimed Stone", email: "info@redrockstone.com",
    phone: "435-555-5502", website: "https://redrockstone.com",
    address: "1500 W Sunset Blvd", city: "St. George", state: "UT", zipCode: "84770", country: "US",
    latitude: "37.0965", longitude: "-113.5684",
    description: "Reclaimed sandstone, basalt, and quartzite for cladding, paving, and landscape applications.",
    contactName: "Clay Burnett",
    materialCategories: ["cladding", "sustainable", "recycled"],
    certifications: ["LEED"],
    sustainabilityScore: "9.00", maxOrderValue: "800000", currentCapacity: 65, isPremium: false, verified: true, verificationStatus: "approved",
  },

  // ── Nebraska ────────────────────────────────────────────────────────────────────
  {
    userId: 0, companyName: "Cornhusker Green Build Supply", email: "sales@cornhuskergreenbuild.com",
    phone: "402-555-5601", website: "https://cornhuskergreenbuild.com",
    address: "3300 S 13th St", city: "Omaha", state: "NE", zipCode: "68108", country: "US",
    latitude: "41.2565", longitude: "-95.9345",
    description: "Full-service LEED materials distributor for Nebraska and Iowa commercial projects.",
    contactName: "Karen Olson",
    materialCategories: ["insulation", "concrete", "steel"],
    certifications: ["LEED", "EPD", "Energy Star"],
    sustainabilityScore: "7.70", maxOrderValue: "2000000", currentCapacity: 80, isPremium: false, verified: true, verificationStatus: "approved",
  },

  // ── Iowa ─────────────────────────────────────────────────────────────────────────
  {
    userId: 0, companyName: "Hawkeye Sustainable Framing", email: "orders@hawkeyeframing.com",
    phone: "515-555-5701", website: "https://hawkeyeframing.com",
    address: "2400 E University Ave", city: "Des Moines", state: "IA", zipCode: "50317", country: "US",
    latitude: "41.6005", longitude: "-93.6091",
    description: "Advanced framing lumber packages with FSC-certified dimensional lumber and engineered wood products.",
    contactName: "Mark Sullivan",
    materialCategories: ["wood", "structural"],
    certifications: ["FSC", "LEED"],
    sustainabilityScore: "7.90", maxOrderValue: "1500000", currentCapacity: 78, isPremium: false, verified: true, verificationStatus: "approved",
  },

  // ── New Hampshire ─────────────────────────────────────────────────────────────
  {
    userId: 0, companyName: "Granite State Reclaimed Timber", email: "info@granitstatereclaimed.com",
    phone: "603-555-5801", website: "https://granitestatereclaimed.com",
    address: "150 Commercial St", city: "Manchester", state: "NH", zipCode: "03101", country: "US",
    latitude: "42.9956", longitude: "-71.4548",
    description: "Reclaimed industrial timbers and barn boards from historic New England structures.",
    contactName: "Andrew Frost",
    materialCategories: ["wood", "flooring", "recycled"],
    certifications: ["FSC", "LEED"],
    sustainabilityScore: "8.70", maxOrderValue: "400000", currentCapacity: 58, isPremium: false, verified: true, verificationStatus: "approved",
  },

  // ── Idaho ──────────────────────────────────────────────────────────────────────
  {
    userId: 0, companyName: "Snake River Timber Co.", email: "sales@snakeriverttimber.com",
    phone: "208-555-5901", website: "https://snakeriverttimber.com",
    address: "1200 W Broad St", city: "Boise", state: "ID", zipCode: "83702", country: "US",
    latitude: "43.6150", longitude: "-116.2023",
    description: "Ponderosa pine and Idaho white fir framing and heavy timber, FSC-certified with low-embodied-carbon profiles.",
    contactName: "Shane Trout",
    materialCategories: ["wood", "structural", "mass timber"],
    certifications: ["FSC", "LEED", "SFI"],
    sustainabilityScore: "8.40", maxOrderValue: "2000000", currentCapacity: 75, isPremium: false, verified: true, verificationStatus: "approved",
  },

  // ── Montana ────────────────────────────────────────────────────────────────────
  {
    userId: 0, companyName: "Big Sky Reclaimed Wood", email: "info@bigskyreclaimed.com",
    phone: "406-555-6001", website: "https://bigskyreclaimed.com",
    address: "4500 Brooks St", city: "Missoula", state: "MT", zipCode: "59801", country: "US",
    latitude: "46.8721", longitude: "-113.9940",
    description: "Montana lodgepole pine, larch, and reclaimed ranch timber for cabin, commercial, and resort projects.",
    contactName: "Dan Hawk",
    materialCategories: ["wood", "flooring", "recycled"],
    certifications: ["FSC", "SFI"],
    sustainabilityScore: "8.50", maxOrderValue: "600000", currentCapacity: 60, isPremium: false, verified: true, verificationStatus: "approved",
  },

  // ── Hawaii ─────────────────────────────────────────────────────────────────────
  {
    userId: 0, companyName: "Aloha Green Cladding", email: "projects@alohagreencladding.com",
    phone: "808-555-6101", website: "https://alohagreencladding.com",
    address: "750 Nimitz Hwy", city: "Honolulu", state: "HI", zipCode: "96817", country: "US",
    latitude: "21.3069", longitude: "-157.8583",
    description: "Fiber cement, recycled composite, and locally-sourced lava rock cladding for Hawaii's tropical building codes.",
    contactName: "Kaimana Hale",
    materialCategories: ["cladding", "sustainable"],
    certifications: ["LEED", "GREENGUARD Gold"],
    sustainabilityScore: "8.60", maxOrderValue: "1000000", currentCapacity: 65, isPremium: false, verified: true, verificationStatus: "approved",
  },

  // ── Alaska ─────────────────────────────────────────────────────────────────────
  {
    userId: 0, companyName: "Last Frontier Insulation", email: "orders@lastfrontierinsulation.com",
    phone: "907-555-6201", website: "https://lastfrontierinsulation.com",
    address: "4000 Old Seward Hwy", city: "Anchorage", state: "AK", zipCode: "99503", country: "US",
    latitude: "61.2181", longitude: "-149.9003",
    description: "Sub-arctic rated mineral wool and polyiso insulation engineered for permafrost and extreme cold climates.",
    contactName: "Robert Tundra",
    materialCategories: ["insulation"],
    certifications: ["GREENGUARD Gold", "Energy Star", "LEED"],
    sustainabilityScore: "8.20", maxOrderValue: "1200000", currentCapacity: 70, isPremium: false, verified: true, verificationStatus: "approved",
  },
];

// ─── Seed Function ────────────────────────────────────────────────────────────

async function main() {
  const force = process.argv.includes("--force");

  // Check for existing seed rows
  const existing = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(suppliers)
    .where(eq(suppliers.userId, 0));
  const existingCount = existing[0]?.count ?? 0;

  if (existingCount > 0 && !force) {
    console.log(`Skipping — ${existingCount} seed rows already exist. Run with --force to wipe and re-seed.`);
    await pool.end();
    return;
  }

  if (force && existingCount > 0) {
    console.log(`--force: deleting ${existingCount} existing seed rows...`);
    await db.delete(suppliers).where(eq(suppliers.userId, 0));
  }

  console.log(`Seeding ${SUPPLIERS.length} suppliers...`);

  let inserted = 0;
  let errors = 0;

  for (const s of SUPPLIERS) {
    try {
      await db.insert(suppliers).values({
        userId: s.userId,
        companyName: s.companyName,
        email: s.email,
        phone: s.phone,
        website: s.website,
        address: s.address,
        city: s.city,
        state: s.state,
        zipCode: s.zipCode,
        country: s.country,
        latitude: s.latitude,
        longitude: s.longitude,
        description: s.description,
        contactName: s.contactName,
        materialCategories: s.materialCategories,
        certifications: s.certifications,
        sustainabilityScore: s.sustainabilityScore,
        maxOrderValue: s.maxOrderValue,
        currentCapacity: s.currentCapacity,
        isPremium: s.isPremium,
        verified: s.verified,
        verificationStatus: s.verificationStatus,
      });
      process.stdout.write(".");
      inserted++;
    } catch (err) {
      console.error(`\n  ✗ ${s.companyName}: ${err}`);
      errors++;
    }
  }

  console.log(`\nDone. ${inserted} inserted, ${errors} errors.`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  pool.end();
  process.exit(1);
});
