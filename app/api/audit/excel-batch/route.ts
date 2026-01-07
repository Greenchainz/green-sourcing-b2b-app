import { NextRequest, NextResponse } from "next/server";
import sql from "mssql";

/**
 * Excel Batch Audit API
 * 
 * This endpoint receives a batch of material names from the Excel Add-in
 * and returns carbon/health data for each material.
 * 
 * Workflow:
 * 1. Check Azure SQL for cached product data
 * 2. If missing, trigger the scraper agent to find EPD data live
 * 3. Return health grade (A/C/F) and carbon score
 * 
 * Environment Variables Required:
 * - AZURE_SQL_SERVER: SQL server name
 * - AZURE_SQL_DATABASE: Database name
 * - AZURE_SQL_USER: Database user
 * - AZURE_SQL_PASSWORD: Database password
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

// Azure SQL Connection Pool (singleton)
let pool: sql.ConnectionPool | null = null;

async function getAzureSQLPool(): Promise<sql.ConnectionPool> {
    if (pool) return pool;

    pool = new sql.ConnectionPool({
        server: process.env.AZURE_SQL_SERVER || "",
        database: process.env.AZURE_SQL_DATABASE || "",
        authentication: {
            type: "default",
            options: {
                userName: process.env.AZURE_SQL_USER || "",
                password: process.env.AZURE_SQL_PASSWORD || "",
            },
        },
        options: {
            encrypt: true,
            trustServerCertificate: false,
        },
    });

    await pool.connect();
    return pool;
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

        const pool = await getAzureSQLPool();
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
                // 1. Query Azure SQL for existing product data
                // Expected table: [Products] with columns:
                // - name, gwp_per_unit, health_grade, red_list_status, certifications, has_epd

                const request = pool.request();
                request.input("materialName", sql.VarChar, `%${cleanName}%`);

                const result = await request.query(
                    `SELECT TOP 1 name, gwp_per_unit, health_grade, red_list_status, certifications, has_epd
                     FROM Products
                     WHERE LOWER(name) LIKE LOWER(@materialName)`
                );

                if (result.recordset && result.recordset.length > 0) {
                    const product = result.recordset[0];

                    // Found in database - return cached result
                    results.push({
                        original: materialName,
                        carbon_score: product.gwp_per_unit,
                        health_grade: product.health_grade || "F",
                        red_list_status: product.red_list_status || "None",
                        verified: product.has_epd,
                        alternative_name: product.name,
                        certifications: product.certifications
                            ? product.certifications.split(",")
                            : [],
                    });
                } else {
                    // 2. Not found - trigger scraper agent for live lookup
                    // This calls your existing scraper infrastructure

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
