import type { NextAuthConfig } from "next-auth";

/**
 * auth.config.ts
 * 
 * Edge Runtime Safe Configuration
 * 
 * 🚨 CRITICAL: This file is imported by middleware.ts
 * - NO Node.js modules (pg, prisma, bcrypt, fs, etc.)
 * - NO database adapters
 * - NO heavy providers (only config)
 * - ONLY Edge-compatible code
 * 
 * Purpose: Lightweight auth configuration that can run in Edge Runtime
 * Full providers and database adapter are in app.auth.ts
 */

export const authConfig = {
  pages: {
    signIn: "/login",
    error: "/login?error=auth_error",
  },
  callbacks: {
    /**
     * authorized callback
     * Runs on every request matched by middleware matcher
     * Must be lightweight - no database calls
     */
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isProtectedRoute = 
        nextUrl.pathname.startsWith("/dashboard") ||
        nextUrl.pathname.startsWith("/suppliers") ||
        nextUrl.pathname.startsWith("/architects");
      
      if (isProtectedRoute) {
        if (isLoggedIn) return true;
        return false; // Redirect unauthenticated users to login page
      } else if (isLoggedIn) {
        // Optionally redirect authenticated users away from login page
        const isOnLogin = nextUrl.pathname.startsWith("/login");
        if (isOnLogin) {
          return Response.redirect(new URL("/dashboard", nextUrl));
        }
      }
      return true;
    },
    
    /**
     * session callback
     * Pass user ID from token to session
     */
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
  providers: [], // Providers are added in app.auth.ts to avoid Edge issues
} satisfies NextAuthConfig;
