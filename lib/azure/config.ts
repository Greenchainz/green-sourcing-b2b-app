/**
 * Azure Native Configuration
 * 
 * Centralized Azure service clients and database connections
 * GreenChainz is 100% Azure-only (no Vercel, no Supabase, no AWS)
 */

import { BlobServiceClient } from "@azure/storage-blob";
import * as sql from "mssql";

// ============================================================================
// AZURE BLOB STORAGE (File uploads, PDFs, EPDs)
// ============================================================================
let blobService: BlobServiceClient | null = null;

/**
 * Get or create blob service client (lazy initialization)
 */
export function getBlobServiceClient(): BlobServiceClient {
    if (!blobService) {
        const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
        if (!connectionString) {
            throw new Error("Missing AZURE_STORAGE_CONNECTION_STRING environment variable");
        }
        blobService = BlobServiceClient.fromConnectionString(connectionString);
    }
    return blobService;
}

/**
 * Get or create a blob container
 */
export async function getBlobContainer(containerName: string) {
    const service = getBlobServiceClient();
    const containerClient = service.getContainerClient(containerName);
    await containerClient.createIfNotExists({ access: "container" });
    return containerClient;
}

/**
 * Upload file to Azure Blob Storage
 */
export async function uploadFileToBlob(
    containerName: string,
    fileName: string,
    fileBuffer: Buffer
): Promise<string> {
    const container = await getBlobContainer(containerName);
    const blockBlobClient = container.getBlockBlobClient(fileName);

    await blockBlobClient.uploadData(fileBuffer, {
        blobHTTPHeaders: { blobContentType: "application/pdf" },
    });

    return blockBlobClient.url;
}

// ============================================================================
// AZURE SQL DATABASE (Products, Suppliers, Users)
// ============================================================================
const sqlConfig: sql.config = {
    user: process.env.AZURE_SQL_USER,
    password: process.env.AZURE_SQL_PASSWORD,
    server: process.env.AZURE_SQL_SERVER || '', // e.g., 'greenchainz.database.windows.net'
    database: process.env.AZURE_SQL_DATABASE,
    pool: {
        max: 10,
        min: 2,
        idleTimeoutMillis: 30000,
    },
    options: {
        encrypt: true,
        trustServerCertificate: false,
        connectTimeout: 15000,
    },
};

// Connection pool (singleton)
let sqlPool: sql.ConnectionPool | null = null;

/**
 * Get or create Azure SQL connection pool
 */
export async function getAzureSQLPool(): Promise<sql.ConnectionPool> {
    if (sqlPool && sqlPool.connected) {
        return sqlPool;
    }

    sqlPool = new sql.ConnectionPool(sqlConfig);
    await sqlPool.connect();

    console.log("✅ Connected to Azure SQL Database");
    return sqlPool;
}

/**
 * Type for SQL query parameters
 */
export type SqlParameterValue = string | number | boolean | Date | null | undefined;

/**
 * Execute parameterized query against Azure SQL
 */
export async function runQuery<T>(
    query: string,
    params?: Record<string, SqlParameterValue>
): Promise<T[]> {
    try {
        const pool = await getAzureSQLPool();
        const request = pool.request();

        // Add parameters (safe from SQL injection)
        if (params) {
            for (const [key, value] of Object.entries(params)) {
                request.input(key, value);
            }
        }

        const result = await request.query(query);
        return result.recordset as T[];
    } catch (error) {
        console.error("❌ Azure SQL Query Error:", error);
        throw error;
    }
}

/**
 * Execute parameterized query that returns a single row
 */
export async function runQueryOne<T>(
    query: string,
    params?: Record<string, SqlParameterValue>
): Promise<T | null> {
    const results = await runQuery<T>(query, params);
    return results.length > 0 ? results[0] : null;
}

/**
 * Execute a scalar query (returns single value)
 */
export async function runScalar<T>(
    query: string,
    params?: Record<string, SqlParameterValue>
): Promise<T | null> {
    const result = await runQueryOne<Record<string, T>>(query, params);
    if (!result) return null;
    const firstValue = Object.values(result)[0];
    return firstValue as T;
}

/**
 * Close the connection pool (call on app shutdown)
 */
export async function closeSQLPool(): Promise<void> {
    if (sqlPool) {
        await sqlPool.close();
        sqlPool = null;
        console.log("✅ Azure SQL pool closed");
    }
}
