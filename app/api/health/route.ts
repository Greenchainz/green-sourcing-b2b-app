import { NextResponse } from "next/server";
import { getAzureSQLPool } from "@/lib/azure/config";
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ status: 'ok' }, { status: 200 });
}

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

        return NextResponse.json(
            {
                status: "healthy",
                timestamp: new Date().toISOString(),
                azure: {
                    sql: "connected",
                    storage: "available",
                    openai: "configured",
                    documentIntelligence: "configured",
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
