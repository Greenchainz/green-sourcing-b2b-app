import { AzureFunction, Context } from "@azure/functions";
import { scrapeMaterials, syncEPDDatabases, runDataJanitor } from '../../scripts/scraper-scheduler';

/**
 * Azure Function Timer Trigger
 * 
 * Runs daily at 2:00 AM UTC to scrape materials and sync EPD databases
 * Schedule: "0 0 2 * * *" (cron format: second minute hour day month dayOfWeek)
 * 
 * To change schedule, edit function.json
 */
const timerTrigger: AzureFunction = async function (context: Context, myTimer: any): Promise<void> {
    const timestamp = new Date().toISOString();
    
    context.log('═══════════════════════════════════════════════════════════');
    context.log('  GreenChainz Automated Scraper - Timer Trigger');
    context.log('  Execution time:', timestamp);
    context.log('═══════════════════════════════════════════════════════════');

    if (myTimer.isPastDue) {
        context.log('⚠️  Timer is running late!');
    }

    try {
        // Step 1: Scrape materials
        context.log('\n🔍 Starting material scraping...');
        const materialResults = await scrapeMaterials();
        context.log(`✅ Materials queued: ${materialResults.queued}`);

        // Step 2: Sync EPD databases
        context.log('\n🔄 Starting EPD database sync...');
        const syncResults = await syncEPDDatabases();
        context.log(`✅ EPD syncs queued: ${syncResults.queued}`);

        // Step 3: Schedule data janitor (runs after scraping completes)
        context.log('\n🧹 Scheduling data janitor...');
        const janitorResult = await runDataJanitor();
        context.log(`✅ Data janitor queued: ${janitorResult.success}`);

        // Summary
        const totalQueued = materialResults.queued + syncResults.queued + (janitorResult.success ? 1 : 0);
        const totalFailed = materialResults.failed + syncResults.failed + (janitorResult.success ? 0 : 1);

        context.log('\n═══════════════════════════════════════════════════════════');
        context.log(`📈 Total jobs queued: ${totalQueued}`);
        context.log(`❌ Total failures: ${totalFailed}`);
        context.log('═══════════════════════════════════════════════════════════');

        context.res = {
            status: 200,
            body: {
                success: true,
                timestamp,
                results: {
                    materials: materialResults,
                    epd_sync: syncResults,
                    data_janitor: janitorResult
                }
            }
        };

    } catch (error) {
        context.log.error('❌ Fatal error in scraper timer:', error);
        
        context.res = {
            status: 500,
            body: {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp
            }
        };
    }
};

export default timerTrigger;
