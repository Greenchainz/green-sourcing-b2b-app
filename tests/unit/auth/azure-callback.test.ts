/**
 * Tests for the Azure Entra ID callback API route
 * These tests validate the user authentication flow after Azure Entra ID login
 */

// Mock the database module before importing the route
const mockQuery = jest.fn();
const mockClient = {
  query: jest.fn(),
  release: jest.fn(),
};
const mockGetClient = jest.fn(() => Promise.resolve(mockClient));

jest.mock('@/lib/db', () => ({
  query: mockQuery,
  getClient: mockGetClient,
}));

// Mock the JWT module
jest.mock('@/lib/auth/jwt', () => ({
  generateToken: jest.fn(() => 'mock-access-token'),
  generateRefreshToken: jest.fn(() => 'mock-refresh-token'),
}));

import { POST } from '@/app/api/auth/azure-callback/route';
import { NextRequest } from 'next/server';

describe('Azure Entra ID Callback API', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient.query.mockReset();
    mockQuery.mockReset();
    process.env = { ...originalEnv, DATABASE_URL: 'postgres://mock:mock@localhost:5432/mock' };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('POST /api/auth/azure-callback', () => {
    it('should return 400 if email is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/azure-callback', {
        method: 'POST',
        body: JSON.stringify({ azureId: 'azure-123' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Email and Azure ID required');
    });

    it('should return 400 if azureId is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/azure-callback', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Email and Azure ID required');
    });

    it('should create new user if not exists', async () => {
      // Mock: user doesn't exist
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // User check - not found
        .mockResolvedValueOnce({ rows: [{ id: 'new-user-123', role: 'architect' }] }) // INSERT
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      mockQuery.mockResolvedValueOnce({ rows: [] }); // Refresh token insert

      const request = new NextRequest('http://localhost:3000/api/auth/azure-callback', {
        method: 'POST',
        body: JSON.stringify({
          email: 'newuser@company.com',
          firstName: 'John',
          lastName: 'Doe',
          azureId: 'azure-new-user-123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.token).toBe('mock-access-token');
      expect(data.refreshToken).toBe('mock-refresh-token');
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe('newuser@company.com');
      expect(data.user.role).toBe('architect');
      expect(data.user.oauthProvider).toBe('azure');
    });

    it('should login existing user by azure_id', async () => {
      // Mock: user exists
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ 
          rows: [{ 
            id: 'existing-user-456', 
            email: 'existing@company.com', 
            role: 'supplier',
            first_name: 'Jane',
            last_name: 'Smith'
          }] 
        }) // User check - found
        .mockResolvedValueOnce({ rows: [] }) // UPDATE last_login
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      mockQuery.mockResolvedValueOnce({ rows: [] }); // Refresh token upsert

      const request = new NextRequest('http://localhost:3000/api/auth/azure-callback', {
        method: 'POST',
        body: JSON.stringify({
          email: 'existing@company.com',
          firstName: 'Jane',
          lastName: 'Smith',
          azureId: 'azure-existing-456',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.token).toBe('mock-access-token');
      expect(data.user.id).toBe('existing-user-456');
      expect(data.user.role).toBe('supplier');
    });

    it('should handle database errors gracefully', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockRejectedValueOnce(new Error('Database connection failed')); // Query fails

      const request = new NextRequest('http://localhost:3000/api/auth/azure-callback', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          azureId: 'azure-test-123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Authentication failed');
      expect(data.details).toContain('Database connection failed');
    });

    it('should set HTTP-only cookie with token', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 'user-123', email: 'test@test.com', role: 'architect' }] })
        .mockResolvedValueOnce({ rows: [] }) // UPDATE
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      mockQuery.mockResolvedValueOnce({ rows: [] });

      const request = new NextRequest('http://localhost:3000/api/auth/azure-callback', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@test.com',
          azureId: 'azure-123',
        }),
      });

      const response = await POST(request);

      // Check that a cookie was set
      const setCookieHeader = response.headers.get('set-cookie');
      expect(setCookieHeader).toContain('token=');
      expect(setCookieHeader).toContain('HttpOnly');
    });

    it('should return full user object with all fields', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ 
          rows: [{ 
            id: 'user-full', 
            email: 'full@example.com', 
            role: 'architect',
            first_name: 'Full',
            last_name: 'User'
          }] 
        })
        .mockResolvedValueOnce({ rows: [] }) // UPDATE
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      mockQuery.mockResolvedValueOnce({ rows: [] });

      const request = new NextRequest('http://localhost:3000/api/auth/azure-callback', {
        method: 'POST',
        body: JSON.stringify({
          email: 'full@example.com',
          firstName: 'Full',
          lastName: 'User',
          azureId: 'azure-full-123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.user).toEqual({
        id: 'user-full',
        email: 'full@example.com',
        firstName: 'Full',
        lastName: 'User',
        fullName: 'Full User',
        role: 'architect',
        oauthProvider: 'azure',
      });
    });
  });
});
