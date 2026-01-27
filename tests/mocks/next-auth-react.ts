/**
 * Mock for next-auth/react
 * Used in Jest tests to avoid ESM import issues
 */

export const useSession = jest.fn(() => ({
  data: null,
  status: 'unauthenticated',
}));

export const SessionProvider = ({ children }: { children: React.ReactNode }) => children;

export const signIn = jest.fn();
export const signOut = jest.fn();
