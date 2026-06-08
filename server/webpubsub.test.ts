import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockSendToUser = vi.fn();
const mockGetClientAccessToken = vi.fn();
const webPubSubClientCtor = vi.fn();
const defaultAzureCredentialCtor = vi.fn();

vi.mock("@azure/web-pubsub", () => ({
  WebPubSubServiceClient: webPubSubClientCtor,
}));

vi.mock("@azure/identity", () => ({
  DefaultAzureCredential: defaultAzureCredentialCtor,
}));

vi.mock("./db", () => ({
  getDb: vi.fn(),
}));

function createMockClient() {
  return {
    sendToUser: mockSendToUser,
    getClientAccessToken: mockGetClientAccessToken,
  };
}

describe("webpubsub-manager", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env.AZURE_WEBPUBSUB_ENDPOINT;
    delete process.env.AZURE_WEBPUBSUB_CONNECTION_STRING;
    delete process.env.WEBPUBSUB_HUB;

    defaultAzureCredentialCtor.mockImplementation(() => ({ kind: "managed-identity" }));
    webPubSubClientCtor.mockImplementation(() => createMockClient());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns null notification token when WebPubSub is not configured", async () => {
    const manager = await import("./webpubsub-manager");
    const token = await manager.getNotificationAccessToken(7);

    expect(token).toBeNull();
    expect(webPubSubClientCtor).not.toHaveBeenCalled();
  });

  it("uses managed identity endpoint when AZURE_WEBPUBSUB_ENDPOINT is configured", async () => {
    process.env.AZURE_WEBPUBSUB_ENDPOINT = "https://greenchainz.webpubsub.azure.com";
    process.env.WEBPUBSUB_HUB = "greenchainz-hub-test";
    mockGetClientAccessToken.mockResolvedValue({
      url: "wss://greenchainz.webpubsub.azure.com/client/hubs/greenchainz-hub-test?access_token=abc",
    });

    const manager = await import("./webpubsub-manager");
    const token = await manager.getNotificationAccessToken(42);

    expect(defaultAzureCredentialCtor).toHaveBeenCalledTimes(1);
    expect(webPubSubClientCtor).toHaveBeenCalledWith(
      "https://greenchainz.webpubsub.azure.com",
      expect.any(Object),
      "greenchainz-hub-test"
    );
    expect(mockGetClientAccessToken).toHaveBeenCalledWith({
      userId: "user-42",
      expirationTimeInMinutes: 60,
    });
    expect(token?.url).toContain("access_token=abc");
  });

  it("falls back to connection-string auth when managed identity client initialization fails", async () => {
    process.env.AZURE_WEBPUBSUB_ENDPOINT = "https://greenchainz.webpubsub.azure.com";
    process.env.AZURE_WEBPUBSUB_CONNECTION_STRING =
      "Endpoint=https://greenchainz.webpubsub.azure.com;AccessKey=secret;Version=1.0;";
    webPubSubClientCtor
      .mockImplementationOnce(() => {
        throw new Error("managed identity initialization failed");
      })
      .mockImplementation(() => createMockClient());
    mockGetClientAccessToken.mockResolvedValue({
      url: "wss://greenchainz.webpubsub.azure.com/client/hubs/greenchainz-hub?access_token=fallback",
    });

    const manager = await import("./webpubsub-manager");
    const token = await manager.getNotificationAccessToken(99);

    expect(webPubSubClientCtor).toHaveBeenNthCalledWith(
      1,
      "https://greenchainz.webpubsub.azure.com",
      expect.any(Object),
      "greenchainz-hub"
    );
    expect(webPubSubClientCtor).toHaveBeenNthCalledWith(
      2,
      "Endpoint=https://greenchainz.webpubsub.azure.com;AccessKey=secret;Version=1.0;",
      "greenchainz-hub"
    );
    expect(token?.url).toContain("access_token=fallback");
  });

  it("builds websocket URL from baseUrl+token when SDK omits url field", async () => {
    process.env.AZURE_WEBPUBSUB_CONNECTION_STRING =
      "Endpoint=https://greenchainz.webpubsub.azure.com;AccessKey=secret;Version=1.0;";
    mockGetClientAccessToken.mockResolvedValue({
      baseUrl: "wss://greenchainz.webpubsub.azure.com/client/hubs/greenchainz-hub",
      token: "manual-token",
    });

    const manager = await import("./webpubsub-manager");
    const token = await manager.getNotificationAccessToken(11);

    expect(token).toEqual({
      url: "wss://greenchainz.webpubsub.azure.com/client/hubs/greenchainz-hub?access_token=manual-token",
    });
  });

  it("sends notification payload to user-specific channel", async () => {
    process.env.AZURE_WEBPUBSUB_CONNECTION_STRING =
      "Endpoint=https://greenchainz.webpubsub.azure.com;AccessKey=secret;Version=1.0;";

    const manager = await import("./webpubsub-manager");
    await manager.broadcastNotification(13, {
      type: "new_message",
      title: "New message",
      content: "You have an unread message",
    });

    expect(mockSendToUser).toHaveBeenCalledWith("user-13", {
      type: "new_message",
      title: "New message",
      content: "You have an unread message",
    });
  });
});
