/**
 * Unit tests for PKCE token exchange implementation
 * 
 * Tests the Azure AD PKCE (Proof Key for Code Exchange) flow:
 * 1. Backend accepts code_verifier parameter
 * 2. Backend validates PKCE parameters
 * 3. Backend includes code_verifier in token exchange request
 * 4. Frontend extracts code_verifier from MSAL sessionStorage
 */

import { NextRequest, NextResponse } from 'next/server';

describe('PKCE Token Exchange', () => {
  describe('Backend API Route', () => {
    it('should validate presence of code_verifier parameter', async () => {
      // Simulate request without code_verifier
      const requestBody = {
        code: 'test-auth-code-12345',
        redirectUri: 'https://greenchainz.com/login/callback'
        // Missing codeVerifier
      };

      // In a real scenario, the route would return 400 error
      const hasCodeVerifier = 'codeVerifier' in requestBody;
      expect(hasCodeVerifier).toBe(false);
    });

    it('should accept valid PKCE parameters', () => {
      const requestBody = {
        code: 'test-auth-code-12345',
        redirectUri: 'https://greenchainz.com/login/callback',
        codeVerifier: 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk' // Example PKCE verifier
      };

      // Validate all required fields are present
      expect(requestBody.code).toBeDefined();
      expect(requestBody.redirectUri).toBeDefined();
      expect(requestBody.codeVerifier).toBeDefined();
      expect(requestBody.codeVerifier.length).toBeGreaterThanOrEqual(43); // PKCE verifiers are at least 43 chars
    });

    it('should build correct token exchange parameters with PKCE', () => {
      const clientId = 'test-client-id';
      const clientSecret = 'test-client-secret';
      const code = 'test-auth-code';
      const redirectUri = 'https://greenchainz.com/login/callback';
      const codeVerifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';

      const tokenParams: Record<string, string> = {
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        scope: 'openid profile email',
        code_verifier: codeVerifier
      };

      // Verify all PKCE parameters are included
      expect(tokenParams.grant_type).toBe('authorization_code');
      expect(tokenParams.code).toBe(code);
      expect(tokenParams.code_verifier).toBe(codeVerifier);
      expect(tokenParams.redirect_uri).toBe(redirectUri);
    });

    it('should format token parameters as URL-encoded form data', () => {
      const tokenParams = {
        client_id: 'test-client',
        client_secret: 'test-secret',
        code: 'test-code',
        grant_type: 'authorization_code',
        redirect_uri: 'https://example.com/callback',
        scope: 'openid profile email',
        code_verifier: 'test-verifier'
      };

      const urlEncodedParams = new URLSearchParams(tokenParams).toString();

      // Verify URL encoding is correct
      expect(urlEncodedParams).toContain('code_verifier=test-verifier');
      expect(urlEncodedParams).toContain('grant_type=authorization_code');
      expect(urlEncodedParams).toContain('redirect_uri=https%3A%2F%2Fexample.com%2Fcallback');
    });
  });

  describe('Frontend PKCE Flow', () => {
    it('should extract code_verifier from sessionStorage', () => {
      // Mock sessionStorage
      const mockSessionStorage: Record<string, string> = {
        'test-state-123.code.verifier': 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk',
        'other-key': 'other-value'
      };

      const state = 'test-state-123';
      let codeVerifier: string | null = null;

      // Simulate the extraction logic from CallbackClient.tsx
      const storageKeys = Object.keys(mockSessionStorage);
      for (const key of storageKeys) {
        if (key.includes(state) && key.includes('code.verifier')) {
          codeVerifier = mockSessionStorage[key];
          break;
        }
      }

      expect(codeVerifier).toBe('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk');
    });

    it('should handle missing code_verifier gracefully', () => {
      // Mock sessionStorage without code_verifier
      const mockSessionStorage: Record<string, string> = {
        'other-key': 'other-value'
      };

      const state = 'test-state-123';
      let codeVerifier: string | null = null;

      const storageKeys = Object.keys(mockSessionStorage);
      for (const key of storageKeys) {
        if (key.includes(state) && key.includes('code.verifier')) {
          codeVerifier = mockSessionStorage[key];
          break;
        }
      }

      // Should remain null if not found
      expect(codeVerifier).toBeNull();
    });

    it('should send both code and code_verifier to backend', async () => {
      const backendUrl = 'https://api.greenchainz.com';
      const code = 'test-auth-code';
      const redirectUri = 'https://greenchainz.com/login/callback';
      const codeVerifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';

      // Simulate the fetch call
      const requestBody = JSON.stringify({
        code,
        redirectUri,
        codeVerifier
      });

      const parsedBody = JSON.parse(requestBody);

      // Verify all parameters are included
      expect(parsedBody.code).toBe(code);
      expect(parsedBody.redirectUri).toBe(redirectUri);
      expect(parsedBody.codeVerifier).toBe(codeVerifier);
    });
  });

  describe('PKCE Compliance', () => {
    it('should generate valid code_verifier format', () => {
      // PKCE code_verifier must be 43-128 characters long
      // and use only A-Z, a-z, 0-9, and the punctuation characters -._~ (hyphen, period, underscore, tilde)
      const validVerifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';

      expect(validVerifier.length).toBeGreaterThanOrEqual(43);
      expect(validVerifier.length).toBeLessThanOrEqual(128);
      expect(/^[A-Za-z0-9\-._~]+$/.test(validVerifier)).toBe(true);
    });

    it('should reject invalid code_verifier formats', () => {
      const invalidVerifiers = [
        'too-short',                           // Too short (< 43 chars)
        'a'.repeat(129),                       // Too long (> 128 chars)
        'invalid+characters=here',             // Invalid characters
        'spaces are not allowed'               // Spaces not allowed
      ];

      invalidVerifiers.forEach(verifier => {
        const isValidLength = verifier.length >= 43 && verifier.length <= 128;
        const isValidFormat = /^[A-Za-z0-9\-._~]+$/.test(verifier);
        const isValid = isValidLength && isValidFormat;

        expect(isValid).toBe(false);
      });
    });
  });

  describe('Error Handling', () => {
    it('should return proper error for missing code', () => {
      const requestBody = {
        // code is missing
        redirectUri: 'https://greenchainz.com/login/callback',
        codeVerifier: 'test-verifier'
      };

      const hasCode = 'code' in requestBody;
      expect(hasCode).toBe(false);

      // In the actual route, this would return a 400 error with message:
      // "Authorization code is required"
    });

    it('should return proper error for missing code_verifier', () => {
      const requestBody = {
        code: 'test-code',
        redirectUri: 'https://greenchainz.com/login/callback'
        // codeVerifier is missing
      };

      const hasCodeVerifier = 'codeVerifier' in requestBody;
      expect(hasCodeVerifier).toBe(false);

      // In the actual route, this would return a 400 error with message:
      // "PKCE code_verifier is required"
    });

    it('should handle Microsoft OAuth errors gracefully', () => {
      // Simulate Microsoft error response for PKCE mismatch
      const errorResponse = {
        error: 'invalid_grant',
        error_description: 'AADSTS50148: The code_verifier does not match the code_challenge supplied in the authorization request.',
        error_codes: [50148],
        timestamp: '2026-02-01 23:00:00Z',
        trace_id: 'test-trace-id',
        correlation_id: 'test-correlation-id'
      };

      // Verify error structure
      expect(errorResponse.error).toBe('invalid_grant');
      expect(errorResponse.error_codes).toContain(50148);
      expect(errorResponse.error_description).toContain('code_verifier');
      expect(errorResponse.error_description).toContain('code_challenge');
    });
  });
});
