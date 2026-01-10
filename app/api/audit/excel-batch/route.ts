import { NextRequest, NextResponse } from "next/server";

/**
 * Excel Batch Audit API (Migrated from Azure SQL to Postgres)
 * 
 * This endpoint receives a batch of material names from the Excel Add-in
 * and returns carbon/health data for each material.
 * 
 * Workflow:
 * 1. Check Backend API/Postgres for cached product data (Not fully implemented in this migration stub)
 * 2. If missing, trigger the scraper agent to find EPD data live
 * 3. Return health grade (A/C/F) and carbon score
 * 
 * Note: This endpoint was migrated from 'mssql' (SQL Server) to align with the Postgres migration.
 * The direct SQL connection has been removed in favor of a future API call to the backend service.
 */

interface AuditResult {
    original: string;
    carbon_score?: number;
    health_grade?: "A" | "C" | "F";
    red_list_status?: "Free" | "Approved" | "None";
    verified?: boolean;
    alternative_name?: string;
    certifications?: string[];
    error?: string;
}

export async function POST(request: NextRequest) {
    try {
        const { materials } = await request.json();

        if (!Array.isArray(materials) || materials.length === 0) {
            return NextResponse.json(
                { error: "Missing or invalid 'materials' array" },
                { status: 400 }
            );
        }

        const results: AuditResult[] = [];

        // Batch lookup
        for (const materialName of materials) {
            const cleanName = String(materialName).toLowerCase().trim();

            if (!cleanName || cleanName.length < 2) {
                results.push({
                    original: materialName,
                    error: "Invalid material name",
                });
                continue;
            }

            try {
                // TODO: Replace this with a call to the Backend API (GET /api/v1/products/search)
                // or use a direct Postgres query if you share the DB connection.
                // For now, we default to the Scraper Agent which handles live lookups.

                // MIGRATION NOTE: The direct MSSQL query was removed here.
                // We proceed directly to the scraper fallback.

                // 2. Trigger scraper agent for live lookup
                const scraperResponse = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/api/scrape/suppliers`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            material_name: materialName,
                            search_type: "epddb", // Search EPD databases like EC3
                            extract_fields: [
                                "gwp_per_unit",
                                "health_grade",
                                "red_list_status",
                                "certifications",
                            ],
                        }),
                    }
                );

                if (scraperResponse.ok) {
                    const scrapedData = await scraperResponse.json();
                    results.push({
                        original: materialName,
                        carbon_score: scrapedData.gwp_per_unit,
                        health_grade: scrapedData.health_grade || "F",
                        red_list_status: scrapedData.red_list_status || "None",
                        verified: !!scrapedData.epd_found,
                        alternative_name: scrapedData.matched_product_name,
                        certifications: scrapedData.certifications || [],
                    });
                } else {
                    // Scraper failed or timed out - return "not found"
                    results.push({
                        original: materialName,
                        error: "No EPD data found in EC3 database",
                    });
                }

            } catch (itemError) {
                results.push({
                    original: materialName,
                    error:
                        itemError instanceof Error
                            ? itemError.message
                            : "Processing error",
                });
            }
        }

        return NextResponse.json({
            results,
            count: results.length,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error("Excel audit API error:", error);
        return NextResponse.json(
            {
                error:
                    error instanceof Error ? error.message : "Internal server error",
            },
            { status: 500 }
        );
    }
}

// OPTIONS for CORS preflight (if needed)
export async function OPTIONS(_request: NextRequest) {
    return new NextResponse(null, {
        status: 200,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        },
    });
}
