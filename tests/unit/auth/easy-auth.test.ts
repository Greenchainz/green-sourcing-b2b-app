/**
 * Tests for Azure Container Apps Easy Auth utilities
 */

import {
  getEasyAuthUser,
  isAuthenticated,
  getAccessToken,
  getLoginUrl,
  getLogoutUrl,
  hasRole,
  hasAnyRole,
  type EasyAuthUser,
} from '@/lib/auth/easy-auth';

describe('Easy Auth Utilities', () => {
  describe('getEasyAuthUser', () => {
    it('should return null when no principal header is present', () => {
      const headers = new Headers();
      const user = getEasyAuthUser(headers);
      expect(user).toBeNull();
    });

    it('should parse a valid principal header', () => {
      const principal = {
        auth_typ: 'aad',
        claims: [
          { typ: 'oid', val: 'user-123' },
          { typ: 'email', val: 'user@example.com' },
          { typ: 'name', val: 'Test User' },
          { typ: 'roles', val: 'admin' },
        ],
      };

      const headers = new Headers();
      headers.set('x-ms-client-principal', Buffer.from(JSON.stringify(principal)).toString('base64'));
      headers.set('x-ms-client-principal-id', 'user-123');
      headers.set('x-ms-client-principal-name', 'user@example.com');

      const user = getEasyAuthUser(headers);

      expect(user).not.toBeNull();
      expect(user?.id).toBe('user-123');
      expect(user?.email).toBe('user@example.com');
      expect(user?.name).toBe('Test User');
      expect(user?.roles).toContain('admin');
    });

    it('should handle fallback headers when claims are missing', () => {
      const principal = {
        auth_typ: 'aad',
        claims: [],
      };

      const headers = new Headers();
      headers.set('x-ms-client-principal', Buffer.from(JSON.stringify(principal)).toString('base64'));
      headers.set('x-ms-client-principal-id', 'fallback-id');
      headers.set('x-ms-client-principal-name', 'fallback@example.com');

      const user = getEasyAuthUser(headers);

      expect(user).not.toBeNull();
      expect(user?.id).toBe('fallback-id');
      expect(user?.email).toBe('fallback@example.com');
    });

    it('should return null on invalid base64', () => {
      const headers = new Headers();
      headers.set('x-ms-client-principal', 'invalid-base64!!!');

      const user = getEasyAuthUser(headers);
      expect(user).toBeNull();
    });
  });

  describe('isAuthenticated', () => {
    it('should return false when no principal ID header is present', () => {
      const headers = new Headers();
      expect(isAuthenticated(headers)).toBe(false);
    });

    it('should return true when principal ID header is present', () => {
      const headers = new Headers();
      headers.set('x-ms-client-principal-id', 'user-123');
      expect(isAuthenticated(headers)).toBe(true);
    });
  });

  describe('getAccessToken', () => {
    it('should return null when no access token header is present', () => {
      const headers = new Headers();
      expect(getAccessToken(headers)).toBeNull();
    });

    it('should return the access token when present', () => {
      const headers = new Headers();
      headers.set('x-ms-token-aad-access-token', 'sample-access-token');
      expect(getAccessToken(headers)).toBe('sample-access-token');
    });
  });

  describe('getLoginUrl', () => {
    it('should return the default login URL', () => {
      expect(getLoginUrl()).toBe('/.auth/login/aad?post_login_redirect_uri=%2F');
    });

    it('should return login URL with custom redirect', () => {
      const url = getLoginUrl('/dashboard');
      expect(url).toBe('/.auth/login/aad?post_login_redirect_uri=%2Fdashboard');
    });

    it('should encode special characters in redirect URL', () => {
      const url = getLoginUrl('/path?query=value');
      expect(url).toContain(encodeURIComponent('/path?query=value'));
    });
  });

  describe('getLogoutUrl', () => {
    it('should return the default logout URL', () => {
      expect(getLogoutUrl()).toBe('/.auth/logout?post_logout_redirect_uri=%2F');
    });

    it('should return logout URL with custom redirect', () => {
      const url = getLogoutUrl('/goodbye');
      expect(url).toBe('/.auth/logout?post_logout_redirect_uri=%2Fgoodbye');
    });
  });

  describe('hasRole', () => {
    it('should return false for null user', () => {
      expect(hasRole(null, 'admin')).toBe(false);
    });

    it('should return true when user has the role', () => {
      const user: EasyAuthUser = {
        id: '1',
        email: 'user@example.com',
        name: 'User',
        roles: ['admin', 'user'],
      };

      expect(hasRole(user, 'admin')).toBe(true);
    });

    it('should return false when user does not have the role', () => {
      const user: EasyAuthUser = {
        id: '1',
        email: 'user@example.com',
        name: 'User',
        roles: ['user'],
      };

      expect(hasRole(user, 'admin')).toBe(false);
    });

    it('should be case insensitive', () => {
      const user: EasyAuthUser = {
        id: '1',
        email: 'user@example.com',
        name: 'User',
        roles: ['Admin'],
      };

      expect(hasRole(user, 'admin')).toBe(true);
      expect(hasRole(user, 'ADMIN')).toBe(true);
    });
  });

  describe('hasAnyRole', () => {
    it('should return false for null user', () => {
      expect(hasAnyRole(null, ['admin', 'user'])).toBe(false);
    });

    it('should return true when user has at least one role', () => {
      const user: EasyAuthUser = {
        id: '1',
        email: 'user@example.com',
        name: 'User',
        roles: ['user'],
      };

      expect(hasAnyRole(user, ['admin', 'user', 'guest'])).toBe(true);
    });

    it('should return false when user has none of the roles', () => {
      const user: EasyAuthUser = {
        id: '1',
        email: 'user@example.com',
        name: 'User',
        roles: ['guest'],
      };

      expect(hasAnyRole(user, ['admin', 'moderator'])).toBe(false);
    });
  });
});
