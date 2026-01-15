/**
 * Tests for authentication diagnostics utilities
 */

import {
  generateTraceId,
  isAuthDebugEnabled,
  redactSensitiveData,
  logAuthEvent,
  formatUserError,
  redactQueryParams,
  incrementAuthMetric
} from '@/lib/auth/diagnostics';

describe('Auth Diagnostics Utilities', () => {
  // Store original env
  const originalEnv = process.env;
  
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    jest.spyOn(console, 'info').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  describe('generateTraceId', () => {
    it('should generate unique trace IDs', () => {
      const id1 = generateTraceId();
      const id2 = generateTraceId();
      
      expect(id1).toMatch(/^auth-\d+-[a-f0-9]{8}$/);
      expect(id2).toMatch(/^auth-\d+-[a-f0-9]{8}$/);
      expect(id1).not.toBe(id2);
    });

    it('should include timestamp in trace ID', () => {
      const now = Date.now();
      const id = generateTraceId();
      const timestamp = parseInt(id.split('-')[1]);
      
      expect(timestamp).toBeGreaterThanOrEqual(now);
      expect(timestamp).toBeLessThanOrEqual(now + 1000);
    });
  });

  describe('isAuthDebugEnabled', () => {
    it('should return true when AUTH_DEBUG is "true"', () => {
      process.env.AUTH_DEBUG = 'true';
      expect(isAuthDebugEnabled()).toBe(true);
    });

    it('should return true in development mode', () => {
      process.env.NODE_ENV = 'development';
      process.env.AUTH_DEBUG = undefined;
      expect(isAuthDebugEnabled()).toBe(true);
    });

    it('should return false when AUTH_DEBUG is "false"', () => {
      process.env.AUTH_DEBUG = 'false';
      process.env.NODE_ENV = 'production';
      expect(isAuthDebugEnabled()).toBe(false);
    });

    it('should return false when AUTH_DEBUG is not set in production', () => {
      process.env.AUTH_DEBUG = undefined;
      process.env.NODE_ENV = 'production';
      expect(isAuthDebugEnabled()).toBe(false);
    });
  });

  describe('redactSensitiveData', () => {
    it('should redact token fields', () => {
      const data = {
        access_token: 'very-long-secret-token-12345',
        id_token: 'another-secret-token',
        username: 'john@example.com'
      };
      
      const redacted = redactSensitiveData(data) as Record<string, unknown>;
      expect(redacted.access_token).toBe('[REDACTED 28 chars]');
      expect(redacted.id_token).toBe('[REDACTED 20 chars]');
      expect(redacted.username).toBe('john@example.com');
    });

    it('should redact authorization codes', () => {
      const data = {
        code: 'authorization-code-abc123',
        state: 'random-state-value'
      };
      
      const redacted = redactSensitiveData(data) as Record<string, unknown>;
      expect(redacted.code).toBe('[REDACTED 25 chars]');
      expect(redacted.state).toBe('random-state-value');
    });

    it('should redact client secrets', () => {
      const data = {
        client_secret: 'super-secret-key',
        client_id: 'public-client-id'
      };
      
      const redacted = redactSensitiveData(data) as Record<string, unknown>;
      expect(redacted.client_secret).toBe('[REDACTED 16 chars]');
      expect(redacted.client_id).toBe('public-client-id');
    });

    it('should handle nested objects', () => {
      const data = {
        user: {
          email: 'test@example.com',
          password: 'secret-password'
        },
        tokens: {
          access_token: 'token123',
          refresh_token: 'refresh456'
        }
      };
      
      const redacted = redactSensitiveData(data) as Record<string, unknown>;
      const user = redacted.user as Record<string, unknown>;
      const tokens = redacted.tokens as Record<string, unknown>;
      
      expect(user.email).toBe('test@example.com');
      expect(user.password).toBe('[REDACTED 15 chars]');
      expect(tokens.access_token).toBe('[REDACTED 8 chars]');
      expect(tokens.refresh_token).toBe('[REDACTED 10 chars]');
    });

    it('should handle arrays', () => {
      const data = {
        tokens: ['token1', 'token2']
      };
      
      const redacted = redactSensitiveData(data) as Record<string, unknown>;
      const tokens = redacted.tokens as string[];
      
      // Arrays of strings aren't automatically redacted unless they're in a sensitive field
      expect(Array.isArray(tokens)).toBe(true);
      expect(tokens.length).toBe(2);
    });

    it('should handle null and undefined', () => {
      expect(redactSensitiveData(null)).toBe(null);
      expect(redactSensitiveData(undefined)).toBe(undefined);
    });

    it('should handle primitive values', () => {
      expect(redactSensitiveData('test')).toBe('test');
      expect(redactSensitiveData(123)).toBe(123);
      expect(redactSensitiveData(true)).toBe(true);
    });

    it('should show partial token for long strings', () => {
      const longToken = 'a'.repeat(50);
      const redacted = redactSensitiveData(longToken) as string;
      expect(redacted).toBe('aaaa...aaaa');
    });
  });

  describe('logAuthEvent', () => {
    it('should log error events even when debug is disabled', () => {
      process.env.AUTH_DEBUG = 'false';
      process.env.NODE_ENV = 'production';
      
      logAuthEvent('error', 'Test error', {
        traceId: 'test-123',
        step: 'test-step',
        statusCode: 500
      });
      
      expect(console.error).toHaveBeenCalledWith(
        '[AUTH]',
        expect.stringContaining('"level":"error"')
      );
    });

    it('should not log info events when debug is disabled', () => {
      process.env.AUTH_DEBUG = 'false';
      process.env.NODE_ENV = 'production';
      
      logAuthEvent('info', 'Test info', {
        traceId: 'test-123'
      });
      
      expect(console.info).not.toHaveBeenCalled();
    });

    it('should log info events when debug is enabled', () => {
      process.env.AUTH_DEBUG = 'true';
      
      logAuthEvent('info', 'Test info', {
        traceId: 'test-123',
        provider: 'azure',
        step: 'test-step'
      });
      
      expect(console.info).toHaveBeenCalledWith(
        '[AUTH]',
        expect.stringContaining('level')
      );
      
      const logCall = (console.info as jest.Mock).mock.calls[0][1];
      const parsed = JSON.parse(logCall);
      expect(parsed.level).toBe('info');
      expect(parsed.message).toBe('Test info');
    });

    it('should include all context fields in log', () => {
      process.env.AUTH_DEBUG = 'true';
      
      logAuthEvent('warn', 'Test warning', {
        traceId: 'test-456',
        provider: 'azure',
        step: 'token-exchange',
        statusCode: 401,
        metadata: { error: 'invalid_grant' }
      });
      
      const logCall = (console.warn as jest.Mock).mock.calls[0][1];
      const logData = JSON.parse(logCall);
      
      expect(logData.traceId).toBe('test-456');
      expect(logData.provider).toBe('azure');
      expect(logData.step).toBe('token-exchange');
      expect(logData.statusCode).toBe(401);
      expect(logData.metadata).toEqual({ error: 'invalid_grant' });
    });

    it('should redact sensitive data in metadata', () => {
      process.env.AUTH_DEBUG = 'true';
      
      logAuthEvent('info', 'Test with sensitive data', {
        traceId: 'test-789',
        metadata: {
          access_token: 'secret-token',
          email: 'user@example.com'
        }
      });
      
      const logCall = (console.info as jest.Mock).mock.calls[0][1];
      const logData = JSON.parse(logCall);
      
      expect(logData.metadata.access_token).toBe('[REDACTED 12 chars]');
      expect(logData.metadata.email).toBe('user@example.com');
    });

    it('should handle Error objects', () => {
      process.env.AUTH_DEBUG = 'true';
      
      const error = new Error('Test error message');
      logAuthEvent('error', 'Exception occurred', {
        traceId: 'test-error',
        error
      });
      
      const logCall = (console.error as jest.Mock).mock.calls[0][1];
      const logData = JSON.parse(logCall);
      
      expect(logData.error.name).toBe('Error');
      expect(logData.error.message).toBe('Test error message');
      expect(logData.error.stack).toBeDefined();
    });
  });

  describe('formatUserError', () => {
    it('should format network errors', () => {
      const error = new Error('network connection failed');
      const result = formatUserError(error, 'trace-123');
      
      expect(result.message).toContain('Unable to connect');
      expect(result.message).toContain('trace-123');
      expect(result.traceId).toBe('trace-123');
    });

    it('should format timeout errors', () => {
      const error = new Error('request timeout exceeded');
      const result = formatUserError(error, 'trace-456');
      
      expect(result.message).toContain('timed out');
      expect(result.message).toContain('trace-456');
    });

    it('should format invalid/expired errors', () => {
      const error = new Error('token invalid or expired');
      const result = formatUserError(error, 'trace-789');
      
      expect(result.message).toContain('expired');
      expect(result.message).toContain('trace-789');
    });

    it('should use default message for unknown errors', () => {
      const error = new Error('Something weird happened');
      const result = formatUserError(error, 'trace-xyz', 'Custom default');
      
      expect(result.message).toContain('Custom default');
      expect(result.message).toContain('trace-xyz');
    });

    it('should handle non-Error objects', () => {
      const result = formatUserError('string error', 'trace-abc');
      
      expect(result.message).toContain('Authentication failed');
      expect(result.message).toContain('trace-abc');
    });
  });

  describe('redactQueryParams', () => {
    it('should redact code parameter', () => {
      const url = 'https://example.com/callback?code=secret123&state=abc';
      const redacted = redactQueryParams(url);
      
      expect(redacted).toContain('code');
      expect(redacted).toContain('REDACTED');
      expect(redacted).toContain('state=abc');
    });

    it('should redact token parameters', () => {
      const url = 'https://example.com/callback?access_token=token123&user=john';
      const redacted = redactQueryParams(url);
      
      expect(redacted).toContain('access_token');
      expect(redacted).toContain('REDACTED');
      expect(redacted).toContain('user=john');
    });

    it('should handle invalid URLs', () => {
      const result = redactQueryParams('not-a-valid-url');
      expect(result).toBe('[Invalid URL]');
    });

    it('should preserve non-sensitive parameters', () => {
      const url = 'https://example.com/callback?provider=azure&redirect=/dashboard';
      const redacted = redactQueryParams(url);
      
      expect(redacted).toContain('provider=azure');
      expect(redacted).toContain('redirect');
      expect(redacted).toContain('dashboard');
    });
  });

  describe('incrementAuthMetric', () => {
    it('should log metrics when debug is enabled', () => {
      process.env.AUTH_DEBUG = 'true';
      
      incrementAuthMetric('auth_attempt', 'azure', 'token-exchange');
      
      expect(console.info).toHaveBeenCalledWith(
        '[AUTH_METRIC]',
        expect.objectContaining({
          metric: 'auth_attempt',
          provider: 'azure',
          reason: 'token-exchange'
        })
      );
    });

    it('should not log metrics when debug is disabled', () => {
      process.env.AUTH_DEBUG = 'false';
      process.env.NODE_ENV = 'production';
      
      incrementAuthMetric('auth_success', 'azure');
      
      expect(console.info).not.toHaveBeenCalled();
    });

    it('should handle metrics without reason', () => {
      process.env.AUTH_DEBUG = 'true';
      
      incrementAuthMetric('auth_success', 'azure');
      
      expect(console.info).toHaveBeenCalledWith(
        '[AUTH_METRIC]',
        expect.objectContaining({
          metric: 'auth_success',
          provider: 'azure',
          reason: undefined
        })
      );
    });
  });
});
