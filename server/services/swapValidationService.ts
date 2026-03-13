/**
 * Swap Validation Service
 *
 * Validates material substitutions based on functional equivalence across
 * critical performance metrics (ASTM codes, fire rating, structural strength,
 * thermal/acoustic performance, certifications, installability).
 *
 * Classification:
 * - APPROVED: All showstoppers pass within tolerance
 * - EXPERIMENTAL: 1-2 minor deviations, requires review
 * - REJECTED: 3+ failures or major deviations
 */

export type ValidationStatus = 'APPROVED' | 'EXPERIMENTAL' | 'REJECTED';

export interface ShowstopperCheck {
  pass: boolean;
  details: string;
  weight: number;
  score: number; // 0-weight
}

export interface ShowstopperResults {
  astmMatch: ShowstopperCheck;
  fireRating: ShowstopperCheck;
  compressiveStrength: ShowstopperCheck;
  tensileStrength: ShowstopperCheck;
  modulusOfElasticity: ShowstopperCheck;
  rValue: ShowstopperCheck;
  permRating: ShowstopperCheck;
  stcRating: ShowstopperCheck;
  iicRating: ShowstopperCheck;
  ulListing: ShowstopperCheck;
  iccEsReport: ShowstopperCheck;
  laborUnits: ShowstopperCheck;
}

export interface ValidationResult {
  validationStatus: ValidationStatus;
  overallScore: number; // 0-100
  showstopperResults: ShowstopperResults;
  failedChecks: number;
  passedChecks: number;
  skippedChecks: number;
  recommendation: string;
}

export interface MaterialTechnicalSpecs {
  // ASTM & Certifications
  astmCodes?: string | null;
  ulListing?: string | null;
  iccEsReportNumber?: string | null;

  // Fire & Safety
  fireRatingHours?: number | null;

  // Structural
  compressiveStrength?: number | null;
  tensileStrength?: number | null;
  modulusOfElasticity?: number | null;

  // Thermal
  rValuePerInch?: number | null;
  permRating?: number | null;

  // Acoustic
  stcRating?: number | null;
  iicRating?: number | null;

  // Installability
  laborUnitsPerUnit?: number | null;
}

// ─── Validation Weights ─────────────────────────────────────────────────────

const WEIGHTS = {
  astmMatch: 15,
  fireRating: 15,
  compressiveStrength: 12,
  tensileStrength: 10,
  rValue: 10,
  stcRating: 8,
  ulListing: 8,
  modulusOfElasticity: 7,
  permRating: 5,
  iicRating: 5,
  iccEsReport: 3,
  laborUnits: 2,
};

// ─── Helper Functions ───────────────────────────────────────────────────────

function parseAstmCodes(codes: string | null | undefined): Set<string> {
  if (!codes) return new Set();
  return new Set(
    codes
      .split(/[,;]/)
      .map(c => c.trim().toUpperCase())
      .filter(c => c.length > 0)
  );
}

function calculatePercentDifference(incumbent: number, sustainable: number): number {
  if (incumbent === 0) return 0;
  return ((sustainable - incumbent) / incumbent) * 100;
}

function getPermClass(permRating: number): number {
  if (permRating <= 0.1) return 1; // Class I
  if (permRating <= 1.0) return 2; // Class II
  if (permRating <= 10) return 3; // Class III
  return 4; // Class IV (not a vapor retarder)
}

// ─── Showstopper Check Functions ────────────────────────────────────────────

function checkAstmMatch(
  incumbent: MaterialTechnicalSpecs,
  sustainable: MaterialTechnicalSpecs
): ShowstopperCheck {
  const incumbentCodes = parseAstmCodes(incumbent.astmCodes);
  const sustainableCodes = parseAstmCodes(sustainable.astmCodes);

  // Skip if incumbent has no ASTM codes
  if (incumbentCodes.size === 0) {
    return {
      pass: true,
      details: 'Skipped (incumbent has no ASTM codes)',
      weight: 0,
      score: 0,
    };
  }

  // Fail if sustainable has no codes but incumbent does
  if (sustainableCodes.size === 0) {
    return {
      pass: false,
      details: 'Sustainable material missing ASTM codes',
      weight: WEIGHTS.astmMatch,
      score: 0,
    };
  }

  // Calculate overlap
  const intersection = new Set(Array.from(incumbentCodes).filter(c => sustainableCodes.has(c)));
  const overlapPercent = (intersection.size / incumbentCodes.size) * 100;

  if (overlapPercent === 100) {
    return {
      pass: true,
      details: `Exact match: ${Array.from(intersection).join(', ')}`,
      weight: WEIGHTS.astmMatch,
      score: WEIGHTS.astmMatch,
    };
  } else if (overlapPercent >= 80) {
    return {
      pass: true,
      details: `${overlapPercent.toFixed(0)}% overlap (${intersection.size}/${incumbentCodes.size} codes match)`,
      weight: WEIGHTS.astmMatch,
      score: WEIGHTS.astmMatch * 0.8,
    };
  } else {
    return {
      pass: false,
      details: `Only ${overlapPercent.toFixed(0)}% overlap (${intersection.size}/${incumbentCodes.size} codes match)`,
      weight: WEIGHTS.astmMatch,
      score: 0,
    };
  }
}

function checkFireRating(
  incumbent: MaterialTechnicalSpecs,
  sustainable: MaterialTechnicalSpecs
): ShowstopperCheck {
  if (incumbent.fireRatingHours == null) {
    return { pass: true, details: 'Skipped (no fire rating required)', weight: 0, score: 0 };
  }

  if (sustainable.fireRatingHours == null) {
    return {
      pass: false,
      details: 'Sustainable material missing fire rating',
      weight: WEIGHTS.fireRating,
      score: 0,
    };
  }

  const diff = sustainable.fireRatingHours - incumbent.fireRatingHours;

  if (Math.abs(diff) <= 1) {
    return {
      pass: true,
      details: `${sustainable.fireRatingHours}hr vs ${incumbent.fireRatingHours}hr (within ±1hr)`,
      weight: WEIGHTS.fireRating,
      score: WEIGHTS.fireRating,
    };
  } else if (diff >= -2 && diff < -1) {
    return {
      pass: false,
      details: `${sustainable.fireRatingHours}hr vs ${incumbent.fireRatingHours}hr (${diff}hr downgrade)`,
      weight: WEIGHTS.fireRating,
      score: 0,
    };
  } else {
    return {
      pass: false,
      details: `${sustainable.fireRatingHours}hr vs ${incumbent.fireRatingHours}hr (${diff > 0 ? '+' : ''}${diff}hr, exceeds tolerance)`,
      weight: WEIGHTS.fireRating,
      score: 0,
    };
  }
}

function checkCompressiveStrength(
  incumbent: MaterialTechnicalSpecs,
  sustainable: MaterialTechnicalSpecs
): ShowstopperCheck {
  if (incumbent.compressiveStrength == null) {
    return { pass: true, details: 'Skipped (not applicable)', weight: 0, score: 0 };
  }

  if (sustainable.compressiveStrength == null) {
    return {
      pass: false,
      details: 'Sustainable material missing compressive strength data',
      weight: WEIGHTS.compressiveStrength,
      score: 0,
    };
  }

  const percentDiff = calculatePercentDifference(
    incumbent.compressiveStrength,
    sustainable.compressiveStrength
  );

  if (Math.abs(percentDiff) <= 10) {
    return {
      pass: true,
      details: `${sustainable.compressiveStrength} psi vs ${incumbent.compressiveStrength} psi (${percentDiff > 0 ? '+' : ''}${percentDiff.toFixed(1)}%)`,
      weight: WEIGHTS.compressiveStrength,
      score: WEIGHTS.compressiveStrength,
    };
  } else if (percentDiff >= -20 && percentDiff < -10) {
    return {
      pass: false,
      details: `${sustainable.compressiveStrength} psi vs ${incumbent.compressiveStrength} psi (${percentDiff.toFixed(1)}%, requires structural review)`,
      weight: WEIGHTS.compressiveStrength,
      score: 0,
    };
  } else {
    return {
      pass: false,
      details: `${sustainable.compressiveStrength} psi vs ${incumbent.compressiveStrength} psi (${percentDiff.toFixed(1)}%, exceeds tolerance)`,
      weight: WEIGHTS.compressiveStrength,
      score: 0,
    };
  }
}

function checkTensileStrength(
  incumbent: MaterialTechnicalSpecs,
  sustainable: MaterialTechnicalSpecs
): ShowstopperCheck {
  if (incumbent.tensileStrength == null) {
    return { pass: true, details: 'Skipped (not applicable)', weight: 0, score: 0 };
  }

  if (sustainable.tensileStrength == null) {
    return {
      pass: false,
      details: 'Sustainable material missing tensile strength data',
      weight: WEIGHTS.tensileStrength,
      score: 0,
    };
  }

  const percentDiff = calculatePercentDifference(
    incumbent.tensileStrength,
    sustainable.tensileStrength
  );

  if (Math.abs(percentDiff) <= 10) {
    return {
      pass: true,
      details: `${sustainable.tensileStrength} psi vs ${incumbent.tensileStrength} psi (${percentDiff > 0 ? '+' : ''}${percentDiff.toFixed(1)}%)`,
      weight: WEIGHTS.tensileStrength,
      score: WEIGHTS.tensileStrength,
    };
  } else {
    return {
      pass: false,
      details: `${sustainable.tensileStrength} psi vs ${incumbent.tensileStrength} psi (${percentDiff.toFixed(1)}%, exceeds ±10% tolerance)`,
      weight: WEIGHTS.tensileStrength,
      score: 0,
    };
  }
}

function checkModulusOfElasticity(
  incumbent: MaterialTechnicalSpecs,
  sustainable: MaterialTechnicalSpecs
): ShowstopperCheck {
  if (incumbent.modulusOfElasticity == null) {
    return { pass: true, details: 'Skipped (not applicable)', weight: 0, score: 0 };
  }

  if (sustainable.modulusOfElasticity == null) {
    return {
      pass: false,
      details: 'Sustainable material missing modulus of elasticity data',
      weight: WEIGHTS.modulusOfElasticity,
      score: 0,
    };
  }

  const percentDiff = calculatePercentDifference(
    incumbent.modulusOfElasticity,
    sustainable.modulusOfElasticity
  );

  if (Math.abs(percentDiff) <= 10) {
    return {
      pass: true,
      details: `${sustainable.modulusOfElasticity} psi vs ${incumbent.modulusOfElasticity} psi (${percentDiff > 0 ? '+' : ''}${percentDiff.toFixed(1)}%)`,
      weight: WEIGHTS.modulusOfElasticity,
      score: WEIGHTS.modulusOfElasticity,
    };
  } else {
    return {
      pass: false,
      details: `${sustainable.modulusOfElasticity} psi vs ${incumbent.modulusOfElasticity} psi (${percentDiff.toFixed(1)}%, exceeds ±10% tolerance)`,
      weight: WEIGHTS.modulusOfElasticity,
      score: 0,
    };
  }
}

function checkRValue(
  incumbent: MaterialTechnicalSpecs,
  sustainable: MaterialTechnicalSpecs
): ShowstopperCheck {
  if (incumbent.rValuePerInch == null) {
    return { pass: true, details: 'Skipped (not applicable)', weight: 0, score: 0 };
  }

  if (sustainable.rValuePerInch == null) {
    return {
      pass: false,
      details: 'Sustainable material missing R-value data',
      weight: WEIGHTS.rValue,
      score: 0,
    };
  }

  const percentDiff = calculatePercentDifference(
    incumbent.rValuePerInch,
    sustainable.rValuePerInch
  );

  if (Math.abs(percentDiff) <= 5) {
    return {
      pass: true,
      details: `R-${sustainable.rValuePerInch} vs R-${incumbent.rValuePerInch} per inch (${percentDiff > 0 ? '+' : ''}${percentDiff.toFixed(1)}%)`,
      weight: WEIGHTS.rValue,
      score: WEIGHTS.rValue,
    };
  } else if (percentDiff >= -10 && percentDiff < -5) {
    return {
      pass: false,
      details: `R-${sustainable.rValuePerInch} vs R-${incumbent.rValuePerInch} per inch (${percentDiff.toFixed(1)}%, may affect energy code compliance)`,
      weight: WEIGHTS.rValue,
      score: 0,
    };
  } else {
    return {
      pass: false,
      details: `R-${sustainable.rValuePerInch} vs R-${incumbent.rValuePerInch} per inch (${percentDiff.toFixed(1)}%, exceeds tolerance)`,
      weight: WEIGHTS.rValue,
      score: 0,
    };
  }
}

function checkPermRating(
  incumbent: MaterialTechnicalSpecs,
  sustainable: MaterialTechnicalSpecs
): ShowstopperCheck {
  if (incumbent.permRating == null) {
    return { pass: true, details: 'Skipped (not applicable)', weight: 0, score: 0 };
  }

  if (sustainable.permRating == null) {
    return {
      pass: false,
      details: 'Sustainable material missing perm rating data',
      weight: WEIGHTS.permRating,
      score: 0,
    };
  }

  const incumbentClass = getPermClass(incumbent.permRating);
  const sustainableClass = getPermClass(sustainable.permRating);
  const classDiff = Math.abs(sustainableClass - incumbentClass);

  const classNames = ['', 'Class I', 'Class II', 'Class III', 'Class IV'];

  if (classDiff === 0) {
    return {
      pass: true,
      details: `Both ${classNames[incumbentClass]} vapor retarder (${sustainable.permRating} vs ${incumbent.permRating} perm)`,
      weight: WEIGHTS.permRating,
      score: WEIGHTS.permRating,
    };
  } else if (classDiff === 1) {
    return {
      pass: true,
      details: `${classNames[sustainableClass]} vs ${classNames[incumbentClass]} (adjacent category, acceptable)`,
      weight: WEIGHTS.permRating,
      score: WEIGHTS.permRating * 0.7,
    };
  } else {
    return {
      pass: false,
      details: `${classNames[sustainableClass]} vs ${classNames[incumbentClass]} (>1 category jump, moisture control risk)`,
      weight: WEIGHTS.permRating,
      score: 0,
    };
  }
}

function checkStcRating(
  incumbent: MaterialTechnicalSpecs,
  sustainable: MaterialTechnicalSpecs
): ShowstopperCheck {
  if (incumbent.stcRating == null) {
    return { pass: true, details: 'Skipped (not applicable)', weight: 0, score: 0 };
  }

  if (sustainable.stcRating == null) {
    return {
      pass: false,
      details: 'Sustainable material missing STC rating',
      weight: WEIGHTS.stcRating,
      score: 0,
    };
  }

  const diff = sustainable.stcRating - incumbent.stcRating;

  if (Math.abs(diff) <= 3) {
    return {
      pass: true,
      details: `STC ${sustainable.stcRating} vs STC ${incumbent.stcRating} (within ±3 points)`,
      weight: WEIGHTS.stcRating,
      score: WEIGHTS.stcRating,
    };
  } else if (diff >= -5 && diff < -3) {
    return {
      pass: false,
      details: `STC ${sustainable.stcRating} vs STC ${incumbent.stcRating} (${diff} points, may affect acoustic performance)`,
      weight: WEIGHTS.stcRating,
      score: 0,
    };
  } else {
    return {
      pass: false,
      details: `STC ${sustainable.stcRating} vs STC ${incumbent.stcRating} (${diff} points, exceeds tolerance)`,
      weight: WEIGHTS.stcRating,
      score: 0,
    };
  }
}

function checkIicRating(
  incumbent: MaterialTechnicalSpecs,
  sustainable: MaterialTechnicalSpecs
): ShowstopperCheck {
  if (incumbent.iicRating == null) {
    return { pass: true, details: 'Skipped (not applicable)', weight: 0, score: 0 };
  }

  if (sustainable.iicRating == null) {
    return {
      pass: false,
      details: 'Sustainable material missing IIC rating',
      weight: WEIGHTS.iicRating,
      score: 0,
    };
  }

  const diff = sustainable.iicRating - incumbent.iicRating;

  if (Math.abs(diff) <= 3) {
    return {
      pass: true,
      details: `IIC ${sustainable.iicRating} vs IIC ${incumbent.iicRating} (within ±3 points)`,
      weight: WEIGHTS.iicRating,
      score: WEIGHTS.iicRating,
    };
  } else {
    return {
      pass: false,
      details: `IIC ${sustainable.iicRating} vs IIC ${incumbent.iicRating} (${diff} points, exceeds ±3 tolerance)`,
      weight: WEIGHTS.iicRating,
      score: 0,
    };
  }
}

function checkUlListing(
  incumbent: MaterialTechnicalSpecs,
  sustainable: MaterialTechnicalSpecs
): ShowstopperCheck {
  const incumbentHasUl = !!incumbent.ulListing && incumbent.ulListing.trim().length > 0;
  const sustainableHasUl = !!sustainable.ulListing && sustainable.ulListing.trim().length > 0;

  if (!incumbentHasUl) {
    return { pass: true, details: 'Skipped (UL listing not required)', weight: 0, score: 0 };
  }

  if (!sustainableHasUl) {
    return {
      pass: false,
      details: 'Sustainable material missing UL listing',
      weight: WEIGHTS.ulListing,
      score: 0,
    };
  }

  return {
    pass: true,
    details: `Both UL listed (${sustainable.ulListing})`,
    weight: WEIGHTS.ulListing,
    score: WEIGHTS.ulListing,
  };
}

function checkIccEsReport(
  incumbent: MaterialTechnicalSpecs,
  sustainable: MaterialTechnicalSpecs
): ShowstopperCheck {
  const incumbentHasReport = !!incumbent.iccEsReportNumber && incumbent.iccEsReportNumber.trim().length > 0;
  const sustainableHasReport = !!sustainable.iccEsReportNumber && sustainable.iccEsReportNumber.trim().length > 0;

  if (!incumbentHasReport) {
    return { pass: true, details: 'Skipped (ICC-ES report not required)', weight: 0, score: 0 };
  }

  if (!sustainableHasReport) {
    return {
      pass: false,
      details: 'Sustainable material missing ICC-ES report',
      weight: WEIGHTS.iccEsReport,
      score: 0,
    };
  }

  return {
    pass: true,
    details: `Both have ICC-ES reports (${sustainable.iccEsReportNumber})`,
    weight: WEIGHTS.iccEsReport,
    score: WEIGHTS.iccEsReport,
  };
}

function checkLaborUnits(
  incumbent: MaterialTechnicalSpecs,
  sustainable: MaterialTechnicalSpecs
): ShowstopperCheck {
  if (incumbent.laborUnitsPerUnit == null) {
    return { pass: true, details: 'Skipped (labor data not available)', weight: 0, score: 0 };
  }

  if (sustainable.laborUnitsPerUnit == null) {
    return {
      pass: false,
      details: 'Sustainable material missing labor units data',
      weight: WEIGHTS.laborUnits,
      score: 0,
    };
  }

  const percentDiff = calculatePercentDifference(
    incumbent.laborUnitsPerUnit,
    sustainable.laborUnitsPerUnit
  );

  if (Math.abs(percentDiff) <= 20) {
    return {
      pass: true,
      details: `${sustainable.laborUnitsPerUnit} vs ${incumbent.laborUnitsPerUnit} hrs/unit (${percentDiff > 0 ? '+' : ''}${percentDiff.toFixed(1)}%)`,
      weight: WEIGHTS.laborUnits,
      score: WEIGHTS.laborUnits,
    };
  } else {
    return {
      pass: false,
      details: `${sustainable.laborUnitsPerUnit} vs ${incumbent.laborUnitsPerUnit} hrs/unit (${percentDiff.toFixed(1)}%, exceeds ±20% tolerance)`,
      weight: WEIGHTS.laborUnits,
      score: 0,
    };
  }
}

// ─── Main Validation Function ───────────────────────────────────────────────

export function validateSwap(
  incumbent: MaterialTechnicalSpecs,
  sustainable: MaterialTechnicalSpecs
): ValidationResult {
  const showstopperResults: ShowstopperResults = {
    astmMatch: checkAstmMatch(incumbent, sustainable),
    fireRating: checkFireRating(incumbent, sustainable),
    compressiveStrength: checkCompressiveStrength(incumbent, sustainable),
    tensileStrength: checkTensileStrength(incumbent, sustainable),
    modulusOfElasticity: checkModulusOfElasticity(incumbent, sustainable),
    rValue: checkRValue(incumbent, sustainable),
    permRating: checkPermRating(incumbent, sustainable),
    stcRating: checkStcRating(incumbent, sustainable),
    iicRating: checkIicRating(incumbent, sustainable),
    ulListing: checkUlListing(incumbent, sustainable),
    iccEsReport: checkIccEsReport(incumbent, sustainable),
    laborUnits: checkLaborUnits(incumbent, sustainable),
  };

  // Calculate totals
  let totalScore = 0;
  let totalWeight = 0;
  let passedChecks = 0;
  let failedChecks = 0;
  let skippedChecks = 0;

  Object.values(showstopperResults).forEach(check => {
    if (check.weight === 0) {
      skippedChecks++;
    } else {
      totalWeight += check.weight;
      totalScore += check.score;
      if (check.pass) {
        passedChecks++;
      } else {
        failedChecks++;
      }
    }
  });

  const overallScore = totalWeight > 0 ? (totalScore / totalWeight) * 100 : 0;

  // Determine validation status
  let validationStatus: ValidationStatus;
  let recommendation: string;

  if (overallScore >= 90 && failedChecks === 0) {
    validationStatus = 'APPROVED';
    recommendation = 'APPROVED for substitution. All critical showstoppers pass. Material is functionally equivalent.';
  } else if (overallScore >= 70 && failedChecks <= 2) {
    validationStatus = 'EXPERIMENTAL';
    recommendation = `EXPERIMENTAL substitution. ${failedChecks} showstopper(s) failed. Requires engineering review and possible design modifications.`;
  } else {
    validationStatus = 'REJECTED';
    recommendation = `REJECTED for substitution. ${failedChecks} showstopper(s) failed (score: ${overallScore.toFixed(1)}%). Significant functional differences make substitution impractical.`;
  }

  return {
    validationStatus,
    overallScore,
    showstopperResults,
    failedChecks,
    passedChecks,
    skippedChecks,
    recommendation,
  };
}
