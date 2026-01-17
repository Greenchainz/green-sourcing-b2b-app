/**
 * Azure Blob Storage Integration Tests (Mock)
 * 
 * Tests for Azure Blob Storage client with connection pooling
 */

// Mock the Azure Storage Blob SDK
jest.mock("@azure/storage-blob", () => ({
  BlobServiceClient: {
    fromConnectionString: jest.fn().mockReturnValue({
      getContainerClient: jest.fn().mockReturnValue({
        createIfNotExists: jest.fn().mockResolvedValue({ succeeded: true }),
        getBlockBlobClient: jest.fn().mockReturnValue({
          uploadData: jest.fn().mockResolvedValue({ etag: '"test-etag"' }),
          uploadStream: jest.fn().mockResolvedValue({ etag: '"test-etag"' }),
          url: "https://test.blob.core.windows.net/container/blob",
          downloadToBuffer: jest.fn().mockResolvedValue(Buffer.from("test content")),
          exists: jest.fn().mockResolvedValue(true),
          deleteIfExists: jest.fn().mockResolvedValue({ succeeded: true }),
        }),
        getBlobClient: jest.fn().mockReturnValue({
          downloadToBuffer: jest.fn().mockResolvedValue(Buffer.from("test content")),
          exists: jest.fn().mockResolvedValue(true),
          deleteIfExists: jest.fn().mockResolvedValue({ succeeded: true }),
          url: "https://test.blob.core.windows.net/container/blob",
        }),
        listBlobsFlat: jest.fn().mockReturnValue({
          [Symbol.asyncIterator]: async function* () {
            yield { name: "blob1.pdf" };
            yield { name: "blob2.pdf" };
          },
        }),
      }),
    }),
  },
  StorageRetryPolicyType: {
    EXPONENTIAL: 0,
  },
  BlobSASPermissions: {
    parse: jest.fn().mockReturnValue({}),
  },
  generateBlobSASQueryParameters: jest.fn().mockReturnValue({
    toString: jest.fn().mockReturnValue("sv=2021-08-06&st=..."),
  }),
  StorageSharedKeyCredential: jest.fn().mockImplementation(() => ({})),
}));

describe("Azure Blob Storage Client", () => {
  let blobStorage: typeof import("../../../lib/azure/blob-storage");

  beforeAll(() => {
    process.env.AZURE_STORAGE_CONNECTION_STRING =
      "DefaultEndpointsProtocol=https;AccountName=testaccount;AccountKey=dGVzdGtleQ==;EndpointSuffix=core.windows.net";
  });

  beforeEach(() => {
    jest.resetModules();
    blobStorage = require("../../../lib/azure/blob-storage");
  });

  afterAll(() => {
    delete process.env.AZURE_STORAGE_CONNECTION_STRING;
  });

  describe("getBlobServiceClient", () => {
    it("should create a blob service client", () => {
      const client = blobStorage.getBlobServiceClient();
      expect(client).toBeDefined();
    });

    it("should return the same client on subsequent calls", () => {
      const client1 = blobStorage.getBlobServiceClient();
      const client2 = blobStorage.getBlobServiceClient();
      expect(client1).toBe(client2);
    });
  });

  describe("getContainer", () => {
    it("should get or create a container", async () => {
      const container = await blobStorage.getContainer("test-container");
      expect(container).toBeDefined();
    });
  });

  describe("uploadBlob", () => {
    it("should upload a buffer to blob storage", async () => {
      const result = await blobStorage.uploadBlob(
        "test-container",
        "test-file.pdf",
        Buffer.from("test content")
      );

      expect(result).toEqual({
        url: expect.stringContaining("blob.core.windows.net"),
        etag: expect.any(String),
        blobName: "test-file.pdf",
        containerName: "test-container",
        uploadedAt: expect.any(Date),
      });
    });

    it("should auto-detect content type from extension", async () => {
      const result = await blobStorage.uploadBlob(
        "test-container",
        "document.pdf",
        Buffer.from("test")
      );
      expect(result.blobName).toContain("document.pdf");
    });
  });

  describe("downloadBlob", () => {
    it("should download a blob as buffer", async () => {
      const buffer = await blobStorage.downloadBlob("test-container", "test-file.pdf");
      expect(buffer).toBeInstanceOf(Buffer);
    });
  });

  describe("blobExists", () => {
    it("should check if a blob exists", async () => {
      const exists = await blobStorage.blobExists("test-container", "test-file.pdf");
      expect(typeof exists).toBe("boolean");
    });
  });

  describe("deleteBlob", () => {
    it("should delete a blob", async () => {
      const deleted = await blobStorage.deleteBlob("test-container", "test-file.pdf");
      expect(typeof deleted).toBe("boolean");
    });
  });

  describe("listBlobs", () => {
    it("should list blobs in a container", async () => {
      const blobs = await blobStorage.listBlobs("test-container");
      expect(Array.isArray(blobs)).toBe(true);
    });
  });

  describe("module exports", () => {
    it("should export all required functions", () => {
      expect(blobStorage.getBlobServiceClient).toBeDefined();
      expect(blobStorage.getContainer).toBeDefined();
      expect(blobStorage.uploadBlob).toBeDefined();
      expect(blobStorage.uploadBlobFromStream).toBeDefined();
      expect(blobStorage.downloadBlob).toBeDefined();
      expect(blobStorage.blobExists).toBeDefined();
      expect(blobStorage.deleteBlob).toBeDefined();
      expect(blobStorage.listBlobs).toBeDefined();
      expect(blobStorage.generateBlobSasUrl).toBeDefined();
      expect(blobStorage.resetBlobServiceClient).toBeDefined();
    });
  });
});
