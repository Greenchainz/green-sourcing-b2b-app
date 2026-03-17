import { AzureFunction, Context } from "@azure/functions";
import { scrapeMaterials, syncEPDDatabases, runDataJanitor } from '../../scripts/scraper-scheduler';
import { runScraperOutreachPipeline } from '../../server/scraper-outreach-pipeline';

/**
 * Azure Function Timer Trigger
 *
 * Runs daily at 2:00 AM UTC. Pipeline order:
 *   1. Scrape materials from EPD databases and Azure Maps
 *   2. Sync EPD databases (Building Transparency, EPD International)
 *   3. Run data janitor (dedup, clean stale records)
 *   4. Run outreach pipeline → email newly scraped suppliers about open RFQs
 *
 * Schedule: "0 0 2 * * *" (cron: second minute hour day month dayOfWeek)
 * To change schedule, edit function.json
 */
const timerTrigger: AzureFunction = async function (context: Context, myTimer: any): Promise<void> {
    const timestamp = new Date().toISOString();

    context.log('═══════════════════════════════════════════════════════════');
    context.log('  GreenChainz Automated Scraper + Outreach Pipeline');
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

        // Step 3: Data janitor
        context.log('\n🧹 Scheduling data janitor...');
        const janitorResult = await runDataJanitor();
        context.log(`✅ Data janitor queued: ${janitorResult.success}`);

        // Step 4: Outreach pipeline — email newly scraped suppliers about open RFQs
        // Runs after scraping so new suppliers are in the DB before matching
        context.log('\n📧 Starting supplier outreach pipeline...');
        const outreachResult = await runScraperOutreachPipeline();
        context.log(`✅ Outreach: sent=${outreachResult.sent} skipped=${outreachResult.skipped} errors=${outreachResult.errors}`);

        const totalQueued = materialResults.queued + syncResults.queued + (janitorResult.success ? 1 : 0);
        const totalFailed = materialResults.failed + syncResults.failed + (janitorResult.success ? 0 : 1) + outreachResult.errors;

        context.log('\n═══════════════════════════════════════════════════════════');
        context.log(`📈 Total jobs queued: ${totalQueued}`);
        context.log(`📧 Outreach emails sent: ${outreachResult.sent}`);
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
                    data_janitor: janitorResult,
                    outreach: outreachResult,
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
