import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getApsAccessToken, clearCachedToken } from './autodesk-oauth';

const hasCredentials = !!(
  process.env.AUTODESK_CLIENT_ID && process.env.AUTODESK_CLIENT_SECRET
);

describe('Autodesk OAuth Token Service', () => {
  beforeEach(() => {
    clearCachedToken();
  });

  it.skipIf(!hasCredentials)('should obtain valid APS access token', async () => {
    const token = await getApsAccessToken();

    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
    // JWT tokens typically start with 'ey'
    expect(token.startsWith('ey')).toBe(true);
  });

  it.skipIf(!hasCredentials)('should return same token on subsequent calls (caching)', async () => {
    const token1 = await getApsAccessToken();
    const token2 = await getApsAccessToken();

    expect(token1).toBe(token2);
  });

  it('should throw error if credentials are missing', async () => {
    // Temporarily unset credentials
    const originalId = process.env.AUTODESK_CLIENT_ID;
    const originalSecret = process.env.AUTODESK_CLIENT_SECRET;

    delete process.env.AUTODESK_CLIENT_ID;
    delete process.env.AUTODESK_CLIENT_SECRET;

    clearCachedToken();

    try {
      await expect(getApsAccessToken()).rejects.toThrow('Missing Autodesk credentials');
    } finally {
      // Restore credentials
      if (originalId) process.env.AUTODESK_CLIENT_ID = originalId;
      if (originalSecret) process.env.AUTODESK_CLIENT_SECRET = originalSecret;
    }
  });

  it.skipIf(!hasCredentials)('should clear cached token', async () => {
    const token1 = await getApsAccessToken();
    clearCachedToken();
    const token2 = await getApsAccessToken();

    // After cache clear, should get new token (might be same or different)
    expect(token1).toBeDefined();
    expect(token2).toBeDefined();
  });

  describe('Mocked clearCachedToken tests', () => {
    let originalFetch: typeof global.fetch;

    beforeEach(() => {
      originalFetch = global.fetch;
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('should fetch a new token after clearCachedToken is called', async () => {
      // Temporarily set credentials to bypass the missing credentials check
      const originalId = process.env.AUTODESK_CLIENT_ID;
      const originalSecret = process.env.AUTODESK_CLIENT_SECRET;

      process.env.AUTODESK_CLIENT_ID = 'mock-client-id';
      process.env.AUTODESK_CLIENT_SECRET = 'mock-client-secret';

      try {
        let fetchCallCount = 0;

        // Mock fetch to track calls and return a dummy token
        global.fetch = async () => {
          fetchCallCount++;
          return new Response(JSON.stringify({
            access_token: `mock-token-${fetchCallCount}`,
            expires_in: 3600,
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        };

        // First call: should trigger fetch
        const token1 = await getApsAccessToken();
        expect(token1).toBe('mock-token-1');
        expect(fetchCallCount).toBe(1);

        // Second call: should use cache
        const token2 = await getApsAccessToken();
        expect(token2).toBe('mock-token-1');
        expect(fetchCallCount).toBe(1);

        // Clear cache
        clearCachedToken();

        // Third call: should trigger fetch again
        const token3 = await getApsAccessToken();
        expect(token3).toBe('mock-token-2');
        expect(fetchCallCount).toBe(2);

      } finally {
        // Restore credentials
        if (originalId !== undefined) process.env.AUTODESK_CLIENT_ID = originalId;
        else delete process.env.AUTODESK_CLIENT_ID;

        if (originalSecret !== undefined) process.env.AUTODESK_CLIENT_SECRET = originalSecret;
        else delete process.env.AUTODESK_CLIENT_SECRET;
      }
    });
  });
});
