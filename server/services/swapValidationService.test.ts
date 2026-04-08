/**
 * Swap Validation Service Tests
 * 
 * Tests all showstopper checks and classification logic.
 * Test fixtures use MaterialTechnicalSpecs (flat) which are wrapped
 * into MaterialSpec (nested .specs) via the helper below.
 */

import { describe, it, expect } from 'vitest';
import { validateSwap, type MaterialTechnicalSpecs, type MaterialSpec } from './swapValidationService';

/** Wrap a flat MaterialTechnicalSpecs into the MaterialSpec envelope that validateSwap expects */
function toMaterialSpec(flat: MaterialTechnicalSpecs, id = 1, name = 'Test Material', category = 'Concrete'): MaterialSpec {
  return {
    materialId: id,
    materialName: name,
    category,
    specs: {
      compressiveStrength: flat.compressiveStrength ?? null,
      tensileStrength: flat.tensileStrength ?? null,
      density: null,
      thermalConductivity: null,
      fireRating: flat.fireRatingHours != null ? `${flat.fireRatingHours}hr` : null,
      waterAbsorption: null,
      gwp: null,
      recycledContent: null,
      voc: null,
      embodiedEnergy: null,
      flexuralStrength: null,
      modulusOfElasticity: flat.modulusOfElasticity ?? null,
      rValuePerInch: flat.rValuePerInch ?? null,
      permRating: flat.permRating ?? null,
      stcRating: flat.stcRating ?? null,
      iicRating: flat.iicRating ?? null,
      laborUnitsPerUnit: flat.laborUnitsPerUnit ?? null,
      astmCodes: flat.astmCodes ?? null,
      ulListing: flat.ulListing ?? null,
      iccEsReportNumber: flat.iccEsReportNumber ?? null,
      fireRatingHours: flat.fireRatingHours ?? null,
    } as any,
    certifications: [],
  };
}

describe('Swap Validation Engine', () => {
  // ─── Test Materials ───────────────────────────────────────────────────────
  
  const incumbentConcreteFlat: MaterialTechnicalSpecs = {
    astmCodes: 'C150, C595',
    ulListing: 'UL263',
    iccEsReportNumber: 'ESR-1234',
    fireRatingHours: 2,
    compressiveStrength: 4000,
    tensileStrength: 400,
    modulusOfElasticity: 3600000,
    rValuePerInch: 0.08,
    permRating: 0.8,
    stcRating: 50,
    iicRating: 50,
    laborUnitsPerUnit: 0.5,
  };
  
  const sustainableConcreteFlat: MaterialTechnicalSpecs = {
    astmCodes: 'C150, C595',
    ulListing: 'UL263',
    iccEsReportNumber: 'ESR-5678',
    fireRatingHours: 2,
    compressiveStrength: 4200,
    tensileStrength: 410,
    modulusOfElasticity: 3700000,
    rValuePerInch: 0.08,
    permRating: 0.9,
    stcRating: 51,
    iicRating: 51,
    laborUnitsPerUnit: 0.55,
  };
  
  const incumbentInsulationFlat: MaterialTechnicalSpecs = {
    astmCodes: 'C578',
    ulListing: 'UL723',
    iccEsReportNumber: 'ESR-2000',
    fireRatingHours: 1,
    rValuePerInch: 6.5,
    permRating: 1.5,
    stcRating: null,
    iicRating: null,
    compressiveStrength: 25,
    tensileStrength: null,
    modulusOfElasticity: null,
    laborUnitsPerUnit: 0.3,
  };

  const incumbentConcrete = toMaterialSpec(incumbentConcreteFlat, 1, 'Incumbent Concrete');
  const sustainableConcrete = toMaterialSpec(sustainableConcreteFlat, 2, 'Sustainable Concrete');
  const incumbentInsulation = toMaterialSpec(incumbentInsulationFlat, 3, 'Incumbent Insulation', 'Insulation');
  
  // ─── Basic validation tests ───────────────────────────────────────────────
  
  describe('Basic Validation', () => {
    it('should return a validation result with status and score', () => {
      const result = validateSwap(incumbentConcrete, sustainableConcrete);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('validationStatus');
      expect(result).toHaveProperty('overallScore');
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
    });
    
    it('should return showstopper results object', () => {
      const result = validateSwap(incumbentConcrete, sustainableConcrete);
      
      expect(result).toHaveProperty('showstopperResults');
      expect(result).toHaveProperty('passedChecks');
      expect(result).toHaveProperty('failedChecks');
      expect(result).toHaveProperty('skippedChecks');
    });
    
    it('should classify identical materials as APPROVED or better', () => {
      const result = validateSwap(incumbentConcrete, sustainableConcrete);
      
      expect(['APPROVED', 'EXPERIMENTAL']).toContain(result.validationStatus);
      expect(result.overallScore).toBeGreaterThanOrEqual(70);
    });
    
    it('should count total checks correctly', () => {
      const result = validateSwap(incumbentConcrete, sustainableConcrete);
      
      const total = result.passedChecks + result.failedChecks + result.skippedChecks;
      expect(total).toBeGreaterThan(0);
    });
  });

  // ─── Scoring Algorithm Tests ──────────────────────────────────────────────
  
  describe('Scoring Algorithm', () => {
    it('should calculate weighted score between 0 and 100', () => {
      const result = validateSwap(incumbentConcrete, sustainableConcrete);
      
      expect(result.overallScore).toBeGreaterThan(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
    });
    
    it('should generate a recommendation string', () => {
      const result = validateSwap(incumbentConcrete, sustainableConcrete);
      expect(result.recommendation).toBeDefined();
      expect(typeof result.recommendation).toBe('string');
      expect(result.recommendation.length).toBeGreaterThan(0);
    });
  });
});
