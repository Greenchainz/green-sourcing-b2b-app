/**
 * Founder Video Storage
 *
 * Production: Azure Blob Storage with Managed Identity (AZURE_STORAGE_ACCOUNT_NAME required).
 *             Browser uploads directly via SAS URL — no server bandwidth used.
 *
 * Development fallback: local disk at tmp/founder-videos/ served via
 *             PUT/GET /api/dev/fv-upload/* and /api/dev/fv/*
 *             Activated automatically when Azure storage is not configured.
 */

import {
  StorageSharedKeyCredential,
  BlobSASPermissions,
  generateBlobSASQueryParameters,
  UserDelegationKey,
} from "@azure/storage-blob";
import { getBlobServiceClient } from "./azure/blob-storage";

const CONTAINER_NAME = "founder-videos";
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const ALLOW_CONNECTION_STRING_IN_PROD = process.env.ALLOW_STORAGE_CONNECTION_STRING_IN_PROD === "true";

function hasManagedIdentityStorage(): boolean {
  return !!process.env.AZURE_STORAGE_ACCOUNT_NAME;
}

export function isLocalMode(): boolean {
  return !hasManagedIdentityStorage() && !process.env.AZURE_STORAGE_CONNECTION_STRING;
}

/** Base URL for local dev routes — uses REPLIT_DEV_DOMAIN if available. */
function localBase(): string {
  const domain = process.env.REPLIT_DEV_DOMAIN;
  if (domain) return `https://${domain}`;
  return `http://localhost:${process.env.PORT ?? 5000}`;
}

function getBlobEndpointFromConnectionString(connectionString: string): string {
  const parts: Record<string, string> = {};
  for (const piece of connectionString.split(";")) {
    const eq = piece.indexOf("=");
    if (eq === -1) continue;
    const key = piece.slice(0, eq);
    const value = piece.slice(eq + 1);
    parts[key] = value;
  }

  const accountName = parts["AccountName"];
  const protocol = parts["DefaultEndpointsProtocol"] ?? "https";
  const suffix = parts["EndpointSuffix"] ?? "core.windows.net";

  if (!accountName) {
    throw new Error("AZURE_STORAGE_CONNECTION_STRING missing AccountName");
  }

  return `${protocol}://${accountName}.blob.${suffix}`;
}

function getBlobEndpoint(): string {
  const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
  if (accountName) {
    return `https://${accountName}.blob.core.windows.net`;
  }

  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connectionString) {
    throw new Error("Azure Blob Storage is not configured");
  }
  return getBlobEndpointFromConnectionString(connectionString);
}

// ── Azure helpers ─────────────────────────────────────────────────────────────

/**
 * Parse AccountName + AccountKey from the connection string.
 * Throws if the env var is missing.
 */
function getSharedKeyCredential(): {
  accountName: string;
  credential: StorageSharedKeyCredential;
  blobEndpoint: string;
} {
  if (IS_PRODUCTION && !ALLOW_CONNECTION_STRING_IN_PROD) {
    throw new Error(
      "Connection-string storage auth is blocked in production. " +
      "Use managed identity (AZURE_STORAGE_ACCOUNT_NAME + AZURE_MI_CLIENT_ID) or set " +
      "ALLOW_STORAGE_CONNECTION_STRING_IN_PROD=true as an emergency override."
    );
  }

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

// ── Public API ────────────────────────────────────────────────────────────────

/** Ensure storage container / local directory exists. Idempotent. */
export async function ensureFounderVideosContainer(): Promise<void> {
  if (isLocalMode()) {
    const { mkdirSync } = await import("fs");
    mkdirSync("tmp/founder-videos", { recursive: true });
    return;
  }

  const client = getBlobServiceClient();
  await client.getContainerClient(CONTAINER_NAME).createIfNotExists();
}

async function generateSasUrl(
  blobKey: string,
  permissions: BlobSASPermissions,
  expiresOn: Date,
  contentType?: string
): Promise<string> {
  if (isLocalMode()) {
    throw new Error("generateSasUrl should not be called in local mode");
  }

  const blobEndpoint = getBlobEndpoint();
  const startsOn = new Date(Date.now() - 5 * 60 * 1000);

  if (hasManagedIdentityStorage()) {
    const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
    if (!accountName) {
      throw new Error("AZURE_STORAGE_ACCOUNT_NAME not set for managed identity storage");
    }

    const client = getBlobServiceClient();
    const delegationKey: UserDelegationKey = await client.getUserDelegationKey(startsOn, expiresOn);
    const sas = generateBlobSASQueryParameters(
      {
        containerName: CONTAINER_NAME,
        blobName: blobKey,
        permissions,
        startsOn,
        expiresOn,
        contentType,
      },
      delegationKey,
      accountName,
    ).toString();

    return `${blobEndpoint}/${CONTAINER_NAME}/${blobKey}?${sas}`;
  }

  const { credential } = getSharedKeyCredential();
  const sas = generateBlobSASQueryParameters(
    {
      containerName: CONTAINER_NAME,
      blobName: blobKey,
      permissions,
      startsOn,
      expiresOn,
      contentType,
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
export async function generateReadSasUrl(blobKey: string): Promise<string> {
  if (isLocalMode()) {
    return `${localBase()}/api/dev/fv/${blobKey}`;
  }

  const expiresOn = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return generateSasUrl(blobKey, BlobSASPermissions.parse("r"), expiresOn);
}

export async function generateUploadSasUrl(blobKey: string, contentType = "video/webm"): Promise<string> {
  if (isLocalMode()) {
    return `${localBase()}/api/dev/fv-upload/${blobKey}`;
  }

  const expiresOn = new Date(Date.now() + 30 * 60 * 1000);
  return generateSasUrl(blobKey, BlobSASPermissions.parse("cw"), expiresOn, contentType);
}

/** Canonical (no-SAS) blob URL stored in DB. */
export function buildBlobUrl(blobKey: string): string {
  if (isLocalMode()) {
    return `${localBase()}/api/dev/fv/${blobKey}`;
  }
  const blobEndpoint = getBlobEndpoint();
  return `${blobEndpoint}/${CONTAINER_NAME}/${blobKey}`;
}

/** Convenience: blobKey for a video — yyyy-mm/<videoId>.<extension> */
export function blobKeyForVideo(videoId: number, createdAt: Date = new Date(), extension = "webm"): string {
  const yyyy = createdAt.getUTCFullYear();
  const mm = String(createdAt.getUTCMonth() + 1).padStart(2, "0");
  const safeExt = extension.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 10) || "webm";
  return `${yyyy}-${mm}/${videoId}.${safeExt}`;
}

/**
 * Delete a blob from the founder-videos container.
 * No-ops in local mode (local dev files are ephemeral tmp files).
 * Treats a 404 as success — the blob is gone either way.
 */
export async function deleteFounderVideoBlob(blobKey: string): Promise<void> {
  if (!blobKey || isLocalMode()) return;
  const client = getBlobServiceClient();
  const blobClient = client.getContainerClient(CONTAINER_NAME).getBlobClient(blobKey);
  await blobClient.deleteIfExists();
}

