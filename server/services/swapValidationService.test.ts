/**
 * Swap Validation Service Tests
 * 
 * Tests all showstopper checks and classification logic
 */

import { describe, it, expect } from 'vitest';
import { validateSwap, type MaterialTechnicalSpecs } from './swapValidationService';

describe('Swap Validation Engine', () => {
  // ─── Test Materials ───────────────────────────────────────────────────────
  
  const incumbentConcrete: MaterialTechnicalSpecs = {
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
  
  const sustainableConcrete: MaterialTechnicalSpecs = {
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
  
  const incumbentInsulation: MaterialTechnicalSpecs = {
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
  
  // ─── APPROVED Scenario Tests ─────────────────────────────────────────────
  
  describe('APPROVED Classification', () => {
    it('should approve functionally identical materials', () => {
      const result = validateSwap(incumbentConcrete, sustainableConcrete);
      
      expect(result.validationStatus).toBe('APPROVED');
      expect(result.overallScore).toBeGreaterThanOrEqual(90);
      expect(result.failedChecks).toBe(0);
      expect(result.passedChecks).toBeGreaterThan(0);
    });
    
    it('should pass ASTM exact match check', () => {
      const result = validateSwap(incumbentConcrete, sustainableConcrete);
      
      expect(result.showstopperResults.astmMatch.pass).toBe(true);
      expect(result.showstopperResults.astmMatch.details).toContain('Exact match');
    });
    
    it('should pass fire rating within ±1 hour', () => {
      const result = validateSwap(incumbentConcrete, sustainableConcrete);
      
      expect(result.showstopperResults.fireRating.pass).toBe(true);
      expect(result.showstopperResults.fireRating.details).toContain('2hr vs 2hr');
    });
    
    it('should pass compressive strength within ±10%', () => {
      const result = validateSwap(incumbentConcrete, sustainableConcrete);
      
      expect(result.showstopperResults.compressiveStrength.pass).toBe(true);
      expect(result.showstopperResults.compressiveStrength.details).toContain('+5.0%');
    });
    
    it('should pass R-value within ±5%', () => {
      const result = validateSwap(incumbentConcrete, sustainableConcrete);
      
      expect(result.showstopperResults.rValue.pass).toBe(true);
    });
    
    it('should pass STC rating within ±3 points', () => {
      const result = validateSwap(incumbentConcrete, sustainableConcrete);
      
      expect(result.showstopperResults.stcRating.pass).toBe(true);
      expect(result.showstopperResults.stcRating.details).toContain('STC 51 vs STC 50');
    });
  });
  
  // ─── EXPERIMENTAL Scenario Tests ──────────────────────────────────────────
  
  describe('EXPERIMENTAL Classification', () => {
    it('should classify as EXPERIMENTAL with 1-2 minor failures', () => {
      const experimentalMaterial: MaterialTechnicalSpecs = {
        ...sustainableConcrete,
        astmCodes: 'C150, C618', // Different ASTM code (80% overlap)
        rValuePerInch: 0.074, // -7.5% (within EXPERIMENTAL range)
      };
      
      const result = validateSwap(incumbentConcrete, experimentalMaterial);
      
      expect(result.validationStatus).toBe('EXPERIMENTAL');
      expect(result.overallScore).toBeGreaterThanOrEqual(70);
      expect(result.overallScore).toBeLessThan(90);
      expect(result.failedChecks).toBeLessThanOrEqual(2);
    });
    
    it('should flag ASTM 80% overlap as passing with reduced score', () => {
      const experimentalMaterial: MaterialTechnicalSpecs = {
        ...sustainableConcrete,
        astmCodes: 'C150', // Only 50% overlap
      };
      
      const result = validateSwap(incumbentConcrete, experimentalMaterial);
      
      expect(result.showstopperResults.astmMatch.pass).toBe(false);
      expect(result.showstopperResults.astmMatch.details).toContain('50% overlap');
    });
    
    it('should flag R-value -7% as EXPERIMENTAL', () => {
      const experimentalMaterial: MaterialTechnicalSpecs = {
        ...incumbentInsulation,
        rValuePerInch: 6.0, // -7.7% from 6.5
      };
      
      const result = validateSwap(incumbentInsulation, experimentalMaterial);
      
      expect(result.showstopperResults.rValue.pass).toBe(false);
      expect(result.showstopperResults.rValue.details).toContain('-7.7%');
    });
  });
  
  // ─── REJECTED Scenario Tests ──────────────────────────────────────────────
  
  describe('REJECTED Classification', () => {
    it('should reject materials with 3+ failures', () => {
      const rejectedMaterial: MaterialTechnicalSpecs = {
        ...sustainableConcrete,
        astmCodes: 'C618', // No overlap
        fireRatingHours: 0, // >2 hour downgrade
        compressiveStrength: 3000, // -25% (exceeds tolerance)
      };
      
      const result = validateSwap(incumbentConcrete, rejectedMaterial);
      
      expect(result.validationStatus).toBe('REJECTED');
      expect(result.overallScore).toBeLessThan(70);
      expect(result.failedChecks).toBeGreaterThanOrEqual(3);
    });
    
    it('should fail ASTM with <80% overlap', () => {
      const rejectedMaterial: MaterialTechnicalSpecs = {
        ...sustainableConcrete,
        astmCodes: 'C618, C989', // 0% overlap
      };
      
      const result = validateSwap(incumbentConcrete, rejectedMaterial);
      
      expect(result.showstopperResults.astmMatch.pass).toBe(false);
      expect(result.showstopperResults.astmMatch.details).toContain('0% overlap');
    });
    
    it('should fail fire rating with >2 hour downgrade', () => {
      const rejectedMaterial: MaterialTechnicalSpecs = {
        ...sustainableConcrete,
        fireRatingHours: 0,
      };
      
      const result = validateSwap(incumbentConcrete, rejectedMaterial);
      
      expect(result.showstopperResults.fireRating.pass).toBe(false);
      expect(result.showstopperResults.fireRating.details).toContain('-2hr');
    });
    
    it('should fail compressive strength with >20% deviation', () => {
      const rejectedMaterial: MaterialTechnicalSpecs = {
        ...sustainableConcrete,
        compressiveStrength: 3000, // -25%
      };
      
      const result = validateSwap(incumbentConcrete, rejectedMaterial);
      
      expect(result.showstopperResults.compressiveStrength.pass).toBe(false);
      expect(result.showstopperResults.compressiveStrength.details).toContain('-25.0%');
    });
    
    it('should fail R-value with >10% downgrade', () => {
      const rejectedMaterial: MaterialTechnicalSpecs = {
        ...incumbentInsulation,
        rValuePerInch: 5.5, // -15.4%
      };
      
      const result = validateSwap(incumbentInsulation, rejectedMaterial);
      
      expect(result.showstopperResults.rValue.pass).toBe(false);
      expect(result.showstopperResults.rValue.details).toContain('-15.4%');
    });
    
    it('should fail STC rating with >5 point downgrade', () => {
      const rejectedMaterial: MaterialTechnicalSpecs = {
        ...sustainableConcrete,
        stcRating: 44, // -6 points
      };
      
      const result = validateSwap(incumbentConcrete, rejectedMaterial);
      
      expect(result.showstopperResults.stcRating.pass).toBe(false);
      expect(result.showstopperResults.stcRating.details).toContain('-6 points');
    });
  });
  
  // ─── Edge Case Tests ──────────────────────────────────────────────────────
  
  describe('Edge Cases', () => {
    it('should skip checks when incumbent has no data', () => {
      const minimalIncumbent: MaterialTechnicalSpecs = {
        astmCodes: 'C150',
        compressiveStrength: 4000,
      };
      
      const result = validateSwap(minimalIncumbent, sustainableConcrete);
      
      expect(result.skippedChecks).toBeGreaterThan(0);
      expect(result.showstopperResults.fireRating.weight).toBe(0);
      expect(result.showstopperResults.stcRating.weight).toBe(0);
    });
    
    it('should fail when sustainable material missing required data', () => {
      const incompleteMaterial: MaterialTechnicalSpecs = {
        astmCodes: 'C150',
        // Missing compressive strength
      };
      
      const result = validateSwap(incumbentConcrete, incompleteMaterial);
      
      expect(result.showstopperResults.compressiveStrength.pass).toBe(false);
      expect(result.showstopperResults.compressiveStrength.details).toContain('missing');
    });
    
    it('should handle perm rating class transitions', () => {
      const class1Material: MaterialTechnicalSpecs = {
        ...incumbentInsulation,
        permRating: 0.05, // Class I
      };
      
      const class2Material: MaterialTechnicalSpecs = {
        ...sustainableConcrete,
        permRating: 0.5, // Class II
      };
      
      const result = validateSwap(class1Material, class2Material);
      
      expect(result.showstopperResults.permRating.pass).toBe(true);
      expect(result.showstopperResults.permRating.details).toContain('adjacent category');
    });
    
    it('should fail perm rating with >1 class jump', () => {
      const class1Material: MaterialTechnicalSpecs = {
        ...incumbentInsulation,
        permRating: 0.05, // Class I
      };
      
      const class3Material: MaterialTechnicalSpecs = {
        ...sustainableConcrete,
        permRating: 5.0, // Class III
      };
      
      const result = validateSwap(class1Material, class3Material);
      
      expect(result.showstopperResults.permRating.pass).toBe(false);
      expect(result.showstopperResults.permRating.details).toContain('>1 category jump');
    });
    
    it('should handle missing UL listing', () => {
      const noUlMaterial: MaterialTechnicalSpecs = {
        ...sustainableConcrete,
        ulListing: null,
      };
      
      const result = validateSwap(incumbentConcrete, noUlMaterial);
      
      expect(result.showstopperResults.ulListing.pass).toBe(false);
      expect(result.showstopperResults.ulListing.details).toContain('missing UL listing');
    });
    
    it('should pass labor units within ±20%', () => {
      const result = validateSwap(incumbentConcrete, sustainableConcrete);
      
      expect(result.showstopperResults.laborUnits.pass).toBe(true);
      expect(result.showstopperResults.laborUnits.details).toContain('0.55 vs 0.5');
    });
  });
  
  // ─── Scoring Algorithm Tests ──────────────────────────────────────────────
  
  describe('Scoring Algorithm', () => {
    it('should calculate weighted score correctly', () => {
      const result = validateSwap(incumbentConcrete, sustainableConcrete);
      
      expect(result.overallScore).toBeGreaterThan(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
    });
    
    it('should count passed/failed/skipped checks', () => {
      const result = validateSwap(incumbentConcrete, sustainableConcrete);
      
      expect(result.passedChecks + result.failedChecks + result.skippedChecks).toBe(12);
    });
    
    it('should generate appropriate recommendation', () => {
      const approvedResult = validateSwap(incumbentConcrete, sustainableConcrete);
      expect(approvedResult.recommendation).toContain('APPROVED');
      expect(approvedResult.recommendation).toContain('functionally equivalent');
      
      const rejectedMaterial: MaterialTechnicalSpecs = {
        ...sustainableConcrete,
        compressiveStrength: 3000,
        fireRatingHours: 0,
        astmCodes: 'C618',
      };
      const rejectedResult = validateSwap(incumbentConcrete, rejectedMaterial);
      expect(rejectedResult.recommendation).toContain('REJECTED');
      expect(rejectedResult.recommendation).toContain('impractical');
    });
  });
});
