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
  });

  it("returns null when managed identity token acquisition fails", async () => {
    process.env.AZURE_MAPS_CLIENT_ID = "maps-client-id";
    getTokenMock.mockRejectedValue(new Error("token failure"));

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const auth = await getAzureMapsAuth();

    expect(auth).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("returns null and logs an error when AZURE_MAPS_CLIENT_ID is missing", async () => {
    delete process.env.AZURE_MAPS_CLIENT_ID;

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const auth = await getAzureMapsAuth();

    expect(auth).toBeNull();
    expect(getTokenMock).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
