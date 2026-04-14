/**
 * Swap Validation Service
 *
 * Validates material substitutions based on functional equivalence.
 * Checks structural performance, fire safety, density, and tensile strength.
 * Calculates LEED credit potential and IBC code compliance.
 *
 * Expected schema (materials table already exists):
 *
 * -- CREATE TABLE materials (
 * --   id SERIAL PRIMARY KEY,
 * --   name VARCHAR(255) NOT NULL,
 * --   category VARCHAR(100) NOT NULL,
 * --   "gwpValue" DECIMAL(12,4),
 * --   "fireRating" VARCHAR(50),
 * --   "recycledContentPct" DECIMAL(5,2),
 * --   "compressiveStrength" DECIMAL(12,2),   -- psi
 * --   "tensileStrength" DECIMAL(12,2),       -- psi
 * --   "flexuralStrength" DECIMAL(12,2),      -- psi
 * --   density DECIMAL(10,4),                 -- lb/ft3
 * --   "thermalConductivity" DECIMAL(8,4),
 * --   "waterAbsorption" DECIMAL(8,4),
 * --   "embodiedEnergy" DECIMAL(12,4),        -- MJ/kg
 * --   voc DECIMAL(8,4),                      -- g/L
 * --   "epdUrl" TEXT,
 * --   certifications TEXT[],
 * --   "pricePerUnit" DECIMAL(12,2),
 * --   "priceUnit" VARCHAR(50),
 * --   "createdAt" TIMESTAMP DEFAULT NOW(),
 * --   "updatedAt" TIMESTAMP DEFAULT NOW()
 * -- );
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export type PassFail = 'PASS' | 'FAIL';

export interface MaterialSpec {
  materialId: number;
  materialName: string;
  category: string;
  specs: {
    compressiveStrength?: number | null;
    tensileStrength?: number | null;
    flexuralStrength?: number | null;
    density?: number | null;
    thermalConductivity?: number | null;
    fireRating?: string | null;
    waterAbsorption?: number | null;
    gwp?: number | null;
    recycledContent?: number | null;
    voc?: number | null;
    embodiedEnergy?: number | null;
  };
  certifications: string[];
  epdUrl?: string | null;
}

export interface SwapValidationResult {
  valid: boolean;
  checks: {
    compressiveStrength: PassFail;
    fireRating: PassFail;
    density: PassFail;
  };
  warnings: string[];
  leedCredits: LeedCredits;
  // Derived fields used when persisting to swapValidations table
  validationStatus: 'APPROVED' | 'EXPERIMENTAL' | 'REJECTED';
  overallScore: number;
  showstopperResults: Record<string, PassFail>;
  failedChecks: string[];
  passedChecks: string[];
  skippedChecks: string[];
  recommendation: string;
}

export interface LeedCredits {
  potentialPoints: number;
  categories: { credit: string; points: number; reason: string }[];
}

export interface ComplianceResult {
  compliant: boolean;
  issues: string[];
}

// ─── Fire Rating Hierarchy ──────────────────────────────────────────────────

const FIRE_RATING_RANK: Record<string, number> = {
  'A': 4,
  'B': 3,
  'C': 2,
  'D': 1,
};

function getFireRatingRank(rating: string | null | undefined): number {
  if (!rating) return 0;
  const upper = rating.trim().toUpperCase();
  return FIRE_RATING_RANK[upper] ?? 0;
}

// ─── IBC Building Type Fire Requirements ────────────────────────────────────

const IBC_FIRE_REQUIREMENTS: Record<string, { minFireRating: string; minCompressiveStrength: number }> = {
  'Type I':  { minFireRating: 'A', minCompressiveStrength: 4000 },
  'Type II': { minFireRating: 'B', minCompressiveStrength: 3000 },
  'Type III': { minFireRating: 'B', minCompressiveStrength: 2500 },
  'Type IV': { minFireRating: 'C', minCompressiveStrength: 2000 },
  'Type V':  { minFireRating: 'D', minCompressiveStrength: 1500 },
};

// ─── Validation Functions ───────────────────────────────────────────────────

/**
 * Validate a material swap between original and substitute.
 * - compressiveStrength: substitute >= original (PASS/FAIL)
 * - fireRating: substitute >= original using rating hierarchy (PASS/FAIL)
 * - density: within +/-30% (PASS/FAIL)
 * - tensileStrength: within +/-20% (WARN if outside, does not FAIL)
 */
export function validateSwap(
  original: MaterialSpec,
  substitute: MaterialSpec
): SwapValidationResult {
  const warnings: string[] = [];

  // Check compressive strength: substitute must be >= original
  let compressiveStrengthCheck: PassFail = 'PASS';
  const origCS = original.specs.compressiveStrength;
  const subCS = substitute.specs.compressiveStrength;
  if (origCS != null && subCS != null) {
    if (subCS < origCS) {
      compressiveStrengthCheck = 'FAIL';
    }
  } else if (origCS != null && subCS == null) {
    compressiveStrengthCheck = 'FAIL';
    warnings.push('Substitute material is missing compressive strength data');
  }

  // Check fire rating: substitute must be >= original
  let fireRatingCheck: PassFail = 'PASS';
  const origFR = original.specs.fireRating;
  const subFR = substitute.specs.fireRating;
  if (origFR) {
    const origRank = getFireRatingRank(origFR);
    const subRank = getFireRatingRank(subFR);
    if (subRank < origRank) {
      fireRatingCheck = 'FAIL';
    }
    if (!subFR) {
      warnings.push('Substitute material is missing fire rating data');
    }
  }

  // Check density: within +/-30%
  let densityCheck: PassFail = 'PASS';
  const origDensity = original.specs.density;
  const subDensity = substitute.specs.density;
  if (origDensity != null && subDensity != null && origDensity > 0) {
    const ratio = Math.abs(subDensity - origDensity) / origDensity;
    if (ratio > 0.3) {
      densityCheck = 'FAIL';
    }
  } else if (origDensity != null && subDensity == null) {
    densityCheck = 'FAIL';
    warnings.push('Substitute material is missing density data');
  }

  // Check tensile strength (warning only, not a FAIL condition)
  const origTS = original.specs.tensileStrength;
  const subTS = substitute.specs.tensileStrength;
  if (origTS != null && subTS != null && origTS > 0) {
    const ratio = Math.abs(subTS - origTS) / origTS;
    if (ratio > 0.2) {
      warnings.push(
        `Tensile strength differs by ${(ratio * 100).toFixed(1)}% (original: ${origTS}, substitute: ${subTS}) — outside +/-20% range`
      );
    }
  }

  // GWP warning if substitute is higher
  if (original.specs.gwp != null && substitute.specs.gwp != null) {
    if (substitute.specs.gwp > original.specs.gwp) {
      warnings.push(
        `Substitute has higher GWP (${substitute.specs.gwp}) than original (${original.specs.gwp})`
      );
    }
  }

  const valid =
    compressiveStrengthCheck === 'PASS' &&
    fireRatingCheck === 'PASS' &&
    densityCheck === 'PASS';

  const leedCredits = calculateLeedCredits(original, substitute);

  const checksObj = {
    compressiveStrength: compressiveStrengthCheck,
    fireRating: fireRatingCheck,
    density: densityCheck,
  };

  const passedChecks = (Object.entries(checksObj) as [string, PassFail][])
    .filter(([, v]) => v === 'PASS').map(([k]) => k);
  const failedChecks = (Object.entries(checksObj) as [string, PassFail][])
    .filter(([, v]) => v === 'FAIL').map(([k]) => k);
  const totalChecks = Object.keys(checksObj).length;
  const overallScore = totalChecks > 0 ? Math.round((passedChecks.length / totalChecks) * 100) : 0;
  const validationStatus: 'APPROVED' | 'EXPERIMENTAL' | 'REJECTED' =
    valid ? 'APPROVED' : failedChecks.length === 1 ? 'EXPERIMENTAL' : 'REJECTED';
  const recommendation = valid
    ? `Swap approved. ${original.materialName} can be substituted with ${substitute.materialName}.`
    : `Swap not recommended. ${substitute.materialName} fails ${failedChecks.join(', ')} checks vs ${original.materialName}.`;

  return {
    valid,
    checks: checksObj,
    warnings,
    leedCredits,
    validationStatus,
    overallScore,
    showstopperResults: checksObj,
    failedChecks,
    passedChecks,
    skippedChecks: [],
    recommendation,
  };
}

// ─── LEED Credit Calculation ────────────────────────────────────────────────

/**
 * Calculate potential LEED credits from a material swap.
 * - MR Credit 2: Construction Waste Management (higher recycled content)
 * - MR Credit 4: Recycled Content >= 20%
 * - MR Credit 5: Regional Materials flag
 * - EA Credit 1: Optimize Energy Performance (lower embodied energy)
 */
export function calculateLeedCredits(
  original: MaterialSpec,
  substitute: MaterialSpec
): LeedCredits {
  const categories: { credit: string; points: number; reason: string }[] = [];

  // MR Credit 2 — Construction Waste Management
  const origRC = original.specs.recycledContent ?? 0;
  const subRC = substitute.specs.recycledContent ?? 0;
  if (subRC > origRC) {
    categories.push({
      credit: 'MR Credit 2 — Construction Waste Management',
      points: 1,
      reason: `Substitute has higher recycled content (${subRC}%) vs original (${origRC}%)`,
    });
  }

  // MR Credit 4 — Recycled Content
  if (subRC >= 20) {
    categories.push({
      credit: 'MR Credit 4 — Recycled Content',
      points: 2,
      reason: `Recycled content of ${subRC}% meets or exceeds the 20% threshold`,
    });
  }

  // MR Credit 5 — Regional Materials
  // We flag this as a potential opportunity; actual determination requires sourcing data
  categories.push({
    credit: 'MR Credit 5 — Regional Materials',
    points: 1,
    reason: 'Verify if substitute is sourced/manufactured within 500 miles of project site',
  });

  // EA Credit 1 — Optimize Energy Performance
  const origEE = original.specs.embodiedEnergy;
  const subEE = substitute.specs.embodiedEnergy;
  if (origEE != null && subEE != null && subEE < origEE) {
    categories.push({
      credit: 'EA Credit 1 — Optimize Energy Performance',
      points: 1,
      reason: `Lower embodied energy: ${subEE} MJ/kg vs ${origEE} MJ/kg`,
    });
  }

  const potentialPoints = categories.reduce((sum, c) => sum + c.points, 0);

  return { potentialPoints, categories };
}

// ─── Code Compliance Check ──────────────────────────────────────────────────

/**
 * Check IBC code compliance for a substitute material given a building type.
 * Building types: Type I through Type V.
 */
export function checkCodeCompliance(
  substitute: MaterialSpec,
  buildingType: string
): ComplianceResult {
  const issues: string[] = [];
  const requirements = IBC_FIRE_REQUIREMENTS[buildingType];

  if (!requirements) {
    return {
      compliant: false,
      issues: [`Unknown building type "${buildingType}". Valid types: Type I, Type II, Type III, Type IV, Type V`],
    };
  }

  // Fire rating check
  const subFireRank = getFireRatingRank(substitute.specs.fireRating);
  const reqFireRank = getFireRatingRank(requirements.minFireRating);
  if (subFireRank < reqFireRank) {
    issues.push(
      `Fire rating "${substitute.specs.fireRating ?? 'N/A'}" does not meet ${buildingType} minimum requirement of "${requirements.minFireRating}"`
    );
  }

  // Compressive strength check
  const subCS = substitute.specs.compressiveStrength;
  if (subCS != null) {
    if (subCS < requirements.minCompressiveStrength) {
      issues.push(
        `Compressive strength ${subCS} psi is below ${buildingType} minimum of ${requirements.minCompressiveStrength} psi`
      );
    }
  } else {
    issues.push('Compressive strength data is missing — cannot verify code compliance');
  }

  return {
    compliant: issues.length === 0,
    issues,
  };
}
