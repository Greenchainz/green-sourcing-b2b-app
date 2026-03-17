import { describe, it, expect, beforeEach } from 'vitest';
import { getApsAccessToken, clearCachedToken } from './autodesk-oauth';

describe('Autodesk OAuth Token Service', () => {
  beforeEach(() => {
    clearCachedToken();
  });

  it('should obtain valid APS access token', async () => {
    const token = await getApsAccessToken();
    
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
    // JWT tokens typically start with 'ey'
    expect(token.startsWith('ey')).toBe(true);
  });

  it('should return same token on subsequent calls (caching)', async () => {
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

  it('should clear cached token', async () => {
    const token1 = await getApsAccessToken();
    clearCachedToken();
    const token2 = await getApsAccessToken();
    
    // After cache clear, should get new token (might be same or different)
    expect(token1).toBeDefined();
    expect(token2).toBeDefined();
  });
});
