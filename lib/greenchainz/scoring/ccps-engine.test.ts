/**
 * CCPS Engine — Assembly-Level Carbon Impact Tests
 *
 * Verifies that calculateAssemblyLevelImpact produces results that match the
 * architect's EWS spreadsheet math (e.g. EWS-1A: 166 × 92.903 ≈ 15,422 kgCO2e).
 */
import { describe, it, expect } from 'vitest';
import {
  calculateAssemblyLevelImpact,
} from './ccps-engine';

describe('calculateAssemblyLevelImpact', () => {
  it('rounds 166 × 92.903 to 15422 — matches architect EWS-1A math', () => {
    const result = calculateAssemblyLevelImpact({
      assemblyId: 'EWS-1A',
      epdNumber: '4789733794.109.1',
      gwpPerFunctionalUnit: 166,
      msfFactor: 92.903,
    });
    expect(result.totalKgCO2ePer1000SF).toBe(15422);
  });

  it('preserves all source fields in the result', () => {
    const result = calculateAssemblyLevelImpact({
      assemblyId: 'EWS-2B',
      description: 'Spandrel glazing',
      epdNumber: 'EPD-999',
      gwpPerFunctionalUnit: 100,
      msfFactor: 50,
      functionalUnitLabel: 'kgCO2e/kg',
    });
    expect(result.assemblyId).toBe('EWS-2B');
    expect(result.epdNumber).toBe('EPD-999');
    expect(result.gwpPerFunctionalUnit).toBe(100);
    expect(result.msfFactor).toBe(50);
    expect(result.totalKgCO2ePer1000SF).toBe(5000);
  });

  it('returns 0 when either GWP or MSF factor is 0', () => {
    const zeroGwp = calculateAssemblyLevelImpact({
      assemblyId: 'EWS-0',
      epdNumber: 'EPD-0',
      gwpPerFunctionalUnit: 0,
      msfFactor: 92.903,
    });
    expect(zeroGwp.totalKgCO2ePer1000SF).toBe(0);

    const zeroFactor = calculateAssemblyLevelImpact({
      assemblyId: 'EWS-0',
      epdNumber: 'EPD-0',
      gwpPerFunctionalUnit: 166,
      msfFactor: 0,
    });
    expect(zeroFactor.totalKgCO2ePer1000SF).toBe(0);
  });
});
