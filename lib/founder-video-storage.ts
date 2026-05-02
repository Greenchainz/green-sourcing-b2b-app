/**
 * Founder Video Storage
 *
 * Helpers to generate SAS-signed URLs for the `founder-videos` Azure Blob
 * container. Browser uploads directly to Azure (no server bandwidth);
 * watch page reads via short-lived read SAS.
 *
 * Container: founder-videos (private, manually created in Azure Portal)
 */

import {
  BlobServiceClient,
  StorageSharedKeyCredential,
  BlobSASPermissions,
  generateBlobSASQueryParameters,
} from "@azure/storage-blob";

const CONTAINER_NAME = "founder-videos";

/**
 * Parse AccountName + AccountKey from the connection string.
 * Throws if the env var is missing.
 */
function getSharedKeyCredential(): {
  accountName: string;
  credential: StorageSharedKeyCredential;
  blobEndpoint: string;
} {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connectionString) {
    throw new Error("AZURE_STORAGE_CONNECTION_STRING not set");
  }

  const parts: Record<string, string> = {};
  for (const piece of connectionString.split(";")) {
    const eq = piece.indexOf("=");
    if (eq === -1) continue;
    const key = piece.slice(0, eq);
    const value = piece.slice(eq + 1);
    parts[key] = value;
  }

  const accountName = parts["AccountName"];
  const accountKey = parts["AccountKey"];
  const protocol = parts["DefaultEndpointsProtocol"] ?? "https";
  const suffix = parts["EndpointSuffix"] ?? "core.windows.net";

  if (!accountName || !accountKey) {
    throw new Error("AZURE_STORAGE_CONNECTION_STRING missing AccountName or AccountKey");
  }

  return {
    accountName,
    credential: new StorageSharedKeyCredential(accountName, accountKey),
    blobEndpoint: `${protocol}://${accountName}.blob.${suffix}`,
  };
}

/** Ensure the container exists. Idempotent. */
export async function ensureFounderVideosContainer(): Promise<void> {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connectionString) {
    throw new Error("AZURE_STORAGE_CONNECTION_STRING not set");
  }
  const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
  const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
  await containerClient.createIfNotExists();
}

/**
 * Generate a write-only SAS URL the browser uses to PUT the video blob.
 * Valid for 30 minutes.
 */
export function generateUploadSasUrl(blobKey: string): string {
  const { accountName, credential, blobEndpoint } = getSharedKeyCredential();
  void accountName;

  const startsOn = new Date(Date.now() - 5 * 60 * 1000);
  const expiresOn = new Date(Date.now() + 30 * 60 * 1000);

  const sas = generateBlobSASQueryParameters(
    {
      containerName: CONTAINER_NAME,
      blobName: blobKey,
      permissions: BlobSASPermissions.parse("cw"),
      startsOn,
      expiresOn,
      contentType: "video/webm",
    },
    credential,
  ).toString();

  return `${blobEndpoint}/${CONTAINER_NAME}/${blobKey}?${sas}`;
}

/**
 * Generate a short-lived read SAS URL for the watch page.
 * Valid for 24 hours.
 */
export function generateReadSasUrl(blobKey: string): string {
  const { credential, blobEndpoint } = getSharedKeyCredential();

  const expiresOn = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const sas = generateBlobSASQueryParameters(
    {
      containerName: CONTAINER_NAME,
      blobName: blobKey,
      permissions: BlobSASPermissions.parse("r"),
      expiresOn,
    },
    credential,
  ).toString();

  return `${blobEndpoint}/${CONTAINER_NAME}/${blobKey}?${sas}`;
}

/** Build the canonical (no-SAS) blob URL — stored in DB. */
export function buildBlobUrl(blobKey: string): string {
  const { blobEndpoint } = getSharedKeyCredential();
  return `${blobEndpoint}/${CONTAINER_NAME}/${blobKey}`;
}

/** Convenience: blobKey for a video — yyyy-mm/<videoId>.webm */
export function blobKeyForVideo(videoId: number, createdAt: Date = new Date()): string {
  const yyyy = createdAt.getUTCFullYear();
  const mm = String(createdAt.getUTCMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}/${videoId}.webm`;
}
