/**
 * Swap Validation Service
 *
 * Validates material substitutions based on functional equivalence across
 * 5 architect-critical metric categories:
 *
 *   CATEGORY 1 — FIRE & LIFE SAFETY CODES
 *     - Fire rating (hours) — IBC Table 601/602
 *     - Flame spread index (FSI) — ASTM E84 / IBC §803
 *     - Smoke developed index (SDI) — ASTM E84 / IBC §803
 *     - UL listing — required for rated assemblies
 *     - ICC-ES report — code compliance for alternative materials
 *
 *   CATEGORY 2 — STRUCTURAL PERFORMANCE
 *     - Compressive strength (psi)
 *     - Tensile strength (psi)
 *     - Flexural strength (psi) — NEW
 *     - Modulus of elasticity (ksi)
 *     - Stiffness (ksi) — NEW
 *     - ASTM code match
 *
 *   CATEGORY 3 — THERMAL & MOISTURE PERFORMANCE
 *     - R-value per inch (thermal resistance)
 *     - LTTR 15-year (long-term thermal resistance) — NEW
 *     - Thermal U-value — NEW
 *     - Perm rating (vapor permeance class)
 *
 *   CATEGORY 4 — ACOUSTIC PERFORMANCE
 *     - STC rating (airborne sound)
 *     - IIC rating (impact sound)
 *     - NRC rating (noise reduction coefficient) — NEW
 *
 *   CATEGORY 5 — INSTALLABILITY & CONSTRUCTABILITY
 *     - Labor units per unit (installation hours)
 *     - Installation difficulty (1-5 scale) — NEW
 *     - Weight per unit (structural/handling impact) — NEW
 *     - Cure time (hours) — NEW
 *     - Warranty years — NEW
 *
 * Classification:
 *   - APPROVED:      Score ≥ 90% AND 0 hard failures
 *   - EXPERIMENTAL:  Score ≥ 70% AND ≤ 2 hard failures
 *   - REJECTED:      Score < 70% OR > 2 hard failures
 */

export type ValidationStatus = 'APPROVED' | 'EXPERIMENTAL' | 'REJECTED';

export interface ShowstopperCheck {
  pass: boolean;
  details: string;
  weight: number;
  score: number;
  category: MetricCategory;
}

export type MetricCategory =
  | 'fire_life_safety'
  | 'structural'
  | 'thermal_moisture'
  | 'acoustic'
  | 'installability';

export interface ShowstopperResults {
  // ── Category 1: Fire & Life Safety ──────────────────────────────────────
  fireRating: ShowstopperCheck;
  flamespreadIndex: ShowstopperCheck;
  smokeDevelopedIndex: ShowstopperCheck;
  ulListing: ShowstopperCheck;
  iccEsReport: ShowstopperCheck;

  // ── Category 2: Structural ───────────────────────────────────────────────
  astmMatch: ShowstopperCheck;
  compressiveStrength: ShowstopperCheck;
  tensileStrength: ShowstopperCheck;
  flexuralStrength: ShowstopperCheck;
  modulusOfElasticity: ShowstopperCheck;
  stiffness: ShowstopperCheck;

  // ── Category 3: Thermal & Moisture ──────────────────────────────────────
  rValue: ShowstopperCheck;
  lttr15Year: ShowstopperCheck;
  thermalUValue: ShowstopperCheck;
  permRating: ShowstopperCheck;

  // ── Category 4: Acoustic ─────────────────────────────────────────────────
  stcRating: ShowstopperCheck;
  iicRating: ShowstopperCheck;
  nrcRating: ShowstopperCheck;

  // ── Category 5: Installability ───────────────────────────────────────────
  laborUnits: ShowstopperCheck;
  installationDifficulty: ShowstopperCheck;
  weightPerUnit: ShowstopperCheck;
  cureTime: ShowstopperCheck;
  warrantyYears: ShowstopperCheck;
}

export interface CategorySummary {
  category: MetricCategory;
  label: string;
  passed: number;
  failed: number;
  skipped: number;
  score: number; // 0-100 for this category
  status: 'PASS' | 'WARN' | 'FAIL' | 'SKIP';
}

export interface ValidationResult {
  validationStatus: ValidationStatus;
  overallScore: number;
  showstopperResults: ShowstopperResults;
  categorySummaries: CategorySummary[];
  failedChecks: number;
  passedChecks: number;
  skippedChecks: number;
  recommendation: string;
  architectNotes: string[]; // Human-readable notes for the architect
}

export interface MaterialTechnicalSpecs {
  // ── Fire & Life Safety ───────────────────────────────────────────────────
  astmCodes?: string | string[] | null;
  ulListing?: string | null;
  iccEsReportNumber?: string | null;
  fireRatingHours?: number | null;
  flamespreadIndex?: number | null;   // ASTM E84 — IBC max 25 (Class A), 75 (Class B), 200 (Class C)
  smokeDevelopedIndex?: number | null; // ASTM E84 — IBC max 450

  // ── Structural ───────────────────────────────────────────────────────────
  compressiveStrength?: number | null;  // psi
  tensileStrength?: number | null;      // psi
  flexuralStrength?: number | null;     // psi — NEW
  modulusOfElasticity?: number | null;  // ksi
  stiffness?: number | null;            // ksi — NEW

  // ── Thermal & Moisture ───────────────────────────────────────────────────
  rValuePerInch?: number | null;
  lttr15Year?: number | null;           // Long-term thermal resistance — NEW
  thermalUValue?: number | null;        // Overall assembly U-value — NEW
  permRating?: number | null;           // Perms (ASTM E96)

  // ── Acoustic ─────────────────────────────────────────────────────────────
  stcRating?: number | null;
  iicRating?: number | null;
  nrcRating?: number | null;            // 0.00–1.00 — NEW

  // ── Installability ───────────────────────────────────────────────────────
  laborUnitsPerUnit?: number | null;    // hrs/unit
  installationDifficulty?: number | null; // 1-5 scale — NEW
  weightPerUnit?: number | null;        // lbs — NEW
  cureTimeHours?: number | null;        // hours — NEW
  warrantyYears?: number | null;        // years — NEW
}

// ─── Validation Weights ──────────────────────────────────────────────────────
// Total = 100. Weights reflect architect priority: fire/life safety first,
// structural second, then thermal, acoustic, and installability.

const WEIGHTS = {
  // Category 1: Fire & Life Safety (30 pts total)
  fireRating: 12,
  flamespreadIndex: 8,
  smokeDevelopedIndex: 5,
  ulListing: 3,
  iccEsReport: 2,

  // Category 2: Structural (30 pts total)
  astmMatch: 10,
  compressiveStrength: 8,
  tensileStrength: 6,
  flexuralStrength: 4,
  modulusOfElasticity: 1,
  stiffness: 1,

  // Category 3: Thermal & Moisture (20 pts total)
  rValue: 10,
  lttr15Year: 4,
  thermalUValue: 3,
  permRating: 3,

  // Category 4: Acoustic (10 pts total)
  stcRating: 5,
  iicRating: 3,
  nrcRating: 2,

  // Category 5: Installability (10 pts total)
  laborUnits: 4,
  installationDifficulty: 2,
  weightPerUnit: 2,
  cureTime: 1,
  warrantyYears: 1,
};

// ─── Helper Functions ────────────────────────────────────────────────────────

function parseAstmCodes(codes: string | string[] | null | undefined): Set<string> {
  if (!codes) return new Set();
  if (Array.isArray(codes)) {
    return new Set(codes.map(c => c.trim().toUpperCase()).filter(c => c.length > 0));
  }
  return new Set(
    codes.split(/[,;]/).map(c => c.trim().toUpperCase()).filter(c => c.length > 0)
  );
}

function pct(incumbent: number, sustainable: number): number {
  if (incumbent === 0) return 0;
  return ((sustainable - incumbent) / incumbent) * 100;
}

function getPermClass(permRating: number): number {
  if (permRating <= 0.1) return 1;  // Class I — vapor impermeable
  if (permRating <= 1.0) return 2;  // Class II — vapor retarder
  if (permRating <= 10) return 3;   // Class III — vapor semi-permeable
  return 4;                          // Class IV — vapor permeable
}

function skip(details: string): ShowstopperCheck {
  return { pass: true, details, weight: 0, score: 0, category: 'fire_life_safety' };
}

// ─── Category 1: Fire & Life Safety ─────────────────────────────────────────

function checkFireRating(i: MaterialTechnicalSpecs, s: MaterialTechnicalSpecs): ShowstopperCheck {
  const cat: MetricCategory = 'fire_life_safety';
  if (i.fireRatingHours == null) return { ...skip('Skipped — fire rating not required'), category: cat };
  if (s.fireRatingHours == null) return { pass: false, details: 'Sustainable material missing fire rating data', weight: WEIGHTS.fireRating, score: 0, category: cat };

  // Sustainable must meet or exceed incumbent fire rating — no downgrade allowed
  if (s.fireRatingHours >= i.fireRatingHours) {
    return { pass: true, details: `${s.fireRatingHours}hr ≥ required ${i.fireRatingHours}hr (IBC compliant)`, weight: WEIGHTS.fireRating, score: WEIGHTS.fireRating, category: cat };
  } else {
    return { pass: false, details: `${s.fireRatingHours}hr < required ${i.fireRatingHours}hr — fire rating downgrade not permitted`, weight: WEIGHTS.fireRating, score: 0, category: cat };
  }
}

function checkFlamespreadIndex(i: MaterialTechnicalSpecs, s: MaterialTechnicalSpecs): ShowstopperCheck {
  const cat: MetricCategory = 'fire_life_safety';
  if (i.flamespreadIndex == null) return { ...skip('Skipped — FSI not specified'), category: cat };
  if (s.flamespreadIndex == null) return { pass: false, details: 'Sustainable material missing flame spread index (ASTM E84)', weight: WEIGHTS.flamespreadIndex, score: 0, category: cat };

  // IBC §803: Class A ≤25, Class B ≤75, Class C ≤200
  const incumbentClass = i.flamespreadIndex <= 25 ? 'A' : i.flamespreadIndex <= 75 ? 'B' : 'C';
  const sustainableClass = s.flamespreadIndex <= 25 ? 'A' : s.flamespreadIndex <= 75 ? 'B' : 'C';

  if (s.flamespreadIndex <= i.flamespreadIndex) {
    return { pass: true, details: `FSI ${s.flamespreadIndex} ≤ incumbent ${i.flamespreadIndex} (Class ${sustainableClass} ≥ Class ${incumbentClass})`, weight: WEIGHTS.flamespreadIndex, score: WEIGHTS.flamespreadIndex, category: cat };
  } else if (sustainableClass === incumbentClass) {
    // Same IBC class, slightly higher FSI — acceptable
    return { pass: true, details: `FSI ${s.flamespreadIndex} vs ${i.flamespreadIndex} — same IBC Class ${incumbentClass}, within class tolerance`, weight: WEIGHTS.flamespreadIndex, score: WEIGHTS.flamespreadIndex * 0.8, category: cat };
  } else {
    return { pass: false, details: `FSI ${s.flamespreadIndex} (Class ${sustainableClass}) vs incumbent ${i.flamespreadIndex} (Class ${incumbentClass}) — class downgrade not permitted per IBC §803`, weight: WEIGHTS.flamespreadIndex, score: 0, category: cat };
  }
}

function checkSmokeDevelopedIndex(i: MaterialTechnicalSpecs, s: MaterialTechnicalSpecs): ShowstopperCheck {
  const cat: MetricCategory = 'fire_life_safety';
  if (i.smokeDevelopedIndex == null) return { ...skip('Skipped — SDI not specified'), category: cat };
  if (s.smokeDevelopedIndex == null) return { pass: false, details: 'Sustainable material missing smoke developed index (ASTM E84)', weight: WEIGHTS.smokeDevelopedIndex, score: 0, category: cat };

  // IBC §803: SDI must not exceed 450 for all classes
  if (s.smokeDevelopedIndex > 450) {
    return { pass: false, details: `SDI ${s.smokeDevelopedIndex} exceeds IBC §803 maximum of 450`, weight: WEIGHTS.smokeDevelopedIndex, score: 0, category: cat };
  }
  if (s.smokeDevelopedIndex <= i.smokeDevelopedIndex) {
    return { pass: true, details: `SDI ${s.smokeDevelopedIndex} ≤ incumbent ${i.smokeDevelopedIndex} (IBC compliant)`, weight: WEIGHTS.smokeDevelopedIndex, score: WEIGHTS.smokeDevelopedIndex, category: cat };
  } else {
    const diff = s.smokeDevelopedIndex - i.smokeDevelopedIndex;
    if (diff <= 50) {
      return { pass: true, details: `SDI ${s.smokeDevelopedIndex} vs ${i.smokeDevelopedIndex} (+${diff}, within 50-point tolerance)`, weight: WEIGHTS.smokeDevelopedIndex, score: WEIGHTS.smokeDevelopedIndex * 0.7, category: cat };
    }
    return { pass: false, details: `SDI ${s.smokeDevelopedIndex} vs incumbent ${i.smokeDevelopedIndex} (+${diff} — exceeds 50-point tolerance)`, weight: WEIGHTS.smokeDevelopedIndex, score: 0, category: cat };
  }
}

function checkUlListing(i: MaterialTechnicalSpecs, s: MaterialTechnicalSpecs): ShowstopperCheck {
  const cat: MetricCategory = 'fire_life_safety';
  if (!i.ulListing?.trim()) return { ...skip('Skipped — UL listing not required'), category: cat };
  if (!s.ulListing?.trim()) return { pass: false, details: 'Sustainable material missing UL listing — required for rated assembly', weight: WEIGHTS.ulListing, score: 0, category: cat };
  return { pass: true, details: `UL listed: ${s.ulListing}`, weight: WEIGHTS.ulListing, score: WEIGHTS.ulListing, category: cat };
}

function checkIccEsReport(i: MaterialTechnicalSpecs, s: MaterialTechnicalSpecs): ShowstopperCheck {
  const cat: MetricCategory = 'fire_life_safety';
  if (!i.iccEsReportNumber?.trim()) return { ...skip('Skipped — ICC-ES report not required'), category: cat };
  if (!s.iccEsReportNumber?.trim()) return { pass: false, details: 'Sustainable material missing ICC-ES report', weight: WEIGHTS.iccEsReport, score: 0, category: cat };
  return { pass: true, details: `ICC-ES: ${s.iccEsReportNumber}`, weight: WEIGHTS.iccEsReport, score: WEIGHTS.iccEsReport, category: cat };
}

// ─── Category 2: Structural ──────────────────────────────────────────────────

function checkAstmMatch(i: MaterialTechnicalSpecs, s: MaterialTechnicalSpecs): ShowstopperCheck {
  const cat: MetricCategory = 'structural';
  const iCodes = parseAstmCodes(i.astmCodes);
  const sCodes = parseAstmCodes(s.astmCodes);
  if (iCodes.size === 0) return { ...skip('Skipped — no ASTM codes on incumbent'), category: cat };
  if (sCodes.size === 0) return { pass: false, details: 'Sustainable material missing ASTM codes', weight: WEIGHTS.astmMatch, score: 0, category: cat };
  const shared = new Set(Array.from(iCodes).filter(c => sCodes.has(c)));
  const overlapPct = (shared.size / iCodes.size) * 100;
  if (overlapPct >= 100) return { pass: true, details: `Exact ASTM match: ${Array.from(shared).join(', ')}`, weight: WEIGHTS.astmMatch, score: WEIGHTS.astmMatch, category: cat };
  if (overlapPct >= 80) return { pass: true, details: `${overlapPct.toFixed(0)}% ASTM overlap (${shared.size}/${iCodes.size} codes)`, weight: WEIGHTS.astmMatch, score: WEIGHTS.astmMatch * 0.8, category: cat };
  return { pass: false, details: `Only ${overlapPct.toFixed(0)}% ASTM overlap (${shared.size}/${iCodes.size} codes) — below 80% minimum`, weight: WEIGHTS.astmMatch, score: 0, category: cat };
}

function checkStrength(
  label: string, unit: string, tolerance: number, weight: number,
  iVal: number | null | undefined, sVal: number | null | undefined,
  cat: MetricCategory
): ShowstopperCheck {
  if (iVal == null) return { ...skip(`Skipped — ${label} not applicable`), category: cat };
  if (sVal == null) return { pass: false, details: `Sustainable material missing ${label}`, weight, score: 0, category: cat };
  const diff = pct(iVal, sVal);
  // Sustainable must not be weaker than incumbent by more than tolerance
  if (sVal >= iVal) return { pass: true, details: `${label}: ${sVal} ${unit} ≥ ${iVal} ${unit} (meets or exceeds)`, weight, score: weight, category: cat };
  if (Math.abs(diff) <= tolerance) return { pass: true, details: `${label}: ${sVal} ${unit} vs ${iVal} ${unit} (${diff.toFixed(1)}%, within ±${tolerance}% tolerance)`, weight, score: weight, category: cat };
  return { pass: false, details: `${label}: ${sVal} ${unit} vs ${iVal} ${unit} (${diff.toFixed(1)}% — exceeds −${tolerance}% tolerance)`, weight, score: 0, category: cat };
}

function checkCompressiveStrength(i: MaterialTechnicalSpecs, s: MaterialTechnicalSpecs): ShowstopperCheck {
  return checkStrength('Compressive strength', 'psi', 15, WEIGHTS.compressiveStrength, i.compressiveStrength, s.compressiveStrength, 'structural');
}
function checkTensileStrength(i: MaterialTechnicalSpecs, s: MaterialTechnicalSpecs): ShowstopperCheck {
  return checkStrength('Tensile strength', 'psi', 15, WEIGHTS.tensileStrength, i.tensileStrength, s.tensileStrength, 'structural');
}
function checkFlexuralStrength(i: MaterialTechnicalSpecs, s: MaterialTechnicalSpecs): ShowstopperCheck {
  return checkStrength('Flexural strength', 'psi', 15, WEIGHTS.flexuralStrength, i.flexuralStrength, s.flexuralStrength, 'structural');
}
function checkModulusOfElasticity(i: MaterialTechnicalSpecs, s: MaterialTechnicalSpecs): ShowstopperCheck {
  return checkStrength('Modulus of elasticity', 'ksi', 20, WEIGHTS.modulusOfElasticity, i.modulusOfElasticity, s.modulusOfElasticity, 'structural');
}
function checkStiffness(i: MaterialTechnicalSpecs, s: MaterialTechnicalSpecs): ShowstopperCheck {
  return checkStrength('Stiffness', 'ksi', 20, WEIGHTS.stiffness, i.stiffness, s.stiffness, 'structural');
}

// ─── Category 3: Thermal & Moisture ─────────────────────────────────────────

function checkRValue(i: MaterialTechnicalSpecs, s: MaterialTechnicalSpecs): ShowstopperCheck {
  const cat: MetricCategory = 'thermal_moisture';
  if (i.rValuePerInch == null) return { ...skip('Skipped — R-value not applicable'), category: cat };
  if (s.rValuePerInch == null) return { pass: false, details: 'Sustainable material missing R-value per inch', weight: WEIGHTS.rValue, score: 0, category: cat };
  // Sustainable must meet or exceed incumbent R-value (lower = worse insulation)
  if (s.rValuePerInch >= i.rValuePerInch) return { pass: true, details: `R-${s.rValuePerInch}/in ≥ R-${i.rValuePerInch}/in (meets or exceeds)`, weight: WEIGHTS.rValue, score: WEIGHTS.rValue, category: cat };
  const diff = pct(i.rValuePerInch, s.rValuePerInch);
  if (Math.abs(diff) <= 10) return { pass: true, details: `R-${s.rValuePerInch}/in vs R-${i.rValuePerInch}/in (${diff.toFixed(1)}%, within ±10% tolerance)`, weight: WEIGHTS.rValue, score: WEIGHTS.rValue * 0.8, category: cat };
  return { pass: false, details: `R-${s.rValuePerInch}/in vs R-${i.rValuePerInch}/in (${diff.toFixed(1)}% — below −10% tolerance, energy code may be affected)`, weight: WEIGHTS.rValue, score: 0, category: cat };
}

function checkLttr15Year(i: MaterialTechnicalSpecs, s: MaterialTechnicalSpecs): ShowstopperCheck {
  const cat: MetricCategory = 'thermal_moisture';
  if (i.lttr15Year == null) return { ...skip('Skipped — LTTR not specified'), category: cat };
  if (s.lttr15Year == null) return { pass: false, details: 'Sustainable material missing LTTR 15-year value', weight: WEIGHTS.lttr15Year, score: 0, category: cat };
  if (s.lttr15Year >= i.lttr15Year) return { pass: true, details: `LTTR ${s.lttr15Year} ≥ ${i.lttr15Year} (long-term thermal performance maintained)`, weight: WEIGHTS.lttr15Year, score: WEIGHTS.lttr15Year, category: cat };
  const diff = pct(i.lttr15Year, s.lttr15Year);
  return { pass: false, details: `LTTR ${s.lttr15Year} vs ${i.lttr15Year} (${diff.toFixed(1)}% — long-term thermal degradation concern)`, weight: WEIGHTS.lttr15Year, score: 0, category: cat };
}

function checkThermalUValue(i: MaterialTechnicalSpecs, s: MaterialTechnicalSpecs): ShowstopperCheck {
  const cat: MetricCategory = 'thermal_moisture';
  if (i.thermalUValue == null) return { ...skip('Skipped — U-value not specified'), category: cat };
  if (s.thermalUValue == null) return { pass: false, details: 'Sustainable material missing thermal U-value', weight: WEIGHTS.thermalUValue, score: 0, category: cat };
  // Lower U-value = better insulation
  if (s.thermalUValue <= i.thermalUValue) return { pass: true, details: `U-${s.thermalUValue} ≤ U-${i.thermalUValue} (meets or exceeds)`, weight: WEIGHTS.thermalUValue, score: WEIGHTS.thermalUValue, category: cat };
  const diff = pct(i.thermalUValue, s.thermalUValue);
  if (diff <= 10) return { pass: true, details: `U-${s.thermalUValue} vs U-${i.thermalUValue} (+${diff.toFixed(1)}%, within 10% tolerance)`, weight: WEIGHTS.thermalUValue, score: WEIGHTS.thermalUValue * 0.7, category: cat };
  return { pass: false, details: `U-${s.thermalUValue} vs U-${i.thermalUValue} (+${diff.toFixed(1)}% — energy code compliance at risk)`, weight: WEIGHTS.thermalUValue, score: 0, category: cat };
}

function checkPermRating(i: MaterialTechnicalSpecs, s: MaterialTechnicalSpecs): ShowstopperCheck {
  const cat: MetricCategory = 'thermal_moisture';
  if (i.permRating == null) return { ...skip('Skipped — perm rating not applicable'), category: cat };
  if (s.permRating == null) return { pass: false, details: 'Sustainable material missing perm rating (ASTM E96)', weight: WEIGHTS.permRating, score: 0, category: cat };
  const iClass = getPermClass(i.permRating);
  const sClass = getPermClass(s.permRating);
  const classLabels = ['', 'Class I (vapor impermeable)', 'Class II (vapor retarder)', 'Class III (semi-permeable)', 'Class IV (permeable)'];
  if (sClass === iClass) return { pass: true, details: `${s.permRating} perms — same ${classLabels[sClass]} as incumbent`, weight: WEIGHTS.permRating, score: WEIGHTS.permRating, category: cat };
  if (Math.abs(sClass - iClass) === 1) return { pass: false, details: `${s.permRating} perms (${classLabels[sClass]}) vs incumbent ${i.permRating} perms (${classLabels[iClass]}) — adjacent class, requires moisture analysis`, weight: WEIGHTS.permRating, score: 0, category: cat };
  return { pass: false, details: `${s.permRating} perms (${classLabels[sClass]}) vs incumbent ${i.permRating} perms (${classLabels[iClass]}) — incompatible vapor control class`, weight: WEIGHTS.permRating, score: 0, category: cat };
}

// ─── Category 4: Acoustic ────────────────────────────────────────────────────

function checkStcRating(i: MaterialTechnicalSpecs, s: MaterialTechnicalSpecs): ShowstopperCheck {
  const cat: MetricCategory = 'acoustic';
  if (i.stcRating == null) return { ...skip('Skipped — STC not required'), category: cat };
  if (s.stcRating == null) return { pass: false, details: 'Sustainable material missing STC rating', weight: WEIGHTS.stcRating, score: 0, category: cat };
  const diff = s.stcRating - i.stcRating;
  if (diff >= 0) return { pass: true, details: `STC ${s.stcRating} ≥ STC ${i.stcRating} (meets or exceeds)`, weight: WEIGHTS.stcRating, score: WEIGHTS.stcRating, category: cat };
  if (Math.abs(diff) <= 3) return { pass: true, details: `STC ${s.stcRating} vs STC ${i.stcRating} (${diff} — within ±3 tolerance)`, weight: WEIGHTS.stcRating, score: WEIGHTS.stcRating * 0.7, category: cat };
  return { pass: false, details: `STC ${s.stcRating} vs STC ${i.stcRating} (${diff} — exceeds −3 tolerance, acoustic performance degraded)`, weight: WEIGHTS.stcRating, score: 0, category: cat };
}

function checkIicRating(i: MaterialTechnicalSpecs, s: MaterialTechnicalSpecs): ShowstopperCheck {
  const cat: MetricCategory = 'acoustic';
  if (i.iicRating == null) return { ...skip('Skipped — IIC not required'), category: cat };
  if (s.iicRating == null) return { pass: false, details: 'Sustainable material missing IIC rating', weight: WEIGHTS.iicRating, score: 0, category: cat };
  const diff = s.iicRating - i.iicRating;
  if (diff >= 0) return { pass: true, details: `IIC ${s.iicRating} ≥ IIC ${i.iicRating} (meets or exceeds)`, weight: WEIGHTS.iicRating, score: WEIGHTS.iicRating, category: cat };
  if (Math.abs(diff) <= 3) return { pass: true, details: `IIC ${s.iicRating} vs IIC ${i.iicRating} (${diff} — within ±3 tolerance)`, weight: WEIGHTS.iicRating, score: WEIGHTS.iicRating * 0.7, category: cat };
  return { pass: false, details: `IIC ${s.iicRating} vs IIC ${i.iicRating} (${diff} — exceeds −3 tolerance)`, weight: WEIGHTS.iicRating, score: 0, category: cat };
}

function checkNrcRating(i: MaterialTechnicalSpecs, s: MaterialTechnicalSpecs): ShowstopperCheck {
  const cat: MetricCategory = 'acoustic';
  if (i.nrcRating == null) return { ...skip('Skipped — NRC not specified'), category: cat };
  if (s.nrcRating == null) return { pass: false, details: 'Sustainable material missing NRC rating', weight: WEIGHTS.nrcRating, score: 0, category: cat };
  const diff = pct(i.nrcRating, s.nrcRating);
  if (s.nrcRating >= i.nrcRating) return { pass: true, details: `NRC ${s.nrcRating} ≥ ${i.nrcRating} (meets or exceeds)`, weight: WEIGHTS.nrcRating, score: WEIGHTS.nrcRating, category: cat };
  if (Math.abs(diff) <= 15) return { pass: true, details: `NRC ${s.nrcRating} vs ${i.nrcRating} (${diff.toFixed(1)}%, within 15% tolerance)`, weight: WEIGHTS.nrcRating, score: WEIGHTS.nrcRating * 0.7, category: cat };
  return { pass: false, details: `NRC ${s.nrcRating} vs ${i.nrcRating} (${diff.toFixed(1)}% — acoustic absorption significantly reduced)`, weight: WEIGHTS.nrcRating, score: 0, category: cat };
}

// ─── Category 5: Installability ──────────────────────────────────────────────

function checkLaborUnits(i: MaterialTechnicalSpecs, s: MaterialTechnicalSpecs): ShowstopperCheck {
  const cat: MetricCategory = 'installability';
  if (i.laborUnitsPerUnit == null) return { ...skip('Skipped — labor data not available'), category: cat };
  if (s.laborUnitsPerUnit == null) return { pass: false, details: 'Sustainable material missing labor units data', weight: WEIGHTS.laborUnits, score: 0, category: cat };
  const diff = pct(i.laborUnitsPerUnit, s.laborUnitsPerUnit);
  if (Math.abs(diff) <= 20) return { pass: true, details: `${s.laborUnitsPerUnit} hrs/unit vs ${i.laborUnitsPerUnit} hrs/unit (${diff > 0 ? '+' : ''}${diff.toFixed(1)}%, within ±20%)`, weight: WEIGHTS.laborUnits, score: WEIGHTS.laborUnits, category: cat };
  if (diff > 20 && diff <= 50) return { pass: false, details: `${s.laborUnitsPerUnit} hrs/unit vs ${i.laborUnitsPerUnit} hrs/unit (+${diff.toFixed(1)}% — significant labor cost increase, requires budget review)`, weight: WEIGHTS.laborUnits, score: 0, category: cat };
  return { pass: false, details: `${s.laborUnitsPerUnit} hrs/unit vs ${i.laborUnitsPerUnit} hrs/unit (${diff.toFixed(1)}% — exceeds ±20% tolerance)`, weight: WEIGHTS.laborUnits, score: 0, category: cat };
}

function checkInstallationDifficulty(i: MaterialTechnicalSpecs, s: MaterialTechnicalSpecs): ShowstopperCheck {
  const cat: MetricCategory = 'installability';
  if (i.installationDifficulty == null) return { ...skip('Skipped — difficulty rating not available'), category: cat };
  if (s.installationDifficulty == null) return { pass: false, details: 'Sustainable material missing installation difficulty rating', weight: WEIGHTS.installationDifficulty, score: 0, category: cat };
  const labels = ['', 'Very Easy', 'Easy', 'Moderate', 'Difficult', 'Specialist Required'];
  const diff = s.installationDifficulty - i.installationDifficulty;
  if (diff <= 0) return { pass: true, details: `Difficulty: ${labels[s.installationDifficulty]} (${s.installationDifficulty}/5) — same or easier than incumbent`, weight: WEIGHTS.installationDifficulty, score: WEIGHTS.installationDifficulty, category: cat };
  if (diff === 1) return { pass: false, details: `Difficulty: ${labels[s.installationDifficulty]} (${s.installationDifficulty}/5) vs incumbent ${labels[i.installationDifficulty]} (${i.installationDifficulty}/5) — one level harder, may require crew retraining`, weight: WEIGHTS.installationDifficulty, score: 0, category: cat };
  return { pass: false, details: `Difficulty: ${labels[s.installationDifficulty]} (${s.installationDifficulty}/5) vs incumbent ${labels[i.installationDifficulty]} (${i.installationDifficulty}/5) — significantly harder, specialist crew required`, weight: WEIGHTS.installationDifficulty, score: 0, category: cat };
}

function checkWeightPerUnit(i: MaterialTechnicalSpecs, s: MaterialTechnicalSpecs): ShowstopperCheck {
  const cat: MetricCategory = 'installability';
  if (i.weightPerUnit == null) return { ...skip('Skipped — weight data not available'), category: cat };
  if (s.weightPerUnit == null) return { pass: false, details: 'Sustainable material missing weight per unit', weight: WEIGHTS.weightPerUnit, score: 0, category: cat };
  const diff = pct(i.weightPerUnit, s.weightPerUnit);
  if (Math.abs(diff) <= 25) return { pass: true, details: `${s.weightPerUnit} lbs/unit vs ${i.weightPerUnit} lbs/unit (${diff > 0 ? '+' : ''}${diff.toFixed(1)}%, within ±25%)`, weight: WEIGHTS.weightPerUnit, score: WEIGHTS.weightPerUnit, category: cat };
  if (diff > 50) return { pass: false, details: `${s.weightPerUnit} lbs/unit vs ${i.weightPerUnit} lbs/unit (+${diff.toFixed(1)}% — structural loading and handling must be re-evaluated)`, weight: WEIGHTS.weightPerUnit, score: 0, category: cat };
  return { pass: false, details: `${s.weightPerUnit} lbs/unit vs ${i.weightPerUnit} lbs/unit (${diff.toFixed(1)}% — exceeds ±25% tolerance)`, weight: WEIGHTS.weightPerUnit, score: 0, category: cat };
}

function checkCureTime(i: MaterialTechnicalSpecs, s: MaterialTechnicalSpecs): ShowstopperCheck {
  const cat: MetricCategory = 'installability';
  if (i.cureTimeHours == null) return { ...skip('Skipped — cure time not applicable'), category: cat };
  if (s.cureTimeHours == null) return { pass: false, details: 'Sustainable material missing cure time data', weight: WEIGHTS.cureTime, score: 0, category: cat };
  const diff = pct(i.cureTimeHours, s.cureTimeHours);
  if (s.cureTimeHours <= i.cureTimeHours) return { pass: true, details: `${s.cureTimeHours}hr cure ≤ ${i.cureTimeHours}hr (schedule maintained or improved)`, weight: WEIGHTS.cureTime, score: WEIGHTS.cureTime, category: cat };
  if (diff <= 50) return { pass: false, details: `${s.cureTimeHours}hr cure vs ${i.cureTimeHours}hr (+${diff.toFixed(0)}% — schedule impact, review critical path)`, weight: WEIGHTS.cureTime, score: 0, category: cat };
  return { pass: false, details: `${s.cureTimeHours}hr cure vs ${i.cureTimeHours}hr (+${diff.toFixed(0)}% — significant schedule impact)`, weight: WEIGHTS.cureTime, score: 0, category: cat };
}

function checkWarrantyYears(i: MaterialTechnicalSpecs, s: MaterialTechnicalSpecs): ShowstopperCheck {
  const cat: MetricCategory = 'installability';
  if (i.warrantyYears == null) return { ...skip('Skipped — warranty data not available'), category: cat };
  if (s.warrantyYears == null) return { pass: false, details: 'Sustainable material missing warranty data', weight: WEIGHTS.warrantyYears, score: 0, category: cat };
  if (s.warrantyYears >= i.warrantyYears) return { pass: true, details: `${s.warrantyYears}-year warranty ≥ ${i.warrantyYears}-year (meets or exceeds)`, weight: WEIGHTS.warrantyYears, score: WEIGHTS.warrantyYears, category: cat };
  const diff = i.warrantyYears - s.warrantyYears;
  if (diff <= 2) return { pass: false, details: `${s.warrantyYears}-year warranty vs ${i.warrantyYears}-year (${diff}-year shortfall — verify owner requirements)`, weight: WEIGHTS.warrantyYears, score: 0, category: cat };
  return { pass: false, details: `${s.warrantyYears}-year warranty vs ${i.warrantyYears}-year (${diff}-year shortfall — may not meet owner requirements)`, weight: WEIGHTS.warrantyYears, score: 0, category: cat };
}

// ─── Category Summary Builder ────────────────────────────────────────────────

function buildCategorySummary(
  category: MetricCategory,
  label: string,
  checks: ShowstopperCheck[]
): CategorySummary {
  const active = checks.filter(c => c.weight > 0);
  const passed = active.filter(c => c.pass).length;
  const failed = active.filter(c => !c.pass).length;
  const skipped = checks.filter(c => c.weight === 0).length;
  const totalWeight = active.reduce((sum, c) => sum + c.weight, 0);
  const totalScore = active.reduce((sum, c) => sum + c.score, 0);
  const score = totalWeight > 0 ? Math.round((totalScore / totalWeight) * 100) : 0;
  const status = active.length === 0 ? 'SKIP' : failed === 0 ? 'PASS' : failed <= 1 ? 'WARN' : 'FAIL';
  return { category, label, passed, failed, skipped, score, status };
}

// ─── Main Validation Function ────────────────────────────────────────────────

export function validateSwap(
  incumbent: MaterialTechnicalSpecs,
  sustainable: MaterialTechnicalSpecs
): ValidationResult {
  const showstopperResults: ShowstopperResults = {
    // Category 1: Fire & Life Safety
    fireRating: checkFireRating(incumbent, sustainable),
    flamespreadIndex: checkFlamespreadIndex(incumbent, sustainable),
    smokeDevelopedIndex: checkSmokeDevelopedIndex(incumbent, sustainable),
    ulListing: checkUlListing(incumbent, sustainable),
    iccEsReport: checkIccEsReport(incumbent, sustainable),

    // Category 2: Structural
    astmMatch: checkAstmMatch(incumbent, sustainable),
    compressiveStrength: checkCompressiveStrength(incumbent, sustainable),
    tensileStrength: checkTensileStrength(incumbent, sustainable),
    flexuralStrength: checkFlexuralStrength(incumbent, sustainable),
    modulusOfElasticity: checkModulusOfElasticity(incumbent, sustainable),
    stiffness: checkStiffness(incumbent, sustainable),

    // Category 3: Thermal & Moisture
    rValue: checkRValue(incumbent, sustainable),
    lttr15Year: checkLttr15Year(incumbent, sustainable),
    thermalUValue: checkThermalUValue(incumbent, sustainable),
    permRating: checkPermRating(incumbent, sustainable),

    // Category 4: Acoustic
    stcRating: checkStcRating(incumbent, sustainable),
    iicRating: checkIicRating(incumbent, sustainable),
    nrcRating: checkNrcRating(incumbent, sustainable),

    // Category 5: Installability
    laborUnits: checkLaborUnits(incumbent, sustainable),
    installationDifficulty: checkInstallationDifficulty(incumbent, sustainable),
    weightPerUnit: checkWeightPerUnit(incumbent, sustainable),
    cureTime: checkCureTime(incumbent, sustainable),
    warrantyYears: checkWarrantyYears(incumbent, sustainable),
  };

  // Build category summaries
  const categorySummaries: CategorySummary[] = [
    buildCategorySummary('fire_life_safety', 'Fire & Life Safety', [
      showstopperResults.fireRating, showstopperResults.flamespreadIndex,
      showstopperResults.smokeDevelopedIndex, showstopperResults.ulListing,
      showstopperResults.iccEsReport,
    ]),
    buildCategorySummary('structural', 'Structural Performance', [
      showstopperResults.astmMatch, showstopperResults.compressiveStrength,
      showstopperResults.tensileStrength, showstopperResults.flexuralStrength,
      showstopperResults.modulusOfElasticity, showstopperResults.stiffness,
    ]),
    buildCategorySummary('thermal_moisture', 'Thermal & Moisture', [
      showstopperResults.rValue, showstopperResults.lttr15Year,
      showstopperResults.thermalUValue, showstopperResults.permRating,
    ]),
    buildCategorySummary('acoustic', 'Acoustic Performance', [
      showstopperResults.stcRating, showstopperResults.iicRating,
      showstopperResults.nrcRating,
    ]),
    buildCategorySummary('installability', 'Installability', [
      showstopperResults.laborUnits, showstopperResults.installationDifficulty,
      showstopperResults.weightPerUnit, showstopperResults.cureTime,
      showstopperResults.warrantyYears,
    ]),
  ];

  // Calculate overall totals
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
      if (check.pass) passedChecks++;
      else failedChecks++;
    }
  });

  const overallScore = totalWeight > 0 ? (totalScore / totalWeight) * 100 : 0;

  // Determine validation status
  let validationStatus: ValidationStatus;
  let recommendation: string;

  // Fire & life safety failures are always hard blockers regardless of overall score
  const fireSafetyFailed = [
    showstopperResults.fireRating,
    showstopperResults.flamespreadIndex,
    showstopperResults.smokeDevelopedIndex,
  ].filter(c => c.weight > 0 && !c.pass).length;

  if (fireSafetyFailed > 0) {
    validationStatus = 'REJECTED';
    recommendation = `REJECTED — ${fireSafetyFailed} fire/life safety failure(s). Fire rating, flame spread, and smoke developed index failures are hard blockers. Substitution cannot proceed without code analysis and AHJ approval.`;
  } else if (overallScore >= 90 && failedChecks === 0) {
    validationStatus = 'APPROVED';
    recommendation = 'APPROVED for substitution. All 5 metric categories pass. Material is functionally equivalent across fire/life safety, structural, thermal, acoustic, and installability criteria.';
  } else if (overallScore >= 70 && failedChecks <= 2) {
    validationStatus = 'EXPERIMENTAL';
    recommendation = `EXPERIMENTAL — ${failedChecks} check(s) failed (score: ${overallScore.toFixed(1)}%). Requires engineering review. See category summaries for specific deviations.`;
  } else {
    validationStatus = 'REJECTED';
    recommendation = `REJECTED — ${failedChecks} check(s) failed (score: ${overallScore.toFixed(1)}%). Significant functional differences across multiple categories make substitution impractical without design modifications.`;
  }

  // Generate architect-readable notes
  const architectNotes: string[] = [];
  categorySummaries.forEach(cat => {
    if (cat.status === 'FAIL') architectNotes.push(`${cat.label}: ${cat.failed} check(s) failed — review required before proceeding`);
    if (cat.status === 'WARN') architectNotes.push(`${cat.label}: 1 minor deviation — engineering review recommended`);
  });
  if (architectNotes.length === 0) architectNotes.push('All metric categories pass. Standard substitution request process applies.');

  return {
    validationStatus,
    overallScore,
    showstopperResults,
    categorySummaries,
    failedChecks,
    passedChecks,
    skippedChecks,
    recommendation,
    architectNotes,
  };
}
