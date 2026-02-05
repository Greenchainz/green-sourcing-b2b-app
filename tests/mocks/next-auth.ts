// Mock for next-auth module
export default function NextAuth() {
    return {
        auth: jest.fn(),
        handlers: { GET: jest.fn(), POST: jest.fn() },
        signIn: jest.fn(),
        signOut: jest.fn(),
    };
}

export const auth = jest.fn();
export const signIn = jest.fn();
export const signOut = jest.fn();
export const handlers = { GET: jest.fn(), POST: jest.fn() };
