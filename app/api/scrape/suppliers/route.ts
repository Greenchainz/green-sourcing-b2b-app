import { NextRequest, NextResponse } from "next/server";
import { scrapeMaterialData } from "@/lib/agents/scraper/scraper-agent";

/**
 * API Endpoint: /api/scrape/suppliers
 * 
 * Triggers the "Scraper Agent" to find material data on-demand.
 * Called by the Excel Add-in when a material is not found in the DB.
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { material_name, search_type, extract_fields } = body;

        if (!material_name) {
            return NextResponse.json(
                { error: "Missing material_name" },
                { status: 400 }
            );
        }

        console.log(`Triggering scrape for: ${material_name}`);

        const result = await scrapeMaterialData({
            material_name,
            search_type: search_type || "epddb",
            extract_fields: extract_fields || ["gwp_per_unit"]
        });

        return NextResponse.json(result);

    } catch (error) {
        console.error("Scraper API Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Internal server error" },
            { status: 500 }
        );
    }
}
