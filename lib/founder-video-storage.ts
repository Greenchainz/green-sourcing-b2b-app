/**
 * Founder Video Storage
 *
 * Production: Azure Blob Storage (AZURE_STORAGE_CONNECTION_STRING required).
 *             Browser uploads directly via SAS URL — no server bandwidth used.
 *
 * Development fallback: local disk at tmp/founder-videos/ served via
 *             PUT/GET /api/dev/fv-upload/* and /api/dev/fv/*
 *             Activated automatically when AZURE_STORAGE_CONNECTION_STRING is not set.
 */

import {
  BlobServiceClient,
  StorageSharedKeyCredential,
  BlobSASPermissions,
  generateBlobSASQueryParameters,
} from "@azure/storage-blob";

const CONTAINER_NAME = "founder-videos";

export function isLocalMode(): boolean {
  return !process.env.AZURE_STORAGE_CONNECTION_STRING;
}

/** Base URL for local dev routes — uses REPLIT_DEV_DOMAIN if available. */
function localBase(): string {
  const domain = process.env.REPLIT_DEV_DOMAIN;
  if (domain) return `https://${domain}`;
  return `http://localhost:${process.env.PORT ?? 5000}`;
}

// ── Azure helpers ─────────────────────────────────────────────────────────────

function getSharedKeyCredential(): {
  accountName: string;
  credential: StorageSharedKeyCredential;
  blobEndpoint: string;
} {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING!;

  const parts: Record<string, string> = {};
  for (const piece of connectionString.split(";")) {
    const eq = piece.indexOf("=");
    if (eq === -1) continue;
    parts[piece.slice(0, eq)] = piece.slice(eq + 1);
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

// ── Public API ────────────────────────────────────────────────────────────────

/** Ensure storage container / local directory exists. Idempotent. */
export async function ensureFounderVideosContainer(): Promise<void> {
  if (isLocalMode()) {
    const { mkdirSync } = await import("fs");
    mkdirSync("tmp/founder-videos", { recursive: true });
    return;
  }
  const cs = process.env.AZURE_STORAGE_CONNECTION_STRING!;
  const client = BlobServiceClient.fromConnectionString(cs);
  await client.getContainerClient(CONTAINER_NAME).createIfNotExists();
}

/**
 * Generate a URL the browser uses to PUT the video blob.
 * Azure: SAS upload URL (30-min window, write-only).
 * Local: /api/dev/fv-upload/<blobKey>
 */
export function generateUploadSasUrl(blobKey: string): string {
  if (isLocalMode()) {
    return `${localBase()}/api/dev/fv-upload/${blobKey}`;
  }

  const { credential, blobEndpoint } = getSharedKeyCredential();
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
 * Generate a URL for the watch page to stream the video.
 * Azure: read SAS URL (24-hour window).
 * Local: /api/dev/fv/<blobKey>
 */
export function generateReadSasUrl(blobKey: string): string {
  if (isLocalMode()) {
    return `${localBase()}/api/dev/fv/${blobKey}`;
  }

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

/** Canonical (no-SAS) blob URL stored in DB. */
export function buildBlobUrl(blobKey: string): string {
  if (isLocalMode()) {
    return `${localBase()}/api/dev/fv/${blobKey}`;
  }
  const { blobEndpoint } = getSharedKeyCredential();
  return `${blobEndpoint}/${CONTAINER_NAME}/${blobKey}`;
}

/** yyyy-mm/<videoId>.webm */
export function blobKeyForVideo(videoId: number, createdAt: Date = new Date()): string {
  const yyyy = createdAt.getUTCFullYear();
  const mm = String(createdAt.getUTCMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}/${videoId}.webm`;
}
