import { generateToken, generateRefreshToken, verifyToken } from '@/lib/auth/jwt';

// Mock environment variable for consistent testing
const originalEnv = process.env;

describe('JWT Authentication', () => {
  beforeAll(() => {
    process.env = { ...originalEnv, JWT_SECRET: 'test-secret-key-for-testing' };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('generateToken', () => {
    it('should generate a valid JWT token with user payload', async () => {
      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'architect',
      };

      const token = await generateToken(payload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should include all payload fields in the token', async () => {
      const payload = {
        userId: 'user-456',
        email: 'supplier@company.com',
        role: 'supplier',
      };

      const token = await generateToken(payload);
      const decoded = await verifyToken(token);

      expect(decoded).not.toBeNull();
      expect(decoded?.userId).toBe(payload.userId);
      expect(decoded?.email).toBe(payload.email);
      expect(decoded?.role).toBe(payload.role);
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a valid refresh token', async () => {
      const payload = {
        userId: 'user-789',
        email: 'refresh@example.com',
      };

      const refreshToken = await generateRefreshToken(payload);

      expect(refreshToken).toBeDefined();
      expect(typeof refreshToken).toBe('string');
      expect(refreshToken.split('.')).toHaveLength(3);
    });

    it('should generate different tokens for access and refresh', async () => {
      const payload = {
        userId: 'user-test',
        email: 'test@test.com',
        role: 'architect',
      };

      const accessToken = await generateToken(payload);
      const refreshToken = await generateRefreshToken({ userId: payload.userId, email: payload.email });

      expect(accessToken).not.toBe(refreshToken);
    });
  });

  describe('verifyToken', () => {
    it('should verify and decode a valid token', async () => {
      const payload = {
        userId: 'verify-user',
        email: 'verify@example.com',
        role: 'supplier',
      };

      const token = await generateToken(payload);
      const decoded = await verifyToken(token);

      expect(decoded).not.toBeNull();
      expect(decoded?.userId).toBe(payload.userId);
      expect(decoded?.email).toBe(payload.email);
      expect(decoded?.role).toBe(payload.role);
    });

    it('should return null for an invalid token', async () => {
      const invalidToken = 'invalid.token.here';
      const decoded = await verifyToken(invalidToken);

      expect(decoded).toBeNull();
    });

    it('should return null for a malformed token', async () => {
      const malformedToken = 'not-even-close-to-a-jwt';
      const decoded = await verifyToken(malformedToken);

      expect(decoded).toBeNull();
    });

    it('should return null for an empty token', async () => {
      const decoded = await verifyToken('');

      expect(decoded).toBeNull();
    });

    it('should return null for a token signed with different secret', async () => {
      // This test verifies that tokens signed with a different secret are rejected
      // We can't easily test this without mocking, but we verify null handling
      const tamperedToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0IiwiZW1haWwiOiJ0ZXN0QHRlc3QuY29tIiwicm9sZSI6ImFyY2hpdGVjdCJ9.wrongsignature';
      const decoded = await verifyToken(tamperedToken);

      expect(decoded).toBeNull();
    });
  });

  describe('Token Round-Trip', () => {
    it('should successfully round-trip generate and verify for architect role', async () => {
      const payload = {
        userId: 'architect-user',
        email: 'architect@firm.com',
        role: 'architect',
      };

      const token = await generateToken(payload);
      const decoded = await verifyToken(token);

      expect(decoded).not.toBeNull();
      expect(decoded?.role).toBe('architect');
    });

    it('should successfully round-trip generate and verify for supplier role', async () => {
      const payload = {
        userId: 'supplier-user',
        email: 'sales@supplier.com',
        role: 'supplier',
      };

      const token = await generateToken(payload);
      const decoded = await verifyToken(token);

      expect(decoded).not.toBeNull();
      expect(decoded?.role).toBe('supplier');
    });
  });
});
