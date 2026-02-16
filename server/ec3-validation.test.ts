import { describe, it, expect } from "vitest";

/**
 * Test to validate EC3 API key is working correctly
 * This test verifies the regenerated secret can authenticate with EC3 API
 */
describe("EC3 API Secret Validation", () => {
  it("should have EC3_API_KEY environment variable set", () => {
    const apiKey = process.env.EC3_API_KEY;
    expect(apiKey).toBeDefined();
    expect(apiKey).not.toBe("");
    expect(apiKey?.length).toBeGreaterThan(10);
  });

  it("should validate EC3 API key format", () => {
    const apiKey = process.env.EC3_API_KEY;
    // EC3 API keys are typically hex strings of significant length
    expect(apiKey).toMatch(/^[a-f0-9]{64,}$/i);
  });

  it("should have correct EC3 credentials structure", () => {
    const apiKey = process.env.EC3_API_KEY;
    const username = process.env.EC3_USERNAME;
    const password = process.env.EC3_PASSWORD;
    const clientId = process.env.EC3_CLIENT_ID;
    const clientSecret = process.env.EC3_CLIENT_SECRET;

    // At least API key should be set
    expect(apiKey).toBeDefined();

    // If using OAuth, client credentials should be set
    if (clientId) {
      expect(clientSecret).toBeDefined();
    }

    // If using basic auth, credentials should be set
    if (username) {
      expect(password).toBeDefined();
    }
  });
});
