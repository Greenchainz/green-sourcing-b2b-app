import { NextRequest, NextResponse } from 'next/server';
import { sendToScraperQueue } from '@/lib/queue-service';

/**
 * API Endpoint: /api/scrape/suppliers
 * 
 * REFACTORED: Now dispatches to Azure Queue instead of running scraper in-process.
 * The actual scraping is handled by the greenchainz-intelligence Azure Functions app.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { material_name, search_type, extract_fields, userId } = body;

    if (!material_name) {
      return NextResponse.json(
        { error: "Missing material_name" },
        { status: 400 }
      );
    }

    console.log(`📤 Dispatching scrape task for: ${material_name}`);

    // Instead of scraping now, we dispatch to the Intelligence Repo
    const result = await sendToScraperQueue("scrape_supplier", {
      material_name,
      search_type: search_type || "epddb",
      extract_fields: extract_fields || ["gwp_per_unit"],
      requestedBy: userId
    });

    if (!result.queued) {
      // Fallback: If queue not configured, return a message instead of failing
      return NextResponse.json({
        success: false,
        message: "Scraping service not configured. Please set up Azure Storage Queue.",
        fallback: true
      }, { status: 503 });
    }

    return NextResponse.json({
      success: true,
      message: "Scraping job queued. You will be notified when complete.",
      taskId: result.timestamp,
      material_name
    });

  } catch (error) {
    console.error("Scraper API Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
