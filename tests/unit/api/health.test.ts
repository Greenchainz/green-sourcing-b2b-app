/**
 * Health Check Endpoint Tests
 * 
 * Tests the /api/health endpoint to ensure it correctly validates
 * Azure service configurations including Document Intelligence
 */

import { NextRequest } from 'next/server';

// Mock Azure SQL configuration
jest.mock('@/lib/azure/config', () => ({
  getAzureSQLPool: jest.fn().mockResolvedValue({
    request: jest.fn().mockReturnValue({
      query: jest.fn().mockResolvedValue({
        recordset: [{ healthy: 1 }],
      }),
    }),
  }),
}));

interface HealthResponse {
  status: string;
  timestamp: string;
  azure?: {
    sql: string;
    storage: string;
    openai: string;
    documentIntelligence: string;
  };
  error?: string;
}

describe('Health Check Endpoint', () => {
  let GET: () => Promise<Response>;
  
  /**
   * Helper function to get health response with isolated modules
   */
  async function getHealthResponse(): Promise<{ response: Response; data: HealthResponse }> {
    let responsePromise: Promise<Response>;
    
    jest.isolateModules(() => {
      const healthRoute = require('../../../app/api/health/route');
      responsePromise = healthRoute.GET();
    });
    
    const response = await responsePromise!;
    const data = await response.json() as HealthResponse;
    
    return { response, data };
  }
  
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    // Reset environment variables
    delete process.env.DOCUMENT_INTELLIGENCE_ENDPOINT;
    delete process.env.AZURE_STORAGE_ACCOUNT_NAME;
    delete process.env.AZURE_STORAGE_CONNECTION_STRING;
    delete process.env.AZURE_OPENAI_ENDPOINT;
    
    // Re-import the route handler to get fresh environment
    jest.isolateModules(() => {
      const healthRoute = require('../../../app/api/health/route');
      GET = healthRoute.GET;
    });
  });

  it('should return healthy status when all services are configured', async () => {
    // Set all environment variables
    process.env.DOCUMENT_INTELLIGENCE_ENDPOINT = 'https://test.cognitiveservices.azure.com/';
    process.env.AZURE_STORAGE_ACCOUNT_NAME = 'teststorage';
    process.env.AZURE_OPENAI_ENDPOINT = 'https://test.openai.azure.com/';

    const { response, data } = await getHealthResponse();

    expect(response.status).toBe(200);
    expect(data.status).toBe('healthy');
    expect(data.azure?.sql).toBe('connected');
    expect(data.azure?.documentIntelligence).toBe('configured');
    expect(data.azure?.storage).toBe('available');
    expect(data.azure?.openai).toBe('configured');
  });

  it('should report not_configured when Document Intelligence endpoint is missing', async () => {
    // Only set other variables, leave Document Intelligence unset
    process.env.AZURE_STORAGE_ACCOUNT_NAME = 'teststorage';
    process.env.AZURE_OPENAI_ENDPOINT = 'https://test.openai.azure.com/';

    const { response, data } = await getHealthResponse();

    expect(response.status).toBe(200);
    expect(data.status).toBe('healthy');
    expect(data.azure?.documentIntelligence).toBe('not_configured');
  });

  it('should report not_configured when storage is missing', async () => {
    process.env.DOCUMENT_INTELLIGENCE_ENDPOINT = 'https://test.cognitiveservices.azure.com/';
    process.env.AZURE_OPENAI_ENDPOINT = 'https://test.openai.azure.com/';

    const { response, data } = await getHealthResponse();

    expect(data.azure?.storage).toBe('not_configured');
  });

  it('should report not_configured when OpenAI endpoint is missing', async () => {
    process.env.DOCUMENT_INTELLIGENCE_ENDPOINT = 'https://test.cognitiveservices.azure.com/';
    process.env.AZURE_STORAGE_ACCOUNT_NAME = 'teststorage';

    const { response, data } = await getHealthResponse();

    expect(data.azure?.openai).toBe('not_configured');
  });

  it('should return unhealthy status when database query fails', async () => {
    // Mock database failure
    const { getAzureSQLPool } = require('@/lib/azure/config');
    getAzureSQLPool.mockRejectedValueOnce(new Error('Database connection failed'));

    const { response, data } = await getHealthResponse();

    expect(response.status).toBe(503);
    expect(data.status).toBe('unhealthy');
    expect(data.error).toContain('Database connection failed');
  });

  it('should include timestamp in response', async () => {
    process.env.DOCUMENT_INTELLIGENCE_ENDPOINT = 'https://test.cognitiveservices.azure.com/';

    const { response, data } = await getHealthResponse();

    expect(data.timestamp).toBeDefined();
    expect(new Date(data.timestamp).getTime()).toBeGreaterThan(0);
  });
});
