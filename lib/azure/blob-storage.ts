/**
 * Azure Blob Storage Client
 * 
 * Enhanced Blob Storage client with connection pooling, retry logic,
 * and proper error handling for GreenChainz B2B platform.
 * 
 * Features:
 * - Singleton BlobServiceClient with connection pooling
 * - Automatic retries with exponential backoff
 * - Content type detection
 * - Upload progress tracking
 * - Secure URL generation
 */

import {
  BlobServiceClient,
  ContainerClient,
  BlobUploadCommonResponse,
  StorageRetryOptions,
  StorageRetryPolicyType,
  BlobSASPermissions,
  generateBlobSASQueryParameters,
  StorageSharedKeyCredential,
} from "@azure/storage-blob";

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface BlobUploadOptions {
  /** Content type override (auto-detected if not provided) */
  contentType?: string;
  /** Metadata key-value pairs to attach to the blob */
  metadata?: Record<string, string>;
  /** Tags for blob indexing */
  tags?: Record<string, string>;
  /** Progress callback (0-100) */
  onProgress?: (progress: number) => void;
}

export interface BlobUploadResult {
  /** Full URL to the uploaded blob */
  url: string;
  /** ETag for the uploaded blob */
  etag: string;
  /** Blob name within the container */
  blobName: string;
  /** Container name */
  containerName: string;
  /** Upload timestamp */
  uploadedAt: Date;
}

export interface SASTokenOptions {
  /** Permissions for the SAS token (default: read) */
  permissions?: string;
  /** Expiry time in minutes (default: 60) */
  expiryMinutes?: number;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

/** Retry configuration for Azure Blob Storage operations */
const RETRY_OPTIONS: StorageRetryOptions = {
  maxTries: 4,
  tryTimeoutInMs: 30000,
  retryDelayInMs: 500,
  maxRetryDelayInMs: 4000,
  retryPolicyType: StorageRetryPolicyType.EXPONENTIAL,
};

/** Content type mappings for common file extensions */
const CONTENT_TYPE_MAP: Record<string, string> = {
  ".pdf": "application/pdf",
  ".json": "application/json",
  ".xml": "application/xml",
  ".csv": "text/csv",
  ".txt": "text/plain",
  ".html": "text/html",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".zip": "application/zip",
};

// ============================================================================
// SINGLETON CLIENT
// ============================================================================

let blobServiceClient: BlobServiceClient | null = null;
let connectionString: string | null = null;

/**
 * Get or create the singleton BlobServiceClient with connection pooling
 * 
 * @returns Configured BlobServiceClient instance
 * @throws Error if AZURE_STORAGE_CONNECTION_STRING is not set
 */
export function getBlobServiceClient(): BlobServiceClient {
  const currentConnectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;

  if (!currentConnectionString) {
    throw new Error(
      "Missing AZURE_STORAGE_CONNECTION_STRING environment variable. " +
      "Please configure Azure Blob Storage credentials."
    );
  }

  // Recreate client if connection string changed (useful for testing)
  if (blobServiceClient && connectionString === currentConnectionString) {
    return blobServiceClient;
  }

  connectionString = currentConnectionString;
  blobServiceClient = BlobServiceClient.fromConnectionString(
    currentConnectionString,
    { retryOptions: RETRY_OPTIONS }
  );

  console.log("✅ Azure Blob Storage client initialized with connection pooling");
  return blobServiceClient;
}

/**
 * Get or create a container client, creating the container if it doesn't exist
 * 
 * @param containerName - Name of the container
 * @param publicAccess - Whether to allow public read access (default: false)
 * @returns ContainerClient instance
 */
export async function getContainer(
  containerName: string,
  publicAccess: boolean = false
): Promise<ContainerClient> {
  const client = getBlobServiceClient();
  const containerClient = client.getContainerClient(containerName);

  try {
    await containerClient.createIfNotExists({
      access: publicAccess ? "blob" : undefined,
    });
  } catch (error) {
    console.error(`❌ Failed to create/access container '${containerName}':`, error);
    throw new Error(`Failed to access container '${containerName}': ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return containerClient;
}

// ============================================================================
// UPLOAD OPERATIONS
// ============================================================================

/**
 * Detect content type from file extension
 */
function detectContentType(fileName: string): string {
  const ext = fileName.toLowerCase().match(/\.[^.]+$/)?.[0] || "";
  return CONTENT_TYPE_MAP[ext] || "application/octet-stream";
}

/**
 * Upload a file buffer to Azure Blob Storage
 * 
 * @param containerName - Target container name
 * @param blobName - Name for the blob (can include path segments)
 * @param data - File data as Buffer
 * @param options - Upload options
 * @returns Upload result with URL and metadata
 */
export async function uploadBlob(
  containerName: string,
  blobName: string,
  data: Buffer,
  options: BlobUploadOptions = {}
): Promise<BlobUploadResult> {
  const container = await getContainer(containerName);
  const blockBlobClient = container.getBlockBlobClient(blobName);

  const contentType = options.contentType || detectContentType(blobName);

  try {
    const response: BlobUploadCommonResponse = await blockBlobClient.uploadData(data, {
      blobHTTPHeaders: { blobContentType: contentType },
      metadata: options.metadata,
      tags: options.tags,
      onProgress: options.onProgress
        ? (progress) => {
            const percent = Math.round((progress.loadedBytes / data.length) * 100);
            options.onProgress!(percent);
          }
        : undefined,
    });

    console.log(`✅ Uploaded blob: ${containerName}/${blobName} (${data.length} bytes)`);

    return {
      url: blockBlobClient.url,
      etag: response.etag || "",
      blobName,
      containerName,
      uploadedAt: new Date(),
    };
  } catch (error) {
    console.error(`❌ Failed to upload blob '${blobName}':`, error);
    throw new Error(
      `Failed to upload blob '${blobName}': ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Upload a file from a stream (useful for large files)
 * 
 * @param containerName - Target container name
 * @param blobName - Name for the blob
 * @param stream - Readable stream (Node.js stream)
 * @param streamLength - Total length of the stream
 * @param options - Upload options
 * @returns Upload result
 */
export async function uploadBlobFromStream(
  containerName: string,
  blobName: string,
  stream: import("stream").Readable,
  streamLength: number,
  options: BlobUploadOptions = {}
): Promise<BlobUploadResult> {
  const container = await getContainer(containerName);
  const blockBlobClient = container.getBlockBlobClient(blobName);

  const contentType = options.contentType || detectContentType(blobName);

  try {
    const response = await blockBlobClient.uploadStream(
      stream,
      4 * 1024 * 1024, // 4MB buffer size
      5, // Max concurrency
      {
        blobHTTPHeaders: { blobContentType: contentType },
        metadata: options.metadata,
        tags: options.tags,
      }
    );

    console.log(`✅ Uploaded blob from stream: ${containerName}/${blobName}`);

    return {
      url: blockBlobClient.url,
      etag: response.etag || "",
      blobName,
      containerName,
      uploadedAt: new Date(),
    };
  } catch (error) {
    console.error(`❌ Failed to upload blob from stream '${blobName}':`, error);
    throw new Error(
      `Failed to upload blob from stream '${blobName}': ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// ============================================================================
// DOWNLOAD OPERATIONS
// ============================================================================

/**
 * Download a blob as a Buffer
 * 
 * @param containerName - Source container name
 * @param blobName - Name of the blob to download
 * @returns Buffer containing the blob data
 */
export async function downloadBlob(
  containerName: string,
  blobName: string
): Promise<Buffer> {
  const container = await getContainer(containerName);
  const blobClient = container.getBlobClient(blobName);

  try {
    const response = await blobClient.downloadToBuffer();
    console.log(`✅ Downloaded blob: ${containerName}/${blobName} (${response.length} bytes)`);
    return response;
  } catch (error) {
    console.error(`❌ Failed to download blob '${blobName}':`, error);
    throw new Error(
      `Failed to download blob '${blobName}': ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Check if a blob exists
 * 
 * @param containerName - Container name
 * @param blobName - Blob name
 * @returns True if blob exists
 */
export async function blobExists(
  containerName: string,
  blobName: string
): Promise<boolean> {
  const container = await getContainer(containerName);
  const blobClient = container.getBlobClient(blobName);
  return await blobClient.exists();
}

// ============================================================================
// DELETE OPERATIONS
// ============================================================================

/**
 * Delete a blob
 * 
 * @param containerName - Container name
 * @param blobName - Name of the blob to delete
 * @returns True if deleted, false if blob didn't exist
 */
export async function deleteBlob(
  containerName: string,
  blobName: string
): Promise<boolean> {
  const container = await getContainer(containerName);
  const blobClient = container.getBlobClient(blobName);

  try {
    const response = await blobClient.deleteIfExists();
    if (response.succeeded) {
      console.log(`✅ Deleted blob: ${containerName}/${blobName}`);
    }
    return response.succeeded;
  } catch (error) {
    console.error(`❌ Failed to delete blob '${blobName}':`, error);
    throw new Error(
      `Failed to delete blob '${blobName}': ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// ============================================================================
// LIST OPERATIONS
// ============================================================================

/**
 * List blobs in a container with optional prefix filter
 * 
 * @param containerName - Container name
 * @param prefix - Optional prefix to filter blobs
 * @param maxResults - Maximum number of results (default: 100)
 * @returns Array of blob names
 */
export async function listBlobs(
  containerName: string,
  prefix?: string,
  maxResults: number = 100
): Promise<string[]> {
  const container = await getContainer(containerName);
  const blobNames: string[] = [];

  try {
    const iter = container.listBlobsFlat({ prefix });
    let count = 0;

    for await (const blob of iter) {
      if (count >= maxResults) break;
      blobNames.push(blob.name);
      count++;
    }

    return blobNames;
  } catch (error) {
    console.error(`❌ Failed to list blobs in '${containerName}':`, error);
    throw new Error(
      `Failed to list blobs in '${containerName}': ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// ============================================================================
// SAS TOKEN GENERATION (for secure sharing)
// ============================================================================

/**
 * Generate a SAS URL for temporary blob access
 * Note: This requires the connection string to contain the account key
 * 
 * @param containerName - Container name
 * @param blobName - Blob name
 * @param options - SAS token options
 * @returns SAS URL for the blob
 */
export async function generateBlobSasUrl(
  containerName: string,
  blobName: string,
  options: SASTokenOptions = {}
): Promise<string> {
  const container = await getContainer(containerName);
  const blobClient = container.getBlobClient(blobName);

  // Parse connection string to get account name and key
  const connStr = process.env.AZURE_STORAGE_CONNECTION_STRING || "";
  const accountNameMatch = connStr.match(/AccountName=([^;]+)/);
  const accountKeyMatch = connStr.match(/AccountKey=([^;]+)/);

  if (!accountNameMatch || !accountKeyMatch) {
    throw new Error("Cannot generate SAS URL: connection string must contain AccountName and AccountKey");
  }

  const accountName = accountNameMatch[1];
  const accountKey = accountKeyMatch[1];
  const credential = new StorageSharedKeyCredential(accountName, accountKey);

  const expiryDate = new Date();
  expiryDate.setMinutes(expiryDate.getMinutes() + (options.expiryMinutes || 60));

  const permissions = BlobSASPermissions.parse(options.permissions || "r");

  const sasToken = generateBlobSASQueryParameters(
    {
      containerName,
      blobName,
      permissions,
      expiresOn: expiryDate,
    },
    credential
  ).toString();

  return `${blobClient.url}?${sasToken}`;
}

// ============================================================================
// CLEANUP
// ============================================================================

/**
 * Reset the blob service client (useful for testing)
 */
export function resetBlobServiceClient(): void {
  blobServiceClient = null;
  connectionString = null;
  console.log("✅ Azure Blob Storage client reset");
}
