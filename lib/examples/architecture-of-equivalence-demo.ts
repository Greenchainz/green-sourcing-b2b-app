/**
 * Architecture of Equivalence - Integration Example
 * 
 * This script demonstrates how the different components work together:
 * 1. Extract specs from Revit model (mock)
 * 2. Scrape material data
 * 3. Build viability profile
 * 4. Calculate scores
 * 5. Save to Azure DB (mock)
 * 
 * Run with: npx ts-node lib/examples/architecture-of-equivalence-demo.ts
 */

import { mockRevitExtraction } from '../autodesk-interceptor';
import { calculateViabilityScoresForAllPersonas, calculateViabilityScore } from '../scoring/viability-scoring';
import { MaterialViabilityProfile, ASTMStandard, LaborUnits, OTIFMetrics } from '../../types/schema';

async function runDemo() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  Architecture of Equivalence - Integration Demo           ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Step 1: Extract specifications from Revit model
  console.log('📐 Step 1: Extracting specifications from Revit model...\n');
  const revitData = mockRevitExtraction('commercial-building.rvt');
  
  console.log(`   Model URN: ${revitData.modelUrn}`);
  console.log(`   Materials found: ${revitData.materials.length}`);
  console.log(`   Project: ${revitData.metadata?.projectName}\n`);

  // Process first material from Revit
  const revitMaterial = revitData.materials[0];
  console.log(`   Processing: ${revitMaterial.materialName}`);
  console.log(`   Manufacturer: ${revitMaterial.manufacturer}`);
  console.log(`   Required standards: ${revitMaterial.requiredStandards?.join(', ')}\n`);

  // Step 2: Build viability profile from Revit data
  console.log('🏗️  Step 2: Building Material Viability Profile...\n');
  
  const astmStandards: ASTMStandard[] = (revitMaterial.requiredStandards || []).map(std => ({
    designation: std,
    title: `Standard for ${revitMaterial.materialName}`,
    compliant: true,
    testDate: new Date(),
  }));

  const laborUnits: LaborUnits = {
    installationHoursPerUnit: 0.5,
    maintenanceHoursPerYear: 2.0,
    unit: revitMaterial.unit || 'sq ft',
    skillLevelRequired: 2,
  };

  const otifMetrics: OTIFMetrics = {
    onTimePercentage: 92,
    inFullPercentage: 96,
    otifScore: 88,
    averageLeadTimeDays: 12,
    leadTimeStdDev: 3,
    sampleSize: 150,
    dataFrom: new Date('2024-01-01'),
    dataTo: new Date('2024-12-31'),
  };

  const viabilityProfile: MaterialViabilityProfile = {
    productName: revitMaterial.productName || revitMaterial.materialName,
    manufacturer: revitMaterial.manufacturer || 'Unknown',
    sku: 'SKU-' + Math.random().toString(36).substr(2, 9),
    astmStandards,
    laborUnits,
    otifMetrics,
    environmentalMetrics: {
      gwp: 4.2,
      gwpUnit: 'kgCO2e',
      recyclability: 65,
      redListStatus: 'Free',
      epdSource: 'https://example.com/epd',
    },
    healthMetrics: {
      healthGrade: 'B',
      vocEmissions: 45,
      formaldehydeEmissions: 8,
      cdphCompliant: true,
    },
    costMetrics: {
      unitPrice: 28.50,
      currency: 'USD',
      totalCostPerYear: 32.00,
      priceVolatility: 0.15,
    },
    dataQuality: {
      completeness: 0.88,
      freshnessInDays: 0,
      sources: ['Revit Model', 'EPD Database'],
      lastUpdated: new Date(),
    },
  };

  console.log(`   ✅ Profile created for: ${viabilityProfile.productName}`);
  console.log(`   ASTM Standards: ${viabilityProfile.astmStandards.length}`);
  console.log(`   OTIF Score: ${viabilityProfile.otifMetrics.otifScore}%`);
  console.log(`   Data Completeness: ${(viabilityProfile.dataQuality.completeness * 100).toFixed(0)}%\n`);

  // Step 3: Calculate viability scores for all personas
  console.log('🎯 Step 3: Calculating viability scores for all personas...\n');
  
  const scores = calculateViabilityScoresForAllPersonas(viabilityProfile);

  console.log('   Persona-Weighted Scores:');
  console.log('   ┌─────────────────────────────┬─────────┬─────────┬─────────┐');
  console.log('   │ Persona                     │ Overall │ Environ │ Labor   │');
  console.log('   ├─────────────────────────────┼─────────┼─────────┼─────────┤');
  
  for (const [persona, score] of Object.entries(scores)) {
    const overall = score.overall.toFixed(1).padStart(5);
    const env = score.environmental.toFixed(1).padStart(5);
    const labor = score.labor.toFixed(1).padStart(5);
    console.log(`   │ ${persona.padEnd(27)} │ ${overall}   │ ${env}   │ ${labor}   │`);
  }
  console.log('   └─────────────────────────────┴─────────┴─────────┴─────────┘\n');

  // Step 4: Detailed analysis for Architect persona
  console.log('📊 Step 4: Detailed analysis for Architect persona...\n');
  
  const architectAnalysis = calculateViabilityScore({
    profile: viabilityProfile,
    persona: 'Architect',
  });

  console.log(`   Overall Score: ${architectAnalysis.score.overall.toFixed(1)}/100`);
  console.log(`   Confidence: ${(architectAnalysis.score.confidence * 100).toFixed(0)}%\n`);
  
  console.log('   Component Scores:');
  console.log(`     • Environmental: ${architectAnalysis.score.environmental.toFixed(1)}/100`);
  console.log(`     • Labor:         ${architectAnalysis.score.labor.toFixed(1)}/100`);
  console.log(`     • Standards:     ${architectAnalysis.score.standards.toFixed(1)}/100`);
  console.log(`     • Delivery:      ${architectAnalysis.score.delivery.toFixed(1)}/100`);
  console.log(`     • Cost:          ${architectAnalysis.score.cost.toFixed(1)}/100`);
  console.log(`     • Health:        ${architectAnalysis.score.health.toFixed(1)}/100\n`);

  if (architectAnalysis.warnings && architectAnalysis.warnings.length > 0) {
    console.log('   ⚠️  Warnings:');
    architectAnalysis.warnings.forEach(warning => {
      console.log(`     • ${warning}`);
    });
    console.log('');
  }

  if (architectAnalysis.recommendations && architectAnalysis.recommendations.length > 0) {
    console.log('   💡 Recommendations:');
    architectAnalysis.recommendations.forEach(rec => {
      console.log(`     • ${rec}`);
    });
    console.log('');
  }

  // Step 5: Summary
  console.log('✨ Step 5: Summary\n');
  console.log('   The Architecture of Equivalence engine has successfully:');
  console.log('   ✓ Extracted material specs from Revit model');
  console.log('   ✓ Built comprehensive viability profile with hard metrics');
  console.log('   ✓ Calculated persona-weighted scores (7 personas)');
  console.log('   ✓ Generated actionable recommendations\n');

  console.log('   This transforms the platform from simple sustainability');
  console.log('   reporting to full-risk management with viability profiles.\n');

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  Demo Complete                                             ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
}

// Run the demo if this file is executed directly
if (require.main === module) {
  runDemo().catch(console.error);
}

export { runDemo };
