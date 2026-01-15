/**
 * Viability Scoring Algorithm Tests
 * 
 * Tests for the Architecture of Equivalence scoring engine
 */

import { calculateViabilityScore, calculateViabilityScoresForAllPersonas } from '../../../lib/scoring/viability-scoring';
import { MaterialViabilityProfile, UserPersona } from '../../../types/schema';

describe('Viability Scoring Algorithm', () => {
  // Create a sample material profile for testing
  const sampleProfile: MaterialViabilityProfile = {
    productName: 'Test Carpet Tile',
    manufacturer: 'Test Manufacturer',
    astmStandards: [
      {
        designation: 'ASTM E84',
        title: 'Standard Test Method for Surface Burning Characteristics',
        compliant: true,
      },
      {
        designation: 'ASTM C518',
        title: 'Standard Test Method for Steady-State Thermal Transmission',
        compliant: true,
      },
    ],
    laborUnits: {
      installationHoursPerUnit: 0.5,
      maintenanceHoursPerYear: 2.0,
      unit: 'sq ft',
      skillLevelRequired: 2,
    },
    otifMetrics: {
      onTimePercentage: 90,
      inFullPercentage: 95,
      otifScore: 85,
      averageLeadTimeDays: 14,
      sampleSize: 100,
      dataFrom: new Date('2024-01-01'),
      dataTo: new Date('2024-12-31'),
    },
    environmentalMetrics: {
      gwp: 5.0,
      gwpUnit: 'kgCO2e',
      recyclability: 60,
      redListStatus: 'Free',
      epdSource: 'https://example.com/epd',
    },
    healthMetrics: {
      healthGrade: 'B',
      vocEmissions: 50,
      cdphCompliant: true,
    },
    costMetrics: {
      unitPrice: 25.0,
      currency: 'USD',
      totalCostPerYear: 30.0,
    },
    dataQuality: {
      completeness: 0.85,
      freshnessInDays: 30,
      sources: ['https://example.com/epd'],
      lastUpdated: new Date(),
    },
  };

  test('calculateViabilityScore should return valid score for Architect persona', () => {
    const result = calculateViabilityScore({
      profile: sampleProfile,
      persona: 'Architect',
    });

    expect(result.score).toBeDefined();
    expect(result.score.overall).toBeGreaterThanOrEqual(0);
    expect(result.score.overall).toBeLessThanOrEqual(100);
    expect(result.score.persona).toBe('Architect');
    expect(result.score.confidence).toBeGreaterThan(0);
  });

  test('calculateViabilityScore should return component scores', () => {
    const result = calculateViabilityScore({
      profile: sampleProfile,
      persona: 'GeneralContractor',
    });

    expect(result.score.environmental).toBeGreaterThanOrEqual(0);
    expect(result.score.labor).toBeGreaterThanOrEqual(0);
    expect(result.score.standards).toBeGreaterThanOrEqual(0);
    expect(result.score.delivery).toBeGreaterThanOrEqual(0);
    expect(result.score.cost).toBeGreaterThanOrEqual(0);
    expect(result.score.health).toBeGreaterThanOrEqual(0);
  });

  test('calculateViabilityScore should generate warnings for low scores', () => {
    const lowScoreProfile: MaterialViabilityProfile = {
      ...sampleProfile,
      astmStandards: [], // No standards - should trigger warning
      healthMetrics: {
        healthGrade: 'F', // Poor health grade
        vocEmissions: 500,
      },
    };

    const result = calculateViabilityScore({
      profile: lowScoreProfile,
      persona: 'InsuranceRiskManager',
    });

    expect(result.warnings).toBeDefined();
    expect(result.warnings!.length).toBeGreaterThan(0);
  });

  test('calculateViabilityScore should generate recommendations', () => {
    const result = calculateViabilityScore({
      profile: sampleProfile,
      persona: 'FacilityManager',
    });

    expect(result.recommendations).toBeDefined();
    expect(Array.isArray(result.recommendations)).toBe(true);
  });

  test('calculateViabilityScoresForAllPersonas should return scores for all personas', () => {
    const scores = calculateViabilityScoresForAllPersonas(sampleProfile);

    const personas: UserPersona[] = [
      'Architect',
      'GeneralContractor',
      'FacilityManager',
      'InsuranceRiskManager',
      'FlooringSubcontractor',
      'DrywallSubcontractor',
      'Distributor',
    ];

    for (const persona of personas) {
      expect(scores[persona]).toBeDefined();
      expect(scores[persona].overall).toBeGreaterThanOrEqual(0);
      expect(scores[persona].overall).toBeLessThanOrEqual(100);
      expect(scores[persona].persona).toBe(persona);
    }
  });

  test('scores should vary by persona weights', () => {
    const scores = calculateViabilityScoresForAllPersonas(sampleProfile);

    // Architect should weigh environmental and standards heavily
    const architectScore = scores.Architect;
    
    // General Contractor should weigh labor and delivery heavily
    const contractorScore = scores.GeneralContractor;

    // Scores should be different due to different weights
    expect(architectScore.overall).not.toBe(contractorScore.overall);
  });

  test('calculateViabilityScore should handle custom weights', () => {
    const result = calculateViabilityScore({
      profile: sampleProfile,
      persona: 'Architect',
      customWeights: {
        environmental: 0.5, // Override to 50%
        labor: 0.5, // Override to 50%
        standards: 0,
        delivery: 0,
        cost: 0,
        health: 0,
      },
    });

    expect(result.score).toBeDefined();
    expect(result.score.overall).toBeGreaterThanOrEqual(0);
    expect(result.score.overall).toBeLessThanOrEqual(100);
  });

  test('environmental score should be higher with EPD and Red List Free', () => {
    const profileWithEPD: MaterialViabilityProfile = {
      ...sampleProfile,
      environmentalMetrics: {
        gwp: 2.0, // Low GWP
        recyclability: 90, // High recyclability
        redListStatus: 'Free',
        epdSource: 'https://example.com/epd',
      },
    };

    const result = calculateViabilityScore({
      profile: profileWithEPD,
      persona: 'Architect',
    });

    expect(result.score.environmental).toBeGreaterThan(50);
  });

  test('labor score should be higher with low installation hours', () => {
    const easyInstallProfile: MaterialViabilityProfile = {
      ...sampleProfile,
      laborUnits: {
        installationHoursPerUnit: 0.2, // Very quick install
        maintenanceHoursPerYear: 1.0, // Low maintenance
        unit: 'sq ft',
        skillLevelRequired: 1, // Low skill required
      },
    };

    const result = calculateViabilityScore({
      profile: easyInstallProfile,
      persona: 'GeneralContractor',
    });

    expect(result.score.labor).toBeGreaterThan(60);
  });

  test('standards score should be 0 with no ASTM standards', () => {
    const noStandardsProfile: MaterialViabilityProfile = {
      ...sampleProfile,
      astmStandards: [],
    };

    const result = calculateViabilityScore({
      profile: noStandardsProfile,
      persona: 'InsuranceRiskManager',
    });

    expect(result.score.standards).toBe(0);
  });

  test('delivery score should match OTIF score', () => {
    const result = calculateViabilityScore({
      profile: sampleProfile,
      persona: 'Distributor',
    });

    // Delivery score should be close to OTIF score (85)
    expect(result.score.delivery).toBeGreaterThan(70);
    expect(result.score.delivery).toBeLessThan(95);
  });
});
