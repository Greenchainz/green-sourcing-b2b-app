import { getBlobServiceClient } from "../lib/azure/blob-storage";

export async function storagePut(
  relKey: string,
  data: Buffer | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const blobServiceClient = getBlobServiceClient();
  const containerClient = blobServiceClient.getContainerClient("architect-specs");
  await containerClient.createIfNotExists();
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
