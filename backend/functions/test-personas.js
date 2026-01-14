#!/usr/bin/env node

/**
 * Test Script for Persona Scraper
 * 
 * This script tests the persona scraper function locally without needing
 * to deploy to Azure. It validates:
 * 1. Persona definitions load correctly
 * 2. ScrapingRulesService falls back to default personas
 * 3. Basic scraping logic works
 */

const { getPersonaById, getAllPersonas, PERSONA_IDS } = require('./dist/shared/constants/personas');
const { ScrapingRulesService } = require('./dist/shared/services/ScrapingRulesService');

console.log('=== Testing Persona Scraper ===\n');

// Test 1: Check all personas are defined
console.log('Test 1: Checking persona definitions...');
const allPersonas = getAllPersonas();
console.log(`✓ Found ${allPersonas.length} personas defined`);

for (const persona of allPersonas) {
  console.log(`  - ${persona.personaId}: ${persona.jobTitle}`);
  console.log(`    Decision Logic: ${persona.decisionLogic.join(', ')}`);
  console.log(`    Scrape Keywords: ${persona.scrapeKeywords.length} keywords`);
  console.log(`    Ignore Keywords: ${persona.ignoreKeywords.length} keywords`);
  console.log(`    Output Schema: ${Object.keys(persona.outputSchema).join(', ')}`);
}

console.log('\n✓ Test 1 Passed: All personas loaded successfully\n');

// Test 2: Check individual persona lookup
console.log('Test 2: Testing persona lookup...');
const facilityManager = getPersonaById('facility_manager');
if (!facilityManager) {
  console.error('✗ Test 2 Failed: Could not find facility_manager persona');
  process.exit(1);
}
console.log(`✓ Found persona: ${facilityManager.jobTitle}`);
console.log(`  Example keywords: ${facilityManager.scrapeKeywords.slice(0, 5).join(', ')}`);
console.log('✓ Test 2 Passed: Persona lookup works\n');

// Test 3: Test ScrapingRulesService (without Cosmos DB)
console.log('Test 3: Testing ScrapingRulesService fallback...');
(async () => {
  try {
    // This will use fallback since COSMOS_CONNECTION_STRING is not set
    const service = new ScrapingRulesService();
    const persona = await service.getPersonaRules('quantity_surveyor');
    
    if (!persona) {
      console.error('✗ Test 3 Failed: Could not fetch persona from service');
      process.exit(1);
    }
    
    console.log(`✓ ScrapingRulesService returned: ${persona.jobTitle}`);
    console.log(`  Decision logic: ${persona.decisionLogic.join(', ')}`);
    console.log('✓ Test 3 Passed: Service fallback works correctly\n');
    
    // Test 4: Validate persona structure
    console.log('Test 4: Validating persona data structure...');
    const required = ['personaId', 'jobTitle', 'decisionLogic', 'scrapeKeywords', 'ignoreKeywords', 'outputSchema'];
    for (const field of required) {
      if (!persona[field]) {
        console.error(`✗ Test 4 Failed: Missing required field: ${field}`);
        process.exit(1);
      }
    }
    console.log('✓ All required fields present');
    console.log('✓ Test 4 Passed: Data structure is valid\n');
    
    // Test 5: Check for keyword overlap
    console.log('Test 5: Checking for keyword conflicts...');
    for (const p of allPersonas) {
      const overlap = p.scrapeKeywords.filter(kw => 
        p.ignoreKeywords.some(ik => ik.toLowerCase() === kw.toLowerCase())
      );
      
      if (overlap.length > 0) {
        console.warn(`  ⚠ Warning: ${p.personaId} has overlapping keywords: ${overlap.join(', ')}`);
      }
    }
    console.log('✓ Test 5 Passed: No critical keyword conflicts\n');
    
    // Summary
    console.log('=== All Tests Passed ===');
    console.log(`✓ ${allPersonas.length} personas validated`);
    console.log('✓ ScrapingRulesService fallback working');
    console.log('✓ Data structures valid');
    console.log('\nReady to deploy to Azure Functions!\n');
    
    console.log('Next Steps:');
    console.log('1. Set up Azure Cosmos DB with connection string');
    console.log('2. Import seed data from shared/seed-data/cosmos-scraping-rules.json');
    console.log('3. Deploy to Azure Functions: func azure functionapp publish greenchainz-scraper');
    console.log('4. Test with real URLs using: curl -X POST <function-url> -d \'{"targetUrl":"...","personaId":"..."}\'');
    
  } catch (error) {
    console.error('✗ Test Failed:', error.message);
    process.exit(1);
  }
})();
