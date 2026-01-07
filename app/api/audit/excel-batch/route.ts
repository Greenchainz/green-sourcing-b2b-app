import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Excel Batch Audit API
 * 
 * This endpoint receives a batch of material names from the Excel Add-in
 * and returns carbon/health data for each material.
 * 
 * Workflow:
 * 1. Check Supabase for cached product data
 * 2. If missing, trigger the scraper agent to find EPD data live
 * 3. Return health grade (A/C/F) and carbon score
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

        const supabase = createClient();
        const results: AuditResult[] = [];

        // Batch lookup: try to find all materials in database first
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
                // 1. Search Supabase for existing product data
                // This assumes you have a 'products' table with columns:
                // - name, gwp_per_unit, health_grade, red_list_status, certifications, has_epd

                const { data: product, error: dbError } = await supabase
                    .from("products")
                    .select(
                        "name, gwp_per_unit, health_grade, red_list_status, certifications, has_epd"
                    )
                    .ilike("name", `%${cleanName}%`)
                    .limit(1)
                    .maybeSingle();

                if (product) {
                    // Found in database - return cached result
                    results.push({
                        original: materialName,
                        carbon_score: product.gwp_per_unit,
                        health_grade: product.health_grade || "F",
                        red_list_status: product.red_list_status || "None",
                        verified: product.has_epd,
                        alternative_name: product.name,
                        certifications: product.certifications || [],
                    });
                } else {
                    // 2. Not found - trigger scraper agent for live lookup
                    // This calls your existing scraper infrastructure

                    const scraperResponse = await fetch(
                        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/scrape/suppliers`,
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
export async function OPTIONS(request: NextRequest) {
    return new NextResponse(null, {
        status: 200,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        },
    });
}
