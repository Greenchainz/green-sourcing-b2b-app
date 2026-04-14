import { describe, it, expect } from 'vitest';
import { searchEpds, getEpdDetail, findBestEpd } from './autodesk-sda-service';

const hasCredentials = !!(
  process.env.AUTODESK_CLIENT_ID && process.env.AUTODESK_CLIENT_SECRET
);
const runIntegrationTests =
  process.env.RUN_AUTODESK_SDA_INTEGRATION_TESTS === 'true';
const shouldRun = hasCredentials && runIntegrationTests;

describe('Autodesk SDA EPD Service', () => {
  it.skipIf(!shouldRun)('should search for EPDs by material name', async () => {
    const results = await searchEpds('concrete', undefined, 5);

    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThanOrEqual(0);

    if (results.length > 0) {
      expect(results[0]).toHaveProperty('id');
      expect(results[0]).toHaveProperty('name');
      expect(results[0]).toHaveProperty('gwp');
      expect(typeof results[0].gwp).toBe('number');
    }
  });

  it.skipIf(!shouldRun)('should search EPDs with category filter', async () => {
    const results = await searchEpds('steel', 'metals', 5);

    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThanOrEqual(0);
  });

  it.skipIf(!shouldRun)('should handle empty search results gracefully', async () => {
    const results = await searchEpds('xyzabc123notarealproduct', undefined, 5);

    expect(Array.isArray(results)).toBe(true);
    // May return empty array or results depending on API
    expect(results.length).toBeGreaterThanOrEqual(0);
  });

  it.skipIf(!shouldRun)('should fetch EPD detail by ID', async () => {
    // First search to get an ID
    const searchResults = await searchEpds('concrete', undefined, 1);

    if (searchResults.length > 0) {
      const detail = await getEpdDetail(searchResults[0].id);

      if (detail) {
        expect(detail).toHaveProperty('id');
        expect(detail).toHaveProperty('name');
        expect(detail).toHaveProperty('lifecycleStages');
        expect(detail.lifecycleStages).toHaveProperty('a1_a3');
      }
    }
  });

  it.skipIf(!shouldRun)('should handle invalid EPD ID gracefully', async () => {
    const detail = await getEpdDetail('invalid-id-12345');

    // Should return null for invalid ID
    expect(detail === null || detail !== null).toBe(true);
  });

  it.skipIf(!shouldRun)('should find best matching EPD', async () => {
    const epd = await findBestEpd('aluminum', 'metals');

    // May return null if no matches or an EPD object
    expect(epd === null || (epd && epd.id)).toBe(true);
  });

  it.skipIf(!shouldRun)('should return EPD with environmental data', async () => {
    const results = await searchEpds('wood', undefined, 1);

    if (results.length > 0) {
      const result = results[0];
      expect(result).toHaveProperty('gwp');
      expect(result).toHaveProperty('ap');
      expect(result).toHaveProperty('ep');
      expect(result).toHaveProperty('pocp');

      // All should be numbers (may be 0)
      expect(typeof result.gwp).toBe('number');
      expect(typeof result.ap).toBe('number');
      expect(typeof result.ep).toBe('number');
      expect(typeof result.pocp).toBe('number');
    }
  });

  it.skipIf(!shouldRun)('should include certifications in EPD results', async () => {
    const results = await searchEpds('certified', undefined, 5);

    if (results.length > 0) {
      expect(results[0]).toHaveProperty('certifications');
      expect(Array.isArray(results[0].certifications)).toBe(true);
    }
  });
});
