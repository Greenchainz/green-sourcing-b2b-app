/**
 * Material Shipping Classes
 *
 * Classifies each GreenChainz material category by its real-world logistics
 * profile. This drives the default matching radius in matchSuppliers — nobody
 * is flying cinder blocks across the country.
 *
 * Classes:
 *   local_heavy        — heavy/bulky commodity materials; freight kills the economics beyond ~100 mi
 *   regional           — can travel via distributor/LTL; typically 250–500 mi
 *   national_specialty — high-value/engineered products worth long-haul freight
 *   digital_data       — software, APIs, data — no distance limit
 */

export type ShippingClass =
  | "local_heavy"
  | "regional"
  | "national_specialty"
  | "digital_data";

/** Category label → shipping class */
export const MATERIAL_SHIPPING_CLASS: Readonly<Record<string, ShippingClass>> = {
  "Concrete & Masonry":  "local_heavy",        // ready-mix, CMU, aggregates, brick
  "Steel & Metal":       "national_specialty",  // structural steel ships via fabricator networks
  "Timber & Wood":       "national_specialty",  // mass timber/CLT ships nationally
  "Insulation":          "regional",
  "Roofing":             "regional",
  "Flooring":            "regional",
  "Glazing & Windows":   "regional",
  "HVAC Systems":        "regional",
  "Electrical":          "regional",
  "Plumbing":            "regional",
  "Interior Finishes":   "regional",
  "Doors & Hardware":    "regional",
  "Cladding & Facades":  "national_specialty",  // curtain wall / specialty envelope
  "Other":               "regional",
} as const;

/** Default match radius (miles) per shipping class.
 *  Suppliers can override this with their declared serviceRadiusMiles / shipsNationwide. */
export const DEFAULT_RADIUS_MILES: Readonly<Record<ShippingClass, number>> = {
  local_heavy:        100,
  regional:           400,
  national_specialty: 2_500, // continental US diagonal ≈ 2,800 mi → effectively nationwide
  digital_data:       Infinity,
} as const;

/** Hard cutoff beyond which a local_heavy supplier is excluded unless they
 *  explicitly declare a wider service area or shipsNationwide. */
export const LOCAL_HEAVY_HARD_CUTOFF_MILES = 150;

/** Resolve shipping class from a raw category string (case-insensitive partial match). */
export function getShippingClass(category: string): ShippingClass {
  const direct = MATERIAL_SHIPPING_CLASS[category];
  if (direct) return direct;

  const lower = category.toLowerCase();
  for (const [key, cls] of Object.entries(MATERIAL_SHIPPING_CLASS)) {
    if (key.toLowerCase().includes(lower) || lower.includes(key.toLowerCase().split(" ")[0]!)) {
      return cls;
    }
  }
  return "regional"; // safe default
}

/** Given a supplier's declared service fields and the RFQ's distance, decide
 *  whether the supplier is within range.
 *
 *  Priority order:
 *    1. shipsNationwide → always eligible
 *    2. statesServed list → eligible if project state is in the list
 *    3. serviceRadiusMiles (declared by supplier) → eligible if distance ≤ radius
 *    4. defaultRadiusMiles (from category class) → eligible if distance ≤ default
 */
export function isWithinServiceArea(params: {
  distanceMiles: number | null;   // null if we don't have coordinates
  projectState: string;           // 2-char state code
  supplierState: string | null;
  shipsNationwide: boolean;
  statesServed: string[] | null;
  serviceRadiusMiles: number | null;
  shippingClass: ShippingClass;
}): boolean {
  const {
    distanceMiles,
    projectState,
    supplierState,
    shipsNationwide,
    statesServed,
    serviceRadiusMiles,
    shippingClass,
  } = params;

  // 1. Nationwide shipping declared
  if (shipsNationwide) return true;

  // 2. Explicit states list
  if (statesServed && statesServed.length > 0) {
    if (statesServed.map((s) => s.toUpperCase()).includes(projectState.toUpperCase())) return true;
    // If they declared states and project state isn't in the list, exclude them
    // (unless distance check below passes — belt-and-suspenders for national specialties)
    if (shippingClass !== "national_specialty") return false;
  }

  // 3. Distance-based checks (require coordinates)
  if (distanceMiles == null) {
    // No coordinates — fall back to state match
    return (
      !!(supplierState && projectState && supplierState.toUpperCase() === projectState.toUpperCase())
    );
  }

  const maxRadius = serviceRadiusMiles ?? DEFAULT_RADIUS_MILES[shippingClass];

  // Hard cutoff for local-heavy materials regardless of any other logic
  if (
    shippingClass === "local_heavy" &&
    serviceRadiusMiles == null &&
    distanceMiles > LOCAL_HEAVY_HARD_CUTOFF_MILES
  ) {
    return false;
  }

  return distanceMiles <= maxRadius;
}
