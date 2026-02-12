import { describe, it, expect } from "vitest";
import { WebPubSubServiceClient } from "@azure/web-pubsub";

describe("Azure Web PubSub Integration", () => {
  it("should validate Web PubSub connection string", async () => {
    const connectionString = process.env.AZURE_WEBPUBSUB_CONNECTION_STRING;
    expect(connectionString).toBeDefined();
    expect(connectionString).toContain("Endpoint=");
    expect(connectionString).toContain("AccessKey=");
  });

  it("should create Web PubSub client successfully", async () => {
    const connectionString = process.env.AZURE_WEBPUBSUB_CONNECTION_STRING;
    const hubName = process.env.WEBPUBSUB_HUB;

    expect(connectionString).toBeDefined();
    expect(hubName).toBeDefined();

    try {
      const client = new WebPubSubServiceClient(connectionString, hubName);
      expect(client).toBeDefined();
      
      // Test basic connectivity by getting access token
      const token = await client.getClientAccessToken();
      expect(token).toBeDefined();
      expect(token.token).toBeDefined();
      expect(token.baseUrl).toBeDefined();
    } catch (error) {
      expect.fail(`Failed to connect to Web PubSub: ${error}`);
    }
  });

  it("should have valid hub name", () => {
    const hubName = process.env.WEBPUBSUB_HUB;
    expect(hubName).toBe("greenchainz-hub");
  });

  it("should have public endpoint configured", () => {
    const endpoint = process.env.NEXT_PUBLIC_WEBPUBSUB_ENDPOINT;
    expect(endpoint).toBeDefined();
    expect(endpoint).toContain("greenchainz.webpubsub.azure.com");
  });
});
