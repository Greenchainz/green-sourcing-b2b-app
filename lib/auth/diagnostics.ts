/**
 * Authentication Diagnostics Utilities
 * 
 * Provides structured logging, trace ID generation, and redaction utilities
 * for debugging Azure AD authentication flows without leaking sensitive data.
 */

import { randomBytes } from 'crypto';

/**
 * Generate a unique trace ID for correlating log entries
 */
export function generateTraceId(): string {
  return `auth-${Date.now()}-${randomBytes(4).toString('hex')}`;
}

/**
 * Check if auth debugging is enabled
 */
export function isAuthDebugEnabled(): boolean {
  return process.env.AUTH_DEBUG === 'true' || process.env.NODE_ENV === 'development';
}

/**
 * Redact sensitive values from an object
 * Masks tokens, secrets, passwords, and authorization codes
 */
export function redactSensitiveData(data: unknown): unknown {
  if (!data) return data;
  
  if (typeof data === 'string') {
    // If it's a token-like string, show first and last 4 chars
    if (data.length > 20) {
      return `${data.substring(0, 4)}...${data.substring(data.length - 4)}`;
    }
    return data;
  }
  
  if (Array.isArray(data)) {
    return data.map(redactSensitiveData);
  }
  
  if (typeof data === 'object' && data !== null) {
    const redacted: Record<string, unknown> = {};
    const sensitiveKeys = [
      'token', 'access_token', 'id_token', 'refresh_token',
      'code', 'authorization_code', 'auth_code',
      'secret', 'client_secret', 'password', 'api_key',
      'key', 'authorization'
    ];
    
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = sensitiveKeys.some(sk => lowerKey.includes(sk));
      
      if (isSensitive && typeof value === 'string') {
        // Show type and length, but not the actual value
        redacted[key] = `[REDACTED ${value.length} chars]`;
      } else {
        redacted[key] = redactSensitiveData(value);
      }
    }
    return redacted;
  }
  
  return data;
}

/**
 * Structured logging for auth events
 */
export interface AuthLogContext {
  traceId: string;
  provider?: string;
  step?: string;
  statusCode?: number;
  error?: unknown;
  metadata?: Record<string, unknown>;
}

export function logAuthEvent(
  level: 'info' | 'warn' | 'error',
  message: string,
  context: AuthLogContext
): void {
  const isDebug = isAuthDebugEnabled();
  
  // Always log errors, only log info/warn if debug is enabled
  if (level === 'error' || isDebug) {
    const logData = {
      timestamp: new Date().toISOString(),
      level,
      message,
      traceId: context.traceId,
      provider: context.provider || 'azure',
      step: context.step,
      statusCode: context.statusCode,
      metadata: context.metadata ? redactSensitiveData(context.metadata) : undefined,
      error: context.error instanceof Error ? {
        name: context.error.name,
        message: context.error.message,
        stack: isDebug ? context.error.stack : undefined,
      } : context.error,
    };
    
    const logMethod = level === 'error' ? console.error : level === 'warn' ? console.warn : console.info;
    logMethod('[AUTH]', JSON.stringify(logData, null, isDebug ? 2 : 0));
  }
}

/**
 * Create a metrics counter (placeholder for future implementation)
 */
export function incrementAuthMetric(
  metric: 'auth_attempt' | 'auth_success' | 'auth_failure',
  provider: string,
  reason?: string
): void {
  // For now, just log to console
  // In production, this could send to Application Insights or similar
  if (isAuthDebugEnabled()) {
    console.info('[AUTH_METRIC]', {
      timestamp: new Date().toISOString(),
      metric,
      provider,
      reason,
    });
  }
}

/**
 * Format error for user display
 * Returns a friendly message with a trace ID for support
 */
export function formatUserError(
  error: unknown,
  traceId: string,
  defaultMessage = 'Authentication failed'
): { message: string; traceId: string } {
  let message = defaultMessage;
  
  if (error instanceof Error) {
    // Extract meaningful error info without exposing internals
    if (error.message.includes('network') || error.message.includes('connect')) {
      message = 'Unable to connect to authentication service. Please try again.';
    } else if (error.message.includes('timeout')) {
      message = 'Authentication request timed out. Please try again.';
    } else if (error.message.includes('invalid') || error.message.includes('expired')) {
      message = 'Authentication session expired. Please sign in again.';
    } else {
      message = defaultMessage;
    }
  }
  
  return {
    message: `${message} (Trace ID: ${traceId})`,
    traceId,
  };
}

/**
 * Parse and redact query parameters from a URL or request
 */
export function redactQueryParams(url: string): string {
  try {
    const urlObj = new URL(url);
    const redactedParams = new URLSearchParams();
    
    // Convert to array to avoid downlevelIteration issues
    const entries = Array.from(urlObj.searchParams.entries());
    for (const [key, value] of entries) {
      const lowerKey = key.toLowerCase();
      if (lowerKey.includes('code') || lowerKey.includes('token') || lowerKey.includes('secret')) {
        redactedParams.set(key, '[REDACTED]');
      } else {
        redactedParams.set(key, value);
      }
    }
    
    urlObj.search = redactedParams.toString();
    return urlObj.toString();
  } catch {
    return '[Invalid URL]';
  }
}
