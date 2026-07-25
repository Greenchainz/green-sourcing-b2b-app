/**
 * Suggestions Router — powers all typeahead inputs across the platform
 *
 * Endpoints:
 *   suggestions.materials  — material name + category suggestions from DB
 *   suggestions.categories — distinct material categories
 *   suggestions.locations  — US city/state suggestions (static + DB-derived)
 *   suggestions.locationGeo — Nominatim (OSM) geocoded suggestions with lat/lng
 *   suggestions.companies  — supplier/manufacturer name suggestions
 */
import { router, publicProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { materials, manufacturers, scrapedSuppliers } from "../../drizzle/schema";
import { ilike, or, asc } from "drizzle-orm";

// ─── Nominatim cache (in-memory, survives server restarts poorly but free) ────
// Keyed by raw query string; evicted when size > 500.
const _nominatimCache = new Map<string, { label: string; value: string; sublabel?: string; lat: number; lng: number }[]>();

// ─── Static location data ─────────────────────────────────────────────────────
// Top 120 US cities + all 50 states — no external API needed
const US_CITIES = [
  "New York, NY", "Los Angeles, CA", "Chicago, IL", "Houston, TX",
  "Phoenix, AZ", "Philadelphia, PA", "San Antonio, TX", "San Diego, CA",
  "Dallas, TX", "San Jose, CA", "Austin, TX", "Jacksonville, FL",
  "Fort Worth, TX", "Columbus, OH", "Charlotte, NC", "Indianapolis, IN",
  "San Francisco, CA", "Seattle, WA", "Denver, CO", "Nashville, TN",
  "Oklahoma City, OK", "El Paso, TX", "Washington, DC", "Las Vegas, NV",
  "Louisville, KY", "Memphis, TN", "Portland, OR", "Baltimore, MD",
  "Milwaukee, WI", "Albuquerque, NM", "Tucson, AZ", "Fresno, CA",
  "Sacramento, CA", "Mesa, AZ", "Kansas City, MO", "Atlanta, GA",
  "Omaha, NE", "Colorado Springs, CO", "Raleigh, NC", "Long Beach, CA",
  "Virginia Beach, VA", "Minneapolis, MN", "Tampa, FL", "New Orleans, LA",
  "Arlington, TX", "Wichita, KS", "Bakersfield, CA", "Aurora, CO",
  "Anaheim, CA", "Santa Ana, CA", "Corpus Christi, TX", "Riverside, CA",
  "St. Louis, MO", "Lexington, KY", "Pittsburgh, PA", "Stockton, CA",
  "Anchorage, AK", "Cincinnati, OH", "St. Paul, MN", "Greensboro, NC",
  "Toledo, OH", "Newark, NJ", "Plano, TX", "Henderson, NV",
  "Orlando, FL", "Chandler, AZ", "Laredo, TX", "Madison, WI",
  "Durham, NC", "Lubbock, TX", "Winston-Salem, NC", "Garland, TX",
  "Glendale, AZ", "Hialeah, FL", "Reno, NV", "Baton Rouge, LA",
  "Irvine, CA", "Chesapeake, VA", "Norfolk, VA", "Scottsdale, AZ",
  "North Las Vegas, NV", "Fremont, CA", "Gilbert, AZ", "San Bernardino, CA",
  "Birmingham, AL", "Boise, ID", "Rochester, NY", "Richmond, VA",
  "Spokane, WA", "Des Moines, IA", "Montgomery, AL", "Modesto, CA",
  "Fayetteville, NC", "Tacoma, WA", "Shreveport, LA", "Akron, OH",
  "Aurora, IL", "Yonkers, NY", "Huntington Beach, CA", "Little Rock, AR",
  "Columbus, GA", "Glendale, CA", "Grand Rapids, MI", "Salt Lake City, UT",
  "Tallahassee, FL", "Huntsville, AL", "Worcester, MA", "Knoxville, TN",
  "Providence, RI", "Brownsville, TX", "Santa Clarita, CA", "Garden Grove, CA",
  "Oceanside, CA", "Chattanooga, TN", "Fort Lauderdale, FL", "Rancho Cucamonga, CA",
  "Santa Rosa, CA", "Port Arthur, TX", "Tempe, AZ", "Cape Coral, FL",
  "Oxnard, CA", "Eugene, OR", "Peoria, IL", "Salem, OR",
  "Cary, NC", "Corona, CA", "Springfield, MO", "Fort Collins, CO",
  "Jackson, MS", "Alexandria, VA", "Hayward, CA", "Lancaster, CA",
  "Salinas, CA", "Palmdale, CA", "Sunnyvale, CA", "Pomona, CA",
  "Escondido, CA", "Kansas City, KS", "Rockford, IL", "Torrance, CA",
  "Paterson, NJ", "Bridgeport, CT", "Surprise, AZ", "Roseville, CA",
  "Savannah, GA", "Macon, GA", "Danville, VA", "Roanoke, VA",
  "Richmond, VA", "Hampton, VA", "Newport News, VA", "Charlottesville, VA",
];

const US_STATES = [
  "Alabama, AL", "Alaska, AK", "Arizona, AZ", "Arkansas, AR",
  "California, CA", "Colorado, CO", "Connecticut, CT", "Delaware, DE",
  "Florida, FL", "Georgia, GA", "Hawaii, HI", "Idaho, ID",
  "Illinois, IL", "Indiana, IN", "Iowa, IA", "Kansas, KS",
  "Kentucky, KY", "Louisiana, LA", "Maine, ME", "Maryland, MD",
  "Massachusetts, MA", "Michigan, MI", "Minnesota, MN", "Mississippi, MS",
  "Missouri, MO", "Montana, MT", "Nebraska, NE", "Nevada, NV",
  "New Hampshire, NH", "New Jersey, NJ", "New Mexico, NM", "New York, NY",
  "North Carolina, NC", "North Dakota, ND", "Ohio, OH", "Oklahoma, OK",
  "Oregon, OR", "Pennsylvania, PA", "Rhode Island, RI", "South Carolina, SC",
  "South Dakota, SD", "Tennessee, TN", "Texas, TX", "Utah, UT",
  "Vermont, VT", "Virginia, VA", "Washington, WA", "West Virginia, WV",
  "Wisconsin, WI", "Wyoming, WY", "Washington, DC",
];

// ─── Material type taxonomy (canonical list used across the platform) ─────────
const MATERIAL_TYPES = [
  // Structural
  "Cast-in-place Concrete", "Precast Concrete", "Ready-mix Concrete",
  "Structural Steel", "Rebar", "Steel Decking", "Metal Framing",
  "Mass Timber", "Cross-laminated Timber (CLT)", "Glulam Beam",
  "Structural Lumber", "Engineered Wood", "LVL Beam",
  // Enclosure
  "Brick Masonry", "CMU Block", "Stone Cladding", "Metal Panel Cladding",
  "Fiber Cement Siding", "EIFS / Stucco", "Rainscreen Panel",
  "Curtain Wall Glazing", "Storefront Glazing", "Spandrel Glass",
  "TPO Roofing", "EPDM Roofing", "PVC Roofing", "Metal Roofing",
  "Built-up Roofing (BUR)", "Green Roof Assembly",
  // Insulation
  "Mineral Wool Insulation", "Spray Polyurethane Foam (SPF)",
  "Rigid Polyisocyanurate (Polyiso)", "EPS Insulation", "XPS Insulation",
  "Cellulose Insulation", "Fiberglass Batt Insulation",
  // Interior
  "Gypsum Wallboard", "Acoustic Ceiling Tile", "Suspended Ceiling Grid",
  "Ceramic Tile", "Porcelain Tile", "Luxury Vinyl Tile (LVT)",
  "Carpet Tile", "Hardwood Flooring", "Bamboo Flooring", "Polished Concrete",
  "Epoxy Flooring", "Terrazzo",
  // MEP
  "Copper Piping", "PEX Tubing", "HDPE Pipe", "Ductwork (Sheet Metal)",
  "VRF HVAC System", "Chiller", "Boiler", "Heat Pump",
  "LED Lighting Fixture", "Electrical Conduit",
  // Specialty
  "Acoustic Panel", "Demountable Partition", "Access Flooring",
  "Raised Floor System", "Waterproofing Membrane", "Air Barrier",
  "Vapor Barrier", "Geotextile Fabric",
];

// ─── Router ───────────────────────────────────────────────────────────────────

export const suggestionsRouter = router({
  /**
   * Material name suggestions — searches DB + static taxonomy
   */
  materials: publicProcedure
    .input(z.object({ q: z.string().min(1).max(100) }))
    .query(async ({ input }) => {
      const q = input.q.trim();
      const db = await getDb();

      // 1. Static taxonomy match (instant, no DB hit)
      const staticMatches = MATERIAL_TYPES
        .filter((m) => m.toLowerCase().includes(q.toLowerCase()))
        .slice(0, 5)
        .map((m) => ({ label: m, badge: "type" }));

      // 2. DB materials match
      let dbMatches: { label: string; sublabel?: string; badge?: string }[] = [];
      try {
        if (!db) throw new Error("DB unavailable");
        const rows = await db
          .select({
            name: materials.name,
            productName: materials.productName,
            category: materials.category,
          })
          .from(materials)
          .where(
            or(
              ilike(materials.name, `%${q}%`),
              ilike(materials.productName, `%${q}%`),
              ilike(materials.category, `%${q}%`)
            )
          )
          .orderBy(asc(materials.name))
          .limit(8);

        dbMatches = rows.map((r) => ({
          label: r.productName ?? r.name,
          sublabel: r.name !== (r.productName ?? r.name) ? r.name : undefined,
          badge: r.category ?? undefined,
        }));
      } catch {
        // DB unavailable in dev — fall back to static only
      }

      // Deduplicate: prefer DB results, then static
      const seen = new Set<string>();
      const merged: { label: string; sublabel?: string; badge?: string }[] = [];
      for (const item of [...dbMatches, ...staticMatches]) {
        const key = item.label.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          merged.push(item);
        }
      }

      return merged.slice(0, 8);
    }),

  /**
   * Material category suggestions
   */
  categories: publicProcedure
    .input(z.object({ q: z.string().min(1).max(100) }))
    .query(async ({ input }) => {
      const q = input.q.trim();
      const db = await getDb();

      try {
        if (!db) throw new Error("DB unavailable");
        const rows = await db
          .selectDistinct({ category: materials.category })
          .from(materials)
          .where(ilike(materials.category, `%${q}%`))
          .orderBy(asc(materials.category))
          .limit(10);

        return rows
          .filter((r) => r.category)
          .map((r) => ({ label: r.category! }));
      } catch {
        // Fallback: filter static taxonomy categories
        const cats = [
          "Concrete", "Steel", "Timber", "Masonry", "Glazing",
          "Roofing", "Insulation", "Flooring", "Cladding", "MEP",
          "Acoustic", "Waterproofing", "Specialty",
        ];
        return cats
          .filter((c) => c.toLowerCase().includes(q.toLowerCase()))
          .map((c) => ({ label: c }));
      }
    }),

  /**
   * Location suggestions — US cities and states (no external API)
   */
  locations: publicProcedure
    .input(z.object({ q: z.string().min(1).max(100) }))
    .query(({ input }) => {
      const q = input.q.trim().toLowerCase();

      const cityMatches = US_CITIES
        .filter((c) => c.toLowerCase().includes(q))
        .slice(0, 6)
        .map((c) => ({ label: c, badge: "city" }));

      const stateMatches = US_STATES
        .filter((s) => s.toLowerCase().includes(q))
        .slice(0, 3)
        .map((s) => ({ label: s, badge: "state" }));

      // Cities first, then states, deduped
      const seen = new Set<string>();
      const merged: { label: string; badge: string }[] = [];
      for (const item of [...cityMatches, ...stateMatches]) {
        if (!seen.has(item.label)) {
          seen.add(item.label);
          merged.push(item);
        }
      }
      return merged.slice(0, 8);
    }),

  /**
   * Supplier / manufacturer name suggestions
   */
  companies: publicProcedure
    .input(z.object({ q: z.string().min(1).max(100) }))
    .query(async ({ input }) => {
      const q = input.q.trim();
      const db = await getDb();

      try {
        if (!db) throw new Error("DB unavailable");
        const [mfrs, scraped] = await Promise.all([
          db
            .select({ name: manufacturers.name, category: manufacturers.category })
            .from(manufacturers)
            .where(ilike(manufacturers.name, `%${q}%`))
            .orderBy(asc(manufacturers.name))
            .limit(6),
          db
            .select({ name: scrapedSuppliers.companyName, city: scrapedSuppliers.city, state: scrapedSuppliers.state })
            .from(scrapedSuppliers)
            .where(ilike(scrapedSuppliers.companyName, `%${q}%`))
            .orderBy(asc(scrapedSuppliers.companyName))
            .limit(4),
        ]);

        const seen = new Set<string>();
        const results: { label: string; sublabel?: string; badge?: string }[] = [];

        for (const m of mfrs) {
          if (m.name && !seen.has(m.name.toLowerCase())) {
            seen.add(m.name.toLowerCase());
            results.push({ label: m.name, badge: m.category ?? "manufacturer" });
          }
        }
        for (const s of scraped) {
          if (s.name && !seen.has(s.name.toLowerCase())) {
            seen.add(s.name.toLowerCase());
            results.push({
              label: s.name,
              sublabel: [s.city, s.state].filter(Boolean).join(", ") || undefined,
              badge: "supplier",
            });
          }
        }

        return results.slice(0, 8);
      } catch {
        return [];
      }
    }),

  // ── Geocoded location suggestions via Nominatim (OSM) — no API key ──────────
  // Returns city/address suggestions with lat/lng for map preview + radius matching.
  // In-memory cache prevents hammering Nominatim (ToS: max 1 req/sec).
  locationGeo: publicProcedure
    .input(z.object({ q: z.string().min(3).max(100) }))
    .query(async ({ input }) => {
      const q = input.q.trim();
      const cached = _nominatimCache.get(q);
      if (cached) return cached;

      try {
        const url =
          `https://nominatim.openstreetmap.org/search` +
          `?q=${encodeURIComponent(q)}` +
          `&format=json&addressdetails=1&limit=6&countrycodes=us`;

        const res = await fetch(url, {
          headers: {
            "User-Agent": "GreenChainz/1.0 (founder@greenchainz.com)",
            "Accept-Language": "en-US,en",
          },
          signal: AbortSignal.timeout(4000),
        });

        if (!res.ok) return [];

        type NominatimResult = {
          display_name: string;
          lat: string;
          lon: string;
          address?: { city?: string; town?: string; county?: string; state?: string };
        };
        const data = (await res.json()) as NominatimResult[];

        const results = data.map((item) => {
          // Build a short human-readable label from the address parts
          const addr = item.address ?? {};
          const city = addr.city ?? addr.town ?? addr.county ?? "";
          const state = addr.state ?? "";
          const label = city && state ? `${city}, ${state}` : item.display_name.split(",").slice(0, 2).join(",").trim();
          return {
            label,
            value: label,
            sublabel: item.display_name.split(",").slice(0, 4).join(",").trim(),
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
          };
        });

        // Deduplicate by label
        const seen = new Set<string>();
        const deduped = results.filter((r) => {
          if (seen.has(r.label)) return false;
          seen.add(r.label);
          return true;
        });

        _nominatimCache.set(q, deduped);
        // Evict oldest entry if cache grows large
        if (_nominatimCache.size > 500) {
          _nominatimCache.delete(_nominatimCache.keys().next().value!);
        }

        return deduped;
      } catch {
        return [];
      }
    }),
});
