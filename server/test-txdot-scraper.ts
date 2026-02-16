/**
 * TXDOT Scraper Test Script
 * 
 * Runs the TXDOT bid tab scraper in dry-run mode to verify functionality
 * Usage: pnpm tsx server/test-txdot-scraper.ts
 */

import { scrapeBidTotalsPage, scrapeTxdotPricingData, projectToPricingData } from './services/txdotScraper';

async function testSinglePage() {
  console.log('=== Testing Single Page Scraper ===\n');
  
  try {
    console.log('Scraping TXDOT bid totals page 1...');
    const projects = await scrapeBidTotalsPage(1);
    
    console.log(`\n✅ Successfully scraped ${projects.length} projects from page 1\n`);
    
    // Display first 3 projects
    projects.slice(0, 3).forEach((project, index) => {
      console.log(`\n--- Project ${index + 1} ---`);
      console.log(`County: ${project.county}`);
      console.log(`Type: ${project.projectType}`);
      console.log(`Highway: ${project.highway}`);
      console.log(`Contract: ${project.contractNumber}`);
      console.log(`Let Date: ${project.letDate}`);
      console.log(`Engineer Estimate: $${project.engineerEstimate.toLocaleString()}`);
      console.log(`Bids:`);
      project.bids.forEach((bid, bidIndex) => {
        console.log(`  ${bidIndex + 1}. ${bid.bidderName}: $${bid.bidAmount.toLocaleString()} (${bid.percentOverUnder > 0 ? '+' : ''}${bid.percentOverUnder}%)`);
      });
    });
    
    // Test pricing data conversion
    console.log('\n\n=== Testing Pricing Data Conversion ===\n');
    const firstProject = projects[0];
    if (firstProject) {
      const pricingData = projectToPricingData(firstProject, 1);
      console.log('Converted pricing data:');
      console.log(JSON.stringify(pricingData, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error scraping page:', error);
    throw error;
  }
}

async function testFullScraper() {
  console.log('\n\n=== Testing Full Scraper (All Pages) ===\n');
  console.log('⚠️  This will take ~40 seconds (36 pages × 1 second rate limit)\n');
  
  try {
    const allPricingData = await scrapeTxdotPricingData();
    
    console.log(`\n✅ Successfully scraped ${allPricingData.length} pricing records\n`);
    
    // Group by material category
    const byCategory = allPricingData.reduce((acc, data) => {
      acc[data.materialCategory] = (acc[data.materialCategory] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('Records by material category:');
    Object.entries(byCategory)
      .sort(([, a], [, b]) => b - a)
      .forEach(([category, count]) => {
        console.log(`  ${category}: ${count} records`);
      });
    
    // Group by county
    const byCounty = allPricingData.reduce((acc, data) => {
      acc[data.county] = (acc[data.county] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('\nTop 10 counties by record count:');
    Object.entries(byCounty)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .forEach(([county, count]) => {
        console.log(`  ${county}: ${count} records`);
      });
    
    // Average confidence score
    const avgConfidence = allPricingData.reduce((sum, data) => sum + data.dataConfidence, 0) / allPricingData.length;
    console.log(`\nAverage data confidence: ${avgConfidence.toFixed(1)}%`);
    
  } catch (error) {
    console.error('❌ Error running full scraper:', error);
    throw error;
  }
}

async function main() {
  console.log('TXDOT Bid Tab Scraper Test\n');
  console.log('This script tests the scraper without writing to the database.\n');
  
  const testMode = process.argv[2] || 'single';
  
  if (testMode === 'full') {
    await testFullScraper();
  } else {
    await testSinglePage();
  }
  
  console.log('\n✅ Test complete!\n');
}

main().catch((error) => {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
});
