import type { NextAuthConfig } from "next-auth";

/**
 * auth.config.ts
 * 
 * Edge Runtime Safe Configuration
 * 
 * 🚨 CRITICAL: This file is designed for Edge Runtime compatibility
 * - NO Node.js modules (pg, prisma, bcrypt, fs, etc.)
 * - NO database adapters
 * - NO heavy providers (only config)
 * - ONLY Edge-compatible code
 * 
 * Purpose: Lightweight auth configuration that CAN be used in Edge Runtime
 * (e.g., if NextAuth's authorized() callback is needed in middleware)
 * Full providers and database adapter are in app.auth.ts
 * 
 * Note: Current middleware.ts implements auth checks via cookie inspection
 * and doesn't import this file, but this remains available for future use.
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
