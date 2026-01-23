/**
 * Azure Native Configuration
 * 
 * Centralized Azure service clients and database connections
 * GreenChainz is 100% Azure-only
 * 
 * This module provides:
 * - Azure SQL Database connection pooling with retries
 * - Legacy blob storage helpers (see blob-storage.ts for full API)
 * - Retry utilities for all Azure operations
 * 
 * For full Azure SDK integrations, import from:
 * - @/lib/azure/blob-storage   - Azure Blob Storage
 * - @/lib/azure/openai         - Azure OpenAI (GPT-4o)
 * - @/lib/azure/document-intelligence - Azure AI Document Intelligence
 * - @/lib/azure/postgres       - Azure PostgreSQL helpers
 */

import { BlobServiceClient } from "@azure/storage-blob";
let sql: any;

function getMssqlUnavailableError(): Error {
    return new Error(
        'Azure SQL support requires the "mssql" package (not installed in this app).'
    );
}

// ============================================================================
// RETRY UTILITIES (used across all Azure operations)
// ============================================================================

export interface RetryOptions {
    /** Maximum number of retry attempts (default: 3) */
    maxRetries?: number;
    /** Base delay between retries in ms (default: 500) */
    baseDelayMs?: number;
    /** Maximum delay between retries in ms (default: 10000) */
    maxDelayMs?: number;
    /** Exponential backoff multiplier (default: 2) */
    backoffMultiplier?: number;
    /** Error codes that should trigger a retry */
    retryableErrors?: string[];
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
    maxRetries: 3,
    baseDelayMs: 500,
    maxDelayMs: 10000,
    backoffMultiplier: 2,
    retryableErrors: [
        "ECONNRESET",
        "ETIMEDOUT",
        "ECONNREFUSED",
        "EPIPE",
        "EHOSTUNREACH",
        "EAI_AGAIN",
    ],
};

/**
 * Sleep utility for retry logic
 */
export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate delay for exponential backoff
 */
export function calculateBackoffDelay(
    attempt: number,
    options: RetryOptions = {}
): number {
    const { baseDelayMs, maxDelayMs, backoffMultiplier } = {
        ...DEFAULT_RETRY_OPTIONS,
        ...options,
    };
    const delay = baseDelayMs * Math.pow(backoffMultiplier, attempt - 1);
    // Add jitter (±10%)
    const jitter = delay * 0.1 * (Math.random() * 2 - 1);
    return Math.min(delay + jitter, maxDelayMs);
}

/**
 * Execute a function with automatic retries and exponential backoff
 * 
 * @param fn - Async function to execute
 * @param options - Retry options
 * @returns Result of the function
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
): Promise<T> {
    const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= opts.maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error as Error;
            const errorCode = (error as { code?: string }).code;

            // Check if error is retryable
            const isRetryable = opts.retryableErrors.some(
                (code) => errorCode === code || lastError?.message?.includes(code)
            );

            if (!isRetryable || attempt === opts.maxRetries) {
                throw error;
            }

            const delay = calculateBackoffDelay(attempt, opts);
            console.warn(
                `⚠️ Retry attempt ${attempt}/${opts.maxRetries} after ${delay}ms:`,
                lastError.message
            );
            await sleep(delay);
        }
    }

    throw lastError;
}

/**
 * Check if an error is transient and should be retried
 */
export function isTransientError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    
    const errorCode = (error as { code?: string }).code;
    return DEFAULT_RETRY_OPTIONS.retryableErrors.includes(errorCode || "") ||
        error.message.includes("timeout") ||
        error.message.includes("ECONNRESET") ||
        error.message.includes("network");
}

// ============================================================================
// AZURE BLOB STORAGE (Legacy helpers - see blob-storage.ts for full API)
// ============================================================================
let blobService: BlobServiceClient | null = null;

/**
 * Get or create blob service client (lazy initialization)
 * @deprecated Use getBlobServiceClient from @/lib/azure/blob-storage instead
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
 * @deprecated Use getContainer from @/lib/azure/blob-storage instead
 */
export async function getBlobContainer(containerName: string) {
    const service = getBlobServiceClient();
    const containerClient = service.getContainerClient(containerName);
    await containerClient.createIfNotExists({ access: "container" });
    return containerClient;
}

/**
 * Upload file to Azure Blob Storage
 * @deprecated Use uploadBlob from @/lib/azure/blob-storage instead
 */
export async function uploadFileToBlob(
    containerName: string,
    fileName: string,
    fileBuffer: Buffer
): Promise<string> {
    return withRetry(async () => {
        const container = await getBlobContainer(containerName);
        const blockBlobClient = container.getBlockBlobClient(fileName);

        await blockBlobClient.uploadData(fileBuffer, {
            blobHTTPHeaders: { blobContentType: "application/pdf" },
        });

        return blockBlobClient.url;
    });
}

// ============================================================================
// AZURE SQL DATABASE (Products, Suppliers, Users)
// ============================================================================

/**
 * Azure SQL configuration with connection pooling
 */
const sqlConfig: sql.config = {
    user: process.env.AZURE_SQL_USER,
    password: process.env.AZURE_SQL_PASSWORD,
    server: process.env.AZURE_SQL_SERVER || '', // e.g., 'greenchainz.database.windows.net'
    database: process.env.AZURE_SQL_DATABASE,
    pool: {
        max: 20,           // Increased pool size for better concurrency
        min: 2,
        idleTimeoutMillis: 30000,
        acquireTimeoutMillis: 30000,  // Added acquire timeout
    },
    options: {
        encrypt: true,
        trustServerCertificate: false,
        connectTimeout: 15000,
        requestTimeout: 30000,  // Added request timeout
        enableArithAbort: true,  // Required for newer SQL Server versions
    },
};

// Connection pool (singleton)
let sqlPool: any | null = null;
let poolConnecting: Promise<any> | null = null;

/**
 * Check if Azure SQL is configured
 */
export function isAzureSQLConfigured(): boolean {
    return !!(
        process.env.AZURE_SQL_USER &&
        process.env.AZURE_SQL_PASSWORD &&
        process.env.AZURE_SQL_SERVER &&
        process.env.AZURE_SQL_DATABASE
    );
}

/**
 * Get or create Azure SQL connection pool with retry logic
 * Uses a singleton pattern with connection deduplication to prevent
 * multiple simultaneous connection attempts
 */
export async function getAzureSQLPool(): Promise<any> {
    throw getMssqlUnavailableError();

    // Return existing connected pool
    if (sqlPool && sqlPool.connected) {
        return sqlPool;
    }

    // Return existing connection attempt (prevent connection storms)
    if (poolConnecting) {
        return poolConnecting;
    }

    // Create new connection with retry
    poolConnecting = withRetry(async () => {
        // Double-check in case another call connected while we waited
        if (sqlPool && sqlPool.connected) {
            return sqlPool;
        }

        // Close any stale pool
        if (sqlPool) {
            try {
                await sqlPool.close();
            } catch {
                // Ignore close errors on stale pool
            }
            sqlPool = null;
        }

        throw getMssqlUnavailableError();
        await sqlPool.connect();

        console.log("✅ Connected to Azure SQL Database");
        return sqlPool;
    }, {
        maxRetries: 3,
        baseDelayMs: 1000,
    });

    try {
        const pool = await poolConnecting;
        return pool;
    } finally {
        poolConnecting = null;
    }
}

/**
 * Type for SQL query parameters
 */
export type SqlParameterValue = string | number | boolean | Date | null | undefined;

/**
 * Execute parameterized query against Azure SQL with automatic retries
 */
export async function runQuery<T>(
    query: string,
    params?: Record<string, SqlParameterValue>
): Promise<T[]> {
    return withRetry(async () => {
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
    }, {
        maxRetries: 3,
        baseDelayMs: 500,
        retryableErrors: [
            "ECONNRESET",
            "ETIMEDOUT",
            "ECONNREFUSED",
            "ESOCKET",
            "EREQUEST",
        ],
    });
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

/**
 * Reset the SQL pool (useful for testing)
 */
export function resetSQLPool(): void {
    if (sqlPool) {
        sqlPool.close().catch(console.error);
        sqlPool = null;
    }
    poolConnecting = null;
    console.log("✅ Azure SQL pool reset");
}

/**
 * Health check for Azure SQL connection
 */
export async function sqlHealthCheck(): Promise<{
    healthy: boolean;
    latencyMs: number;
    error?: string;
}> {
    const startTime = Date.now();

    try {
        await runQuery("SELECT 1 AS health");
        return {
            healthy: true,
            latencyMs: Date.now() - startTime,
        };
    } catch (error) {
        return {
            healthy: false,
            latencyMs: Date.now() - startTime,
            error: (error as Error).message,
        };
    }
}
