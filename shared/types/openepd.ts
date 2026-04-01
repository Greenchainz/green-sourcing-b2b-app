/**
 * openEPD-compatible TypeScript types.
 * Based on the openEPD specification by Carbon Change Labs / Building Transparency.
 * See: https://github.com/cchangelabs/openepd
 */

// ── Core Types ───────────────────────────────────────────────────────────────

export interface OpenEPD {
  id: string;                    // Unique EPD identifier
  name: string;                  // Product name
  manufacturer: OpenEPDOrg;
  program_operator: OpenEPDOrg;
  epd_url?: string;              // URL to the EPD document
  date_of_issue?: string;        // ISO date
  valid_until?: string;          // ISO date
  declared_unit: string;         // e.g., "1 m²", "1 metric ton"
  impacts: OpenEPDImpacts;
  product_classes?: Record<string, string>; // Classification systems
  compliance?: string[];         // e.g., ["EN 15804+A2", "ISO 14025"]
  pcr?: OpenEPDPCR;             // Product Category Rules
}

export interface OpenEPDOrg {
  name: string;
  web_domain?: string;
  country?: string;
}

export interface OpenEPDImpacts {
  gwp?: OpenEPDImpactValue;      // Global Warming Potential (kgCO₂e)
  odp?: OpenEPDImpactValue;      // Ozone Depletion Potential
  ap?: OpenEPDImpactValue;       // Acidification Potential
  ep?: OpenEPDImpactValue;       // Eutrophication Potential
  pocp?: OpenEPDImpactValue;     // Photochemical Ozone Creation
  adp_fossil?: OpenEPDImpactValue; // Abiotic Depletion (fossil fuels)
}

export interface OpenEPDImpactValue {
  mean: number;
  unit: string;
  // Life cycle stages
  A1A3?: number;    // Product stage (raw materials + manufacturing)
  A4?: number;      // Transport to site
  A5?: number;      // Construction
  B1B7?: number;    // Use stage
  C1C4?: number;    // End of life
  D?: number;       // Beyond system boundary (reuse/recycling)
}

export interface OpenEPDPCR {
  name: string;
  version?: string;
  issuer?: string;
}

// ── Conversion: GreenChainz → openEPD ────────────────────────────────────────

/**
 * Maps a GreenChainz material record (+ optional manufacturer) to openEPD format.
 * Accepts `any` for the material to avoid coupling this shared type file
 * directly to Drizzle schema types (they live in different TS compilation units).
 */
export function materialToOpenEPD(
  material: {
    id: number;
    name: string;
    productName?: string | null;
    epdNumber?: string | null;
    epdUrl?: string | null;
    epdProgramOperator?: string | null;
    declaredUnit?: string | null;
    gwpValue?: string | null;
    gwpUnit?: string | null;
    epdExpiry?: Date | null;
    hasEpd?: boolean | number | null;
  },
  manufacturer?: {
    name: string;
    website?: string | null;
    headquarters?: string | null;
  } | null,
): OpenEPD {
  return {
    id: material.epdNumber || `gc-${material.id}`,
    name: material.productName || material.name,
    manufacturer: {
      name: manufacturer?.name || "Unknown",
      web_domain: manufacturer?.website || undefined,
      country: manufacturer?.headquarters || undefined,
    },
    program_operator: {
      name: material.epdProgramOperator || "Unknown",
    },
    epd_url: material.epdUrl || undefined,
    valid_until: material.epdExpiry
      ? material.epdExpiry.toISOString().slice(0, 10)
      : undefined,
    declared_unit: material.declaredUnit || "unknown",
    impacts: {
      gwp: material.gwpValue
        ? {
            mean: parseFloat(material.gwpValue),
            unit: material.gwpUnit || "kgCO2e",
          }
        : undefined,
    },
  };
}

// ── Conversion: openEPD → GreenChainz ────────────────────────────────────────

/**
 * Maps an openEPD record to a partial GreenChainz material insert object.
 * The returned object can be spread into a Drizzle `insert().values(...)` call.
 */
export function openEPDToMaterial(epd: OpenEPD): Record<string, unknown> {
  return {
    name: epd.name,
    epdNumber: epd.id,
    epdUrl: epd.epd_url,
    epdExpiry: epd.valid_until ? new Date(epd.valid_until) : undefined,
    gwpValue: epd.impacts.gwp?.mean?.toString(),
    gwpUnit: epd.impacts.gwp?.unit,
    declaredUnit: epd.declared_unit,
    epdProgramOperator: epd.program_operator.name,
    hasEpd: true,
  };
}
