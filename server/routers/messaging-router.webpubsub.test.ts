import { beforeEach, describe, expect, it, vi } from "vitest";
import { messagingRouter } from "./messaging-router";

const mockGetNotificationAccessToken = vi.fn();

vi.mock("../webpubsub-manager", () => ({
  getNotificationAccessToken: mockGetNotificationAccessToken,
}));

function createCaller() {
  return messagingRouter.createCaller({
    user: {
      id: 123,
      openId: "user-123-openid",
      email: "user123@test.com",
      role: "buyer",
      name: "Test User",
    } as any,
    auth: {
      userId: "user-123-openid",
      email: "user123@test.com",
      role: "buyer",
      tenantId: "test-tenant",
      rawRoles: ["buyer"],
    },
    req: {
      headers: { "x-forwarded-for": "127.0.0.1", "user-agent": "vitest" },
      socket: { remoteAddress: "127.0.0.1" },
    } as any,
    res: {} as any,
  });
}

describe("messagingRouter.getNotificationToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null URL when WebPubSub is not configured", async () => {
    mockGetNotificationAccessToken.mockResolvedValue(null);

    const caller = createCaller();
    const result = await caller.getNotificationToken();

    expect(mockGetNotificationAccessToken).toHaveBeenCalledWith(123);
    expect(result).toEqual({ url: null });
  });

  it("returns signed websocket URL when token is available", async () => {
    mockGetNotificationAccessToken.mockResolvedValue({
      url: "wss://greenchainz.webpubsub.azure.com/client/hubs/greenchainz-hub?access_token=test",
    });

    const caller = createCaller();
    const result = await caller.getNotificationToken();

    expect(mockGetNotificationAccessToken).toHaveBeenCalledWith(123);
    expect(result).toEqual({
      url: "wss://greenchainz.webpubsub.azure.com/client/hubs/greenchainz-hub?access_token=test",
    });
  });
});
