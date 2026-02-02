import { NextResponse } from "next/server";
import { getAzureSQLPool } from "@/lib/azure/config";

/**
 * Health Check Endpoint
 * 
 * Used by:
 * - Azure Container App health checks
 * - Docker HEALTHCHECK
 * - Load balancer probes
 */
export async function GET() {
    try {
        // Check Azure SQL connectivity
        const pool = await getAzureSQLPool();
        const result = await pool.request().query("SELECT 1 AS healthy");

        if (!result.recordset || result.recordset.length === 0) {
            throw new Error("Database query returned no results");
        }

        // Check Document Intelligence configuration
        const docIntelEndpoint = process.env.DOCUMENT_INTELLIGENCE_ENDPOINT;
        const docIntelStatus = docIntelEndpoint ? "configured" : "not_configured";

        // Check other Azure services
        const storageAccount = process.env.AZURE_STORAGE_ACCOUNT_NAME || process.env.AZURE_STORAGE_CONNECTION_STRING;
        const storageStatus = storageAccount ? "available" : "not_configured";

        const openaiEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
        const openaiStatus = openaiEndpoint ? "configured" : "not_configured";

        return NextResponse.json(
            {
                status: "healthy",
                timestamp: new Date().toISOString(),
                azure: {
                    sql: "connected",
                    storage: storageStatus,
                    openai: openaiStatus,
                    documentIntelligence: docIntelStatus,
                },
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("Health check failed:", error);

        return NextResponse.json(
            {
                status: "unhealthy",
                error:
                    error instanceof Error ? error.message : "Unknown error",
                timestamp: new Date().toISOString(),
            },
            { status: 503 }
        );
    }
}
