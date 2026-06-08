import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { isCredentialConfigured } from "./credentials";

const ORIGINAL_ENV = { ...process.env };

describe("isCredentialConfigured", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.AZURE_MI_CLIENT_ID;
    delete process.env.MANAGED_IDENTITY_CLIENT_ID;
    process.env.NODE_ENV = "test";
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("returns true when an explicit managed identity client id is set", () => {
    process.env.AZURE_MI_CLIENT_ID = "client-id";
    expect(isCredentialConfigured()).toBe(true);
  });

  it("returns true in production for system-assigned identity", () => {
    process.env.NODE_ENV = "production";
    expect(isCredentialConfigured()).toBe(true);
  });

  it("returns false in non-production when no managed identity env vars are set", () => {
    expect(isCredentialConfigured()).toBe(false);
  });
});
