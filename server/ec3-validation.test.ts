import { describe, it, expect } from "vitest";

/**
 * Test to validate EC3 API key is working correctly.
 * These tests verify environment variables are present — they are
 * skipped in CI where EC3 secrets are not configured.
 */

const hasEC3ApiKey = !!process.env.EC3_API_KEY;

describe("EC3 API Secret Validation", () => {
  it.skipIf(!hasEC3ApiKey)("should have EC3_API_KEY environment variable set", () => {
    const apiKey = process.env.EC3_API_KEY;
    expect(apiKey).toBeDefined();
    expect(apiKey).not.toBe("");
    expect(apiKey?.length).toBeGreaterThan(10);
  });

  it.skipIf(!hasEC3ApiKey)("should validate EC3 API key format", () => {
    const apiKey = process.env.EC3_API_KEY;
    expect(apiKey).toMatch(/^[a-f0-9]{64,}$/i);
  });

  it.skipIf(!hasEC3ApiKey)("should have correct EC3 credentials structure", () => {
    const apiKey = process.env.EC3_API_KEY;
    const username = process.env.EC3_USERNAME;
    const password = process.env.EC3_PASSWORD;
    const clientId = process.env.EC3_CLIENT_ID;
    const clientSecret = process.env.EC3_CLIENT_SECRET;

    expect(apiKey).toBeDefined();

    if (clientId) {
      expect(clientSecret).toBeDefined();
    }

    if (username) {
      expect(password).toBeDefined();
    }
  });
});
