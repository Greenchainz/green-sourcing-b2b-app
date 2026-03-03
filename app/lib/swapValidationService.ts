import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface MaterialTechSpec {
  astmCodes: string[];
  fireRating: string | null;
  ulListing: string | null;
  compressiveStrengthPsi: number | null;
  tensileStrengthPsi: number | null;
  modulusOfElasticityKsi: number | null;
  rValuePerInch: number | null;
  permRating: number | null;
  stcRating: number | null;
  iicRating: number | null;
  laborUnits: number | null;
  warrantyYears: number | null;
  maintenanceCycleYears: number | null;
  expectedLifespanYears: number | null;
}

export interface ShowstopperCheck {
  name: string;
  passed: boolean;
  weight: number;
  details: string;
}

export interface ValidationResult {
  validationStatus: 'APPROVED' | 'EXPERIMENTAL' | 'REJECTED';
  overallScore: number;
  showstopperResults: ShowstopperCheck[];
  passedChecks: number;
  failedChecks: number;
  skippedChecks: number;
  recommendation: string;
}

/**
 * Validates a material swap based on showstopper criteria
 */
export async function validateSwap(
  incumbentMaterialId: number,
  sustainableMaterialId: number
): Promise<ValidationResult> {
  // Fetch technical specs for both materials
  const [incumbentSpec, sustainableSpec] = await Promise.all([
    prisma.materialTechnicalSpec.findFirst({
      where: { materialId: incumbentMaterialId },
    }),
    prisma.materialTechnicalSpec.findFirst({
      where: { materialId: sustainableMaterialId },
    }),
  ]);

  if (!incumbentSpec || !sustainableSpec) {
    throw new Error('Technical specifications not found for one or both materials');
  }

  const checks: ShowstopperCheck[] = [];

  // 1. ASTM Code Match (Weight: 15)
  const astmMatch = checkASTMMatch(
    incumbentSpec.astmCodes as string[],
    sustainableSpec.astmCodes as string[]
  );
  checks.push(astmMatch);

  // 2. Fire Rating (Weight: 15)
  const fireRatingCheck = checkFireRating(
    incumbentSpec.fireRating,
    sustainableSpec.fireRating
  );
  checks.push(fireRatingCheck);

  // 3. UL Listing (Weight: 10)
  const ulCheck = checkULListing(
    incumbentSpec.ulListing,
    sustainableSpec.ulListing
  );
  checks.push(ulCheck);

  // 4. Compressive Strength (Weight: 10)
  const compressiveCheck = checkCompressiveStrength(
    incumbentSpec.compressiveStrengthPsi,
    sustainableSpec.compressiveStrengthPsi
  );
  checks.push(compressiveCheck);

  // 5. Tensile Strength (Weight: 8)
  const tensileCheck = checkTensileStrength(
    incumbentSpec.tensileStrengthPsi,
    sustainableSpec.tensileStrengthPsi
  );
  checks.push(tensileCheck);

  // 6. Modulus of Elasticity (Weight: 8)
  const modulusCheck = checkModulusOfElasticity(
    incumbentSpec.modulusOfElasticityKsi,
    sustainableSpec.modulusOfElasticityKsi
  );
  checks.push(modulusCheck);

  // 7. R-Value (Weight: 10)
  const rValueCheck = checkRValue(
    incumbentSpec.rValuePerInch,
    sustainableSpec.rValuePerInch
  );
  checks.push(rValueCheck);

  // 8. Perm Rating (Weight: 6)
  const permCheck = checkPermRating(
    incumbentSpec.permRating,
    sustainableSpec.permRating
  );
  checks.push(permCheck);

  // 9. STC Rating (Weight: 8)
  const stcCheck = checkSTCRating(
    incumbentSpec.stcRating,
    sustainableSpec.stcRating
  );
  checks.push(stcCheck);

  // 10. IIC Rating (Weight: 6)
  const iicCheck = checkIICRating(
    incumbentSpec.iicRating,
    sustainableSpec.iicRating
  );
  checks.push(iicCheck);

  // 11. Labor Units (Weight: 4)
  const laborCheck = checkLaborUnits(
    incumbentSpec.laborUnits,
    sustainableSpec.laborUnits
  );
  checks.push(laborCheck);

  // 12. Lifecycle (Weight: 5)
  const lifecycleCheck = checkLifecycle(
    incumbentSpec.warrantyYears,
    incumbentSpec.expectedLifespanYears,
    sustainableSpec.warrantyYears,
    sustainableSpec.expectedLifespanYears
  );
  checks.push(lifecycleCheck);

  // Calculate overall score
  const passedChecks = checks.filter((c) => c.passed).length;
  const failedChecks = checks.filter((c) => !c.passed).length;
  const skippedChecks = 0;

  const totalWeight = checks.reduce((sum, c) => sum + c.weight, 0);
  const earnedWeight = checks
    .filter((c) => c.passed)
    .reduce((sum, c) => sum + c.weight, 0);
  const overallScore = (earnedWeight / totalWeight) * 100;

  // Determine validation status
  let validationStatus: 'APPROVED' | 'EXPERIMENTAL' | 'REJECTED';
  if (overallScore >= 90 && failedChecks === 0) {
    validationStatus = 'APPROVED';
  } else if (overallScore >= 70 && failedChecks <= 2) {
    validationStatus = 'EXPERIMENTAL';
  } else {
    validationStatus = 'REJECTED';
  }

  // Generate recommendation
  const recommendation = generateRecommendation(
    validationStatus,
    checks,
    overallScore
  );

  return {
    validationStatus,
    overallScore: Math.round(overallScore * 100) / 100,
    showstopperResults: checks,
    passedChecks,
    failedChecks,
    skippedChecks,
    recommendation,
  };
}

// Helper functions for individual checks

function checkASTMMatch(
  incumbentCodes: string[],
  sustainableCodes: string[]
): ShowstopperCheck {
  const hasMatch = incumbentCodes.some((code) =>
    sustainableCodes.includes(code)
  );
  return {
    name: 'ASTM Code Match',
    passed: hasMatch,
    weight: 15,
    details: hasMatch
      ? `Matching ASTM codes found`
      : `No matching ASTM codes between materials`,
  };
}

function checkFireRating(
  incumbentRating: string | null,
  sustainableRating: string | null
): ShowstopperCheck {
  if (!incumbentRating || !sustainableRating) {
    return {
      name: 'Fire Rating',
      passed: true,
      weight: 15,
      details: 'Fire rating not specified for one or both materials',
    };
  }

  const incumbentHours = parseFireRating(incumbentRating);
  const sustainableHours = parseFireRating(sustainableRating);

  const passed = Math.abs(incumbentHours - sustainableHours) <= 1;

  return {
    name: 'Fire Rating',
    passed,
    weight: 15,
    details: passed
      ? `Fire ratings within ±1 hour (${incumbentRating} vs ${sustainableRating})`
      : `Fire ratings differ by more than 1 hour (${incumbentRating} vs ${sustainableRating})`,
  };
}

function parseFireRating(rating: string): number {
  const match = rating.match(/(\d+)/);
  return match ? parseInt(match[1]) : 0;
}

function checkULListing(
  incumbentUL: string | null,
  sustainableUL: string | null
): ShowstopperCheck {
  const passed = !!sustainableUL;
  return {
    name: 'UL Listing',
    passed,
    weight: 10,
    details: passed
      ? `Sustainable material has UL listing: ${sustainableUL}`
      : `Sustainable material lacks UL listing`,
  };
}

function checkCompressiveStrength(
  incumbentPsi: number | null,
  sustainablePsi: number | null
): ShowstopperCheck {
  if (!incumbentPsi || !sustainablePsi) {
    return {
      name: 'Compressive Strength',
      passed: true,
      weight: 10,
      details: 'Compressive strength not specified',
    };
  }

  const percentDiff =
    Math.abs(incumbentPsi - sustainablePsi) / incumbentPsi * 100;
  const passed = percentDiff <= 10;

  return {
    name: 'Compressive Strength',
    passed,
    weight: 10,
    details: passed
      ? `Within ±10% (${incumbentPsi} vs ${sustainablePsi} PSI)`
      : `Difference exceeds ±10% (${percentDiff.toFixed(1)}%)`,
  };
}

function checkTensileStrength(
  incumbentPsi: number | null,
  sustainablePsi: number | null
): ShowstopperCheck {
  if (!incumbentPsi || !sustainablePsi) {
    return {
      name: 'Tensile Strength',
      passed: true,
      weight: 8,
      details: 'Tensile strength not specified',
    };
  }

  const percentDiff =
    Math.abs(incumbentPsi - sustainablePsi) / incumbentPsi * 100;
  const passed = percentDiff <= 10;

  return {
    name: 'Tensile Strength',
    passed,
    weight: 8,
    details: passed
      ? `Within ±10% (${incumbentPsi} vs ${sustainablePsi} PSI)`
      : `Difference exceeds ±10% (${percentDiff.toFixed(1)}%)`,
  };
}

function checkModulusOfElasticity(
  incumbentKsi: number | null,
  sustainableKsi: number | null
): ShowstopperCheck {
  if (!incumbentKsi || !sustainableKsi) {
    return {
      name: 'Modulus of Elasticity',
      passed: true,
      weight: 8,
      details: 'Modulus of elasticity not specified',
    };
  }

  const percentDiff =
    Math.abs(incumbentKsi - sustainableKsi) / incumbentKsi * 100;
  const passed = percentDiff <= 10;

  return {
    name: 'Modulus of Elasticity',
    passed,
    weight: 8,
    details: passed
      ? `Within ±10% (${incumbentKsi} vs ${sustainableKsi} KSI)`
      : `Difference exceeds ±10% (${percentDiff.toFixed(1)}%)`,
  };
}

function checkRValue(
  incumbentR: number | null,
  sustainableR: number | null
): ShowstopperCheck {
  if (!incumbentR || !sustainableR) {
    return {
      name: 'R-Value',
      passed: true,
      weight: 10,
      details: 'R-value not specified',
    };
  }

  const percentDiff = Math.abs(incumbentR - sustainableR) / incumbentR * 100;
  const passed = percentDiff <= 5;

  return {
    name: 'R-Value',
    passed,
    weight: 10,
    details: passed
      ? `Within ±5% (${incumbentR} vs ${sustainableR})`
      : `Difference exceeds ±5% (${percentDiff.toFixed(1)}%)`,
  };
}

function checkPermRating(
  incumbentPerm: number | null,
  sustainablePerm: number | null
): ShowstopperCheck {
  if (!incumbentPerm || !sustainablePerm) {
    return {
      name: 'Perm Rating',
      passed: true,
      weight: 6,
      details: 'Perm rating not specified',
    };
  }

  // Perm rating categories: <1 (vapor barrier), 1-10 (semi-permeable), >10 (permeable)
  const incumbentCategory = getPermCategory(incumbentPerm);
  const sustainableCategory = getPermCategory(sustainablePerm);
  const passed = incumbentCategory === sustainableCategory;

  return {
    name: 'Perm Rating',
    passed,
    weight: 6,
    details: passed
      ? `Same permeability category (${incumbentCategory})`
      : `Different categories (${incumbentCategory} vs ${sustainableCategory})`,
  };
}

function getPermCategory(perm: number): string {
  if (perm < 1) return 'vapor barrier';
  if (perm <= 10) return 'semi-permeable';
  return 'permeable';
}

function checkSTCRating(
  incumbentSTC: number | null,
  sustainableSTC: number | null
): ShowstopperCheck {
  if (!incumbentSTC || !sustainableSTC) {
    return {
      name: 'STC Rating',
      passed: true,
      weight: 8,
      details: 'STC rating not specified',
    };
  }

  const diff = Math.abs(incumbentSTC - sustainableSTC);
  const passed = diff <= 3;

  return {
    name: 'STC Rating',
    passed,
    weight: 8,
    details: passed
      ? `Within ±3 points (${incumbentSTC} vs ${sustainableSTC})`
      : `Difference exceeds ±3 points (${diff} points)`,
  };
}

function checkIICRating(
  incumbentIIC: number | null,
  sustainableIIC: number | null
): ShowstopperCheck {
  if (!incumbentIIC || !sustainableIIC) {
    return {
      name: 'IIC Rating',
      passed: true,
      weight: 6,
      details: 'IIC rating not specified',
    };
  }

  const diff = Math.abs(incumbentIIC - sustainableIIC);
  const passed = diff <= 3;

  return {
    name: 'IIC Rating',
    passed,
    weight: 6,
    details: passed
      ? `Within ±3 points (${incumbentIIC} vs ${sustainableIIC})`
      : `Difference exceeds ±3 points (${diff} points)`,
  };
}

function checkLaborUnits(
  incumbentLabor: number | null,
  sustainableLabor: number | null
): ShowstopperCheck {
  if (!incumbentLabor || !sustainableLabor) {
    return {
      name: 'Labor Units',
      passed: true,
      weight: 4,
      details: 'Labor units not specified',
    };
  }

  const percentDiff =
    Math.abs(incumbentLabor - sustainableLabor) / incumbentLabor * 100;
  const passed = percentDiff <= 20;

  return {
    name: 'Labor Units',
    passed,
    weight: 4,
    details: passed
      ? `Within ±20% (${incumbentLabor} vs ${sustainableLabor})`
      : `Difference exceeds ±20% (${percentDiff.toFixed(1)}%)`,
  };
}

function checkLifecycle(
  incumbentWarranty: number | null,
  incumbentLifespan: number | null,
  sustainableWarranty: number | null,
  sustainableLifespan: number | null
): ShowstopperCheck {
  if (!incumbentLifespan || !sustainableLifespan) {
    return {
      name: 'Lifecycle',
      passed: true,
      weight: 5,
      details: 'Lifecycle data not specified',
    };
  }

  const passed = sustainableLifespan >= incumbentLifespan * 0.9;

  return {
    name: 'Lifecycle',
    passed,
    weight: 5,
    details: passed
      ? `Lifespan comparable (${incumbentLifespan} vs ${sustainableLifespan} years)`
      : `Sustainable lifespan significantly shorter`,
  };
}

function generateRecommendation(
  status: 'APPROVED' | 'EXPERIMENTAL' | 'REJECTED',
  checks: ShowstopperCheck[],
  score: number
): string {
  if (status === 'APPROVED') {
    return `This swap is APPROVED for specification. All critical showstopper criteria have been met (${score.toFixed(1)}% compliance). The sustainable material is functionally equivalent to the incumbent.`;
  }

  if (status === 'EXPERIMENTAL') {
    const failedChecks = checks.filter((c) => !c.passed);
    const failedNames = failedChecks.map((c) => c.name).join(', ');
    return `This swap is EXPERIMENTAL. Overall compliance is ${score.toFixed(1)}%, but the following criteria failed: ${failedNames}. Architect review and owner approval required before specification.`;
  }

  const failedChecks = checks.filter((c) => !c.passed);
  const failedNames = failedChecks.map((c) => c.name).join(', ');
  return `This swap is REJECTED. Compliance score is ${score.toFixed(1)}%, with ${failedChecks.length} failed criteria: ${failedNames}. The sustainable material is not functionally equivalent and should not be specified.`;
}

/**
 * Stores validation result in the database
 */
export async function storeValidationResult(
  incumbentMaterialId: number,
  sustainableMaterialId: number,
  result: ValidationResult,
  projectId?: number,
  requestedBy?: number,
  rfqId?: number
) {
  return await prisma.swapValidation.create({
    data: {
      incumbentMaterialId,
      sustainableMaterialId,
      projectId,
      validationStatus: result.validationStatus,
      overallScore: result.overallScore,
      showstopperResults: result.showstopperResults as any,
      passedChecks: result.passedChecks,
      failedChecks: result.failedChecks,
      skippedChecks: result.skippedChecks,
      recommendation: result.recommendation,
      requestedBy,
      rfqId,
      expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 6 months
    },
  });
}
