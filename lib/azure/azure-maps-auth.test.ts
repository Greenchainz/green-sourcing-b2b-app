import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getTokenMock = vi.fn();

vi.mock("./credentials", () => ({
  getAzureCredential: () => ({
    getToken: getTokenMock,
  }),
}));

import { getAzureMapsAuth } from "./azure-maps-auth";

const ORIGINAL_ENV = { ...process.env };

describe("getAzureMapsAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...ORIGINAL_ENV };
    delete process.env.AZURE_MAPS_CLIENT_ID;
    delete process.env.AZURE_MAPS_SUBSCRIPTION_KEY;
    delete process.env.ALLOW_AZURE_MAPS_SUBSCRIPTION_KEY_IN_PROD;
    process.env.NODE_ENV = "test";
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("uses managed identity token auth when AZURE_MAPS_CLIENT_ID is set", async () => {
    process.env.AZURE_MAPS_CLIENT_ID = "maps-client-id";
    getTokenMock.mockResolvedValue({ token: "aad-token" });

    const auth = await getAzureMapsAuth();

    expect(getTokenMock).toHaveBeenCalledWith("https://atlas.microsoft.com/.default");
    expect(auth?.headers.Authorization).toContain("aad-token");
    expect(auth?.headers["x-ms-client-id"]).toBe("maps-client-id");
    expect(auth?.keyParam).toBeUndefined();
  });

  it("falls back to subscription key in non-production when token fails", async () => {
    process.env.AZURE_MAPS_CLIENT_ID = "maps-client-id";
    process.env.AZURE_MAPS_SUBSCRIPTION_KEY = "maps-sub-key";
    getTokenMock.mockRejectedValue(new Error("token failure"));

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const auth = await getAzureMapsAuth();

    expect(auth).toEqual({ headers: {}, keyParam: "maps-sub-key" });
    warnSpy.mockRestore();
  });

  it("blocks subscription key fallback in production without override", async () => {
    process.env.NODE_ENV = "production";
    process.env.AZURE_MAPS_SUBSCRIPTION_KEY = "maps-sub-key";

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const auth = await getAzureMapsAuth();

    expect(auth).toBeNull();
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
