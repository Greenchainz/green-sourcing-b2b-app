import { test as base } from '@playwright/test';
import { TEST_USERS } from './test-data';

// Extend basic test with authenticated context
export const test = base.extend({
  // Mock authenticated user session
  authenticatedPage: async ({ page }, use) => {
    // Generate a mock JWT token (basic structure)
    // In a real scenario, this would be a valid signed JWT, but for E2E mocking
    // where we might intercept requests or just need the cookie presence, this suffices
    // unless the backend validates it strictly on every request.
    // However, since we are often mocking the backend responses too, or if the middleware checks it.
    // Let's use a dummy token.
    const mockToken = 'mock-jwt-token-for-testing';
    const mockRefreshToken = 'mock-refresh-token';

    // Set auth cookies/session before tests run
    // Using both 'greenchainz-auth-token' and 'token' as seen in azure-callback/route.ts
    await page.context().addCookies([
      {
        name: 'greenchainz-auth-token',
        value: mockToken,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'Lax'
      },
      {
        name: 'token',
        value: mockToken,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'Lax'
      },
      {
        name: 'refresh_token',
        value: mockRefreshToken,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'Lax'
      }
    ]);

    // Mock user data in localStorage (zustand persistence)
    // The key is "greenchainz-auth" as seen in lib/auth.ts
    await page.addInitScript(({ user }) => {
      const authState = {
        state: {
          user: {
            id: 'user-123',
            email: user.email,
            firstName: user.name.split(' ')[0],
            lastName: user.name.split(' ')[1] || '',
            fullName: user.name,
            role: user.role || 'buyer', // default to buyer if not specified
            oauthProvider: 'mock'
          },
          token: 'mock-jwt-token-for-testing',
          refreshToken: 'mock-refresh-token',
          tokenExpiresAt: Date.now() + 86400000, // 24 hours
          isLoading: false,
          error: null
        },
        version: 0
      };

      localStorage.setItem('greenchainz-auth', JSON.stringify(authState));
      // Also set legacy keys if needed
      localStorage.setItem('jwt_token', 'mock-jwt-token-for-testing');
      localStorage.setItem('accessToken', 'mock-jwt-token-for-testing');
    }, { user: TEST_USERS.buyer }); // Default to buyer, can be overridden in test

    await use(page);
  }
});

// Create a supplier authenticated page fixture
export const testSupplier = base.extend({
  authenticatedPage: async ({ page }, use) => {
    const mockToken = 'mock-jwt-token-supplier';
    const mockRefreshToken = 'mock-refresh-token-supplier';

    await page.context().addCookies([
      {
        name: 'greenchainz-auth-token',
        value: mockToken,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'Lax'
      },
      {
        name: 'token',
        value: mockToken,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'Lax'
      },
      {
        name: 'refresh_token',
        value: mockRefreshToken,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'Lax'
      }
    ]);

    // Use a fixed user ID 'supplier-123' that matches the ID used in the test expectation
    await page.addInitScript(({ user }) => {
      const authState = {
        state: {
          user: {
            id: 'supplier-123',
            email: user.email,
            firstName: user.name.split(' ')[0],
            lastName: user.name.split(' ')[1] || '',
            fullName: user.name,
            role: 'supplier',
            oauthProvider: 'mock'
          },
          token: 'mock-jwt-token-supplier',
          refreshToken: 'mock-refresh-token-supplier',
          tokenExpiresAt: Date.now() + 86400000,
          isLoading: false,
          error: null
        },
        version: 0
      };

      localStorage.setItem('greenchainz-auth', JSON.stringify(authState));
      localStorage.setItem('jwt_token', 'mock-jwt-token-supplier');
      localStorage.setItem('accessToken', 'mock-jwt-token-supplier');
    }, { user: TEST_USERS.supplier });

    await use(page);
  }
});

export { expect } from '@playwright/test';
