import { NextRequest, NextResponse } from 'next/server';
import { sendToScraperQueue } from '@/lib/queue-service';
import { queryOne } from '@/lib/db';
import { scrapeMaterialData } from '@/lib/agents/scraper/scraper-agent';

/**
 * API Endpoint: /api/scrape/epd
 *
 * Handles requests to scrape/sync EPD (Environmental Product Declaration) data.
 * Checks for existing data in Materials table before queuing a new task.
 *
 * Query Params:
 * - mode=sync: Runs scraping immediately (limited by timeout).
 * - mode=async (default): Queues the task.
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { epd_id, url, userId } = body;
        const searchParams = request.nextUrl.searchParams;
        const mode = searchParams.get('mode') || 'async';

        if (!epd_id && !url) {
            return NextResponse.json(
                { error: "Missing epd_id or url" },
                { status: 400 }
            );
        }

        // Check cache (Materials table) if epd_id is provided
        if (epd_id) {
             try {
                 const cachedEPD = await queryOne(
                    `SELECT * FROM Materials WHERE EPDNumber = $1`,
                    [epd_id]
                 );
                 if (cachedEPD) {
                     return NextResponse.json({
                        success: true,
                        message: "Found cached EPD data.",
                        data: cachedEPD,
                        cached: true
                     });
                 }
             } catch (dbError) {
                 console.warn("⚠️ Database check failed for EPD:", dbError);
             }
        }

        // Synchronous Mode (Direct Scraper Call)
        if (mode === 'sync') {
            console.log(`⚡ Running synchronous scrape for EPD: ${epd_id || url}`);
            try {
                // scrapeMaterialData expects material_name. If we only have URL or ID,
                // we might need to adjust or pass ID as name if appropriate.
                // Assuming ID acts as name for EPD lookup in this context.
                const result = await scrapeMaterialData({
                    material_name: epd_id || url,
                    search_type: 'epddb',
                    extract_fields: ['gwp_per_unit', 'health_grade'],
                    save_to_db: true
                });

                return NextResponse.json({
                    success: true,
                    message: "EPD scrape complete",
                    data: result
                });
            } catch (syncError) {
                console.error("Sync scrape failed:", syncError);
                return NextResponse.json({
                    success: false,
                    error: "Synchronous scrape failed. Try async mode."
                }, { status: 500 });
            }
        }

        // Queue EPD sync task (Async Mode - Default)
        const result = await sendToScraperQueue("sync_epd", {
            epd_number: epd_id, // Mapped to expected payload
            url,
            requestedBy: userId
        });

        if (!result.queued) {
            return NextResponse.json({
                success: false,
                message: "Scraping service not configured.",
                fallback: true
            }, { status: 503 });
        }

        return NextResponse.json({
            success: true,
            message: "EPD sync job queued.",
            job_id: result.timestamp,
            epd_id
        }, { status: 202 });

    } catch (error) {
        console.error("EPD Scrape API Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}
