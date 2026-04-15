import { BlobServiceClient } from "@azure/storage-blob";
import { ENV } from "./_core/env";

export async function storagePut(
  relKey: string,
  data: Buffer | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connectionString) {
    throw new Error("AZURE_STORAGE_CONNECTION_STRING not set in .env.local");
  }

  const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
  const containerClient = blobServiceClient.getContainerClient("architect-specs");
  const blockBlobClient = containerClient.getBlockBlobClient(relKey);

  const buffer = typeof data === "string" ? Buffer.from(data) : data;
  await blockBlobClient.upload(buffer, buffer.length, {
    blobHTTPHeaders: { blobContentType: contentType },
  });

  return {
    key: relKey,
    url: blockBlobClient.url,
  };
}
