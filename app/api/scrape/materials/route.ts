import { NextRequest, NextResponse } from 'next/server';
import { sendToScraperQueue } from '@/lib/queue-service';

/**
 * API Endpoint: /api/scrape/materials
 *
 * Handles requests to extract material data from a URL.
 * Dispatches a 'scrape_url' task to the Azure Queue.
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { url, extract_fields, userId } = body;

        if (!url) {
             return NextResponse.json({ error: "Missing url" }, { status: 400 });
        }

        // Dispatch scrape_url task
        const result = await sendToScraperQueue("scrape_url", {
            url,
            extract_fields: extract_fields || [],
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
            message: "Material extraction job queued.",
            job_id: result.timestamp,
            url
        }, { status: 202 });

    } catch (error) {
        console.error("Material Scrape API Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}
