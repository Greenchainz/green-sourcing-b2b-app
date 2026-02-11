/**
 * GreenChainz Automated Scraper Scheduler
 * 
 * This script dispatches scraping jobs to the Azure Queue on a schedule.
 * Can be run as:
 * - Azure Function with timer trigger (recommended for production)
 * - Cron job on a server
 * - Manual execution for testing
 * 
 * Usage:
 *   npx tsx scripts/scraper-scheduler.ts
 */

import { sendToScraperQueue, sendToIntegrationQueue } from '../lib/queue-service';

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Material categories to scrape
 * These are common construction materials with high sustainability impact
 */
const MATERIAL_CATEGORIES = [
  // Structural materials
  'concrete',
  'steel',
  'rebar',
  'structural steel',
  'precast concrete',
  
  // Insulation
  'mineral wool insulation',
  'fiberglass insulation',
  'spray foam insulation',
  'rigid foam insulation',
  
  // Cladding & Envelope
  'aluminum cladding',
  'glass curtain wall',
  'metal panels',
  'fiber cement siding',
  
  // Interior finishes
  'gypsum board',
  'acoustic ceiling tiles',
  'vinyl flooring',
  'carpet tiles',
  'ceramic tile',
  
  // Wood products
  'CLT panels',
  'glulam beams',
  'plywood',
  'oriented strand board',
  
  // Mechanical/Electrical
  'copper piping',
  'PVC piping',
  'electrical conduit',
  'ductwork',
];

/**
 * Supplier databases to scrape
 */
const SUPPLIER_SOURCES = [
  {
    name: 'Autodesk SDA (Sustainable Design API)',
    url: 'https://developer.api.autodesk.com/construction/carbon/v1',
    type: 'autodesk_sda'
  },
  {
    name: 'EC3 Database',
    url: 'https://buildingtransparency.org/ec3',
    type: 'ec3'
  },
  {
    name: 'EPD International',
    url: 'https://www.environdec.com/home',
    type: 'epd'
  },
  {
    name: 'Building Transparency',
    url: 'https://www.buildingtransparency.org',
    type: 'building_transparency'
  }
];

// ============================================================================
// SCRAPER FUNCTIONS
// ============================================================================

/**
 * Dispatch material scraping jobs
 */
async function scrapeMaterials() {
  console.log('\n🔍 Starting material scraping jobs...\n');
  
  const results = {
    queued: 0,
    failed: 0,
    materials: [] as string[]
  };

  for (const material of MATERIAL_CATEGORIES) {
    try {
      console.log(`📤 Queuing scrape job for: ${material}`);
      
      const result = await sendToScraperQueue('scrape_supplier', {
        material_name: material,
        search_type: 'epddb',
        extract_fields: ['gwp_per_unit', 'manufacturer', 'product_name', 'epd_url'],
        requestedBy: 'automated_scheduler'
      });

      if (result.queued) {
        results.queued++;
        results.materials.push(material);
        console.log(`  ✅ Queued: ${material}`);
      } else {
        results.failed++;
        console.log(`  ❌ Failed: ${material} - ${result.reason}`);
      }

      // Rate limiting: wait 2 seconds between jobs
      await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error) {
      results.failed++;
      console.error(`  ❌ Error queuing ${material}:`, error);
    }
  }

  console.log(`\n📊 Material scraping summary:`);
  console.log(`   Queued: ${results.queued}`);
  console.log(`   Failed: ${results.failed}`);
  console.log(`   Total: ${MATERIAL_CATEGORIES.length}`);

  return results;
}

/**
 * Dispatch EPD database sync jobs
 */
async function syncEPDDatabases() {
  console.log('\n🔄 Starting EPD database sync jobs...\n');
  
  const results = {
    queued: 0,
    failed: 0,
    sources: [] as string[]
  };

  for (const source of SUPPLIER_SOURCES) {
    try {
      console.log(`📤 Queuing sync job for: ${source.name}`);
      
      const result = await sendToIntegrationQueue('sync_epd', {
        source_name: source.name,
        source_url: source.url,
        source_type: source.type,
        requestedBy: 'automated_scheduler'
      });

      if (result.queued) {
        results.queued++;
        results.sources.push(source.name);
        console.log(`  ✅ Queued: ${source.name}`);
      } else {
        results.failed++;
        console.log(`  ❌ Failed: ${source.name} - ${result.reason}`);
      }

      // Rate limiting: wait 5 seconds between sync jobs (they're heavier)
      await new Promise(resolve => setTimeout(resolve, 5000));

    } catch (error) {
      results.failed++;
      console.error(`  ❌ Error queuing ${source.name}:`, error);
    }
  }

  console.log(`\n📊 EPD sync summary:`);
  console.log(`   Queued: ${results.queued}`);
  console.log(`   Failed: ${results.failed}`);
  console.log(`   Total: ${SUPPLIER_SOURCES.length}`);

  return results;
}

/**
 * Run data janitor to clean up and deduplicate scraped data
 */
async function runDataJanitor() {
  console.log('\n🧹 Running data janitor...\n');
  
  try {
    const result = await sendToIntegrationQueue('data_janitor', {
      operations: ['deduplicate', 'validate', 'enrich'],
      requestedBy: 'automated_scheduler'
    });

    if (result.queued) {
      console.log('  ✅ Data janitor job queued');
      return { success: true };
    } else {
      console.log(`  ❌ Failed to queue data janitor - ${result.reason}`);
      return { success: false, reason: result.reason };
    }
  } catch (error) {
    console.error('  ❌ Error queuing data janitor:', error);
    return { success: false, error };
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  GreenChainz Automated Scraper Scheduler');
  console.log('  Started:', new Date().toISOString());
  console.log('═══════════════════════════════════════════════════════════');

  try {
    // Step 1: Scrape materials
    const materialResults = await scrapeMaterials();

    // Step 2: Sync EPD databases
    const syncResults = await syncEPDDatabases();

    // Step 3: Run data janitor (after scraping completes)
    // Wait 5 minutes to let scrapers finish before cleaning
    console.log('\n⏳ Waiting 5 minutes before running data janitor...');
    await new Promise(resolve => setTimeout(resolve, 5 * 60 * 1000));
    const janitorResult = await runDataJanitor();

    // Final summary
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  Scraper Scheduler Completed');
    console.log('  Finished:', new Date().toISOString());
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`\n📈 Total jobs queued: ${materialResults.queued + syncResults.queued + (janitorResult.success ? 1 : 0)}`);
    console.log(`❌ Total failures: ${materialResults.failed + syncResults.failed + (janitorResult.success ? 0 : 1)}`);

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Fatal error in scraper scheduler:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { scrapeMaterials, syncEPDDatabases, runDataJanitor };
