#!/usr/bin/env node

/**
 * Decision Logic Extractor Test Script
 * 
 * Run with: node backend/tests/manual/test-decision-logic.js
 */

const extractor = require('../../services/azure/decisionLogicExtractor');

console.log('='.repeat(80));
console.log('DECISION LOGIC EXTRACTOR - TEST SUITE');
console.log('='.repeat(80));

// Test Case 1: Flooring with all criteria
console.log('\n\n📦 TEST 1: Premium Flooring Product (High Relevance Expected)');
console.log('-'.repeat(80));

const flooringContent = `
Premium Vinyl Plank Flooring - GreenFloor Pro Series

Features:
- No stripping required - lifetime finish
- Polish only maintenance - buff to restore shine
- Click-lock installation system - completely adhesive-free
- Easy to clean with damp mop
- Maintenance schedule: Buff every 12 months

Sustainability:
- 30% recycled content
- Low VOC emissions
- LEED credits available
`;

const flooringResult = extractor.extractDecisionLogic(flooringContent);
console.log(JSON.stringify(flooringResult, null, 2));

// Test Case 2: Insulation with fire resistance data
console.log('\n\n🔥 TEST 2: Fire-Rated Insulation (High Relevance Expected)');
console.log('-'.repeat(80));

const insulationContent = `
FireShield Mineral Wool Insulation Board

Fire Safety:
- Non-combustible Class A1 rating
- Made from 100% mineral wool (rock wool composition)
- Fire resistance: 120 minutes (2-hour rating)
- Flame spread index: 5
- Smoke developed index: 10

Technical Specs:
- R-Value: 4.2 per inch
- Density: 4 lb/ft³
- Temperature rating: Up to 1200°F
`;

const insulationResult = extractor.extractDecisionLogic(insulationContent);
console.log(JSON.stringify(insulationResult, null, 2));

// Test Case 3: Structural with installation data
console.log('\n\n🏗️  TEST 3: Lightweight Drywall (High Relevance Expected)');
console.log('-'.repeat(80));

const structuralContent = `
UltraLite Gypsum Board by StructurePro

Installation Benefits:
- Lightweight design reduces installer fatigue
- Fast installation saves 30% labor time
- Weight specification: 1.6 lbs per square foot
- Standard utility knife for cutting - no special tools required

Product Details:
- 1/2" thickness
- Fire-rated Type X
- Mold and moisture resistant
`;

const structuralResult = extractor.extractDecisionLogic(structuralContent);
console.log(JSON.stringify(structuralResult, null, 2));

// Test Case 4: Generic product with no specific criteria (Low Relevance)
console.log('\n\n❌ TEST 4: Generic "Eco-Friendly" Product (Low Relevance Expected)');
console.log('-'.repeat(80));

const genericContent = `
EcoGreen Building Material

Our product is:
- Sustainable
- Eco-friendly
- Made from natural materials
- Good for the environment
- Reduces carbon footprint

Contact us for more information!
`;

const genericResult = extractor.extractDecisionLogic(genericContent);
console.log(JSON.stringify(genericResult, null, 2));

// Test Case 5: Facade material with partial data (Medium Relevance)
console.log('\n\n🏢 TEST 5: Facade Panel with Partial Data (Medium Relevance Expected)');
console.log('-'.repeat(80));

const facadeContent = `
Modern Facade Cladding System

Features:
- Non-combustible construction for building safety
- Aluminum composite panel design
- Weather-resistant coating
- 25-year warranty

Installation:
- Modular system for fast installation
- Pre-fabricated panels
`;

const facadeResult = extractor.extractDecisionLogic(facadeContent);
console.log(JSON.stringify(facadeResult, null, 2));

// Summary
console.log('\n\n' + '='.repeat(80));
console.log('TEST SUMMARY');
console.log('='.repeat(80));

const results = [
  { name: 'Premium Flooring', result: flooringResult },
  { name: 'Fire-Rated Insulation', result: insulationResult },
  { name: 'Lightweight Drywall', result: structuralResult },
  { name: 'Generic Eco Product', result: genericResult },
  { name: 'Facade Panel', result: facadeResult }
];

results.forEach(({ name, result }) => {
  const icon = result.relevanceScore === 'High' ? '✅' 
    : result.relevanceScore === 'Medium' ? '⚠️' 
    : '❌';
  
  console.log(`${icon} ${name.padEnd(25)} | Category: ${result.materialCategory.padEnd(12)} | Score: ${result.relevanceScore.padEnd(8)} | Missing: ${result.missingCriteria.length}`);
});

console.log('\n✅ All tests completed successfully!\n');
